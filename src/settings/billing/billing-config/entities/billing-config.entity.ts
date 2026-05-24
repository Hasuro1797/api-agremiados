import { Field, Int, ObjectType } from '@nestjs/graphql';
import { DocumentSeriesEntity } from '../../document-series/entities/document-series.entity';

@ObjectType()
export class BillingConfigEntity {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  organizationId!: string;

  // Datos del emisor
  @Field(() => String)
  ruc!: string;

  @Field(() => String)
  razonSocial!: string;

  @Field(() => String, { nullable: true })
  comercialName?: string;

  // Credenciales SOL — nunca se expone solPass ni solUser
  @Field(() => String, { description: 'Usuario SOL (sin contraseña)' })
  solUser!: string;

  // Dirección fiscal
  @Field(() => String, { nullable: true })
  ubigeo?: string;

  @Field(() => String, { nullable: true })
  address?: string;

  @Field(() => String, { nullable: true })
  district?: string;

  @Field(() => String, { nullable: true })
  province?: string;

  @Field(() => String, { nullable: true })
  department?: string;

  // Estado del certificado digital (sin exponer bytes ni contraseña)
  @Field(() => Boolean, {
    description: 'Indica si hay un certificado PFX cargado',
  })
  hasCertificate!: boolean;

  @Field(() => Boolean)
  production!: boolean;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => [DocumentSeriesEntity])
  series!: DocumentSeriesEntity[];
}
