import { Module } from '@nestjs/common';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [LeaderboardModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
