import { registerEnumType } from '@nestjs/graphql';

export enum BrandingImageField {
  LOGO = 'logo',
  FAVICON = 'favicon',
  BANNER = 'bannerUrl',
}

registerEnumType(BrandingImageField, {
  name: 'BrandingImageField',
  description: 'Campo de imagen de branding de la organización',
});
