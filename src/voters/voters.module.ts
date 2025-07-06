import { Module } from '@nestjs/common';
import { VotersService } from './voters.service';
import { VotersController } from './voters.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ELECTION_SERVICE, USER_SERVICE } from 'src/config/services';
import { envs } from 'src/config/envs';

@Module({
  controllers: [VotersController],
  providers: [VotersService],
  exports: [VotersService],
  imports: [
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
  ]
})
export class VotersModule { }
