import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

// Errores conocidos de Prisma → respuesta 4xx en lugar de 500
const PRISMA_ERRORS: Record<string, { status: number; code: string; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT,    code: 'DUPLICATE',        message: 'El registro ya existe' },
  P2003: { status: HttpStatus.BAD_REQUEST, code: 'VALIDATION_ERROR', message: 'Referencia inválida (el registro relacionado no existe)' },
  P2025: { status: HttpStatus.NOT_FOUND,   code: 'NOT_FOUND',        message: 'Registro no encontrado' },
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx  = host.switchToHttp();
    const res  = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const body   = exception.getResponse() as any;
      const status = exception.getStatus();
      if (body?.ok !== undefined) return res.status(status).json(body);

      // ValidationPipe entrega un arreglo de mensajes → se unen en un solo texto
      const isValidation = Array.isArray(body?.message);
      const message      = isValidation ? body.message.join('. ') : (body?.message ?? 'Error');
      const code         = isValidation ? 'VALIDATION_ERROR' : 'HTTP_ERROR';
      return res.status(status).json({ ok: false, error: { code, message } });
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && PRISMA_ERRORS[exception.code]) {
      const { status, code, message } = PRISMA_ERRORS[exception.code];
      return res.status(status).json({ ok: false, error: { code, message } });
    }

    console.error('[500]', exception);
    res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
  }
}
