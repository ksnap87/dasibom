import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, SafeAreaView, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSuggestions, expressInterest } from '../api/client';
import { SuggestionProfile } from '../types';
import { useAuthStore } from '../store/authStore';
import SkeletonLoader from '../components/SkeletonLoader';
import ToastContainer, { showToast } from '../components/Toast';

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

// ── 카테고리별 가치관 필드 정의 ──────────────────────────────
type FieldMeta = { label: string; icon: string; values?: Record<string, string>; type?: string };

const FIELD_LABELS: Record<string, FieldMeta> = {
  // 관계 & 가치관
  relationship_goal: {
    label: '관계 목표', icon: '💝',
    values: { marriage: '결혼', companionship: '동반자 관계', friendship: '우정', open: '열린 마음' },
  },
  religion: {
    label: '종교', icon: '⛪',
    values: { none: '무교', buddhism: '불교', christianity: '기독교', catholicism: '천주교', other: '기타' },
  },
  family_importance: { label: '가족 중요도', icon: '👨‍👩‍👧', type: 'scale' },

  // 감성 & 성격
  personality_type: {
    label: '성격 유형', icon: '🧠',
    values: { introvert: '내향형', extrovert: '외향형', ambivert: '양향형' },
  },
  emotional_expression: {
    label: '감정 표현', icon: '💬',
    values: { suppress: '속으로 삭임', delayed_share: '나중에 표현', expressive: '바로 표현' },
  },
  communication_style: {
    label: '대화 스타일', icon: '🗣️',
    values: { listener: '듣는 편', balanced: '균형형', talker: '말하는 편' },
  },
  conflict_style: {
    label: '갈등 해결', icon: '🤝',
    values: { space: '시간 두고', direct: '바로 솔직하게', accommodate: '상대에게 맞춤' },
  },
  social_frequency: {
    label: '사교 빈도', icon: '👥',
    values: { rarely: '거의 안 함', sometimes: '가끔', often: '자주', very_often: '매우 자주' },
  },

  // 일상 & 생활
  chronotype: {
    label: '생활 패턴', icon: '🌅',
    values: { morning: '아침형', evening: '저녁형', flexible: '유연형' },
  },
  rest_style: {
    label: '쉬는 날', icon: '🛋️',
    values: { home: '집에서', light_out: '가벼운 외출', active: '활동적으로' },
  },
  exercise_frequency: {
    label: '운동 빈도', icon: '🏃',
    values: { never: '안 함', rarely: '가끔', sometimes: '주 1–2회', regularly: '주 3회 이상' },
  },
  meal_style: {
    label: '식습관', icon: '🍽️',
    values: { regular: '규칙적', flexible: '유연하게', cook: '직접 요리', dine_out: '외식 위주' },
  },
  smoking: {
    label: '흡연', icon: '🚭',
    values: { never: '비흡연', quit: '금연', occasionally: '가끔', regularly: '흡연' },
  },
  drinking: {
    label: '음주', icon: '🍺',
    values: { never: '안 마심', rarely: '거의 안 마심', socially: '사교적으로', regularly: '자주' },
  },

  // 가족 & 반려동물
  has_children: { label: '자녀 유무', icon: '👶', type: 'bool' },
  willing_to_relocate: { label: '이사 의향', icon: '🏠', type: 'bool' },
  has_pet: { label: '반려동물', icon: '🐾', type: 'bool' },
  pet_type: {
    label: '반려동물 종류', icon: '🐶',
    values: { dog: '강아지', cat: '고양이', both: '강아지+고양이', other: '기타', none: '없음' },
  },
  pet_friendly: { label: '반려동물 수용', icon: '🤗', type: 'bool' },

  // 현실 조건
  financial_stability: {
    label: '재정 상황', icon: '💰',
    values: { stable: '안정적', comfortable: '여유로움', wealthy: '풍요로움' },
  },
  health_status: {
    label: '건강 상태', icon: '💪',
    values: { excellent: '매우 좋음', good: '좋음', fair: '보통', managing: '관리 중' },
  },
};

