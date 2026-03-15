import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMutualMatches } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { MutualMatch, RootStackParamList } from '../types';
import SkeletonLoader from '../components/SkeletonLoader';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
};

function MatchCard({ match, onPress }: { match: MutualMatch; onPress: () => void }) {
  const { other_user: u } = match;
  const age = new Date().getFullYear() - u.birth_year;
  const matchDate = new Date(match.created_at).toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {u.photo_url ? (
        <Image source={{ uri: u.photo_url }} style={styles.avatarPhoto} />
      ) : (
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{u.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.nameText}>{u.name}, {age}세</Text>
        <Text style={styles.cityText}>📍 {u.city}</Text>
        {u.bio ? <Text style={styles.bioSnippet} numberOfLines={1}>{u.bio}</Text> : null}
        <Text style={styles.dateText}>{matchDate}에 매칭됨</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.chatArrow}>프로필 보기 →</Text>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💌 나의 매칭</Text>
        </View>
        <SkeletonLoader variant="match-row" count={4} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💌 나의 매칭</Text>
        <Text style={styles.headerSub}>서로 관심을 표현한 {matches.length}명</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌺</Text>
          <Text style={styles.emptyTitle}>아직 매칭이 없어요</Text>
          <Text style={styles.emptySub}>
            추천 탭에서 마음에 드는 분께 관심을 표현해보세요.{'\n'}
            상대방도 관심을 표현하면 매칭이 됩니다!
          </Text>
          <TouchableOpacity
            style={styles.goSuggestionsBtn}
            onPress={() => {
              // Navigate to the Suggestions tab within the bottom tab navigator
              (nav as any).navigate('Suggestions');
            }}
          >
            <Text style={styles.goSuggestionsBtnText}>🌸 추천 보러가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.match_id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={() => {
                nav.navigate('FriendProfile', {
                  user_id: item.other_user.id,
                  match_id: item.match_id,
                  other_name: item.other_user.name,
                });
              }}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={C.primary} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: C.text },
  headerSub: { fontSize: 14, color: C.sub, marginTop: 4 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 16, padding: 16, elevation: 2,
  },
  avatarPhoto: {
    width: 56, height: 56, borderRadius: 28, marginRight: 14,
    borderWidth: 2, borderColor: C.primaryLight,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 24, color: C.primary, fontWeight: '700' },
  info: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: C.text },
  cityText: { fontSize: 13, color: C.sub, marginTop: 2 },
  bioSnippet: { fontSize: 13, color: '#777', marginTop: 3 },
  dateText: { fontSize: 12, color: C.sub, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
  chatArrow: { fontSize: 13, color: C.primary, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 10, textAlign: 'center' },
  emptySub: { fontSize: 15, color: C.sub, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  goSuggestionsBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  goSuggestionsBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
