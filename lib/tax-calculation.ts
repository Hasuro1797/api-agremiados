/** Catálogo 07 SUNAT — Códigos de afectación del IGV */
export type TipoAfectacionIgv = string;

const IGV_RATE = 0.18;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toFixed2(value: number): string {
  return value.toFixed(2);
}

// ── Clasificadores ──

export function isGravadoOneroso(code: TipoAfectacionIgv): boolean {
  return code === '10';
}

export function isGravadoGratuito(code: TipoAfectacionIgv): boolean {
  return ['11', '12', '13', '14', '15', '16', '17'].includes(code);
}

export function isExoneradoOneroso(code: TipoAfectacionIgv): boolean {
  return code === '20';
}

export function isExoneradoGratuito(code: TipoAfectacionIgv): boolean {
  return code === '21';
}

export function isInafectoOneroso(code: TipoAfectacionIgv): boolean {
  return code === '30';
}

export function isInafectoGratuito(code: TipoAfectacionIgv): boolean {
  return ['31', '32', '33', '34', '35', '36'].includes(code);
}

export function isGratuito(code: TipoAfectacionIgv): boolean {
  return (
    isGravadoGratuito(code) ||
    isExoneradoGratuito(code) ||
    isInafectoGratuito(code)
  );
}

export function isOneroso(code: TipoAfectacionIgv): boolean {
  return (
    isGravadoOneroso(code) ||
    isExoneradoOneroso(code) ||
    isInafectoOneroso(code)
  );
}

// ── Tax Scheme ──

export interface TaxSchemeInfo {
  id: string;
  name: string;
  typeCode: string;
  categoryId: string;
  percent: number;
}

export function getTaxScheme(code: TipoAfectacionIgv): TaxSchemeInfo {
  if (isGravadoOneroso(code))
    return {
      id: '1000',
      name: 'IGV',
      typeCode: 'VAT',
      categoryId: 'S',
      percent: 18,
    };
  if (isExoneradoOneroso(code))
    return {
      id: '9997',
      name: 'EXO',
      typeCode: 'VAT',
      categoryId: 'E',
      percent: 0,
    };
  if (isInafectoOneroso(code))
    return {
      id: '9998',
      name: 'INA',
      typeCode: 'FRE',
      categoryId: 'O',
      percent: 0,
    };
  // Gravado gratuito (11-17): sigue siendo gravado a 18% pero se usa categoryId='Z'
  // para evitar regla 3272 (que exige TaxableAmount=LineExtensionAmount=0 para 'S').
  // Con Z/18%: 18%×base=TaxAmount satisface 3103; TaxAmount≠0 satisface 3111;
  // y 3272 no aplica a categoryId='Z'.
  if (isGravadoGratuito(code))
    return {
      id: '9996',
      name: 'GRA',
      typeCode: 'FRE',
      categoryId: 'Z',
      percent: 18,
    };
  // Exonerado gratuito (21) e inafecto gratuito (31-36): 9996/Z/0%
  return {
    id: '9996',
    name: 'GRA',
    typeCode: 'FRE',
    categoryId: 'Z',
    percent: 0,
  };
}

// ── Validación previa al XML ──

/**
 * Regla SUNAT 3224: En una factura (tipoDoc='01') no se pueden mezclar
 * líneas onerosas con transferencias gratuitas (PriceTypeCode='02').
 * Emitir comprobantes separados.
 */
export function validateDocumentItems(
  tipoDoc: string,
  items: Array<{ tipoAfectacionIgv: TipoAfectacionIgv }>,
): void {
  if (tipoDoc !== '01') return;

  const hasOnerosa = items.some((i) => isOneroso(i.tipoAfectacionIgv));
  const hasGratuita = items.some((i) => isGratuito(i.tipoAfectacionIgv));

  if (hasOnerosa && hasGratuita) {
    throw new Error(
      'Una factura no puede mezclar operaciones onerosas con transferencias gratuitas ' +
        '(regla SUNAT 3224). Emita comprobantes separados.',
    );
  }
}

// ── Cálculos por línea ──

export interface LineCalc {
  lineExtensionAmount: string;
  taxAmount: string;
  taxableAmount: string;
  /** Valor real (cantidad × valorUnitario). Usado solo para ChargeTotalAmount del documento. */
  refTaxableAmount: string;
  price: string;
  pricingReferenceAmount: string;
  pricingReferencePriceTypeCode: string;
  taxScheme: TaxSchemeInfo;
  tipoAfectacionIgv: TipoAfectacionIgv;
  isGratuita: boolean;
}

interface ItemInput {
  cantidad: number;
  valorUnitario: number;
  tipoAfectacionIgv: TipoAfectacionIgv;
}

