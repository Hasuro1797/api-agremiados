import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { SunatDocType } from 'generated/prisma/enums';
import { numeroALetras } from 'lib/number_to_letters';
import { PdfService, PdfDocDefinition } from 'src/pdf/pdf.service';

type InvoiceWithDetails = Prisma.InvoiceHeaderGetPayload<{
  include: { details: true };
}>;

interface EmitterInfo {
  ruc: string;
  razonSocial: string;
  comercialName?: string | null;
  address?: string | null;
}

const DOC_TITLE: Record<SunatDocType, string> = {
  [SunatDocType.FACTURA]: 'FACTURA ELECTRÓNICA',
  [SunatDocType.BOLETA]: 'BOLETA DE VENTA ELECTRÓNICA',
  [SunatDocType.NOTA_CREDITO]: 'NOTA DE CRÉDITO ELECTRÓNICA',
  [SunatDocType.NOTA_DEBITO]: 'NOTA DE DÉBITO ELECTRÓNICA',
};

function money(n: number | null | undefined): string {
  return (n ?? 0).toFixed(2);
}

/**
 * Construye la representación impresa (PDF) de un comprobante electrónico SUNAT.
 * Usa el motor genérico PdfService.
 */
@Injectable()
export class InvoicePdfService {
  constructor(private readonly pdf: PdfService) {}

  async generate(
    invoice: InvoiceWithDetails,
    emitter: EmitterInfo,
    serie: string,
    sequential: string,
    currencySymbol = 'S/',
  ): Promise<Buffer> {
    const docType = invoice.sunatDocType!;
    const total =
      (invoice.totalTaxable ?? 0) +
      (invoice.totalExempt ?? 0) +
      (invoice.totalUnaffected ?? 0) +
      (invoice.totalIgv ?? 0) +
      (invoice.totalIsc ?? 0) +
      (invoice.totalOtherCharges ?? 0);

    const itemsBody = [
      [
        { text: 'Cant.', style: 'th' },
        { text: 'Descripción', style: 'th' },
        { text: 'V. Unit.', style: 'th', alignment: 'right' },
        { text: 'Importe', style: 'th', alignment: 'right' },
      ],
      ...invoice.details.map((d) => {
        const lineTotal = (d.unitPriceWithoutIgv ?? d.price) * d.quantity;
        return [
          { text: String(d.quantity), alignment: 'center' },
          { text: d.description },
          { text: money(d.unitPriceWithoutIgv ?? d.price), alignment: 'right' },
          { text: money(lineTotal), alignment: 'right' },
        ];
      }),
    ];

    const docDefinition: PdfDocDefinition = {
      content: [
        {
          columns: [
            [
              { text: emitter.razonSocial, style: 'emitter' },
              ...(emitter.comercialName
                ? [{ text: emitter.comercialName, fontSize: 9 }]
                : []),
              ...(emitter.address
                ? [{ text: emitter.address, fontSize: 8, color: '#555' }]
                : []),
            ],
            {
              width: 220,
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        { text: `RUC ${emitter.ruc}`, bold: true, alignment: 'center' },
                        { text: DOC_TITLE[docType], bold: true, alignment: 'center', fontSize: 11 },
                        { text: `${serie}-${sequential}`, alignment: 'center', fontSize: 11 },
                      ],
                      margin: [0, 6, 0, 6],
                    },
                  ],
                ],
              },
            },
          ],
        },
        { text: '\n' },
        {
          columns: [
            { text: `Cliente: ${invoice.clientName ?? '-'}`, fontSize: 9 },
            {
              text: `Documento: ${invoice.documentNumber ?? '-'}`,
              fontSize: 9,
              alignment: 'right',
            },
          ],
        },
        {
          columns: [
            {
              text: `Fecha de emisión: ${(invoice.sunatEmissionDate ?? invoice.issueDate).toISOString().slice(0, 10)}`,
              fontSize: 9,
            },
            { text: `Moneda: ${invoice.currency}`, fontSize: 9, alignment: 'right' },
          ],
        },
        { text: '\n' },
        {
          table: { headerRows: 1, widths: [40, '*', 70, 70], body: itemsBody },
          layout: 'lightHorizontalLines',
        },
        { text: '\n' },
        {
          columns: [
            {
              width: '*',
              text: `SON: ${numeroALetras(total)}`,
              italics: true,
              fontSize: 9,
            },
            {
              width: 200,
              table: {
                widths: ['*', 70],
                body: [
                  [
                    { text: 'Op. Gravada', alignment: 'right' },
                    { text: `${currencySymbol} ${money(invoice.totalTaxable)}`, alignment: 'right' },
                  ],
                  [
                    { text: 'Op. Exonerada', alignment: 'right' },
                    { text: `${currencySymbol} ${money(invoice.totalExempt)}`, alignment: 'right' },
                  ],
                  [
                    { text: 'Op. Inafecta', alignment: 'right' },
                    { text: `${currencySymbol} ${money(invoice.totalUnaffected)}`, alignment: 'right' },
                  ],
                  [
                    { text: 'IGV (18%)', alignment: 'right' },
                    { text: `${currencySymbol} ${money(invoice.totalIgv)}`, alignment: 'right' },
                  ],
                  [
                    { text: 'TOTAL', alignment: 'right', bold: true },
                    { text: `${currencySymbol} ${money(total)}`, alignment: 'right', bold: true },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
        },
        { text: '\n\n' },
        {
          text: 'Representación impresa del comprobante electrónico. Consulte su validez en SUNAT.',
          fontSize: 7,
          color: '#777',
          alignment: 'center',
        },
      ],
      styles: {
        emitter: { fontSize: 13, bold: true },
        th: { bold: true, fillColor: '#f0f0f0' },
      },
    };

    return this.pdf.generate(docDefinition);
  }
}
