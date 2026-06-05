-- Siembra los NotificationTemplate referenciados por el módulo de Support.
-- ON CONFLICT (code) DO NOTHING: idempotente y respeta cambios hechos desde el admin.

INSERT INTO "notification_templates"
  ("code", "name", "subject", "body", "shortBody", "channels", "isCritical", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'SUPPORT_CREATED',
    'Soporte — Nuevo reclamo recibido',
    'Nuevo reclamo: {{topic}}',
    $BODY$<p>Se ha registrado un nuevo reclamo en la plataforma.</p>
<p><strong>Tema:</strong> {{topic}}</p>
<p><strong>Agremiado:</strong> {{memberName}}</p>
<p>Revísalo en la bandeja de soporte (ID #{{supportId}}).</p>$BODY$,
    'Nuevo reclamo de {{memberName}}: {{topic}}',
    '["EMAIL","IN_APP"]'::jsonb,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'SUPPORT_ASSIGNED',
    'Soporte — Reclamo asignado',
    'Tu reclamo "{{topic}}" fue asignado',
    $BODY$<p>Hola,</p>
<p>Tu reclamo <strong>"{{topic}}"</strong> (ID #{{supportId}}) fue asignado a <strong>{{assignedName}}</strong> y ya está en proceso de atención.</p>
<p>Te notificaremos cuando haya novedades.</p>$BODY$,
    'Tu reclamo "{{topic}}" está siendo atendido por {{assignedName}}.',
    '["EMAIL","IN_APP"]'::jsonb,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'SUPPORT_RESOLVED',
    'Soporte — Reclamo resuelto',
    'Tu reclamo "{{topic}}" fue resuelto',
    $BODY$<p>Hola,</p>
<p>Tu reclamo <strong>"{{topic}}"</strong> (ID #{{supportId}}) ha sido marcado como <strong>resuelto</strong>.</p>
<p>Puedes revisar la respuesta y, si todo está conforme, calificar la atención desde el portal.</p>$BODY$,
    'Tu reclamo "{{topic}}" fue resuelto. Califica la atención.',
    '["EMAIL","IN_APP"]'::jsonb,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'SUPPORT_REJECTED',
    'Soporte — Reclamo rechazado',
    'Tu reclamo "{{topic}}" fue rechazado',
    $BODY$<p>Hola,</p>
<p>Lamentablemente, tu reclamo <strong>"{{topic}}"</strong> (ID #{{supportId}}) fue rechazado.</p>
<p><strong>Motivo:</strong> {{rejectReason}}</p>
<p>Si no estás de acuerdo, puedes reabrirlo desde el portal indicando una nueva justificación.</p>$BODY$,
    'Tu reclamo "{{topic}}" fue rechazado: {{rejectReason}}',
    '["EMAIL","IN_APP"]'::jsonb,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  ),
  (
    'SUPPORT_REOPENED',
    'Soporte — Reclamo reabierto',
    'Reclamo reabierto: {{topic}}',
    $BODY$<p>El agremiado ha reabierto un reclamo previamente cerrado.</p>
<p><strong>Tema:</strong> {{topic}} (ID #{{supportId}})</p>
<p><strong>Motivo de reapertura:</strong> {{reopenReason}}</p>
<p>Por favor, retómalo desde la bandeja de soporte.</p>$BODY$,
    'Reclamo reabierto "{{topic}}": {{reopenReason}}',
    '["EMAIL","IN_APP"]'::jsonb,
    FALSE,
    TRUE,
    NOW(),
    NOW()
  )
ON CONFLICT ("code") DO NOTHING;
