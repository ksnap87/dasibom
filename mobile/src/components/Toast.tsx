import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ToastState {
  message: string;
  id: number;
}

let toastListener: ((msg: string) => void) | null = null;
let idCounter = 0;

export function showToast(message: string) {
  if (toastListener) {
    toastListener(message);
  }
}

export default function ToastContainer() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const show = useCallback((message: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const newId = ++idCounter;
    setToast({ message, id: newId });

    translateY.setValue(80);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(() => {
      hide();
    }, 2000);
  }, [translateY, opacity, hide]);

  useEffect(() => {
    toastListener = show;
    return () => {
      toastListener = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [show]);

  if (!toast) return null;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Text style={styles.text}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    backgroundColor: '#2D2D2D',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    maxWidth: '85%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
