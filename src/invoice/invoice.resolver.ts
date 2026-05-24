import { Args, Query, Resolver } from '@nestjs/graphql';
import { FinanceOnly } from 'src/auth';
import { InvoiceService } from './invoice.service';
import {
  InvoiceHeaderEntity,
  PaginatedInvoices,
} from './entities/invoice-header.entity';
import { InvoiceFilterArgs } from './dto/invoice-filter.args';

@Resolver()
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService) {}

  @FinanceOnly()
  @Query(() => PaginatedInvoices, {
    name: 'findInvoices',
    description:
      'Listar comprobantes con paginación y filtros (estado, SUNAT, fechas, búsqueda)',
  })
  findInvoices(@Args() filters: InvoiceFilterArgs) {
    return this.invoiceService.findInvoices(filters);
  }

  @FinanceOnly()
  @Query(() => InvoiceHeaderEntity, {
    name: 'findInvoice',
    description: 'Obtener un comprobante por id (con detalles y transacción)',
  })
  findInvoice(@Args('id') id: string) {
    return this.invoiceService.findOne(id);
  }
}
