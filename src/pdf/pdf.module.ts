import { Global, Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

// Global: cualquier módulo (facturación, constancias, etc.) puede inyectar PdfService.
@Global()
@Module({
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
