import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const C = {
  shimmerBase: '#E8E0DC',
  shimmerHighlight: '#F5F0EE',
  bg: '#FFF8F5',
};

function ShimmerBlock({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: C.shimmerBase,
          opacity,
        },
        style,
      ]}
    />
  );
}

function CardSkeleton() {
  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <ShimmerBlock width={52} height={52} borderRadius={26} />
        <View style={styles.cardHeaderInfo}>
          <ShimmerBlock width={120} height={18} />
          <ShimmerBlock width={80} height={14} style={{ marginTop: 6 }} />
        </View>
        <ShimmerBlock width={70} height={28} borderRadius={8} />
      </View>
      {/* QA rows */}
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={styles.qaRow}>
          <ShimmerBlock width={100} height={14} />
          <ShimmerBlock width={70} height={14} />
        </View>
      ))}
      {/* Action buttons */}
      <View style={styles.actionRow}>
        <ShimmerBlock width={'30%' as any} height={48} borderRadius={12} />
        <ShimmerBlock width={'65%' as any} height={48} borderRadius={12} />
      </View>
    </View>
  );
}

function MatchRowSkeleton() {
  return (
    <View style={styles.matchRow}>
      <ShimmerBlock width={56} height={56} borderRadius={28} />
      <View style={styles.matchRowInfo}>
        <ShimmerBlock width={130} height={18} />
        <ShimmerBlock width={90} height={13} style={{ marginTop: 4 }} />
        <ShimmerBlock width={110} height={12} style={{ marginTop: 4 }} />
      </View>
      <ShimmerBlock width={80} height={16} borderRadius={4} />
    </View>
  );
}

function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      {/* Avatar */}
      <View style={styles.profileCenter}>
        <ShimmerBlock width={100} height={100} borderRadius={50} />
        <ShimmerBlock width={120} height={24} style={{ marginTop: 12 }} />
        <ShimmerBlock width={90} height={16} style={{ marginTop: 6 }} />
      </View>
      {/* Sections */}
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.profileSection}>
          <ShimmerBlock width={140} height={18} style={{ marginBottom: 12 }} />
          <ShimmerBlock width={'100%' as any} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width={'80%' as any} height={14} style={{ marginBottom: 8 }} />
          <ShimmerBlock width={'60%' as any} height={14} />
        </View>
      ))}
    </View>
  );
}

type SkeletonVariant = 'card' | 'match-row' | 'profile';

export default function SkeletonLoader({ variant, count = 1 }: {
  variant: SkeletonVariant;
  count?: number;
}) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <View style={styles.container}>
      {items.map(i => {
        switch (variant) {
          case 'card':
            return <CardSkeleton key={i} />;
          case 'match-row':
            return <MatchRowSkeleton key={i} />;
          case 'profile':
            return <ProfileSkeleton key={i} />;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },

  // Card skeleton
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  // Match row skeleton
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    gap: 14,
  },
  matchRowInfo: {
    flex: 1,
  },

  // Profile skeleton
  profileContainer: {
    padding: 0,
  },
  profileCenter: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
  },
});
