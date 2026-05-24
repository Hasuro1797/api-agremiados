import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { Public } from 'src/auth/decorators/public.decorator';
import { PaymentService } from './payment.service';

@Controller('izipay')
export class IzipayController {
  private readonly logger = new Logger(IzipayController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * IPN (Instant Payment Notification) de Izipay: notificación server-to-server
   * que confirma el pago aunque el cliente no haya podido llamar a confirmPayment.
   * Idempotente y validado por firma.
   */
  @Public()
  @Post('ipn')
  @HttpCode(200)
  async handleIpn(@Body() body: Record<string, unknown>) {
    this.logger.log(`IPN recibido: ${JSON.stringify(body)}`);
    return this.paymentService.processIpn(body);
  }
}
