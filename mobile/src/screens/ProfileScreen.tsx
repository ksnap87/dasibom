import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Image, Switch, Linking,
  Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
} from 'react-native';
import AppText from '../components/AppText';
import SkeletonLoader from '../components/SkeletonLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput } from 'react-native';
import {
  getMyProfile, uploadPhoto, deleteMyAccount, getMyPhotos,
  deletePhoto, setProfilePhoto, setBackgroundPhoto, updateMyProfile,
} from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useFontStore } from '../store/fontStore';
import { Profile, RootStackParamList } from '../types';
import {
  PERSONALITY_QA, DAILY_LIFE_QA, FAMILY_QA, RELATIONSHIP_QA,
  RELIGION_QA, REALITY_QA, HOBBY_LABELS as HOBBY_LABELS_QA,
  QAItem, getAnswerText,
} from '../data/questionLabels';
import { getErrorMessage } from '../utils/error';

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

const DEFAULT_PREVIEW_QUESTIONS = ['relationship_goal', 'religion', 'smoking', 'drinking', 'family_importance', 'personality_type', 'health_status'];

const REQUIRED_CONDITION_OPTIONS: { key: string; label: string }[] = [
  // 생활습관
  { key: 'no_smoking', label: '흡연자는 안 돼요' },
  { key: 'no_heavy_drinking', label: '술을 자주 마시는 분은 안 돼요' },
  { key: 'no_drinking', label: '술을 아예 안 마시는 분이면 좋겠어요' },
  // 가치관·관계
  { key: 'same_religion', label: '같은 종교여야 해요' },
  { key: 'same_relationship_goal', label: '관계 목표가 같아야 해요' },
  // 가족
  { key: 'no_children', label: '자녀가 없는 분이면 좋겠어요' },
  { key: 'has_children_ok', label: '자녀가 있는 분이어야 해요' },
  { key: 'willing_to_relocate', label: '이사 가능한 분이어야 해요' },
  // 성격·생활
  { key: 'same_chronotype', label: '생활 패턴(아침형/저녁형)이 같아야 해요' },
  { key: 'exercises_regularly', label: '운동을 꾸준히 하는 분이면 좋겠어요' },
  // 건강·재정
  { key: 'good_health', label: '건강 상태가 좋은 분이면 좋겠어요' },
  { key: 'financially_stable', label: '경제적으로 안정된 분이면 좋겠어요' },
];

const REGION_OPTIONS: { value: string; label: string }[] = [
  { value: 'nationwide', label: '전국 (지역 무관)' },
  { value: 'metro', label: '수도권 (서울·경기·인천)' },
  { value: 'same_city', label: '같은 시/도만' },
];

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
  success: '#27AE60',
  muted: '#6C7B95',
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
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
  );
}

function QARow({ qa, profile }: { qa: QAItem; profile: any }) {
  const answer = getAnswerText(qa, profile);
  if (!answer) return null;
  return (
    <View style={styles.qaRow}>
      <AppText style={styles.qaQuestion}>Q. {qa.question}</AppText>
      <AppText style={styles.qaAnswer}>{answer}</AppText>
    </View>
  );
}

function QASection({ title, icon, qaList, profile }: {
  title: string; icon: string; qaList: QAItem[]; profile: any;
}) {
  const hasAny = qaList.some(qa => getAnswerText(qa, profile) !== null);
  if (!hasAny) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>{icon} {title}</AppText>
      </View>
      {qaList.map(qa => <QARow key={qa.field} qa={qa} profile={profile} />)}
    </View>
  );
}

// ── 앱 설정 섹션 ─────────────────────────────────────────
const SETTINGS_KEYS = {
  pushMatch: '@dasibom_push_match',
  pushMessage: '@dasibom_push_message',
  pushSound: '@dasibom_push_sound',
  pushVibrate: '@dasibom_push_vibrate',
  showAge: '@dasibom_show_age',
  showCity: '@dasibom_show_city',
  largeText: '@dasibom_large_text',
};

