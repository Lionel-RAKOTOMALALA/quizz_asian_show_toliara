import { CATEGORY_LABELS } from '@quizz/shared';
import type { Category, LeaderboardEntry } from '@quizz/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, SectionLabel } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface Props {
  ticket: string;
  playerName: string | null;
  category: Category;
  score: number;
  total: number;
  answered: number;
  leaderboard: LeaderboardEntry[];
  onRestart: () => void;
}

export function ResultScreen({
  ticket,
  playerName,
  category,
  score,
  total,
  answered,
  leaderboard,
  onRestart,
}: Props) {
  const me = leaderboard.find((e) => e.ticket === ticket);
  const qualified = me?.qualified ?? false;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>
        Épreuve terminée · {answered}/{total} répondues
      </Text>

      <LinearGradient
        colors={colors.ctaGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.scoreDisc}
      >
        <Text style={styles.scoreValue}>{score}</Text>
        <Text style={styles.scoreTotal}>/{total}</Text>
      </LinearGradient>

      {qualified ? (
        <View style={styles.qualifiedPill}>
          <Text style={styles.qualifiedText}>Qualifié·e pour le 2e tour</Text>
        </View>
      ) : (
        <View style={styles.notQualifiedPill}>
          <Text style={styles.notQualifiedText}>Non qualifié·e</Text>
        </View>
      )}

      <Text style={styles.meta}>
        Ticket n° {ticket}
        {playerName ? ` · ${playerName}` : ''} ·{' '}
        {CATEGORY_LABELS[category].toUpperCase()}
        {me ? ` · ${me.rank}e sur ${leaderboard.length}` : ''}
      </Text>

      <Card style={styles.board}>
        <SectionLabel>Classement général</SectionLabel>

        <View style={styles.rows}>
          {leaderboard.map((entry) => {
            const isMe = entry.ticket === ticket;
            return (
              <View
                key={entry.ticket}
                style={[styles.row, isMe && styles.rowMe]}
              >
                <Text style={[styles.rank, isMe && styles.textMe]}>
                  {String(entry.rank).padStart(2, '0')}
                </Text>

                <View style={styles.rowMain}>
                  <Text style={[styles.name, isMe && styles.textMe]}>
                    {entry.playerName ?? `Ticket ${entry.ticket}`}
                    {isMe ? ' (vous)' : ''}
                  </Text>
                  <Text style={styles.rowSub}>
                    Ticket {entry.ticket} · {CATEGORY_LABELS[entry.category]}
                  </Text>
                </View>

                <Text style={[styles.rowScore, isMe && styles.textMe]}>
                  {entry.score}/{entry.total}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Text style={styles.footnote}>
        Scores calculés et horodatés par le serveur local (autorité de
        référence). Les qualifié·e·s sont appelé·e·s pour le 2e tour.
      </Text>

      <Pressable
        onPress={onRestart}
        style={styles.restart}
        accessibilityRole="button"
      >
        <Text style={styles.restartText}>Rejouer la démo</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
    alignItems: 'center',
  },

  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  scoreDisc: {
    marginTop: spacing(4),
    width: 116,
    height: 116,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreValue: { fontSize: 42, fontWeight: '800', color: '#FFFFFF' },
  scoreTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    marginTop: spacing(4),
  },

  qualifiedPill: {
    marginTop: spacing(4),
    backgroundColor: colors.green,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
  },
  qualifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  notQualifiedPill: {
    marginTop: spacing(4),
    backgroundColor: '#F1E4E9',
    borderRadius: radius.pill,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2.5),
  },
  notQualifiedText: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  meta: {
    marginTop: spacing(3),
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },

  board: { width: '100%', marginTop: spacing(5), padding: spacing(4) },
  rows: { marginTop: spacing(3) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(2),
    borderRadius: radius.sm,
  },
  rowMe: { backgroundColor: colors.highlight },
  rank: {
    width: 24,
    fontSize: 12,
    fontWeight: '800',
    color: colors.green,
    fontVariant: ['tabular-nums'],
  },
  rowMain: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  rowScore: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  textMe: { color: colors.orangeDeep },

  footnote: {
    marginTop: spacing(5),
    fontSize: 11,
    lineHeight: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },

  restart: {
    marginTop: spacing(5),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing(7),
    paddingVertical: spacing(3.5),
  },
  restartText: { fontSize: 14, fontWeight: '700', color: colors.textSoft },
});
