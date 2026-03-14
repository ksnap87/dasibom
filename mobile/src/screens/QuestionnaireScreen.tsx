/**
 * QuestionnaireScreen — 가치관 설문 (온보딩 + 수정 모드)
 *
 * 질문 순서: 감성/성격 → 생활방식 → 취미 → 가족·주변 → 관계목표 → 종교 → 현실조건
 * 이 순서는 사람 본연의 성격부터 시작해 현실적 조건으로 자연스럽게 이어집니다.
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { updateMyProfile } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

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

// ── 재사용 컴포넌트 ────────────────────────────────────────

function OptionButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BigOption({ label, desc, selected, onPress }: {
  label: string; desc: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.bigOption, selected && styles.bigOptionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.bigOptionLabel, selected && styles.bigOptionLabelSelected]}>{label}</Text>
      <Text style={styles.bigOptionDesc}>{desc}</Text>
    </TouchableOpacity>
  );
}

function ChipGroup({ options, selected, onToggle }: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map(o => (
        <TouchableOpacity
          key={o.value}
          style={[styles.chip, selected.includes(o.value) && styles.chipSelected]}
          onPress={() => onToggle(o.value)}
        >
          <Text style={[styles.chipText, selected.includes(o.value) && styles.chipTextSelected]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ImportanceRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.importanceRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          style={[styles.importanceBtn, value === n && styles.importanceBtnSelected]}
          onPress={() => onChange(n)}
        >
          <Text style={[styles.importanceBtnText, value === n && styles.importanceBtnTextSelected]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── 상수 ──────────────────────────────────────────────────

/**
 * 새 순서: 성격·감성 → 일상·생활 → 취미 → 가족·주변 → 관계·가치관 → 종교 → 현실조건
 */
const STEPS = [
  '기본 정보',        // 0
  '성격 & 감성',      // 1 — 사람 본연의 성격부터
  '일상 & 생활 습관', // 2
  '취미 & 관심사',    // 3
  '가족 & 주변 상황', // 4
  '관계 & 가치관',    // 5
  '종교 & 신념',      // 6
  '현실 조건',        // 7 — 재정·건강 등 민감한 정보는 마지막
];

const HOBBIES = [
  { value: 'hiking', label: '등산' },
  { value: 'travel', label: '여행' },
  { value: 'cooking', label: '요리' },
  { value: 'reading', label: '독서' },
  { value: 'music', label: '음악' },
  { value: 'gardening', label: '원예' },
  { value: 'golf', label: '골프' },
  { value: 'swimming', label: '수영' },
  { value: 'yoga', label: '요가/필라테스' },
  { value: 'photography', label: '사진' },
  { value: 'volunteering', label: '봉사활동' },
  { value: 'movies', label: '영화 감상' },
  { value: 'dancing', label: '댄스' },
  { value: 'art', label: '미술/공예' },
  { value: 'walking', label: '산책' },
  { value: 'fishing', label: '낚시' },
];

type FormData = Record<string, any>;

const EMPTY_FORM: FormData = {
  name: '',
  birth_year: '',
  gender: '',
  looking_for: '',
  city: '',
  bio: '',
  // 성격 & 감성
  personality_type: '',
  emotional_expression: '',
  communication_style: '',
  conflict_style: '',
  social_frequency: '',
  // 일상 & 생활
  chronotype: '',
  rest_style: '',
  exercise_frequency: '',
  meal_style: '',
  smoking: '',
  drinking: '',
  // 취미
  hobbies: [] as string[],
  // 가족 & 주변
  has_children: null as boolean | null,
  children_living_together: null as boolean | null,
  wants_more_children: null as boolean | null,
  willing_to_relocate: null as boolean | null,
  // 관계 & 가치관
  relationship_goal: '',
  family_importance: 3,
  // 종교
  religion: '',
  religion_importance: 3,
  // 현실 조건
  health_status: '',
  financial_stability: '',
  living_situation: '',
  age_min: '',
  age_max: '',
};

