/**
 * Unit tests for UsersService and OrganizationsService.
 *
 * Covers findById (found/NotFound), disable, organization create/list/
 * findById, and addMembership.
 */
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import {
  Organization,
  OrganizationType,
} from '../organizations/organization.entity';
import { Membership, Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('UsersService', () => {
  let dataSource: DataSource;
  let users: Repository<User>;
  let service: UsersService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    users = dataSource.getRepository(User);
    service = new UsersService(users);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await users.clear();
  });

  it('finds a user by id', async () => {
    const user = await users.save(
      users.create({
        email: 'a@example.com',
        fullName: 'A',
        passwordHash: 'x',
        active: true,
      }),
    );
    const found = await service.findById(user.id);
    expect(found.email).toBe('a@example.com');
  });

  it('throws NotFoundException for a missing user', async () => {
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('disables a user', async () => {
    const user = await users.save(
      users.create({
        email: 'b@example.com',
        fullName: 'B',
        passwordHash: 'x',
        active: true,
      }),
    );
    const disabled = await service.disable(user.id);
    expect(disabled.active).toBe(false);
  });
});

describe('OrganizationsService', () => {
  let dataSource: DataSource;
  let orgs: Repository<Organization>;
  let memberships: Repository<Membership>;
  let service: OrganizationsService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    orgs = dataSource.getRepository(Organization);
    memberships = dataSource.getRepository(Membership);
    service = new OrganizationsService(orgs, memberships);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await memberships.clear();
    await orgs.clear();
  });

  it('creates an organization', async () => {
    const org = await service.create('Frostline', OrganizationType.TENANT);
    expect(org.id).toBeTruthy();
    expect(org.type).toBe(OrganizationType.TENANT);
  });

  it('lists organizations filtered by type', async () => {
    await service.create('Frostline', OrganizationType.TENANT);
    await service.create('Northstar', OrganizationType.CARRIER);
    const tenants = await service.list(OrganizationType.TENANT);
    expect(tenants).toHaveLength(1);
    expect(tenants[0].name).toBe('Frostline');
  });

  it('throws NotFoundException for a missing organization', async () => {
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('adds a membership', async () => {
    const org = await service.create('Frostline', OrganizationType.TENANT);
    // The membership has a foreign key to users, so create the user first.
    const users = dataSource.getRepository(User);
    const user = await users.save(
      users.create({
        email: 'member@example.com',
        fullName: 'Member',
        passwordHash: 'x',
        active: true,
      }),
    );
    const membership = await service.addMembership(
      user.id,
      org.id,
      Role.TENANT_ADMIN,
    );
    expect(membership.role).toBe(Role.TENANT_ADMIN);
  });
});
