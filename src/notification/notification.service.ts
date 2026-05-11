import { Injectable, Logger } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { MailService } from 'src/mail/mail.service';

export interface NotifyParams {
  userId: string;
  templateCode: string;
  context: Record<string, string | number>;
  triggerKey?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async notify(params: NotifyParams): Promise<void> {
    const { userId, templateCode, context, triggerKey } = params;

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code: templateCode },
    });

    if (!template || !template.isActive) {
      this.logger.warn(`Template "${templateCode}" not found or inactive`);
      return;
    }

    const channels = (template.channels as string[]).filter(
      (ch) => ch !== NotificationChannel.PUSH,
    );

    for (const channel of channels) {
      const ch = channel as NotificationChannel;

      if (!template.isCritical && triggerKey) {
        const pref = await this.prisma.notificationPreference.findUnique({
          where: {
            userId_triggerKey_channel: { userId, triggerKey, channel: ch },
          },
        });
        if (pref && !pref.enabled) continue;
      }

      const subject = this.interpolate(template.subject, context);
      const body =
        ch === NotificationChannel.IN_APP && template.shortBody
          ? this.interpolate(template.shortBody, context)
          : this.interpolate(template.body, context);

      const record = await this.prisma.notification.create({
        data: {
          userId,
          templateId: template.id,
          subject,
          body,
          channel: ch,
          status: NotificationStatus.PENDING,
        },
      });

      if (ch === NotificationChannel.EMAIL) {
        await this.dispatchEmail(record.id, userId, subject, body);
      } else {
        await this.prisma.notification.update({
          where: { id: record.id },
          data: { status: NotificationStatus.SENT, sentAt: new Date() },
        });
      }
    }
  }

  async notifyMany(
    userIds: string[],
    templateCode: string,
    context: Record<string, string | number>,
    triggerKey?: string,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) =>
        this.notify({ userId, templateCode, context, triggerKey }).catch(
          (err) =>
            this.logger.error(
              `notify failed for user ${userId}: ${err.message}`,
            ),
        ),
      ),
    );
  }

  async findMyNotifications(
    userId: string,
    page: number,
    pageSize: number,
    unreadOnly: boolean,
  ) {
    const where = {
      userId,
      channel: NotificationChannel.IN_APP,
      ...(unreadOnly && { readAt: null }),
    };

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, channel: NotificationChannel.IN_APP, readAt: null },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  async markRead(notificationId: number, userId: string): Promise<boolean> {
    const n = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!n || n.readAt) return false;

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return true;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        channel: NotificationChannel.IN_APP,
        readAt: null,
      },
      data: { readAt: new Date(), status: NotificationStatus.READ },
    });
    return result.count;
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ triggerKey: 'asc' }, { channel: 'asc' }],
    });
  }

  async updatePreference(
    userId: string,
    triggerKey: string,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_triggerKey_channel: { userId, triggerKey, channel } },
      create: { userId, triggerKey, channel, enabled },
      update: { enabled },
    });
  }

  private interpolate(
    template: string,
    context: Record<string, string | number>,
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      context[key] !== undefined ? String(context[key]) : `{{${key}}}`,
    );
  }

  private async dispatchEmail(
    notificationId: number,
    userId: string,
    subject: string,
    body: string,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (!user?.email) throw new Error('User email not found');

      await this.mail.sendMail({
        to: [user.email],
        subject,
        template: 'notification',
        context: { subject, body },
      });

      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email dispatch failed: ${message}`);
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { status: NotificationStatus.FAILED, error: message },
      });
    }
  }
}
