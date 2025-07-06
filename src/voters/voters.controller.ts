import { Controller } from '@nestjs/common';
import { VotersService } from './voters.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateVoterDto } from './dto/create-voter.dto';

@Controller()
export class VotersController {
  constructor(private readonly votersService: VotersService) { }

  @MessagePattern({ cmd: 'voter_verify' })
  verifyVoter(@Payload() createVoterDto: CreateVoterDto) {
    return this.votersService.verifyVoter(createVoterDto.election_id, createVoterDto.user_id);
  }
}
