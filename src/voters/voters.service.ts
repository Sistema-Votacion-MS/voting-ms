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
    this.logger.log(`[createVoter] Starting voter registration for user ${createVoterDto.user_id} in election ${createVoterDto.election_id}`);

    try {
      const { election_id, user_id } = createVoterDto;

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
