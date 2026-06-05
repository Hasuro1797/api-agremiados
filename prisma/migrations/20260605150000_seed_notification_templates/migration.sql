-- Siembra los NotificationTemplate de todo el dominio (cuotas, actividades,
-- reservas, comunicación, encuestas, membresía, facturación, certificados y el
-- SUPPORT_OVERDUE que faltaba). El `code` coincide 1:1 con el triggerKey del
-- catálogo (src/notification/notification-catalog.ts).
-- ON CONFLICT (code) DO NOTHING: idempotente, respeta ediciones desde el admin.

INSERT INTO "notification_templates"
  ("code", "name", "subject", "body", "shortBody", "channels", "isCritical", "isActive", "createdAt", "updatedAt")
VALUES
  -- ===== Cuotas =====
  (
    'QUOTA_NEW_PERIOD',
    'Cuotas — Nueva cuota del mes',
    'Tu cuota de {{month}}/{{year}} ya está disponible',
    $BODY$<p>Hola,</p>
<p>Se generó tu cuota correspondiente a <strong>{{month}}/{{year}}</strong>.</p>
<p><strong>Monto:</strong> S/ {{amount}}</p>
<p><strong>Vence:</strong> {{dueDate}}</p>
<p>Puedes pagarla desde el portal.</p>$BODY$,
    'Nueva cuota {{month}}/{{year}}: S/ {{amount}} (vence {{dueDate}})',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'QUOTA_OVERDUE',
    'Cuotas — Cuota en mora',
    'Tu cuota de {{period}} está en mora',
    $BODY$<p>Hola,</p>
<p>Tu cuota de <strong>{{period}}</strong> por <strong>S/ {{amount}}</strong> venció el {{dueDate}} y se encuentra en mora.</p>
<p>Regulariza tu pago para evitar restricciones en tu habilitación.</p>$BODY$,
    'Cuota {{period}} en mora: S/ {{amount}} (venció {{dueDate}})',
    '["IN_APP","EMAIL"]'::jsonb,
    TRUE, TRUE, NOW(), NOW()
  ),
  (
    'QUOTA_PAYMENT_CONFIRMED',
    'Cuotas — Pago confirmado',
    'Confirmamos tu pago de cuota',
    $BODY$<p>Hola,</p>
<p>Registramos correctamente el pago de <strong>{{paymentCount}}</strong> cuota(s) por un total de <strong>S/ {{amount}}</strong> ({{period}}).</p>
<p>¡Gracias por mantenerte al día!</p>$BODY$,
    'Pago confirmado: S/ {{amount}} ({{period}})',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'MEMBER_BLOCKED',
    'Cuotas — Bloqueo por mora',
    'Tu cuenta fue bloqueada por mora',
    $BODY$<p>Hola,</p>
<p>Tu cuenta ha sido <strong>bloqueada</strong> debido a cuotas en mora (S/ {{amount}}).</p>
<p>Regulariza tu situación para restablecer el acceso a los servicios.</p>$BODY$,
    'Tu cuenta fue bloqueada por mora (S/ {{amount}})',
    '["IN_APP","EMAIL"]'::jsonb,
    TRUE, TRUE, NOW(), NOW()
  ),

  -- ===== Eventos / actividades =====
  (
    'ACTIVITY_CREATED',
    'Eventos — Nuevo evento publicado',
    'Nuevo evento: {{title}}',
    $BODY$<p>Se publicó un nuevo evento.</p>
<p><strong>{{title}}</strong></p>
<p><strong>Fecha:</strong> {{date}}</p>
<p><strong>Lugar:</strong> {{place}}</p>$BODY$,
    'Nuevo evento: {{title}} — {{date}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'ACTIVITY_INVITATION',
    'Eventos — Invitación a un evento',
    'Estás invitado: {{title}}',
    $BODY$<p>Hola,</p>
<p>Has sido invitado al evento <strong>{{title}}</strong>.</p>
<p><strong>Fecha:</strong> {{date}}</p>
<p><strong>Lugar:</strong> {{place}}</p>
<p>Confirma tu asistencia desde el portal.</p>$BODY$,
    'Invitación: {{title}} — {{date}}',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Reservas =====
  (
    'RESERVATION_REQUESTED',
    'Reservas — Nueva solicitud',
    'Nueva solicitud de reserva: {{space}}',
    $BODY$<p>Se registró una nueva solicitud de reserva.</p>
<p><strong>Espacio:</strong> {{space}}</p>
<p><strong>Fecha:</strong> {{date}}</p>
<p><strong>Agremiado:</strong> {{memberName}}</p>
<p>Revísala en la bandeja de reservas.</p>$BODY$,
    'Reserva solicitada: {{space}} ({{date}}) por {{memberName}}',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'RESERVATION_APPROVED',
    'Reservas — Reserva aprobada',
    'Tu reserva de {{space}} fue aprobada',
    $BODY$<p>Hola,</p>
<p>Tu solicitud de reserva del espacio <strong>{{space}}</strong> para el <strong>{{date}}</strong> fue <strong>aprobada</strong>.</p>$BODY$,
    'Reserva aprobada: {{space}} ({{date}})',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'RESERVATION_REJECTED',
    'Reservas — Reserva rechazada',
    'Tu reserva de {{space}} fue rechazada',
    $BODY$<p>Hola,</p>
<p>Tu solicitud de reserva del espacio <strong>{{space}}</strong> para el <strong>{{date}}</strong> fue <strong>rechazada</strong>.</p>
<p><strong>Motivo:</strong> {{reason}}</p>$BODY$,
    'Reserva rechazada: {{space}} ({{date}}) — {{reason}}',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Comunicación =====
  (
    'POST_PUBLISHED',
    'Comunicación — Nuevo comunicado',
    'Nuevo comunicado: {{title}}',
    $BODY$<p>Se publicó un nuevo comunicado: <strong>{{title}}</strong>.</p>
<p>Léelo en el portal.</p>$BODY$,
    'Nuevo comunicado: {{title}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'AGREEMENT_PUBLISHED',
    'Comunicación — Nuevo convenio',
    'Nuevo convenio: {{title}}',
    $BODY$<p>Hay un nuevo convenio disponible: <strong>{{title}}</strong>.</p>
<p>Revisa los beneficios en el portal.</p>$BODY$,
    'Nuevo convenio: {{title}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Encuestas =====
  (
    'SURVEY_PUBLISHED',
    'Encuestas — Nueva encuesta',
    'Nueva encuesta: {{title}}',
    $BODY$<p>Tu opinión cuenta. Se publicó una nueva encuesta: <strong>{{title}}</strong>.</p>
<p><strong>Disponible hasta:</strong> {{deadline}}</p>
<p>Respóndela desde el portal.</p>$BODY$,
    'Nueva encuesta: {{title}} (hasta {{deadline}})',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Membresía =====
  (
    'MEMBER_WELCOME',
    'Membresía — Bienvenida',
    '¡Bienvenido(a), {{userName}}!',
    $BODY$<p>Hola {{userName}},</p>
<p>Tu cuenta de agremiado ya está <strong>activa</strong>. Te damos la bienvenida a la plataforma.</p>
<p>Completa tu perfil y explora los servicios disponibles.</p>$BODY$,
    '¡Bienvenido(a), {{userName}}! Tu cuenta está activa.',
    '["IN_APP","EMAIL"]'::jsonb,
    TRUE, TRUE, NOW(), NOW()
  ),
  (
    'MEMBER_REGISTERED',
    'Membresía — Nuevo registro',
    'Nuevo agremiado registrado: {{memberName}}',
    $BODY$<p>Un nuevo agremiado se registró y está pendiente de aprobación.</p>
<p><strong>Nombre:</strong> {{memberName}}</p>
<p>Revísalo en la gestión de miembros.</p>$BODY$,
    'Nuevo registro pendiente: {{memberName}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Facturación =====
  (
    'INVOICE_ISSUED',
    'Facturación — Comprobante emitido',
    'Comprobante {{serie}}-{{number}} emitido',
    $BODY$<p>Hola,</p>
<p>Se emitió tu comprobante electrónico <strong>{{serie}}-{{number}}</strong> por un total de <strong>S/ {{total}}</strong>.</p>
<p>Puedes descargarlo desde el portal.</p>$BODY$,
    'Comprobante {{serie}}-{{number}} emitido (S/ {{total}})',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'INVOICE_FAILED',
    'Facturación — Fallo en emisión',
    'Fallo al emitir comprobante (orden {{orderNumber}})',
    $BODY$<p>La emisión de un comprobante falló y requiere atención.</p>
<p><strong>Orden:</strong> {{orderNumber}}</p>
<p><strong>Error:</strong> {{error}}</p>$BODY$,
    'Fallo emisión comprobante orden {{orderNumber}}: {{error}}',
    '["IN_APP","EMAIL"]'::jsonb,
    TRUE, TRUE, NOW(), NOW()
  ),

  -- ===== Certificados =====
  (
    'CERTIFICATE_READY',
    'Certificados — Certificado disponible',
    'Tu certificado de {{type}} está listo',
    $BODY$<p>Hola,</p>
<p>Tu certificado de <strong>{{type}}</strong> ya está disponible.</p>
<p><strong>Código de verificación:</strong> {{code}}</p>
<p>Descárgalo desde el portal.</p>$BODY$,
    'Tu certificado de {{type}} está listo (cód. {{code}})',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),

  -- ===== Soporte (faltante en el seed anterior) =====
  (
    'SUPPORT_OVERDUE',
    'Soporte — Reclamo sin atender a tiempo',
    'Reclamo sin atender: {{topic}}',
    $BODY$<p>El siguiente reclamo superó el tiempo de atención y sigue pendiente.</p>
<p><strong>Tema:</strong> {{topic}} (ID #{{supportId}})</p>
<p>Atiéndelo a la brevedad desde la bandeja de soporte.</p>$BODY$,
    'Reclamo sin atender a tiempo: {{topic}} (#{{supportId}})',
    '["IN_APP","EMAIL"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  )
ON CONFLICT ("code") DO NOTHING;
