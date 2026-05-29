import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Public } from 'src/auth';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { CertificatesService } from './certificates.service';
import {
  CertificateVerificationEntity,
  HabilitationCertificateEntity,
} from './entities/certificate.entity';
import { EffectiveCertificateStatus } from './entities/certificate.enums';

@Resolver()
export class CertificatesResolver {
  constructor(private readonly certificates: CertificatesService) {}

  @Query(() => HabilitationCertificateEntity, {
    name: 'myHabilitationCertificate',
    description:
      'Genera (o reutiliza la vigente) la constancia de habilitación del miembro autenticado y devuelve la URL del PDF.',
  })
  myHabilitationCertificate(@CurrentUser() user: JwtPayloadWithAccess) {
    return this.certificates.getMyHabilitation(user.sub);
  }

  @Public()
  @Query(() => CertificateVerificationEntity, {
    name: 'verifyCertificate',
    description:
      'Verificación pública (sin autenticación) de una constancia por folio. Devuelve el estado efectivo y datos básicos del titular.',
  })
  async verifyCertificate(
    @Args('code', { type: () => String }) code: string,
  ): Promise<CertificateVerificationEntity> {
    const result = await this.certificates.verifyByCode(code);
    return {
      ...result,
      status: result.status as EffectiveCertificateStatus,
    };
  }
}