function SettingsSection() {
  const [pushMatch, setPushMatch] = useState(true);
  const [pushMessage, setPushMessage] = useState(true);
  const [pushSound, setPushSound] = useState(true);
  const [pushVibrate, setPushVibrate] = useState(true);
  const [showAge, setShowAge] = useState(true);
  const [showCity, setShowCity] = useState(true);
  const { level: fontSize, setFontSize: setGlobalFontSize } = useFontStore();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [pm, pmsg, ps, pv, sa, sc] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEYS.pushMatch),
          AsyncStorage.getItem(SETTINGS_KEYS.pushMessage),
          AsyncStorage.getItem(SETTINGS_KEYS.pushSound),
          AsyncStorage.getItem(SETTINGS_KEYS.pushVibrate),
          AsyncStorage.getItem(SETTINGS_KEYS.showAge),
          AsyncStorage.getItem(SETTINGS_KEYS.showCity),
        ]);
        if (pm !== null) setPushMatch(pm !== 'false');
        if (pmsg !== null) setPushMessage(pmsg !== 'false');
        if (ps !== null) setPushSound(ps !== 'false');
        if (pv !== null) setPushVibrate(pv !== 'false');
        if (sa !== null) setShowAge(sa !== 'false');
        if (sc !== null) setShowCity(sc !== 'false');
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const toggle = async (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    await AsyncStorage.setItem(key, String(value));
  };

  if (!loaded) return null;

  return (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>🔔 알림 설정</AppText>
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>매칭 알림</AppText>
            <AppText style={styles.settingRowSub}>새로운 매칭 시 알림</AppText>
          </View>
          <Switch
            value={pushMatch}
            onValueChange={v => toggle(SETTINGS_KEYS.pushMatch, v, setPushMatch)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={pushMatch ? '#E8556D' : '#FFF'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>메시지 알림</AppText>
            <AppText style={styles.settingRowSub}>새 메시지 수신 시 알림</AppText>
          </View>
          <Switch
            value={pushMessage}
            onValueChange={v => toggle(SETTINGS_KEYS.pushMessage, v, setPushMessage)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={pushMessage ? '#E8556D' : '#FFF'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>알림 소리</AppText>
            <AppText style={styles.settingRowSub}>알림 수신 시 소리</AppText>
          </View>
          <Switch
            value={pushSound}
            onValueChange={v => toggle(SETTINGS_KEYS.pushSound, v, setPushSound)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={pushSound ? '#E8556D' : '#FFF'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>알림 진동</AppText>
            <AppText style={styles.settingRowSub}>알림 수신 시 진동</AppText>
          </View>
          <Switch
            value={pushVibrate}
            onValueChange={v => toggle(SETTINGS_KEYS.pushVibrate, v, setPushVibrate)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={pushVibrate ? '#E8556D' : '#FFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>🔒 공개 설정</AppText>
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>나이 공개</AppText>
            <AppText style={styles.settingRowSub}>추천 카드에 나이 표시</AppText>
          </View>
          <Switch
            value={showAge}
            onValueChange={v => toggle(SETTINGS_KEYS.showAge, v, setShowAge)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={showAge ? '#E8556D' : '#FFF'}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.settingRowLabel}>지역 공개</AppText>
            <AppText style={styles.settingRowSub}>추천 카드에 지역 표시</AppText>
          </View>
          <Switch
            value={showCity}
            onValueChange={v => toggle(SETTINGS_KEYS.showCity, v, setShowCity)}
            trackColor={{ false: '#E0D5D0', true: '#FCEEF1' }}
            thumbColor={showCity ? '#E8556D' : '#FFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.sectionTitle}>{'👁️'} 접근성</AppText>
        </View>
        <AppText style={styles.settingRowLabel}>글씨 크기</AppText>
        <View style={styles.fontSizeRow}>
          {([
            { label: '기본', value: 'small' as const, sample: 14 },
            { label: '크게', value: 'medium' as const, sample: 17 },
            { label: '매우 크게', value: 'large' as const, sample: 20 },
          ]).map(opt => {
            const isActive = fontSize === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.fontSizeBtn, isActive && styles.fontSizeBtnActive]}
                onPress={() => {
                  setGlobalFontSize(opt.value);
                }}
              >
                <AppText style={[
                  styles.fontSizeBtnText,
                  isActive && styles.fontSizeBtnTextActive,
                  { fontSize: opt.sample },
                ]}>가</AppText>
                <AppText style={[styles.fontSizeLabel, isActive && styles.fontSizeLabelActive]}>{opt.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
}

function Section({ title, children, onEdit }: {
  title: string; children: React.ReactNode; onEdit?: () => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionTitle}>{title}</AppText>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.sectionEditBtn}>
            <AppText style={styles.sectionEditText}>수정</AppText>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<any>();
  const scrollRef = useRef<ScrollView>(null);
  const recommendationsY = useRef(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 사진 갤러리
  const [photos, setPhotos] = useState<{ id: string; url: string; sort_order: number }[]>([]);
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);

  // 자기소개 편집
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // ── 설정 상태 ──
  const [previewQuestions, setPreviewQuestions] = useState<string[]>(DEFAULT_PREVIEW_QUESTIONS);
  const [requiredConditions, setRequiredConditions] = useState<string[]>([]);
  const [regionFilter, setRegionFilter] = useState<string>('nationwide');
  const [goalMatch, setGoalMatch] = useState<boolean>(false);
  const [showPreviewPicker, setShowPreviewPicker] = useState(false);
  const [showRequiredPicker, setShowRequiredPicker] = useState(false);
  const [showRegionSection, setShowRegionSection] = useState(false);
  const [showRequiredSection, setShowRequiredSection] = useState(false);

  // 임시 편집 상태 (저장/취소 버튼용)
  const [draftPreviewQuestions, setDraftPreviewQuestions] = useState<string[]>(DEFAULT_PREVIEW_QUESTIONS);
  const [previewDirty, setPreviewDirty] = useState(false);
  const [draftRequiredConditions, setDraftRequiredConditions] = useState<string[]>([]);
  const [requiredDirty, setRequiredDirty] = useState(false);

  const [maxPreviewQuestions, setMaxPreviewQuestions] = useState(7);
  const [maxConditions, setMaxConditions] = useState(3);
  const { signOut, setProfile: setStoreProfile, credits, deductCredit, loadCredits, phoneVerified, loadPhoneVerified } = useAuthStore();

  const loadSettings = useCallback(async () => {
    try {
      const [pq, rc, df] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.previewQuestions),
        AsyncStorage.getItem(STORAGE_KEYS.requiredConditions),
        AsyncStorage.getItem(STORAGE_KEYS.discoveryFilters),
      ]);
      if (pq) { const parsed = JSON.parse(pq); setPreviewQuestions(parsed); setDraftPreviewQuestions(parsed); }
      if (rc) { const parsed = JSON.parse(rc); setRequiredConditions(parsed); setDraftRequiredConditions(parsed); }
      if (df) {
        const parsed = JSON.parse(df);
        if (parsed.region_filter) setRegionFilter(parsed.region_filter);
        if (parsed.relationship_goal_match !== undefined) setGoalMatch(parsed.relationship_goal_match);
      }
    } catch {}
  }, []);

  useEffect(() => {
    getMyProfile()
      .then(data => { setProfile(data); setStoreProfile(data); setBioText(data.bio || ''); })
      .catch(() => Alert.alert('오류', '프로필을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
    getMyPhotos()
      .then(data => setPhotos(data || []))
      .catch(() => {});
    loadCredits();
    loadPhoneVerified();
    loadSettings();
  }, [setStoreProfile, loadCredits, loadPhoneVerified, loadSettings]);

  // 추천조건 바로가기로 이동 시 자동 스크롤
  useEffect(() => {
    if (route.params?.scrollTo === 'recommendations' && !loading) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: recommendationsY.current, animated: true });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [route.params?.scrollTo, loading]);

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
    if (draftPreviewQuestions.includes(field)) {
      setDraftPreviewQuestions(draftPreviewQuestions.filter(q => q !== field));
      setPreviewDirty(true);
    } else {
      if (draftPreviewQuestions.length >= maxPreviewQuestions) {
        if (credits <= 0) {
          Alert.alert(
            '추가 항목 선택',
            `기본 ${maxPreviewQuestions}개 항목을 모두 사용했어요.\n추가 항목을 선택하려면 크레딧이 필요합니다.`,
            [
              { text: '취소', style: 'cancel' },
              { text: '크레딧 충전', onPress: () => nav.navigate('CreditStore') },
            ],
          );
        } else {
          Alert.alert(
            '추가 항목 선택',
            `기본 ${maxPreviewQuestions}개 항목을 모두 사용했어요.\n크레딧 1개를 사용하면 항목을 1개 더 추가할 수 있어요.\n\n보유 크레딧: ${credits}개`,
            [
              { text: '취소', style: 'cancel' },
              {
                text: '크레딧 사용',
                onPress: async () => {
                  const ok = await deductCredit(1);
                  if (!ok) {
                    Alert.alert('오류', '크레딧 차감에 실패했습니다.');
                    return;
                  }
                  const newMax = maxPreviewQuestions + 1;
                  setMaxPreviewQuestions(newMax);
                  setDraftPreviewQuestions([...draftPreviewQuestions, field]);
                  setPreviewDirty(true);
                  await loadCredits();
                },
              },
            ],
          );
        }
        return;
      }
      setDraftPreviewQuestions([...draftPreviewQuestions, field]);
      setPreviewDirty(true);
    }
  };

  const handleSavePreviewQuestions = () => {
    savePreviewQuestions(draftPreviewQuestions);
    setPreviewDirty(false);
  };

  const handleCancelPreviewQuestions = () => {
    setDraftPreviewQuestions([...previewQuestions]);
    setPreviewDirty(false);
  };

  const toggleRequiredCondition = (key: string) => {
    if (draftRequiredConditions.includes(key)) {
      setDraftRequiredConditions(draftRequiredConditions.filter(k => k !== key));
      setRequiredDirty(true);
    } else {
      if (draftRequiredConditions.length >= maxConditions) {
        if (credits <= 0) {
          Alert.alert(
            '추가 조건 설정',
            `기본 ${maxConditions}개 조건을 모두 사용했어요.\n추가 조건을 설정하려면 크레딧이 필요합니다.`,
            [
              { text: '취소', style: 'cancel' },
              { text: '크레딧 충전', onPress: () => nav.navigate('CreditStore') },
            ],
          );
        } else {
          Alert.alert(
            '추가 조건 설정',
            `기본 ${maxConditions}개 조건을 모두 사용했어요.\n크레딧 1개를 사용하면 조건을 1개 더 추가할 수 있어요.\n\n보유 크레딧: ${credits}개`,
            [
              { text: '취소', style: 'cancel' },
              {
                text: '크레딧 사용',
                onPress: async () => {
                  const ok = await deductCredit(1);
                  if (!ok) {
                    Alert.alert('오류', '크레딧 차감에 실패했습니다.');
                    return;
                  }
                  const newMax = maxConditions + 1;
                  setMaxConditions(newMax);
                  setDraftRequiredConditions([...draftRequiredConditions, key]);
                  setRequiredDirty(true);
                  await loadCredits();
                },
              },
            ],
          );
        }
        return;
      }
      setDraftRequiredConditions([...draftRequiredConditions, key]);
      setRequiredDirty(true);
    }
  };

  const handleSaveRequiredConditions = () => {
    saveRequiredConditions(draftRequiredConditions);
    setRequiredDirty(false);
  };

  const handleCancelRequiredConditions = () => {
    setDraftRequiredConditions([...requiredConditions]);
    setRequiredDirty(false);
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 5) {
      Alert.alert('알림', '사진은 최대 5장까지 업로드 가능합니다.');
      return;
    }

    let result;
    try {
      result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
        selectionLimit: 1,
        presentationStyle: 'pageSheet',
      });
    } catch {
      return; // 피커 오류 시 조용히 복귀
    }

    if (result.didCancel || result.errorCode || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri!;
    setUploading(true);
    try {
      const photo = await uploadPhoto(uri);
      setPhotos(prev => [...prev, photo]);
      // 첫 사진이면 프로필 사진으로 자동 설정
      if (photos.length === 0) {
        setProfile(prev => prev ? { ...prev, photo_url: photo.url } : prev);
        setStoreProfile(profile ? { ...profile, photo_url: photo.url } : null);
      }
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '사진 업로드 실패'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoId: string, photoUrl: string) => {
    Alert.alert('사진 삭제', '이 사진을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          try {
            await deletePhoto(photoId);
            setPhotos(prev => prev.filter(p => p.id !== photoId));
            if (profile?.photo_url === photoUrl) {
              const remaining = photos.filter(p => p.id !== photoId);
              const newUrl = remaining[0]?.url || null;
              setProfile(prev => prev ? { ...prev, photo_url: newUrl ?? undefined } : prev);
            }
            if (profile?.background_url === photoUrl) {
              setProfile(prev => prev ? { ...prev, background_url: undefined } : prev);
            }
          } catch (err: any) {
            Alert.alert('오류', getErrorMessage(err, '삭제 실패'));
          }
        },
      },
    ]);
  };

  const handleSetAsProfile = async (photoUrl: string) => {
    try {
      await setProfilePhoto(photoUrl);
      setProfile(prev => prev ? { ...prev, photo_url: photoUrl } : prev);
      setStoreProfile(profile ? { ...profile, photo_url: photoUrl } : null);
      Alert.alert('완료', '대표 사진이 변경되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '설정 실패'));
    }
  };

  const handleSetAsBackground = async (photoUrl: string) => {
    try {
      await setBackgroundPhoto(photoUrl);
      setProfile(prev => prev ? { ...prev, background_url: photoUrl } : prev);
      Alert.alert('완료', '배경 사진이 변경되었습니다.');
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '설정 실패'));
    }
  };

  const handlePhotoLongPress = (photo: { id: string; url: string }) => {
    const isProfile = profile?.photo_url === photo.url;
    const isBackground = profile?.background_url === photo.url;

    const options: any[] = [];
    if (!isProfile) options.push({ text: '대표 사진으로 설정', onPress: () => handleSetAsProfile(photo.url) });
    if (!isBackground) options.push({ text: '배경 사진으로 설정', onPress: () => handleSetAsBackground(photo.url) });
    options.push({ text: '삭제', style: 'destructive', onPress: () => handleDeletePhoto(photo.id, photo.url) });
    options.push({ text: '취소', style: 'cancel' });

    Alert.alert(
      '사진 옵션',
      isProfile ? '현재 대표 사진' : isBackground ? '현재 배경 사진' : '이 사진을 어떻게 할까요?',
      options,
    );
  };

  const changeCity = async (newCity: string) => {
    try {
      await updateMyProfile({ city: newCity });
      await deductCredit(1);
      setProfile({ ...profile, city: newCity });
      Alert.alert('완료', `거주 지역이 ${newCity}(으)로 변경되었습니다.`);
    } catch {
      Alert.alert('오류', '변경에 실패했습니다.');
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await updateMyProfile({ bio: bioText.trim() });
      setProfile(prev => prev ? { ...prev, bio: bioText.trim() } : prev);
      setEditingBio(false);
    } catch (err: any) {
      Alert.alert('오류', getErrorMessage(err, '저장 실패'));
    } finally {
      setSavingBio(false);
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
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <SkeletonLoader variant="profile" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <AppText style={styles.emptyText}>프로필이 없습니다.</AppText>
      </View>
    );
  }

  const age = new Date().getFullYear() - profile.birth_year;
  const l = (category: string, val?: string | null) =>
    val ? (LABELS[category]?.[val] ?? val) : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* 크레딧 배너 */}
        <View style={styles.creditBanner}>
          <View style={styles.creditLeft}>
            <AppText style={styles.creditIcon}>💎</AppText>
            <View>
              <AppText style={styles.creditLabel}>보유 크레딧</AppText>
              <AppText style={styles.creditValue}>{credits}개</AppText>
            </View>
          </View>
          <TouchableOpacity style={styles.creditBuyBtn} onPress={() => nav.navigate('CreditStore')}>
            <AppText style={styles.creditBuyText}>충전하기</AppText>
          </TouchableOpacity>
        </View>

        {/* 본인인증 배너 (미인증 시) — 탭하면 인증 화면 이동 */}
        {!phoneVerified && (
          <TouchableOpacity
            style={styles.verifyBanner}
            activeOpacity={0.7}
            onPress={() => nav.navigate('PhoneVerification', {
              match_id: '',
              other_name: '',
              other_user_id: '',
            })}
          >
            <AppText style={styles.verifyIcon}>📱</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={styles.verifyTitle}>본인인증이 필요합니다</AppText>
              <AppText style={styles.verifySub}>탭하여 휴대폰 인증을 진행하세요</AppText>
            </View>
            <View style={styles.verifyBadge}>
              <AppText style={styles.verifyBadgeText}>인증하기 →</AppText>
            </View>
          </TouchableOpacity>
        )}
        {phoneVerified && (
          <View style={[styles.verifyBanner, { borderColor: C.success, backgroundColor: '#E8F5E9' }]}>
            <AppText style={styles.verifyIcon}>✅</AppText>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.verifyTitle, { color: C.success }]}>본인인증 완료</AppText>
              <AppText style={styles.verifySub}>채팅 기능이 활성화되었습니다</AppText>
            </View>
          </View>
        )}

        {/* Hero - 배경 + 프로필 */}
        <View style={styles.hero}>
          {/* 배경 사진 */}
          {profile.background_url ? (
            <Image source={{ uri: profile.background_url }} style={styles.backgroundImage} />
          ) : (
            <View style={styles.backgroundPlaceholder} />
          )}

          {/* 프로필 사진 (배경 위에 겹침) */}
          <View style={styles.avatarOverlay}>
            <TouchableOpacity onPress={handleAddPhoto} style={styles.avatarWrapper} disabled={uploading}>
              {profile.photo_url ? (
                <Image source={{ uri: profile.photo_url }} style={styles.bigPhoto} />
              ) : (
                <View style={styles.bigAvatar}>
                  <AppText style={styles.bigAvatarText}>{profile.name.charAt(0)}</AppText>
                </View>
              )}
              {uploading && (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <AppText style={styles.heroName}>{profile.nickname || profile.name}</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <AppText style={styles.heroSub}>{age}세 · </AppText>
            <TouchableOpacity onPress={() => {
              if (credits <= 0) {
                Alert.alert('크레딧 부족', '거주 지역 변경에는 크레딧 1개가 필요합니다.');
                return;
              }
              Alert.alert('거주 지역 변경', `크레딧 1개를 사용합니다.\n보유: ${credits}개\n\n수도권 / 광역시 / 기타 중 선택하세요.`, [
                { text: '취소', style: 'cancel' },
                { text: '수도권', onPress: () => {
                  Alert.alert('수도권', '지역을 선택하세요.', [
                    { text: '서울', onPress: () => changeCity('서울') },
                    { text: '경기', onPress: () => changeCity('경기') },
                    { text: '인천', onPress: () => changeCity('인천') },
                  ]);
                }},
                { text: '광역시/기타', onPress: () => {
                  Alert.alert('지역 선택', '지역을 선택하세요.', [
                    { text: '부산', onPress: () => changeCity('부산') },
                    { text: '대구/광주/대전', onPress: () => {
                      Alert.alert('선택', '', [
                        { text: '대구', onPress: () => changeCity('대구') },
                        { text: '광주', onPress: () => changeCity('광주') },
                        { text: '대전', onPress: () => changeCity('대전') },
                      ]);
                    }},
                    { text: '그 외', onPress: () => {
                      Alert.alert('선택', '', [
                        { text: '울산', onPress: () => changeCity('울산') },
                        { text: '세종', onPress: () => changeCity('세종') },
                        { text: '강원', onPress: () => changeCity('강원') },
                        { text: '충북/충남', onPress: () => {
                          Alert.alert('선택', '', [
                            { text: '충북', onPress: () => changeCity('충북') },
                            { text: '충남', onPress: () => changeCity('충남') },
                            { text: '전북', onPress: () => changeCity('전북') },
                          ]);
                        }},
                      ]);
                    }},
                  ]);
                }},
              ]);
            }}>
              <AppText style={[styles.heroSub, { textDecorationLine: 'underline', color: C.primary }]}>{profile.city} ✏️</AppText>
            </TouchableOpacity>
          </View>

          {/* 자기소개 (프로필 바로 아래) */}
          {editingBio ? (
            <View style={styles.bioEditBox}>
              <TextInput
                style={styles.bioInput}
                value={bioText}
                onChangeText={t => setBioText(t.slice(0, 100))}
                maxLength={100}
                multiline
                placeholder="자기소개를 입력해주세요"
                placeholderTextColor="#BBB"
              />
              <AppText style={styles.bioCount}>{bioText.length}/100</AppText>
              <View style={styles.bioActions}>
                <TouchableOpacity onPress={() => { setEditingBio(false); setBioText(profile.bio || ''); }}>
                  <AppText style={styles.bioCancelText}>취소</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveBio} disabled={savingBio}>
                  {savingBio ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <AppText style={styles.bioSaveText}>저장</AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingBio(true)} style={styles.bioTouchable}>
              <AppText style={styles.heroBio}>
                {profile.bio || '자기소개를 작성해보세요 ✏️'}
              </AppText>
            </TouchableOpacity>
          )}
        </View>

        {/* 사진 갤러리 (최대 5장) — 컴팩트 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>📸 내 사진</AppText>
            <AppText style={styles.sectionBadge}>{photos.length}/5</AppText>
          </View>
          <View style={styles.photoGrid}>
            {photos.map(photo => {
              const isProfile = profile?.photo_url === photo.url;
              const isBg = profile?.background_url === photo.url;
              return (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoItem}
                  onPress={() => handlePhotoLongPress(photo)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: photo.url }} style={styles.photoThumb} />
                  {isProfile && (
                    <View style={styles.photoBadge}>
                      <AppText style={styles.photoBadgeText}>대표</AppText>
                    </View>
                  )}
                  {isBg && (
                    <View style={[styles.photoBadge, { backgroundColor: C.muted }]}>
                      <AppText style={styles.photoBadgeText}>배경</AppText>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {photos.length < 5 && (
              <TouchableOpacity style={styles.photoAddBtn} onPress={handleAddPhoto} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <AppText style={styles.photoAddText}>+</AppText>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── 추천 조건 그룹 헤더 ─── */}
        <View
          style={styles.groupHeader}
          onLayout={(e) => { recommendationsY.current = e.nativeEvent.layout.y; }}
        >
          <AppText style={styles.groupHeaderText}>추천 조건</AppText>
          <AppText style={styles.groupHeaderSub}>어떤 상대를 만나고 싶은지 설정해보세요</AppText>
        </View>

        {/* ─── 지역 설정 (드롭다운) ─── */}
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.8}
          onPress={() => setShowRegionSection(v => !v)}
        >
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>📍 지역 설정</AppText>
            <AppText style={styles.dropdownArrow}>{showRegionSection ? '▲' : '▼'}</AppText>
          </View>
          {!showRegionSection && (
            <AppText style={styles.dropdownSummary}>
              {profile.city || '미설정'} · {REGION_OPTIONS.find(o => o.value === regionFilter)?.label || '전국'}
            </AppText>
          )}
        </TouchableOpacity>
        {showRegionSection && (
          <View style={[styles.section, { marginTop: -12, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <AppText style={styles.settingDesc}>내 거주지역: {profile.city || '미설정'}</AppText>
            <AppText style={styles.settingLabel}>상대 지역 범위</AppText>
            {REGION_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={styles.radioRow}
                onPress={() => saveDiscoveryFilters(opt.value, goalMatch)}
              >
                <View style={[styles.radioCircle, regionFilter === opt.value && styles.radioCircleActive]} />
                <AppText style={styles.radioLabel}>{opt.label}</AppText>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ─── 관계 목표 필터 ─── */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.rowLabel}>💝 나와 같은 관계 목표만</AppText>
              <AppText style={[styles.settingDesc, { marginTop: 2, marginBottom: 0 }]}>같은 관계 목표를 가진 상대만 추천받아요</AppText>
            </View>
            <Switch
              value={goalMatch}
              onValueChange={(v) => saveDiscoveryFilters(regionFilter, v)}
              trackColor={{ false: '#E0D5D0', true: C.primaryLight }}
              thumbColor={goalMatch ? C.primary : '#FFF'}
            />
          </View>
        </View>

        {/* ─── 먼저 확인할 항목 ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>👀 먼저 확인할 항목</AppText>
            <AppText style={styles.sectionBadge}>{draftPreviewQuestions.length}/{maxPreviewQuestions}</AppText>
          </View>
          <AppText style={styles.settingDesc}>상대 카드에서 이 항목의 답변을 미리 확인할 수 있어요</AppText>
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setShowPreviewPicker(v => !v)}
          >
            <AppText style={styles.expandBtnText}>{showPreviewPicker ? '접기 ▲' : '항목 선택하기 ▼'}</AppText>
          </TouchableOpacity>
          {showPreviewPicker && (
            <View style={styles.checkList}>
              {PREVIEW_QUESTION_OPTIONS.map(opt => {
                const selected = draftPreviewQuestions.includes(opt.field);
                return (
                  <TouchableOpacity
                    key={opt.field}
                    style={styles.checkRow}
                    onPress={() => togglePreviewQuestion(opt.field)}
                  >
                    <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                      {selected && <AppText style={styles.checkmark}>✓</AppText>}
                    </View>
                    <AppText style={styles.checkLabel}>{opt.icon} {opt.label}</AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {/* 현재 선택된 항목 표시 */}
          <View style={styles.chipRow}>
            {draftPreviewQuestions.map(field => {
              const opt = PREVIEW_QUESTION_OPTIONS.find(o => o.field === field);
              if (!opt) return null;
              return (
                <View key={field} style={styles.chip}>
                  <AppText style={styles.chipText}>{opt.icon} {opt.label}</AppText>
                </View>
              );
            })}
          </View>
          {/* 저장 / 취소 버튼 */}
          {previewDirty && (
            <View style={styles.saveRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelPreviewQuestions}>
                <AppText style={styles.cancelBtnText}>취소</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSavePreviewQuestions}>
                <AppText style={styles.saveBtnText}>저장</AppText>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── 절대 안 되는 조건 (드롭다운) ─── */}
        <TouchableOpacity
          style={styles.section}
          activeOpacity={0.8}
          onPress={() => setShowRequiredSection(v => !v)}
        >
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>🚫 절대 안 되는 조건</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText style={styles.sectionBadge}>{draftRequiredConditions.length}/{maxConditions}</AppText>
              <AppText style={styles.dropdownArrow}>{showRequiredSection ? '▲' : '▼'}</AppText>
            </View>
          </View>
          {!showRequiredSection && draftRequiredConditions.length > 0 && (
            <View style={styles.chipRow}>
              {draftRequiredConditions.map(key => {
                const opt = REQUIRED_CONDITION_OPTIONS.find(o => o.key === key);
                if (!opt) return null;
                return (
                  <View key={key} style={styles.chip}>
                    <AppText style={styles.chipText}>{opt.label}</AppText>
                  </View>
                );
              })}
            </View>
          )}
          {!showRequiredSection && draftRequiredConditions.length === 0 && (
            <AppText style={styles.dropdownSummary}>설정된 조건이 없어요</AppText>
          )}
        </TouchableOpacity>
        {showRequiredSection && (
          <View style={[styles.section, { marginTop: -12, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]}>
            <AppText style={styles.settingDesc}>
              이 조건에 맞지 않는 상대는 추천에서 제외돼요{'\n'}
              {'(기본 3개, 💎 크레딧으로 추가)'}
            </AppText>
            {REQUIRED_CONDITION_OPTIONS.map((opt) => {
              const selected = draftRequiredConditions.includes(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.checkRow}
                  onPress={() => toggleRequiredCondition(opt.key)}
                >
                  <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                    {selected && <AppText style={styles.checkmark}>✓</AppText>}
                  </View>
                  <AppText style={styles.checkLabel}>{opt.label}</AppText>
                </TouchableOpacity>
              );
            })}
            {requiredDirty && (
              <View style={styles.saveRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRequiredConditions}>
                  <AppText style={styles.cancelBtnText}>취소</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRequiredConditions}>
                  <AppText style={styles.saveBtnText}>저장</AppText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ─── 내 가치관 그룹 헤더 ─── */}
        <View style={styles.groupHeader}>
          <AppText style={styles.groupHeaderText}>내 가치관</AppText>
          <AppText style={styles.groupHeaderSub}>상대에게 보여지는 나의 답변이에요</AppText>
        </View>

        {/* 기본 정보 */}
        <Section title="기본 정보">
          <Row label="성별" value={l('gender', profile.gender)} />
          <Row label="나이" value={`${age}세 (${profile.birth_year}년생)`} />
          <Row label="거주지역" value={profile.city} />
          <Row label="희망 나이" value={profile.age_min && profile.age_max
            ? `${profile.age_min}–${profile.age_max}세` : null} />
        </Section>

        {/* 성격 & 감성 - Q&A 형식 */}
        <QASection title="성격 & 감성" icon="💭" qaList={PERSONALITY_QA} profile={profile} />

        {/* 일상 & 생활 습관 - Q&A 형식 */}
        <QASection title="일상 & 생활 습관" icon="🌅" qaList={DAILY_LIFE_QA} profile={profile} />

        {/* 취미 */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText style={styles.sectionTitle}>🎨 취미 & 관심사</AppText>
            </View>
            <AppText style={styles.qaQuestion}>Q. 여가 시간에 나는...</AppText>
            <View style={[styles.chipRow, { marginTop: 8 }]}>
              {profile.hobbies.map((h: string) => (
                <View key={h} style={styles.chip}>
                  <AppText style={styles.chipText}>{HOBBY_LABELS_QA[h] ?? h}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 가족 & 주변 상황 - Q&A 형식 */}
        <QASection title="가족 & 주변 상황" icon="👨‍👩‍👧" qaList={FAMILY_QA} profile={profile} />

        {/* 관계 & 가치관 - Q&A 형식 */}
        <QASection title="관계 & 가치관" icon="💝" qaList={RELATIONSHIP_QA} profile={profile} />

        {/* 종교 & 신념 - Q&A 형식 */}
        <QASection title="종교 & 신념" icon="⛪" qaList={RELIGION_QA} profile={profile} />

        {/* 현실 조건 - Q&A 형식 */}
        <QASection title="현실 조건" icon="🏠" qaList={REALITY_QA} profile={profile} />

        {/* 가치관 수정 버튼 */}
        <TouchableOpacity style={styles.editValueBtn} onPress={handleEditQuestionnaire}>
          <AppText style={styles.editValueIcon}>✏️</AppText>
          <View style={{ flex: 1 }}>
            <AppText style={styles.editValueTitle}>가치관 수정하기</AppText>
            <AppText style={styles.editValueSub}>답변을 변경하면 매칭 결과가 달라질 수 있어요</AppText>
          </View>
          <View style={styles.editValueCost}>
            <AppText style={styles.editValueCostIcon}>💎</AppText>
            <AppText style={styles.editValueCostText}>1개</AppText>
          </View>
        </TouchableOpacity>

        {/* ─── 앱 설정 ─── */}
        <View style={styles.groupHeader}>
          <AppText style={styles.groupHeaderText}>앱 설정</AppText>
        </View>

        <SettingsSection />

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.signOutBtn} onPress={() => {
          Alert.alert('로그아웃', '로그아웃하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '로그아웃', style: 'destructive', onPress: signOut },
          ]);
        }}>
          <AppText style={styles.signOutText}>로그아웃</AppText>
        </TouchableOpacity>

        {/* 개인정보처리방침 */}
        <TouchableOpacity style={styles.privacyBtn} onPress={() => {
          Linking.openURL('https://ksnap87.github.io/dasibom/privacy-policy.html');
        }}>
          <AppText style={styles.privacyText}>개인정보처리방침</AppText>
        </TouchableOpacity>

        {/* 계정 삭제 */}
        {/* 앱 버전 */}
        <AppText style={styles.versionText}>다시봄 v1.0.0</AppText>

        <TouchableOpacity style={styles.deleteBtn} onPress={() => {
          Alert.alert(
            '계정 삭제',
            '정말 계정을 삭제하시겠습니까?\n\n모든 프로필, 매칭, 채팅 기록이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.',
            [
              { text: '취소', style: 'cancel' },
              {
                text: '계정 영구 삭제',
                style: 'destructive',
                onPress: () => {
                  Alert.alert('마지막 확인', '정말로 삭제하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await deleteMyAccount();
                          signOut();
                        } catch {
                          Alert.alert('오류', '계정 삭제 중 문제가 발생했습니다.');
                        }
                      },
                    },
                  ]);
                },
              },
            ]
          );
        }}>
          <AppText style={styles.deleteText}>계정 삭제</AppText>
        </TouchableOpacity>

      </ScrollView>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  hero: { alignItems: 'center', marginBottom: 8 },
  backgroundImage: {
    width: '100%', height: 160, borderRadius: 16,
  },
  backgroundPlaceholder: {
    width: '100%', height: 120, borderRadius: 16,
    backgroundColor: C.primaryLight,
  },
  avatarOverlay: {
    marginTop: -50, alignItems: 'center', marginBottom: 8,
  },
  avatarWrapper: { position: 'relative' },
  bigPhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  bigAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF',
  },
  bigAvatarText: { fontSize: 40, color: C.primary, fontWeight: '700' },
  photoHint: { fontSize: 13, color: C.sub, marginTop: 8, textAlign: 'center' },
  avatarLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroName: { fontSize: 26, fontWeight: '700', color: C.text, marginTop: 4 },
  heroSub: { fontSize: 15, color: C.sub, marginTop: 3 },
  heroBio: { fontSize: 14, color: '#555', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  bioTouchable: { paddingHorizontal: 20, paddingVertical: 4 },
  bioEditBox: {
    width: '100%', marginTop: 8, paddingHorizontal: 16,
  },
  bioInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12,
    fontSize: 14, color: C.text, minHeight: 60, textAlignVertical: 'top',
  },
  bioCount: { fontSize: 12, color: C.sub, textAlign: 'right', marginTop: 4 },
  bioActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: 8,
  },
  bioCancelText: { fontSize: 14, color: C.sub, fontWeight: '600' },
  bioSaveText: { fontSize: 14, color: C.primary, fontWeight: '700' },

  // 사진 갤러리
  photoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  photoItem: { position: 'relative' },
  photoThumb: {
    width: 90, height: 90, borderRadius: 12, borderWidth: 1, borderColor: '#EEE',
  },
  photoBadge: {
    position: 'absolute', top: 4, left: 4, backgroundColor: C.primary,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  photoBadgeText: { fontSize: 10, color: '#FFF', fontWeight: '700' },
  photoAddBtn: {
    width: 90, height: 90, borderRadius: 12,
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAddText: { fontSize: 28, color: C.sub },
  photoEmptyPlaceholder: {
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: 14,
    paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', marginTop: 8,
  },
  photoEmptyIcon: { fontSize: 32, marginBottom: 8 },
  photoEmptyText: { fontSize: 15, color: C.text, fontWeight: '600', textAlign: 'center' },
  photoEmptySub: { fontSize: 13, color: C.primary, fontWeight: '500', marginTop: 4 },

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

  // 그룹 헤더
  groupHeader: {
    paddingHorizontal: 4, paddingTop: 20, paddingBottom: 8,
  },
  groupHeaderText: { fontSize: 20, fontWeight: '800', color: C.text },
  groupHeaderSub: { fontSize: 13, color: C.sub, marginTop: 4 },

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
  dropdownArrow: { fontSize: 13, color: C.sub },
  dropdownSummary: { fontSize: 14, color: C.text, fontWeight: '500' },
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

  // 저장 / 취소 버튼
  saveRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, color: C.sub, fontWeight: '600' },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: C.primary, alignItems: 'center',
  },
  saveBtnText: { fontSize: 15, color: '#FFF', fontWeight: '700' },

  // Q&A 스타일
  qaRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECEA',
  },
  qaQuestion: {
    fontSize: 14,
    color: C.sub,
    marginBottom: 4,
    lineHeight: 20,
  },
  qaAnswer: {
    fontSize: 16,
    color: C.text,
    fontWeight: '600',
    lineHeight: 22,
    paddingLeft: 4,
  },

  signOutBtn: {
    marginTop: 10, borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { fontSize: 16, color: C.sub, fontWeight: '600' },

  privacyBtn: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  privacyText: { fontSize: 14, color: C.sub, textDecorationLine: 'underline' },

  deleteBtn: {
    marginTop: 10, marginBottom: 40, paddingVertical: 14, alignItems: 'center',
  },
  // 설정 행
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0ECEA',
  },
  settingRowLabel: { fontSize: 15, color: '#2D2D2D', fontWeight: '600' },
  settingRowSub: { fontSize: 12, color: '#777', marginTop: 2 },

  // 글씨 크기 선택
  fontSizeRow: {
    flexDirection: 'row', gap: 10, marginTop: 10,
  },
  fontSizeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E0D5D0', backgroundColor: '#FAFAFA',
  },
  fontSizeBtnActive: {
    borderColor: '#E8556D', backgroundColor: '#FCEEF1',
  },
  fontSizeBtnText: { fontSize: 14, color: '#777', fontWeight: '700' },
  fontSizeBtnTextActive: { color: '#E8556D' },
  fontSizeLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  fontSizeLabelActive: { color: '#E8556D' },

  versionText: { fontSize: 12, color: '#BBB', textAlign: 'center', marginTop: 20 },
  deleteText: { fontSize: 14, color: '#D44', textDecorationLine: 'underline' },
});