export default function QuestionnaireScreen() {
  const route = useRoute();
  const nav = useNavigation<Nav>();
  const isEditMode = route.name === 'QuestionnaireEdit';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const { profile, setProfile, deductCredit, credits } = useAuthStore();

  // 수정 모드: 기존 값으로 초기화
  const [form, setForm] = useState<FormData>(() => {
    if (isEditMode && profile) {
      return {
        ...EMPTY_FORM,
        name: profile.name ?? '',
        birth_year: profile.birth_year ? String(profile.birth_year) : '',
        gender: profile.gender ?? '',
        looking_for: profile.looking_for ?? '',
        city: profile.city ?? '',
        bio: profile.bio ?? '',
        personality_type: profile.personality_type ?? '',
        emotional_expression: profile.emotional_expression ?? '',
        communication_style: profile.communication_style ?? '',
        conflict_style: profile.conflict_style ?? '',
        social_frequency: profile.social_frequency ?? '',
        chronotype: profile.chronotype ?? '',
        rest_style: profile.rest_style ?? '',
        exercise_frequency: profile.exercise_frequency ?? '',
        meal_style: profile.meal_style ?? '',
        smoking: profile.smoking ?? '',
        drinking: profile.drinking ?? '',
        hobbies: profile.hobbies ?? [],
        has_children: profile.has_children ?? null,
        children_living_together: profile.children_living_together ?? null,
        wants_more_children: profile.wants_more_children ?? null,
        willing_to_relocate: profile.willing_to_relocate ?? null,
        relationship_goal: profile.relationship_goal ?? '',
        family_importance: profile.family_importance ?? 3,
        religion: profile.religion ?? '',
        religion_importance: profile.religion_importance ?? 3,
        health_status: profile.health_status ?? '',
        financial_stability: profile.financial_stability ?? '',
        living_situation: profile.living_situation ?? '',
        age_min: profile.age_min ? String(profile.age_min) : '',
        age_max: profile.age_max ? String(profile.age_max) : '',
      };
    }
    return { ...EMPTY_FORM };
  });

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));
  const toggleHobby = (v: string) =>
    setForm(f => ({
      ...f,
      hobbies: f.hobbies.includes(v)
        ? f.hobbies.filter((h: string) => h !== v)
        : [...f.hobbies, v],
    }));

  // ── 유효성 검사 ───────────────────────────────────────────

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (!form.name.trim()) { Alert.alert('알림', '이름을 입력해주세요.'); return false; }
        if (!form.birth_year || isNaN(Number(form.birth_year))) { Alert.alert('알림', '출생연도를 입력해주세요.'); return false; }
        if (!form.gender) { Alert.alert('알림', '성별을 선택해주세요.'); return false; }
        if (!form.looking_for) { Alert.alert('알림', '찾는 상대를 선택해주세요.'); return false; }
        if (!form.city.trim()) { Alert.alert('알림', '거주 도시를 입력해주세요.'); return false; }
        return true;
      case 1:
        if (!form.personality_type) { Alert.alert('알림', '성격 유형을 선택해주세요.'); return false; }
        return true;
      case 5:
        if (!form.relationship_goal) { Alert.alert('알림', '관계 목표를 선택해주세요.'); return false; }
        return true;
      default:
        return true;
    }
  };

  const next = () => { if (!validateStep()) return; setStep(s => s + 1); };
  const back = () => setStep(s => Math.max(0, s - 1));

  // ── 제출 ─────────────────────────────────────────────────

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        birth_year: Number(form.birth_year),
        age_min: form.age_min ? Number(form.age_min) : null,
        age_max: form.age_max ? Number(form.age_max) : null,
        questionnaire_completed: true,
      };

      if (isEditMode) {
        // 크레딧 1개 차감
        const ok = await deductCredit(1);
        if (!ok) {
          Alert.alert('크레딧 부족', '가치관 수정에는 크레딧 1개가 필요합니다.\n현재 보유: 0개');
          return;
        }
        Alert.alert('알림', `가치관을 수정했습니다.\n남은 크레딧: ${credits - 1}개`);
      }

      const updated = await updateMyProfile(payload);
      setProfile(updated);

      if (isEditMode) {
        nav.goBack();
      }
    } catch (err: any) {
      Alert.alert('오류', err.message ?? '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // ── 단계별 렌더링 ─────────────────────────────────────────

  const renderStep = () => {
    switch (step) {

      // ── 0: 기본 정보 ─────────────────────────────────────
      case 0:
        return (
          <>
            <Text style={styles.stepTitle}>기본 정보</Text>
            <Text style={styles.stepSub}>간단한 정보를 알려주세요</Text>

            <Text style={styles.label}>이름 *</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={v => set('name', v)}
              placeholder="이름 또는 닉네임" placeholderTextColor={C.sub} />

            <Text style={styles.label}>출생연도 *</Text>
            <TextInput style={styles.input} value={form.birth_year} onChangeText={v => set('birth_year', v)}
              placeholder="예: 1965" keyboardType="numeric" maxLength={4} placeholderTextColor={C.sub} />

            <Text style={styles.label}>성별 *</Text>
            <View style={styles.row}>
              <OptionButton label="남성" selected={form.gender === 'male'} onPress={() => set('gender', 'male')} />
              <OptionButton label="여성" selected={form.gender === 'female'} onPress={() => set('gender', 'female')} />
            </View>

            <Text style={styles.label}>찾는 상대 *</Text>
            <View style={styles.row}>
              <OptionButton label="남성" selected={form.looking_for === 'male'} onPress={() => set('looking_for', 'male')} />
              <OptionButton label="여성" selected={form.looking_for === 'female'} onPress={() => set('looking_for', 'female')} />
              <OptionButton label="무관" selected={form.looking_for === 'any'} onPress={() => set('looking_for', 'any')} />
            </View>

            <Text style={styles.label}>거주 도시 *</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={v => set('city', v)}
              placeholder="예: 서울, 부산, 대전" placeholderTextColor={C.sub} />

            <Text style={styles.label}>자기소개 (선택)</Text>
            <TextInput style={[styles.input, styles.textArea]} value={form.bio} onChangeText={v => set('bio', v)}
              placeholder="간단한 자기소개를 작성해주세요" multiline numberOfLines={4}
              textAlignVertical="top" placeholderTextColor={C.sub} />
          </>
        );

      // ── 1: 성격 & 감성 ────────────────────────────────────
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>성격 & 감성</Text>
            <Text style={styles.stepSub}>나는 어떤 사람인가요?</Text>

            {/* Q1. 성격 유형 */}
            <Text style={styles.qLabel}>평소 나는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'introvert', emoji: '🌿', label: '혼자 있을 때 에너지가 충전돼요' },
                { value: 'ambivert',  emoji: '🌤', label: '혼자도, 함께도 편안한 편이에요' },
                { value: 'extrovert', emoji: '☀️', label: '사람들과 있을 때 더 활기차요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.personality_type === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('personality_type', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.personality_type === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q2. 감정 표현 */}
            <Text style={styles.qLabel}>힘들거나 속상한 일이 생기면, 나는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'suppress',      label: '혼자 조용히 생각을 정리해요' },
                { value: 'delayed_share', label: '시간이 지나면 가까운 사람에게 털어놓아요' },
                { value: 'expressive',    label: '솔직하게 바로 표현하는 편이에요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.emotional_expression === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('emotional_expression', o.value)}
                >
                  <Text style={[styles.sentenceText, form.emotional_expression === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q3. 대화 스타일 */}
            <Text style={styles.qLabel}>누군가와 이야기할 때 나는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'listener', label: '주로 들어주는 역할이 편해요' },
                { value: 'balanced', label: '듣기도, 말하기도 즐겨요' },
                { value: 'talker',   label: '이야기 나누는 걸 정말 좋아해요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.communication_style === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('communication_style', o.value)}
                >
                  <Text style={[styles.sentenceText, form.communication_style === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q4. 갈등 스타일 */}
            <Text style={styles.qLabel}>의견이 맞지 않을 때, 나는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'space',       label: '잠시 시간을 두고 나서 이야기하는 편이에요' },
                { value: 'direct',      label: '솔직하게 바로 이야기하는 편이에요' },
                { value: 'accommodate', label: '상대방 방식에 맞추는 편이에요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.conflict_style === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('conflict_style', o.value)}
                >
                  <Text style={[styles.sentenceText, form.conflict_style === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q5. 새로운 만남 */}
            <Text style={styles.qLabel}>새로운 사람을 사귀는 건...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'rarely',     label: '낯설고 조금 어렵게 느껴져요' },
                { value: 'sometimes',  label: '자연스럽게 편해지는 편이에요' },
                { value: 'very_often', label: '언제나 기대되고 즐거워요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.social_frequency === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('social_frequency', o.value)}
                >
                  <Text style={[styles.sentenceText, form.social_frequency === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      // ── 2: 일상 & 생활 습관 ───────────────────────────────
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>일상 & 생활 습관</Text>
            <Text style={styles.stepSub}>평소 생활 방식을 알려주세요</Text>

            {/* Q1. 아침형/저녁형 */}
            <Text style={styles.qLabel}>나는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'morning',  emoji: '🌅', label: '일찍 자고 일찍 일어나요 (아침형)' },
                { value: 'evening',  emoji: '🌙', label: '늦게 자고 늦게 일어나요 (저녁형)' },
                { value: 'flexible', emoji: '🌤', label: '그날그날 달라요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.chronotype === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('chronotype', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.chronotype === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q2. 쉬는 날 */}
            <Text style={styles.qLabel}>쉬는 날에는 주로...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'home',      label: '집에서 조용히 쉬는 게 좋아요' },
                { value: 'light_out', label: '가볍게 산책이나 나들이를 해요' },
                { value: 'active',    label: '활발하게 밖에서 움직이는 게 좋아요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.rest_style === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('rest_style', o.value)}
                >
                  <Text style={[styles.sentenceText, form.rest_style === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q3. 운동 */}
            <Text style={styles.qLabel}>운동은...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'never',     label: '거의 안 해요' },
                { value: 'rarely',    label: '생각날 때 가끔 해요' },
                { value: 'sometimes', label: '주 1~2회는 꼭 해요' },
                { value: 'regularly', label: '거의 매일 빠지지 않아요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.exercise_frequency === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('exercise_frequency', o.value)}
                >
                  <Text style={[styles.sentenceText, form.exercise_frequency === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q4. 식사 */}
            <Text style={styles.qLabel}>식사는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'regular',   label: '규칙적으로 꼭 챙겨 먹어요' },
                { value: 'flexible',  label: '입맛 따라, 먹고 싶을 때 먹어요' },
                { value: 'cook',      label: '직접 요리해 먹는 걸 즐겨요' },
                { value: 'dine_out',  label: '외식이나 배달을 자주 해요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.meal_style === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('meal_style', o.value)}
                >
                  <Text style={[styles.sentenceText, form.meal_style === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q5. 흡연 */}
            <Text style={styles.qLabel}>흡연은...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'never',        label: '담배를 피운 적 없어요' },
                { value: 'quit',         label: '예전에 피웠지만 완전히 끊었어요' },
                { value: 'occasionally', label: '가끔 피우는 편이에요' },
                { value: 'regularly',    label: '규칙적으로 피워요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.smoking === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('smoking', o.value)}
                >
                  <Text style={[styles.sentenceText, form.smoking === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q6. 음주 */}
            <Text style={styles.qLabel}>술자리는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'never',    label: '거의 안 마셔요' },
                { value: 'rarely',   label: '특별한 날에만 한 잔 해요' },
                { value: 'socially', label: '모임에서 자연스럽게 즐겨요' },
                { value: 'regularly',label: '술을 즐겨 마시는 편이에요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.drinking === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('drinking', o.value)}
                >
                  <Text style={[styles.sentenceText, form.drinking === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      // ── 3: 취미 & 관심사 ──────────────────────────────────
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>취미 & 관심사</Text>
            <Text style={styles.stepSub}>즐기는 활동을 모두 골라주세요</Text>
            <Text style={styles.qLabel}>여가 시간에 나는...</Text>
            <ChipGroup options={HOBBIES} selected={form.hobbies} onToggle={toggleHobby} />
          </>
        );

      // ── 4: 가족 & 주변 상황 ────────────────────────────────
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>가족 & 주변 상황</Text>
            <Text style={styles.stepSub}>현재 가족 구성을 알려주세요</Text>

            {/* Q1. 자녀 여부 */}
            <Text style={styles.qLabel}>자녀에 대해서는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { val: true,  label: '자녀가 있어요' },
                { val: false, label: '자녀가 없어요' },
              ].map(o => (
                <TouchableOpacity
                  key={String(o.val)}
                  style={[styles.sentenceOption, form.has_children === o.val && styles.sentenceOptionSelected]}
                  onPress={() => set('has_children', o.val)}
                >
                  <Text style={[styles.sentenceText, form.has_children === o.val && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q2. 동거 여부 (조건부) */}
            {form.has_children === true && (
              <>
                <Text style={styles.qLabel}>자녀와의 생활은...</Text>
                <View style={styles.sentenceRow}>
                  {[
                    { val: true,  label: '자녀와 함께 살고 있어요' },
                    { val: false, label: '자녀와 따로 살고 있어요' },
                  ].map(o => (
                    <TouchableOpacity
                      key={String(o.val)}
                      style={[styles.sentenceOption, form.children_living_together === o.val && styles.sentenceOptionSelected]}
                      onPress={() => set('children_living_together', o.val)}
                    >
                      <Text style={[styles.sentenceText, form.children_living_together === o.val && styles.sentenceTextSelected]}>
                        {o.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Q3. 추가 자녀 */}
            <Text style={styles.qLabel}>앞으로 자녀를 더 원하시나요?</Text>
            <View style={styles.sentenceRow}>
              {[
                { val: true,  label: '원해요' },
                { val: false, label: '원하지 않아요' },
              ].map(o => (
                <TouchableOpacity
                  key={String(o.val)}
                  style={[styles.sentenceOption, form.wants_more_children === o.val && styles.sentenceOptionSelected]}
                  onPress={() => set('wants_more_children', o.val)}
                >
                  <Text style={[styles.sentenceText, form.wants_more_children === o.val && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q4. 이사 의향 */}
            <Text style={styles.qLabel}>상대방이 다른 지역에 산다면...</Text>
            <View style={styles.sentenceRow}>
              {[
                { val: true,  label: '이사도 괜찮아요' },
                { val: false, label: '이사하기는 어려울 것 같아요' },
              ].map(o => (
                <TouchableOpacity
                  key={String(o.val)}
                  style={[styles.sentenceOption, form.willing_to_relocate === o.val && styles.sentenceOptionSelected]}
                  onPress={() => set('willing_to_relocate', o.val)}
                >
                  <Text style={[styles.sentenceText, form.willing_to_relocate === o.val && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );

      // ── 5: 관계 & 가치관 ──────────────────────────────────
      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>관계 & 가치관</Text>
            <Text style={styles.stepSub}>어떤 만남을 원하시나요?</Text>

            {/* Q1. 관계 목표 */}
            <Text style={styles.qLabel}>저는 이런 만남을 원해요...</Text>
            {[
              { value: 'marriage',      emoji: '💍', label: '결혼을 진지하게 생각하고 있어요' },
              { value: 'companionship', emoji: '🌿', label: '함께하는 삶의 동반자를 찾고 있어요' },
              { value: 'friendship',    emoji: '☕', label: '친한 친구처럼 편안한 관계를 원해요' },
              { value: 'open',          emoji: '🌸', label: '만나보고 자연스럽게 결정하고 싶어요' },
            ].map(o => (
              <TouchableOpacity
                key={o.value}
                style={[styles.relationOption, form.relationship_goal === o.value && styles.relationOptionSelected]}
                onPress={() => set('relationship_goal', o.value)}
              >
                <Text style={styles.relationEmoji}>{o.emoji}</Text>
                <Text style={[styles.relationText, form.relationship_goal === o.value && styles.relationTextSelected]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Q2. 가족 중요도 */}
            <Text style={[styles.qLabel, { marginTop: 8 }]}>가족은 내 삶에서...</Text>
            <View style={styles.importanceScale}>
              <Text style={styles.importanceScaleLabel}>크게 중요하지 않아요</Text>
              <ImportanceRow value={form.family_importance} onChange={v => set('family_importance', v)} />
              <Text style={[styles.importanceScaleLabel, { textAlign: 'right' }]}>매우 소중하고 중요해요</Text>
            </View>
          </>
        );

      // ── 6: 종교 & 신념 ────────────────────────────────────
      case 6:
        return (
          <>
            <Text style={styles.stepTitle}>종교 & 신념</Text>
            <Text style={styles.stepSub}>신앙에 대해 솔직하게 알려주세요</Text>

            {/* Q1. 종교 */}
            <Text style={styles.qLabel}>신앙에 대해서는...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'none',         emoji: '🍃', label: '특별한 종교가 없어요 (무교)' },
                { value: 'buddhism',     emoji: '🪷', label: '불교를 믿어요' },
                { value: 'christianity', emoji: '✝️',  label: '기독교 (개신교)를 믿어요' },
                { value: 'catholicism',  emoji: '⛪',  label: '천주교를 믿어요' },
                { value: 'other',        emoji: '🙏', label: '다른 종교를 믿어요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.religion === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('religion', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.religion === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q2. 종교 중요도 */}
            <Text style={[styles.qLabel, { marginTop: 8 }]}>상대방의 종교는...</Text>
            <View style={styles.importanceScale}>
              <Text style={styles.importanceScaleLabel}>전혀 상관없어요</Text>
              <ImportanceRow value={form.religion_importance} onChange={v => set('religion_importance', v)} />
              <Text style={[styles.importanceScaleLabel, { textAlign: 'right' }]}>꼭 맞아야 해요</Text>
            </View>
          </>
        );

      // ── 7: 현실 조건 ─────────────────────────────────────
      case 7:
        return (
          <>
            <Text style={styles.stepTitle}>현실 조건</Text>
            <Text style={styles.stepSub}>솔직한 답변이 더 정확한 매칭을 만들어요</Text>

            {/* Q1. 건강 상태 */}
            <Text style={styles.qLabel}>건강은...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'excellent', emoji: '💪', label: '매우 건강해요, 자신 있어요' },
                { value: 'good',      emoji: '😊', label: '큰 문제 없이 건강하게 지내요' },
                { value: 'fair',      emoji: '🌿', label: '약간의 건강 이슈가 있어요' },
                { value: 'managing',  emoji: '💊', label: '꾸준히 치료·관리를 받고 있어요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.health_status === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('health_status', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.health_status === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q2. 재정 상황 */}
            <Text style={styles.qLabel}>생활은...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'stable',      emoji: '🏠', label: '큰 걱정 없이 안정적으로 지내고 있어요' },
                { value: 'comfortable', emoji: '🌻', label: '여유 있게 생활하고 있어요' },
                { value: 'wealthy',     emoji: '✨', label: '풍요롭게 지내고 있어요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.financial_stability === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('financial_stability', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.financial_stability === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q3. 거주 형태 */}
            <Text style={styles.qLabel}>지금 사는 곳은...</Text>
            <View style={styles.sentenceRow}>
              {[
                { value: 'alone',         emoji: '🏡', label: '혼자 살고 있어요' },
                { value: 'with_family',   emoji: '👨‍👩‍👧', label: '가족과 함께 살고 있어요' },
                { value: 'with_children', emoji: '👶', label: '자녀와 함께 살고 있어요' },
                { value: 'other',         emoji: '🏘️', label: '그 외의 형태로 살고 있어요' },
              ].map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.sentenceOption, form.living_situation === o.value && styles.sentenceOptionSelected]}
                  onPress={() => set('living_situation', o.value)}
                >
                  <Text style={styles.sentenceEmoji}>{o.emoji}</Text>
                  <Text style={[styles.sentenceText, form.living_situation === o.value && styles.sentenceTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Q4. 희망 나이 */}
            <Text style={styles.qLabel}>만나고 싶은 상대방의 나이는...</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ageInputLabel}>최소 나이</Text>
                <TextInput style={styles.ageInput} value={form.age_min} onChangeText={v => set('age_min', v)}
                  placeholder="예: 55" keyboardType="numeric" maxLength={3} placeholderTextColor={C.sub} />
              </View>
              <View style={styles.ageSeparator}>
                <Text style={styles.ageSeparatorText}>~</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ageInputLabel}>최대 나이</Text>
                <TextInput style={styles.ageInput} value={form.age_max} onChangeText={v => set('age_max', v)}
                  placeholder="예: 70" keyboardType="numeric" maxLength={3} placeholderTextColor={C.sub} />
              </View>
            </View>

            {!isEditMode && (
              <View style={styles.completeBanner}>
                <Text style={styles.completeBannerText}>🎉 거의 다 됐어요!</Text>
                <Text style={styles.completeBannerSub}>완료하면 나와 잘 맞는 분을 찾아드릴게요.</Text>
              </View>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* 진행 바 */}
      {!isEditMode && (
        <>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepCount}>{step + 1} / {STEPS.length} — {STEPS[step]}</Text>
        </>
      )}

      {/* 수정 모드 헤더 */}
      {isEditMode && (
        <View style={styles.editHeader}>
          <Text style={styles.editHeaderTitle}>가치관 수정</Text>
          <Text style={styles.editHeaderSub}>{step + 1}/{STEPS.length} · {STEPS[step]}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {renderStep()}
      </ScrollView>

      {/* 네비게이션 */}
      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={back}>
            <Text style={styles.backBtnText}>← 이전</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {!isLastStep ? (
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>다음 →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, saving && styles.disabledBtn]}
            onPress={submit}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>
                  {isEditMode ? `수정 완료 (1 크레딧)` : '완료 & 매칭 시작'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  progressBar: { height: 6, backgroundColor: '#EEE' },
  progressFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  stepCount: { textAlign: 'center', color: C.sub, fontSize: 13, paddingVertical: 8 },
  editHeader: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  editHeaderTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  editHeaderSub: { fontSize: 13, color: C.sub },
  content: { padding: 20, paddingBottom: 100 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: C.text, marginBottom: 6 },
  stepSub: { fontSize: 16, color: C.sub, marginBottom: 24 },
  label: { fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 10, marginTop: 4 },
  labelSub: { fontSize: 13, color: C.sub, marginBottom: 8, marginTop: -6 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 17,
    color: C.text, marginBottom: 12, backgroundColor: C.card,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  option: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card, minWidth: 80,
  },
  optionSelected: { borderColor: C.primary, backgroundColor: C.primaryLight },
  optionText: { fontSize: 15, color: C.text, textAlign: 'center' },
  optionTextSelected: { color: C.primary, fontWeight: '700' },
  // 문장형 질문 스타일
  qLabel: {
    fontSize: 18, fontWeight: '700', color: C.text,
    marginBottom: 12, marginTop: 20,
    borderLeftWidth: 3, borderLeftColor: C.primary,
    paddingLeft: 10,
  },
  sentenceRow: { gap: 8, marginBottom: 8 },
  sentenceOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 15, backgroundColor: C.card,
  },
  sentenceOptionSelected: {
    borderColor: C.primary, backgroundColor: C.primaryLight,
  },
  sentenceEmoji: { fontSize: 22, width: 28 },
  sentenceText: { fontSize: 15, color: C.text, flex: 1, lineHeight: 22 },
  sentenceTextSelected: { color: C.primary, fontWeight: '700' },
  // 이모지 선택 옵션 (성격 유형, legacy)
  emojiOption: {
    flex: 1, alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  emojiOptionSelected: { borderColor: C.primary, backgroundColor: C.primaryLight },
  emojiOptionIcon: { fontSize: 28, marginBottom: 6 },
  emojiOptionText: { fontSize: 14, color: C.text, fontWeight: '600' },
  emojiOptionTextSelected: { color: C.primary },
  bigOption: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    padding: 16, marginBottom: 10, backgroundColor: C.card,
  },
  bigOptionSelected: { borderColor: C.primary, backgroundColor: C.primaryLight },
  bigOptionLabel: { fontSize: 18, fontWeight: '600', color: C.text, marginBottom: 4 },
  bigOptionLabelSelected: { color: C.primary },
  bigOptionDesc: { fontSize: 14, color: C.sub },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  chipSelected: { borderColor: C.primary, backgroundColor: C.primaryLight },
  chipText: { fontSize: 15, color: C.text },
  chipTextSelected: { color: C.primary, fontWeight: '700' },
  importanceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  importanceBtn: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.card,
  },
  importanceBtnSelected: { borderColor: C.primary, backgroundColor: C.primary },
  importanceBtnText: { fontSize: 18, color: C.text, fontWeight: '600' },
  importanceBtnTextSelected: { color: '#FFF' },
  // 관계 목표 — 큰 카드형 선택지
  relationOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: C.border, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 18, backgroundColor: C.card, marginBottom: 10,
  },
  relationOptionSelected: { borderColor: C.primary, backgroundColor: C.primaryLight },
  relationEmoji: { fontSize: 26, width: 32 },
  relationText: { fontSize: 16, color: C.text, flex: 1, lineHeight: 24 },
  relationTextSelected: { color: C.primary, fontWeight: '700' },
  // 중요도 척도
  importanceScale: { marginBottom: 12 },
  importanceScaleLabel: { fontSize: 12, color: C.sub, marginBottom: 6 },
  // 나이 입력
  ageInputLabel: { fontSize: 13, color: C.sub, marginBottom: 6 },
  ageInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 20,
    color: C.text, backgroundColor: C.card, textAlign: 'center', fontWeight: '700',
  },
  ageSeparator: { justifyContent: 'flex-end', paddingBottom: 14 },
  ageSeparatorText: { fontSize: 22, color: C.sub, fontWeight: '300' },
  // 완료 배너
  completeBanner: {
    backgroundColor: '#E8F5E9', borderRadius: 12, padding: 20, marginTop: 20, alignItems: 'center',
  },
  completeBannerText: { fontSize: 18, fontWeight: '700', color: '#27AE60', marginBottom: 6 },
  completeBannerSub: { fontSize: 14, color: '#555' },
  navRow: {
    flexDirection: 'row', padding: 16, borderTopWidth: 1,
    borderTopColor: C.border, backgroundColor: C.bg,
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  backBtn: { paddingHorizontal: 20, paddingVertical: 14 },
  backBtnText: { fontSize: 16, color: C.sub },
  nextBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 },
  disabledBtn: { opacity: 0.6 },
  nextBtnText: { fontSize: 16, color: '#FFF', fontWeight: '700' },
});
