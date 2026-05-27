import { Injectable } from '@nestjs/common';
import { join } from 'path';
import PdfPrinter from 'pdfmake/src/printer';

/** Definición de documento pdfmake (tipado laxo: el SDK no trae tipos server-side). */
export type PdfDocDefinition = Record<string, unknown>;

const FONTS_DIR = join(process.cwd(), 'fonts', 'inter');

const APP_FONTS = {
  Inter: {
    normal: join(FONTS_DIR, 'Inter-Regular.ttf'),
    bold: join(FONTS_DIR, 'Inter-Bold.ttf'),
    italics: join(FONTS_DIR, 'Inter-Italic.ttf'),
    bolditalics: join(FONTS_DIR, 'Inter-BoldItalic.ttf'),
  },
  InterSemiBold: {
    normal: join(FONTS_DIR, 'Inter_18pt-SemiBold.ttf'),
    bold: join(FONTS_DIR, 'Inter-Bold.ttf'),
    italics: join(FONTS_DIR, 'Inter_18pt-SemiBoldItalic.ttf'),
    bolditalics: join(FONTS_DIR, 'Inter-BoldItalic.ttf'),
  },
};

/**
 * Servicio genérico de generación de PDF (pdfmake). Reutilizable para
 * comprobantes electrónicos, constancias de asistencia, habilitación, etc.
 * Recibe una definición pdfmake y devuelve el PDF como Buffer.
 */
@Injectable()
export class PdfService {
  private readonly printer = new PdfPrinter(APP_FONTS);

  async generate(docDefinition: PdfDocDefinition): Promise<Buffer> {
    const definition: PdfDocDefinition = {
      defaultStyle: { font: 'Inter', fontSize: 9 },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 50],
      ...docDefinition,
    };

    const pdfDoc = this.printer.createPdfKitDocument(definition);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }
}
