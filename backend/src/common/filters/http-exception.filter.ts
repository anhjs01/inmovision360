import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';

export class ApiException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field?: string,
    status = HttpStatus.BAD_REQUEST,
  ) {
    super({ ok: false, error: { code, message, field } }, status);
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const body   = exception.getResponse() as any;
      const status = exception.getStatus();
      return res.status(status).json(
        body?.ok !== undefined
          ? body
          : { ok: false, error: { code: 'HTTP_ERROR', message: body?.message ?? 'Error' } },
      );
    }

    console.error('[500]', exception);
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
}
