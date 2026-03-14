import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSuggestions, expressInterest } from '../api/client';
import { SuggestionProfile } from '../types';

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
  gold: '#F9A825',
};

// ── 값 → 한국어 레이블 ────────────────────────────────────

const FIELD_LABELS: Record<string, { label: string; icon: string; values?: Record<string, string>; type?: string }> = {
  relationship_goal: {
    label: '관계 목표', icon: '💝',
    values: { marriage: '결혼', companionship: '동반자 관계', friendship: '우정', open: '열린 마음' },
  },
  religion: {
    label: '종교', icon: '⛪',
    values: { none: '무교', buddhism: '불교', christianity: '기독교', catholicism: '천주교', other: '기타' },
  },
  smoking: {
    label: '흡연', icon: '🚭',
    values: { never: '비흡연', quit: '금연', occasionally: '가끔', regularly: '흡연' },
  },
  drinking: {
    label: '음주', icon: '🍺',
    values: { never: '안 마심', rarely: '거의 안 마심', socially: '사교적으로', regularly: '자주' },
  },
  family_importance: { label: '가족 중요도', icon: '👨‍👩‍👧', type: 'scale' },
  exercise_frequency: {
    label: '운동 빈도', icon: '🏃',
    values: { never: '안 함', rarely: '가끔', sometimes: '주 1–2회', regularly: '주 3회 이상' },
  },
  has_children: { label: '자녀 유무', icon: '👶', type: 'bool' },
  willing_to_relocate: { label: '이사 의향', icon: '🏠', type: 'bool' },
  financial_stability: {
    label: '재정 상황', icon: '💰',
    values: { stable: '안정적', comfortable: '여유로움', wealthy: '풍요로움' },
  },
  health_status: {
    label: '건강 상태', icon: '💪',
    values: { excellent: '매우 좋음', good: '좋음', fair: '보통', managing: '관리 중' },
  },
  chronotype: {
    label: '생활 패턴', icon: '🌅',
    values: { morning: '아침형', evening: '저녁형', flexible: '유연형' },
  },
  personality_type: {
    label: '성격 유형', icon: '🧠',
    values: { introvert: '내향형', extrovert: '외향형', ambivert: '양향형' },
  },
  conflict_style: {
    label: '갈등 해결', icon: '🤝',
    values: { space: '시간 두고', direct: '바로 솔직하게', accommodate: '상대에게 맞춤' },
  },
};

function getDisplayValue(field: string, value: any): string {
  const meta = FIELD_LABELS[field];
  if (!meta) return String(value ?? '');
  if (meta.type === 'bool') return value === true ? '있음' : value === false ? '없음' : '';
  if (meta.type === 'scale') return value != null ? `${value} / 5` : '';
  if (meta.values && value) return meta.values[value] ?? value;
  return String(value ?? '');
}

// ── 스토리지 키 ────────────────────────────────────────────
const STORAGE_KEYS = {
  previewQuestions: '@dasibom_preview_questions',
  requiredConditions: '@dasibom_required_conditions',
  discoveryFilters: '@dasibom_discovery_filters',
  dailySeen: '@dasibom_daily_seen',
};

const DEFAULT_PREVIEW_QUESTIONS = ['relationship_goal', 'religion', 'smoking', 'drinking', 'family_importance'];
const DAILY_LIMIT = 5;

// ── 필수 조건 필터 ────────────────────────────────────────
function passesRequired(item: SuggestionProfile, conditions: string[], myProfile: any): boolean {
  for (const cond of conditions) {
    if (cond === 'no_smoking' && (item.smoking === 'occasionally' || item.smoking === 'regularly')) return false;
    if (cond === 'no_heavy_drinking' && item.drinking === 'regularly') return false;
    if (cond === 'same_religion' && myProfile?.religion && item.religion !== myProfile.religion) return false;
    if (cond === 'same_relationship_goal' && myProfile?.relationship_goal && item.relationship_goal !== myProfile.relationship_goal) return false;
  }
  return true;
}

