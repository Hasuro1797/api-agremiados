import { registerEnumType } from '@nestjs/graphql';
import { CertificateStatus, CertificateType } from 'generated/prisma/enums';

registerEnumType(CertificateType, {
  name: 'CertificateType',
  description: 'Tipo de constancia (habilitación, colegiatura, asistencia)',
});

registerEnumType(CertificateStatus, {
  name: 'CertificateStatus',
  description: 'Estado almacenado de la constancia',
});

export enum EffectiveCertificateStatus {
  VIGENTE = 'VIGENTE',
  VENCIDO = 'VENCIDO',
  REVOCADO = 'REVOCADO',
  NO_ENCONTRADO = 'NO_ENCONTRADO',
}

registerEnumType(EffectiveCertificateStatus, {
  name: 'EffectiveCertificateStatus',
  description:
    'Estado efectivo de la constancia al momento de la consulta (incluye vencimiento)',
});
