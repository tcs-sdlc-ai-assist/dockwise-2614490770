/**
 * Unit tests for SitesService and DoorsService against a real SQLite test DB.
 *
 * Covers site creation/scoping, door creation, duplicate-number conflict, CSV
 * import dedup, and out-of-service transitions.
 */
import { DataSource, Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { DoorsService } from './doors.service';
import { Site, SiteStatus } from './site.entity';
import { Door, DoorStatus, DoorType } from './door.entity';
import { Role } from '../organizations/membership.entity';
import { newTestDataSource } from '../../test-utils/test-db';
import { makePrincipal } from '../../test-utils/make-principal';

describe('SitesService', () => {
  let dataSource: DataSource;
  let sites: Repository<Site>;
  let service: SitesService;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    sites = dataSource.getRepository(Site);
    service = new SitesService(sites);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await sites.clear();
  });

  it('creates a site for a property-operator caller', async () => {
    const site = await service.create(
      { name: 'Dayton DC-03', address: '1 Dock Way', timezone: 'America/New_York' },
      makePrincipal(Role.PLATFORM_ADMIN),
    );
    expect(site.id).toBeTruthy();
    expect(site.status).toBe(SiteStatus.SHADOW);
    expect(site.doorBufferMinutes).toBe(10);
  });

  it('rejects creation by a caller with no operator membership', async () => {
    await expect(
      service.create(
        { name: 'X', address: 'Y', timezone: 'America/New_York' },
        makePrincipal(Role.TENANT_BOOKER, 'tenant', 'tenant-1'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('transitions a site from shadow to live', async () => {
    const site = await service.create(
      { name: 'Dayton', address: 'A', timezone: 'America/New_York' },
      makePrincipal(Role.PLATFORM_ADMIN),
    );
    const live = await service.goLive(site.id);
    expect(live.status).toBe(SiteStatus.LIVE);
  });

  it('throws NotFoundException for an unknown site', async () => {
    await expect(service.findById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('DoorsService', () => {
  let dataSource: DataSource;
  let sites: Repository<Site>;
  let doors: Repository<Door>;
  let service: DoorsService;
  let siteId: string;

  beforeAll(async () => {
    dataSource = await newTestDataSource();
    sites = dataSource.getRepository(Site);
    doors = dataSource.getRepository(Door);
    service = new DoorsService(doors);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await doors.clear();
    await sites.clear();
    const site = await sites.save(
      sites.create({
        name: 'Dayton',
        address: 'A',
        timezone: 'America/New_York',
        operatorId: 'org-1',
      }),
    );
    siteId = site.id;
  });

  it('creates a door with defaults', async () => {
    const door = await service.create(siteId, {
      number: '11',
      type: DoorType.DOCK_HIGH,
    });
    expect(door.group).toBe('pool');
    expect(door.status).toBe(DoorStatus.IN_SERVICE);
  });

  it('rejects a duplicate door number at the same site', async () => {
    await service.create(siteId, { number: '11', type: DoorType.DOCK_HIGH });
    await expect(
      service.create(siteId, { number: '11', type: DoorType.GRADE_LEVEL }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('imports doors and skips duplicates', async () => {
    await service.create(siteId, { number: '11', type: DoorType.DOCK_HIGH });
    const result = await service.import(siteId, [
      { number: '11', type: DoorType.DOCK_HIGH },
      { number: '12', type: DoorType.DOCK_HIGH },
      { number: '13', type: DoorType.GRADE_LEVEL },
    ]);
    expect(result.created).toHaveLength(2);
    expect(result.skipped).toBe(1);
  });

  it('marks a door out of service with a note and back in service', async () => {
    const door = await service.create(siteId, {
      number: '11',
      type: DoorType.DOCK_HIGH,
    });
    const out = await service.setOutOfService(door.id, 'Door spring broken');
    expect(out.status).toBe(DoorStatus.OUT_OF_SERVICE);
    expect(out.statusNote).toBe('Door spring broken');
    const back = await service.setInService(door.id);
    expect(back.status).toBe(DoorStatus.IN_SERVICE);
    expect(back.statusNote).toBeNull();
  });
});
