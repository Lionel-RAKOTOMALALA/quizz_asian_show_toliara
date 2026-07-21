import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { radius } from '../theme';

export type BuzzerState = 'available' | 'mine' | 'locked';

interface Props {
  state: BuzzerState;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

const SIZE = 230;
/** Hauteur du socle visible sous le capuchon : c'est elle qui donne le relief. */
const DEPTH = 14;

const SKINS: Record<
  BuzzerState,
  { cap: readonly [string, string]; base: string; rim: string; text: string }
> = {
  available: {
    cap: ['#FF6B84', '#C4103C'],
    base: '#7A0A26',
    rim: '#FF93A6',
    text: '#FFFFFF',
  },
  mine: {
    cap: ['#4BE08F', '#0B7A44'],
    base: '#054A28',
    rim: '#8CF3BC',
    text: '#FFFFFF',
  },
  locked: {
    cap: ['#CFC0C6', '#9A8891'],
    base: '#6B5A62',
    rim: '#E2D5DA',
    text: '#FFFFFF',
  },
};

/**
 * Buzzer de jeu télévisé.
 *
 * Le relief est obtenu par superposition : un socle sombre fixe, un capuchon
 * décalé vers le haut qui s'y enfonce à l'appui, et un reflet elliptique qui
 * simule la courbure. `expo-linear-gradient` ne propose pas de dégradé radial,
 * d'où ce montage plutôt qu'un simple cercle dégradé.
 */
export function Buzzer({ state, label, onPress, disabled }: Props) {
  const skin = SKINS[state];

  /** 0 = relâché (capuchon haut), 1 = enfoncé. */
  const press = useRef(new Animated.Value(0)).current;
  /** Respiration lente quand le buzzer attend un appui. */
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== 'available') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [state, pulse]);

  function animateTo(value: number) {
    Animated.timing(press, {
      toValue: value,
      duration: value === 1 ? 70 : 160,
      easing: value === 1 ? Easing.out(Easing.quad) : Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  }

  const capTranslate = press.interpolate({
    inputRange: [0, 1],
    outputRange: [-DEPTH, 0],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });

  // L'ombre portée se resserre à l'enfoncement : le capuchon se rapproche
  // du socle, donc l'ombre rétrécit.
  const shadowRadius = press.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 7],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animateTo(1)}
        onPressOut={() => animateTo(0)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
      >
        {/* Socle : reste immobile, c'est lui qui matérialise la profondeur. */}
        <View style={[styles.base, { backgroundColor: skin.base }]}>
          <Animated.View
            style={[
              styles.capShadow,
              {
                shadowRadius,
                transform: [{ translateY: capTranslate }],
              },
            ]}
          >
            <LinearGradient
              colors={skin.cap}
              start={{ x: 0.25, y: 0 }}
              end={{ x: 0.75, y: 1 }}
              style={styles.cap}
            >
              {/* Liseré clair sur le bord supérieur : arête éclairée. */}
              <View style={[styles.rim, { borderTopColor: skin.rim }]} />

              {/* Reflet elliptique : suggère une surface bombée. */}
              <View style={styles.gloss} />

              <Text style={[styles.label, { color: skin.text }]}>{label}</Text>
            </LinearGradient>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: SIZE + 26,
    height: SIZE + 26 + DEPTH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 13,
    // Ombre du socle posé au sol.
    shadowColor: '#2A0A16',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  capShadow: {
    borderRadius: radius.pill,
    shadowColor: '#3A0011',
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cap: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SIZE / 2,
    borderTopWidth: 2,
    borderTopLeftRadius: SIZE / 2,
    borderTopRightRadius: SIZE / 2,
    opacity: 0.55,
  },
  gloss: {
    position: 'absolute',
    top: SIZE * 0.09,
    width: SIZE * 0.62,
    height: SIZE * 0.3,
    borderRadius: SIZE * 0.31,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  label: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    // Texte gravé : ombre portée sombre sous le lettrage.
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
