import React, { useEffect, useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import AppText from '../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import {
  initConnection, endConnection, getProducts, requestPurchase,
  purchaseUpdatedListener, purchaseErrorListener, flushFailedPurchasesCachedAsPendingAndroid,
  type ProductPurchase, type PurchaseError, type Product,
} from 'react-native-iap';

const C = {
  primary: '#E8556D',
  primaryLight: '#FCEEF1',
  bg: '#FFF8F5',
  card: '#FFFFFF',
  text: '#2D2D2D',
  sub: '#777777',
  border: '#E0D5D0',
  gold: '#F9A825',
};

// Google Play Console에서 생성할 인앱 상품 ID
const PRODUCT_IDS = ['credit_3', 'credit_10', 'credit_30'];

// 상품 ID → 크레딧 수량 매핑
const CREDIT_MAP: Record<string, number> = {
  credit_3: 3,
  credit_10: 10,
  credit_30: 30,
};

// Google Play 연동 전 폴백 상품 정보
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

        // 미완료 구매 정리
        await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});

        // 상품 정보 조회
        const prods = await getProducts({ skus: PRODUCT_IDS });
        if (prods.length > 0) {
          setProducts(prods);
        }
      } catch (err) {
        console.warn('[IAP] 초기화 실패:', err);
        // Play Store 미설치 또는 에뮬레이터 → 폴백 모드
      }

      // 구매 완료 리스너
      purchaseUpdateSub = purchaseUpdatedListener(async (purchase: ProductPurchase) => {
        if (!purchase.transactionReceipt) return;

        try {
          // 서버에 구매 검증 요청
          const { default: api } = await import('../api/client');
          await api.post('/api/credits/verify-purchase', {
            productId: purchase.productId,
            purchaseToken: purchase.purchaseToken,
            packageName: purchase.packageNameAndroid,
          });

          // 구매 확인 (consume) — 소모성 상품이므로 필수
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

      // 구매 에러 리스너
      purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
        if (error.code !== 'E_USER_CANCELLED') {
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
      // IAP 미연결 시 테스트 모드
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
      await requestPurchase({ skus: [productId] });
    } catch (err: any) {
      if (err.code !== 'E_USER_CANCELLED') {
        Alert.alert('오류', '결제를 시작할 수 없습니다.');
      }
      setPurchasing(null);
    }
  };

  // IAP 상품 정보가 있으면 사용, 없으면 폴백
  const displayProducts = FALLBACK_PRODUCTS.map(fb => {
    const iapProduct = products.find(p => p.productId === fb.id);
    return {
      ...fb,
      price: iapProduct?.localizedPrice ?? fb.price,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* 현재 보유 크레딧 */}
        <View style={styles.balanceCard}>
          <AppText style={styles.balanceLabel}>보유 크레딧</AppText>
          <View style={styles.balanceRow}>
            <AppText style={styles.balanceIcon}>💎</AppText>
            <AppText style={styles.balanceValue}>{credits}</AppText>
            <AppText style={styles.balanceUnit}>개</AppText>
          </View>
        </View>

        {/* 크레딧 사용처 안내 */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <AppText style={styles.infoTitle}>크레딧으로 할 수 있는 것</AppText>
            <TouchableOpacity
              style={styles.infoNavBtn}
              onPress={() => nav.navigate('Profile' as never, { scrollTo: 'recommendations' } as never)}
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

        {/* 상품 목록 */}
        <AppText style={styles.sectionTitle}>크레딧 충전</AppText>

        <View pointerEvents={purchasing !== null ? 'none' : 'auto'} style={purchasing !== null ? styles.productListDisabled : undefined}>
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
                  {item.credits}개 {item.bonus ? <AppText style={styles.bonusText}>{item.bonus}</AppText> : null}
                </AppText>
                <AppText style={styles.productLabel}>{item.label}</AppText>
              </View>
            </View>
            <View style={styles.productRight}>
              {purchasing === item.id ? (
                <ActivityIndicator color={C.primary} />
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

        {/* 안내 */}
        <View style={styles.notice}>
          <AppText style={styles.noticeText}>
            * 결제는 Google Play를 통해 처리됩니다{'\n'}
            * 크레딧은 환불이 불가합니다{'\n'}
            * 문의: dasibom.help@gmail.com
          </AppText>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: '#FFF9E6', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#F9E09A',
  },
  balanceLabel: { fontSize: 14, color: '#7D5A00', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  balanceIcon: { fontSize: 28, width: 36, textAlign: 'center' as const },
  balanceValue: { fontSize: 48, fontWeight: '800', color: '#7D5A00' },
  balanceUnit: { fontSize: 20, color: '#7D5A00', fontWeight: '600' },

  infoCard: {
    backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 20,
    elevation: 1,
  },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: C.text },
  infoNavBtn: { backgroundColor: C.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  infoNavBtnText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  infoIcon: { fontSize: 18 },
  infoText: { fontSize: 14, color: C.sub },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginBottom: 12 },
  productListDisabled: { opacity: 0.5 },

  productCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: 14, padding: 18, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.border, elevation: 1,
  },
  productPopular: {
    borderColor: C.gold, borderWidth: 2, backgroundColor: '#FFFDF5',
  },
  popularBadge: {
    position: 'absolute', top: -10, right: 16,
    backgroundColor: C.gold, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  popularText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  productLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  productEmoji: { fontSize: 28 },
  productCredits: { fontSize: 18, fontWeight: '700', color: C.text },
  bonusText: { fontSize: 13, color: C.gold, fontWeight: '700' },
  productLabel: { fontSize: 13, color: C.sub, marginTop: 2 },
  productRight: { alignItems: 'flex-end' },
  priceBtn: {
    borderWidth: 1.5, borderColor: C.primary, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  priceBtnPopular: {
    backgroundColor: C.primary, borderColor: C.primary,
  },
  priceText: { fontSize: 15, fontWeight: '700', color: C.primary },
  priceTextPopular: { color: '#FFF' },

  notice: { marginTop: 20, padding: 16 },
  noticeText: { fontSize: 12, color: C.sub, lineHeight: 18 },
});
