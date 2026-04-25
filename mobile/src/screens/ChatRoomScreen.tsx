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
import { colors, palette, radius, spacing, typography } from '../theme';

type Route = RouteProp<RootStackParamList, 'ChatRoom'>;

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
    backgroundColor: colors.primaryLight,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={s} />;
  }
  return (
    <View style={s}>
      <AppText style={{ fontSize: size * 0.4, color: colors.primaryDark, fontWeight: typography.bold }}>
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
                  <AppText style={styles.deliveredMark}>{'✓'}</AppText>
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

  const handleReport = () => setShowReportModal(true);

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
        <TouchableOpacity onPress={handleReport} style={{ paddingHorizontal: spacing.xs }}>
          <AppText style={{ fontSize: typography.caption + 1, color: colors.muted }}>신고</AppText>
        </TouchableOpacity>
      ),
    });
    load();

    const channel = supabase
      .channel(`chat_${match_id}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new_message' }, async (payload) => {
        const msg = payload.payload?.message as Message;
        if (!msg?.id || !msg.content || !msg.sender_id) return;
        if (!msg.sender && senderMapRef.current[msg.sender_id]) {
          msg.sender = senderMapRef.current[msg.sender_id];
        }
        if (msg.sender) senderMapRef.current[msg.sender_id] = msg.sender;
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        await markRead(match_id).catch(() => {});
        channel.send({
          type: 'broadcast',
          event: 'read_receipt',
          payload: { read_at: new Date().toISOString() },
        });
      })
      .on('broadcast', { event: 'read_receipt' }, (payload) => {
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
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setFailedIds(prev => {
        const next = new Set(prev);
        next.delete(newMsg.id);
        return next;
      });
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

  const handleRetry = useCallback(async (failedMsg: Message) => {
    try {
      const newMsg = await sendMessage(match_id, failedMsg.content);
      if (newMsg.sender) senderMapRef.current[newMsg.sender_id] = newMsg.sender;
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
  }, [match_id]);

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
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
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
            <AppText style={styles.emptyChatText}>첫 메시지를 보내보세요</AppText>
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

        <View style={[styles.inputArea, { paddingBottom: Math.max(0, insets.bottom) }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="메시지 입력"
              placeholderTextColor={colors.muted}
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
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: {
    padding: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 4,
  },

  dateSep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  dateSepLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dateSepText: {
    fontSize: typography.caption - 1,
    color: colors.muted,
    marginHorizontal: spacing.xs + 2,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    fontWeight: typography.medium,
  },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginVertical: 3,
  },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  bubbleOuter: { flex: 1 },
  senderName: {
    fontSize: typography.caption - 1,
    color: colors.muted,
    fontWeight: typography.semibold,
    marginBottom: 3,
    marginLeft: 2,
  },

  bubbleWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bubbleWrapMe: { flexDirection: 'row-reverse' },

  metaLeft: {
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 2,
    paddingBottom: 2,
  },
  unreadMark: {
    fontSize: typography.caption - 2,
    color: colors.primary,
    fontWeight: typography.bold,
  },
  timeText: {
    fontSize: typography.caption - 2,
    color: colors.muted,
    paddingBottom: 2,
  },
  timeTextOther: { paddingBottom: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deliveredMark: {
    fontSize: typography.caption - 2,
    color: colors.muted,
  },
  failedMark: {
    fontSize: typography.caption + 1,
    color: colors.danger,
    fontWeight: typography.bold,
    paddingHorizontal: 2,
  },

  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    maxWidth: 260,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: typography.body,
    color: colors.text,
    lineHeight: typography.body * typography.lineNormal,
  },
  bubbleTextMe: { color: '#FFFFFF' },

  inputArea: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs + 2,
    paddingHorizontal: spacing.xs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-end',
  },
  charCounter: {
    fontSize: typography.caption - 2,
    color: colors.muted,
    textAlign: 'right',
    paddingRight: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    fontSize: typography.body,
    color: colors.text,
    maxHeight: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: 11,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: {
    color: '#FFF',
    fontSize: typography.caption + 1,
    fontWeight: typography.bold,
  },

  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyChatEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyChatText: {
    fontSize: typography.title,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  emptyChatSub: {
    fontSize: typography.body,
    color: colors.sub,
    textAlign: 'center',
  },

  icebreakers: {
    marginTop: spacing.lg,
    gap: spacing.xs + 2,
    alignItems: 'center',
    width: '100%',
  },
  icebreakerChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  icebreakerText: {
    fontSize: typography.caption + 1,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: palette.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    marginBottom: spacing.md,
  },
  modalOption: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalOptionText: {
    fontSize: typography.body,
    color: colors.text,
  },
  modalCancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    fontSize: typography.body,
    color: colors.sub,
    fontWeight: typography.semibold,
  },
});