export function calcLineAmounts(item: ItemInput): LineCalc {
  const code = item.tipoAfectacionIgv;
  const taxScheme = getTaxScheme(code);
  const base = round2(item.cantidad * item.valorUnitario);

  if (isGratuito(code)) {
    // Regla 3224: el trigger es PriceTypeCode='02' + PriceAmount>0.
    // Para evitarlo, PriceAmount=0 para todos los gratuitos.
    // Regla 3105: SUNAT exige al menos un tributo declarado por línea.
    // Se satisface poniendo taxableAmount=base (>0) con TaxScheme=9996.
    // Regla 3272 solo valida TaxableAmount vs LineExtensionAmount para líneas
    // onerosas (PriceTypeCode='01'); no aplica cuando LineExtensionAmount=0.
    const gratuitaTaxAmount = round2(base * (taxScheme.percent / 100));
    // Para todos los gratuitos: TaxableAmount=base.
    // - Códigos 11-17 (Z/18%): 18%×base=TaxAmount satisface regla 3103;
    //   categoryId='Z' evita regla 3272; TaxAmount≠0 satisface regla 3111.
    // - Códigos 21,31-36 (Z/0%): TaxableAmount=base satisface regla 3105.
    const lineTaxableAmount = toFixed2(base);
    return {
      lineExtensionAmount: '0.00',
      taxAmount: toFixed2(gratuitaTaxAmount),
      taxableAmount: lineTaxableAmount,
      refTaxableAmount: toFixed2(base),
      price: '0.00',
      pricingReferenceAmount: '0.00',
      pricingReferencePriceTypeCode: '02',
      taxScheme,
      tipoAfectacionIgv: code,
      isGratuita: true,
    };
  }

  const taxAmount =
    taxScheme.percent > 0 ? round2(base * (taxScheme.percent / 100)) : 0;

  const pricingReferenceAmount =
    taxScheme.percent > 0
      ? round2(item.valorUnitario * (1 + taxScheme.percent / 100))
      : item.valorUnitario;

  return {
    lineExtensionAmount: toFixed2(base),
    taxAmount: toFixed2(taxAmount),
    taxableAmount: toFixed2(base),
    refTaxableAmount: toFixed2(base),
    price: toFixed2(item.valorUnitario),
    pricingReferenceAmount: toFixed2(pricingReferenceAmount),
    pricingReferencePriceTypeCode: '01',
    taxScheme,
    tipoAfectacionIgv: code,
    isGratuita: false,
  };
}

// ── Totales del documento ──

export interface TaxSubtotalGroup {
  taxableAmount: string;
  taxAmount: string;
  taxScheme: TaxSchemeInfo;
}

export interface DocTotals {
  lineExtensionAmount: string;
  totalTaxAmount: number;
  totalIgv: number;
  chargeTotalAmount: number;
  taxInclusiveAmount: string;
  payableAmount: string;
  subtotals: TaxSubtotalGroup[];
}

const GRA_SCHEME: TaxSchemeInfo = {
  id: '9996',
  name: 'GRA',
  typeCode: 'FRE',
  categoryId: 'Z',
  percent: 0,
};

export function calcDocTotals(items: ItemInput[]): DocTotals {
  const lineCalcs = items.map(calcLineAmounts);

  const lineExtensionAmount = round2(
    lineCalcs.reduce((acc, lc) => acc + parseFloat(lc.lineExtensionAmount), 0),
  );

  const onerosaIgv = round2(
    lineCalcs
      .filter((lc) => !lc.isGratuita)
      .reduce((acc, lc) => acc + parseFloat(lc.taxAmount), 0),
  );

  const chargeTotalAmount = round2(
    lineCalcs
      .filter((lc) => lc.isGratuita)
      .reduce((acc, lc) => acc + parseFloat(lc.refTaxableAmount), 0),
  );

  const taxInclusiveAmount = round2(lineExtensionAmount + onerosaIgv);

  const schemeMap = new Map<
    string,
    { taxable: number; tax: number; scheme: TaxSchemeInfo }
  >();
  let hasGratuita = false;
  let gratuitaTaxable = 0;
  let gratuitaTax = 0;

  for (const lc of lineCalcs) {
    if (lc.isGratuita) {
      hasGratuita = true;
      // Usar refTaxableAmount (= base real) porque para gravado gratuito (11-17)
      // taxableAmount=0 a nivel línea (regla 3272), pero el documento debe reflejar
      // el valor real de las operaciones gratuitas (regla 2416).
      gratuitaTaxable = round2(
        gratuitaTaxable + parseFloat(lc.refTaxableAmount),
      );
      gratuitaTax = round2(gratuitaTax + parseFloat(lc.taxAmount));
      continue;
    }
    const existing = schemeMap.get(lc.taxScheme.id);
    if (existing) {
      existing.taxable = round2(
        existing.taxable + parseFloat(lc.taxableAmount),
      );
      existing.tax = round2(existing.tax + parseFloat(lc.taxAmount));
    } else {
      schemeMap.set(lc.taxScheme.id, {
        taxable: parseFloat(lc.taxableAmount),
        tax: parseFloat(lc.taxAmount),
        scheme: lc.taxScheme,
      });
    }
  }

  // Regla SUNAT 2416: si existe leyenda de transferencia gratuita, el TaxSubtotal
  // 9996 del documento debe declarar el total valor de venta de operaciones gratuitas.
  if (hasGratuita) {
    schemeMap.set('9996', {
      taxable: gratuitaTaxable,
      tax: gratuitaTax,
      scheme: GRA_SCHEME,
    });
  }

  const subtotals: TaxSubtotalGroup[] = Array.from(schemeMap.values()).map(
    (g) => ({
      taxableAmount: toFixed2(g.taxable),
      taxAmount: toFixed2(g.tax),
      taxScheme: g.scheme,
    }),
  );

  return {
    lineExtensionAmount: toFixed2(lineExtensionAmount),
    totalTaxAmount: onerosaIgv,
    totalIgv: onerosaIgv,
    chargeTotalAmount,
    taxInclusiveAmount: toFixed2(taxInclusiveAmount),
    payableAmount: toFixed2(taxInclusiveAmount),
    subtotals,
  };
}
