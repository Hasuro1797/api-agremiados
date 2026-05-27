import { Module } from '@nestjs/common';
import { SunatModule } from 'src/sunat/sunat.module';
import { IzipayCoreModule } from 'src/izipay/izipay-core.module';
import { InvoiceService } from './invoice.service';
import { InvoiceResolver } from './invoice.resolver';
import { CreditNoteService } from './credit-note.service';
import { CreditNoteResolver } from './credit-note.resolver';

@Module({
  imports: [SunatModule, IzipayCoreModule],
  providers: [
    InvoiceService,
    InvoiceResolver,
    CreditNoteService,
    CreditNoteResolver,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
