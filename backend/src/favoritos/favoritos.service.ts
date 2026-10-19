import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService }   from '../prisma/prisma.service';
import { ApiException }    from '../common/filters/http-exception.filter';
import { ErrorCode }       from '../common/constants/error-codes';
import { parsePropArrays } from '../common/utils/formatters';

@Injectable()
export class FavoritosService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    // Las propiedades eliminadas (soft delete) no se muestran en favoritos
    const favs = await this.prisma.favorito.findMany({
      where:   { userId, propiedad: { deletedAt: null } },
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
    const prop = await this.prisma.propiedad.findFirst({ where: { id: propId, deletedAt: null } });
    if (!prop) throw new ApiException(ErrorCode.PROP_NOT_FOUND, 'Propiedad no encontrada', 'prop_id', HttpStatus.NOT_FOUND);
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
