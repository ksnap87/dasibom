/**
 * 다시봄 디자인 토큰 — Claude 스타일 (따뜻한 테라코타 + 크림)
 *
 * 원칙:
 * - 시니어 접근성: 본문 최소 16pt, 액션 18pt
 * - 8pt 간격 그리드
 * - 5단계 타입 스케일
 * - 색상 명도 대비 WCAG AA 이상
 */

export const palette = {
  // 중립
  cream: '#FAF7F2',        // 앱 배경 (따뜻한 오프화이트)
  ivory: '#F4EFE8',        // 살짝 더 진한 서페이스
  white: '#FFFFFF',        // 카드
  ink: '#2A2623',          // 본문
  inkSoft: '#5C534C',      // 보조 텍스트
  inkMuted: '#8A7F77',     // 힌트/메타
  line: '#E8E1D7',         // 보더
  lineSoft: '#F0EAE0',     // 섹션 구분선

  // 액센트 (Claude 테라코타)
  accent: '#C9634F',        // 주 액션
  accentHover: '#B25442',
  accentSoft: '#F6E5DE',    // 액센트 배경
  accentInk: '#8E3E2E',     // 액센트 위 텍스트 (다크)

  // 시맨틱
  success: '#5F8A5A',
  warn: '#C9904F',
  danger: '#B5473C',

  // 오버레이
  overlay: 'rgba(42, 38, 35, 0.55)',
} as const;

// 레거시 COLORS 와 호환 맞추기 위한 별칭 (단계적 마이그레이션)
export const colors = {
  primary: palette.accent,
  primaryDark: palette.accentHover,
  primaryLight: palette.accentSoft,
  primaryInk: palette.accentInk,
  bg: palette.cream,
  surface: palette.white,
  surfaceAlt: palette.ivory,
  text: palette.ink,
  sub: palette.inkSoft,
  muted: palette.inkMuted,
  border: palette.line,
  divider: palette.lineSoft,
  success: palette.success,
  warn: palette.warn,
  danger: palette.danger,
  overlay: palette.overlay,
  gold: palette.warn,
} as const;

// 8pt 그리드
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// 카드/버튼 반경 — 두 단계만
export const radius = {
  sm: 10,
  md: 16,
  pill: 999,
} as const;

// 타이포 스케일 (시니어 기준: 본문 16)
export const typography = {
  // size
  caption: 13,     // 힌트, 메타
  body: 16,        // 본문 (최소)
  bodyLarge: 18,   // 강조 본문 / 버튼
  title: 22,       // 카드/섹션 제목
  heading: 28,     // 화면 제목
  display: 34,     // 웰컴 등

  // weight
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // line height 배수
  lineTight: 1.25,
  lineNormal: 1.45,
  lineRelaxed: 1.6,
} as const;

// 그림자는 최소한으로 — 얇은 보더 우선
export const shadow = {
  none: {},
  card: {
    shadowColor: '#2A2623',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 1,
  },
  lift: {
    shadowColor: '#2A2623',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const theme = {
  palette,
  colors,
  spacing,
  radius,
  typography,
  shadow,
};

export type Theme = typeof theme;
