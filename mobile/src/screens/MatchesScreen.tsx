import React, { useEffect, useState, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert, Image, ScrollView,
} from 'react-native';
import { CompositeNavigationProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import AppText from '../components/AppText';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { getMutualMatches, getSentInterests } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { MutualMatch, RootStackParamList, MainTabParamList } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';
import { getErrorMessage } from '../utils/error';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Matches'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#999999',
  border: '#F0ECEA',
  unread: '#E8556D',
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // 오늘: 시간만 표시
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()] + '요일';
  } else {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  }
}

function ChatRow({ match, onPress }: { match: MutualMatch; onPress: () => void }) {
  const { other_user: u, last_message, unread_count } = match;
  const hasUnread = (unread_count ?? 0) > 0;
  const isNewMatch = !last_message;
  const timeStr = last_message ? formatTime(last_message.created_at) : formatTime(match.created_at);

  return (
    <TouchableOpacity style={styles.chatRow} onPress={onPress} activeOpacity={0.6}>
      {/* 프로필 사진 */}
      <View style={styles.avatarContainer}>
        {u.photo_url ? (
          <Image source={{ uri: u.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <AppText style={styles.avatarInitial}>{(u.nickname || u.name).charAt(0)}</AppText>
          </View>
        )}
        {isNewMatch && (
          <View style={styles.newBadge}>
            <AppText style={styles.newBadgeText}>N</AppText>
          </View>
        )}
      </View>

      {/* 이름 + 마지막 메시지 */}
      <View style={styles.chatInfo}>
        <View style={styles.chatNameRow}>
          <AppText style={[styles.chatName, hasUnread && styles.chatNameBold]}>{(u.nickname || u.name)}</AppText>
          {isNewMatch && (
            <View style={styles.newMatchTag}>
              <AppText style={styles.newMatchTagText}>새 매칭</AppText>
            </View>
          )}
        </View>
        <AppText style={[styles.chatPreview, hasUnread && styles.chatPreviewBold, isNewMatch && styles.chatPreviewNew]} numberOfLines={1}>
          {last_message ? last_message.content : '첫 인사를 건네보세요!'}
        </AppText>
      </View>

      {/* 시간 + 안 읽은 배지 */}
      <View style={styles.chatMeta}>
        <AppText style={styles.chatTime}>{timeStr}</AppText>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <AppText style={styles.unreadText}>
              {(unread_count ?? 0) > 99 ? '99+' : unread_count}
            </AppText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface SentInterest {
  to_user_id: string;
  name: string | null;
  birth_year: number | null;
  city: string | null;
  personality_type: string | null;
  relationship_goal: string | null;
  status: 'pending' | 'matched' | 'expired';
  created_at: string;
  expires_at: string;
  remaining_hours: number;
}

function formatRemaining(hours: number): string {
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const h = hours % 24;
    return h > 0 ? `${days}일 ${h}시간` : `${days}일`;
  }
  if (hours > 0) return `${hours}시간`;
  return '곧 만료';
}

const STATUS_CONFIG = {
  pending: { label: '대기중', color: '#F9A825', icon: '⏳' },
  matched: { label: '매칭됨', color: '#27AE60', icon: '💕' },
  expired: { label: '만료', color: '#999', icon: '⌛' },
};

function SentInterestRow({ item, onPress }: { item: SentInterest; onPress: () => void }) {
  const cfg = STATUS_CONFIG[item.status];
  const currentYear = new Date().getFullYear();
  const age = item.birth_year ? currentYear - item.birth_year : null;
  const isExpired = item.status === 'expired';

  return (
    <TouchableOpacity
      style={[styles.sentRow, isExpired && styles.sentRowExpired]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.name ?? '알 수 없음'}님 프로필 보기`}
    >
      <View style={[styles.sentAvatar, { borderColor: cfg.color }]}>
        <AppText style={[styles.sentAvatarText, isExpired && { opacity: 0.4 }]}>
          {item.name?.charAt(0) ?? '?'}
        </AppText>
      </View>
      <View style={styles.sentInfo}>
        <AppText style={[styles.sentName, isExpired && styles.sentExpiredText]}>
          {item.name ?? '알 수 없음'}{age ? `, ${age}세` : ''}
        </AppText>
        <AppText style={[styles.sentSub, isExpired && styles.sentExpiredText]}>
          {item.city ?? ''}{item.relationship_goal ? ` · ${item.relationship_goal}` : ''}
        </AppText>
      </View>
      <View style={styles.sentStatus}>
        <AppText style={{ fontSize: 16 }}>{cfg.icon}</AppText>
        {item.status === 'pending' && (
          <AppText style={[styles.sentCountdown, { color: item.remaining_hours <= 12 ? '#E53935' : '#F9A825' }]}>
            {formatRemaining(item.remaining_hours)}
          </AppText>
        )}
        {item.status !== 'pending' && (
          <AppText style={[styles.sentStatusText, { color: cfg.color }]}>{cfg.label}</AppText>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MutualMatch[]>([]);
  const [sentInterests, setSentInterests] = useState<SentInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const nav = useNavigation<Nav>();
  const { phoneVerified, loadPhoneVerified } = useAuthStore();
  const [phoneVerifiedLoaded, setPhoneVerifiedLoaded] = useState(false);

  useEffect(() => {
    loadPhoneVerified().then(() => setPhoneVerifiedLoaded(true));
  }, [loadPhoneVerified]);

  const load = useCallback(async () => {
    try {
      const [matchData, sentData] = await Promise.all([
        getMutualMatches(),
        getSentInterests().catch(() => []),
      ]);
      setMatches(matchData);
      setSentInterests(sentData);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '목록을 불러오지 못했습니다.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 탭 진입할 때마다 새로 가져오기
  // (다른 탭에서 관심 누른 직후 매칭 탭 와도 즉시 반영되도록)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePress = (match: MutualMatch) => {
    if (phoneVerifiedLoaded && !phoneVerified) {
      nav.navigate('PhoneVerification', {
        match_id: match.match_id,
        other_name: match.other_user.nickname || match.other_user.name,
        other_user_id: match.other_user.id,
      });
    } else {
      nav.navigate('ChatRoom', {
        match_id: match.match_id,
        other_name: match.other_user.nickname || match.other_user.name,
        other_user_id: match.other_user.id,
      });
    }
  };

  // 보낸 관심 중 대기중인 것만 필터
  const pendingSent = sentInterests.filter(s => s.status === 'pending');
  const otherSent = sentInterests.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.headerTitle}>채팅</AppText>
        </View>
        <SkeletonLoader variant="match-row" count={6} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>채팅</AppText>
        {matches.length > 0 && (
          <AppText style={styles.headerCount}>{matches.length}</AppText>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.primary}
          />
        }
      >
        {/* ── 보낸 관심 섹션 ── */}
        <View style={styles.sentSection}>
          <TouchableOpacity
            style={styles.sentHeader}
            onPress={() => setShowSent(v => !v)}
            activeOpacity={0.7}
          >
            <AppText style={styles.sentHeaderText}>
              💌 보낸 관심 {
                pendingSent.length > 0
                  ? `(${pendingSent.length}명 대기중)`
                  : sentInterests.length === 0
                    ? '(아직 없어요)'
                    : ''
              }
            </AppText>
            <AppText style={styles.sentToggle}>{showSent ? '접기 ▲' : '펼치기 ▼'}</AppText>
          </TouchableOpacity>
          {showSent && (
            sentInterests.length === 0 ? (
              <View style={styles.sentEmpty}>
                <AppText style={styles.sentEmptyText}>
                  아직 관심을 보낸 분이 없어요.{'\n'}
                  추천 탭에서 마음에 드는 분께 관심을 표현해보세요.
                </AppText>
              </View>
            ) : (
              <View>
                {pendingSent.map(item => (
                  <SentInterestRow
                    key={item.to_user_id}
                    item={item}
                    onPress={() => nav.navigate('FriendProfile', {
                      user_id: item.to_user_id,
                      other_name: item.name ?? '알 수 없음',
                    })}
                  />
                ))}
                {otherSent.map(item => (
                  <SentInterestRow
                    key={item.to_user_id}
                    item={item}
                    onPress={() => nav.navigate('FriendProfile', {
                      user_id: item.to_user_id,
                      other_name: item.name ?? '알 수 없음',
                    })}
                  />
                ))}
              </View>
            )
          )}
        </View>

        {/* ── 채팅 목록 ── */}
        {matches.length === 0 ? (
          <View style={styles.empty}>
            <AppText style={styles.emptyEmoji}>💬</AppText>
            <AppText style={styles.emptyTitle}>아직 채팅이 없어요</AppText>
            <AppText style={styles.emptySub}>
              추천 탭에서 마음에 드는 분께 관심을 표현해보세요.{'\n'}
              서로 관심을 표현하면 채팅이 시작됩니다!
            </AppText>
            <TouchableOpacity
              style={styles.goSuggestionsBtn}
              onPress={() => nav.navigate('Suggestions')}
            >
              <AppText style={styles.goSuggestionsBtnText}>추천 보러가기</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          matches.map((item, idx) => (
            <React.Fragment key={item.match_id}>
              {idx > 0 && <View style={styles.separator} />}
              <ChatRow match={item} onPress={() => handlePress(item)} />
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.text },
  headerCount: {
    fontSize: 14, fontWeight: '700', color: C.primary,
    backgroundColor: C.primaryLight, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden',
  },

  // 채팅 목록 행
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.card,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1, borderColor: C.border,
  },
  avatarPlaceholder: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, color: C.primary, fontWeight: '700' },
  newBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  newBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '800' },

  chatInfo: { flex: 1, marginLeft: 14 },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatName: { fontSize: 16, fontWeight: '600', color: C.text },
  chatNameBold: { fontWeight: '800' },
  newMatchTag: {
    backgroundColor: C.primaryLight, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  newMatchTagText: { fontSize: 12, color: C.primary, fontWeight: '700' },
  chatPreview: { fontSize: 14, color: C.sub, marginTop: 4, lineHeight: 18 },
  chatPreviewBold: { color: C.text, fontWeight: '500' },
  chatPreviewNew: { color: C.primary, fontStyle: 'italic' },

  chatMeta: { alignItems: 'flex-end', marginLeft: 10, gap: 6 },
  chatTime: { fontSize: 13, color: C.sub },
  unreadBadge: {
    backgroundColor: C.unread, borderRadius: 11,
    minWidth: 22, height: 22, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { fontSize: 12, color: '#FFF', fontWeight: '700' },

  separator: { height: 1, backgroundColor: C.border, marginLeft: 82 },

  // 보낸 관심
  sentSection: {
    backgroundColor: C.card, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  sentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  sentHeaderText: { fontSize: 15, fontWeight: '700', color: C.text },
  sentToggle: { fontSize: 13, color: C.sub },
  sentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  sentRowExpired: { opacity: 0.5 },
  sentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.primaryLight, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  sentAvatarText: { fontSize: 16, color: C.primary, fontWeight: '700' },
  sentInfo: { flex: 1, marginLeft: 12 },
  sentName: { fontSize: 14, fontWeight: '600', color: C.text },
  sentSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  sentExpiredText: { color: '#BBB' },
  sentStatus: { alignItems: 'center', gap: 2 },
  sentCountdown: { fontSize: 12, fontWeight: '700' },
  sentStatusText: { fontSize: 12, fontWeight: '600' },
  sentEmpty: {
    paddingHorizontal: 20, paddingVertical: 24,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  sentEmptyText: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20 },

  // 빈 상태
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10 },
  emptySub: { fontSize: 15, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  goSuggestionsBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
  },
  goSuggestionsBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
