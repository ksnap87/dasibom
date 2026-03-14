/**
 * 가치관 질문 & 답변 전체 텍스트 매핑
 * QuestionnaireScreen에서 사용하는 질문을 프로필에서 보여주기 위한 데이터
 */

export interface QAItem {
  field: string;
  question: string;
  answers: Record<string, string>;
  type?: 'scale' | 'boolean' | 'multi' | 'range';
}

export const PERSONALITY_QA: QAItem[] = [
  {
    field: 'personality_type',
    question: '평소 나는...',
    answers: {
      introvert: '혼자 있을 때 에너지가 충전돼요',
      ambivert: '혼자도, 함께도 편안한 편이에요',
      extrovert: '사람들과 있을 때 더 활기차요',
    },
  },
  {
    field: 'emotional_expression',
    question: '힘들거나 속상한 일이 생기면, 나는...',
    answers: {
      suppress: '혼자 조용히 생각을 정리해요',
      delayed_share: '시간이 지나면 가까운 사람에게 털어놓아요',
      expressive: '솔직하게 바로 표현하는 편이에요',
    },
  },
  {
    field: 'communication_style',
    question: '누군가와 이야기할 때 나는...',
    answers: {
      listener: '주로 들어주는 역할이 편해요',
      balanced: '듣기도, 말하기도 즐겨요',
      talker: '이야기 나누는 걸 정말 좋아해요',
    },
  },
  {
    field: 'conflict_style',
    question: '의견이 맞지 않을 때, 나는...',
    answers: {
      space: '잠시 시간을 두고 나서 이야기하는 편이에요',
      direct: '솔직하게 바로 이야기하는 편이에요',
      accommodate: '상대방 방식에 맞추는 편이에요',
    },
  },
  {
    field: 'social_frequency',
    question: '새로운 사람을 사귀는 건...',
    answers: {
      rarely: '낯설고 조금 어렵게 느껴져요',
      sometimes: '자연스럽게 편해지는 편이에요',
      often: '자주 모임을 즐겨요',
      very_often: '언제나 기대되고 즐거워요',
    },
  },
];

export const DAILY_LIFE_QA: QAItem[] = [
  {
    field: 'chronotype',
    question: '나는...',
    answers: {
      morning: '일찍 자고 일찍 일어나요 (아침형)',
      evening: '늦게 자고 늦게 일어나요 (저녁형)',
      flexible: '그날그날 달라요',
    },
  },
  {
    field: 'rest_style',
    question: '쉬는 날에는 주로...',
    answers: {
      home: '집에서 조용히 쉬는 게 좋아요',
      light_out: '가볍게 산책이나 나들이를 해요',
      active: '활발하게 밖에서 움직이는 게 좋아요',
    },
  },
  {
    field: 'exercise_frequency',
    question: '운동은...',
    answers: {
      never: '거의 안 해요',
      rarely: '생각날 때 가끔 해요',
      sometimes: '주 1~2회는 꼭 해요',
      regularly: '거의 매일 빠지지 않아요',
    },
  },
  {
    field: 'meal_style',
    question: '식사는...',
    answers: {
      regular: '규칙적으로 꼭 챙겨 먹어요',
      flexible: '입맛 따라, 먹고 싶을 때 먹어요',
      cook: '직접 요리해 먹는 걸 즐겨요',
      dine_out: '외식이나 배달을 자주 해요',
    },
  },
  {
    field: 'smoking',
    question: '흡연은...',
    answers: {
      never: '담배를 피운 적 없어요',
      quit: '예전에 피웠지만 완전히 끊었어요',
      occasionally: '가끔 피우는 편이에요',
      regularly: '규칙적으로 피워요',
    },
  },
  {
    field: 'drinking',
    question: '술자리는...',
    answers: {
      never: '거의 안 마셔요',
      rarely: '특별한 날에만 한 잔 해요',
      socially: '모임에서 자연스럽게 즐겨요',
      regularly: '술을 즐겨 마시는 편이에요',
    },
  },
];

