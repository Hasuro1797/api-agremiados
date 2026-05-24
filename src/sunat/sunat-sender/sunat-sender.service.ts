import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';

interface SoapResponse {
  Envelope?: {
    Body?: {
      sendBillResponse?: {
        applicationResponse?: string;
      };
      Fault?: {
        faultstring?: string;
        faultcode?: string;
      };
    };
  };
}

// Endpoints SUNAT del servicio de facturas (sendBill).
export const SUNAT_BETA_URL =
  'https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService';
export const SUNAT_PROD_URL =
  'https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService';

@Injectable()
export class SunatSenderService {
  private readonly logger = new Logger(SunatSenderService.name);
  private readonly sunatURL: string;
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  constructor(
    private readonly configService: ConfigService<EnvConfig>,
    private readonly httpService: HttpService,
  ) {
    // Quitar ?wsdl del endpoint - ?wsdl es para descargar la definición del servicio,
    // no para enviar SOAP requests
    const rawUrl = this.configService.get('SUNAT_WSDL', { infer: true })!;
    this.sunatURL = rawUrl.replace(/\?wsdl$/i, '');
  }

  /** Devuelve el endpoint según el entorno (producción vs beta/homologación). */
  resolveEndpoint(production: boolean): string {
    return production ? SUNAT_PROD_URL : SUNAT_BETA_URL;
  }

  async sendBill(
    company: { ruc: string; solUser: string; solPass: string },
    fileName: string,
    zipBuffer: Buffer,
    endpointUrl?: string,
  ): Promise<{
    success: boolean;
    cdrZip?: Buffer;
    error?: string;
    sunatCode?: string;
  }> {
    const targetUrl = endpointUrl ?? this.sunatURL;
    const zipBase64 = zipBuffer.toString('base64');
    const usernameToken = company.ruc + company.solUser;

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe" xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
  <soapenv:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${usernameToken}</wsse:Username>
        <wsse:Password>${company.solPass}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${fileName}</fileName>
      <contentFile>${zipBase64}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      this.logger.log(`Enviando ${fileName} a SUNAT: ${targetUrl}`);

      const response = await lastValueFrom(
        this.httpService.post(targetUrl, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            SOAPAction: 'urn:sendBill',
          },
          // Aceptar cualquier status para poder leer SOAP Faults
          validateStatus: () => true,
        }),
      );

      const result = this.parser.parse(response.data as string) as SoapResponse;

      // Verificar si es un SOAP Fault (puede venir con HTTP 200 o 500)
      const fault = result?.Envelope?.Body?.Fault;
      if (fault) {
        const code = fault.faultcode?.toString() || '';
        const message = fault.faultstring?.toString() || '';
        this.logger.warn(`SUNAT Fault: [${code}] ${message}`);
        return { success: false, error: message, sunatCode: code };
      }

      // Buscar la respuesta exitosa (CDR)
      const appResponse =
        result?.Envelope?.Body?.sendBillResponse?.applicationResponse;

      if (appResponse) {
        return { success: true, cdrZip: Buffer.from(appResponse, 'base64') };
      }

      this.logger.error(
        'Respuesta SUNAT sin CDR ni Fault:',
        JSON.stringify(result),
      );
      return {
        success: false,
        error: 'SUNAT respondió sin CDR ni error detallado',
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error de red/conexión: ${message}`);
      return { success: false, error: message };
    }
  }
}
