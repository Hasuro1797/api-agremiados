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
  // Branding (from Organization)
  primaryColor?: string | null;
  accentColor?: string | null;
  logoDataUri?: string | null;
}

const DOC_TITLE: Record<SunatDocType, string> = {
  [SunatDocType.FACTURA]: 'FACTURA ELECTRÓNICA',
  [SunatDocType.BOLETA]: 'BOLETA DE VENTA ELECTRÓNICA',
  [SunatDocType.NOTA_CREDITO]: 'NOTA DE CRÉDITO ELECTRÓNICA',
  [SunatDocType.NOTA_DEBITO]: 'NOTA DE DÉBITO ELECTRÓNICA',
};

// ─── Palette defaults ────────────────────────────────────────────────────────
const DEFAULT_PRIMARY = '#1B3A6B';
const DEFAULT_ACCENT = '#FF7043';
const SLATE_50 = '#F8FAFC';
const SLATE_200 = '#E2E8F0';
const SLATE_400 = '#94A3B8';
const SLATE_600 = '#475569';
const SLATE_800 = '#1E293B';
const WHITE = '#FFFFFF';
// ─────────────────────────────────────────────────────────────────────────────

/** Mezcla un color hex con blanco al `opacity` dado (0–1). */
function lightenHex(hex: string, opacity: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lr = Math.round(r * opacity + 255 * (1 - opacity));
  const lg = Math.round(g * opacity + 255 * (1 - opacity));
  const lb = Math.round(b * opacity + 255 * (1 - opacity));
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

function money(n: number | null | undefined): string {
  return (n ?? 0).toFixed(2);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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
    const primary = emitter.primaryColor ?? DEFAULT_PRIMARY;
    const accent = emitter.accentColor ?? DEFAULT_ACCENT;
    const primaryLight = lightenHex(primary, 0.08);
    const primaryMuted = lightenHex(primary, 0.55); // RUC label color in dark box

    const docType = invoice.sunatDocType!;
    const total =
      (invoice.totalTaxable ?? 0) +
      (invoice.totalExempt ?? 0) +
      (invoice.totalUnaffected ?? 0) +
      (invoice.totalIgv ?? 0) +
      (invoice.totalIsc ?? 0) +
      (invoice.totalOtherCharges ?? 0);

    const seqFormatted = sequential.padStart(8, '0');
    const emissionDate = formatDate(
      invoice.sunatEmissionDate ?? invoice.issueDate,
    );

    // ── Items table body ────────────────────────────────────────────────────
    const itemsBody = [
      [
        { text: 'CANT.', style: 'th', alignment: 'center', fillColor: primary },
        { text: 'DESCRIPCIÓN', style: 'th', fillColor: primary },
        { text: 'V. UNIT.', style: 'th', alignment: 'right', fillColor: primary },
        { text: 'IMPORTE', style: 'th', alignment: 'right', fillColor: primary },
      ],
      ...invoice.details.map((d, i) => {
        const unitPrice = d.unitPriceWithoutIgv ?? d.price;
        const lineTotal = unitPrice * d.quantity;
        const rowFill = i % 2 === 0 ? SLATE_50 : null;
        return [
          {
            text: String(d.quantity),
            alignment: 'center',
            color: SLATE_800,
            fillColor: rowFill,
          },
          { text: d.description, color: SLATE_800, fillColor: rowFill },
          {
            text: money(unitPrice),
            alignment: 'right',
            color: SLATE_800,
            fillColor: rowFill,
          },
          {
            text: money(lineTotal),
            alignment: 'right',
            color: SLATE_800,
            fillColor: rowFill,
          },
        ];
      }),
    ];

    // ── Custom table layouts ────────────────────────────────────────────────
    const itemsLayout = {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) => {
        if (i === 0 || i === node.table.body.length) return 0;
        return i === 1 ? 0 : 0.5;
      },
      vLineWidth: () => 0,
      hLineColor: () => SLATE_200,
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    };

    const infoLayout = {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 10,
      paddingRight: () => 10,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    };

    const totalsLayout = {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === 0 || i === node.table.body.length ? 0 : 0.5,
      vLineWidth: () => 0,
      hLineColor: () => SLATE_200,
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    };

    // ── Client info rows ────────────────────────────────────────────────────
    const infoRows: unknown[] = [
      [
        {
          border: [false, false, false, false],
          stack: [
            { text: 'CLIENTE', style: 'infoLabel' },
            { text: invoice.clientName ?? '-', style: 'infoValue' },
          ],
          margin: [0, 0, 6, 0],
        },
        {
          border: [false, false, false, false],
          stack: [
            { text: 'N° DOCUMENTO', style: 'infoLabel' },
            { text: invoice.documentNumber ?? '-', style: 'infoValue' },
          ],
        },
      ],
      [
        {
          border: [false, false, false, false],
          stack: [
            { text: 'FECHA DE EMISIÓN', style: 'infoLabel' },
            { text: emissionDate, style: 'infoValue' },
          ],
          margin: [0, 0, 6, 0],
        },
        {
          border: [false, false, false, false],
          stack: [
            { text: 'MONEDA', style: 'infoLabel' },
            { text: invoice.currency, style: 'infoValue' },
          ],
        },
      ],
    ];

    if (invoice.billingAddress) {
      (infoRows as unknown[][]).push([
        {
          colSpan: 2,
          border: [false, false, false, false],
          stack: [
            { text: 'DIRECCIÓN DE FACTURACIÓN', style: 'infoLabel' },
            { text: invoice.billingAddress, style: 'infoValue' },
          ],
          margin: [0, 0, 6, 0],
        },
        {},
      ]);
    }

    if (invoice.observations) {
      (infoRows as unknown[][]).push([
        {
          colSpan: 2,
          border: [false, false, false, false],
          stack: [
            { text: 'OBSERVACIONES', style: 'infoLabel' },
            { text: invoice.observations, style: 'infoValue' },
          ],
          margin: [0, 0, 6, 0],
        },
        {},
      ]);
    }

    // ── Document definition ─────────────────────────────────────────────────
    const docDefinition: PdfDocDefinition = {
      content: [
        // Top accent bar
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: 515, h: 5, color: primary, r: 1 },
          ],
          margin: [0, 0, 0, 14],
        },

        // Header: emitter info (left) + document box (right)
        {
          columns: [
            {
              width: '*',
              stack: [
                ...(emitter.logoDataUri
                  ? [
                      {
                        image: emitter.logoDataUri,
                        fit: [150, 48],
                        margin: [0, 0, 0, 6],
                      },
                    ]
                  : []),
                { text: emitter.razonSocial, style: 'companyName' },
                ...(emitter.comercialName
                  ? [{ text: emitter.comercialName, style: 'companyTrade' }]
                  : []),
                ...(emitter.address
                  ? [{ text: emitter.address, style: 'companyAddress' }]
                  : []),
              ],
            },
            {
              width: 205,
              table: {
                widths: ['*'],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: `RUC ${emitter.ruc}`,
                          style: 'docBoxRuc',
                        },
                        {
                          canvas: [
                            {
                              type: 'line',
                              x1: 0,
                              y1: 0,
                              x2: 165,
                              y2: 0,
                              lineWidth: 0.5,
                              lineColor: primaryMuted,
                            },
                          ],
                          margin: [0, 5, 0, 5],
                        },
                        {
                          text: DOC_TITLE[docType],
                          style: 'docBoxTitle',
                        },
                        {
                          text: `${serie}-${seqFormatted}`,
                          style: 'docBoxNumber',
                        },
                      ],
                      fillColor: primary,
                      margin: [14, 12, 14, 12],
                    },
                  ],
                ],
              },
              layout: 'noBorders',
            },
          ],
          columnGap: 16,
        },

        // Separator
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 2,
              x2: 515,
              y2: 2,
              lineWidth: 1.5,
              lineColor: primary,
            },
          ],
          margin: [0, 12, 0, 10],
        },

        // Client info grid
        {
          table: { widths: ['*', '*'], body: infoRows },
          layout: {
            ...infoLayout,
            fillColor: () => primaryLight,
          },
          margin: [0, 0, 0, 14],
        },

        // Items table
        {
          table: { headerRows: 1, widths: [35, '*', 65, 70], body: itemsBody },
          layout: itemsLayout,
        },

        { text: '', margin: [0, 14, 0, 0] },

        // Amount in words + totals
        {
          columns: [
            {
              width: '*',
              stack: [
                {
                  table: {
                    widths: ['*'],
                    body: [
                      [
                        {
                          text: `SON: ${numeroALetras(total)}`,
                          style: 'amountWords',
                          margin: [10, 7, 10, 7],
                        },
                      ],
                    ],
                  },
                  layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => SLATE_200,
                    vLineColor: () => SLATE_200,
                  },
                },
              ],
            },
            { width: 10, text: '' },
            {
              width: 205,
              table: {
                widths: ['*', 75],
                body: [
                  [
                    { text: 'Op. Gravada', style: 'totalLabel' },
                    {
                      text: `${currencySymbol} ${money(invoice.totalTaxable)}`,
                      style: 'totalValue',
                    },
                  ],
                  [
                    { text: 'Op. Exonerada', style: 'totalLabel' },
                    {
                      text: `${currencySymbol} ${money(invoice.totalExempt)}`,
                      style: 'totalValue',
                    },
                  ],
                  [
                    { text: 'Op. Inafecta', style: 'totalLabel' },
                    {
                      text: `${currencySymbol} ${money(invoice.totalUnaffected)}`,
                      style: 'totalValue',
                    },
                  ],
                  [
                    { text: 'IGV (18%)', style: 'totalLabel' },
                    {
                      text: `${currencySymbol} ${money(invoice.totalIgv)}`,
                      style: 'totalValue',
                    },
                  ],
                  [
                    {
                      text: 'TOTAL',
                      style: 'totalLabelBold',
                      fillColor: accent,
                    },
                    {
                      text: `${currencySymbol} ${money(total)}`,
                      style: 'totalValueBold',
                      fillColor: accent,
                    },
                  ],
                ],
              },
              layout: totalsLayout,
            },
          ],
        },

        // Footer separator + legal text
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 3,
              x2: 515,
              y2: 3,
              lineWidth: 0.5,
              lineColor: SLATE_200,
              dash: { length: 4, space: 3 },
            },
          ],
          margin: [0, 24, 0, 6],
        },
        {
          text: 'Representación impresa del comprobante electrónico. Consulte su validez en SUNAT.',
          style: 'footer',
        },
      ],

      styles: {
        companyName: {
          fontSize: 15,
          bold: true,
          color: primary,
          font: 'InterSemiBold',
        },
        companyTrade: {
          fontSize: 9,
          color: SLATE_600,
          margin: [0, 3, 0, 0],
        },
        companyAddress: {
          fontSize: 8,
          color: SLATE_400,
          margin: [0, 3, 0, 0],
        },
        docBoxRuc: {
          fontSize: 8,
          bold: true,
          alignment: 'center',
          color: primaryMuted,
        },
        docBoxTitle: {
          fontSize: 10,
          bold: true,
          alignment: 'center',
          color: WHITE,
          margin: [0, 0, 0, 4],
        },
        docBoxNumber: {
          fontSize: 13,
          bold: true,
          alignment: 'center',
          color: WHITE,
          font: 'InterSemiBold',
        },
        infoLabel: {
          fontSize: 7,
          bold: true,
          color: SLATE_400,
          characterSpacing: 0.3,
        },
        infoValue: {
          fontSize: 9,
          color: SLATE_800,
          margin: [0, 2, 0, 0],
        },
        th: {
          bold: true,
          color: WHITE,
          fontSize: 8,
        },
        amountWords: {
          fontSize: 8,
          italics: true,
          color: SLATE_600,
        },
        totalLabel: {
          fontSize: 8,
          alignment: 'right',
          color: SLATE_600,
        },
        totalValue: {
          fontSize: 8,
          alignment: 'right',
          color: SLATE_800,
        },
        totalLabelBold: {
          fontSize: 10,
          bold: true,
          alignment: 'right',
          color: WHITE,
          font: 'InterSemiBold',
        },
        totalValueBold: {
          fontSize: 10,
          bold: true,
          alignment: 'right',
          color: WHITE,
          font: 'InterSemiBold',
        },
        footer: {
          fontSize: 7,
          color: SLATE_400,
          alignment: 'center',
        },
      },
    };

    return this.pdf.generate(docDefinition);
  }
}

