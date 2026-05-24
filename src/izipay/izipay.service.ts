import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { EnvConfig } from 'src/config';
import { TokenInputDto } from './dto/token.input';

@Injectable()
export class IzipayService {
  private readonly logger = new Logger(IzipayService.name);

  constructor(private readonly configService: ConfigService<EnvConfig>) {}

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

  async verifyTransaction(
    transactionId: string,
    orderNumber: string,
  ): Promise<any> {
    try {
      const izipayUrl = this.configService.get('IZIPAY_URL', { infer: true });
      const merchantCode = this.configService.get('IZIPAY_MERCHANT_CODE', {
        infer: true,
      });

      const response = await axios.post(
        `${izipayUrl}/orderinfo/v1/Transaction/Search`,
        {
          merchantCode: merchantCode,
          orderNumber,
          language: 'ESP',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            transactionId,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(
        `No se pudo verificar transacción ${transactionId}: ${error?.message}`,
      );
      return null;
    }
  }
}
