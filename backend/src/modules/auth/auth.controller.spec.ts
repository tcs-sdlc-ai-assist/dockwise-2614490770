/**
 * API tests for the auth controller against the real HTTP surface and a real
 * PostgreSQL test database.
 *
 * Covers login success, wrong-password 401, validation 400, the authenticated
 * /me endpoint, and the unauthenticated 401 boundary.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../app.module';
import { User } from '../users/user.entity';
import {
  Organization,
  OrganizationType,
} from '../organizations/organization.entity';
import {
  Membership,
  Role,
} from '../organizations/membership.entity';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';

describe('AuthController (API)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const password = 'CorrectHorse!1';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
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

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const memberships = dataSource.getRepository(Membership);
    const users = dataSource.getRepository(User);
    const orgs = dataSource.getRepository(Organization);
    await memberships.clear();
    await users.clear();
    await orgs.clear();

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
  });

  it('GET /api/health returns 200 ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/v1/auth/login returns a token for valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'booker@frostline.example', password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe('booker@frostline.example');
  });

  it('POST /api/v1/auth/login returns 401 for a wrong password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'booker@frostline.example', password: 'WrongPassword!1' });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/login returns 400 for an invalid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/auth/me returns the principal with a valid token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'booker@frostline.example', password });
    const token = login.body.accessToken as string;

    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('booker@frostline.example');
    expect(res.body.memberships[0].role).toBe(Role.TENANT_BOOKER);
  });

  it('GET /api/v1/auth/me returns 401 without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
