import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator,
  Alert, Image, Modal,
} from 'react-native';
import AppText from '../components/AppText';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMessages, sendMessage, markRead, reportUser } from '../api/client';
import { useAuthStore, supabase } from '../store/authStore';
import { Message, RootStackParamList } from '../types';
import { getErrorMessage } from '../utils/error';

type Route = RouteProp<RootStackParamList, 'ChatRoom'>;

const C = {
  primary: '#E8556D',
  bg: '#FFF5F3',           // 다시봄 따뜻한 크림 배경
  myBubble: '#F2728A',     // 내 말풍선: 부드러운 코랄 핑크
  otherBubble: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#999999',
  border: '#F0ECEA',
  inputBg: '#FFFFFF',
  overlay: 'rgba(0,0,0,0.5)',
  error: '#E53935',
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
      <AppText style={{ fontSize: size * 0.4, color: C.primary, fontWeight: '700' }}>
        {name.charAt(0)}
      </AppText>
    </View>
  );
}

function Bubble({
  msg, isMe, showReadMark, sendFailed, onRetry,
}: {
  msg: Message; isMe: boolean; showReadMark: boolean;
  sendFailed?: boolean; onRetry?: () => void;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      {!isMe && (
        <Avatar photoUrl={msg.sender?.photo_url} name={msg.sender?.name ?? '?'} size={36} />
      )}
      <View style={styles.bubbleOuter}>
        {!isMe && <AppText style={styles.senderName}>{msg.sender?.name}</AppText>}
        <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
          {isMe && (
            <View style={styles.metaLeft}>
              {showReadMark && <AppText style={styles.unreadMark}>1</AppText>}
              <View style={styles.timeRow}>
                <AppText style={styles.timeText}>{time}</AppText>
                {sendFailed ? (
                  <TouchableOpacity onPress={onRetry} activeOpacity={0.7}>
                    <AppText style={styles.failedMark}>!</AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={styles.deliveredMark}>{'\u2713'}</AppText>
                )}
              </View>
            </View>
          )}
          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <AppText style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.content}</AppText>
          </View>
          {!isMe && <AppText style={[styles.timeText, styles.timeTextOther]}>{time}</AppText>}
        </View>
      </View>
    </View>
  );
}

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={styles.dateSep}>
      <View style={styles.dateSepLine} />
      <AppText style={styles.dateSepText}>{label}</AppText>
      <View style={styles.dateSepLine} />
    </View>
  );
}