export const FAMILY_QA: QAItem[] = [
  {
    field: 'has_children',
    question: '자녀에 대해서는...',
    answers: {
      true: '자녀가 있어요',
      false: '자녀가 없어요',
    },
    type: 'boolean',
  },
  {
    field: 'children_living_together',
    question: '자녀와의 생활은...',
    answers: {
      true: '자녀와 함께 살고 있어요',
      false: '자녀와 따로 살고 있어요',
    },
    type: 'boolean',
  },
  {
    field: 'willing_to_relocate',
    question: '상대방이 다른 지역에 산다면...',
    answers: {
      true: '이사도 괜찮아요',
      false: '이사하기는 어려울 것 같아요',
    },
    type: 'boolean',
  },
  {
    field: 'family_importance',
    question: '가족은 내 삶에서...',
    answers: {
      '1': '크게 중요하지 않아요',
      '2': '보통이에요',
      '3': '어느 정도 중요해요',
      '4': '꽤 중요해요',
      '5': '매우 소중하고 중요해요',
    },
    type: 'scale',
  },
];

export const RELATIONSHIP_QA: QAItem[] = [
  {
    field: 'relationship_goal',
    question: '저는 이런 만남을 원해요...',
    answers: {
      marriage: '결혼을 진지하게 생각하고 있어요',
      companionship: '함께하는 삶의 동반자를 찾고 있어요',
      friendship: '친한 친구처럼 편안한 관계를 원해요',
      open: '만나보고 자연스럽게 결정하고 싶어요',
    },
  },
];

export const RELIGION_QA: QAItem[] = [
  {
    field: 'religion',
    question: '신앙에 대해서는...',
    answers: {
      none: '특별한 종교가 없어요 (무교)',
      buddhism: '불교를 믿어요',
      christianity: '기독교 (개신교)를 믿어요',
      catholicism: '천주교를 믿어요',
      other: '다른 종교를 믿어요',
    },
  },
  {
    field: 'religion_importance',
    question: '상대방의 종교는...',
    answers: {
      '1': '전혀 상관없어요',
      '2': '크게 신경 쓰지 않아요',
      '3': '보통이에요',
      '4': '어느 정도 맞으면 좋겠어요',
      '5': '꼭 맞아야 해요',
    },
    type: 'scale',
  },
];

export const REALITY_QA: QAItem[] = [
  {
    field: 'health_status',
    question: '건강은...',
    answers: {
      excellent: '매우 건강해요, 자신 있어요',
      good: '큰 문제 없이 건강하게 지내요',
      fair: '약간의 건강 이슈가 있어요',
      managing: '꾸준히 치료·관리를 받고 있어요',
    },
  },
  {
    field: 'financial_stability',
    question: '생활은...',
    answers: {
      stable: '큰 걱정 없이 안정적으로 지내고 있어요',
      comfortable: '여유 있게 생활하고 있어요',
      wealthy: '풍요롭게 지내고 있어요',
    },
  },
  {
    field: 'living_situation',
    question: '지금 사는 곳은...',
    answers: {
      alone: '혼자 살고 있어요',
      with_family: '가족과 함께 살고 있어요',
      with_children: '자녀와 함께 살고 있어요',
      other: '그 외의 형태로 살고 있어요',
    },
  },
];

export const HOBBY_LABELS: Record<string, string> = {
  hiking: '등산', travel: '여행', cooking: '요리', reading: '독서',
  music: '음악', gardening: '원예', golf: '골프', swimming: '수영',
  yoga: '요가/필라테스', photography: '사진', volunteering: '봉사활동',
  movies: '영화 감상', dancing: '댄스', art: '미술/공예', walking: '산책', fishing: '낚시',
};

/**
 * 프로필 데이터에서 QAItem의 답변 텍스트를 가져오는 헬퍼
 */
export function getAnswerText(qa: QAItem, profile: any): string | null {
  const val = profile[qa.field];
  if (val === null || val === undefined) return null;

  if (qa.type === 'boolean') {
    return qa.answers[String(val)] ?? null;
  }
  if (qa.type === 'scale') {
    return qa.answers[String(val)] ?? `${val} / 5`;
  }
  return qa.answers[val] ?? String(val);
}
