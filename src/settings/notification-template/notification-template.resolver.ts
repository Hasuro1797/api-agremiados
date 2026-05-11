import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AdminOnly } from 'src/auth';
import { NotificationTemplateService } from './notification-template.service';
import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationTemplatesEntity } from './entities/notification-templates.entity';
import { CreateNotificationTemplateInput } from './dto/create-notification-template.input';
import { UpdateNotificationTemplateInput } from './dto/update-notification-template.input';
import { NotificationTemplateFilterArgs } from './dto/notification-template-filter.args';

@Resolver()
export class NotificationTemplateResolver {
  constructor(
    private readonly notificationTemplateService: NotificationTemplateService,
  ) {}

  @AdminOnly()
  @Query(() => NotificationTemplatesEntity, {
    name: 'getNotificationTemplates',
    description: 'Obtener plantillas de notificación con paginación y filtros',
  })
  getNotificationTemplates(@Args() args: NotificationTemplateFilterArgs) {
    return this.notificationTemplateService.findAll(args);
  }

  @AdminOnly()
  @Query(() => NotificationTemplateEntity, {
    name: 'getNotificationTemplate',
    description: 'Obtener una plantilla de notificación por ID',
  })
  getNotificationTemplate(@Args('id', { type: () => Int }) id: number) {
    return this.notificationTemplateService.findOne(id);
  }

  @AdminOnly()
  @Mutation(() => NotificationTemplateEntity, {
    name: 'createNotificationTemplate',
    description: 'Crear una nueva plantilla de notificación',
  })
  createNotificationTemplate(
    @Args('input') input: CreateNotificationTemplateInput,
  ) {
    return this.notificationTemplateService.create(input);
  }

  @AdminOnly()
  @Mutation(() => NotificationTemplateEntity, {
    name: 'updateNotificationTemplate',
    description: 'Actualizar una plantilla de notificación',
  })
  updateNotificationTemplate(
    @Args('input') input: UpdateNotificationTemplateInput,
  ) {
    return this.notificationTemplateService.update(input);
  }

  @AdminOnly()
  @Mutation(() => NotificationTemplateEntity, {
    name: 'toggleNotificationTemplate',
    description: 'Activar o desactivar una plantilla de notificación',
  })
  toggleNotificationTemplate(@Args('id', { type: () => Int }) id: number) {
    return this.notificationTemplateService.toggle(id);
  }

  @AdminOnly()
  @Mutation(() => Boolean, {
    name: 'deleteNotificationsTemplate',
    description: 'Eliminar plantillas de notificación',
  })
  deleteNotificationsTemplate(
    @Args('id', { type: () => [Int] }) ids: number[],
  ) {
    return this.notificationTemplateService.delete(ids);
  }
}
