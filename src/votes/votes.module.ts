import { Module } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { VotersModule } from 'src/voters/voters.module';

@Module({
  imports: [VotersModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule { }
