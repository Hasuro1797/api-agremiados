import { NotificationChannel } from 'generated/prisma/enums';

/**
 * CATÁLOGO DE NOTIFICACIONES — fuente de verdad del sistema.
 *
 * Cada acción del dominio que genera una notificación está registrada aquí.
 * El `key` es a la vez el `triggerKey` (para preferencias) y el `code` del
 * NotificationTemplate (relación 1:1). El template aporta el TEXTO; este
 * catálogo aporta la SEMÁNTICA: a quién va, si se puede silenciar, por qué
 * canales sale por defecto y qué variables admite.
 *
 * El front consume este catálogo (query `notificationCatalog`) para pintar la
 * pantalla de preferencias y para documentar las variables de cada template.
 */

export enum TriggerKey {
  // Cuotas
  QUOTA_NEW_PERIOD = 'QUOTA_NEW_PERIOD',
  QUOTA_DUE_REMINDER = 'QUOTA_DUE_REMINDER',
  QUOTA_OVERDUE = 'QUOTA_OVERDUE',
  QUOTA_PAYMENT_CONFIRMED = 'QUOTA_PAYMENT_CONFIRMED',
  MEMBER_BLOCKED = 'MEMBER_BLOCKED',
  // Eventos / actividades
  ACTIVITY_CREATED = 'ACTIVITY_CREATED',
  EVENT_REMINDER = 'EVENT_REMINDER',
  ACTIVITY_INVITATION = 'ACTIVITY_INVITATION',
  // Reservas
  RESERVATION_REQUESTED = 'RESERVATION_REQUESTED',
  RESERVATION_APPROVED = 'RESERVATION_APPROVED',
  RESERVATION_REJECTED = 'RESERVATION_REJECTED',
  // Comunicación
  POST_PUBLISHED = 'POST_PUBLISHED',
  AGREEMENT_PUBLISHED = 'AGREEMENT_PUBLISHED',
  // Encuestas
  SURVEY_PUBLISHED = 'SURVEY_PUBLISHED',
  // Membresía
  MEMBER_WELCOME = 'MEMBER_WELCOME',
  MEMBER_REGISTERED = 'MEMBER_REGISTERED',
  // Facturación
  INVOICE_ISSUED = 'INVOICE_ISSUED',
  INVOICE_FAILED = 'INVOICE_FAILED',
  // Certificados
  CERTIFICATE_READY = 'CERTIFICATE_READY',
  // Soporte (ya cableados)
  SUPPORT_CREATED = 'SUPPORT_CREATED',
  SUPPORT_ASSIGNED = 'SUPPORT_ASSIGNED',
  SUPPORT_RESOLVED = 'SUPPORT_RESOLVED',
  SUPPORT_REJECTED = 'SUPPORT_REJECTED',
  SUPPORT_REOPENED = 'SUPPORT_REOPENED',
  SUPPORT_OVERDUE = 'SUPPORT_OVERDUE',
}

export type TriggerAudience = 'MEMBER' | 'ADMIN';

export interface NotificationTriggerDef {
  /** triggerKey y code del template (1:1) */
  key: TriggerKey;
  /** etiqueta legible para la UI de preferencias */
  label: string;
  /** descripción de cuándo se dispara */
  description: string;
  /** agrupación en la UI */
  category: string;
  /** a quién se dirige */
  audience: TriggerAudience;
  /** si true, ignora preferencias del usuario (no silenciable) */
  isCritical: boolean;
  /** canales por defecto del template sembrado */
  defaultChannels: NotificationChannel[];
  /** variables disponibles para interpolar en el template */
  variables: string[];
  /** patrón de ruta relativa a la que navega el click; null = solo aviso */
  linkPattern: string | null;
}

const EMAIL = NotificationChannel.EMAIL;
const IN_APP = NotificationChannel.IN_APP;

