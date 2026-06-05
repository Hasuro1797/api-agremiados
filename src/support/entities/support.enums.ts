import { registerEnumType } from '@nestjs/graphql';
import { Priority, SupportStatus } from 'generated/prisma/enums';

registerEnumType(SupportStatus, {
  name: 'SupportStatus',
  description: 'Estado del reclamo/ticket de soporte',
});

registerEnumType(Priority, {
  name: 'Priority',
  description: 'Prioridad de un reclamo o categoría',
});
