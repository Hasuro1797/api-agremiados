import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { FinanceOnly, SuperAdminOnly } from 'src/auth';
import { BillingConfigService } from './billing-config.service';
import { BillingConfigEntity } from './entities/billing-config.entity';
import { UpsertBillingConfigInput } from './dto/upsert-billing-config.input';

@Resolver()
export class BillingConfigResolver {
  constructor(private readonly billingConfigService: BillingConfigService) {}

  @FinanceOnly()
  @Query(() => BillingConfigEntity, {
    name: 'getBillingConfig',
    nullable: true,
    description:
      'Obtener la configuración de facturación electrónica SUNAT (sin exponer credenciales sensibles)',
  })
  getBillingConfig() {
    return this.billingConfigService.getBillingConfig();
  }

  @FinanceOnly()
  @Mutation(() => BillingConfigEntity, {
    name: 'upsertBillingConfig',
    description: 'Crear o actualizar la configuración de facturación SUNAT',
  })
  upsertBillingConfig(@Args('input') input: UpsertBillingConfigInput) {
    return this.billingConfigService.upsertBillingConfig(input);
  }

  @FinanceOnly()
  @Mutation(() => BillingConfigEntity, {
    name: 'uploadBillingCertificate',
    description:
      'Cargar o reemplazar el certificado digital PFX para firma de comprobantes SUNAT. Se valida que el PFX sea legible con la contraseña dada.',
  })
  uploadBillingCertificate(
    @Args('file', { type: () => GraphQLUpload }) file: FileUpload,
    @Args('password') password: string,
  ) {
    return this.billingConfigService.uploadCertificate(file, password);
  }

  @SuperAdminOnly()
  @Mutation(() => BillingConfigEntity, {
    name: 'toggleBillingProduction',
    description:
      'Alternar entre entorno beta/homologación (false) y producción SUNAT (true). Requiere certificado activo y al menos una serie configurada para activar producción.',
  })
  toggleBillingProduction(@Args('production') production: boolean) {
    return this.billingConfigService.toggleProductionMode(production);
  }

  @SuperAdminOnly()
  @Mutation(() => BillingConfigEntity, {
    name: 'removeBillingCertificate',
    description:
      'Eliminar el certificado PFX almacenado. Solo posible cuando el modo producción está desactivado.',
  })
  removeBillingCertificate() {
    return this.billingConfigService.removeCertificate();
  }
}
