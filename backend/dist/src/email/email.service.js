"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EmailService = class EmailService {
    constructor(config) {
        this.config = config;
    }
    async send(to, subject, html) {
        const host = this.config.get('SMTP_HOST');
        const user = this.config.get('SMTP_USER');
        if (!host || !user) {
            console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
            return;
        }
    }
    async sendVisitaConfirmada(email, prop, fecha, hora) {
        await this.send(email, '✅ Visita confirmada — INMOVISIÓN 360', `<p>Tu visita a <strong>${prop}</strong> fue confirmada para el <strong>${fecha} a las ${hora}</strong>.</p>`);
    }
    async sendMensajeNuevo(email, de, prop) {
        await this.send(email, '💬 Nuevo mensaje — INMOVISIÓN 360', `<p><strong>${de}</strong> te envió un mensaje sobre <strong>${prop}</strong>.</p>`);
    }
    async sendPagoRecibido(email, monto, prop) {
        await this.send(email, '💳 Pago recibido — INMOVISIÓN 360', `<p>Se recibió un pago de <strong>$${monto.toLocaleString('es-CO')}</strong> por <strong>${prop}</strong>.</p>`);
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map