import { Module } from '@nestjs/common';
import { VotesModule } from './votes/votes.module';
import { VotersModule } from './voters/voters.module';
@Module({
  imports: [VotesModule, VotersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
