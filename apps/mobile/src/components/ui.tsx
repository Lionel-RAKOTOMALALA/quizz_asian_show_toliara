import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { cardShadow, colors, radius, spacing } from '../theme';

/**
 * Fond dégradé rose -> pêche commun à tous les écrans. S'utilise en calque de
 * fond (sans enfants) ou comme conteneur.
 */
export function Screen({ children }: { children?: ReactNode }) {
  return (
    <LinearGradient colors={colors.bgGradient} style={StyleSheet.absoluteFill}>
      {children}
    </LinearGradient>
  );
}

/** Petite étiquette arrondie et bordée (« CONCOURS OFFICIEL · TOLIARA »). */
export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'green' | 'pink';
}) {
  const toneStyle =
    tone === 'green'
      ? { backgroundColor: colors.greenSoft, borderColor: 'transparent' }
      : tone === 'pink'
        ? { backgroundColor: '#FDECF3', borderColor: '#F6D3E2' }
        : { backgroundColor: 'rgba(255,255,255,0.7)', borderColor: colors.cardBorder };

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text
        style={[
          styles.pillText,
          tone === 'green' && { color: colors.green },
          tone === 'pink' && { color: colors.pinkDeep },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

/** Carte blanche arrondie avec ombre douce. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Libellé de section en petites capitales espacées. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/** Bouton principal à dégradé rose -> orange. Se grise quand il est inactif. */
export function GradientButton({
  label,
  onPress,
  disabled,
  loading,
  gradient = colors.ctaGradient,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  gradient?: readonly [string, string];
}) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.buttonWrap,
        pressed && !inactive && { transform: [{ scale: 0.985 }] },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive }}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, inactive && { opacity: 0.45 }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** Message d'erreur inline, ton doux pour ne pas dramatiser. */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(1.5),
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textSoft,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing(5),
    ...cardShadow,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  buttonWrap: { width: '100%' },
  button: {
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FDECEF',
    borderRadius: radius.md,
    padding: spacing(3.5),
    borderWidth: 1,
    borderColor: '#F6CFD8',
  },
  errorText: { color: '#B02A4A', fontSize: 13, lineHeight: 19 },
});