// ── 카드 컴포넌트 ─────────────────────────────────────────
function ProfileCard({
  item,
  previewQuestions,
  onLike,
  onPass,
  acting,
}: {
  item: SuggestionProfile;
  previewQuestions: string[];
  onLike: () => void;
  onPass: () => void;
  acting: boolean;
}) {
  const age = new Date().getFullYear() - item.birth_year;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.nameText}>{item.name}, {age}세</Text>
          <Text style={styles.cityText}>📍 {item.city}</Text>
        </View>
        {/* 매칭 전 전체 프로필 잠금 표시 */}
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => Alert.alert('💎 크레딧 기능', '매칭 전 전체 프로필 보기는\n추후 크레딧으로 이용 가능합니다.')}
        >
          <Text style={styles.lockBtnText}>전체 보기 🔒</Text>
        </TouchableOpacity>
      </View>

      {/* 미리 보기 Q&A */}
      <View style={styles.qaSection}>
        {previewQuestions.map(field => {
          const meta = FIELD_LABELS[field];
          if (!meta) return null;
          const displayVal = getDisplayValue(field, (item as any)[field]);
          if (!displayVal) return null;
          return (
            <View key={field} style={styles.qaRow}>
              <Text style={styles.qaLabel}>{meta.icon} {meta.label}</Text>
              <Text style={styles.qaValue}>{displayVal}</Text>
            </View>
          );
        })}
        {previewQuestions.length === 0 && (
          <Text style={styles.qaEmpty}>내 프로필에서 먼저 확인할 항목을 설정해보세요</Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.passBtn, acting && styles.disabledBtn]}
          onPress={onPass}
          disabled={acting}
        >
          <Text style={styles.passBtnText}>다음에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.likeBtn, acting && styles.disabledBtn]}
          onPress={onLike}
          disabled={acting}
        >
          <Text style={styles.likeBtnText}>💌 관심 있어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────
