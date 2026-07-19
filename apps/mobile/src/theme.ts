/**
 * Jetons de design relevés sur la maquette (édition Toliara).
 * Le mobile est en thème clair : fond dégradé rose -> pêche, cartes blanches.
 */
export const colors = {
  /** Dégradé de fond de l'application, du haut vers le bas. */
  bgGradient: ['#FCE9EE', '#FDF3EA'] as const,

  pink: '#E94E86',
  pinkDeep: '#C4306A',
  orange: '#F0913F',
  orangeDeep: '#B4671F',

  /** Dégradé des boutons principaux et du disque de score. */
  ctaGradient: ['#EC5A8D', '#F0913F'] as const,
  /** Dégradé orange du bouton « Commencer l'épreuve ». */
  orangeGradient: ['#F2A24A', '#EC8A3C'] as const,
  /** Dégradé de la carte K-pop. */
  kpopCard: ['#F4B4D0', '#EE9CC0'] as const,
  /** Dégradé de la carte Anime. */
  animeCard: ['#FAD3A9', '#F7C08E'] as const,

  text: '#33212A',
  textSoft: '#6B5560',
  textMuted: '#A78E97',

  card: '#FFFFFF',
  cardBorder: '#F2E2E7',
  /** Fond de la ligne « vous » dans le classement. */
  highlight: '#FDEBD9',

  green: '#159A5B',
  greenSoft: '#E3F5EB',

  /** Encadré en tirets de la saisie du ticket. */
  dashed: '#F0C6D5',
  inputPlaceholder: '#DFC8D1',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = (n: number): number => n * 4;

/** Ombre douce et diffuse des cartes blanches. */
export const cardShadow = {
  shadowColor: '#8A5A6B',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;
