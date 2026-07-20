import { QUIZ_CONFIG } from '@quizz/shared';
import type { LeaderboardEntry } from '@quizz/shared';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Celebration } from '../components/Celebration';
import { Card, GradientButton, SectionLabel } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface Props {
  ticket: string;
  rank: number;
  finalists: LeaderboardEntry[];
  onBack: () => void;
  /** Ouvre le buzzer pour l'épreuve de reconnaissance. */
  onOpenBuzzer: () => void;
}

/**
 * Consignes du 2e tour pour un participant qualifié.
 *
 * L'épreuve elle-même se déroule sur l'écran de projection : le téléphone ne
 * sert qu'à préparer le participant et à lui rappeler son numéro de ticket,
 * avec lequel il sera appelé.
 */
export function Round2Screen({
  ticket,
  rank,
  finalists,
  onBack,
  onOpenBuzzer,
}: Props) {
  const steps: Array<[string, string]> = [
    ['1', 'Une silhouette noire s\'affiche sur grand écran.'],
    ['2', 'Le premier qui reconnaît l\'idole ou le personnage lève la main.'],
    ['3', 'La photo est révélée : point accordé si la réponse est bonne.'],
  ];

  return (
    <View style={styles.root}>
      <Celebration />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Qualifié·e · {rank}e place</Text>
        </View>

        <Text style={styles.title}>2e tour</Text>
        <Text style={styles.subtitle}>Reconnaissance d&apos;images</Text>

        <View style={styles.ticketBox}>
          <Text style={styles.ticketLabel}>Tu seras appelé·e avec ce numéro</Text>
          <Text style={styles.ticketValue}>{ticket}</Text>
        </View>

        <Card style={styles.card}>
          <SectionLabel>
            Comment ça se passe · {QUIZ_CONFIG.round2ImageCount} images
          </SectionLabel>

          <View style={styles.steps}>
            {steps.map(([n, text]) => (
              <View key={n} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{n}</Text>
                </View>
                <Text style={styles.stepText}>{text}</Text>
              </View>
            ))}
          </View>
        </Card>

        {finalists.length > 0 && (
          <Card style={styles.card}>
            <SectionLabel>Tes adversaires</SectionLabel>
            <View style={styles.rivals}>
              {finalists.map((f) => {
                const isMe = f.ticket === ticket;
                return (
                  <View
                    key={f.ticket}
                    style={[styles.rival, isMe && styles.rivalMe]}
                  >
                    <Text
                      style={[styles.rivalName, isMe && styles.rivalNameMe]}
                    >
                      {f.playerName ?? `Ticket ${f.ticket}`}
                      {isMe ? ' (toi)' : ''}
                    </Text>
                    <Text style={styles.rivalScore}>
                      {f.score}/{f.total}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        <Text style={styles.note}>
          Rends-toi près de la scène et garde ton ticket physique sur toi.
        </Text>

        <View style={styles.cta}>
          <GradientButton
            label="Demarrer →"
            onPress={onOpenBuzzer}
            gradient={[colors.green, '#0F7C48']}
          />
        </View>

        <Pressable
          onPress={onBack}
          style={styles.back}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Revoir mon résultat</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
    alignItems: 'center',
  },

  badge: {
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  title: {
    marginTop: spacing(5),
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: spacing(1),
    fontSize: 14,
    color: colors.textMuted,
  },

  ticketBox: {
    marginTop: spacing(6),
    alignItems: 'center',
    alignSelf: 'stretch',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingVertical: spacing(5),
  },
  ticketLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  ticketValue: {
    marginTop: spacing(2),
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 6,
  },

  card: { alignSelf: 'stretch', marginTop: spacing(5), padding: spacing(4) },

  steps: { marginTop: spacing(3), gap: spacing(3.5) },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FDEEDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.orangeDeep,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSoft,
  },

  rivals: { marginTop: spacing(3), gap: spacing(2) },
  rival: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderRadius: radius.sm,
  },
  rivalMe: { backgroundColor: colors.greenSoft },
  rivalName: { fontSize: 14, fontWeight: '700', color: colors.text },
  rivalNameMe: { color: colors.green },
  rivalScore: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
  },

  note: {
    marginTop: spacing(5),
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },

  cta: { alignSelf: 'stretch', marginTop: spacing(6) },
  back: {
    marginTop: spacing(5),
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(3),
  },
  backText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
});
