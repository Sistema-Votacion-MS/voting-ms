import { Controller } from '@nestjs/common';
import { VotersService } from './voters.service';

@Controller()
export class VotersController {
  constructor(private readonly votersService: VotersService) {}
}
