import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  NotificationChannel,
  NotificationStatus,
  Role,
  UserStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/db/prisma.service';
import { MailService } from 'src/mail/mail.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';
import { NOTIFICATION_TRIGGERS, TriggerAudience } from './notification-catalog';
import {
  AnnouncementAudience,
  SendAnnouncementInput,
} from './dto/send-announcement.input';

export interface NotifyParams {
  userId: string;
  templateCode: string;
  context: Record<string, string | number>;
  triggerKey?: string;
  /** ruta relativa para navegar al hacer click (ej: "/actividades/42") */
  link?: string;
  /** datos adicionales persistidos en la notificación */
  metadata?: Record<string, unknown>;
}

export interface BroadcastParams {
  userIds: string[];
  templateCode: string;
  context: Record<string, string | number>;
  triggerKey: string;
  link?: string;
}

/** Tamaño de lote para inserciones masivas in-app */
const BROADCAST_CHUNK_SIZE = 1000;
/** Tamaño de lote para el envío de correos de un comunicado */
const EMAIL_BATCH_SIZE = 50;
/** triggerKey reservado para comunicados manuales del admin */
const ANNOUNCEMENT_TRIGGER = 'ANNOUNCEMENT';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly auditLog: AuditLogService,
  ) {}

  async notify(params: NotifyParams): Promise<void> {
    const { userId, templateCode, context, triggerKey, link, metadata } =
      params;

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
          triggerKey: triggerKey ?? null,
          link: link ?? null,
          metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
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

  /**
   * Difusión in-app masiva (un mismo mensaje a muchos usuarios, ej: nuevo
   * comunicado, evento o cuota del mes). Optimizada para miles de destinatarios:
   *
   * - Interpola el texto UNA sola vez (el contexto es compartido).
   * - Excluye en UNA query a quienes silenciaron este trigger por in-app.
   * - Inserta con `createMany` en lotes en vez de N inserts individuales.
   *
   * Solo canal IN_APP (los broadcasts no van por email para no saturar el
   * correo). Para notificaciones personales con email usar `notify()`.
   */
  async broadcastInApp(params: BroadcastParams): Promise<number> {
    const { userIds, templateCode, context, triggerKey, link } = params;
    if (userIds.length === 0) return 0;

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code: templateCode },
    });
    if (!template || !template.isActive) {
      this.logger.warn(`Template "${templateCode}" not found or inactive`);
      return 0;
    }
    if (!(template.channels as string[]).includes(NotificationChannel.IN_APP)) {
      return 0;
    }

    // Excluir a quienes silenciaron este trigger por in-app (salvo críticos).
    let recipients = userIds;
    if (!template.isCritical) {
      const optedOut = await this.prisma.notificationPreference.findMany({
        where: {
          userId: { in: userIds },
          triggerKey,
          channel: NotificationChannel.IN_APP,
          enabled: false,
        },
        select: { userId: true },
      });
      if (optedOut.length > 0) {
        const blocked = new Set(optedOut.map((p) => p.userId));
        recipients = userIds.filter((id) => !blocked.has(id));
      }
    }
    if (recipients.length === 0) return 0;

    const subject = this.interpolate(template.subject, context);
    const body = this.interpolate(template.shortBody ?? template.body, context);
    const now = new Date();

    let created = 0;
    for (let i = 0; i < recipients.length; i += BROADCAST_CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + BROADCAST_CHUNK_SIZE);
      const result = await this.prisma.notification.createMany({
        data: chunk.map((userId) => ({
          userId,
          templateId: template.id,
          subject,
          body,
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
          sentAt: now,
          triggerKey,
          link: link ?? null,
        })),
      });
      created += result.count;
    }

    this.logger.log(
      `Broadcast "${templateCode}" enviado a ${created} usuarios in-app`,
    );
    return created;
  }

  /**
   * Atajo de `broadcastInApp` dirigido a todos los miembros activos (agremiados).
   * Útil para difusiones globales: nuevo comunicado, convenio, evento, encuesta.
   */
  async broadcastToActiveMembers(
    params: Omit<BroadcastParams, 'userIds'>,
  ): Promise<number> {
    const members = await this.prisma.user.findMany({
      where: { role: Role.MEMBER, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    return this.broadcastInApp({
      ...params,
      userIds: members.map((m) => m.id),
    });
  }

  /**
   * Comunicado manual del admin: mensaje de texto libre (no depende de un
   * template) enviado a un público elegido. El in-app se crea en bloque (barato)
   * y el email se despacha en segundo plano por lotes para no bloquear la
   * respuesta. Auditado.
   */
  async sendAnnouncement(
    input: SendAnnouncementInput,
    adminUserId: string,
  ): Promise<{ recipients: number; inApp: number; emailQueued: number }> {
    const wantsInApp = input.channels.includes(NotificationChannel.IN_APP);
    const wantsEmail = input.channels.includes(NotificationChannel.EMAIL);

    // Resolver destinatarios según la audiencia.
    let where: Prisma.UserWhereInput;
    if (input.audience === AnnouncementAudience.SPECIFIC) {
      if (!input.userIds?.length) {
        return { recipients: 0, inApp: 0, emailQueued: 0 };
      }
      where = { id: { in: input.userIds } };
    } else if (input.audience === AnnouncementAudience.ACTIVE_MEMBERS) {
      where = { role: Role.MEMBER, status: UserStatus.ACTIVE };
    } else {
      where = { role: Role.MEMBER };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true },
    });
    if (users.length === 0) {
      return { recipients: 0, inApp: 0, emailQueued: 0 };
    }

    const now = new Date();
    let inApp = 0;

    if (wantsInApp) {
      for (let i = 0; i < users.length; i += BROADCAST_CHUNK_SIZE) {
        const chunk = users.slice(i, i + BROADCAST_CHUNK_SIZE);
        const result = await this.prisma.notification.createMany({
          data: chunk.map((u) => ({
            userId: u.id,
            subject: input.subject,
            body: input.message,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.SENT,
            sentAt: now,
            triggerKey: ANNOUNCEMENT_TRIGGER,
            link: input.link ?? null,
          })),
        });
        inApp += result.count;
      }
    }

    let emailQueued = 0;
    if (wantsEmail) {
      const emails = users.map((u) => u.email).filter((e): e is string => !!e);
      emailQueued = emails.length;
      // Fire-and-forget: no bloquea la mutación.
      void this.dispatchAnnouncementEmails(
        emails,
        input.subject,
        input.message,
      );
    }

    await this.auditLog.log({
      userId: adminUserId,
      action: 'CREATE',
      entity: 'announcement',
      details: {
        subject: input.subject,
        audience: input.audience,
        channels: input.channels,
        recipients: users.length,
        inApp,
        emailQueued,
      } as unknown as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Comunicado "${input.subject}" → ${users.length} destinatarios ` +
        `(in-app: ${inApp}, email: ${emailQueued})`,
    );

    return { recipients: users.length, inApp, emailQueued };
  }

  /** Envía el correo del comunicado en lotes (best-effort, en segundo plano). */
  private async dispatchAnnouncementEmails(
    emails: string[],
    subject: string,
    body: string,
  ): Promise<void> {
    for (let i = 0; i < emails.length; i += EMAIL_BATCH_SIZE) {
      const batch = emails.slice(i, i + EMAIL_BATCH_SIZE);
      await Promise.all(
        batch.map((email) =>
          this.mail
            .sendMail({
              to: [email],
              subject,
              template: 'notification',
              context: { subject, body },
            })
            .catch((err) =>
              this.logger.error(
                `Comunicado: fallo enviando a ${email}: ${err.message}`,
              ),
            ),
        ),
      );
    }
  }

  async notifyMany(
    userIds: string[],
    templateCode: string,
    context: Record<string, string | number>,
    triggerKey?: string,
    link?: string,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) =>
        this.notify({ userId, templateCode, context, triggerKey, link }).catch(
          (err) =>
            this.logger.error(
              `notify failed for user ${userId}: ${err.message}`,
            ),
        ),
      ),
    );
  }

  /**
   * Notifica al personal (staff) con los roles indicados. A diferencia de los
   * broadcasts a miembros, usa `notify()` por usuario para respetar el canal
   * email (las alertas a admins suelen requerirlo). Por defecto: ADMIN y
   * SUPERADMIN.
   */
  async notifyStaff(params: {
    templateCode: string;
    context: Record<string, string | number>;
    triggerKey: string;
    link?: string;
    roles?: Role[];
  }): Promise<void> {
    const roles = params.roles ?? [Role.ADMIN, Role.SUPERADMIN];
    const staff = await this.prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
    await this.notifyMany(
      staff.map((s) => s.id),
      params.templateCode,
      params.context,
      params.triggerKey,
      params.link,
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

  /**
   * Catálogo de triggers (fuente de verdad). El front lo usa para pintar la
   * pantalla de preferencias. Si se pasa `audience`, filtra (un agremiado solo
   * debe ver los triggers MEMBER).
   */
  getCatalog(audience?: TriggerAudience) {
    return NOTIFICATION_TRIGGERS.filter(
      (t) => !audience || t.audience === audience,
    );
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
