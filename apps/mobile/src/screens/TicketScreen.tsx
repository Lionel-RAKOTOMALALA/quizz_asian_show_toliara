import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GradientButton, Pill, SectionLabel } from '../components/ui';
import { colors, radius, spacing } from '../theme';

interface Props {
  onContinue: (input: { ticket: string; playerName?: string }) => void;
  /** Vérification du ticket en cours auprès du serveur. */
  busy?: boolean;
}

export function TicketScreen({ onContinue, busy }: Props) {
  const [ticket, setTicket] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const ticketInput = useRef<TextInput>(null);

  const ticketFilled = ticket.length === 4;
  const canContinue = ticketFilled && accepted;

  // Les 4 cases sont un seul TextInput masqué : on affiche les chiffres
  // au-dessus, ce qui garde le clavier natif et le collage fonctionnels.
  const digits = ticket.padEnd(4, '0').split('');

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pill>Concours officiel · Toliara</Pill>

        <Text style={styles.title}>
          Quiz <Text style={styles.titlePink}>K-pop</Text>
          <Text style={styles.titleDark}> &amp; </Text>
          <Text style={styles.titleOrange}>Anime</Text>
        </Text>
        <Text style={styles.subtitle}>
          Salle polyvalente 
        </Text>
      </View>

      <View style={styles.field}>
        <SectionLabel>Numéro de ticket</SectionLabel>
        <Pressable
          onPress={() => ticketInput.current?.focus()}
          style={styles.ticketBox}
          accessibilityRole="button"
          accessibilityLabel="Saisir le numéro de ticket"
        >
          <View style={styles.digits}>
            {digits.map((d, i) => (
              <Text
                key={i}
                style={[
                  styles.digit,
                  i >= ticket.length && styles.digitPlaceholder,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>
          <TextInput
            ref={ticketInput}
            value={ticket}
            onChangeText={(t) => setTicket(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            style={styles.hiddenInput}
            accessibilityLabel="Numéro de ticket, 4 chiffres"
          />
        </Pressable>
        <Text style={styles.helper}>
          Le numéro figure sur votre ticket physique remis par l'organisation
        </Text>
      </View>

      <View style={styles.field}>
        <SectionLabel>
          Pseudonyme <Text style={styles.optional}>(facultatif)</Text>
        </SectionLabel>
        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Votre nom de joueur"
          placeholderTextColor={colors.inputPlaceholder}
          maxLength={40}
          style={styles.nameInput}
        />
      </View>

      <Pressable
        style={styles.consent}
        onPress={() => setAccepted((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
          {accepted && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.consentText}>
          J'accepte les <Text style={styles.consentStrong}>règles et conditions</Text> de
          participation au concours (traitement du numéro de ticket et du
          pseudonyme pour le classement).
        </Text>
      </Pressable>

      <View style={styles.footer}>
        <GradientButton
          label="Continuer"
          disabled={!canContinue}
          loading={busy}
          onPress={() =>
            onContinue({
              ticket,
              playerName: playerName.trim() || undefined,
            })
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing(6) },
  header: { alignItems: 'center', marginTop: spacing(2) },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginTop: spacing(4),
    letterSpacing: -0.5,
  },
  titleDark: { color: colors.text },
  titlePink: { color: colors.pink },
  titleOrange: { color: colors.orange },
  subtitle: {
    marginTop: spacing(2),
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },

  field: { marginTop: spacing(7) },
  ticketBox: {
    marginTop: spacing(3),
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingVertical: spacing(6),
    justifyContent: 'center',
  },
  digits: { flexDirection: 'row', justifyContent: 'center', gap: spacing(5) },
  digit: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
  },
  digitPlaceholder: { color: colors.inputPlaceholder },
  // Champ réel : invisible mais focusable, superposé à l'affichage.
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
  },
  helper: {
    marginTop: spacing(2.5),
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },

  optional: { color: colors.textMuted, fontWeight: '600' },
  nameInput: {
    marginTop: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    height: 52,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },

  consent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(3),
    marginTop: spacing(7),
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.pink },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
  },
  consentStrong: { fontWeight: '700', color: colors.text },

  footer: { marginTop: 'auto', paddingBottom: spacing(4) },
});
