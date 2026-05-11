import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from 'src/auth';
import { AutomationRuleService } from './automation-rule.service';
import { AutomationRuleEntity } from './entities/automation-rule.entity';
import { CreateAutomationRuleInput } from './dto/create-automation-rule.input';
import { UpdateAutomationRuleInput } from './dto/update-automation-rule.input';

@Resolver()
export class AutomationRuleResolver {
  constructor(private readonly automationRuleService: AutomationRuleService) {}

  @AdminOnly()
  @Query(() => [AutomationRuleEntity], {
    name: 'getAutomationRules',
    description: 'Obtener todas las reglas de automatización',
  })
  getAutomationRules() {
    return this.automationRuleService.findAll();
  }

  @AdminOnly()
  @Query(() => AutomationRuleEntity, {
    name: 'getAutomationRule',
    description: 'Obtener una regla de automatización por ID',
  })
  getAutomationRule(@Args('id', { type: () => Int }) id: number) {
    return this.automationRuleService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => AutomationRuleEntity, {
    name: 'createAutomationRule',
    description: 'Crear una nueva regla de automatización',
  })
  createAutomationRule(@Args('input') input: CreateAutomationRuleInput) {
    return this.automationRuleService.create(input);
  }

  @AdminOnly()
  @Mutation(() => AutomationRuleEntity, {
    name: 'updateAutomationRule',
    description: 'Actualizar una regla de automatización',
  })
  updateAutomationRule(@Args('input') input: UpdateAutomationRuleInput) {
    return this.automationRuleService.update(input);
  }

  @AdminOnly()
  @Mutation(() => AutomationRuleEntity, {
    name: 'toggleAutomationRule',
    description: 'Activar o desactivar una regla de automatización',
  })
  toggleAutomationRule(@Args('id', { type: () => Int }) id: number) {
    return this.automationRuleService.toggle(id);
  }
}
