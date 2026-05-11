import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from 'src/mail/mail.module';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import {
  AccessTokenStrategy,
  RefreshTokenStrategy,
} from './strategies/index.js';
import { RevokedTokenCleanupTask } from './tasks/revoked-token-cleanup.task';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MailModule,
  ],
  providers: [
    AuthService,
    AuthResolver,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    RevokedTokenCleanupTask,
  ],
  exports: [AuthService],
})
export class AuthModule {}
