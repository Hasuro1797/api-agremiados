-- Motor de automatizaciones: recordatorios programados.
-- 1) Siembra los templates QUOTA_DUE_REMINDER y EVENT_REMINDER (faltantes).
-- 2) Siembra reglas por defecto en automation_rules para que el motor opere
--    out-of-the-box (5 días antes de la cuota, 1 día antes del evento).
-- Todo idempotente: ON CONFLICT en templates, WHERE NOT EXISTS en reglas.

-- ===== Templates =====
INSERT INTO "notification_templates"
  ("code", "name", "subject", "body", "shortBody", "channels", "isCritical", "isActive", "createdAt", "updatedAt")
VALUES
  (
    'QUOTA_DUE_REMINDER',
    'Cuotas — Recordatorio por vencer',
    'Tu cuota de {{month}}/{{year}} vence pronto',
    $BODY$<p>Hola,</p>
<p>Te recordamos que tu cuota de <strong>{{month}}/{{year}}</strong> por <strong>S/ {{amount}}</strong> vence el <strong>{{dueDate}}</strong>.</p>
<p>Págala a tiempo desde el portal para mantener tu habilitación al día.</p>$BODY$,
    'Tu cuota {{month}}/{{year}} (S/ {{amount}}) vence el {{dueDate}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  ),
  (
    'EVENT_REMINDER',
    'Eventos — Recordatorio de evento próximo',
    'Recordatorio: {{title}}',
    $BODY$<p>Hola,</p>
<p>Te recordamos que el evento <strong>{{title}}</strong> al que confirmaste asistencia es el <strong>{{date}}</strong>.</p>
<p><strong>Lugar:</strong> {{place}}</p>
<p>¡Te esperamos!</p>$BODY$,
    'Recordatorio: {{title}} — {{date}} en {{place}}',
    '["IN_APP"]'::jsonb,
    FALSE, TRUE, NOW(), NOW()
  )
ON CONFLICT ("code") DO NOTHING;

-- ===== Reglas por defecto =====
INSERT INTO "automation_rules"
  ("name", "description", "trigger", "config", "isActive", "createdAt", "updatedAt")
SELECT
  'Recordatorio de cuota (5 días antes)',
  'Avisa a los agremiados con cuota pendiente 5 días antes del vencimiento.',
  'QUOTA_DUE_REMINDER'::"AutomationTrigger",
  '{"daysBefore":5}'::jsonb,
  TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "automation_rules" WHERE "trigger" = 'QUOTA_DUE_REMINDER'::"AutomationTrigger"
);

INSERT INTO "automation_rules"
  ("name", "description", "trigger", "config", "isActive", "createdAt", "updatedAt")
SELECT
  'Recordatorio de evento (1 día antes)',
  'Avisa a los asistentes confirmados 1 día antes del evento.',
  'EVENT_REMINDER'::"AutomationTrigger",
  '{"daysBefore":1}'::jsonb,
  TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "automation_rules" WHERE "trigger" = 'EVENT_REMINDER'::"AutomationTrigger"
);
