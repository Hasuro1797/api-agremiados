import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { FinanceOnly } from 'src/auth';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { CreditNoteService } from './credit-note.service';
import { InvoiceHeaderEntity } from './entities/invoice-header.entity';
import {
  CreateCreditNoteInput,
  VoidInvoiceInput,
} from './dto/credit-note.input';

@Resolver()
export class CreditNoteResolver {
  constructor(private readonly creditNoteService: CreditNoteService) {}

  @FinanceOnly()
  @Mutation(() => InvoiceHeaderEntity, {
    name: 'voidInvoice',
    description:
      'Anulación interna de un comprobante NO aceptado por SUNAT. Revierte stock/cuota.',
  })
  voidInvoice(
    @Args('input') input: VoidInvoiceInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.creditNoteService.voidInvoice(
      input.invoiceId,
      input.reason,
      user.sub,
    );
  }

  @FinanceOnly()
  @Mutation(() => InvoiceHeaderEntity, {
    name: 'createCreditNote',
    description:
      'Emite una Nota de Crédito (anulación/devolución) de un comprobante aceptado por SUNAT.',
  })
  createCreditNote(
    @Args('input') input: CreateCreditNoteInput,
    @CurrentUser() user: JwtPayloadWithAccess,
  ) {
    return this.creditNoteService.createCreditNote(
      input.invoiceId,
      input.reasonCode,
      input.reasonDescription,
      user.sub,
    );
  }
}
