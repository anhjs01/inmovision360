import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule }     from '@nestjs/platform-express';
import { memoryStorage }    from 'multer';
import { MediaService }     from './media.service';
import { MediaController }  from './media.controller';
import { IMAGE_MIME_EXT, MAX_IMAGE_BYTES, MAX_FOTOS } from '../common/utils/uploads';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits:  { fileSize: MAX_IMAGE_BYTES, files: MAX_FOTOS },
      // Solo imágenes JPG / PNG / WEBP
      fileFilter: (_req, file, cb) => {
        if (IMAGE_MIME_EXT[file.mimetype]) return cb(null, true);
        cb(new BadRequestException(`"${file.originalname}" no es una imagen JPG, PNG o WEBP`), false);
      },
    }),
  ],
  controllers: [MediaController],
  providers:   [MediaService],
})
export class MediaModule {}
