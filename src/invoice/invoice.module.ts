import { Module } from '@nestjs/common';
import { SunatModule } from 'src/sunat/sunat.module';
import { InvoiceService } from './invoice.service';
import { InvoiceResolver } from './invoice.resolver';
import { CreditNoteService } from './credit-note.service';
import { CreditNoteResolver } from './credit-note.resolver';

@Module({
  imports: [SunatModule],
  providers: [
    InvoiceService,
    InvoiceResolver,
    CreditNoteService,
    CreditNoteResolver,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
