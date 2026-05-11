import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from 'src/auth';
import { Status } from 'generated/prisma/enums';
import { QuotaDiscountService } from './quota-discount.service';
import { QuotaDiscountEntity } from './entities/quota-discount.entity';
import { QuotaDiscountsEntity } from './entities/quota-discounts.entity';
import { CreateQuotaDiscountInput } from './dto/create-quota-discount.input';
import { UpdateQuotaDiscountInput } from './dto/update-quota-discount.input';
import { QuotaDiscountFilterArgs } from './dto/quota-discount-filter.args';

@Resolver()
export class QuotaDiscountResolver {
  constructor(private readonly quotaDiscountService: QuotaDiscountService) {}

  @AdminOnly()
  @Query(() => QuotaDiscountsEntity, {
    name: 'getQuotaDiscounts',
    description: 'Obtener descuentos de cuota con paginación y filtros',
  })
  getQuotaDiscounts(@Args() args: QuotaDiscountFilterArgs) {
    return this.quotaDiscountService.findAll(args);
  }

  @AdminOnly()
  @Query(() => QuotaDiscountEntity, {
    name: 'getQuotaDiscount',
    description: 'Obtener un descuento de cuota por ID',
  })
  getQuotaDiscount(@Args('id', { type: () => Int }) id: number) {
    return this.quotaDiscountService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => QuotaDiscountEntity, {
    name: 'createQuotaDiscount',
    description: 'Crear un nuevo descuento de cuota',
  })
  createQuotaDiscount(@Args('input') input: CreateQuotaDiscountInput) {
    return this.quotaDiscountService.create(input);
  }

  @AdminOnly()
  @Mutation(() => QuotaDiscountEntity, {
    name: 'updateQuotaDiscount',
    description: 'Actualizar un descuento de cuota',
  })
  updateQuotaDiscount(@Args('input') input: UpdateQuotaDiscountInput) {
    return this.quotaDiscountService.update(input);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'changeStatusQuotaDiscount',
    description: 'Cambiar el estado de descuentos de cuota (ACTIVE / DRAFT)',
  })
  changeStatusQuotaDiscount(
    @Args('ids', { type: () => [Int] }) ids: number[],
    @Args('status', { type: () => String }) status: Status,
  ) {
    return this.quotaDiscountService.changeStatus(ids, status);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'removeQuotaDiscounts',
    description: 'Eliminar descuentos de cuota por IDs',
  })
  removeQuotaDiscounts(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.quotaDiscountService.remove(ids);
  }
}
