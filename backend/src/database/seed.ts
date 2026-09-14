/**
 * Idempotent demo-data seeder for the Dockwise backend.
 *
 * Runs on startup (gated by SEED_ON_STARTUP) so a fresh checkout comes up with
 * working demo logins. Every insert is conditional on absence, keyed on a
 * natural unique column, so re-running never raises a duplicate-key error.
 */
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../modules/users/user.entity';
import {
  Organization,
  OrganizationType,
} from '../modules/organizations/organization.entity';
import {
  Membership,
  Role,
} from '../modules/organizations/membership.entity';

/** Demo password shared by seeded accounts (documented in the README). */
const DEMO_PASSWORD = 'DockwiseDemo!1';

interface SeedUserSpec {
  email: string;
  fullName: string;
  role: Role;
}

/**
 * Insert a row when no row matches the given natural key.
 *
 * Args:
 *   exists: Whether a matching row already exists.
 *   insert: A thunk performing the insert.
 *
 * Returns:
 *   True when the row was inserted, false when it already existed.
 */
async function insertIfAbsent(
  exists: boolean,
  insert: () => Promise<unknown>,
): Promise<boolean> {
  if (exists) {
    return false;
  }
  await insert();
  return true;
}

/**
 * Seed demo organizations, users, and memberships idempotently.
 *
 * Args:
 *   dataSource: The initialized application DataSource.
 *
 * Returns:
 *   Resolves when seed data is present.
 */
export async function seed(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(User);
  const orgs = dataSource.getRepository(Organization);
  const memberships = dataSource.getRepository(Membership);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Organizations.
  const operator = await orgs.findOne({
    where: { name: 'Meridian Logistics Properties' },
  });
  let operatorId = operator?.id;
  if (!operator) {
    const created = await orgs.save(
      orgs.create({
        name: 'Meridian Logistics Properties',
        type: OrganizationType.PROPERTY_OPERATOR,
        contactEmail: 'ops@meridian-logistics.example',
      }),
    );
    operatorId = created.id;
  }

  const tenant = await orgs.findOne({ where: { name: 'Frostline Foods' } });
  let tenantId = tenant?.id;
  if (!tenant) {
    const created = await orgs.save(
      orgs.create({
        name: 'Frostline Foods',
        type: OrganizationType.TENANT,
        contactEmail: 'logistics@frostline.example',
      }),
    );
    tenantId = created.id;
  }

  const carrier = await orgs.findOne({ where: { name: 'Northstar Dedicated' } });
  let carrierId = carrier?.id;
  if (!carrier) {
    const created = await orgs.save(
      orgs.create({
        name: 'Northstar Dedicated',
        type: OrganizationType.CARRIER,
        contactEmail: 'dispatch@northstar.example',
      }),
    );
    carrierId = created.id;
  }

  // Users keyed by email.
  const seedUsers: Array<SeedUserSpec & { orgId: string }> = [
    {
      email: 'platform.admin@dockwise.example',
      fullName: 'Platform Admin',
      role: Role.PLATFORM_ADMIN,
      orgId: operatorId!,
    },
    {
      email: 'site.admin@dockwise.example',
      fullName: 'Site Admin',
      role: Role.SITE_ADMIN,
      orgId: operatorId!,
    },
    {
      email: 'coordinator@dockwise.example',
      fullName: 'Site Coordinator',
      role: Role.SITE_COORDINATOR,
      orgId: operatorId!,
    },
    {
      email: 'gate@dockwise.example',
      fullName: 'Gate Officer',
      role: Role.GATE_OFFICER,
      orgId: operatorId!,
    },
    {
      email: 'tenant.admin@frostline.example',
      fullName: 'Tenant Admin',
      role: Role.TENANT_ADMIN,
      orgId: tenantId!,
    },
    {
      email: 'booker@frostline.example',
      fullName: 'Tenant Booker',
      role: Role.TENANT_BOOKER,
      orgId: tenantId!,
    },
    {
      email: 'dispatch@northstar.example',
      fullName: 'Carrier Dispatcher',
      role: Role.CARRIER_DISPATCHER,
      orgId: carrierId!,
    },
  ];

  for (const spec of seedUsers) {
    let user = await users.findOne({ where: { email: spec.email } });
    if (!user) {
      user = await users.save(
        users.create({
          email: spec.email,
          fullName: spec.fullName,
          passwordHash,
          active: true,
        }),
      );
    }
    const existingMembership = await memberships.findOne({
      where: {
        userId: user.id,
        organizationId: spec.orgId,
        role: spec.role,
      },
    });
    await insertIfAbsent(!!existingMembership, () =>
      memberships.save(
        memberships.create({
          userId: user!.id,
          organizationId: spec.orgId,
          role: spec.role,
        }),
      ),
    );
  }
}
