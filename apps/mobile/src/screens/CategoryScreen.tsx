import type { Category } from '@quizz/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pill } from '../components/ui';
import { cardShadow, colors, radius, spacing } from '../theme';

interface Props {
  ticket: string;
  /** Nombre de questions réellement disponibles, par catégorie. */
  counts: Record<Category, number>;
  onChoose: (category: Category) => void;
  busy?: boolean;
}

export function CategoryScreen({ ticket, counts, onChoose, busy }: Props) {
  return (
    <View style={styles.root}>
      <Pill>Ticket n° {ticket}</Pill>

      <Text style={styles.title}>Choisissez votre catégorie</Text>
      <Text style={styles.subtitle}>
        Ce choix détermine vos 20 questions. Il est définitif.
      </Text>

      <View style={styles.cards}>
        <CategoryCard
          label="K-pop"
          gradient={colors.kpopCard}
          textColor={colors.pinkDeep}
          caption={`${counts.kpop} questions · idols, groupes, hits`}
          onPress={() => onChoose('kpop')}
          disabled={busy}
        />
        <CategoryCard
          label="Anime"
          gradient={colors.animeCard}
          textColor={colors.orangeDeep}
          caption={`${counts.anime} questions · séries, personnages, studios`}
          onPress={() => onChoose('anime')}
          disabled={busy}
        />
      </View>
    </View>
  );
}

function CategoryCard({
  label,
  caption,
  gradient,
  textColor,
  onPress,
  disabled,
}: {
  label: string;
  caption: string;
  gradient: readonly [string, string];
  textColor: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.cardWrap,
        pressed && !disabled && { transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.6 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Catégorie ${label}. ${caption}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Cercles décoratifs en haut à droite, comme sur la maquette. */}
        <View style={[styles.blob, styles.blobLarge]} />
        <View style={[styles.blob, styles.blobSmall]} />

        <View style={styles.cardContent}>
          <Text style={[styles.cardLabel, { color: textColor }]}>{label}</Text>
          <Text style={[styles.cardCaption, { color: textColor }]}>
            {caption}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing(6), alignItems: 'center' },
  title: {
    marginTop: spacing(5),
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: spacing(2),
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  cards: { width: '100%', flex: 1, marginTop: spacing(7), gap: spacing(5) },
  cardWrap: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing(6),
    justifyContent: 'flex-end',
    overflow: 'hidden',
    ...cardShadow,
  },
  cardContent: { gap: spacing(2) },
  cardLabel: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  cardCaption: { fontSize: 12, opacity: 0.75, fontWeight: '600' },

  blob: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: radius.pill,
  },
  blobLarge: { width: 150, height: 150, top: -50, right: -40 },
  blobSmall: { width: 70, height: 70, top: 60, right: 30 },
});
