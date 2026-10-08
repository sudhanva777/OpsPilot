import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Logging interceptor that attaches a correlation ID to every request
 * and logs the method, path, status code, and duration.
 *
 * The correlation ID propagates through logs and is returned in the
 * X-Correlation-ID response header for debugging.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { correlationId?: string }>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers['x-correlation-id'] as string) ?? randomUUID();
    request.correlationId = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - start;
        this.logger.log(
          `${method} ${url} ${statusCode} +${duration}ms [${correlationId}]`,
        );
      }),
    );
  }
}
