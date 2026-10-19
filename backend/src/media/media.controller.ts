import { Controller, Post, Delete, Patch, Param, Body, UploadedFiles, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IsArray, IsInt, Min } from 'class-validator';
import { MediaService } from './media.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';
import { MAX_FOTOS }    from '../common/utils/uploads';

class ReordenarFotosDto {
  @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) orden: number[];
}

@Controller('propiedades/:id/fotos')
@Roles('arrendador')
export class MediaController {
  constructor(private svc: MediaService) {}

  // multipart/form-data con uno o varios campos "fotos"
  @Post()
  @UseInterceptors(FilesInterceptor('fotos', MAX_FOTOS))
  upload(
    @Param('id') propId: string,
    @CurrentUser() u: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) { return this.svc.addFotos(propId, u.id, files || []); }

  @Patch('orden')
  reorder(
    @Param('id') propId: string,
    @CurrentUser() u: any,
    @Body() dto: ReordenarFotosDto,
  ) { return this.svc.reordenarFotos(propId, u.id, dto.orden); }

  @Delete(':index')
  remove(
    @Param('id') propId: string,
    @Param('index', ParseIntPipe) index: number,
    @CurrentUser() u: any,
  ) { return this.svc.removeFoto(propId, u.id, index); }
}
