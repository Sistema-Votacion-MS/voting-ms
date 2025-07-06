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
    this.logger.log(`[createVotes] Starting vote creation for user ${createVotesDto.user_id} in election ${createVotesDto.election_id}`);

    try {
      const { election_id, candidate_id, user_id } = createVotesDto;

      this.logger.debug(`[createVotes] Verifying if user ${user_id} has already voted in election ${election_id}`);
      const existing = await this.votersService.verifyVoter(election_id, user_id);

      if (existing) {
        this.logger.warn(`[createVotes] Duplicate vote attempt detected - User ${user_id} already voted in election ${election_id}`);
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `User ${user_id} has already voted in election ${election_id}`,
          error: 'Vote Already Cast'
        });
      }

      this.logger.log(`[createVotes] Vote validation passed - User ${user_id} eligible to vote`);

      this.logger.debug(`[createVotes] Creating voter record for user ${user_id}`);
      await this.votersService.createVoter({
        election_id: election_id,
        user_id: user_id,
      });

      this.logger.debug(`[createVotes] Creating vote record for candidate ${candidate_id}`);
      const newVote = await this.votes.create({
        data: {
          election_id: election_id,
          candidate_id: candidate_id,
        }
      });

      this.logger.log(`[createVotes] Vote created successfully with ID: ${newVote.id} for user ${user_id}`);
      return newVote;

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error(`[createVotes] Error creating vote for user ${createVotesDto.user_id}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create vote. Please verify election and candidate exist and try again.',
        error: 'Vote Creation Failed'
      });
    }
  }

  async findAll() {
    this.logger.log('[findAll] Starting to fetch all votes');
    const startTime = Date.now();

    try {
      const votes = await this.votes.findMany();
      const duration = Date.now() - startTime;

      this.logger.log(`[findAll] Successfully fetched ${votes.length} votes in ${duration}ms`);
      return votes;
    } catch (error) {
      this.logger.error('[findAll] Error fetching votes:', error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve votes. Please try again later.',
        error: 'Database Error'
      });
    }
  }
  async findOne(id: string) {
    this.logger.log(`[findOne] Searching for vote with ID: ${id}`);

    try {
      this.logger.debug(`[findOne] Querying database for vote with ID: ${id}`);
      const vote = await this.votes.findUnique({
        where: { id: id },
      });

      if (!vote) {
        this.logger.warn(`[findOne] Vote not found with ID: ${id}`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Vote not found with id ${id}`,
          error: 'Vote Not Found'
        });
      }

      this.logger.log(`[findOne] Vote found successfully: ${vote.id}`);
      return vote;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error(`[findOne] Error finding vote with id ${id}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve vote. Please verify the ID and try again.',
        error: 'Database Error'
      });
    }
  }
}
