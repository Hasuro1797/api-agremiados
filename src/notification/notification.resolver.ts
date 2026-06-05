import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Role } from 'generated/prisma/enums';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { JwtPayloadWithAccess } from 'src/auth/types/jwt-payload.type';
import { NotificationService } from './notification.service';
import {
  MyNotificationsArgs,
  SendAnnouncementInput,
  UpdateNotificationPreferenceInput,
} from './dto';
import {
  AnnouncementResultEntity,
  NotificationEntity,
  NotificationPreferenceEntity,
  NotificationsPaginated,
  NotificationTriggerEntity,
} from './entities';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @Query(() => NotificationsPaginated, { name: 'myNotifications' })
  myNotifications(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args() args: MyNotificationsArgs,
  ) {
    return this.notificationService.findMyNotifications(
      user.sub,
      args.page ?? 1,
      args.pageSize ?? 20,
      args.unreadOnly ?? false,
    );
  }

  @Mutation(() => Boolean, { name: 'markNotificationRead' })
  markNotificationRead(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('id', { type: () => Int }) id: number,
  ) {
    return this.notificationService.markRead(id, user.sub);
  }

  @Mutation(() => Int, { name: 'markAllNotificationsRead' })
  markAllNotificationsRead(@CurrentUser() user: JwtPayloadWithAccess) {
    return this.notificationService.markAllRead(user.sub);
  }

  @Query(() => [NotificationTriggerEntity], {
    name: 'notificationCatalog',
    description:
      'Catálogo de triggers para pintar la pantalla de preferencias. ' +
      'Filtra por audiencia: los agremiados solo ven los MEMBER.',
  })
  notificationCatalog(@CurrentUser() user: JwtPayloadWithAccess) {
    const isStaff =
      user.role === Role.ADMIN ||
      user.role === Role.SUPERADMIN ||
      user.role === Role.MODERATOR;
    return this.notificationService.getCatalog(isStaff ? undefined : 'MEMBER');
  }

  @Query(() => [NotificationPreferenceEntity], {
    name: 'myNotificationPreferences',
  })
  myNotificationPreferences(@CurrentUser() user: JwtPayloadWithAccess) {
    return this.notificationService.getPreferences(user.sub);
  }

  @Mutation(() => NotificationPreferenceEntity, {
    name: 'updateNotificationPreference',
  })
  updateNotificationPreference(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: UpdateNotificationPreferenceInput,
  ) {
    return this.notificationService.updatePreference(
      user.sub,
      input.triggerKey,
      input.channel,
      input.enabled,
    );
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Mutation(() => AnnouncementResultEntity, { name: 'sendAnnouncement' })
  sendAnnouncement(
    @CurrentUser() user: JwtPayloadWithAccess,
    @Args('input') input: SendAnnouncementInput,
  ) {
    return this.notificationService.sendAnnouncement(input, user.sub);
  }

  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Query(() => [NotificationEntity], { name: 'adminUserNotifications' })
  adminUserNotifications(
    @Args('userId', { type: () => String }) userId: string,
    @Args() args: MyNotificationsArgs,
  ) {
    return this.notificationService
      .findMyNotifications(
        userId,
        args.page ?? 1,
        args.pageSize ?? 20,
        args.unreadOnly ?? false,
      )
      .then((r) => r.notifications);
  }
}
