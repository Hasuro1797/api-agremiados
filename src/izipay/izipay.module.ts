import { Module } from '@nestjs/common';
import { InvoiceModule } from 'src/invoice/invoice.module';
import { SunatModule } from 'src/sunat/sunat.module';
import { IzipayController } from './izipay.controller';
import { IzipayCoreModule } from './izipay-core.module';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { ExpirePaymentsTask } from './tasks/expire-payments.task';

@Module({
  imports: [InvoiceModule, SunatModule, IzipayCoreModule],
  controllers: [IzipayController],
  providers: [PaymentService, PaymentResolver, ExpirePaymentsTask],
  exports: [PaymentService, IzipayCoreModule],
})
export class IzipayModule {}
