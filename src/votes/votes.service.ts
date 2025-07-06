import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { PrismaClient } from 'generated/prisma';
import { CreateVotesDto } from './dto/create-votes.dto';
import { VotersService } from 'src/voters/voters.service';

@Injectable()
export class VotesService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('VotesService');

  constructor(private readonly votersService: VotersService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async createVotes(createVotesDto: CreateVotesDto) {
    try {
      const { election_id, candidate_id, user_id } = createVotesDto;

      await this.votersService.verifyVoter(election_id, user_id);
      await this.votersService.createVoter({
        election_id: election_id,
        user_id: user_id,
      });

      return await this.votes.create({
        data: {
          election_id: election_id,
          candidate_id: candidate_id,
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

  async findAll() {
    try {
      this.logger.log('Fetching all votes');
      return await this.votes.findMany();
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Check logs',
      });
    }
  }

  async findOne(id: string) {
    try {
      const voter = await this.votes.findUnique({
        where: { id: id },
      });

      if (!voter) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Voter not found with id ${id}`,
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
