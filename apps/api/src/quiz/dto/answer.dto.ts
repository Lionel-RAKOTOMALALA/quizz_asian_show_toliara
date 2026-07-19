import { QUIZ_CONFIG } from '@quizz/shared';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class AnswerDto {
  @IsString()
  sessionId!: string;

  @IsString()
  questionId!: string;

  /** Index choisi dans les propositions telles qu'affichées. `null` = temps écoulé. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(QUIZ_CONFIG.choicesPerQuestion - 1)
  chosenIndex!: number | null;

  /** Temps de réponse en millisecondes. */
  @IsInt()
  @Min(0)
  answerMs!: number;
}
