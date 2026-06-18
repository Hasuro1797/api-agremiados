import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import depthLimit from 'graphql-depth-limit';
import { join } from 'path';
import { validate } from './config/index';
import { PrismaModule } from './db/prisma.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { GqlAccessTokenGuard } from './auth/guards/gql-access-token.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { MailModule } from './mail/mail.module';
import { UserModule } from './user/user.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MediaModule } from './media/media.module';
import { ActivityModule } from './activities/activity.module';
import { MemberModule } from './members/member.module';
import { AttendeeModule } from './attendees/attendee.module';
import { QuotaModule } from './quotas/quota.module';
import { SettingsModule } from './settings/settings.module';
import { ReservationModule } from './reservation/reservation.module';
import { AgreementModule } from './agreement/agreement.module';
import { PostModule } from './post/post.module';
import { SurveyModule } from './survey/survey.module';
import { SupportModule } from './support/support.module';
import { NotificationModule } from './notification/notification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SunatModule } from './sunat/sunat.module';
import { IzipayModule } from './izipay/izipay.module';
import { InvoiceModule } from './invoice/invoice.module';
import { PdfModule } from './pdf/pdf.module';
import { CertificatesModule } from './certificates/certificates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ScheduleModule.forRoot(),
    // Rate limiting global: 60 req/min por IP por defecto (los resolvers de
    // auth lo endurecen con @Throttle). En memoria; para multi-instancia migrar
    // a ThrottlerStorageRedis.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      // Mitiga DoS por queries profundamente anidadas.
      validationRules: [depthLimit(10)],
      // Introspección y landing interactiva solo fuera de producción.
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [
        process.env.NODE_ENV === 'production'
          ? ApolloServerPluginLandingPageProductionDefault({ footer: false })
          : ApolloServerPluginLandingPageLocalDefault(),
      ],
      context: ({ req, res }) => ({ req, res }),
      csrfPrevention: true,
      formatError: (error) => {
        const originalError = error.extensions?.originalError as
          | { message: string | string[]; statusCode: number }
          | undefined;

        const message = originalError?.message ?? error.message;

        return {
          message: Array.isArray(message) ? message.join(', ') : message,
          statusCode: originalError?.statusCode ?? 500,
          path: error.path,
        };
      },
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
    MailModule,
    UserModule,
    CloudinaryModule,
    MediaModule,
    ActivityModule,
    MemberModule,
    AttendeeModule,
    QuotaModule,
    SettingsModule,
    ReservationModule,
    AgreementModule,
    PostModule,
    SurveyModule,
    SupportModule,
    NotificationModule,
    DashboardModule,
    SunatModule,
    IzipayModule,
    InvoiceModule,
    PdfModule,
    CertificatesModule,
  ],
  controllers: [],
  providers: [
    // Rate limiting primero, para frenar floods aún sin autenticar.
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
    // Global guards: all GraphQL resolvers require auth by default.
    // Use @Public() to opt out.
    {
      provide: APP_GUARD,
      useClass: GqlAccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
