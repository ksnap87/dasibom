import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Image, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyProfile, uploadPhoto } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { Profile, RootStackParamList } from '../types';

// ── 설정 상수 ────────────────────────────────────────────

const PREVIEW_QUESTION_OPTIONS: { field: string; label: string; icon: string }[] = [
  { field: 'relationship_goal', label: '관계 목표', icon: '💝' },
  { field: 'religion', label: '종교', icon: '⛪' },
  { field: 'smoking', label: '흡연', icon: '🚭' },
  { field: 'drinking', label: '음주', icon: '🍺' },
  { field: 'family_importance', label: '가족 중요도', icon: '👨‍👩‍👧' },
  { field: 'exercise_frequency', label: '운동 빈도', icon: '🏃' },
  { field: 'has_children', label: '자녀 유무', icon: '👶' },
  { field: 'willing_to_relocate', label: '이사 의향', icon: '🏠' },
  { field: 'financial_stability', label: '재정 상황', icon: '💰' },
  { field: 'health_status', label: '건강 상태', icon: '💪' },
  { field: 'chronotype', label: '생활 패턴', icon: '🌅' },
  { field: 'personality_type', label: '성격 유형', icon: '🧠' },
  { field: 'conflict_style', label: '갈등 해결 방식', icon: '🤝' },
];

const DEFAULT_PREVIEW_QUESTIONS = ['relationship_goal', 'religion', 'smoking', 'drinking', 'family_importance'];

const REQUIRED_CONDITION_OPTIONS: { key: string; label: string }[] = [
  { key: 'no_smoking', label: '흡연자는 안 돼요' },
  { key: 'no_heavy_drinking', label: '술을 자주 마시는 분은 안 돼요' },
  { key: 'same_religion', label: '같은 종교여야 해요' },
  { key: 'same_relationship_goal', label: '관계 목표가 같아야 해요' },
];

const REGION_OPTIONS: { value: string; label: string }[] = [
  { value: 'nationwide', label: '전국 (지역 무관)' },
  { value: 'metro', label: '수도권 (서울·경기·인천)' },
  { value: 'same_city', label: '같은 시/도만' },
];

const CITY_OPTIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const STORAGE_KEYS = {
  previewQuestions: '@dasibom_preview_questions',
  requiredConditions: '@dasibom_required_conditions',
  discoveryFilters: '@dasibom_discovery_filters',
};

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

const LABELS: Record<string, Record<string, string>> = {
  gender: { male: '남성', female: '여성' },
  looking_for: { male: '남성', female: '여성', any: '무관' },
  relationship_goal: { marriage: '결혼', companionship: '동반자 관계', friendship: '우정', open: '열린 마음' },
  personality_type: { introvert: '혼자 있을 때 에너지 충전', extrovert: '사람들과 함께할 때 활기', ambivert: '혼자도 함께도 편안' },
  emotional_expression: { suppress: '혼자 정리하는 편', delayed_share: '나중에 털어놓는 편', expressive: '바로 표현하는 편' },
  communication_style: { listener: '주로 들어주는 편', balanced: '듣기도 말하기도', talker: '이야기 나누기 좋아함' },
  conflict_style: { space: '시간 두고 이야기', direct: '바로 솔직하게', accommodate: '상대방에게 맞춤' },
  social_frequency: { rarely: '낯설고 어렵게 느껴짐', sometimes: '자연스럽게 편해짐', often: '자주 모임을 즐김', very_often: '언제나 기대되고 즐거움' },
  chronotype: { morning: '아침형 (일찍 자고 일찍 기상)', evening: '저녁형 (늦게 자고 늦게 기상)', flexible: '그날그날 달라요' },
  rest_style: { home: '집에서 조용히 휴식', light_out: '가볍게 산책·나들이', active: '활발하게 밖에서 활동' },
  meal_style: { regular: '규칙적으로 챙겨 먹음', flexible: '입맛 따라 먹음', cook: '직접 요리 즐김', dine_out: '외식·배달 자주 함' },
  religion: { none: '무교', buddhism: '불교', christianity: '기독교', catholicism: '천주교', other: '기타' },
  financial_stability: { stable: '안정적', comfortable: '여유로움', wealthy: '풍요로움' },
  health_status: { excellent: '매우 좋음', good: '좋음', fair: '보통', managing: '관리 중' },
  exercise_frequency: { never: '안 함', rarely: '가끔', sometimes: '주 1–2회', regularly: '주 3회 이상' },
  smoking: { never: '비흡연', quit: '금연', occasionally: '가끔', regularly: '흡연' },
  drinking: { never: '안 마심', rarely: '거의 안 마심', socially: '사교적으로', regularly: '자주' },
  living_situation: { alone: '혼자', with_family: '가족과 함께', with_children: '자녀와 함께', other: '기타' },
};

