import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { type FileUpload, GraphQLUpload } from 'graphql-upload-ts';
import { AdminOnly } from 'src/auth';
import { Public } from 'src/auth/decorators/public.decorator';
import { OrganizationService } from './organization.service';
import { OrganizationEntity } from './entities/organization.entity';
import { PublicOrganizationEntity } from './entities/public-organization.entity';
import { UpdateOrganizationInput } from './dto/update-organization.input';
import { BrandingImageField } from './dto/branding-image-field.enum';

@Resolver()
export class OrganizationResolver {
  constructor(private readonly organizationService: OrganizationService) {}

  @Public()
  @Query(() => PublicOrganizationEntity, {
    name: 'getPublicOrganization',
    nullable: true,
    description:
      'Obtener configuración pública de la organización (branding, colores, módulos activos)',
  })
  getPublicOrganization() {
    return this.organizationService.getPublicOrganization();
  }

  @AdminOnly()
  @Query(() => OrganizationEntity, {
    name: 'getOrganization',
    description:
      'Obtener configuración completa de la organización (solo admin)',
  })
  getOrganization() {
    return this.organizationService.getOrganization();
  }

  @AdminOnly()
  @Mutation(() => OrganizationEntity, {
    name: 'upsertOrganization',
    description: 'Crear o actualizar la configuración de la organización',
  })
  upsertOrganization(@Args('input') input: UpdateOrganizationInput) {
    return this.organizationService.upsertOrganization(input);
  }

  @AdminOnly()
  @Mutation(() => OrganizationEntity, {
    name: 'uploadBrandingImage',
    description:
      'Subir o reemplazar una imagen de branding (logo, favicon, banner)',
  })
  uploadBrandingImage(
    @Args('field', { type: () => BrandingImageField })
    field: BrandingImageField,
    @Args('file', { type: () => GraphQLUpload }) file: FileUpload,
  ) {
    console.log('Uploading branding image for field:', field);
    console.log('Received file promise:', file);
    return this.organizationService.uploadBrandingImage(field, file);
  }

  @AdminOnly()
  @Mutation(() => OrganizationEntity, {
    name: 'deleteBrandingImage',
    description: 'Eliminar una imagen de branding (logo, favicon, banner)',
  })
  deleteBrandingImage(
    @Args('field', { type: () => BrandingImageField })
    field: BrandingImageField,
  ) {
    return this.organizationService.deleteBrandingImage(field);
  }
}
