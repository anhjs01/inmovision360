import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PagosService {
  constructor(private prisma: PrismaService) {}

  async findAll(ownerId: string, estado?: string) {
    const where: any = { ownerId };
    if (estado) where.estado = estado;
    return this.prisma.pago.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        inquilino: { select: { titulo: true } },
        inq:       { select: { nombre: true, apellido: true } },
      },
    });
  }

  async findMios(inquilinoId: string) {
    return this.prisma.pago.findMany({
      where:   { inquilinoId },
      orderBy: { createdAt: 'desc' },
      include: { inquilino: { select: { titulo: true } } },
    });
  }

  async create(ownerId: string, dto: any) {
    // inquilinoId puede ser un nombre — buscamos el usuario por nombre/email
    // o usamos el arrendador como fallback
    let inquilinoId: string = dto.inquilinoId || '';

    if (!inquilinoId || inquilinoId.length < 20) {
      // No parece un cuid — buscar por nombre o email
      const usuario = await this.prisma.usuario.findFirst({
        where: {
          AND: [
            { deletedAt: null },
            {
              OR: [
                { nombre:   { contains: inquilinoId } },
                { apellido: { contains: inquilinoId } },
                { email:    { contains: inquilinoId } },
              ],
            },
          ],
        },
      });
      inquilinoId = usuario ? usuario.id : ownerId;
    }

    const { inquilinoId: _removed, ...rest } = dto;
    return this.prisma.pago.create({
      data: { ...rest, ownerId, inquilinoId },
      include: {
        inquilino: { select: { titulo: true } },
        inq:       { select: { nombre: true, apellido: true } },
      },
    });
  }

  async updateEstado(id: string, estado: string) {
    return this.prisma.pago.update({ where: { id }, data: { estado } });
  }

  iniciarWompi(dto: any) {
    const ref = `INM_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return {
      wompi_checkout_url: `https://checkout.wompi.co/p/?public-key=pub_stagtest_&reference=${ref}&amount-in-cents=${dto.monto * 100}&currency=COP`,
      reference: ref,
    };
  }
}
