import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage: string | string[] = 'Terjadi kesalahan internal pada peladen.';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
        errorCode = this.resolveErrorCode(statusCode);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resObj = exceptionResponse as Record<string, any>;
        errorMessage = resObj.message || exception.message;
        errorCode = resObj.code || this.resolveErrorCode(statusCode);
      } else {
        errorMessage = exception.message;
        errorCode = this.resolveErrorCode(statusCode);
      }

      if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        if (
          !errorMessage ||
          errorMessage === 'ThrottlerException: Too Many Requests' ||
          errorMessage === 'Too Many Requests'
        ) {
          errorMessage =
            'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba kembali.';
        }
      }
    } else if (
      (exception as any)?.status === 413 ||
      (exception as any)?.statusCode === 413 ||
      (exception as any)?.type === 'entity.too.large'
    ) {
      statusCode = HttpStatus.PAYLOAD_TOO_LARGE;
      errorCode = 'PAYLOAD_TOO_LARGE';
      errorMessage =
        'Ukuran total dokumen yang diunggah melebihi batas maksimum peladen (maksimal 50 MB). Harap perkecil atau kompres berkas Anda.';
    } else {
      // Uncaught / Internal / Database driver errors
      // Log the real error on the server side only - NEVER leak details to client
      this.logger.error(
        `[UnhandledException] ${request?.method} ${request?.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // Format pesan error jika array (misal validasi DTO)
    const formattedMessage = Array.isArray(errorMessage)
      ? errorMessage.join('; ')
      : errorMessage;

    response.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        code: errorCode,
        message: formattedMessage,
        timestamp: new Date().toISOString(),
        path: request?.url || '',
      },
    });
  }

  private resolveErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
