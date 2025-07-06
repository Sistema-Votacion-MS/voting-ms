import { Controller } from '@nestjs/common';
import { VotesService } from './votes.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateVotesDto } from './dto/create-votes.dto';

@Controller()
export class VotesController {
  constructor(private readonly votesService: VotesService) { }

  @MessagePattern({ cmd: 'votes_create' })
  create(@Payload() createUserDto: CreateVotesDto) {
    return this.votesService.createVotes(createUserDto);
  }

  @MessagePattern({ cmd: 'votes_find_all' })
  findAll() {
    return this.votesService.findAll();
  }

  @MessagePattern({ cmd: 'votes_find_one' })
  findOne(@Payload('id') id: string) {
    return this.votesService.findOne(id);
  }
}
