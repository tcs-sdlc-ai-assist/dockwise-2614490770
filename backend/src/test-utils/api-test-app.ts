/**
 * Shared API test bootstrap: builds a Nest application against an in-memory
 * SQLite database and seeds a set of users/tokens for role-based tests.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { User } from '../modules/users/user.entity';
import {
  Organization,
  OrganizationType,
} from '../modules/organizations/organization.entity';
import {
  Membership,
  Role,
} from '../modules/organizations/membership.entity';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

/** The shared demo password for seeded test users. */
export const TEST_PASSWORD = 'CorrectHorse!1';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  /** Sign in and return an access token for a seeded user email. */
  tokenFor: (email: string) => Promise<string>;
}

/**
 * Build a Nest test application backed by in-memory SQLite.
 *
 * Returns:
 *   A TestContext with the app, DataSource, and a token helper.
 */
export async function buildTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const dataSource = app.get(DataSource);

  const tokenFor = async (email: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const request = require('supertest');
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });
    return res.body.accessToken as string;
  };

  return { app, dataSource, tokenFor };
}

/**
 * Seed a user with a role in an organization of the given type.
 *
 * Args:
 *   dataSource: The test DataSource.
 *   email: The user email.
 *   role: The role to grant.
 *   orgType: The organization category.
 *   orgName: The organization name.
 *
 * Returns:
 *   The created user and organization ids.
 */
export async function seedUserWithRole(
  dataSource: DataSource,
  email: string,
  role: Role,
  orgType: OrganizationType,
  orgName: string,
): Promise<{ userId: string; orgId: string }> {
  const users = dataSource.getRepository(User);
  const orgs = dataSource.getRepository(Organization);
  const memberships = dataSource.getRepository(Membership);

  // Idempotent: reuse an existing org/user/membership when present so the
  // helper is safe to call across suites sharing an in-memory database.
  let org = await orgs.findOne({ where: { name: orgName } });
  if (!org) {
    org = await orgs.save(orgs.create({ name: orgName, type: orgType }));
  }
  let user = await users.findOne({ where: { email } });
  if (!user) {
    user = await users.save(
      users.create({
        email,
        fullName: email,
        passwordHash: await bcrypt.hash(TEST_PASSWORD, 10),
        active: true,
      }),
    );
  }
  let membership = await memberships.findOne({
    where: { userId: user.id, organizationId: org.id, role },
  });
  if (!membership) {
    membership = await memberships.save(
      memberships.create({ userId: user.id, organizationId: org.id, role }),
    );
  }
  return { userId: user.id, orgId: org.id };
}
