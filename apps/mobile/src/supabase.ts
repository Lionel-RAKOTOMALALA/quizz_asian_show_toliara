// Doit précéder l'import de supabase-js : React Native n'implémente pas
// complètement l'API `URL`, dont dépend le client.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

/**
 * Client utilisé uniquement pour le **temps réel** du 2e tour.
 *
 * Le reste de l'app passe par de simples `fetch` : le buzzer, lui, exige que
 * le verrouillage soit visible instantanément sur tous les téléphones. Un
 * sondage périodique laisserait un participant appuyer alors qu'un autre a
 * déjà pris la main.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    // Aucun compte côté participant : rien à conserver ni à rafraîchir.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
