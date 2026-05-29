import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  CertificateStatus,
  CertificateType,
  PaymentStatus,
  UserStatus,
} from 'generated/prisma/enums';
import QRCode from 'qrcode';
import { Readable } from 'stream';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { EnvConfig } from 'src/config';
import { PrismaService } from 'src/db/prisma.service';
import { PdfDocDefinition, PdfService } from 'src/pdf/pdf.service';

const HABILITATION_VALIDITY_DAYS = 30;
const TYPE_PREFIX: Record<CertificateType, string> = {
  HABILITACION: 'HAB',
  COLEGIATURA: 'COL',
  ASISTENCIA: 'ASIS',
  OTROS: 'CONST',
};

export type EffectiveCertificateStatus =
  | 'VIGENTE'
  | 'VENCIDO'
  | 'REVOCADO'
  | 'NO_ENCONTRADO';

export interface CertificateVerificationResult {
  valid: boolean;
  status: EffectiveCertificateStatus;
  code?: string;
  type?: CertificateType;
  holderName?: string;
  holderMemberCode?: string;
  organizationName?: string;
  issuedAt?: Date;
  validUntil?: Date;
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: PdfService,
    private readonly cloudinary: CloudinaryService,
    private readonly config: ConfigService<EnvConfig>,
  ) {}

  /**
   * Devuelve la URL del PDF de la constancia de habilitación del usuario.
   * Reutiliza una vigente si existe; si no, valida elegibilidad, la emite y
   * sube el PDF a Cloudinary.
   */
  async getMyHabilitation(userId: string): Promise<{
    url: string;
    code: string;
    issuedAt: Date;
    validUntil: Date;
  }> {
    // Si ya hay una vigente cacheada, la reutilizamos.
    const cached = await this.prisma.certificate.findFirst({
      where: {
        userId,
        type: CertificateType.HABILITACION,
        status: CertificateStatus.ISSUED,
        validUntil: { gt: new Date() },
        fileUrl: { not: null },
      },
      orderBy: { issuedAt: 'desc' },
    });
    if (cached?.fileUrl && cached.validUntil) {
      return {
        url: cached.fileUrl,
        code: cached.code,
        issuedAt: cached.issuedAt,
        validUntil: cached.validUntil,
      };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    await this.ensureHabilitationEligibility(user);

    const org = await this.prisma.organization.findFirst();
    if (!org) {
      throw new InternalServerErrorException(
        'No hay una organización configurada',
      );
    }

    const issuedAt = new Date();
    const validUntil = new Date(
      issuedAt.getTime() + HABILITATION_VALIDITY_DAYS * 24 * 60 * 60 * 1000,
    );
    const code = await this.generateCode(
      CertificateType.HABILITACION,
      issuedAt.getFullYear(),
    );

    const verifyUrl = this.buildVerifyUrl(code);
    const [logoDataUri, qrDataUri] = await Promise.all([
      org.logo
        ? this.fetchAsDataUri(org.logo)
        : Promise.resolve<string | null>(null),
      QRCode.toDataURL(verifyUrl, { margin: 1, scale: 6 }),
    ]);

    const fullName =
      `${user.name} ${user.paternalSurname} ${user.maternalSurname}`.trim();
    const pdfBuffer = await this.pdf.generate(
      this.buildHabilitationDoc({
        organizationName: org.name,
        primaryColor: org.primaryColor,
        logoDataUri,
        fullName,
        dni: user.dni,
        memberCode: user.memberCode,
        issuedAt,
        validUntil,
        code,
        verifyUrl,
        qrDataUri,
      }),
    );

    const uploaded = await this.cloudinary.upload(Readable.from(pdfBuffer), {
      resource_type: 'raw',
      folder: 'certificates',
      public_id: `${code}.pdf`,
      overwrite: true,
    });

    const certificate = await this.prisma.certificate.create({
      data: {
        userId,
        type: CertificateType.HABILITACION,
        code,
        status: CertificateStatus.ISSUED,
        issuedAt,
        validUntil,
        fileUrl: uploaded.secure_url,
        filePublicId: uploaded.public_id,
      },
    });

    this.logger.log(
      `Constancia de habilitación ${code} emitida para ${userId} (vence ${validUntil.toISOString()})`,
    );

    return {
      url: certificate.fileUrl!,
      code: certificate.code,
      issuedAt: certificate.issuedAt,
      validUntil: certificate.validUntil!,
    };
  }

  /** Verificación pública por folio. No requiere autenticación. */
  async verifyByCode(code: string): Promise<CertificateVerificationResult> {
    if (!code) {
      return { valid: false, status: 'NO_ENCONTRADO' };
    }
    const cert = await this.prisma.certificate.findUnique({
      where: { code },
      include: { user: true },
    });
    if (!cert) {
      return { valid: false, status: 'NO_ENCONTRADO' };
    }

    const org = await this.prisma.organization.findFirst();
    const fullName = cert.user
      ? `${cert.user.name} ${cert.user.paternalSurname} ${cert.user.maternalSurname}`.trim()
      : undefined;

    const status = this.computeEffectiveStatus(cert);
    return {
      valid: status === 'VIGENTE',
      status,
      code: cert.code,
      type: cert.type,
      holderName: fullName,
      holderMemberCode: cert.user?.memberCode ?? undefined,
      organizationName: org?.name,
      issuedAt: cert.issuedAt,
      validUntil: cert.validUntil ?? undefined,
    };
  }

  // ===== helpers =====

  private async ensureHabilitationEligibility(user: {
    id: string;
    status: UserStatus;
  }) {
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Tu cuenta no está activa; no es posible emitir la constancia',
      );
    }
    const overdue = await this.prisma.quotaPayment.count({
      where: {
        userId: user.id,
        status: PaymentStatus.PENDIENTE,
        period: { dueDate: { lt: new Date() } },
      },
    });
    if (overdue > 0) {
      throw new BadRequestException(
        `Tienes ${overdue} cuota(s) vencida(s). Regulariza tu situación para emitir la constancia.`,
      );
    }
  }

  private computeEffectiveStatus(cert: {
    status: CertificateStatus;
    validUntil: Date | null;
  }): EffectiveCertificateStatus {
    if (cert.status === CertificateStatus.REVOKED) return 'REVOCADO';
    if (cert.validUntil && cert.validUntil.getTime() < Date.now())
      return 'VENCIDO';
    return 'VIGENTE';
  }

  /** Genera un código único reintentando ante colisiones del @unique. */
  private async generateCode(
    type: CertificateType,
    year: number,
  ): Promise<string> {
    const prefix = TYPE_PREFIX[type];
    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.certificate.count({
        where: {
          type,
          createdAt: { gte: startOfYear, lt: startOfNextYear },
        },
      });
      const candidate = `${prefix}-${year}-${String(count + 1 + attempt).padStart(6, '0')}`;
      const exists = await this.prisma.certificate.findUnique({
        where: { code: candidate },
      });
      if (!exists) return candidate;
    }
    throw new InternalServerErrorException(
      'No se pudo generar un código único para la constancia',
    );
  }

  private buildVerifyUrl(code: string): string {
    const base =
      this.config.get('FRONTEND_URL', { infer: true })?.replace(/\/$/, '') ??
      '';
    return `${base}/verificar/${code}`;
  }

  private async fetchAsDataUri(url: string): Promise<string | null> {
    try {
      const res = await axios.get<ArrayBuffer>(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      const mime =
        (res.headers['content-type'] as string | undefined) ?? 'image/png';
      return `data:${mime};base64,${Buffer.from(res.data).toString('base64')}`;
    } catch {
      return null;
    }
  }

  /** Estructura pdfmake para la constancia de habilitación. */
  private buildHabilitationDoc(args: {
    organizationName: string;
    primaryColor: string;
    logoDataUri: string | null;
    fullName: string;
    dni: string | null;
    memberCode: string | null;
    issuedAt: Date;
    validUntil: Date;
    code: string;
    verifyUrl: string;
    qrDataUri: string;
  }): PdfDocDefinition {
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat('es-PE', {
        timeZone: 'America/Lima',
        dateStyle: 'long',
      }).format(d);

    const idLine = [
      args.dni ? `DNI ${args.dni}` : null,
      args.memberCode ? `Código Colegial ${args.memberCode}` : null,
    ]
      .filter(Boolean)
      .join(' / ');

    return {
      content: [
        // Encabezado
        args.logoDataUri
          ? {
              image: args.logoDataUri,
              width: 70,
              alignment: 'center',
              margin: [0, 0, 0, 10],
            }
          : { text: '' },
        {
          text: args.organizationName,
          alignment: 'center',
          fontSize: 13,
          bold: true,
          color: args.primaryColor,
        },
        {
          text: 'CONSTANCIA DE HABILITACIÓN',
          alignment: 'center',
          fontSize: 18,
          bold: true,
          margin: [0, 24, 0, 24],
        },

        // Cuerpo
        {
          text: `El ${args.organizationName}, en uso de sus atribuciones,`,
          margin: [0, 0, 0, 12],
        },
        { text: 'CERTIFICA:', bold: true, margin: [0, 0, 0, 12] },
        {
          text: [
            'Que el(la) Sr.(a) ',
            { text: args.fullName, bold: true },
            idLine ? `, identificado(a) con ${idLine}, ` : ', ',
            'se encuentra al día en sus obligaciones para con esta institución, ',
            'y por lo tanto se encuentra ',
            { text: 'HABILITADO(A)', bold: true, color: args.primaryColor },
            ' para el ejercicio profesional.',
          ],
          alignment: 'justify',
          lineHeight: 1.4,
          margin: [0, 0, 0, 20],
        },
        {
          text: `Se expide la presente constancia a solicitud del interesado, el ${fmt(args.issuedAt)}.`,
          alignment: 'justify',
          margin: [0, 0, 0, 30],
        },

        // Pie con folio + QR
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: `Folio: ${args.code}`, bold: true, fontSize: 11 },
                {
                  text: `Vigencia hasta: ${fmt(args.validUntil)}`,
                  fontSize: 10,
                  margin: [0, 4, 0, 0],
                },
                {
                  text: 'Verificar autenticidad en:',
                  fontSize: 8,
                  color: '#666666',
                  margin: [0, 12, 0, 0],
                },
                { text: args.verifyUrl, fontSize: 8, color: '#666666' },
              ],
            },
            {
              width: 100,
              image: args.qrDataUri,
              alignment: 'right',
            },
          ],
        },
      ],
    };
  }
}
