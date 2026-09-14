/**
 * Unit tests for AuditService and ImpersonationService.
 *
 * Covers append-only audit writes with impersonation markers, audit listing
 * filters, and the impersonation start flow with its audit record.
 */
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';
import { ImpersonationService } from '../auth/impersonation.service';
import { AuthService } from '../auth/auth.service';
import { User } from '../users/user.entity';
import { Organization, OrganizationType } from '../organizations/organization.entity';
import { Membership, Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('AuditService', () => {
  let dataSource: DataSource;
  let auditLog: Repository<AuditLog>;
  let service: AuditService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    auditLog = dataSource.getRepository(AuditLog);
    service = new AuditService(auditLog);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await auditLog.clear();
  });

  it('records an audit entry with an impersonation marker', async () => {
    const log = await service.record({
      action: 'appointment.cancel',
      entityType: 'appointment',
      entityId: 'appt-1',
      actorUserId: 'admin-1',
      impersonatedBy: 'platform-admin-1',
      siteId: 'site-1',
      detail: { reason: 'late_cancel' },
    });
    expect(log.impersonatedBy).toBe('platform-admin-1');
    expect(log.detail).toContain('late_cancel');
  });

  it('lists audit entries filtered by entity', async () => {
    await service.record({
      action: 'appointment.create',
      entityType: 'appointment',
      entityId: 'a1',
      actorUserId: 'u1',
    });
    await service.record({
      action: 'door.reassign',
      entityType: 'door',
      entityId: 'd1',
      actorUserId: 'u1',
    });
    const appointments = await service.list({ entityType: 'appointment' });
    expect(appointments).toHaveLength(1);
    expect(appointments[0].action).toBe('appointment.create');
  });
});

describe('ImpersonationService', () => {
  let dataSource: DataSource;
  let users: Repository<User>;
  let orgs: Repository<Organization>;
  let memberships: Repository<Membership>;
  let auditLog: Repository<AuditLog>;
  let service: ImpersonationService;
  let targetUser: User;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    users = dataSource.getRepository(User);
    orgs = dataSource.getRepository(Organization);
    memberships = dataSource.getRepository(Membership);
    auditLog = dataSource.getRepository(AuditLog);
    const audit = new AuditService(auditLog);
    const jwt = new JwtService({ secret: 'test-secret' });
    const auth = new AuthService(users, memberships, jwt);
    service = new ImpersonationService(users, auth, audit, jwt);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await auditLog.clear();
    await memberships.clear();
    await users.clear();
    await orgs.clear();
    const org = await orgs.save(
      orgs.create({ name: 'Frostline', type: OrganizationType.TENANT }),
    );
    targetUser = await users.save(
      users.create({
        email: 'booker@frostline.example',
        fullName: 'Booker',
        passwordHash: 'x',
        active: true,
      }),
    );
    await memberships.save(
      memberships.create({
        userId: targetUser.id,
        organizationId: org.id,
        role: Role.TENANT_BOOKER,
      }),
    );
  });

  it('starts an impersonation session and records an audit entry', async () => {
    const admin = makePrincipal(Role.PLATFORM_ADMIN);
    const result = await service.start(targetUser.id, admin);
    expect(result.accessToken).toBeTruthy();
    expect(result.user.impersonatedBy).toBe(admin.userId);
    const logs = await auditLog.find();
    expect(logs.some((l) => l.action === 'impersonation.start')).toBe(true);
  });

  it('forbids impersonation by a non-platform-admin', async () => {
    const booker = makePrincipal(Role.TENANT_BOOKER, 'tenant', 'tenant-1');
    await expect(service.start(targetUser.id, booker)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('throws NotFoundException for a missing target user', async () => {
    const admin = makePrincipal(Role.PLATFORM_ADMIN);
    await expect(service.start('missing', admin)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
