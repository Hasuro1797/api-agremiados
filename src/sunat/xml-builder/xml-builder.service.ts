import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { numeroALetras } from 'lib/number_to_letters';
import {
  calcDocTotals,
  calcLineAmounts,
  type TipoAfectacionIgv,
} from 'lib/tax-calculation';

export interface CompanyDto {
  ruc: string;
  razonSocial: string;
  comercialName?: string;
  ubigeo?: string;
  address?: string;
}

export interface InvoiceItemDto {
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  tipoAfectacionIgv: TipoAfectacionIgv;
  unitCode?: string;
}

export interface InvoiceDto {
  /** Código SUNAT: '01'=Factura, '03'=Boleta, '07'=NC, '08'=ND */
  tipoDoc: string;
  serie: string;
  correlativo: string;
  fechaEmision: string; // 'YYYY-MM-DD'
  moneda: string; // 'PEN' | 'USD'
  clienteTipoDoc: string; // Catálogo 06: '6'=RUC, '1'=DNI, etc.
  clienteNumDoc: string;
  clienteRazon: string;
  items: InvoiceItemDto[];
  /** Referencia para NC/ND: serie y correlativo del comprobante original */
  docReferencia?: { tipoDoc: string; serie: string; correlativo: string };
}

export interface CreditNoteDto extends InvoiceDto {
  /** Catálogo 09 SUNAT: 01=Anulación de la operación, 07=Devolución, etc. */
  motivoCode: string;
  motivoDescription: string;
  /** Comprobante original al que afecta la NC (obligatorio). */
  docReferencia: { tipoDoc: string; serie: string; correlativo: string };
}

function toFixed2(value: number): string {
  return value.toFixed(2);
}

@Injectable()
export class XmlBuilderService {
  buildInvoiceXml(invoiceData: InvoiceDto, company: CompanyDto): string {
    const items = invoiceData.items;
    const docTotals = calcDocTotals(items);

    // NOTA: NO declarar xmlns:ds aquí. xml-crypto lo agrega automáticamente
    // en el elemento Signature. Declararlo en el root causa un bug de
    // canonicalización exclusiva (exc-c14n) que invalida el digest.
    const xml = create({
      version: '1.0',
      encoding: 'UTF-8',
    }).ele('Invoice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:ext':
        'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    });

    // 1. UBL Extensions (firma digital)
    const ublExtensions = xml.ele('ext:UBLExtensions');
    ublExtensions.ele('ext:UBLExtension').ele('ext:ExtensionContent').txt(' ');

    // 2. Cabecera
    xml.ele('cbc:UBLVersionID').txt('2.1');
    xml.ele('cbc:CustomizationID').txt('2.0');
    xml.ele('cbc:ID').txt(`${invoiceData.serie}-${invoiceData.correlativo}`);
    xml.ele('cbc:IssueDate').txt(invoiceData.fechaEmision);
    xml.ele('cbc:IssueTime').txt('00:00:00');
    xml
      .ele('cbc:InvoiceTypeCode', {
        listAgencyName: 'PE:SUNAT',
        listName: 'Tipo de Documento',
        listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
        listID: '0101',
        listSchemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo51',
      })
      .txt(invoiceData.tipoDoc);

    xml
      .ele('cbc:Note', { languageLocaleID: '1000' })
      .txt(numeroALetras(parseFloat(docTotals.payableAmount)));

    // Leyenda 1002 obligatoria cuando hay operaciones gratuitas (regla SUNAT)
    if (docTotals.chargeTotalAmount > 0) {
      xml
        .ele('cbc:Note', { languageLocaleID: '1002' })
        .txt(
          'TRANSFERENCIA GRATUITA DE UN BIEN Y/O SERVICIO PRESTADO GRATUITAMENTE',
        );
    }

    xml
      .ele('cbc:DocumentCurrencyCode', {
        listID: 'ISO 4217 Alpha',
        listName: 'Currency',
        listAgencyName: 'United Nations Economic Commission for Europe',
      })
      .txt(invoiceData.moneda);

    // 3. Firma UBL (referencia, no la firma digital XML)
    const signature = xml.ele('cac:Signature');
    signature.ele('cbc:ID').txt(`IDSign${company.ruc}`);
    const signatoryParty = signature.ele('cac:SignatoryParty');
    signatoryParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID')
      .txt(company.ruc);
    signatoryParty
      .ele('cac:PartyName')
      .ele('cbc:Name')
      .txt(company.razonSocial);
    signature
      .ele('cac:DigitalSignatureAttachment')
      .ele('cac:ExternalReference')
      .ele('cbc:URI')
      .txt(`#IDSign${company.ruc}`);

    // 4. Emisor
    const supplier = xml.ele('cac:AccountingSupplierParty');
    const supplierParty = supplier.ele('cac:Party');
    supplierParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID', {
        schemeID: '6',
        schemeName: 'Documento de Identidad',
        schemeAgencyName: 'PE:SUNAT',
        schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
      })
      .txt(company.ruc);
    supplierParty.ele('cac:PartyName').ele('cbc:Name').txt(company.razonSocial);
    const supplierLegal = supplierParty.ele('cac:PartyLegalEntity');
    supplierLegal.ele('cbc:RegistrationName').txt(company.razonSocial);
    supplierLegal
      .ele('cac:RegistrationAddress')
      .ele('cbc:AddressTypeCode')
      .txt('0000');

