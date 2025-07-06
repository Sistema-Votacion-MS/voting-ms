import { Module } from '@nestjs/common';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { VotersModule } from 'src/voters/voters.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ELECTION_SERVICE, USER_SERVICE } from 'src/config/services';
import { envs } from 'src/config/envs';

@Module({
  imports: [
    VotersModule,
    ClientsModule.register([
      {
        name: USER_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers,
        },
      },
      {
        name: ELECTION_SERVICE,
        transport: Transport.NATS,
        options: {
          servers: envs.natsServers,
        },
      },
    ]),
  ],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule { }
