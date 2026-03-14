export interface Profile {
  id: string;
  name: string;
  birth_year: number;
  gender: 'male' | 'female';
  looking_for: 'male' | 'female' | 'any';
  city: string;
  photo_url?: string;
  bio?: string;
  questionnaire_completed: boolean;
  phone_verified?: boolean;   // 본인인증 여부 (채팅 전 필수)
  credits?: number;           // 보유 크레딧

  // 성격 & 감성
  personality_type?: 'introvert' | 'extrovert' | 'ambivert';
  emotional_expression?: 'suppress' | 'delayed_share' | 'expressive';  // 감정 표현 방식
  communication_style?: 'listener' | 'balanced' | 'talker';             // 대화 스타일
  conflict_style?: 'space' | 'direct' | 'accommodate';                  // 갈등 해결 방식
  social_frequency?: 'rarely' | 'sometimes' | 'often' | 'very_often';

  // 일상 & 생활
  chronotype?: 'morning' | 'evening' | 'flexible';                      // 아침형/저녁형
  rest_style?: 'home' | 'light_out' | 'active';                         // 쉬는 날 스타일
  exercise_frequency?: 'never' | 'rarely' | 'sometimes' | 'regularly';
  meal_style?: 'regular' | 'flexible' | 'cook' | 'dine_out';            // 식습관
  smoking?: 'never' | 'quit' | 'occasionally' | 'regularly';
  drinking?: 'never' | 'rarely' | 'socially' | 'regularly';

  // 취미
  hobbies?: string[];

  // 가족 & 주변
  has_children?: boolean;
  children_living_together?: boolean;
  wants_more_children?: boolean;
  willing_to_relocate?: boolean;

  // 관계 & 가치관
  relationship_goal?: 'marriage' | 'companionship' | 'friendship' | 'open';
  family_importance?: number;

  // 종교
  religion?: 'none' | 'buddhism' | 'christianity' | 'catholicism' | 'other';
  religion_importance?: number;

  // 현실 조건
  health_status?: 'excellent' | 'good' | 'fair' | 'managing';
  financial_stability?: 'stable' | 'comfortable' | 'wealthy';
  living_situation?: 'alone' | 'with_family' | 'with_children' | 'other';
  age_min?: number;
  age_max?: number;
}

export interface SuggestionProfile {
  id: string;
  name: string;
  birth_year: number;
  gender: string;
  city: string;
  photo_url?: string;
  bio?: string;
  hobbies?: string[];
  religion?: string;
  relationship_goal?: string;
  health_status?: string;
  living_situation?: string;
  exercise_frequency?: string;
  personality_type?: string;
  // 미리 보기 질문용 추가 필드
  smoking?: string;
  drinking?: string;
  chronotype?: string;
  family_importance?: number;
  religion_importance?: number;
  has_children?: boolean;
  willing_to_relocate?: boolean;
  financial_stability?: string;
  communication_style?: string;
  conflict_style?: string;
  compatibility_score: number;
}

export interface MutualMatch {
  match_id: string;
  created_at: string;
  compatibility_score: number;
  other_user: {
    id: string;
    name: string;
    birth_year: number;
    city: string;
    photo_url?: string;
    bio?: string;
  };
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string;
  sender: { id: string; name: string; photo_url?: string };
}

export type RootStackParamList = {
  Auth: undefined;
  Questionnaire: undefined;
  Main: undefined;
  ChatRoom: { match_id: string; other_name: string; other_user_id: string };
  PhoneVerification: { match_id: string; other_name: string; other_user_id: string };  // 채팅 전 본인인증
  QuestionnaireEdit: undefined;                                   // 크레딧으로 가치관 수정
  FriendProfile: { user_id: string; match_id: string; other_name: string }; // 매칭 후 상대 프로필
};

export type MainTabParamList = {
  Suggestions: undefined;
  Matches: undefined;
  Profile: undefined;
};