    // 5. Cliente
    const customer = xml.ele('cac:AccountingCustomerParty');
    const customerParty = customer.ele('cac:Party');
    customerParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID', {
        schemeID: invoiceData.clienteTipoDoc,
        schemeName: 'Documento de Identidad',
        schemeAgencyName: 'PE:SUNAT',
        schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
      })
      .txt(invoiceData.clienteNumDoc);
    customerParty
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName')
      .txt(invoiceData.clienteRazon);

    // 6. Forma de pago (obligatorio desde RS 193-2020/SUNAT)
    const paymentTerms = xml.ele('cac:PaymentTerms');
    paymentTerms.ele('cbc:ID').txt('FormaPago');
    paymentTerms.ele('cbc:PaymentMeansID').txt('Contado');

    // 7. Impuestos del documento
    const taxTotal = xml.ele('cac:TaxTotal');
    taxTotal
      .ele('cbc:TaxAmount', { currencyID: invoiceData.moneda })
      .txt(toFixed2(docTotals.totalTaxAmount));

    for (const subtotal of docTotals.subtotals) {
      taxTotal
        .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: invoiceData.moneda })
        .txt(subtotal.taxableAmount)
        .up()
        .ele('cbc:TaxAmount', { currencyID: invoiceData.moneda })
        .txt(subtotal.taxAmount)
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5305',
          schemeName: 'Tax Category Identifier',
          schemeAgencyName: 'United Nations Economic Commission for Europe',
        })
        .txt(subtotal.taxScheme.categoryId)
        .up()
        .ele('cbc:Percent')
        .txt(subtotal.taxScheme.percent.toString())
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5153',
          schemeAgencyID: '6',
        })
        .txt(subtotal.taxScheme.id)
        .up()
        .ele('cbc:Name')
        .txt(subtotal.taxScheme.name)
        .up()
        .ele('cbc:TaxTypeCode')
        .txt(subtotal.taxScheme.typeCode);
    }

    // 8. Totales monetarios
    const legalMonetary = xml.ele('cac:LegalMonetaryTotal');
    legalMonetary
      .ele('cbc:LineExtensionAmount', { currencyID: invoiceData.moneda })
      .txt(docTotals.lineExtensionAmount);
    legalMonetary
      .ele('cbc:TaxInclusiveAmount', { currencyID: invoiceData.moneda })
      .txt(docTotals.taxInclusiveAmount);
    if (docTotals.chargeTotalAmount > 0) {
      legalMonetary
        .ele('cbc:ChargeTotalAmount', { currencyID: invoiceData.moneda })
        .txt(toFixed2(docTotals.chargeTotalAmount));
    }
    legalMonetary
      .ele('cbc:PayableAmount', { currencyID: invoiceData.moneda })
      .txt(docTotals.payableAmount);

    // 9. Líneas
    items.forEach((item, index) => {
      const lineCalc = calcLineAmounts(item);

      const line = xml.ele('cac:InvoiceLine');
      line.ele('cbc:ID').txt((index + 1).toString());
      line
        .ele('cbc:InvoicedQuantity', {
          unitCode: 'NIU',
          unitCodeListID: 'UN/ECE rec 20',
          unitCodeListAgencyName:
            'United Nations Economic Commission for Europe',
        })
        .txt(item.cantidad.toString());
      line
        .ele('cbc:LineExtensionAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.lineExtensionAmount);

      // PricingReference
      const pricing = line.ele('cac:PricingReference');
      pricing
        .ele('cac:AlternativeConditionPrice')
        .ele('cbc:PriceAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.pricingReferenceAmount)
        .up()
        .ele('cbc:PriceTypeCode', {
          listName: 'Tipo de Precio',
          listAgencyName: 'PE:SUNAT',
          listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16',
        })
        .txt(lineCalc.pricingReferencePriceTypeCode);

      // TaxTotal por línea
      const lineTaxTotal = line.ele('cac:TaxTotal');
      lineTaxTotal
        .ele('cbc:TaxAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.taxAmount);
      lineTaxTotal
        .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.taxableAmount)
        .up()
        .ele('cbc:TaxAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.taxAmount)
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5305',
          schemeName: 'Tax Category Identifier',
          schemeAgencyName: 'United Nations Economic Commission for Europe',
        })
        .txt(lineCalc.taxScheme.categoryId)
        .up()
        .ele('cbc:Percent')
        .txt(lineCalc.taxScheme.percent.toString())
        .up()
        .ele('cbc:TaxExemptionReasonCode', {
          listAgencyName: 'PE:SUNAT',
          listName: 'Afectacion del IGV',
          listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07',
        })
        .txt(lineCalc.tipoAfectacionIgv)
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5153',
          schemeAgencyID: '6',
        })
        .txt(lineCalc.taxScheme.id)
        .up()
        .ele('cbc:Name')
        .txt(lineCalc.taxScheme.name)
        .up()
        .ele('cbc:TaxTypeCode')
        .txt(lineCalc.taxScheme.typeCode);

      line.ele('cac:Item').ele('cbc:Description').txt(item.descripcion);

      line
        .ele('cac:Price')
        .ele('cbc:PriceAmount', { currencyID: invoiceData.moneda })
        .txt(lineCalc.price);
    });

    return xml.end({ prettyPrint: true });
  }

  /**
   * Construye el XML UBL 2.1 de una Nota de Crédito (CreditNote-2), referenciando
   * el comprobante original y declarando el motivo (Catálogo 09).
   */
  buildCreditNoteXml(noteData: CreditNoteDto, company: CompanyDto): string {
    const items = noteData.items;
    const docTotals = calcDocTotals(items);

    const xml = create({ version: '1.0', encoding: 'UTF-8' }).ele(
      'CreditNote',
      {
        xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2',
        'xmlns:cac':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
        'xmlns:ext':
          'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
      },
    );

    // 1. UBL Extensions (firma)
    const ublExtensions = xml.ele('ext:UBLExtensions');
    ublExtensions.ele('ext:UBLExtension').ele('ext:ExtensionContent').txt(' ');

    // 2. Cabecera
    xml.ele('cbc:UBLVersionID').txt('2.1');
    xml.ele('cbc:CustomizationID').txt('2.0');
    xml.ele('cbc:ID').txt(`${noteData.serie}-${noteData.correlativo}`);
    xml.ele('cbc:IssueDate').txt(noteData.fechaEmision);
    xml.ele('cbc:IssueTime').txt('00:00:00');
    xml
      .ele('cbc:Note', { languageLocaleID: '1000' })
      .txt(numeroALetras(parseFloat(docTotals.payableAmount)));
    xml
      .ele('cbc:DocumentCurrencyCode', {
        listID: 'ISO 4217 Alpha',
        listName: 'Currency',
        listAgencyName: 'United Nations Economic Commission for Europe',
      })
      .txt(noteData.moneda);

    // 3. Motivo / sustento (Catálogo 09)
    const discrepancy = xml.ele('cac:DiscrepancyResponse');
    discrepancy
      .ele('cbc:ReferenceID')
      .txt(
        `${noteData.docReferencia.serie}-${noteData.docReferencia.correlativo}`,
      );
    discrepancy.ele('cbc:ResponseCode').txt(noteData.motivoCode);
    discrepancy.ele('cbc:Description').txt(noteData.motivoDescription);

    // 4. Referencia al comprobante original
    const billingRef = xml.ele('cac:BillingReference');
    const docRef = billingRef.ele('cac:InvoiceDocumentReference');
    docRef
      .ele('cbc:ID')
      .txt(
        `${noteData.docReferencia.serie}-${noteData.docReferencia.correlativo}`,
      );
    docRef
      .ele('cbc:DocumentTypeCode', {
        listAgencyName: 'PE:SUNAT',
        listName: 'Tipo de Documento',
        listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
      })
      .txt(noteData.docReferencia.tipoDoc);

    // 5. Firma UBL (referencia)
    const signature = xml.ele('cac:Signature');
    signature.ele('cbc:ID').txt(`IDSign${company.ruc}`);
    const signatoryParty = signature.ele('cac:SignatoryParty');
    signatoryParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID')
      .txt(company.ruc);
    signatoryParty
      .ele('cac:PartyName')
      .ele('cbc:Name')
      .txt(company.razonSocial);
    signature
      .ele('cac:DigitalSignatureAttachment')
      .ele('cac:ExternalReference')
      .ele('cbc:URI')
      .txt(`#IDSign${company.ruc}`);

    // 6. Emisor
    const supplier = xml.ele('cac:AccountingSupplierParty');
    const supplierParty = supplier.ele('cac:Party');
    supplierParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID', {
        schemeID: '6',
        schemeName: 'Documento de Identidad',
        schemeAgencyName: 'PE:SUNAT',
        schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
      })
      .txt(company.ruc);
    supplierParty
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName')
      .txt(company.razonSocial);

    // 7. Cliente
    const customer = xml.ele('cac:AccountingCustomerParty');
    const customerParty = customer.ele('cac:Party');
    customerParty
      .ele('cac:PartyIdentification')
      .ele('cbc:ID', {
        schemeID: noteData.clienteTipoDoc,
        schemeName: 'Documento de Identidad',
        schemeAgencyName: 'PE:SUNAT',
        schemeURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
      })
      .txt(noteData.clienteNumDoc);
    customerParty
      .ele('cac:PartyLegalEntity')
      .ele('cbc:RegistrationName')
      .txt(noteData.clienteRazon);

    // 8. Impuestos del documento
    const taxTotal = xml.ele('cac:TaxTotal');
    taxTotal
      .ele('cbc:TaxAmount', { currencyID: noteData.moneda })
      .txt(toFixed2(docTotals.totalTaxAmount));
    for (const subtotal of docTotals.subtotals) {
      taxTotal
        .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: noteData.moneda })
        .txt(subtotal.taxableAmount)
        .up()
        .ele('cbc:TaxAmount', { currencyID: noteData.moneda })
        .txt(subtotal.taxAmount)
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5305',
          schemeName: 'Tax Category Identifier',
          schemeAgencyName: 'United Nations Economic Commission for Europe',
        })
        .txt(subtotal.taxScheme.categoryId)
        .up()
        .ele('cbc:Percent')
        .txt(subtotal.taxScheme.percent.toString())
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', { schemeID: 'UN/ECE 5153', schemeAgencyID: '6' })
        .txt(subtotal.taxScheme.id)
        .up()
        .ele('cbc:Name')
        .txt(subtotal.taxScheme.name)
        .up()
        .ele('cbc:TaxTypeCode')
        .txt(subtotal.taxScheme.typeCode);
    }

    // 9. Totales monetarios
    const legalMonetary = xml.ele('cac:LegalMonetaryTotal');
    legalMonetary
      .ele('cbc:LineExtensionAmount', { currencyID: noteData.moneda })
      .txt(docTotals.lineExtensionAmount);
    legalMonetary
      .ele('cbc:TaxInclusiveAmount', { currencyID: noteData.moneda })
      .txt(docTotals.taxInclusiveAmount);
    legalMonetary
      .ele('cbc:PayableAmount', { currencyID: noteData.moneda })
      .txt(docTotals.payableAmount);

    // 10. Líneas (CreditNoteLine)
    items.forEach((item, index) => {
      const lineCalc = calcLineAmounts(item);
      const line = xml.ele('cac:CreditNoteLine');
      line.ele('cbc:ID').txt((index + 1).toString());
      line
        .ele('cbc:CreditedQuantity', {
          unitCode: item.unitCode ?? 'NIU',
          unitCodeListID: 'UN/ECE rec 20',
          unitCodeListAgencyName:
            'United Nations Economic Commission for Europe',
        })
        .txt(item.cantidad.toString());
      line
        .ele('cbc:LineExtensionAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.lineExtensionAmount);

      const pricing = line.ele('cac:PricingReference');
      pricing
        .ele('cac:AlternativeConditionPrice')
        .ele('cbc:PriceAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.pricingReferenceAmount)
        .up()
        .ele('cbc:PriceTypeCode', {
          listName: 'Tipo de Precio',
          listAgencyName: 'PE:SUNAT',
          listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16',
        })
        .txt(lineCalc.pricingReferencePriceTypeCode);

      const lineTaxTotal = line.ele('cac:TaxTotal');
      lineTaxTotal
        .ele('cbc:TaxAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.taxAmount);
      lineTaxTotal
        .ele('cac:TaxSubtotal')
        .ele('cbc:TaxableAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.taxableAmount)
        .up()
        .ele('cbc:TaxAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.taxAmount)
        .up()
        .ele('cac:TaxCategory')
        .ele('cbc:ID', {
          schemeID: 'UN/ECE 5305',
          schemeName: 'Tax Category Identifier',
          schemeAgencyName: 'United Nations Economic Commission for Europe',
        })
        .txt(lineCalc.taxScheme.categoryId)
        .up()
        .ele('cbc:Percent')
        .txt(lineCalc.taxScheme.percent.toString())
        .up()
        .ele('cbc:TaxExemptionReasonCode', {
          listAgencyName: 'PE:SUNAT',
          listName: 'Afectacion del IGV',
          listURI: 'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07',
        })
        .txt(lineCalc.tipoAfectacionIgv)
        .up()
        .ele('cac:TaxScheme')
        .ele('cbc:ID', { schemeID: 'UN/ECE 5153', schemeAgencyID: '6' })
        .txt(lineCalc.taxScheme.id)
        .up()
        .ele('cbc:Name')
        .txt(lineCalc.taxScheme.name)
        .up()
        .ele('cbc:TaxTypeCode')
        .txt(lineCalc.taxScheme.typeCode);

      line.ele('cac:Item').ele('cbc:Description').txt(item.descripcion);
      line
        .ele('cac:Price')
        .ele('cbc:PriceAmount', { currencyID: noteData.moneda })
        .txt(lineCalc.price);
    });

    return xml.end({ prettyPrint: true });
  }
}
