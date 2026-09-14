/**
 * Auth module: wires authentication, JWT strategy, and the auth controller.
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { ImpersonationService } from './impersonation.service';
import { ImpersonationController } from './impersonation.controller';
import { User } from '../users/user.entity';
import { Membership } from '../organizations/membership.entity';
import { AuditModule } from '../audit/audit.module';
import { config } from '../../config/configuration';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Membership]),
    PassportModule,
    JwtModule.register({
      secret: config.jwtSecret,
      signOptions: { expiresIn: config.jwtExpiresIn },
    }),
    AuditModule,
  ],
  providers: [AuthService, JwtStrategy, ImpersonationService],
  controllers: [AuthController, ImpersonationController],
  exports: [AuthService, ImpersonationService],
})
export class AuthModule {}
