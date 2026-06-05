import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, FinanceOnly } from 'src/auth';
import { InvoiceFilterArgs } from './dto/invoice-filter.args';
import { MyPaymentsArgs } from './dto/my-payments.args';
import {
  InvoiceHeaderEntity,
  PaginatedInvoices,
} from './entities/invoice-header.entity';
import { InvoiceService } from './invoice.service';

@Resolver()
export class InvoiceResolver {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Query(() => PaginatedInvoices, {
    name: 'myPayments',
    description:
      'Historial de pagos del miembro autenticado (cuotas y actividades). Incluye billingDocuments con la URL del PDF de la boleta/factura cuando ya fue emitida por SUNAT.',
  })
  myPayments(@CurrentUser('sub') sub: string, @Args() filters: MyPaymentsArgs) {
    return this.invoiceService.findMyInvoices(sub, filters);
  }

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
