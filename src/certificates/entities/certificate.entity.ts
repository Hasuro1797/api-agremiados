import { Field, ObjectType } from '@nestjs/graphql';
import { CertificateType } from 'generated/prisma/enums';
import { EffectiveCertificateStatus } from './certificate.enums';
import './certificate.enums';

@ObjectType({ description: 'Constancia generada (resultado para el miembro)' })
export class HabilitationCertificateEntity {
  @Field(() => String, { description: 'URL del PDF (Cloudinary)' })
  url!: string;

  @Field(() => String, { description: 'Folio único (ej. HAB-2026-000001)' })
  code!: string;

  @Field(() => Date)
  issuedAt!: Date;

  @Field(() => Date)
  validUntil!: Date;
}

@ObjectType({
  description: 'Resultado de verificación pública de una constancia por folio',
})
export class CertificateVerificationEntity {
  @Field(() => Boolean, {
    description: 'Es válida y vigente al momento de la consulta',
  })
  valid!: boolean;

  @Field(() => EffectiveCertificateStatus)
  status!: EffectiveCertificateStatus;

  @Field(() => String, { nullable: true })
  code?: string;

  @Field(() => CertificateType, { nullable: true })
  type?: CertificateType;

  @Field(() => String, { nullable: true })
  holderName?: string;

  @Field(() => String, { nullable: true })
  holderMemberCode?: string;

  @Field(() => String, { nullable: true })
  organizationName?: string;

  @Field(() => Date, { nullable: true })
  issuedAt?: Date;

  @Field(() => Date, { nullable: true })
  validUntil?: Date;
}
