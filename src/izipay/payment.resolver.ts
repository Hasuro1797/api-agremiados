import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { PaymentService } from './payment.service';
import { GeneratePaymentTokenInput } from './dto/generate-payment-token.input';
import { ConfirmPaymentInput } from './dto/confirm-payment.input';
import { PaymentTokenEntity } from './entities/payment-token.entity';
import { PaymentResultEntity } from './entities/payment-result.entity';
import { EnrollmentResultEntity } from './entities/enrollment-result.entity';

@Resolver()
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Mutation(() => PaymentTokenEntity, {
    name: 'generatePaymentToken',
    description:
      'Reserva el concepto (cuota o cupo de evento), crea el comprobante PENDIENTE y devuelve el token Izipay (expira en 15 min).',
  })
  generatePaymentToken(
    @Args('input') input: GeneratePaymentTokenInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.paymentService.generatePaymentToken(input, user);
  }

  @Mutation(() => PaymentResultEntity, {
    name: 'confirmPayment',
    description:
      'Callback del formulario Izipay. Valida la firma/transacción y aplica el resultado (idempotente).',
  })
  confirmPayment(@Args('input') input: ConfirmPaymentInput) {
    return this.paymentService.confirmPayment(input);
  }

  @Mutation(() => EnrollmentResultEntity, {
    name: 'enrollFreeActivity',
    description:
      'Inscribe al usuario autenticado en una actividad gratuita (sin pago Izipay). Reserva el cupo de forma atómica.',
  })
  enrollFreeActivity(
    @Args('activityId', { type: () => Int }) activityId: number,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.paymentService.enrollFreeActivity(activityId, user);
  }
}
