import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PaymentStatus } from 'generated/prisma/enums';
import { AdminOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { QuotaService } from './quota.service';
import { QuotaPaymentEntity } from './entities/quota-payment.entity';

@Resolver()
export class QuotaResolver {
  constructor(private readonly quotaService: QuotaService) {}

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'initializeQuotaSystem',
    description:
      'Inicializa el sistema de cuotas: crea el primer periodo y asigna a todos los miembros activos. Requiere QuoteAmount y quotaDueDay configurados.',
  })
  initializeQuotaSystem(@CurrentUser() user: JwtPayloadWithAccess) {
    return this.quotaService.initializeQuotaSystem(user.sub);
  }

  @Query(() => [QuotaPaymentEntity], {
    name: 'myQuotaPayments',
    description:
      'Lista las cuotas del usuario autenticado (con periodo e id) para mostrar/pagar. Filtrable por estado.',
  })
  myQuotaPayments(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('status', { type: () => PaymentStatus, nullable: true })
    status?: PaymentStatus,
  ) {
    return this.quotaService.getMyQuotaPayments(user.sub, status);
  }
}
