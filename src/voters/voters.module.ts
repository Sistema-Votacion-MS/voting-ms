import { Module } from '@nestjs/common';
import { VotersService } from './voters.service';
import { VotersController } from './voters.controller';

@Module({
  controllers: [VotersController],
  providers: [VotersService],
  exports: [VotersService],
})
export class VotersModule { }
