import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AnswerDto } from './dto/answer.dto';
import { AnswerResponse, QuizService, QuizStartResponse } from './quiz.service';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  /** Les 20 questions de la session, propositions mélangées, sans les réponses. */
  @Get('start')
  start(@Query('sessionId') sessionId: string): Promise<QuizStartResponse> {
    return this.quiz.start(sessionId);
  }

  @Post('answer')
  answer(@Body() dto: AnswerDto): Promise<AnswerResponse> {
    return this.quiz.answer(dto);
  }
}
