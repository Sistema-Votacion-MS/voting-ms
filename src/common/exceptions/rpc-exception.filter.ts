import { Catch, ExceptionFilter, ArgumentsHost, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('RpcExceptionFilter');

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    this.logger.error('Exception caught in Voting-MS:', exception);

    // Si ya es una RpcException, la devolvemos tal como está
    if (exception instanceof RpcException) {
      return throwError(() => exception.getError());
    }

    // Si es un error de Prisma
    if (exception.code) {
      return throwError(() => this.handlePrismaError(exception));
    }

    // Si es un error de validación de NestJS
    if (exception.response && exception.status) {
      return throwError(() => ({
        status: exception.status,
        message: exception.response.message || exception.message,
        error: exception.response.error || 'Validation Error'
      }));
    }

    // Error genérico
    return throwError(() => ({
      status: 500,
      message: 'Internal server error in Voting service',
      error: 'Internal Server Error'
    }));
  }

  private handlePrismaError(exception: any) {
    switch (exception.code) {
      case 'P2002':
        return {
          status: 409,
          message: 'Vote already registered or duplicate entry detected',
          error: 'Conflict'
        };
      case 'P2025':
        return {
          status: 404,
          message: 'Vote or voter information not found',
          error: 'Not Found'
        };
      case 'P2003':
        return {
          status: 400,
          message: 'Invalid reference to election or candidate',
          error: 'Bad Request'
        };
      default:
        this.logger.error('Unhandled Prisma error:', exception);
        return {
          status: 500,
          message: 'Database error occurred',
          error: 'Internal Server Error'
        };
    }
  }
}
