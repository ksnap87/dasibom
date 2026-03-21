/**
 * AppText — 글씨 크기 배율이 자동 적용되는 Text 컴포넌트
 * 앱 전체에서 <Text> 대신 사용
 */
import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useFontStore } from '../store/fontStore';

export default function AppText(props: TextProps) {
  const scale = useFontStore(s => s.scale);

  if (scale === 1) {
    return <Text {...props} allowFontScaling={false} />;
  }

  const flat = StyleSheet.flatten(props.style) as any;
  const baseFontSize = flat?.fontSize;

  if (baseFontSize && typeof baseFontSize === 'number') {
    return (
      <Text
        {...props}
        allowFontScaling={false}
        style={[props.style, { fontSize: Math.round(baseFontSize * scale) }]}
      />
    );
  }

  // fontSize가 없는 경우 기본 14에 배율 적용
  return (
    <Text
      {...props}
      allowFontScaling={false}
      style={[props.style, { fontSize: Math.round(14 * scale) }]}
    />
  );
}
