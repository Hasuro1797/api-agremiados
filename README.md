# API Colegios Profesionales

API backend de la plataforma de gestión digital para **colegios profesionales del Perú**. Centraliza la administración de miembros colegiados, cuotas mensuales, eventos, reservas de espacios, encuestas, comunicados y facturación electrónica SUNAT, con un motor de automatización para tareas recurrentes (recordatorios de pago, alertas de morosidad, notificaciones de eventos).

Construida con **NestJS + GraphQL (code-first) + Prisma**, integra **Izipay** como pasarela de pagos, **SUNAT** para facturación electrónica, **Cloudinary** para medios y **Resend** para email transaccional.

---

## 🧰 Stack Tecnológico

| Categoría                | Tecnología                                 |
| ------------------------ | ------------------------------------------ |
| Runtime                  | Node.js 18+                                |
| Framework                | NestJS 11                                  |
| Lenguaje                 | TypeScript 5                               |
| API                      | GraphQL (Apollo Server, code-first)        |
| ORM                      | Prisma 7                                   |
| Base de datos            | PostgreSQL 15+                             |
| Autenticación            | JWT (access + refresh) con Passport        |
| Validación               | class-validator + class-transformer        |
| Upload de archivos       | graphql-upload-ts                          |
| Almacenamiento de medios | Cloudinary                                 |
| Email transaccional      | Resend + Nodemailer + Handlebars           |
| Pasarela de pago         | Izipay (FormToken + Webhooks)              |
| Facturación electrónica  | SUNAT (XML UBL 2.1, firma digital PFX, WS) |
| Programación de tareas   | @nestjs/schedule (cron)                    |
| Gestor de paquetes       | pnpm                                       |
| Despliegue               | Railway                                    |

---

## ✅ Prerrequisitos

Antes de empezar asegúrate de tener:

