import React, { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Alert, Image, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getProfile, reportUser, blockUser } from '../api/client';
import { Profile, RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import {
  PERSONALITY_QA, DAILY_LIFE_QA, FAMILY_QA, RELATIONSHIP_QA,
  RELIGION_QA, REALITY_QA, HOBBY_LABELS as HOBBY_LABELS_QA,
  QAItem, getAnswerText,
} from '../data/questionLabels';
import { Button, colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'FriendProfile'>;

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
      <AppText style={styles.sectionTitle}>{icon} {title}</AppText>
      {qaList.map(qa => <QARow key={qa.field} qa={qa} profile={profile} />)}
    </View>
  );
}

export default function FriendProfileScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { user_id, match_id, other_name } = route.params;
  const { phoneVerified } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const REPORT_REASONS = [
    { label: '부적절한 사진', value: 'inappropriate_photo' },
    { label: '허위 프로필', value: 'fake_profile' },
    { label: '불쾌한 대화', value: 'offensive_chat' },
    { label: '기타', value: 'other' },
  ];

  const loadProfile = useCallback(() => {
    setLoading(true);
    setError(false);
    getProfile(user_id)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user_id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleChat = () => {
    if (!match_id) return;
    if (phoneVerified) {
      nav.navigate('ChatRoom', { match_id, other_name, other_user_id: user_id });
    } else {
      nav.navigate('PhoneVerification', { match_id, other_name, other_user_id: user_id });
    }
  };

  const handleReport = () => setShowReportModal(true);

  const submitReport = async (reason: string) => {
    setShowReportModal(false);
    try {
      await reportUser(user_id, reason);
      Alert.alert('신고 완료', '신고가 접수되었습니다. 검토 후 조치하겠습니다.');
    } catch {
      Alert.alert('오류', '신고 처리 중 문제가 발생했습니다.');
    }
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
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorIcon}>⚠️</AppText>
        <AppText style={styles.errorText}>프로필을 불러올 수 없습니다.</AppText>
        <Button label="다시 시도" onPress={loadProfile} fullWidth={false} />
      </View>
    );
  }

  const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.hero}>
          {profile.photo_url ? (
            <Image source={{ uri: profile.photo_url }} style={styles.bigPhoto} />
          ) : (
            <View style={styles.bigAvatar}>
              <AppText style={styles.bigAvatarText}>{profile.name?.charAt(0) ?? '?'}</AppText>
            </View>
          )}
          <AppText style={styles.heroName}>{profile.name}</AppText>
          <AppText style={styles.heroSub}>
            {age != null ? `${age}세` : ''}
            {age != null && profile.city ? ' · ' : ''}
            {profile.city ?? ''}
          </AppText>
          {profile.bio ? <AppText style={styles.heroBio}>{profile.bio}</AppText> : null}
          {!profile.photo_url && (
            <View style={styles.noPhotoHint}>
              <AppText style={styles.noPhotoHintText}>
                아직 사진을 등록하지 않은 분이에요
              </AppText>
            </View>
          )}
        </View>

        <QASection title="성격 & 감성" icon="💭" qaList={PERSONALITY_QA} profile={profile} />
        <QASection title="일상 & 생활 습관" icon="🌅" qaList={DAILY_LIFE_QA} profile={profile} />

        {profile.hobbies && profile.hobbies.length > 0 && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>🎨 취미 & 관심사</AppText>
            <AppText style={styles.qaQuestion}>Q. 여가 시간에 나는...</AppText>
            <View style={[styles.chipRow, { marginTop: spacing.xs }]}>
              {profile.hobbies.map((h: string) => (
                <View key={h} style={styles.chip}>
                  <AppText style={styles.chipText}>{HOBBY_LABELS_QA[h] ?? h}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        <QASection title="가족 & 주변 상황" icon="👨‍👩‍👧" qaList={FAMILY_QA} profile={profile} />
        <QASection title="관계 & 가치관" icon="💝" qaList={RELATIONSHIP_QA} profile={profile} />
        <QASection title="종교 & 신념" icon="⛪" qaList={RELIGION_QA} profile={profile} />
        <QASection title="현실 조건" icon="🏠" qaList={REALITY_QA} profile={profile} />

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={handleReport}
            accessibilityLabel={`${other_name}님 신고하기`}
            accessibilityRole="button"
          >
            <AppText style={styles.reportBtnText}>신고</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.blockBtn}
            onPress={handleBlock}
            accessibilityLabel={`${other_name}님 차단하기`}
            accessibilityRole="button"
          >
            <AppText style={styles.blockBtnText}>차단</AppText>
          </TouchableOpacity>
        </View>

        {match_id ? <View style={{ height: 90 }} /> : <View style={{ height: spacing.md }} />}
      </ScrollView>

      {match_id && (
        <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom + spacing.xs) }]}>
          <Button
            label="💌 채팅 시작하기"
            variant="primary"
            onPress={handleChat}
          />
        </View>
      )}

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReportModal(false)}
        >
          <View style={styles.modalContent}>
            <AppText style={styles.modalTitle}>신고 사유 선택</AppText>
            <AppText style={styles.modalSub}>어떤 이유로 신고하시겠어요?</AppText>
            {REPORT_REASONS.map(r => (
              <TouchableOpacity
                key={r.value}
                style={styles.modalOption}
                onPress={() => submitReport(r.value)}
              >
                <AppText style={styles.modalOptionText}>{r.label}</AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowReportModal(false)}
            >
              <AppText style={styles.modalCancelText}>취소</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  errorIcon: { fontSize: 48, marginBottom: spacing.sm },
  errorText: {
    fontSize: typography.body,
    color: colors.sub,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  content: { padding: spacing.md, paddingBottom: spacing.md + 4 },

  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.xs,
  },
  bigPhoto: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: spacing.sm,
  },
  bigAvatar: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  bigAvatarText: {
    fontSize: 56,
    color: colors.primaryDark,
    fontWeight: typography.bold,
  },
  noPhotoHint: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  noPhotoHintText: {
    fontSize: typography.caption,
    color: colors.sub,
  },
  heroName: {
    fontSize: typography.heading,
    fontWeight: typography.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: typography.body,
    color: colors.sub,
    marginTop: 4,
  },
  heroBio: {
    fontSize: typography.body - 1,
    color: colors.sub,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
    lineHeight: (typography.body - 1) * typography.lineRelaxed,
    paddingHorizontal: spacing.md,
  },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: typography.bold,
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: typography.caption + 1,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },

  qaRow: {
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  qaQuestion: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    marginBottom: 4,
    lineHeight: (typography.caption + 1) * typography.lineNormal,
  },
  qaAnswer: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: typography.semibold,
    lineHeight: typography.body * typography.lineNormal,
    paddingLeft: 4,
  },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  reportBtn: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md + 4 },
  reportBtnText: {
    fontSize: typography.caption + 1,
    color: colors.sub,
  },
  blockBtn: { paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md + 4 },
  blockBtnText: {
    fontSize: typography.caption + 1,
    color: colors.danger,
  },

  modalOverlay: {
    flex: 1, backgroundColor: colors.overlay,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    marginBottom: spacing.md,
  },
  modalOption: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalOptionText: {
    fontSize: typography.body,
    color: colors.text,
  },
  modalCancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  modalCancelText: {
    fontSize: typography.body,
    color: colors.sub,
    fontWeight: typography.semibold,
  },
});
