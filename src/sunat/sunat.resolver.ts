import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { FinanceOnly } from 'src/auth';
import { SunatEmissionService } from './sunat-emission.service';

@Resolver()
export class SunatResolver {
  constructor(private readonly emission: SunatEmissionService) {}

  @FinanceOnly()
  @Mutation(() => Boolean, {
    name: 'retryInvoiceSunat',
    description:
      'Reintenta la emisión SUNAT de un comprobante PAGADO (estado ERROR/PENDING o reenvío manual).',
  })
  async retryInvoiceSunat(@Args('invoiceId') invoiceId: string) {
    await this.emission.emitInvoice(invoiceId);
    return true;
  }
}
