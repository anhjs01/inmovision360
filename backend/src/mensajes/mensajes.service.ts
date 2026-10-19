import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException } from '../common/filters/http-exception.filter';
import { ErrorCode } from '../common/constants/error-codes';
import { SendMensajeDto } from './dto/mensaje.dto';

@Injectable()
export class MensajesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const messages = await this.prisma.mensaje.findMany({
      where: {
        OR: [
          { deId: userId },
          { paraId: userId },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        propiedad: {
          select: {
            id: true,
            titulo: true,
            precio: true,
            fotos: true,
          },
        },
        de: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
        para: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    const conversations = new Map<string, any>();

    for (const m of messages) {
      const otherId = m.deId === userId ? m.paraId : m.deId;

      if (conversations.has(otherId)) {
        const current = conversations.get(otherId);

        if (m.paraId === userId && !m.leido) {
          current.unreadCount += 1;
        }

        continue;
      }

      const other = m.deId === userId ? m.para : m.de;

      conversations.set(otherId, {
        id: otherId,

        usuario: other,

        ultimoMensaje: {
          id: m.id,
          texto: m.texto,
          createdAt: m.createdAt,
          leido: m.leido,
          deId: m.deId,
          paraId: m.paraId,
        },

        propiedad: m.propiedad,

        unreadCount:
          m.paraId === userId && !m.leido
            ? 1
            : 0,

        createdAt: m.createdAt,
      });
    }

    return Array.from(conversations.values());
  }

  async getConversacion(
    userId: string,
    currentUserId: string,
  ) {
    return this.prisma.mensaje.findMany({
      where: {
        OR: [
          {
            deId: currentUserId,
            paraId: userId,
          },
          {
            deId: userId,
            paraId: currentUserId,
          },
        ],
      },

      orderBy: {
        createdAt: 'asc',
      },

      include: {
        propiedad: {
          select: {
            id: true,
            titulo: true,
            precio: true,
            fotos: true,
          },
        },

        de: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },

        para: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });
  }

  async send(deId: string, dto: SendMensajeDto) {
    if (dto.destinatario_id === deId) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, 'No puedes enviarte mensajes a ti mismo', 'destinatario_id');
    }

    const [prop, destinatario] = await Promise.all([
      this.prisma.propiedad.findFirst({ where: { id: dto.prop_id, deletedAt: null } }),
      this.prisma.usuario.findFirst({ where: { id: dto.destinatario_id, deletedAt: null } }),
    ]);

    if (!prop) {
      throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'prop_id', HttpStatus.NOT_FOUND);
    }

    if (!destinatario) {
      throw new ApiException(ErrorCode.USER_NOT_FOUND, 'Destinatario no encontrado', 'destinatario_id', HttpStatus.NOT_FOUND);
    }

    // Toda conversación es sobre una propiedad: uno de los dos debe ser su dueño
    if (prop.ownerId !== deId && prop.ownerId !== dto.destinatario_id) {
      throw new ApiException(ErrorCode.FORBIDDEN, 'Solo puedes escribir al dueño de la propiedad', 'destinatario_id', HttpStatus.FORBIDDEN);
    }

    return this.prisma.mensaje.create({
      data: {
        deId,
        paraId: dto.destinatario_id,
        propId: dto.prop_id,
        texto: dto.texto,
      },

      include: {
        propiedad: {
          select: {
            id: true,
            titulo: true,
            precio: true,
            fotos: true,
          },
        },

        de: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },

        para: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });
  }

  async markRead(id: string, userId: string) {
    // Solo el destinatario puede marcar el mensaje como leído
    const result = await this.prisma.mensaje.updateMany({
      where: {
        id,
        paraId: userId,
      },

      data: {
        leido: true,
      },
    });

    if (!result.count) {
      throw new ApiException(ErrorCode.MENSAJE_NOT_FOUND, 'Mensaje no encontrado', undefined, HttpStatus.NOT_FOUND);
    }

    return {
      ok: true,
    };
  }

  async markConversationRead(
    userId: string,
    currentUserId: string,
  ) {
    const result = await this.prisma.mensaje.updateMany({
      where: {
        deId: userId,
        paraId: currentUserId,
        leido: false,
      },

      data: {
        leido: true,
      },
    });

    return {
      count: result.count,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.mensaje.count({
      where: {
        paraId: userId,
        leido: false,
      },
    });

    return {
      count,
    };
  }

  async getHilo(
    propId: string,
    userId: string,
  ) {
    return this.prisma.mensaje.findMany({
      where: {
        propId,

        OR: [
          { deId: userId },
          { paraId: userId },
        ],
      },

      orderBy: {
        createdAt: 'asc',
      },

      include: {
        de: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });
  }
}