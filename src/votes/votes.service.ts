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

      const existing = await this.votersService.verifyVoter(election_id, user_id);

      if (existing) {
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `User ${user_id} has already voted in election ${election_id}`,
        });
      }

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

      this.logger.error('Error creating vote:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create vote. Please verify election and candidate exist and try again.',
        error: 'Vote Creation Failed'
      });
    }
  }

  async findAll() {
    try {
      this.logger.log('Fetching all votes');
      return await this.votes.findMany();
    } catch (error) {
      this.logger.error('Error fetching votes:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve votes. Please try again later.',
        error: 'Database Error'
      });
    }
  }

  async findOne(id: string) {
    try {
      const vote = await this.votes.findUnique({
        where: { id: id },
      });

      if (!vote) {
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Vote not found with id ${id}`,
          error: 'Vote Not Found'
        });
      }

      return vote;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error(`Error finding vote with id ${id}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve vote. Please verify the ID and try again.',
        error: 'Database Error'
      });
    }
  }
}
