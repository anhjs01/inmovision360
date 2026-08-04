import { Controller, Post, Delete, Patch, Param, Body, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';

@Controller('propiedades/:id/fotos')
@Roles('arrendador')
export class MediaController {
  constructor(private svc: MediaService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('fotos', 20))
  upload(
    @Param('id') propId: string,
    @CurrentUser() u: any,
    @UploadedFiles() files: any[],
  ) { return this.svc.addFotos(propId, u.id, files || []); }

  @Delete(':index')
  remove(
    @Param('id') propId: string,
    @Param('index') index: string,
    @CurrentUser() u: any,
  ) { return this.svc.removeFoto(propId, u.id, +index); }

  @Patch('orden')
  reorder(
    @Param('id') propId: string,
    @CurrentUser() u: any,
    @Body('orden') orden: number[],
  ) { return this.svc.reordenarFotos(propId, u.id, orden); }
}
