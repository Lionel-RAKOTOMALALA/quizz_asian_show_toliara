import { QUIZ_CONFIG } from '@quizz/shared';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Buzzer } from '../components/Buzzer';
import { Celebration } from '../components/Celebration';
import { Pill } from '../components/ui';
import { colors, radius, spacing } from '../theme';
import { useRound2 } from '../useRound2';

interface Props {
  ticket: string;
  onBack: () => void;
}

export function BuzzerScreen({ ticket, onBack }: Props) {
  const { state, connected, busy, buzz, mine, locked } = useRound2(ticket);

  // Pulsation lente tant que le buzzer est disponible : elle attire l'œil et
  // signale sans texte que l'appareil attend une action.
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (locked || mine) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [locked, mine, pulse]);

  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const status = mine
    ? { label: 'À toi de répondre !', tone: colors.green }
    : locked
      ? state.phase === 'revealed'
        ? { label: 'Photo révélée — buzzers fermés', tone: colors.orangeDeep }
        : { label: 'Quelqu\'un a buzzé avant toi', tone: colors.textMuted }
      : { label: 'Buzzer disponible', tone: colors.pink };

  return (
    <View style={styles.root}>
      {mine && <Celebration />}

      <View style={styles.header}>
        <Pill tone={mine ? 'green' : 'neutral'}>
          Image {state.imageIndex + 1} / {QUIZ_CONFIG.round2ImageCount}
        </Pill>

        <Text style={styles.title}>2e tour</Text>
        <Text style={[styles.status, { color: status.tone }]}>
          {status.label}
        </Text>
      </View>

      <View style={styles.center}>
        <Buzzer
          state={mine ? 'mine' : locked ? 'locked' : 'available'}
          label={mine ? 'À TOI !' : locked ? 'BLOQUÉ' : 'BUZZ'}
          onPress={() => void buzz()}
          disabled={locked || mine || busy}
        />

        <Text style={styles.hint}>
          {mine
            ? 'Annonce ta réponse à voix haute à l\'animateur.'
            : locked
              ? 'Attends la prochaine image ou une mauvaise réponse pour retenter.'
              : 'Appuie dès que tu reconnais la silhouette à l\'écran.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.connection}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? colors.green : colors.textMuted },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? 'Connecté' : 'Reconnexion…'}
          </Text>
        </View>

        <Pressable onPress={onBack} accessibilityRole="button">
          <Text style={styles.backText}>← Mon résultat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing(6) },
  header: { alignItems: 'center', marginTop: spacing(2) },
  title: {
    marginTop: spacing(4),
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  status: {
    marginTop: spacing(2),
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buzzerWrap: { borderRadius: radius.pill },
  buzzer: {
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // Ombre marquée : le buzzer doit paraître physique, enfonçable.
    shadowColor: '#8A2A50',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  buzzerLabel: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
  },
  hint: {
    marginTop: spacing(7),
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing(4),
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing(4),
  },
  connection: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  dot: { width: 7, height: 7, borderRadius: 4 },
  connectionText: { fontSize: 12, color: colors.textMuted },
  backText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
});
