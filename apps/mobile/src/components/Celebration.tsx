import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

/**
 * Célébration affichée au participant qualifié : paillettes qui tombent et
 * feux d'artifice.
 *
 * Écrit avec l'API `Animated` de React Native plutôt qu'avec une bibliothèque
 * de confettis : aucune dépendance à installer, et tout passe par le pilote
 * natif (`useNativeDriver`), donc l'animation ne bloque pas le fil JS pendant
 * que l'écran charge le classement.
 */

const CONFETTI_COLORS = [
  '#E94E86',
  '#F0913F',
  '#45D48A',
  '#F5D142',
  '#7C6BF2',
  '#FFFFFF',
];

const CONFETTI_COUNT = 45;
const FIREWORK_COUNT = 4;
const SPARKS_PER_FIREWORK = 14;

export function Celebration() {
  const { width, height } = useWindowDimensions();

  return (
    // `pointerEvents="none"` : la célébration ne doit jamais intercepter un
    // appui destiné au contenu (bouton « Rejouer », défilement du classement).
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: FIREWORK_COUNT }).map((_, i) => (
        <Firework key={`fw-${i}`} index={i} width={width} height={height} />
      ))}
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <Confetto key={`c-${i}`} index={i} width={width} height={height} />
      ))}
    </View>
  );
}

/** Une paillette qui chute en tournoyant, puis recommence. */
function Confetto({
  index,
  width,
  height,
}: {
  index: number;
  width: number;
  height: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  // Figé au premier rendu : sans cela, chaque re-rendu redistribuerait les
  // paillettes et l'animation sauterait.
  const conf = useMemo(() => {
    const rand = seeded(index * 7919);
    return {
      startX: rand() * width,
      drift: (rand() - 0.5) * 120,
      size: 6 + rand() * 7,
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      duration: 2600 + rand() * 2600,
      delay: rand() * 2500,
      spin: rand() > 0.5 ? 1 : -1,
      thin: rand() > 0.5,
    };
  }, [index, width]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(conf.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: conf.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [conf, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, height + 40],
  });

  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, conf.drift, conf.drift * 0.4],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${conf.spin * 720}deg`],
  });

  // Disparaît juste avant de toucher le bas, pour éviter une coupure nette.
  const opacity = progress.interpolate({
    inputRange: [0, 0.08, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: conf.startX,
        top: 0,
        width: conf.thin ? conf.size * 0.45 : conf.size,
        height: conf.size,
        backgroundColor: conf.color,
        borderRadius: conf.thin ? 1 : conf.size / 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

/** Une gerbe d'étincelles qui explose puis retombe, en boucle. */
function Firework({
  index,
  width,
  height,
}: {
  index: number;
  width: number;
  height: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  const burst = useMemo(() => {
    const rand = seeded(index * 104729 + 13);
    return {
      x: width * (0.15 + rand() * 0.7),
      y: height * (0.12 + rand() * 0.3),
      color: CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      radius: 70 + rand() * 60,
      delay: index * 700 + rand() * 500,
    };
  }, [index, width, height]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(burst.delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(1400),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [burst, progress]);

  return (
    <View style={{ position: 'absolute', left: burst.x, top: burst.y }}>
      {Array.from({ length: SPARKS_PER_FIREWORK }).map((_, i) => {
        const angle = (i / SPARKS_PER_FIREWORK) * Math.PI * 2;

        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(angle) * burst.radius],
        });
        // Léger effet de gravité : les étincelles retombent en fin de course.
        const translateY = progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [
            0,
            Math.sin(angle) * burst.radius * 0.8,
            Math.sin(angle) * burst.radius + 26,
          ],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.15, 0.75, 1],
          outputRange: [0, 1, 0.8, 0],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.2, 1],
          outputRange: [0.4, 1, 0.35],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: burst.color,
              opacity,
              transform: [{ translateX }, { translateY }, { scale }],
            }}
          />
        );
      })}
    </View>
  );
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
