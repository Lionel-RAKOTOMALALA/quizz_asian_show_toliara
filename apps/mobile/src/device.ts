import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'quizz.deviceId';

let cached: string | null = null;

/**
 * Identifiant stable de l'appareil, conservé entre deux lancements.
 *
 * Le serveur s'en sert de verrou : tant que cet appareil donne signe de vie,
 * aucun autre ne peut reprendre la session du même ticket. Il doit donc
 * survivre à un rechargement de l'application — sinon le participant se
 * verrouillerait lui-même en relançant l'app après un plantage.
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // Stockage indisponible : on retombe sur un identifiant de session.
  }

  const generated = `dev-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  try {
    await AsyncStorage.setItem(KEY, generated);
  } catch {
    // Sans persistance, l'identifiant ne vivra que le temps du lancement :
    // le verrou reste correct, il expirera simplement au bout du délai.
  }

  cached = generated;
  return generated;
}
