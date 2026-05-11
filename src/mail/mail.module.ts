import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { join } from 'path';
import { MailService } from './mail.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { EnvConfig } from 'src/config';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig>) => ({
        transport: {
          service: 'gmail',
          auth: {
            user: configService.get('MAIL_USER', { infer: true }),
            pass: configService.get('MAIL_PASSWORD', { infer: true }),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get('MAIL_USER', { infer: true })}>`,
        },
        template: {
          dir: join(process.cwd(), 'dist', 'mail', 'templates'),
          adapter: new HandlebarsAdapter(undefined, {
            inlineCssEnabled: false,
          }),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
