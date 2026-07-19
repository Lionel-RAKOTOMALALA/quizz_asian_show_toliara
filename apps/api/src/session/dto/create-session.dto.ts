import { CATEGORIES } from '@quizz/shared';
import type { Category } from '@quizz/shared';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateSessionDto {
  /** Numéro du ticket physique : exactement 4 chiffres (ex. 3208). */
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Le numéro de ticket doit comporter exactement 4 chiffres.',
  })
  ticket!: string;

  /** Pseudonyme facultatif — le ticket suffit à identifier le participant. */
  @IsOptional()
  @IsString()
  @Length(1, 40, { message: 'Le pseudonyme doit faire au plus 40 caractères.' })
  playerName?: string;

  @IsIn(CATEGORIES as readonly string[], {
    message: `La catégorie doit être : ${CATEGORIES.join(' ou ')}.`,
  })
  category!: Category;
}