// 카테고리별 표시 순서
const CATEGORY_SECTIONS: { title: string; fields: string[] }[] = [
  { title: '관계 & 가치관', fields: ['relationship_goal', 'religion', 'family_importance'] },
  { title: '감성 & 성격', fields: ['personality_type', 'emotional_expression', 'communication_style', 'conflict_style', 'social_frequency'] },
  { title: '일상 & 생활', fields: ['chronotype', 'rest_style', 'exercise_frequency', 'meal_style', 'smoking', 'drinking'] },
  { title: '가족 & 반려동물', fields: ['has_children', 'willing_to_relocate', 'has_pet', 'pet_type', 'pet_friendly'] },
  { title: '현실 조건', fields: ['financial_stability', 'health_status'] },
];

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

// previewQuestions는 더 이상 사용하지 않지만 설정 호환성 유지
const DEFAULT_PREVIEW_QUESTIONS = ['relationship_goal', 'religion', 'smoking', 'drinking', 'family_importance'];

const QUOTES = [
  '좋은 인연은 서두르지 않아도 찾아옵니다.',
  '진심은 언제나 통하는 법이에요.',
  '함께 걸을 수 있는 사람이 가장 좋은 사람입니다.',
  '사랑은 찾는 것이 아니라, 만들어가는 것입니다.',
  '좋은 만남은 좋은 나로부터 시작됩니다.',
  '인연은 바람처럼 오지만, 사랑은 뿌리처럼 자랍니다.',
  '마음이 열리면 세상이 달라 보여요.',
  '오래된 친구처럼 편안한 사람, 그런 사람이 좋은 인연이에요.',
  '천천히, 그러나 확실하게 다가가세요.',
  '진짜 인연은 노력 없이도 자연스럽습니다.',
  '좋은 사람은 당신을 더 좋은 사람으로 만들어줍니다.',
  '설렘보다 편안함이 오래갑니다.',
  '마음을 열면 인연은 생각보다 가까이 있어요.',
  '사랑에 늦은 때란 없습니다.',
  '함께여서 더 행복한 하루가 되길 바랍니다.',
];

function getDailyQuote(): string {
  const today = new Date();
  const index = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % QUOTES.length;
  return QUOTES[index];
}

const DAILY_LIMIT = 5;
const EXTRA_PER_CREDIT = 5; // 크레딧 1개당 추가 5명

// ── 필수 조건 필터 ────────────────────────────────────────
function passesRequired(item: SuggestionProfile, conditions: string[], myProfile: any): boolean {
  for (const cond of conditions) {
    // 생활습관
    if (cond === 'no_smoking' && (item.smoking === 'occasionally' || item.smoking === 'regularly')) return false;
    if (cond === 'no_heavy_drinking' && item.drinking === 'regularly') return false;
    if (cond === 'no_drinking' && item.drinking !== 'never') return false;
    // 가치관·관계
    if (cond === 'same_religion' && myProfile?.religion && item.religion !== myProfile.religion) return false;
    if (cond === 'same_relationship_goal' && myProfile?.relationship_goal && item.relationship_goal !== myProfile.relationship_goal) return false;
    // 가족
    if (cond === 'no_children' && item.has_children === true) return false;
    if (cond === 'has_children_ok' && item.has_children !== true) return false;
    if (cond === 'willing_to_relocate' && item.willing_to_relocate !== true) return false;
    // 성격·생활
    if (cond === 'same_chronotype' && myProfile?.chronotype && item.chronotype !== myProfile.chronotype) return false;
    if (cond === 'exercises_regularly' && item.exercise_frequency !== 'regularly' && item.exercise_frequency !== 'sometimes') return false;
    // 건강·재정
    if (cond === 'good_health' && item.health_status !== 'excellent' && item.health_status !== 'good') return false;
    if (cond === 'financially_stable' && item.financial_stability !== 'stable' && item.financial_stability !== 'comfortable' && item.financial_stability !== 'wealthy') return false;
  }
  return true;
}

