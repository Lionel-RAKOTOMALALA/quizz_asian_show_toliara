import { CATEGORY_LABELS, QUIZ_CONFIG } from '@quizz/shared';
import type { Category } from '@quizz/shared';
import { StyleSheet, Text, View } from 'react-native';
import { Card, GradientButton, Pill } from '../components/ui';
import { colors, spacing } from '../theme';

interface Props {
  ticket: string;
  category: Category;
  onStart: () => void;
  loading?: boolean;
}

export function BriefScreen({ ticket, category, onStart, loading }: Props) {
  const minutes = Math.round(QUIZ_CONFIG.secondsGlobal / 60);

  const rows: Array<[string, string]> = [
    ['Questions', `${QUIZ_CONFIG.questionsPerSession}, tirées au hasard`],
    ['Temps imparti', `${minutes} min pour tout le quiz`],
    ['Validation', '1 réponse = question suivante'],
    [
      'Qualification',
      `${QUIZ_CONFIG.questionsPerSession}/${QUIZ_CONFIG.questionsPerSession} ou top ${QUIZ_CONFIG.qualifiedCount}`,
    ],
  ];

  return (
    <View style={styles.root}>
      <Pill>Catégorie {CATEGORY_LABELS[category]}</Pill>

      <Text style={styles.title}>Prêt·e, ticket n° {ticket} ?</Text>

      <Card style={styles.card}>
        {rows.map(([label, value], i) => (
          <View
            key={label}
            style={[styles.row, i > 0 && styles.rowDivider]}
          >
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </Card>

      <Text style={styles.helper}>
        Vos questions sont téléchargées sur cet appareil : une coupure Wi-Fi
        n'interrompra pas votre épreuve.
      </Text>

      <View style={styles.footer}>
        <GradientButton
          label="Commencer l'épreuve"
          onPress={onStart}
          loading={loading}
          gradient={colors.orangeGradient}
        />
        <Text style={styles.footerNote}>
          Le chronomètre démarre immédiatement
        </Text>
      </View>
    </View>
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
  card: { width: '100%', marginTop: spacing(7), paddingVertical: spacing(2) },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(4),
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  rowLabel: { fontSize: 14, color: colors.orangeDeep, fontWeight: '600' },
  rowValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  helper: {
    marginTop: spacing(5),
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: { marginTop: 'auto', width: '100%', paddingBottom: spacing(4) },
  footerNote: {
    marginTop: spacing(3),
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
