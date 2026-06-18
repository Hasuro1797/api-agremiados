import { BadRequestException } from '@nestjs/common';
import { FileUpload } from 'graphql-upload-ts';

/** Mimetypes de imagen aceptados para branding/logos/avatares. */
const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
];

/**
 * Valida que el archivo subido sea una imagen permitida. El límite de TAMAÑO se
 * aplica a nivel de middleware (graphqlUploadExpress); esto cierra el tipo.
 */
export function assertAllowedImage(file: FileUpload): void {
  if (!file?.mimetype || !ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
    throw new BadRequestException(
      `Tipo de archivo no permitido${
        file?.mimetype ? `: ${file.mimetype}` : ''
      }. Solo se aceptan imágenes (JPG, PNG, WebP, GIF, SVG, ICO).`,
    );
  }
}
