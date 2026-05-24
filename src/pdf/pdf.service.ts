import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake/src/printer';

/** Definición de documento pdfmake (tipado laxo: el SDK no trae tipos server-side). */
export type PdfDocDefinition = Record<string, unknown>;

// Fuentes estándar de PDF (AFM, integradas en PDFKit) — no requieren archivos TTF.
const STANDARD_FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

/**
 * Servicio genérico de generación de PDF (pdfmake). Reutilizable para
 * comprobantes electrónicos, constancias de asistencia, habilitación, etc.
 * Recibe una definición pdfmake y devuelve el PDF como Buffer.
 */
@Injectable()
export class PdfService {
  private readonly printer = new PdfPrinter(STANDARD_FONTS);

  async generate(docDefinition: PdfDocDefinition): Promise<Buffer> {
    const definition: PdfDocDefinition = {
      defaultStyle: { font: 'Helvetica', fontSize: 9 },
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
