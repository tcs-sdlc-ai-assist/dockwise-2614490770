/**
 * Root application module for the Dockwise backend.
 *
 * Wires the database, global guards, and feature modules. Business routes are
 * versioned under /api/v1; the health endpoint is mounted separately at
 * /api/health.
 */
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppDataSource } from './config/database.module';
import { config } from './config/configuration';
import { seed } from './database/seed';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SitesModule } from './modules/sites/sites.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { VisitsModule } from './modules/visits/visits.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HealthController } from './health.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
      autoLoadEntities: true,
    } as never),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    SitesModule,
    AppointmentsModule,
    VisitsModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Seed demo data idempotently on bootstrap, except for in-memory test
   * databases (tests control their own fixtures).
   *
   * Returns:
   *   Resolves when seeding is complete or skipped.
   */
  async onApplicationBootstrap(): Promise<void> {
    if (config.seedOnStartup && config.dbPath !== ':memory:') {
      await seed(this.dataSource);
    }
  }
}
