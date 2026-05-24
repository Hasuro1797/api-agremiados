import { Module } from '@nestjs/common';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { SunatModule } from 'src/sunat/sunat.module';
import { IzipayController } from './izipay.controller';
import { IzipayService } from './izipay.service';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { ExpirePaymentsTask } from './tasks/expire-payments.task';

@Module({
  imports: [InvoiceModule, SunatModule],
  controllers: [IzipayController],
  providers: [
    IzipayService,
    PaymentService,
    PaymentResolver,
    ExpirePaymentsTask,
  ],
  exports: [IzipayService, PaymentService],
})
export class IzipayModule {}
