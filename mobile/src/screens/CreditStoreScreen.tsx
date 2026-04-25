import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import AppText from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import {
  initConnection, endConnection, fetchProducts, requestPurchase,
  purchaseUpdatedListener, purchaseErrorListener,
  ErrorCode,
  type Purchase, type PurchaseError, type Product,
} from 'react-native-iap';
import { colors, radius, spacing, typography } from '../theme';

const PRODUCT_IDS = ['credit_3', 'credit_10', 'credit_30'];

const CREDIT_MAP: Record<string, number> = {
  credit_3: 3,
  credit_10: 10,
  credit_30: 30,
};

const FALLBACK_PRODUCTS = [
  { id: 'credit_3',  credits: 3,  price: '₩1,100',  label: '맛보기',   popular: false, bonus: '' },
  { id: 'credit_10', credits: 10, price: '₩3,300',  label: '인기',     popular: true,  bonus: '+1 보너스' },
  { id: 'credit_30', credits: 30, price: '₩8,800',  label: '알뜰팩',   popular: false, bonus: '+5 보너스' },
];

export default function CreditStoreScreen() {
  const nav = useNavigation();
  const { credits, loadCredits } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [iapConnected, setIapConnected] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let purchaseUpdateSub: ReturnType<typeof purchaseUpdatedListener> | null = null;
    let purchaseErrorSub: ReturnType<typeof purchaseErrorListener> | null = null;

    const init = async () => {
      try {
        await initConnection();
        setIapConnected(true);

        const prods = await fetchProducts({ skus: PRODUCT_IDS, type: 'in-app' });
        if (prods && prods.length > 0) {
          setProducts(prods as Product[]);
        }
      } catch (err) {
        console.warn('[IAP] 초기화 실패:', err);
      }

      purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        if (!purchase.purchaseToken) return;

        try {
          const { default: api } = await import('../api/client');
          await api.post('/api/credits/verify-purchase', {
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
            packageName: (purchase as any).packageNameAndroid,
          });

          const { finishTransaction } = await import('react-native-iap');
          await finishTransaction({ purchase, isConsumable: true });

          await loadCredits();
          const amount = CREDIT_MAP[purchase.productId] ?? 0;
          Alert.alert('충전 완료!', `크레딧 ${amount}개가 충전되었습니다.`);
        } catch (err: any) {
          Alert.alert('오류', err?.message ?? '구매 처리 중 오류가 발생했습니다.');
        } finally {
          setPurchasing(null);
        }
      });

      purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
        if (error.code !== ErrorCode.UserCancelled) {
          Alert.alert('구매 오류', error.message ?? '결제 처리 중 문제가 발생했습니다.');
        }
        setPurchasing(null);
      });
    };

    init();

    return () => {
      purchaseUpdateSub?.remove();
      purchaseErrorSub?.remove();
      endConnection();
    };
  }, [loadCredits]);

  const handlePurchase = async (productId: string) => {
    if (!iapConnected) {
      Alert.alert(
        '테스트 모드',
        'Google Play Store 연결 전입니다.\n테스트로 크레딧을 충전할까요?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '테스트 충전',
            onPress: async () => {
              setPurchasing(productId);
              try {
                const { default: api } = await import('../api/client');
                const amount = CREDIT_MAP[productId] ?? 3;
                await api.post('/api/credits/add', { amount });
                await loadCredits();
                Alert.alert('충전 완료!', `크레딧 ${amount}개가 충전되었습니다.`);
              } catch {
                Alert.alert('오류', '충전 실패');
              } finally {
                setPurchasing(null);
              }
            },
          },
        ],
      );
      return;
    }

    setPurchasing(productId);
    try {
      await requestPurchase({
        request: {
          android: { skus: [productId] },
          ios: { sku: productId },
        },
        type: 'in-app',
      });
    } catch (err: any) {
      if (err?.code !== ErrorCode.UserCancelled) {
        Alert.alert('오류', '결제를 시작할 수 없습니다.');
      }
      setPurchasing(null);
    }
  };

  const displayProducts = FALLBACK_PRODUCTS.map(fb => {
    const iapProduct = products.find(p => p.id === fb.id);
    return {
      ...fb,
      price: iapProduct?.displayPrice ?? fb.price,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.balanceCard}>
          <AppText style={styles.balanceLabel}>보유 크레딧</AppText>
          <View style={styles.balanceRow}>
            <AppText style={styles.balanceIcon}>💎</AppText>
            <AppText style={styles.balanceValue}>{credits}</AppText>
            <AppText style={styles.balanceUnit}>개</AppText>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <AppText style={styles.infoTitle}>크레딧으로 할 수 있는 것</AppText>
            <TouchableOpacity
              style={styles.infoNavBtn}
              onPress={() => (nav as any).navigate('Profile', { scrollTo: 'recommendations' })}
            >
              <AppText style={styles.infoNavBtnText}>설정하기 →</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoIcon}>🔄</AppText>
            <AppText style={styles.infoText}>가치관 수정 (1개)</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoIcon}>👀</AppText>
            <AppText style={styles.infoText}>하루 추천 5명 추가 열람 (1개)</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoIcon}>🚫</AppText>
            <AppText style={styles.infoText}>필수 조건 슬롯 추가 (1개)</AppText>
          </View>
        </View>

        <AppText style={styles.sectionTitle}>크레딧 충전</AppText>

        <View
          pointerEvents={purchasing !== null ? 'none' : 'auto'}
          style={purchasing !== null ? styles.productListDisabled : undefined}
        >
          {displayProducts.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.productCard, item.popular && styles.productPopular]}
              onPress={() => handlePurchase(item.id)}
              disabled={purchasing !== null}
              activeOpacity={0.7}
            >
              {item.popular && (
                <View style={styles.popularBadge}>
                  <AppText style={styles.popularText}>BEST</AppText>
                </View>
              )}
              <View style={styles.productLeft}>
                <AppText style={styles.productEmoji}>💎</AppText>
                <View>
                  <AppText style={styles.productCredits}>
                    {item.credits}개
                    {item.bonus ? <AppText style={styles.bonusText}> {item.bonus}</AppText> : null}
                  </AppText>
                  <AppText style={styles.productLabel}>{item.label}</AppText>
                </View>
              </View>
              <View style={styles.productRight}>
                {purchasing === item.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={[styles.priceBtn, item.popular && styles.priceBtnPopular]}>
                    <AppText style={[styles.priceText, item.popular && styles.priceTextPopular]}>
                      {item.price}
                    </AppText>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notice}>
          <AppText style={styles.noticeText}>
            · 결제는 Google Play를 통해 처리됩니다{'\n'}
            · 크레딧은 환불이 불가합니다{'\n'}
            · 문의: dasibom.help@gmail.com
          </AppText>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  balanceCard: {
    backgroundColor: '#F6ECDA',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E4D4B2',
  },
  balanceLabel: {
    fontSize: typography.caption + 1,
    color: '#7D5A00',
    marginBottom: spacing.xs,
    fontWeight: typography.semibold,
  },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balanceIcon: { fontSize: 28, width: 36, textAlign: 'center' as const },
  balanceValue: {
    fontSize: 48,
    fontWeight: typography.bold,
    color: '#7D5A00',
  },
  balanceUnit: {
    fontSize: 20,
    color: '#7D5A00',
    fontWeight: typography.semibold,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontSize: typography.body - 1,
    fontWeight: typography.bold,
    color: colors.text,
  },
  infoNavBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  infoNavBtnText: {
    fontSize: typography.caption,
    color: colors.primaryDark,
    fontWeight: typography.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: 6,
  },
  infoIcon: { fontSize: 18 },
  infoText: {
    fontSize: typography.caption + 1,
    color: colors.sub,
  },

  sectionTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: typography.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  productListDisabled: { opacity: 0.5 },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md + 2,
    marginBottom: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  productPopular: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: '#FFFBF8',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 3,
  },
  popularText: {
    fontSize: typography.caption - 2,
    fontWeight: typography.bold,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  productEmoji: { fontSize: 28 },
  productCredits: {
    fontSize: typography.bodyLarge,
    fontWeight: typography.bold,
    color: colors.text,
  },
  bonusText: {
    fontSize: typography.caption + 1,
    color: colors.warn,
    fontWeight: typography.bold,
  },
  productLabel: {
    fontSize: typography.caption + 1,
    color: colors.sub,
    marginTop: 2,
  },
  productRight: { alignItems: 'flex-end' },
  priceBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.xs,
  },
  priceBtnPopular: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priceText: {
    fontSize: typography.body - 1,
    fontWeight: typography.bold,
    color: colors.primary,
  },
  priceTextPopular: { color: '#FFF' },

  notice: { marginTop: spacing.md + 4, padding: spacing.md },
  noticeText: {
    fontSize: typography.caption,
    color: colors.muted,
    lineHeight: typography.caption * typography.lineRelaxed,
  },
});