export default function ChatRoomScreen() {
  const route = useRoute<Route>();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const { match_id, other_name, other_user_id } = route.params;
  const { user } = useAuthStore();

  const MAX_LENGTH = 500;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 캐시: userId → sender 정보 (Realtime 이벤트 수신 시 사용)
  const senderMapRef = useRef<Record<string, Message['sender']>>({});

  const REPORT_REASONS = [
    { label: '부적절한 사진', value: 'inappropriate_photo' },
    { label: '허위 프로필', value: 'fake_profile' },
    { label: '불쾌한 대화', value: 'offensive_chat' },
    { label: '기타', value: 'other' },
  ];

  const load = useCallback(async () => {
    try {
      const data = await getMessages(match_id);
      setMessages(data);
      data.forEach((m: Message) => {
        if (m.sender) senderMapRef.current[m.sender_id] = m.sender;
      });
      await markRead(match_id);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '메시지를 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
    }
  }, [match_id]);

  const handleReport = () => {
    setShowReportModal(true);
  };

  const submitReport = async (reason: string) => {
    setShowReportModal(false);
    try {
      await reportUser(other_user_id, reason);
      Alert.alert('신고 완료', '신고가 접수되었습니다.');
    } catch {
      Alert.alert('오류', '신고 처리 중 문제가 발생했습니다.');
    }
  };

  useEffect(() => {
    nav.setOptions({
      title: other_name,
      headerRight: () => (
        <TouchableOpacity onPress={handleReport} style={{ paddingHorizontal: 8 }}>
          <AppText style={{ fontSize: 14, color: '#999' }}>신고</AppText>
        </TouchableOpacity>
      ),
    });
    load();

    // Supabase Broadcast 채널 구독 (postgres_changes 대비 Dashboard 설정 불필요)
    const channel = supabase
      .channel(`chat_${match_id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        const msg = payload.payload?.message as Message;
        if (!msg?.id || !msg.content || !msg.sender_id) return;
        // sender 정보가 없으면 캐시에서 보충
        if (!msg.sender && senderMapRef.current[msg.sender_id]) {
          msg.sender = senderMapRef.current[msg.sender_id];
        }
        if (msg.sender) senderMapRef.current[msg.sender_id] = msg.sender;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // 읽었음을 DB에 반영하고 발신자에게 알림
        await markRead(match_id).catch(() => {});
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
      channel.unsubscribe().finally(() => {
        supabase.removeChannel(channel);
      });
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
      // 전송 성공 시 failedIds에서 제거 (재시도 성공 케이스)
      setFailedIds(prev => {
        const next = new Set(prev);
        next.delete(newMsg.id);
        return next;
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
      Alert.alert('오류', getErrorMessage(err, '전송 실패'));
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (failedMsg: Message) => {
    try {
      const newMsg = await sendMessage(match_id, failedMsg.content);
      if (newMsg.sender) senderMapRef.current[newMsg.sender_id] = newMsg.sender;
      // 실패 메시지를 성공 메시지로 교체
      setMessages(prev => prev.map(m => m.id === failedMsg.id ? newMsg : m));
      setFailedIds(prev => {
        const next = new Set(prev);
        next.delete(failedMsg.id);
        return next;
      });
      channelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: { message: newMsg },
      });
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '재전송 실패'));
    }
  };

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'date') {
      return <DateSeparator label={item.label} />;
    }
    const isMe = item.msg.sender_id === user?.id;
    const showReadMark = isMe && !item.msg.read_at;
    const sendFailed = failedIds.has(item.msg.id);
    return (
      <Bubble
        msg={item.msg}
        isMe={isMe}
        showReadMark={showReadMark}
        sendFailed={sendFailed}
        onRetry={() => handleRetry(item.msg)}
      />
    );
  }, [user?.id, failedIds, handleRetry]);

  const handleContentSizeChange = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, []);

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
            <AppText style={styles.emptyChatEmoji}>💌</AppText>
            <AppText style={styles.emptyChatText}>첫 메시지를 보내보세요!</AppText>
            <AppText style={styles.emptyChatSub}>{other_name}님과의 대화를 시작해보세요.</AppText>
            <View style={styles.icebreakers}>
              {[
                '주말에 주로 뭐 하세요?',
                '요즘 관심 있는 게 있으세요?',
                '여행 다녀온 곳 중 추천할 만한 곳이 있나요?',
              ].map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.icebreakerChip}
                  onPress={() => setText(suggestion)}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.icebreakerText}>{suggestion}</AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={listItems}
            keyExtractor={item => item.key}
            renderItem={renderItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={handleContentSizeChange}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* 입력창 — 키보드 닫혀 있을 때 하단 인디케이터 영역 회피 */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(0, insets.bottom) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="메시지 입력"
              placeholderTextColor={C.sub}
              multiline
              maxLength={MAX_LENGTH}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <AppText style={styles.sendBtnText}>전송</AppText>
              }
            </TouchableOpacity>
          </View>
          <AppText style={styles.charCounter}>{text.length}/{MAX_LENGTH}</AppText>
        </View>
      </KeyboardAvoidingView>

      {/* 신고 사유 선택 Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>신고 사유 선택</AppText>
            <AppText style={styles.modalSub}>어떤 이유로 신고하시겠어요?</AppText>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={styles.modalOption}
                onPress={() => submitReport(r.value)}
              >
                <AppText style={styles.modalOptionText}>{r.label}</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowReportModal(false)}
            >
              <AppText style={styles.modalCancelText}>취소</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  dateSepLine: { flex: 1, height: 1, backgroundColor: C.border },
  dateSepText: {
    fontSize: 12, color: '#AA8888', marginHorizontal: 10,
    backgroundColor: '#FCEEF1', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, overflow: 'hidden',
  },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginVertical: 3 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  bubbleOuter: { flex: 1 },
  senderName: { fontSize: 12, color: '#886666', fontWeight: '600', marginBottom: 3, marginLeft: 2 },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bubbleWrapMe: { flexDirection: 'row-reverse' },

  metaLeft: { alignItems: 'flex-end', justifyContent: 'flex-end', gap: 2, paddingBottom: 2 },
  unreadMark: { fontSize: 11, color: C.primary, fontWeight: '700' },
  timeText: { fontSize: 11, color: '#AA9999', paddingBottom: 2 },
  timeTextOther: { paddingBottom: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deliveredMark: { fontSize: 11, color: '#AA9999' },
  failedMark: { fontSize: 13, color: C.error, fontWeight: '700', paddingHorizontal: 2 },

  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: 260, elevation: 1 },
  bubbleMe: { backgroundColor: C.myBubble, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: C.otherBubble, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0ECEA' },
  bubbleText: { fontSize: 15, color: C.text, lineHeight: 21 },
  bubbleTextMe: { color: '#FFFFFF' },

  inputArea: {
    backgroundColor: '#FFF8F5', borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 10, paddingHorizontal: 10,
  },
  inputRow: {
    flexDirection: 'row', gap: 8,
    alignItems: 'flex-end',
  },
  charCounter: {
    fontSize: 11, color: C.sub, textAlign: 'right',
    paddingRight: 4, paddingTop: 4, paddingBottom: 6,
  },
  input: {
    flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: C.text, maxHeight: 100,
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: '#E8D8D5',
  },
  sendBtn: { backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 11 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyChatEmoji: { fontSize: 64, marginBottom: 16 },
  emptyChatText: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 6 },
  emptyChatSub: { fontSize: 15, color: C.sub, textAlign: 'center' },

  // 대화 시작 제안 칩
  icebreakers: {
    marginTop: 24,
    gap: 10,
    alignItems: 'center',
    width: '100%',
  },
  icebreakerChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
    elevation: 1,
  },
  icebreakerText: {
    fontSize: 14,
    color: C.primary,
    fontWeight: '600',
    textAlign: 'center',
  },

  // 신고 Modal
  modalOverlay: {
    flex: 1, backgroundColor: C.overlay,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalContent: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 340,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: C.sub, marginBottom: 16 },
  modalOption: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0ECEA',
  },
  modalOptionText: { fontSize: 16, color: C.text },
  modalCancelBtn: {
    marginTop: 12, paddingVertical: 14, alignItems: 'center',
    backgroundColor: '#F5F5F5', borderRadius: 10,
  },
  modalCancelText: { fontSize: 16, color: C.sub, fontWeight: '600' },
});
