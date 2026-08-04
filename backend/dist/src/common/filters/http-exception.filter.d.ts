import { ExceptionFilter, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
export declare class ApiException extends HttpException {
    readonly code: string;
    readonly field?: string;
    constructor(code: string, message: string, field?: string, status?: HttpStatus);
}
export declare class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): Response<any, Record<string, any>>;
}
