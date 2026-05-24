import { registerEnumType } from '@nestjs/graphql';

export enum PaymentTargetType {
  QUOTA = 'QUOTA', // pago de una cuota de membresía (QuotaPayment)
  ACTIVITY = 'ACTIVITY', // inscripción + pago de un evento (ActivityAttendee)
}

registerEnumType(PaymentTargetType, {
  name: 'PaymentTargetType',
  description: 'Tipo de concepto que se está pagando',
});
