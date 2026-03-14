import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getProfile, reportUser, blockUser } from '../api/client';
import { Profile, RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'FriendProfile'>;

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
};

const LABELS: Record<string, Record<string, string>> = {
  gender: { male: '남성', female: '여성' },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function FriendProfileScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user_id, match_id, other_name } = route.params;
  const { phoneVerified } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(user_id)
      .then(setProfile)
      .catch(() => Alert.alert('오류', '프로필을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [user_id]);

  const handleChat = () => {
    if (phoneVerified) {
      nav.navigate('ChatRoom', { match_id, other_name, other_user_id: user_id });
    } else {
      nav.navigate('PhoneVerification', { match_id, other_name, other_user_id: user_id });
    }
  };

  const handleReport = () => {
    const reasons = [
      { text: '부적절한 사진', value: 'inappropriate_photo' },
      { text: '허위 프로필', value: 'fake_profile' },
      { text: '불쾌한 대화', value: 'offensive_chat' },
      { text: '기타', value: 'other' },
    ];
    Alert.alert('신고 사유 선택', '어떤 이유로 신고하시겠어요?', [
      ...reasons.map(r => ({
        text: r.text,
        onPress: async () => {
          try {
            await reportUser(user_id, r.value);
            Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
          } catch {
            Alert.alert('오류', '신고 처리 중 문제가 발생했습니다.');
          }
        },
      })),
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleBlock = () => {
    Alert.alert(
      '차단하기',
      `${other_name}님을 차단하시겠어요?\n차단하면 매칭이 해제되고 서로 추천에 나타나지 않습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '차단',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(user_id);
              Alert.alert('차단 완료', `${other_name}님이 차단되었습니다.`, [
                { text: '확인', onPress: () => nav.goBack() },
              ]);
            } catch {
              Alert.alert('오류', '차단 처리 중 문제가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>프로필을 불러올 수 없습니다.</Text>
      </View>
    );
  }

  const age = new Date().getFullYear() - profile.birth_year;
  const l = (category: string, val?: string | null) =>
    val ? (LABELS[category]?.[val] ?? val) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Hero */}
        <View style={styles.hero}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.bigPhoto} />
          ) : (
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>{profile.name.charAt(0)}</Text>
            </View>
          )}
          <Text style={styles.heroName}>{profile.name}</Text>
          <Text style={styles.heroSub}>{age}세 · {profile.city}</Text>
          {profile.bio ? <Text style={styles.heroBio}>{profile.bio}</Text> : null}
        </View>

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

        {/* 신고/차단 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.reportBtn} onPress={handleReport}>
            <Text style={styles.reportBtnText}>신고</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.blockBtn} onPress={handleBlock}>
            <Text style={styles.blockBtnText}>차단</Text>
          </TouchableOpacity>
        </View>

        {/* 채팅 버튼 공간 확보 */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* 하단 고정 채팅 버튼 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.chatBtn} onPress={handleChat} activeOpacity={0.8}>
          <Text style={styles.chatBtnText}>💌 채팅 시작하기</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: C.sub },
  content: { padding: 16, paddingBottom: 20 },

  hero: { alignItems: 'center', paddingVertical: 24, marginBottom: 8 },
  bigPhoto: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: C.primary, marginBottom: 12 },
  bigAvatar: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  bigAvatarText: { fontSize: 42, color: C.primary, fontWeight: '700' },
  heroName: { fontSize: 28, fontWeight: '700', color: C.text },
  heroSub: { fontSize: 16, color: C.sub, marginTop: 4 },
  heroBio: { fontSize: 15, color: '#555', marginTop: 10, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  section: {
    backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.primary, marginBottom: 12 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0ECEA',
  },
  rowLabel: { fontSize: 15, color: C.sub },
  rowValue: { fontSize: 15, color: C.text, fontWeight: '600', flex: 1, textAlign: 'right' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.primaryLight, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 14, color: C.primary, fontWeight: '600' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg, padding: 16, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  chatBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', elevation: 3,
  },
  chatBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  reportBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  reportBtnText: { fontSize: 14, color: C.sub },
  blockBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  blockBtnText: { fontSize: 14, color: '#D44' },
});
