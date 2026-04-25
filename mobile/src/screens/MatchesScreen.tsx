import React, { useEffect, useState, useCallback } from 'react';
import {
  View, TouchableOpacity, StyleSheet,
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
import {
  Button, Tag, Badge, Card, ScreenHeader,
  colors, spacing, typography,
} from '../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Matches'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
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
      <View style={styles.avatarContainer}>
        {u.photo_url ? (
          <Image source={{ uri: u.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <AppText style={styles.avatarInitial}>{(u.nickname || u.name).charAt(0)}</AppText>
          </View>
        )}
        {isNewMatch && <View style={styles.newDot} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatNameRow}>
          <AppText style={[styles.chatName, hasUnread && styles.chatNameBold]} numberOfLines={1}>
            {(u.nickname || u.name)}
          </AppText>
          {isNewMatch && <Tag tone="accent" label="새 매칭" />}
        </View>
        <AppText
          style={[
            styles.chatPreview,
            hasUnread && styles.chatPreviewBold,
            isNewMatch && styles.chatPreviewNew,
          ]}
          numberOfLines={1}
        >
          {last_message ? last_message.content : '첫 인사를 건네보세요'}
        </AppText>
      </View>

      <View style={styles.chatMeta}>
        <AppText style={styles.chatTime}>{timeStr}</AppText>
        {hasUnread ? (
          <Badge value={unread_count ?? 0} />
        ) : (
          <View style={styles.badgePlaceholder} />
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
  pending: { label: '대기중', color: colors.warn, icon: '⏳' },
  matched: { label: '매칭됨', color: colors.success, icon: '💕' },
  expired: { label: '만료', color: colors.muted, icon: '⌛' },
};

function SentInterestRow({ item, onPress }: { item: SentInterest; onPress: () => void }) {
  const cfg = STATUS_CONFIG[item.status];
  const currentYear = new Date().getFullYear();
  const age = item.birth_year ? currentYear - item.birth_year : null;
  const isExpired = item.status === 'expired';
  const isUrgent = item.status === 'pending' && item.remaining_hours <= 12;

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
        <AppText style={[styles.sentName, isExpired && styles.sentExpiredText]} numberOfLines={1}>
          {item.name ?? '알 수 없음'}{age ? `, ${age}세` : ''}
        </AppText>
        <AppText style={[styles.sentSub, isExpired && styles.sentExpiredText]} numberOfLines={1}>
          {item.city ?? ''}{item.relationship_goal ? ` · ${item.relationship_goal}` : ''}
        </AppText>
      </View>
      <View style={styles.sentStatus}>
        <AppText style={styles.sentStatusIcon}>{cfg.icon}</AppText>
        {item.status === 'pending' ? (
          <AppText style={[styles.sentCountdown, { color: isUrgent ? colors.danger : colors.warn }]}>
            {formatRemaining(item.remaining_hours)}
          </AppText>
        ) : (
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

  const pendingSent = sentInterests.filter(s => s.status === 'pending');
  const otherSent = sentInterests.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="채팅" />
        <SkeletonLoader variant="match-row" count={6} />
      </SafeAreaView>
    );
  }

  const headerRight = matches.length > 0
    ? <Tag tone="accent" label={String(matches.length)} />
    : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="채팅" right={headerRight} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        {/* 보낸 관심 섹션 */}
        <Card padded={false} style={styles.sentCard}>
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
            <AppText style={styles.sentToggle}>{showSent ? '접기 ▴' : '펼치기 ▾'}</AppText>
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
        </Card>

        {/* 채팅 목록 */}
        {matches.length === 0 ? (
          <View style={styles.empty}>
            <AppText style={styles.emptyTitle}>아직 채팅이 없어요</AppText>
            <AppText style={styles.emptySub}>
              추천 탭에서 마음에 드는 분께 관심을 표현해보세요.{'\n'}
              서로 관심을 표현하면 채팅이 시작됩니다
            </AppText>
            <Button
              label="추천 보러가기"
              variant="primary"
              onPress={() => nav.navigate('Suggestions')}
              fullWidth={false}
            />
          </View>
        ) : (
          <Card padded={false} style={styles.chatListCard}>
            {matches.map((item, idx) => (
              <React.Fragment key={item.match_id}>
                {idx > 0 && <View style={styles.separator} />}
                <ChatRow match={item} onPress={() => handlePress(item)} />
              </React.Fragment>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },

  // 채팅 목록
  chatListCard: { overflow: 'hidden' },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    color: colors.primaryDark,
    fontWeight: typography.bold,
  },
  newDot: {
    position: 'absolute',
    top: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2, borderColor: colors.surface,
  },

  chatInfo: { flex: 1, marginLeft: spacing.sm + 2 },
  chatNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatName: {
    fontSize: typography.body + 1,
    fontWeight: typography.semibold,
    color: colors.text,
    flexShrink: 1,
  },
  chatNameBold: { fontWeight: typography.bold },
  chatPreview: {
    fontSize: typography.caption + 2,
    color: colors.sub,
    marginTop: 4,
    lineHeight: (typography.caption + 2) * typography.lineNormal,
  },
  chatPreviewBold: { color: colors.text, fontWeight: typography.medium },
  chatPreviewNew: { color: colors.primaryDark, fontStyle: 'italic' },

  chatMeta: {
    alignItems: 'flex-end',
    marginLeft: spacing.xs + 2,
    gap: spacing.xs - 2,
  },
  chatTime: {
    fontSize: typography.caption,
    color: colors.muted,
  },
  badgePlaceholder: { width: 22, height: 22 },

  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: spacing.md + 56 + spacing.sm + 2,
  },

  // 보낸 관심
  sentCard: { overflow: 'hidden' },
  sentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sentHeaderText: {
    fontSize: typography.body,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  sentToggle: {
    fontSize: typography.caption,
    color: colors.muted,
    fontWeight: typography.medium,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sentRowExpired: { opacity: 0.55 },
  sentAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  sentAvatarText: {
    fontSize: typography.body,
    color: colors.primaryDark,
    fontWeight: typography.bold,
  },
  sentInfo: { flex: 1, marginLeft: spacing.sm },
  sentName: {
    fontSize: typography.caption + 2,
    fontWeight: typography.semibold,
    color: colors.text,
  },
  sentSub: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    marginTop: 2,
  },
  sentExpiredText: { color: colors.muted },
  sentStatus: { alignItems: 'center', gap: 2, minWidth: 60 },
  sentStatusIcon: { fontSize: typography.body },
  sentCountdown: {
    fontSize: typography.caption,
    fontWeight: typography.bold,
  },
  sentStatusText: {
    fontSize: typography.caption,
    fontWeight: typography.semibold,
  },
  sentEmpty: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  sentEmptyText: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    textAlign: 'center',
    lineHeight: (typography.caption + 1) * typography.lineRelaxed,
  },

  // 빈 상태
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.title,
    fontWeight: typography.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: typography.body,
    color: colors.sub,
    textAlign: 'center',
    lineHeight: typography.body * typography.lineRelaxed,
    marginBottom: spacing.sm,
  },
});
