import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert, Image,
} from 'react-native';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { getMutualMatches } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { MutualMatch, RootStackParamList, MainTabParamList } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

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
            <Text style={styles.avatarInitial}>{u.name.charAt(0)}</Text>
          </View>
        )}
        {isNewMatch && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>N</Text>
          </View>
        )}
      </View>

      {/* 이름 + 마지막 메시지 */}
      <View style={styles.chatInfo}>
        <View style={styles.chatNameRow}>
          <Text style={[styles.chatName, hasUnread && styles.chatNameBold]}>{u.name}</Text>
          {isNewMatch && (
            <View style={styles.newMatchTag}>
              <Text style={styles.newMatchTagText}>새 매칭</Text>
            </View>
          )}
        </View>
        <Text style={[styles.chatPreview, hasUnread && styles.chatPreviewBold, isNewMatch && styles.chatPreviewNew]} numberOfLines={1}>
          {last_message ? last_message.content : '첫 인사를 건네보세요!'}
        </Text>
      </View>

      {/* 시간 + 안 읽은 배지 */}
      <View style={styles.chatMeta}>
        <Text style={styles.chatTime}>{timeStr}</Text>
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {(unread_count ?? 0) > 99 ? '99+' : unread_count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MutualMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const nav = useNavigation<Nav>();
  const { phoneVerified, loadPhoneVerified } = useAuthStore();

  useEffect(() => { loadPhoneVerified(); }, [loadPhoneVerified]);

  const load = useCallback(async () => {
    try {
      const data = await getMutualMatches();
      setMatches(data);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '매칭 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePress = (match: MutualMatch) => {
    if (!phoneVerified) {
      nav.navigate('PhoneVerification', {
        match_id: match.match_id,
        other_name: match.other_user.name,
        other_user_id: match.other_user.id,
      });
    } else {
      nav.navigate('ChatRoom', {
        match_id: match.match_id,
        other_name: match.other_user.name,
        other_user_id: match.other_user.id,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>채팅</Text>
        </View>
        <SkeletonLoader variant="match-row" count={6} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        {matches.length > 0 && (
          <Text style={styles.headerCount}>{matches.length}</Text>
        )}
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>아직 채팅이 없어요</Text>
          <Text style={styles.emptySub}>
            추천 탭에서 마음에 드는 분께 관심을 표현해보세요.{'\n'}
            서로 관심을 표현하면 채팅이 시작됩니다!
          </Text>
          <TouchableOpacity
            style={styles.goSuggestionsBtn}
            onPress={() => nav.navigate('Suggestions')}
          >
            <Text style={styles.goSuggestionsBtnText}>추천 보러가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.match_id}
          renderItem={({ item }) => (
            <ChatRow match={item} onPress={() => handlePress(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.primary}
            />
          }
        />
      )}
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
  newMatchTagText: { fontSize: 11, color: C.primary, fontWeight: '700' },
  chatPreview: { fontSize: 14, color: C.sub, marginTop: 4, lineHeight: 18 },
  chatPreviewBold: { color: C.text, fontWeight: '500' },
  chatPreviewNew: { color: C.primary, fontStyle: 'italic' },

  chatMeta: { alignItems: 'flex-end', marginLeft: 10, gap: 6 },
  chatTime: { fontSize: 12, color: C.sub },
  unreadBadge: {
    backgroundColor: C.unread, borderRadius: 11,
    minWidth: 22, height: 22, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { fontSize: 12, color: '#FFF', fontWeight: '700' },

  separator: { height: 1, backgroundColor: C.border, marginLeft: 82 },

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