export const NOTIFICATION_TRIGGERS: NotificationTriggerDef[] = [
  // ===== Cuotas =====
  {
    key: TriggerKey.QUOTA_NEW_PERIOD,
    label: 'Nueva cuota del mes',
    description: 'Cuando se genera el periodo de cuota mensual.',
    category: 'Cuotas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['month', 'year', 'amount', 'dueDate'],
    linkPattern: '/cuotas',
  },
  {
    key: TriggerKey.QUOTA_DUE_REMINDER,
    label: 'Recordatorio de cuota por vencer',
    description:
      'Recordatorio automático unos días antes de que venza la cuota ' +
      '(configurable por el admin desde automatizaciones).',
    category: 'Cuotas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['month', 'year', 'amount', 'dueDate'],
    linkPattern: '/cuotas',
  },
  {
    key: TriggerKey.QUOTA_OVERDUE,
    label: 'Cuota en mora',
    description: 'Cuando una cuota pendiente vence y entra en mora.',
    category: 'Cuotas',
    audience: 'MEMBER',
    isCritical: true,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['amount', 'dueDate', 'period'],
    linkPattern: '/cuotas',
  },
  {
    key: TriggerKey.QUOTA_PAYMENT_CONFIRMED,
    label: 'Pago de cuota confirmado',
    description: 'Cuando se confirma el pago de una o más cuotas.',
    category: 'Cuotas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['amount', 'period', 'paymentCount'],
    linkPattern: '/cuotas/pagos',
  },
  {
    key: TriggerKey.MEMBER_BLOCKED,
    label: 'Bloqueo por mora',
    description: 'Cuando el miembro es bloqueado automáticamente por mora.',
    category: 'Cuotas',
    audience: 'MEMBER',
    isCritical: true,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['amount'],
    linkPattern: '/cuotas',
  },

  // ===== Eventos / actividades =====
  {
    key: TriggerKey.ACTIVITY_CREATED,
    label: 'Nuevo evento publicado',
    description: 'Cuando se publica un evento o actividad.',
    category: 'Eventos',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['title', 'date', 'place'],
    linkPattern: '/actividades/:id',
  },
  {
    key: TriggerKey.EVENT_REMINDER,
    label: 'Recordatorio de evento próximo',
    description:
      'Recordatorio automático a los asistentes confirmados unos días ' +
      'antes del evento (configurable por el admin desde automatizaciones).',
    category: 'Eventos',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['title', 'date', 'place'],
    linkPattern: '/actividades/:id',
  },
  {
    key: TriggerKey.ACTIVITY_INVITATION,
    label: 'Invitación a un evento',
    description: 'Cuando se te invita directamente a un evento.',
    category: 'Eventos',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['title', 'date', 'place'],
    linkPattern: '/actividades/:id',
  },

  // ===== Reservas =====
  {
    key: TriggerKey.RESERVATION_REQUESTED,
    label: 'Nueva solicitud de reserva',
    description: 'Cuando un agremiado solicita una reserva (notifica admins).',
    category: 'Reservas',
    audience: 'ADMIN',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['space', 'date', 'memberName'],
    linkPattern: '/admin/reservas/:id',
  },
  {
    key: TriggerKey.RESERVATION_APPROVED,
    label: 'Reserva aprobada',
    description: 'Cuando tu solicitud de reserva es aprobada.',
    category: 'Reservas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['space', 'date'],
    linkPattern: '/reservas/:id',
  },
  {
    key: TriggerKey.RESERVATION_REJECTED,
    label: 'Reserva rechazada',
    description: 'Cuando tu solicitud de reserva es rechazada.',
    category: 'Reservas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['space', 'date', 'reason'],
    linkPattern: '/reservas/:id',
  },

  // ===== Comunicación =====
  {
    key: TriggerKey.POST_PUBLISHED,
    label: 'Nuevo comunicado',
    description: 'Cuando se publica un comunicado.',
    category: 'Comunicación',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['title'],
    linkPattern: '/comunicados/:id',
  },
  {
    key: TriggerKey.AGREEMENT_PUBLISHED,
    label: 'Nuevo convenio',
    description: 'Cuando se publica un convenio.',
    category: 'Comunicación',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['title'],
    linkPattern: '/convenios/:id',
  },

  // ===== Encuestas =====
  {
    key: TriggerKey.SURVEY_PUBLISHED,
    label: 'Nueva encuesta',
    description: 'Cuando se publica una encuesta.',
    category: 'Encuestas',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['title', 'deadline'],
    linkPattern: '/encuestas/:id',
  },

  // ===== Membresía =====
  {
    key: TriggerKey.MEMBER_WELCOME,
    label: 'Bienvenida',
    description: 'Cuando tu cuenta de agremiado es activada.',
    category: 'Membresía',
    audience: 'MEMBER',
    isCritical: true,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['userName'],
    linkPattern: '/perfil',
  },
  {
    key: TriggerKey.MEMBER_REGISTERED,
    label: 'Nuevo registro de agremiado',
    description:
      'Cuando un agremiado se registra y queda pendiente de aprobación (notifica admins).',
    category: 'Membresía',
    audience: 'ADMIN',
    isCritical: false,
    defaultChannels: [IN_APP],
    variables: ['memberName'],
    linkPattern: '/admin/miembros/:id',
  },

  // ===== Facturación =====
  {
    key: TriggerKey.INVOICE_ISSUED,
    label: 'Comprobante emitido',
    description: 'Cuando se emite tu comprobante electrónico (SUNAT).',
    category: 'Facturación',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['serie', 'number', 'total'],
    linkPattern: '/comprobantes/:id',
  },
  {
    key: TriggerKey.INVOICE_FAILED,
    label: 'Fallo en emisión de comprobante',
    description: 'Cuando falla la emisión de un comprobante (notifica admins).',
    category: 'Facturación',
    audience: 'ADMIN',
    isCritical: true,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['orderNumber', 'error'],
    linkPattern: '/admin/comprobantes/:id',
  },

  // ===== Certificados =====
  {
    key: TriggerKey.CERTIFICATE_READY,
    label: 'Certificado disponible',
    description: 'Cuando tu certificado de habilitación está listo.',
    category: 'Certificados',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['type', 'code'],
    linkPattern: '/certificados/:id',
  },

  // ===== Soporte (ya cableados desde support.service) =====
  {
    key: TriggerKey.SUPPORT_CREATED,
    label: 'Nuevo reclamo recibido',
    description: 'Cuando un agremiado registra un reclamo (notifica admins).',
    category: 'Soporte',
    audience: 'ADMIN',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId', 'memberName'],
    linkPattern: '/admin/soporte/:id',
  },
  {
    key: TriggerKey.SUPPORT_ASSIGNED,
    label: 'Reclamo asignado',
    description: 'Cuando tu reclamo es asignado a un agente.',
    category: 'Soporte',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId', 'assignedName'],
    linkPattern: '/soporte/:id',
  },
  {
    key: TriggerKey.SUPPORT_RESOLVED,
    label: 'Reclamo resuelto',
    description: 'Cuando tu reclamo es marcado como resuelto.',
    category: 'Soporte',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId'],
    linkPattern: '/soporte/:id',
  },
  {
    key: TriggerKey.SUPPORT_REJECTED,
    label: 'Reclamo rechazado',
    description: 'Cuando tu reclamo es rechazado.',
    category: 'Soporte',
    audience: 'MEMBER',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId', 'rejectReason'],
    linkPattern: '/soporte/:id',
  },
  {
    key: TriggerKey.SUPPORT_REOPENED,
    label: 'Reclamo reabierto',
    description: 'Cuando un agremiado reabre un reclamo (notifica admins).',
    category: 'Soporte',
    audience: 'ADMIN',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId', 'reopenReason'],
    linkPattern: '/admin/soporte/:id',
  },
  {
    key: TriggerKey.SUPPORT_OVERDUE,
    label: 'Reclamo sin atender a tiempo',
    description:
      'Cuando un reclamo supera el SLA sin atención (notifica admins).',
    category: 'Soporte',
    audience: 'ADMIN',
    isCritical: false,
    defaultChannels: [IN_APP, EMAIL],
    variables: ['topic', 'supportId'],
    linkPattern: '/admin/soporte/:id',
  },
];

