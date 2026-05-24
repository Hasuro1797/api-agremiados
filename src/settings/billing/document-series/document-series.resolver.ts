import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { SunatDocType } from 'generated/prisma/enums';
import { FinanceOnly } from 'src/auth';
import { DocumentSeriesService } from './document-series.service';
import { DocumentSeriesEntity } from './entities/document-series.entity';
import { CreateDocumentSeriesInput } from './dto/create-document-series.input';
import { UpdateDocumentSeriesInput } from './dto/update-document-series.input';
import { DocumentSeriesFilterArgs } from './dto/document-series-filter.args';

@ObjectType()
class NextCorrelativoResult {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  serie!: string;

  @Field(() => Int)
  correlativo!: number;

  @Field(() => Boolean)
  isExhausted!: boolean;

  @Field(() => Boolean)
  isNearExhaustion!: boolean;

  @Field(() => Int)
  remainingCapacity!: number;

  @Field(() => Int)
  maxCorrelativo!: number;
}

@Resolver()
export class DocumentSeriesResolver {
  constructor(
    private readonly documentSeriesService: DocumentSeriesService,
  ) {}

  @FinanceOnly()
  @Query(() => [DocumentSeriesEntity], {
    name: 'listDocumentSeries',
    description: 'Listar series de comprobantes electrónicos configuradas',
  })
  listDocumentSeries(@Args() filters: DocumentSeriesFilterArgs) {
    return this.documentSeriesService.list(filters);
  }

  @FinanceOnly()
  @Query(() => DocumentSeriesEntity, {
    name: 'getDocumentSeries',
    description: 'Obtener una serie por id',
  })
  getDocumentSeries(@Args('id', { type: () => Int }) id: number) {
    return this.documentSeriesService.findOne(id);
  }

  @FinanceOnly()
  @Query(() => NextCorrelativoResult, {
    name: 'peekNextCorrelativo',
    nullable: true,
    description:
      'Consultar el próximo correlativo disponible para un tipo de comprobante (sin reservarlo)',
  })
  peekNextCorrelativo(
    @Args('tipoDoc', { type: () => SunatDocType }) tipoDoc: SunatDocType,
  ) {
    return this.documentSeriesService.peekNextCorrelativo(tipoDoc);
  }

  @FinanceOnly()
  @Mutation(() => DocumentSeriesEntity, {
    name: 'createDocumentSeries',
    description: 'Crear una nueva serie de comprobantes',
  })
  createDocumentSeries(@Args('input') input: CreateDocumentSeriesInput) {
    return this.documentSeriesService.create(input);
  }

  @FinanceOnly()
  @Mutation(() => DocumentSeriesEntity, {
    name: 'updateDocumentSeries',
    description:
      'Actualizar descripción o estado activo de una serie. No se puede modificar la serie ni el correlativo.',
  })
  updateDocumentSeries(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateDocumentSeriesInput,
  ) {
    return this.documentSeriesService.update(id, input);
  }
}