const HOBBY_LABELS: Record<string, string> = {
  hiking: '등산', travel: '여행', cooking: '요리', reading: '독서',
  music: '음악', gardening: '원예', golf: '골프', swimming: '수영',
  yoga: '요가/필라테스', photography: '사진', volunteering: '봉사활동',
  movies: '영화 감상', dancing: '댄스', art: '미술/공예', walking: '산책', fishing: '낚시',
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children, onEdit }: {
  title: string; children: React.ReactNode; onEdit?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.sectionEditBtn}>
            <Text style={styles.sectionEditText}>수정</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // ── 설정 상태 ──
  const [previewQuestions, setPreviewQuestions] = useState<string[]>(DEFAULT_PREVIEW_QUESTIONS);
  const [requiredConditions, setRequiredConditions] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>('nationwide');
  const [goalMatch, setGoalMatch] = useState<boolean>(false);
  const [showPreviewPicker, setShowPreviewPicker] = useState(false);
  const [showRequiredPicker, setShowRequiredPicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const { signOut, setProfile: setStoreProfile, credits, loadCredits, phoneVerified, loadPhoneVerified } = useAuthStore();

  const loadSettings = useCallback(async () => {
    try {
      const [pq, rc, df] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.previewQuestions),
        AsyncStorage.getItem(STORAGE_KEYS.requiredConditions),
        AsyncStorage.getItem(STORAGE_KEYS.discoveryFilters),
      ]);
      if (pq) setPreviewQuestions(JSON.parse(pq));
      if (rc) setRequiredConditions(JSON.parse(rc));
      if (df) {
        const parsed = JSON.parse(df);
        if (parsed.region_filter) setRegionFilter(parsed.region_filter);
        if (parsed.relationship_goal_match !== undefined) setGoalMatch(parsed.relationship_goal_match);
      }
    } catch {}
  }, []);

  useEffect(() => {
    getMyProfile()
      .then(data => { setProfile(data); setStoreProfile(data); })
      .catch(() => Alert.alert('오류', '프로필을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
    loadCredits();
    loadPhoneVerified();
    loadSettings();
  }, [setStoreProfile, loadCredits, loadPhoneVerified, loadSettings]);

  const savePreviewQuestions = async (qs: string[]) => {
    setPreviewQuestions(qs);
    await AsyncStorage.setItem(STORAGE_KEYS.previewQuestions, JSON.stringify(qs));
  };

  const saveRequiredConditions = async (rc: string[]) => {
    setRequiredConditions(rc);
    await AsyncStorage.setItem(STORAGE_KEYS.requiredConditions, JSON.stringify(rc));
  };

  const saveDiscoveryFilters = async (region: string, goal: boolean) => {
    setRegionFilter(region);
    setGoalMatch(goal);
    await AsyncStorage.setItem(STORAGE_KEYS.discoveryFilters, JSON.stringify({ region_filter: region, relationship_goal_match: goal }));
  };

  const togglePreviewQuestion = (field: string) => {
    if (previewQuestions.includes(field)) {
      savePreviewQuestions(previewQuestions.filter(q => q !== field));
    } else {
      if (previewQuestions.length >= 5) {
        Alert.alert('최대 5개', '확인할 항목은 최대 5개까지 선택할 수 있어요.');
        return;
      }
      savePreviewQuestions([...previewQuestions, field]);
    }
  };

  const toggleRequiredCondition = (key: string) => {
    if (requiredConditions.includes(key)) {
      saveRequiredConditions(requiredConditions.filter(k => k !== key));
    } else {
      if (requiredConditions.length >= 3) {
        Alert.alert('💎 크레딧 기능', '조건은 기본 3개까지 설정할 수 있어요.\n더 많은 조건은 추후 크레딧으로 추가 가능합니다.');
        return;
      }
      saveRequiredConditions([...requiredConditions, key]);
    }
  };

  const handlePickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    });

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri!;
    setUploading(true);
    try {
      const photoUrl = await uploadPhoto(uri);
      setProfile(prev => prev ? { ...prev, photo_url: photoUrl } : prev);
      setStoreProfile(profile ? { ...profile, photo_url: photoUrl } : null);
      Alert.alert('완료', '프로필 사진이 업데이트되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '사진 업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleEditQuestionnaire = () => {
    if (credits <= 0) {
      Alert.alert(
        '크레딧 부족',
        '가치관 수정에는 크레딧 1개가 필요합니다.\n크레딧이 없습니다.',
        [{ text: '확인' }],
      );
      return;
    }
    Alert.alert(
      '가치관 수정',
      `크레딧 1개를 사용하여 가치관을 수정합니다.\n현재 보유: ${credits}개`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '수정하기',
          onPress: () => nav.navigate('QuestionnaireEdit'),
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>프로필이 없습니다.</Text>
      </View>
    );
  }

  const age = new Date().getFullYear() - profile.birth_year;
  const l = (category: string, val?: string | null) =>
    val ? (LABELS[category]?.[val] ?? val) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* 크레딧 배너 */}
        <View style={styles.creditBanner}>
          <View style={styles.creditLeft}>
            <Text style={styles.creditIcon}>💎</Text>
            <View>
              <Text style={styles.creditLabel}>보유 크레딧</Text>
              <Text style={styles.creditValue}>{credits}개</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.creditBuyBtn}>
            <Text style={styles.creditBuyText}>충전하기</Text>
          </TouchableOpacity>
        </View>

        {/* 본인인증 배너 (미인증 시) */}
        {!phoneVerified && (
          <View style={styles.verifyBanner}>
            <Text style={styles.verifyIcon}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>본인인증이 필요합니다</Text>
              <Text style={styles.verifySub}>채팅을 시작하려면 휴대폰 인증이 필요해요</Text>
            </View>
            <View style={styles.verifyBadge}>
              <Text style={styles.verifyBadgeText}>미인증</Text>
            </View>
          </View>
        )}
        {phoneVerified && (
          <View style={[styles.verifyBanner, { borderColor: '#27AE60', backgroundColor: '#E8F5E9' }]}>
            <Text style={styles.verifyIcon}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.verifyTitle, { color: '#27AE60' }]}>본인인증 완료</Text>
              <Text style={styles.verifySub}>채팅 기능이 활성화되었습니다</Text>
            </View>
          </View>
        )}

        {/* Hero */}
        <View style={styles.hero}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploading} style={styles.avatarWrapper}>
            {profile.photo_url ? (
              <Image source={{ uri: profile.photo_url }} style={styles.bigPhoto} />
            ) : (
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarText}>{profile.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              {uploading
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.cameraBtnText}>📷</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroSub}>{age}세 · {profile.city}</Text>
          {profile.bio ? <Text style={styles.heroBio}>{profile.bio}</Text> : null}
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploading} style={styles.changePhotoBtn}>
            <Text style={styles.changePhotoText}>
              {profile.photo_url ? '사진 변경' : '사진 추가'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 가치관 수정 버튼 */}
        <TouchableOpacity style={styles.editValueBtn} onPress={handleEditQuestionnaire}>
          <Text style={styles.editValueIcon}>✏️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.editValueTitle}>가치관 수정하기</Text>
            <Text style={styles.editValueSub}>답변을 변경하면 매칭 결과가 달라질 수 있어요</Text>
          </View>
          <View style={styles.editValueCost}>
            <Text style={styles.editValueCostIcon}>💎</Text>
            <Text style={styles.editValueCostText}>1개</Text>
          </View>
        </TouchableOpacity>

        {/* ─── 추천 상대 조건 (발견 필터) ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 추천 상대 지역 설정</Text>
          </View>
          {/* 내 거주지역 수정 */}
          <Text style={styles.settingLabel}>내 거주지역</Text>
          <TouchableOpacity
            style={styles.settingSelect}
            onPress={() => setShowCityPicker(v => !v)}
          >
            <Text style={styles.settingSelectText}>{profile.city || '선택'}</Text>
            <Text style={styles.settingSelectArrow}>{showCityPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showCityPicker && (
            <View style={styles.pickerList}>
              {CITY_OPTIONS.map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.pickerItem, profile.city === city && styles.pickerItemActive]}
                  onPress={async () => {
                    setShowCityPicker(false);
                    setProfile(prev => prev ? { ...prev, city } : prev);
                    try {
                      const { updateMyProfile } = await import('../api/client');
                      await updateMyProfile({ city });
                    } catch {
                      Alert.alert('오류', '지역 저장 실패');
                    }
                  }}
                >
                  <Text style={[styles.pickerItemText, profile.city === city && styles.pickerItemTextActive]}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {/* 상대 지역 범위 */}
          <Text style={[styles.settingLabel, { marginTop: 12 }]}>상대 지역 범위</Text>
          {REGION_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={styles.radioRow}
              onPress={() => saveDiscoveryFilters(opt.value, goalMatch)}
            >
              <View style={[styles.radioCircle, regionFilter === opt.value && styles.radioCircleActive]} />
              <Text style={styles.radioLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          {/* 관계 목표 동일 여부 */}
          <View style={[styles.row, { marginTop: 12 }]}>
            <Text style={styles.rowLabel}>나와 같은 관계 목표만</Text>
            <Switch
              value={goalMatch}
              onValueChange={(v) => saveDiscoveryFilters(regionFilter, v)}
              trackColor={{ false: '#DDD', true: C.primary }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* ─── 상대에게 먼저 확인할 항목 (미리 보기 5개) ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>👀 추천 카드에서 먼저 볼 항목</Text>
            <Text style={styles.sectionBadge}>{previewQuestions.length}/5</Text>
          </View>
          <Text style={styles.settingDesc}>추천 상대 카드에서 이 항목의 답변을 미리 확인할 수 있어요</Text>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setShowPreviewPicker(v => !v)}
          >
            <Text style={styles.expandBtnText}>{showPreviewPicker ? '접기 ▲' : '항목 선택하기 ▼'}</Text>
          </TouchableOpacity>
          {showPreviewPicker && (
            <View style={styles.checkList}>
              {PREVIEW_QUESTION_OPTIONS.map(opt => {
                const selected = previewQuestions.includes(opt.field);
                return (
                  <TouchableOpacity
                    key={opt.field}
                    style={styles.checkRow}
                    onPress={() => togglePreviewQuestion(opt.field)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkLabel}>{opt.icon} {opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {/* 현재 선택된 항목 표시 */}
          <View style={styles.chipRow}>
            {previewQuestions.map(field => {
              const opt = PREVIEW_QUESTION_OPTIONS.find(o => o.field === field);
              if (!opt) return null;
              return (
                <View key={field} style={styles.chip}>
                  <Text style={styles.chipText}>{opt.icon} {opt.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ─── 절대 안 되는 조건 ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🚫 절대 안 되는 조건</Text>
            <Text style={styles.sectionBadge}>{requiredConditions.length}/3</Text>
          </View>
          <Text style={styles.settingDesc}>이 조건에 맞지 않는 상대는 추천에서 제외돼요 (최대 3개 무료)</Text>
          {REQUIRED_CONDITION_OPTIONS.map((opt, idx) => {
            const selected = requiredConditions.includes(opt.key);
            const locked = !selected && requiredConditions.length >= 3;
            return (
              <TouchableOpacity
                key={opt.key}
                style={styles.checkRow}
                onPress={() => toggleRequiredCondition(opt.key)}
              >
                <View style={[styles.checkbox, selected && styles.checkboxActive, locked && styles.checkboxLocked]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                  {locked && <Text style={styles.checkmark}>🔒</Text>}
                </View>
                <Text style={[styles.checkLabel, locked && { color: C.sub }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Row label="성별" value={l('gender', profile.gender)} />
          <Row label="찾는 상대" value={l('looking_for', profile.looking_for)} />
          <Row label="희망 나이" value={profile.age_min && profile.age_max
            ? `${profile.age_min}–${profile.age_max}세` : null} />
        </Section>

        {/* 성격 & 감성 */}
        <Section title="성격 & 감성">
          <Row label="평소 나는" value={l('personality_type', profile.personality_type)} />
          <Row label="힘들 때" value={l('emotional_expression', profile.emotional_expression)} />
          <Row label="대화할 때" value={l('communication_style', profile.communication_style)} />
          <Row label="의견 충돌 시" value={l('conflict_style', profile.conflict_style)} />
          <Row label="새로운 만남" value={l('social_frequency', profile.social_frequency)} />
        </Section>

        {/* 일상 & 생활 */}
        <Section title="일상 & 생활 습관">
          <Row label="생활 패턴" value={l('chronotype', profile.chronotype)} />
          <Row label="쉬는 날" value={l('rest_style', profile.rest_style)} />
          <Row label="운동" value={l('exercise_frequency', profile.exercise_frequency)} />
          <Row label="식사" value={l('meal_style', profile.meal_style)} />
          <Row label="흡연" value={l('smoking', profile.smoking)} />
          <Row label="음주" value={l('drinking', profile.drinking)} />
        </Section>

        {/* 취미 */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <Section title="취미 & 관심사">
            <View style={styles.chipRow}>
              {profile.hobbies.map(h => (
                <View key={h} style={styles.chip}>
                  <Text style={styles.chipText}>{HOBBY_LABELS[h] ?? h}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* 가족 & 주변 */}
        <Section title="가족 & 주변 상황">
          <Row label="자녀" value={
            profile.has_children === true ? '있음' :
            profile.has_children === false ? '없음' : null
          } />
          {profile.has_children && (
            <Row label="자녀와 동거" value={
              profile.children_living_together === true ? '예' : '아니요'
            } />
          )}
          <Row label="이사 의향" value={
            profile.willing_to_relocate === true ? '있음' :
            profile.willing_to_relocate === false ? '없음' : null
          } />
          <Row label="가족 중요도" value={profile.family_importance
            ? `${profile.family_importance} / 5` : null} />
        </Section>

        {/* 관계 & 가치관 */}
        <Section title="관계 & 가치관">
          <Row label="관계 목표" value={l('relationship_goal', profile.relationship_goal)} />
        </Section>

        {/* 종교 */}
        <Section title="종교 & 신념">
          <Row label="종교" value={l('religion', profile.religion)} />
          <Row label="종교 중요도" value={profile.religion_importance
            ? `${profile.religion_importance} / 5` : null} />
        </Section>

        {/* 현실 조건 */}
        <Section title="현실 조건">
          <Row label="건강 상태" value={l('health_status', profile.health_status)} />
          <Row label="재정 상황" value={l('financial_stability', profile.financial_stability)} />
          <Row label="거주 형태" value={l('living_situation', profile.living_situation)} />
        </Section>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => {
          Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: signOut },
          ]);
        }}>
          <Text style={styles.signOutText}>로그아웃</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: C.sub },
  content: { padding: 16, paddingBottom: 40 },

  // 크레딧 배너
  creditBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F9E09A',
  },
  creditLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creditIcon: { fontSize: 24 },
  creditLabel: { fontSize: 12, color: '#7D5A00' },
  creditValue: { fontSize: 20, fontWeight: '800', color: '#7D5A00' },
  creditBuyBtn: {
    backgroundColor: C.gold, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  creditBuyText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  // 본인인증 배너
  verifyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF3CD', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F9A825',
  },
  verifyIcon: { fontSize: 22 },
  verifyTitle: { fontSize: 14, fontWeight: '700', color: '#7D5A00' },
  verifySub: { fontSize: 12, color: '#9E7500', marginTop: 2 },
  verifyBadge: {
    backgroundColor: '#F9A825', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  verifyBadgeText: { fontSize: 11, color: '#FFF', fontWeight: '700' },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  bigPhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.primary },
  bigAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  bigAvatarText: { fontSize: 42, color: C.primary, fontWeight: '700' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  cameraBtnText: { fontSize: 16 },
  changePhotoBtn: {
    marginTop: 8, paddingHorizontal: 18, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: C.primary,
  },
  changePhotoText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  heroName: { fontSize: 28, fontWeight: '700', color: C.text, marginTop: 8 },
  heroSub: { fontSize: 16, color: C.sub, marginTop: 4 },
  heroBio: { fontSize: 15, color: '#555', marginTop: 10, textAlign: 'center', lineHeight: 22 },

  // 가치관 수정 버튼
  editValueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryLight, borderRadius: 14, padding: 16,
    marginBottom: 14, borderWidth: 1.5, borderColor: C.primary,
  },
  editValueIcon: { fontSize: 22 },
  editValueTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
  editValueSub: { fontSize: 12, color: C.sub, marginTop: 2 },
  editValueCost: { alignItems: 'center' },
  editValueCostIcon: { fontSize: 16 },
  editValueCostText: { fontSize: 11, color: C.sub, fontWeight: '600' },

  // Section
  section: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.primary },
  sectionEditBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: C.primaryLight },
  sectionEditText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0ECEA',
  },
  rowLabel: { fontSize: 15, color: C.sub },
  rowValue: { fontSize: 15, color: C.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.primaryLight, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 14, color: C.primary, fontWeight: '600' },

  // 설정 공통 스타일
  sectionBadge: { fontSize: 13, color: C.sub, fontWeight: '600' },
  settingLabel: { fontSize: 14, color: C.sub, marginBottom: 6, fontWeight: '600' },
  settingDesc: { fontSize: 13, color: C.sub, marginBottom: 10, lineHeight: 18 },
  settingSelect: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, marginBottom: 6,
  },
  settingSelectText: { fontSize: 15, color: C.text, fontWeight: '600' },
  settingSelectArrow: { fontSize: 13, color: C.sub },
  pickerList: { borderWidth: 1, borderColor: C.border, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0ECEA' },
  pickerItemActive: { backgroundColor: C.primaryLight },
  pickerItemText: { fontSize: 15, color: C.text },
  pickerItemTextActive: { color: C.primary, fontWeight: '700' },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border },
  radioCircleActive: { borderColor: C.primary, backgroundColor: C.primary },
  radioLabel: { fontSize: 15, color: C.text },
  expandBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10,
    alignItems: 'center', marginBottom: 10,
  },
  expandBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  checkList: { marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: C.primary, borderColor: C.primary },
  checkboxLocked: { backgroundColor: '#F5F5F5', borderColor: '#DDD' },
  checkmark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  checkLabel: { fontSize: 15, color: C.text },

  signOutBtn: {
    marginTop: 10, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { fontSize: 16, color: C.sub, fontWeight: '600' },
});
