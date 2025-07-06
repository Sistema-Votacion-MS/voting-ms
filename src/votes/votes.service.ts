import { HttpStatus, Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PrismaClient } from 'generated/prisma';
import { CreateVotesDto } from './dto/create-votes.dto';
import { VotersService } from 'src/voters/voters.service';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE, ELECTION_SERVICE } from 'src/config/services';

@Injectable()
export class VotesService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('VotesService');

  constructor(
    private readonly votersService: VotersService,
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    @Inject(ELECTION_SERVICE) private readonly electionClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async verifyCandidateExists(candidate_id: string): Promise<boolean> {
    this.logger.debug(`[verifyCandidateExists] Checking if candidate ${candidate_id} exists in election-ms`);

    try {
      await firstValueFrom(
        this.electionClient.send({ cmd: 'candidate_find_one' }, candidate_id)
      );
      this.logger.debug(`[verifyCandidateExists] Candidate ${candidate_id} exists in election-ms`);
      return true;
    } catch (error) {
      this.logger.warn(`[verifyCandidateExists] Candidate ${candidate_id} not found in election-ms:`, error);
      return false;
    }
  }

  async verifyUserExists(user_id: string): Promise<boolean> {
    this.logger.debug(`[verifyUserExists] Checking if user ${user_id} exists in users-ms`);

    try {
      await firstValueFrom(
        this.userClient.send({ cmd: 'user_find_one' }, { id: user_id })
      );
      this.logger.debug(`[verifyUserExists] User ${user_id} exists in users-ms`);
      return true;
    } catch (error) {
      this.logger.warn(`[verifyUserExists] User ${user_id} not found in users-ms:`, error);
      return false;
    }
  }

  async verifyElectionExists(election_id: string): Promise<boolean> {
    this.logger.debug(`[verifyElectionExists] Checking if election ${election_id} exists in election-ms`);

    try {
      await firstValueFrom(
        this.electionClient.send({ cmd: 'election_find_one' }, election_id)
      );
      this.logger.debug(`[verifyElectionExists] Election ${election_id} exists in election-ms`);
      return true;
    } catch (error) {
      this.logger.warn(`[verifyElectionExists] Election ${election_id} not found in election-ms:`, error);
      return false;
    }
  }

  async createVotes(createVotesDto: CreateVotesDto) {
    this.logger.log(`[createVotes] Starting vote creation for user ${createVotesDto.user_id} in election ${createVotesDto.election_id}`);

    try {
      const { election_id, candidate_id, user_id } = createVotesDto;

      // 1. Verificar que el usuario existe en users-ms
      this.logger.debug(`[createVotes] Verifying user ${user_id} exists in users-ms`);
      const userExists = await this.verifyUserExists(user_id);
      if (!userExists) {
        this.logger.warn(`[createVotes] User ${user_id} not found in users-ms`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `User ${user_id} not found`,
          error: 'User Not Found'
        });
      }

      // 2. Verificar que la elección existe en election-ms
      this.logger.debug(`[createVotes] Verifying election ${election_id} exists in election-ms`);
      const electionExists = await this.verifyElectionExists(election_id);
      if (!electionExists) {
        this.logger.warn(`[createVotes] Election ${election_id} not found in election-ms`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Election ${election_id} not found`,
          error: 'Election Not Found'
        });
      }

      // 3. Verificar que el candidato existe en election-ms
      this.logger.debug(`[createVotes] Verifying candidate ${candidate_id} exists in election-ms`);
      const candidateExists = await this.verifyCandidateExists(candidate_id);
      if (!candidateExists) {
        this.logger.warn(`[createVotes] Candidate ${candidate_id} not found in election-ms`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Candidate ${candidate_id} not found`,
          error: 'Candidate Not Found'
        });
      }

      // 4. Verificar si el usuario ya votó
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

      // 5. Crear el registro de votante
      this.logger.debug(`[createVotes] Creating voter record for user ${user_id}`);
      await this.votersService.createVoter({
        election_id: election_id,
        user_id: user_id,
      });

      // 6. Crear el voto
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
