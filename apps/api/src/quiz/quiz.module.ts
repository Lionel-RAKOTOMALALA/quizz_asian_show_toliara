import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { QuestionsModule } from '../questions/questions.module';
import { SessionModule } from '../session/session.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [QuestionsModule, SessionModule, EventsModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