// ── 카드 컴포넌트 (가치관 중심, 사진 없음) ─────────────────────
function ProfileCard({
  item,
  onLike,
  onPass,
  acting,
}: {
  item: SuggestionProfile;
  onLike: () => void;
  onPass: () => void;
  acting: boolean;
}) {
  const age = new Date().getFullYear() - item.birth_year;
  const translateX = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  const animateOut = (direction: 'left' | 'right', callback: () => void) => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction === 'right' ? 300 : -300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
    });
  };

  const handleLike = () => animateOut('right', onLike);
  const handlePass = () => animateOut('left', onPass);

  // 호환성 점수를 퍼센트로 표시
  const scorePercent = Math.round(item.compatibility_score * 100);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateX }],
          opacity: cardOpacity,
        },
      ]}
    >
      {/* Header: 이니셜 + 기본정보 + 호환성 점수 */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.nameText}>{item.name}, {age}세</Text>
          <Text style={styles.cityText}>📍 {item.city}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{scorePercent}%</Text>
          <Text style={styles.scoreLabel}>호환</Text>
        </View>
      </View>

      {/* 취미 태그 (있으면) */}
      {item.hobbies && item.hobbies.length > 0 && (
        <View style={styles.hobbyRow}>
          {item.hobbies.slice(0, 5).map((h, i) => (
            <View key={i} style={styles.hobbyTag}>
              <Text style={styles.hobbyText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 카테고리별 가치관 답변 */}
      {CATEGORY_SECTIONS.map(section => {
        const rows = section.fields
          .map(field => {
            const meta = FIELD_LABELS[field];
            if (!meta) return null;
            const val = getDisplayValue(field, (item as any)[field]);
            if (!val) return null;
            return { field, meta, val };
          })
          .filter(Boolean) as { field: string; meta: FieldMeta; val: string }[];

        if (rows.length === 0) return null;

        return (
          <View key={section.title} style={styles.qaCategory}>
            <Text style={styles.qaCategoryTitle}>{section.title}</Text>
            {rows.map(({ field, meta, val }) => (
              <View key={field} style={styles.qaRow}>
                <Text style={styles.qaLabel}>{meta.icon} {meta.label}</Text>
                <Text style={styles.qaValue}>{val}</Text>
              </View>
            ))}
          </View>
        );
      })}

      {/* 자기소개 (있으면) */}
      {item.bio ? (
        <View style={styles.bioSection}>
          <Text style={styles.bioText}>"{item.bio}"</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.passBtn, acting && styles.disabledBtn]}
          onPress={handlePass}
          disabled={acting}
        >
          <Text style={styles.passBtnText}>다음에</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.likeBtn, acting && styles.disabledBtn]}
          onPress={handleLike}
          disabled={acting}
        >
          <Text style={styles.likeBtnText}>💌 관심 있어요</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── 메인 화면 ─────────────────────────────────────────────
export default function SuggestionsScreen() {
  const nav = useNavigation<any>();
  const [suggestions, setSuggestions] = useState<SuggestionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<string[]>(DEFAULT_PREVIEW_QUESTIONS);
  const [requiredConditions, setRequiredConditions] = useState<string[]>([]);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(DAILY_LIMIT);
  const [dailyDone, setDailyDone] = useState(false);
  const [myProfile, setMyProfile] = useState<any>(null);
  const { credits, deductCredit, loadCredits } = useAuthStore();

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
          const limit = parsed.limit ?? DAILY_LIMIT;
          setDailyCount(parsed.count);
          setDailyLimit(limit);
          if (parsed.count >= limit) setDailyDone(true);
        } else {
          // 날짜 바뀌면 리셋
          await AsyncStorage.setItem(STORAGE_KEYS.dailySeen, JSON.stringify({ date: today, count: 0, limit: DAILY_LIMIT }));
          setDailyLimit(DAILY_LIMIT);
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
    await AsyncStorage.setItem(STORAGE_KEYS.dailySeen, JSON.stringify({ date: today, count: newCount, limit: dailyLimit }));
    if (newCount >= dailyLimit) setDailyDone(true);
  };

  const handleUnlockMore = () => {
    if (credits <= 0) {
      Alert.alert('크레딧 부족', '추가 추천을 보려면 크레딧이 필요합니다.\n프로필 탭에서 크레딧을 충전해주세요.');
      return;
    }
    Alert.alert(
      '추가 추천 열기',
      `크레딧 1개를 사용하여 오늘 ${EXTRA_PER_CREDIT}명을 더 볼 수 있어요.\n\n현재 보유: ${credits}개`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '사용하기',
          onPress: async () => {
            const ok = await deductCredit(1);
            if (!ok) {
              Alert.alert('오류', '크레딧 차감에 실패했습니다.');
              return;
            }
            const newLimit = dailyLimit + EXTRA_PER_CREDIT;
            setDailyLimit(newLimit);
            setDailyDone(false);
            const today = new Date().toISOString().slice(0, 10);
            await AsyncStorage.setItem(STORAGE_KEYS.dailySeen, JSON.stringify({ date: today, count: dailyCount, limit: newLimit }));
            await loadCredits();
            showToast(`추천 ${EXTRA_PER_CREDIT}명 추가 열람!`);
            load();
          },
        },
      ],
    );
  };

  const handleInterest = async (id: string, liked: boolean) => {
    setActing(id);
    try {
      const result = await expressInterest(id, liked);
      setSuggestions(prev => prev.filter(s => s.id !== id));
      await incrementDailyCount();
      if (result.matched) {
        Alert.alert('🎉 매칭 성공!', `서로 관심이 있습니다!\n채팅 탭에서 대화를 시작해보세요.`);
      } else if (liked) {
        showToast('관심을 표현했어요 💌');
      }
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '처리 실패');
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🌸 추천 상대</Text>
        </View>
        <SkeletonLoader variant="card" count={2} />
        <ToastContainer />
      </SafeAreaView>
    );
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
          <Text style={styles.emptySub}>
            오늘 {dailyCount}명을 확인했어요.{'\n'}
            내일 새로운 추천 상대가 찾아올 거예요
          </Text>
          <TouchableOpacity style={styles.creditBtn} onPress={handleUnlockMore}>
            <Text style={styles.creditBtnText}>💎 크레딧으로 {EXTRA_PER_CREDIT}명 더 보기</Text>
          </TouchableOpacity>
          <Text style={styles.creditHint}>보유 크레딧: {credits}개</Text>
        </View>
        <ToastContainer />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌸 추천 상대</Text>
        <View style={styles.headerRight}>
          <Text style={styles.dailyBadge}>오늘 {dailyCount}/{dailyLimit}</Text>
          <Text style={styles.headerSub}>{suggestions.length}명</Text>
        </View>
      </View>

      <View style={styles.quoteBanner}>
        <Text style={styles.quoteText}>"{getDailyQuote()}"</Text>
      </View>

      {suggestions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌸</Text>
          <Text style={styles.emptyTitle}>모든 추천 상대를 확인했어요</Text>
          <Text style={styles.emptySub}>
            잠시 후 새로운 추천 상대가 나타날 거예요{'\n'}
            프로필 탭에서 추천 조건을 조정하면{'\n'}
            더 많은 추천을 받을 수 있어요
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); load(); }}>
            <Text style={styles.refreshBtnText}>새로고침</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterHintBtn}
            onPress={() => nav.navigate('Profile', { scrollTo: 'recommendations' })}
          >
            <Text style={styles.filterHintText}>추천 조건 바로가기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ProfileCard
              item={item}
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
      <ToastContainer />
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
  quoteBanner: {
    marginHorizontal: 16, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: C.primaryLight, borderRadius: 12,
  },
  quoteText: { fontSize: 13, color: C.primary, fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
  list: { padding: 16, paddingBottom: 32, gap: 16 },

  card: { backgroundColor: C.card, borderRadius: 16, padding: 18, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 20, color: C.primary, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameText: { fontSize: 18, fontWeight: '700', color: C.text },
  cityText: { fontSize: 13, color: C.sub, marginTop: 2 },
  scoreBadge: {
    alignItems: 'center', backgroundColor: C.primaryLight, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  scoreText: { fontSize: 18, fontWeight: '800', color: C.primary },
  scoreLabel: { fontSize: 10, color: C.primary, marginTop: -2 },

  hobbyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  hobbyTag: {
    backgroundColor: '#FFF0F3', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  hobbyText: { fontSize: 12, color: C.primary },

  qaCategory: { marginBottom: 12 },
  qaCategoryTitle: { fontSize: 12, fontWeight: '700', color: C.primary, marginBottom: 6, letterSpacing: 0.5 },
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F5F0EE' },
  qaLabel: { fontSize: 14, color: C.sub },
  qaValue: { fontSize: 14, color: C.text, fontWeight: '600' },

  bioSection: {
    backgroundColor: '#FFF8F5', borderRadius: 10, padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  bioText: { fontSize: 14, color: C.text, fontStyle: 'italic', lineHeight: 20 },

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
  emptySub: { fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  refreshBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  refreshBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  filterHintBtn: {
    marginTop: 12, paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5, borderColor: C.border,
  },
  filterHintText: { fontSize: 14, color: C.sub, fontWeight: '600' },
  creditBtn: { borderWidth: 1.5, borderColor: C.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8, backgroundColor: '#FFFBF0' },
  creditBtnText: { color: C.gold, fontSize: 15, fontWeight: '700' },
  creditHint: { fontSize: 12, color: C.sub, marginTop: 8 },
});
