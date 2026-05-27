import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { PaymentService } from './payment.service';
import { GeneratePaymentTokenInput } from './dto/generate-payment-token.input';
import { ConfirmPaymentInput } from './dto/confirm-payment.input';
import { PreviewPaymentInput } from './dto/preview-payment.input';
import { PaymentTokenEntity } from './entities/payment-token.entity';
import { PaymentResultEntity } from './entities/payment-result.entity';
import { EnrollmentResultEntity } from './entities/enrollment-result.entity';
import { PaymentPreviewEntity } from './entities/payment-preview.entity';

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

  @Query(() => PaymentPreviewEntity, {
    name: 'previewPayment',
    description:
      'Calcula el desglose del pago (subtotal, descuento, IGV, total) sin crear reserva, marcar cuotas, generar comprobante ni llamar a Izipay. Idempotente; pensada para refrescar el total mientras el usuario edita la selección.',
  })
  previewPayment(
    @Args('input') input: PreviewPaymentInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.paymentService.previewPayment(input, user);
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

  @Mutation(() => PaymentResultEntity, {
    name: 'devConfirmPayment',
    description:
      '[SOLO DESARROLLO] Fuerza el resultado de un pago sin pasar por Izipay (para pruebas). Bloqueado en producción.',
  })
  devConfirmPayment(
    @Args('transactionId') transactionId: string,
    @Args('outcome', { nullable: true, defaultValue: 'PAID' })
    outcome: 'PAID' | 'CANCELLED' | 'FAILED',
  ) {
    return this.paymentService.devForceResult(transactionId, outcome);
  }
}