/** Mapa rápido key -> definición */
export const TRIGGER_MAP: Record<string, NotificationTriggerDef> =
  Object.fromEntries(NOTIFICATION_TRIGGERS.map((t) => [t.key, t]));

/**
 * Builders de links relativos. Centralizados para evitar que las rutas se
 * desincronicen entre los distintos servicios que emiten notificaciones.
 */
export const links = {
  quotas: () => '/cuotas',
  quotaPayments: () => '/cuotas/pagos',
  activity: (id: number | string) => `/actividades/${id}`,
  reservation: (id: number | string) => `/reservas/${id}`,
  adminReservation: (id: number | string) => `/admin/reservas/${id}`,
  post: (id: number | string) => `/comunicados/${id}`,
  agreement: (id: number | string) => `/convenios/${id}`,
  survey: (id: number | string) => `/encuestas/${id}`,
  profile: () => '/perfil',
  adminMember: (id: number | string) => `/admin/miembros/${id}`,
  invoice: (id: number | string) => `/comprobantes/${id}`,
  adminInvoice: (id: number | string) => `/admin/comprobantes/${id}`,
  certificate: (id: number | string) => `/certificados/${id}`,
  support: (id: number | string) => `/soporte/${id}`,
  adminSupport: (id: number | string) => `/admin/soporte/${id}`,
};
