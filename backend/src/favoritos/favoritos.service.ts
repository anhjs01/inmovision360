import { Injectable } from '@nestjs/common';
import { PrismaService }   from '../prisma/prisma.service';
import { parsePropArrays } from '../common/utils/formatters';

@Injectable()
export class FavoritosService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const favs = await this.prisma.favorito.findMany({
      where:   { userId },
      include: { propiedad: true },
    });
    return favs.map(f => parsePropArrays(f.propiedad));
  }

  async toggle(userId: string, propId: string) {
    const existing = await this.prisma.favorito.findUnique({
      where: { userId_propId: { userId, propId } },
    });
    if (existing) {
      await this.prisma.favorito.delete({ where: { userId_propId: { userId, propId } } });
      return { is_fav: false };
    }
    await this.prisma.favorito.create({ data: { userId, propId } });
    return { is_fav: true };
  }

  async check(userId: string, propId: string) {
    const fav = await this.prisma.favorito.findUnique({
      where: { userId_propId: { userId, propId } },
    });
    return { is_fav: !!fav };
  }

  async remove(userId: string, propId: string) {
    await this.prisma.favorito.deleteMany({ where: { userId, propId } });
    return { ok: true };
  }
}
