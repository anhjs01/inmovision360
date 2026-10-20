import { Controller, Get, Post, Patch, Delete, Param, Body, Query,
         UploadedFile, UseInterceptors, BadRequestException, StreamableFile, Header } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage }   from 'multer';
import { PagosService } from './pagos.service';
import { CurrentUser }  from '../common/decorators/current-user.decorator';
import { Roles }        from '../common/decorators/roles.decorator';
import { COMPROBANTE_MIME_EXT, MAX_IMAGE_BYTES } from '../common/utils/uploads';
import { CreatePagoDto, UpdatePagoDto, UpdatePagoEstadoDto, IniciarWompiDto, ReportarPagoDto } from './dto/pago.dto';

// Un solo archivo "comprobante": imagen JPG/PNG/WEBP o PDF de hasta 5 MB
const COMPROBANTE_UPLOAD = FileInterceptor('comprobante', {
  storage: memoryStorage(),
  limits:  { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (COMPROBANTE_MIME_EXT[file.mimetype]) return cb(null, true);
    cb(new BadRequestException('El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF'), false);
  },
});

@Controller('pagos')
export class PagosController {
  constructor(private svc: PagosService) {}

  @Get()         @Roles('arrendador') findAll(@CurrentUser() u: any, @Query('estado') e?: string)  { return this.svc.findAll(u.id, e); }
  @Get('mios')                        findMios(@CurrentUser() u: any)                               { return this.svc.findMios(u.id); }
  @Post()        @Roles('arrendador') create(@CurrentUser() u: any, @Body() b: CreatePagoDto)        { return this.svc.create(u.id, b); }
  @Post('reportar') @Roles('inquilino') reportar(@CurrentUser() u: any, @Body() b: ReportarPagoDto) { return this.svc.reportar(u.id, b); }
  @Post('wompi/iniciar')              iniciar(@CurrentUser() u: any, @Body() b: IniciarWompiDto)    { return this.svc.iniciarWompi(u.id, b.pago_id); }

  // Comprobante: lo pueden subir, ver y quitar el arrendador o el inquilino del pago
  @Post(':id/comprobante') @UseInterceptors(COMPROBANTE_UPLOAD)
  subirComprobante(@Param('id') id: string, @CurrentUser() u: any, @UploadedFile() file: Express.Multer.File) {
    return this.svc.subirComprobante(id, u.id, file);
  }
  @Get(':id/comprobante') @Header('X-Content-Type-Options', 'nosniff')
  async verComprobante(@Param('id') id: string, @CurrentUser() u: any) {
    const { buffer, mime, filename } = await this.svc.getComprobante(id, u.id);
    return new StreamableFile(buffer, { type: mime, disposition: `inline; filename="${filename}"` });
  }
  @Delete(':id/comprobante') quitarComprobante(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.quitarComprobante(id, u.id); }

  @Patch(':id/estado') @Roles('arrendador')
  updateEstado(@Param('id') id: string, @CurrentUser() u: any, @Body() b: UpdatePagoEstadoDto)       { return this.svc.update(id, u.id, { estado: b.estado }); }
  @Patch(':id')  @Roles('arrendador') update(@Param('id') id: string, @CurrentUser() u: any, @Body() b: UpdatePagoDto) { return this.svc.update(id, u.id, b); }
  // El inquilino solo puede borrar pagos que él reportó y siguen pendientes (lo valida el servicio)
  @Delete(':id') @Roles('arrendador', 'inquilino') remove(@Param('id') id: string, @CurrentUser() u: any) { return this.svc.remove(id, u.id); }
}
