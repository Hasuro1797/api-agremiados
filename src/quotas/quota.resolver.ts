import { Mutation, Resolver } from '@nestjs/graphql';
import { AdminOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { QuotaService } from './quota.service';

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
}
