import { Module } from '@nestjs/common';
import { IzipayService } from './izipay.service';
import { IzipayCancellationService } from './izipay-cancellation.service';

/**
 * Servicios base de Izipay sin dependencias de Invoice/Sunat. Se aísla aquí
 * para que `InvoiceModule` pueda usar la cancelación sin crear un ciclo con
 * `IzipayModule` (que sí importa `InvoiceModule`).
 */
@Module({
  providers: [IzipayService, IzipayCancellationService],
  exports: [IzipayService, IzipayCancellationService],
})
export class IzipayCoreModule {}
