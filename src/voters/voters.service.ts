import { HttpStatus, Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import { CreateVoterDto } from './dto/create-voter.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE, ELECTION_SERVICE } from 'src/config/services';

@Injectable()
export class VotersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('VotersService');

  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    @Inject(ELECTION_SERVICE) private readonly electionClient: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
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

  async createVoter(createVoterDto: CreateVoterDto) {
    this.logger.log(`[createVoter] Starting voter registration for user ${createVoterDto.user_id} in election ${createVoterDto.election_id}`);

    try {
      const { election_id, user_id } = createVoterDto;

      // 1. Verificar que el usuario existe en users-ms
      this.logger.debug(`[createVoter] Verifying user ${user_id} exists in users-ms`);
      const userExists = await this.verifyUserExists(user_id);
      if (!userExists) {
        this.logger.warn(`[createVoter] User ${user_id} not found in users-ms`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `User ${user_id} not found`,
          error: 'User Not Found'
        });
      }

      // 2. Verificar que la elección existe en election-ms
      this.logger.debug(`[createVoter] Verifying election ${election_id} exists in election-ms`);
      const electionExists = await this.verifyElectionExists(election_id);
      if (!electionExists) {
        this.logger.warn(`[createVoter] Election ${election_id} not found in election-ms`);
        throw new RpcException({
          status: HttpStatus.NOT_FOUND,
          message: `Election ${election_id} not found`,
          error: 'Election Not Found'
        });
      }

      // 3. Verificar si el usuario ya votó
      this.logger.debug(`[createVoter] Checking if user ${user_id} has already voted in election ${election_id}`);
      const existing = await this.verifyVoter(election_id, user_id);

      if (existing) {
        this.logger.warn(`[createVoter] Duplicate vote attempt detected - User ${user_id} already voted in election ${election_id}`);
        throw new RpcException({
          status: HttpStatus.CONFLICT,
          message: `User ${user_id} has already voted in election ${election_id}`,
          error: 'Vote Already Cast'
        });
      }

      // 4. Crear el registro de votante
      this.logger.debug(`[createVoter] Creating voter record with has_voted: true`);
      const newVoter = await this.voters.create({
        data: {
          election_id: election_id,
          user_id: user_id,
          has_voted: true,
        }
      });

      this.logger.log(`[createVoter] Voter registered successfully with ID: ${newVoter.id}`);
      return newVoter;

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error(`[createVoter] Error creating voter record for user ${createVoterDto.user_id}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to register voter. Please verify election exists and try again.',
        error: 'Voter Registration Failed'
      });
    }
  }

  async verifyVoter(election_id: string, user_id: string) {
    this.logger.debug(`[verifyVoter] Checking if user ${user_id} has already voted in election ${election_id}`);

    try {
      const voter = await this.voters.findFirst({
        where: {
          election_id: election_id,
          user_id: user_id,
          has_voted: true,
        }
      });

      if (voter) {
        this.logger.debug(`[verifyVoter] Found existing vote record for user ${user_id} in election ${election_id}`);
        return voter;
      }

      this.logger.debug(`[verifyVoter] No existing vote found - User ${user_id} eligible to vote in election ${election_id}`);
      return null;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }

      this.logger.error(`[verifyVoter] Error verifying voter for election ${election_id} and user ${user_id}:`, error);
      throw new RpcException({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to verify voter status. Please try again.',
        error: 'Voter Verification Failed'
      });
    }
  }
}
