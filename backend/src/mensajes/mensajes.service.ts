import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async send(deId: string, dto: any) {
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

  async markRead(id: string) {
    return this.prisma.mensaje.update({
      where: {
        id,
      },

      data: {
        leido: true,
      },
    });
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