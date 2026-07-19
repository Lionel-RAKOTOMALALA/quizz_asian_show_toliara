import type { Category } from '@quizz/shared';

/**
 * Messages de consolation affichés au participant non qualifié, dans l'univers
 * de la catégorie qu'il a choisie. Le ton est volontairement bienveillant : on
 * console, on ne se moque pas.
 */
const JOKES: Record<Category, string[]> = {
  anime: [
    "Ne t'inquiète pas : avec cette performance, tu deviendras sûrement le prochain Hokage. Naruto aussi a redoublé l'Académie trois fois.",
    "Ce n'est pas une défaite, c'est ton arc d'entraînement. Même Goku doit mourir une fois ou deux avant de devenir plus fort.",
    "Luffy cherche le One Piece depuis plus de 1000 épisodes. Tu as encore largement le temps.",
    "Considère ça comme le flashback de deux épisodes juste avant que ton vrai pouvoir ne se réveille.",
    "Zoro se perd absolument tout le temps et reste le meilleur épéiste du monde. Tu es sur la bonne voie.",
    "Ton Nen n'est simplement pas encore éveillé. Reviens après l'examen Hunter.",
    "Deku était sans Alter au début, et regarde-le maintenant. Ton One For All arrive.",
    "Saitama s'est entraîné trois ans pour devenir invincible. Toi, tu as eu une minute. Sois indulgent avec toi-même.",
    "Frieren a mis mille ans à comprendre les humains. Une minute pour vingt questions, c'était ambitieux.",
  ],
  kpop: [
    "Pas qualifié·e ? Tous les groupes passent par la période trainee. La tienne commence officiellement aujourd'hui.",
    "BTS a débuté dans un dortoir minuscule avant de remplir des stades. Ton comeback se prépare.",
    "Vois ça comme ton album pré-débuts. Le vrai débuts, c'est pour bientôt.",
    "Même les meilleurs idols ratent des notes en live. Ce qui compte, c'est le comeback.",
    "Pas de Daesang aujourd'hui, mais la catégorie Rookie of the Year est encore grande ouverte.",
    "Ton line distribution était clairement injuste. On demande une révision au producteur.",
    "Tu es en phase de teaser. Le MV officiel arrive, patience.",
    "BLACKPINK ne s'est pas construit en un jour — et YG a pris son temps, crois-moi.",
    "Ce n'était pas ton concept. Le prochain comeback te correspondra mieux.",
  ],
};

/**
 * Choisit une blague de façon **stable** pour un ticket donné : le message ne
 * doit pas changer à chaque rendu de l'écran de résultat.
 */
export function consolationJoke(category: Category, ticket: string): string {
  const pool = JOKES[category];

  let hash = 0;
  for (let i = 0; i < ticket.length; i++) {
    hash = (hash * 31 + ticket.charCodeAt(i)) >>> 0;
  }

  return pool[hash % pool.length];
}
