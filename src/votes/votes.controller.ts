import { Controller } from '@nestjs/common';
import { VotesService } from './votes.service';

@Controller()
export class VotesController {
  constructor(private readonly votesService: VotesService) {}
}
