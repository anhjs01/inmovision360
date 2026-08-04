"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = exports.ApiException = void 0;
const common_1 = require("@nestjs/common");
class ApiException extends common_1.HttpException {
    constructor(code, message, field, status = common_1.HttpStatus.BAD_REQUEST) {
        super({ ok: false, error: { code, message, field } }, status);
        this.code = code;
        this.field = field;
    }
}
exports.ApiException = ApiException;
let GlobalExceptionFilter = class GlobalExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse();
        if (exception instanceof common_1.HttpException) {
            const body = exception.getResponse();
            const status = exception.getStatus();
            return res.status(status).json(body?.ok !== undefined
                ? body
                : { ok: false, error: { code: 'HTTP_ERROR', message: body?.message ?? 'Error' } });
        }
        console.error('[500]', exception);
        res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map