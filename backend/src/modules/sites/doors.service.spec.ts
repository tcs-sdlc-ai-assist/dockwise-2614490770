/**
 * Unit tests for DoorsService edge cases against a real SQLite test DB.
 *
 * Covers leased-door grouping, constraint fields, and NotFound boundaries.
 */
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { DoorsService } from './doors.service';
import { Site } from './site.entity';
import { Door, DoorStatus, DoorType } from './door.entity';
import { newTestDataSource } from '../../test-utils/test-db';

describe('DoorsService (edge cases)', () => {
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

  it('stores a leased door group and constraints', async () => {
    const door = await service.create(siteId, {
      number: 'L1',
      type: DoorType.DOCK_HIGH,
      group: 'leased:tenant-1',
      reeferPower: true,
      containerSupport: true,
      maxTrailerLengthFt: 53,
    });
    expect(door.group).toBe('leased:tenant-1');
    expect(door.reeferPower).toBe(true);
    expect(door.containerSupport).toBe(true);
    expect(door.maxTrailerLengthFt).toBe(53);
  });

  it('lists doors ordered by number', async () => {
    await service.create(siteId, { number: '20', type: DoorType.DOCK_HIGH });
    await service.create(siteId, { number: '03', type: DoorType.DOCK_HIGH });
    const list = await service.listForSite(siteId);
    expect(list.map((d) => d.number)).toEqual(['03', '20']);
  });

  it('throws NotFoundException when marking a missing door out of service', async () => {
    await expect(
      service.setOutOfService('missing', 'note'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('defaults a new door to in_service', async () => {
    const door = await service.create(siteId, {
      number: '9',
      type: DoorType.GRADE_LEVEL,
    });
    expect(door.status).toBe(DoorStatus.IN_SERVICE);
  });
});
