import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EnvConfig } from 'src/config';
import { TokenInputDto } from './dto/token.input';

/** Datos de una orden obtenidos del endpoint Search (/orderinfo). */
export interface IzipayOrderInfo {
  code: string;
  orderNumber: string;
  uniqueId: string; // id único Izipay de la compra aprobada
  referenceNumber: string; // número de referencia del adquiriente
  authorizationCode: string; // codeAuth del emisor
  amount: number;
  currency: string;
  payMethod: string; // CARD, QR, YAPE_CODE, ...
  transactionDatetime: string; // ISO reconstruido de date/time de la trx
  raw: unknown;
}

/** Parámetros para anular (cancel) una transacción no liquidada. */
export interface IzipayCancelParams {
  transactionId: string;
  orderNumber: string;
  currency: string;
  amount: number;
  payMethod: string;
  channel?: string;
  uniqueId: string;
  authorizationCode: string;
  transactionDatetime: string;
}

/** Parámetros para devolver (refund) una transacción ya liquidada. */
export interface IzipayRefundParams {
  transactionId: string;
  ruc: string;
  idUnique: string;
  authorizationCode: string;
  referenceNumber: string;
  currency: string;
  refundAmount: number;
}

@Injectable()
export class IzipayService {
  private readonly logger = new Logger(IzipayService.name);

  constructor(private readonly configService: ConfigService<EnvConfig>) {}

  private get izipayUrl(): string {
    return this.configService.get('IZIPAY_URL', { infer: true })!;
  }

  private get merchantCode(): string {
    return this.configService.get('IZIPAY_MERCHANT_CODE', { infer: true })!;
  }

  /** API key (Bearer) para endpoints de gestión. Cae a IZIPAY_PUBLIC_KEY. */
  private get apiKey(): string {
    return (
      this.configService.get('IZIPAY_API_KEY', { infer: true }) ??
      this.configService.get('IZIPAY_PUBLIC_KEY', { infer: true })!
    );
  }

  private managementHeaders(transactionId: string) {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: this.apiKey,
      transactionId,
    };
  }

  async generateToken(body: TokenInputDto) {
    const { transactionId, ...rest } = body;
    try {
      const izipayUrl = this.configService.get('IZIPAY_URL', { infer: true });
      const merchantCode = this.configService.get('IZIPAY_MERCHANT_CODE', {
        infer: true,
      });
      const publicKey = this.configService.get('IZIPAY_PUBLIC_KEY', {
        infer: true,
      });
      console.log('Generating Izipay token with data:', {
        ...rest,
        merchantCode,
        publicKey,
        transactionId,
        izipayUrl,
      });
      const response = await axios.post(
        `${izipayUrl}/security/v1/Token/Generate`,
        {
          ...rest,
          merchantCode: merchantCode,
          publicKey: publicKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            transactionId: transactionId,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Error generating Izipay token:', error.message);
      throw new BadRequestException(error);
    }
  }

  /** Llamada cruda al endpoint Search (/orderinfo). Devuelve null si falla. */
  private async searchOrderRaw(
    orderNumber: string,
    transactionId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.izipayUrl}/orderinfo/v1/Transaction/Search`,
        {
          merchantCode: this.merchantCode,
          numberOrden: orderNumber, // el campo correcto es numberOrden (no orderNumber)
          language: 'ESP',
        },
        { headers: this.managementHeaders(transactionId) },
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(
        `No se pudo consultar la orden ${orderNumber} (trx ${transactionId}): ${error?.message}`,
      );
      return null;
    }
  }

  /**
   * Verifica el estado de una transacción consultando la orden en Izipay.
   * Se mantiene por compatibilidad con el flujo de confirmación de pago.
   */
  async verifyTransaction(
    transactionId: string,
    orderNumber: string,
  ): Promise<any> {
    return this.searchOrderRaw(orderNumber, transactionId);
  }

  /**
   * Consulta una orden y devuelve los datos que necesitan Anulación/Devolución
   * (uniqueId, referenceNumber, codeAuth, monto, etc.). null si no se encontró.
   */
  async searchOrder(
    orderNumber: string,
    transactionId: string,
  ): Promise<IzipayOrderInfo | null> {
    const data = await this.searchOrderRaw(orderNumber, transactionId);
    if (!data) return null;

    const response = data.response ?? data;
    const order = response?.order?.[0] ?? response?.order ?? {};
    const uniqueId = (order.uniqueId ?? '').toString();
    if (!uniqueId) {
      this.logger.warn(
        `Search de la orden ${orderNumber} no devolvió uniqueId`,
      );
      return null;
    }

    return {
      code: (data.code ?? '').toString(),
      orderNumber: (order.orderNumber ?? orderNumber).toString(),
      uniqueId,
      referenceNumber: (order.referenceNumber ?? '').toString(),
      authorizationCode: (order.codeAuth ?? '').toString(),
      amount: Number(order.amount ?? 0),
      currency: (order.currency ?? 'PEN').toString(),
      payMethod: (order.payMethodAuthorization ?? 'CARD').toString(),
      transactionDatetime: this.composeDatetime(
        order.dateTransaction ? String(order.dateTransaction) : undefined,
        order.timeTransaction ? String(order.timeTransaction) : undefined,
      ),
      raw: data,
    };
  }

  /** Anulación: deshace una transacción NO liquidada (mismo día). */
  async cancelTransaction(params: IzipayCancelParams): Promise<any> {
    const response = await axios.post(
      `${this.izipayUrl}/cancel/api/Transaction/Cancel`,
      {
        merchantCode: this.merchantCode,
        order: {
          orderNumber: params.orderNumber,
          currency: params.currency,
          amount: params.amount.toFixed(2),
          payMethod: params.payMethod,
          channel: params.channel ?? 'ecommerce',
          uniqueId: params.uniqueId,
          authorizationCode: params.authorizationCode,
          transactionDatetime: params.transactionDatetime,
        },
        language: 'ESP',
      },
      { headers: this.managementHeaders(params.transactionId) },
    );
    return response.data;
  }

  /** Devolución: reembolsa una transacción ya liquidada (soporta parcial). */
  async refundTransaction(params: IzipayRefundParams): Promise<any> {
    const response = await axios.post(
      `${this.izipayUrl}/refund/v1/Transaction/Refund`,
      {
        merchantCode: this.merchantCode,
        ruc: params.ruc,
        idUnique: params.idUnique,
        order: {
          authorizationCode: params.authorizationCode,
          referenceNumber: params.referenceNumber,
          currency: params.currency,
          refundAmount: params.refundAmount.toFixed(2),
          totalAmount: '',
          transactionDate: '',
        },
        card: { brand: '', firstSixDigits: '', lastFourDigits: '' },
        language: 'ESP',
      },
      { headers: this.managementHeaders(params.transactionId) },
    );
    return response.data;
  }

  /** Reconstruye un ISO datetime a partir de dateTransaction (YYYYMMDD) y
   * timeTransaction (HHmmss) del Search. Cae a "ahora" si faltan. */
  private composeDatetime(date?: string, time?: string): string {
    if (date && /^\d{8}$/.test(date)) {
      const y = date.slice(0, 4);
      const m = date.slice(4, 6);
      const d = date.slice(6, 8);
      const t = (time ?? '000000').padEnd(6, '0').slice(0, 6);
      const hh = t.slice(0, 2);
      const mm = t.slice(2, 4);
      const ss = t.slice(4, 6);
      return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    }
    return new Date().toISOString().slice(0, 19);
  }
}
