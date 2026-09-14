/**
 * Unit tests for AuthService credential verification and principal building.
 *
 * Exercises happy-path login, wrong-password rejection, disabled-account
 * rejection, and principal membership mapping against a real PostgreSQL test
 * database.
 */
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import {
  Organization,
  OrganizationType,
} from '../organizations/organization.entity';
import {
  Membership,
  Role,
} from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('AuthService', () => {
  let dataSource: DataSource;
  let service: AuthService;
  let users: Repository<User>;
  let orgs: Repository<Organization>;
  let memberships: Repository<Membership>;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    users = dataSource.getRepository(User);
    orgs = dataSource.getRepository(Organization);
    memberships = dataSource.getRepository(Membership);
    service = new AuthService(
      users,
      memberships,
      new JwtService({ secret: 'test-secret' }),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await memberships.clear();
    await users.clear();
    await orgs.clear();
  });

  async function seedUser(password = 'CorrectHorse!1'): Promise<User> {
    const org = await orgs.save(
      orgs.create({ name: 'Frostline', type: OrganizationType.TENANT }),
    );
    const user = await users.save(
      users.create({
        email: 'booker@frostline.example',
        fullName: 'Booker',
        passwordHash: await bcrypt.hash(password, 10),
        active: true,
      }),
    );
    await memberships.save(
      memberships.create({
        userId: user.id,
        organizationId: org.id,
        role: Role.TENANT_BOOKER,
      }),
    );
    return user;
  }

  it('logs in with valid credentials and returns a token and principal', async () => {
    await seedUser();
    const result = await service.login(
      'booker@frostline.example',
      'CorrectHorse!1',
    );
    expect(result.accessToken).toBeTruthy();
    expect(result.user.email).toBe('booker@frostline.example');
    expect(result.user.memberships).toHaveLength(1);
    expect(result.user.memberships[0].role).toBe(Role.TENANT_BOOKER);
  });

  it('rejects a wrong password with 401', async () => {
    await seedUser();
    await expect(
      service.login('booker@frostline.example', 'WrongPassword!1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an unknown email with 401', async () => {
    await expect(
      service.login('nobody@example.com', 'CorrectHorse!1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a disabled account even with a correct password', async () => {
    const user = await seedUser();
    user.active = false;
    await users.save(user);
    await expect(
      service.login('booker@frostline.example', 'CorrectHorse!1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects principal resolution for a disabled user', async () => {
    const user = await seedUser();
    user.active = false;
    await users.save(user);
    await expect(service.principalForUserId(user.id)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
