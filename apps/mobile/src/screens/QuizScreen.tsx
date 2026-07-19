import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ServedQuestion } from '../api';
import { cardShadow, colors, radius, spacing } from '../theme';

const LETTERS = ['A', 'B', 'C', 'D'];

interface Props {
  questions: ServedQuestion[];
  /** Temps restant au démarrage — inférieur au total si la partie reprend. */
  secondsGlobal: number;
  /** Enregistre une réponse. `null` = non répondue (temps écoulé). */
  onAnswer: (q: ServedQuestion, chosenIndex: number | null, answerMs: number) => void;
  /** Appelé quand le chrono global tombe à zéro. */
  onTimeout: () => void;
}

/** Formate un nombre de secondes en « 4 : 40 ». */
function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} : ${String(s).padStart(2, '0')}`;
}

export function QuizScreen({
  questions,
  secondsGlobal,
  onAnswer,
  onTimeout,
}: Props) {
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(secondsGlobal);
  const questionStart = useRef(Date.now());
  const timedOut = useRef(false);

  // Chrono global : un seul décompte pour tout le quiz.
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !timedOut.current) {
      timedOut.current = true;
      onTimeout();
    }
  }, [remaining, onTimeout]);

  // Remet à zéro le chronomètre par question à chaque changement.
  useEffect(() => {
    questionStart.current = Date.now();
  }, [index]);

  const question = questions[index];
  if (!question) return null;

  const answered = index;
  const left = questions.length - index;
  const progress = answered / questions.length;
  // Alerte sur le dernier quart du temps, quelle que soit la durée réglée :
  // un seuil fixe passerait en rouge à mi-parcours sur un chrono court.
  const low = remaining <= Math.max(5, Math.round(secondsGlobal * 0.25));

  function choose(choiceIndex: number) {
    onAnswer(question, choiceIndex, Date.now() - questionStart.current);
    // « 1 réponse = question suivante » : pas de retour en arrière.
    setIndex((i) => i + 1);
  }

  return (
    <View style={styles.root}>
      <View style={styles.clockBlock}>
        <Text style={[styles.clock, low && { color: colors.pink }]}>
          {formatClock(remaining)}
        </Text>
        <Text style={styles.clockLabel}>Temps restant</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaLeft}>
          Question {index + 1}/{questions.length}
        </Text>
        <Text style={styles.metaRight}>{left} restantes</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.promptCard}>
          <Text style={styles.prompt}>{question.prompt}</Text>
        </View>

        <View style={styles.choices}>
          {question.choices.map((choice, i) => (
            <Pressable
              key={`${question.id}-${i}`}
              onPress={() => choose(i)}
              style={({ pressed }) => [
                styles.choice,
                pressed && { backgroundColor: '#FFF6EE' },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Réponse ${LETTERS[i]} : ${choice}`}
            >
              <View style={styles.letterBadge}>
                <Text style={styles.letter}>{LETTERS[i]}</Text>
              </View>
              <Text style={styles.choiceText}>{choice}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing(5) },

  clockBlock: { alignItems: 'center', marginTop: spacing(2) },
  clock: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  clockLabel: {
    marginTop: spacing(1),
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing(5),
  },
  metaLeft: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.orange,
    textTransform: 'uppercase',
  },
  metaRight: { fontSize: 12, color: colors.textMuted },

  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: '#F6E2E8',
    marginTop: spacing(2),
    overflow: 'hidden',
  },
  fill: { height: 4, borderRadius: radius.pill, backgroundColor: colors.orange },

  scroll: { flex: 1, marginTop: spacing(5) },
  scrollContent: { paddingBottom: spacing(8) },

  promptCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing(5),
    ...cardShadow,
  },
  prompt: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 25,
  },

  choices: { marginTop: spacing(4), gap: spacing(3) },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    ...cardShadow,
  },
  letterBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FDEEDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 13, fontWeight: '800', color: colors.orangeDeep },
  choiceText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
});
