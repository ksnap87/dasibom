import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  Alert, Image,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { getMessages, sendMessage, markRead } from '../api/client';
import { useAuthStore, supabase } from '../store/authStore';
import { Message, RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'ChatRoom'>;

const C = {
  primary: '#E8556D',
  bg: '#B2C7D9',       // 카카오톡 특유의 연한 청회색 배경
  myBubble: '#FEE500', // 카카오톡 내 말풍선 (노란색)
  otherBubble: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
  inputBg: '#FFFFFF',
};

/** "오늘", "어제", 날짜 형식 반환 */
function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return '오늘';
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

type ListItem =
  | { type: 'date'; label: string; key: string }
  | { type: 'message'; msg: Message; key: string };

function buildListItems(messages: Message[]): ListItem[] {
  const items: ListItem[] = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at)) {
      items.push({ type: 'date', label: formatDateLabel(msg.created_at), key: `date_${msg.created_at}` });
    }
    items.push({ type: 'message', msg, key: msg.id });
  }
  return items;
}

function Avatar({ photoUrl, name, size = 36 }: { photoUrl?: string; name: string; size?: number }) {
  const s = {
    width: size, height: size, borderRadius: size / 2,
    backgroundColor: C.primary + '30',
    alignItems: 'center' as const, justifyContent: 'center' as const,
  };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={s} />;
  }
  return (
    <View style={s}>
      <Text style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>
        {name.charAt(0)}
      </Text>
    </View>
  );
}

function Bubble({ msg, isMe, showReadMark }: { msg: Message; isMe: boolean; showReadMark: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      {!isMe && (
        <Avatar photoUrl={msg.sender?.photo_url} name={msg.sender?.name ?? '?'} size={36} />
      )}
      <View style={styles.bubbleOuter}>
        {!isMe && <Text style={styles.senderName}>{msg.sender?.name}</Text>}
        <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
          {isMe && (
            <View style={styles.metaLeft}>
              {showReadMark && <Text style={styles.unreadMark}>1</Text>}
              <Text style={styles.timeText}>{time}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.content}</Text>
          </View>
          {!isMe && <Text style={[styles.timeText, styles.timeTextOther]}>{time}</Text>}
        </View>
      </View>
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateSepLine} />
      <Text style={styles.dateSepText}>{label}</Text>
      <View style={styles.dateSepLine} />
    </View>
  );
}

export default function ChatRoomScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation();
  const { match_id, other_name } = route.params;
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 캐시: userId → sender 정보 (Realtime 이벤트 수신 시 사용)
  const senderMapRef = useRef<Record<string, Message['sender']>>({});

  const load = useCallback(async () => {
    try {
      const data = await getMessages(match_id);
      setMessages(data);
      data.forEach((m: Message) => {
        if (m.sender) senderMapRef.current[m.sender_id] = m.sender;
      });
      await markRead(match_id);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '메시지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [match_id]);

  useEffect(() => {
    nav.setOptions({ title: other_name });
    load();

    // Supabase Broadcast 채널 구독 (postgres_changes 대비 Dashboard 설정 불필요)
    const channel = supabase
      .channel(`chat_${match_id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        const msg = payload.payload?.message as Message;
        if (!msg) return;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // 읽었음을 DB에 반영하고 발신자에게 알림
        await markRead(match_id);
        channel.send({
          type: 'broadcast',
          event: 'read_receipt',
          payload: { read_at: new Date().toISOString() },
        });
      })
      .on('broadcast', { event: 'read_receipt' }, (payload) => {
        // 상대방이 읽었으면 내 메시지의 read_at 업데이트
        const readAt = payload.payload?.read_at as string;
        if (!readAt) return;
        setMessages(prev =>
          prev.map(m => (!m.read_at ? { ...m, read_at: readAt } : m))
        );
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [match_id, other_name, nav, load]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const newMsg = await sendMessage(match_id, trimmed);
      if (newMsg.sender) senderMapRef.current[newMsg.sender_id] = newMsg.sender;
      // 내 화면에 즉시 추가
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // 상대방에게 실시간 전달 (구독된 채널 재사용)
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { message: newMsg },
      });
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '전송 실패');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  const listItems = buildListItems(messages);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatEmoji}>💌</Text>
            <Text style={styles.emptyChatText}>첫 메시지를 보내보세요!</Text>
            <Text style={styles.emptyChatSub}>{other_name}님과의 대화를 시작해보세요.</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={item => item.key}
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return <DateSeparator label={item.label} />;
              }
              const isMe = item.msg.sender_id === user?.id;
              const showReadMark = isMe && !item.msg.read_at;
              return <Bubble msg={item.msg} isMe={isMe} showReadMark={showReadMark} />;
            }}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* 입력창 */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="메시지 입력"
            placeholderTextColor={C.sub}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.sendBtnText}>전송</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 12, paddingBottom: 8, gap: 4 },

  dateSep: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 14, paddingHorizontal: 8,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: '#A0B0BF' },
  dateSepText: {
    fontSize: 12, color: '#555', marginHorizontal: 10,
    backgroundColor: C.bg, paddingHorizontal: 4,
  },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 3 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  bubbleOuter: { flex: 1 },
  senderName: { fontSize: 12, color: '#333', fontWeight: '600', marginBottom: 3, marginLeft: 2 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bubbleWrapMe: { flexDirection: 'row-reverse' },

  metaLeft: { alignItems: 'flex-end', justifyContent: 'flex-end', gap: 2, paddingBottom: 2 },
  unreadMark: { fontSize: 11, color: C.primary, fontWeight: '700' },
  timeText: { fontSize: 11, color: '#555', paddingBottom: 2 },
  timeTextOther: { paddingBottom: 2 },

  bubble: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 240, elevation: 1 },
  bubbleMe: { backgroundColor: C.myBubble, borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: C.otherBubble, borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: C.text, lineHeight: 21 },
  bubbleTextMe: { color: '#2D2D2D' },

  inputRow: {
    flexDirection: 'row', padding: 10, gap: 8,
    backgroundColor: '#F4F4F4', borderTopWidth: 1, borderTopColor: '#C8C4C0',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: C.text, maxHeight: 100,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: '#DDD',
  },
  sendBtn: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyChatEmoji: { fontSize: 64, marginBottom: 16 },
  emptyChatText: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptyChatSub: { fontSize: 15, color: C.sub, textAlign: 'center' },
});
