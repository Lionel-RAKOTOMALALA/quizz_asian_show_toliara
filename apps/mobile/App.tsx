import type { Category, LeaderboardEntry } from '@quizz/shared';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { ApiError, api, type ServedQuestion } from './src/api';
import { ErrorNote, Screen } from './src/components/ui';
import { BriefScreen } from './src/screens/BriefScreen';
import { CategoryScreen } from './src/screens/CategoryScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { TicketScreen } from './src/screens/TicketScreen';
import { spacing } from './src/theme';

type Step = 'ticket' | 'category' | 'brief' | 'quiz' | 'result';

/**
 * Nombre de questions annoncé sur les cartes de catégorie, aligné sur les
 * fichiers de données du serveur.
 */
const QUESTION_COUNTS: Record<Category, number> = { kpop: 100, anime: 200 };

export default function App() {
  const [step, setStep] = useState<Step>('ticket');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [ticket, setTicket] = useState('');
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('kpop');

  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<ServedQuestion[]>([]);
  const [secondsGlobal, setSecondsGlobal] = useState(300);

  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  /** File des réponses en vol : la progression ne doit jamais attendre le réseau. */
  const pending = useRef<Promise<unknown>>(Promise.resolve());

  const finish = useCallback(async () => {
    setBusy(true);
    try {
      // On attend que toutes les réponses en vol soient enregistrées avant de
      // lire le classement, sinon le score affiché serait incomplet.
      await pending.current;
      setLeaderboard(await api.leaderboard());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Classement indisponible.');
    } finally {
      setBusy(false);
      setStep('result');
    }
  }, []);

  const handleAnswer = useCallback(
    (q: ServedQuestion, chosenIndex: number | null, answerMs: number) => {
      const call = api
        .answer({ sessionId, questionId: q.id, chosenIndex, answerMs })
        .then((res) => {
          setScore(res.score);
          setAnswered(res.answered);
          if (res.finished) void finish();
          return res;
        })
        .catch((e: unknown) => {
          setError(
            e instanceof ApiError ? e.message : 'Réponse non enregistrée.',
          );
        });

      pending.current = pending.current.then(() => call);
    },
    [sessionId, finish],
  );

  /** Temps global écoulé : on clôt l'épreuve avec ce qui a été répondu. */
  const handleTimeout = useCallback(() => {
    void finish();
  }, [finish]);

  async function chooseCategory(chosen: Category) {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession({
        ticket,
        playerName: playerName ?? undefined,
        category: chosen,
      });
      setCategory(chosen);
      setSessionId(session.sessionId);
      setPlayerName(session.playerName);
      setSecondsGlobal(session.secondsGlobal);
      setStep('brief');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de démarrer.');
    } finally {
      setBusy(false);
    }
  }

  async function startQuiz() {
    setBusy(true);
    setError(null);
    try {
      const data = await api.startQuiz(sessionId);
      setQuestions(data.questions);
      setSecondsGlobal(data.secondsGlobal);
      setStep('quiz');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Questions indisponibles.');
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep('ticket');
    setError(null);
    setTicket('');
    setPlayerName(null);
    setSessionId('');
    setQuestions([]);
    setScore(0);
    setAnswered(0);
    setLeaderboard([]);
    pending.current = Promise.resolve();
  }

  return (
    <SafeAreaProvider>
      <Screen />
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />

        {error && (
          <View style={styles.error}>
            <ErrorNote>{error}</ErrorNote>
          </View>
        )}

        {step === 'ticket' && (
          <TicketScreen
            onContinue={({ ticket: t, playerName: name }) => {
              setTicket(t);
              setPlayerName(name ?? null);
              setError(null);
              setStep('category');
            }}
          />
        )}

        {step === 'category' && (
          <CategoryScreen
            ticket={ticket}
            counts={QUESTION_COUNTS}
            onChoose={(c) => void chooseCategory(c)}
            busy={busy}
          />
        )}

        {step === 'brief' && (
          <BriefScreen
            ticket={ticket}
            category={category}
            onStart={() => void startQuiz()}
            loading={busy}
          />
        )}

        {step === 'quiz' && (
          <QuizScreen
            questions={questions}
            secondsGlobal={secondsGlobal}
            onAnswer={handleAnswer}
            onTimeout={handleTimeout}
          />
        )}

        {step === 'result' && (
          <ResultScreen
            ticket={ticket}
            playerName={playerName}
            category={category}
            score={score}
            total={questions.length || 20}
            answered={answered}
            leaderboard={leaderboard}
            onRestart={restart}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  error: { paddingHorizontal: spacing(5), paddingBottom: spacing(2) },
});