export default function SuggestionsScreen() {
  const [suggestions, setSuggestions] = useState<SuggestionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<string[]>(DEFAULT_PREVIEW_QUESTIONS);
  const [requiredConditions, setRequiredConditions] = useState<string[]>([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyDone, setDailyDone] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);

  const loadLocalSettings = useCallback(async () => {
    try {
      const [pq, rc, ds] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.previewQuestions),
        AsyncStorage.getItem(STORAGE_KEYS.requiredConditions),
        AsyncStorage.getItem(STORAGE_KEYS.dailySeen),
      ]);
      if (pq) setPreviewQuestions(JSON.parse(pq));
      if (rc) setRequiredConditions(JSON.parse(rc));

      const today = new Date().toISOString().slice(0, 10);
      if (ds) {
        const parsed = JSON.parse(ds);
        if (parsed.date === today) {
          setDailyCount(parsed.count);
          if (parsed.count >= DAILY_LIMIT) setDailyDone(true);
        } else {
          // 날짜 바뀌면 리셋
          await AsyncStorage.setItem(STORAGE_KEYS.dailySeen, JSON.stringify({ date: today, count: 0 }));
        }
      }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      // 발견 필터 로드 (지역/관계목표)
      const dfStr = await AsyncStorage.getItem(STORAGE_KEYS.discoveryFilters);
      let params = '';
      if (dfStr) {
        const df = JSON.parse(dfStr);
        const parts: string[] = [];
        if (df.region_filter && df.region_filter !== 'nationwide') parts.push(`region=${df.region_filter}`);
        if (df.relationship_goal_match) parts.push('relationship_goal_match=true');
        if (parts.length) params = '?' + parts.join('&');
      }

      // API에 발견 필터 파라미터 전달 (client.ts의 getSuggestions를 직접 확장하지 않고 axios로 직접)
      const { default: api } = await import('../api/client');
      const profileRes = await api.get('/api/profiles/me');
      setMyProfile(profileRes.data);
      const suggestRes = await api.get('/api/matches/suggestions' + params);
      const raw: SuggestionProfile[] = suggestRes.data;

      // 필수 조건 클라이언트 필터링
      const rcStr = await AsyncStorage.getItem(STORAGE_KEYS.requiredConditions);
      const rc = rcStr ? JSON.parse(rcStr) : [];
      const filtered = raw.filter(item => passesRequired(item, rc, profileRes.data));

      setSuggestions(filtered);
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '불러오기 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLocalSettings().then(load);
  }, [loadLocalSettings, load]);

  const incrementDailyCount = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    await AsyncStorage.setItem(STORAGE_KEYS.dailySeen, JSON.stringify({ date: today, count: newCount }));
    if (newCount >= DAILY_LIMIT) setDailyDone(true);
  };

  const handleInterest = async (id: string, liked: boolean) => {
    setActing(id);
    try {
      const result = await expressInterest(id, liked);
      setSuggestions(prev => prev.filter(s => s.id !== id));
      await incrementDailyCount();
      if (result.matched) {
        Alert.alert('🎉 매칭 성공!', `서로 관심이 있습니다!\n채팅 탭에서 대화를 시작해보세요.`);
      }
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '처리 실패');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  // 하루 제한 도달
  if (dailyDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌸 추천 상대</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌙</Text>
          <Text style={styles.emptyTitle}>오늘 추천을 모두 확인했어요</Text>
          <Text style={styles.emptySub}>내일 새로운 추천 상대가 찾아올 거예요</Text>
          <TouchableOpacity
            style={styles.creditBtn}
            onPress={() => Alert.alert('💎 크레딧 기능', '크레딧으로 추가 추천을 보는 기능은\n추후 지원 예정입니다.')}
          >
            <Text style={styles.creditBtnText}>💎 크레딧으로 더 보기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌸 추천 상대</Text>
        <View style={styles.headerRight}>
          <Text style={styles.dailyBadge}>오늘 {dailyCount}/{DAILY_LIMIT}</Text>
          <Text style={styles.headerSub}>{suggestions.length}명</Text>
        </View>
      </View>

      {suggestions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌸</Text>
          <Text style={styles.emptyTitle}>모든 추천 상대를 확인했어요</Text>
          <Text style={styles.emptySub}>잠시 후 새로운 추천 상대가 나타날 거예요</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); load(); }}>
            <Text style={styles.refreshBtnText}>새로고침</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProfileCard
              item={item}
              previewQuestions={previewQuestions}
              onLike={() => handleInterest(item.id, true)}
              onPass={() => handleInterest(item.id, false)}
              acting={acting === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
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
  header: { padding: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: C.text },
  headerRight: { alignItems: 'flex-end' },
  headerSub: { fontSize: 13, color: C.sub },
  dailyBadge: { fontSize: 12, color: C.primary, fontWeight: '700', backgroundColor: C.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  list: { padding: 16, gap: 16 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 22, color: C.primary, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: C.text },
  cityText: { fontSize: 13, color: C.sub, marginTop: 2 },
  lockBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  lockBtnText: { fontSize: 11, color: C.sub },

  qaSection: { marginBottom: 14, gap: 8 },
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F0EE' },
  qaLabel: { fontSize: 14, color: C.sub },
  qaValue: { fontSize: 14, color: C.text, fontWeight: '600' },
  qaEmpty: { fontSize: 14, color: C.sub, textAlign: 'center', paddingVertical: 12 },

  actionRow: { flexDirection: 'row', gap: 10 },
  passBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  passBtnText: { fontSize: 16, color: C.sub, fontWeight: '600' },
  likeBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  likeBtnText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 24 },
  refreshBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  refreshBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  creditBtn: { borderWidth: 1.5, borderColor: C.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  creditBtnText: { color: C.gold, fontSize: 15, fontWeight: '700' },
});