- **Node.js** 18 o superior
- **pnpm** 8+ (`npm install -g pnpm`)
- **PostgreSQL** 15 o superior (local o en Railway)
- **Cuenta en [Izipay](https://izipay.pe/)** con credenciales de comercio (sandbox o producción)
- **Cuenta en [Cloudinary](https://cloudinary.com/)** con `cloud name`, `api key` y `api secret`
- **Cuenta en [Resend](https://resend.com/)** con API key
- **Certificado digital PFX** emitido para facturación electrónica SUNAT (solo si activas el módulo de facturación)
- **Credenciales SOL de SUNAT** para el envío de comprobantes

---

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repo> api_colegios
cd api_colegios
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

> Consulta la sección [Variables de entorno](#-variables-de-entorno) para conocer cada variable.

### 4. Aplicar migraciones de Prisma

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

### 5. (Opcional) Cargar datos iniciales

```bash
pnpm prisma db seed
```

### 6. Levantar el servidor

```bash
pnpm run start:dev
```

La API estará disponible en `http://localhost:3001/graphql`.

---

## 🔐 Variables de Entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
# ============================
# Base de datos (PostgreSQL)
# ============================
DATABASE_URL="postgresql://postgres:password@localhost:5432/colegios?schema=public"

# ============================
# Entorno y servidor
# ============================
NODE_ENV=development
PORT=3001

# ============================
# JWT
# ============================
AT_JWT_SECRET="tu_secreto_access_token"   # Firma del Access Token (corta duración)
RT_JWT_SECRET="tu_secreto_refresh_token"  # Firma del Refresh Token (larga duración)

# ============================
# Email (Nodemailer + Resend)
# ============================
MAIL_USER=tu.correo@gmail.com             # Cuenta SMTP usada por Nodemailer
MAIL_PASSWORD=app_password_gmail          # App password (no la clave normal)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx       # API key de Resend para email transaccional

# ============================
# Cloudinary (medios)
# ============================
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# ============================
# Izipay (pasarela de pagos PE)
# ============================
IZIPAY_MERCHANT_CODE=tu_merchant_code     # Código de comercio Izipay
IZIPAY_PUBLIC_KEY=tu_public_key           # Clave pública (cliente)
IZIPAY_KEY_HASH=tu_hmac_secret            # Secreto HMAC para validar webhooks
IZIPAY_URL=https://sandbox-api-pw.izipay.pe   # Sandbox; en prod usar la URL oficial

# ============================
# CORS / URLs de frontend
# ============================
FRONTEND_URL=http://localhost:3000        # URL del portal del miembro
ADMIN_URL=http://localhost:3000           # URL del panel administrativo
```

> ⚠️ **Nunca** subas el `.env` al repositorio. Asegúrate de que esté listado en `.gitignore`.

---

## 🛠️ Comandos Disponibles

### Desarrollo

```bash
pnpm run start            # Arranca el servidor
pnpm run start:dev        # Modo watch (recomendado en desarrollo)
pnpm run start:debug      # Modo debug + watch
pnpm run start:prod       # Ejecuta el build compilado
pnpm run build            # Compila TypeScript a /dist
```

### Calidad de código

```bash
pnpm run lint             # ESLint con auto-fix
pnpm run format           # Prettier sobre src/ y test/
```

### Testing

```bash
pnpm run test             # Tests unitarios
pnpm run test:watch       # Tests en watch mode
pnpm run test:cov         # Tests con cobertura
pnpm run test:e2e         # Tests end-to-end
```

### Prisma

```bash
pnpm prisma studio              # GUI para inspeccionar la BD
pnpm prisma migrate dev         # Crea y aplica una nueva migración (dev)
pnpm prisma migrate deploy      # Aplica migraciones pendientes (prod)
pnpm prisma generate            # Regenera el cliente de Prisma
pnpm prisma db seed             # Ejecuta el seeder
```

---

## 📁 Estructura del Proyecto

```
api_colegios/
├── prisma/
│   ├── schema.prisma           # Definición del modelo de datos (~38 entidades)
│   └── migrations/             # Historial de migraciones SQL
├── src/
│   ├── main.ts                 # Bootstrap (CORS, ValidationPipe, upload middleware)
│   ├── app.module.ts           # Módulo raíz + guards globales
│   ├── schema.gql              # Schema GraphQL autogenerado (code-first)
│   │
│   ├── auth/                   # JWT, refresh, guards, estrategias, revocación de tokens
│   │   ├── decorators/         #   @Public, @CurrentUser, @Roles
│   │   ├── guards/             #   GqlAccessTokenGuard, RolesGuard
│   │   ├── strategies/         #   AT/RT Passport strategies
│   │   └── tasks/              #   Limpieza programada de refresh tokens revocados
│   │
│   ├── user/                   # Usuarios y perfiles
│   ├── members/                # Miembros colegiados (categorías: REGULAR, JUBILADO, etc.)
│   ├── activities/             # Eventos y actividades del colegio
│   ├── attendees/              # Asistencias y registro a actividades
│   ├── quotas/                 # Cuotas mensuales y pagos (con cron de morosidad)
│   │   └── tasks/              #   Generación automática de periodos y alertas
│   ├── reservation/            # Reserva de espacios + flujo de aprobación
│   ├── survey/                 # Encuestas y respuestas
│   ├── post/                   # Comunicados (contenido TipTap JSON)
│   ├── agreement/              # Convenios y beneficios
│   ├── notification/           # Notificaciones in-app y por email
│   ├── audit-log/              # Registro de auditoría de acciones
│   ├── dashboard/              # Métricas y KPIs agregados
│   ├── support/                # Tickets y soporte
│   │
│   ├── settings/               # Configuración (sub-módulos)
│   │   ├── organization/       #   Branding, módulos activos, billing config
│   │   ├── notification-template/
│   │   ├── automation-rule/    #   Motor de automatización con cron
│   │   ├── quota-discount/
│   │   └── quote-amount/
│   │
│   ├── media/                  # Subida de archivos vía graphql-upload
│   ├── cloudinary/             # Cliente Cloudinary
│   ├── mail/                   # Servicio de email + plantillas Handlebars
│   │   └── templates/
│   ├── db/                     # Módulo Prisma (global)
│   ├── common/                 # DTOs y entidades compartidas
│   └── config/                 # Variables de entorno tipadas
│
├── test/                       # E2E tests
├── .env.example
├── nest-cli.json
├── prisma.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 API GraphQL

La API usa el enfoque **code-first** de NestJS: el schema `src/schema.gql` se **genera automáticamente** al iniciar el servidor a partir de los decoradores (`@ObjectType`, `@InputType`, `@Resolver`, `@Query`, `@Mutation`).

- 🎮 **Playground / Apollo Sandbox**: `http://localhost:3001/graphql`
- 📤 **Uploads**: soportados vía `graphql-upload-ts` (multipart)
- 🛡️ **CSRF prevention** habilitado
- ✅ **Validación global** con `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true`
- 🚨 **Errores formateados** globalmente desde `AppModule`

---

## 🔑 Autenticación y Autorización

### Flujo JWT

1. **Login** → el cliente envía credenciales y recibe un `accessToken` (corta duración, firmado con `AT_JWT_SECRET`) y un `refreshToken` (larga duración, firmado con `RT_JWT_SECRET`).
2. **Acceso** → el `accessToken` viaja en el header `Authorization: Bearer <token>` y es validado por `GqlAccessTokenGuard` (registrado globalmente en `AppModule`).
3. **Refresh** → cuando el access token expira, el cliente envía el refresh token al endpoint de refresh; el servidor responde con un nuevo par.
4. **Logout** → el refresh token se **revoca** (almacenado como inválido en BD). Una tarea cron en `auth/tasks/` limpia periódicamente los tokens revocados expirados.

### Decoradores útiles

| Decorador        | Uso                                                                |
| ---------------- | ------------------------------------------------------------------ |
| `@Public()`      | Hace pública una query/mutation (omite el guard de auth)           |
| `@CurrentUser()` | Inyecta el usuario autenticado en el resolver                      |
| `@Roles(...)`    | Restringe acceso a roles específicos (verificado por `RolesGuard`) |

### Roles (RBAC)

| Rol          | Descripción                                      |
| ------------ | ------------------------------------------------ |
| `SUPERADMIN` | Acceso total multi-organización                  |
| `ADMIN`      | Administración completa de su colegio            |
| `MODERATOR`  | Gestión limitada (eventos, comunicados, soporte) |
| `MEMBER`     | Miembro colegiado (acceso al portal)             |

---

## 🔌 Integraciones Externas

### 💳 Izipay (pasarela de pagos PE)

Flujo **FormToken** (popup embebido en el frontend):

1. El cliente solicita pagar una cuota o entrada a un evento.
2. El backend llama a Izipay con `IZIPAY_MERCHANT_CODE` y `IZIPAY_PUBLIC_KEY` para generar un **FormToken** asociado a la transacción.
3. El frontend usa ese token para abrir el popup de pago de Izipay.
4. Tras el pago, Izipay envía un **webhook** al backend con el resultado.
5. El backend valida la firma HMAC del webhook usando `IZIPAY_KEY_HASH` y, si es válida, marca la cuota/inscripción como pagada y dispara las notificaciones correspondientes.

> Sandbox: `IZIPAY_URL=https://sandbox-api-pw.izipay.pe`

### 🧾 SUNAT (Facturación Electrónica)

Cumple con el estándar UBL 2.1 de SUNAT:

1. **Generación XML** → al confirmarse un pago, se genera el comprobante (boleta o factura) en formato XML UBL 2.1 con todos los detalles (`InvoiceHeader`, `InvoiceDetail`).
2. **Firma digital** → el XML se firma con el certificado **PFX** del colegio (XAdES-BES).
3. **Envío al WS de SUNAT** → el archivo firmado y comprimido (ZIP) se envía al Web Service correspondiente (Beta o Producción) usando las credenciales SOL.
4. **Procesamiento del CDR** → SUNAT responde con un **CDR** (Constancia de Recepción) que se descomprime, valida y persiste en `Invoice` indicando si fue aceptado, observado o rechazado.
5. **Reintentos automáticos** → un cron en el motor de automatización reintenta los envíos fallidos.

### 🖼️ Cloudinary

- Subida de imágenes y archivos vía resolver GraphQL con `graphql-upload-ts`.
- El `CloudinaryModule` expone el SDK; `MediaModule` orquesta uploads, transformaciones y eliminación.
- Las URLs y `public_id` se persisten en BD para soportar transformaciones on-the-fly.

### 📧 Resend

- Email transaccional (recuperación de contraseña, recordatorios de pago, confirmaciones de evento, recibos electrónicos).
- Plantillas HTML compiladas con **Handlebars** desde `src/mail/templates/`, registradas como assets de Nest.
- `MailService` expone helpers tipados para cada tipo de email.

### ⏰ Motor de Automatización (Cron)

Construido sobre `@nestjs/schedule`. Cada módulo con tareas programadas tiene su carpeta `tasks/`:

- 🔔 **Recordatorios de pago** — antes del vencimiento de la cuota mensual
- ⚠️ **Alertas de morosidad** — al pasar X días sin pago
- 📅 **Notificaciones de eventos** — días previos a actividades inscritas
- 🧹 **Limpieza de refresh tokens** revocados/expirados
- 🔁 **Reintento de envíos SUNAT** fallidos
- 📊 **Generación automática de periodos de cuota** mensuales

Las reglas son configurables vía `AutomationRule` y `NotificationTemplate` en el módulo `settings/`.

---

## ☁️ Despliegue en Railway

1. **Crear proyecto en Railway** y conectar el repositorio de GitHub.
2. **Aprovisionar PostgreSQL** desde el marketplace de Railway. Copia el `DATABASE_URL` que genera (formato `postgresql://...`).
3. **Configurar variables de entorno** en `Settings → Variables` de Railway. Pega todas las del `.env` (DATABASE_URL, JWT secrets, Cloudinary, Resend, Izipay, etc.). Cambia `NODE_ENV=production` y `IZIPAY_URL` a la URL de producción.
4. **Configurar el comando de build y start**:
   - Build: `pnpm install && pnpm prisma generate && pnpm run build`
   - Start: `pnpm prisma migrate deploy && pnpm run start:prod`
5. **Asignar dominio público** desde `Settings → Networking → Generate Domain` (o usa un dominio personalizado).
6. **Actualizar `FRONTEND_URL` y `ADMIN_URL`** con las URLs de producción del frontend (necesario para CORS).
7. **Configurar el webhook de Izipay** en su dashboard apuntando al endpoint público de tu API (`https://<tu-dominio>/izipay/webhook`).
8. **Subir el certificado PFX de SUNAT** como Secret File de Railway (si activas facturación) y referenciar su path por variable de entorno.

> 💡 Railway redespliega automáticamente en cada push a la rama configurada.

---

## 📄 Licencia

**Proprietary** — Todos los derechos reservados. Este código es propiedad del cliente y su uso, copia, modificación o distribución sin autorización expresa por escrito está prohibida.
