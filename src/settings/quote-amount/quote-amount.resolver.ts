import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from 'src/auth';
import { QuoteAmountService } from './quote-amount.service';
import { QuoteAmountEntity } from './entities/quote-amount.entity';
import { CreateQuoteAmountInput } from './dto/create-quote-amount.input';
import { UpdateQuoteAmountInput } from './dto/update-quote-amount.input';

@Resolver()
export class QuoteAmountResolver {
  constructor(private readonly quoteAmountService: QuoteAmountService) {}

  @AdminOnly()
  @Query(() => [QuoteAmountEntity], {
    name: 'getQuoteAmounts',
    description: 'Obtener los montos de cuota de una organización',
  })
  getQuoteAmounts(
    @Args('organizationId', { type: () => String }) organizationId: string,
  ) {
    return this.quoteAmountService.findAll(organizationId);
  }

  @AdminOnly()
  @Mutation(() => QuoteAmountEntity, {
    name: 'createQuoteAmount',
    description: 'Crear un nuevo monto de cuota',
  })
  createQuoteAmount(@Args('input') input: CreateQuoteAmountInput) {
    return this.quoteAmountService.create(input);
  }

  @AdminOnly()
  @Mutation(() => QuoteAmountEntity, {
    name: 'updateQuoteAmount',
    description: 'Actualizar un monto de cuota',
  })
  updateQuoteAmount(@Args('input') input: UpdateQuoteAmountInput) {
    return this.quoteAmountService.update(input);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'removeQuoteAmounts',
    description: 'Eliminar montos de cuota por IDs',
  })
  removeQuoteAmounts(@Args('ids', { type: () => [Int] }) ids: number[]) {
    return this.quoteAmountService.remove(ids);
  }
}
