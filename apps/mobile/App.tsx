import type { Category, LeaderboardEntry } from '@quizz/shared';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  ApiError,
  api,
  type ServedQuestion,
  type SessionResponse,
} from './src/api';
import { getDeviceId } from './src/device';
import { ErrorNote, Screen } from './src/components/ui';
import { BriefScreen } from './src/screens/BriefScreen';
import { CategoryScreen } from './src/screens/CategoryScreen';
import { QuizScreen } from './src/screens/QuizScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { Round2Screen } from './src/screens/Round2Screen';
import { TicketScreen } from './src/screens/TicketScreen';
import { spacing } from './src/theme';

type Step = 'ticket' | 'category' | 'brief' | 'quiz' | 'result' | 'round2';

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
        deviceId: await getDeviceId(),
      });
      applySession(session);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Impossible de démarrer.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Vérifie le ticket dès sa saisie, avant même de demander la catégorie.
   *
   * C'est le serveur qui décide de la destination : lui seul sait si le ticket
   * existe, s'il a déjà servi, et où le participant s'était arrêté.
   */
  async function checkTicket(code: string, name?: string) {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createSession({
        ticket: code,
        playerName: name,
        deviceId: await getDeviceId(),
      });

      setTicket(code);
      setPlayerName(name ?? null);

      if (session.status === 'needs_category') {
        setStep('category');
        return;
      }

      applySession(session);
    } catch (e) {
      // Ticket inconnu (404) ou déjà pris sur un autre appareil (409) :
      // le message du serveur est affichable tel quel.
      setError(e instanceof ApiError ? e.message : 'Vérification impossible.');
    } finally {
      setBusy(false);
    }
  }

  /** Route le participant selon l'état réel de sa partie côté serveur. */
  function applySession(session: SessionResponse) {
    setCategory(session.category);
    setSessionId(session.sessionId);
    setPlayerName(session.playerName);
    setSecondsGlobal(session.secondsGlobal);
    setScore(session.score);
    setAnswered(session.answered);

    if (session.finished) {
      // Épreuve déjà terminée : on va droit au résultat, sans rejouer.
      void showResults(session.sessionId);
      return;
    }

    setStep(session.resumed ? 'quiz' : 'brief');
    if (session.resumed) void startQuiz(session.sessionId);
  }

  async function showResults(id: string) {
    setBusy(true);
    try {
      const data = await api.startQuiz(id);
      setQuestions(data.questions);
      setLeaderboard(await api.leaderboard());
    } catch {
      // Le classement peut manquer : le score affiché reste correct.
    } finally {
      setBusy(false);
      setStep('result');
    }
  }

  async function startQuiz(id = sessionId) {
    setBusy(true);
    setError(null);
    try {
      const data = await api.startQuiz(id);

      // À la reprise, on retire les questions déjà traitées : le participant
      // ne doit ni les revoir ni pouvoir y répondre deux fois.
      const alreadyAnswered = new Set(data.answeredIds);
      const remaining = data.questions.filter((q) => !alreadyAnswered.has(q.id));

      setQuestions(remaining);
      // Chrono déjà entamé : on repart du temps réellement restant.
      setSecondsGlobal(data.secondsRemaining);

      if (remaining.length === 0 || data.secondsRemaining <= 0) {
        void showResults(id);
        return;
      }

      setStep('quiz');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Questions indisponibles.');
    } finally {
      setBusy(false);
    }
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
            busy={busy}
            onContinue={({ ticket: t, playerName: name }) =>
              void checkTicket(t, name)
            }
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
            onNextRound={() => setStep('round2')}
          />
        )}

        {step === 'round2' && (
          <Round2Screen
            ticket={ticket}
            rank={leaderboard.find((e) => e.ticket === ticket)?.rank ?? 0}
            finalists={leaderboard.filter((e) => e.qualified)}
            onBack={() => setStep('result')}
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
