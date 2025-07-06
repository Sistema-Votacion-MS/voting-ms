import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CreateVoterDto } from './dto/create-voter.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class VotersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('VotersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async createVoter(createVoterDto: CreateVoterDto) {
    try {
      const { election_id, user_id } = createVoterDto;

      const existing = await this.verifyVoter(election_id, user_id);

      if (existing) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `User ${user_id} has already voted in election ${election_id}`,
        });
      }

      return await this.voters.create({
        data: {
          election_id: election_id,
          user_id: user_id,
          has_voted: true,
        }
      });

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs',
      });
    }
  }

  async verifyVoter(election_id: string, user_id: string) {
    try {
      const voter = await this.voters.findFirst({
        where: {
          election_id: election_id,
          user_id: user_id,
          has_voted: true,
        }
      });

      if (!voter) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Voter not found for election ${election_id} and user ${user_id}`,
        });
      }

      return voter;
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs',
      });
    }
  }
}
