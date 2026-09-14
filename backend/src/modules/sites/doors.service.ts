/**
 * Doors service: door CRUD, CSV import, and out-of-service transitions.
 */
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Door, DoorStatus } from './door.entity';
import { CreateDoorDto } from './dto/create-door.dto';

@Injectable()
export class DoorsService {
  constructor(
    @InjectRepository(Door)
    private readonly doors: Repository<Door>,
  ) {}

  /**
   * Add a door to a site.
   *
   * Args:
   *   siteId: The owning site id.
   *   dto: The door attributes.
   *
   * Returns:
   *   The created door.
   *
   * Raises:
   *   ConflictException: When a door with the same number exists at the site.
   */
  async create(siteId: string, dto: CreateDoorDto): Promise<Door> {
    const existing = await this.doors.findOne({
      where: { siteId, number: dto.number },
    });
    if (existing) {
      throw new ConflictException(
        `Door ${dto.number} already exists at this site`,
      );
    }
    const door = this.doors.create({
      siteId,
      number: dto.number,
      type: dto.type,
      group: dto.group ?? 'pool',
      reeferPower: dto.reeferPower ?? false,
      containerSupport: dto.containerSupport ?? false,
      maxTrailerLengthFt: dto.maxTrailerLengthFt ?? null,
      status: DoorStatus.IN_SERVICE,
    });
    return this.doors.save(door);
  }

  /**
   * Import multiple doors, skipping duplicates.
   *
   * Args:
   *   siteId: The owning site id.
   *   dtos: The door rows to import.
   *
   * Returns:
   *   An object with the created doors and the count of skipped duplicates.
   */
  async import(
    siteId: string,
    dtos: CreateDoorDto[],
  ): Promise<{ created: Door[]; skipped: number }> {
    const created: Door[] = [];
    let skipped = 0;
    for (const dto of dtos) {
      const existing = await this.doors.findOne({
        where: { siteId, number: dto.number },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      created.push(await this.create(siteId, dto));
    }
    return { created, skipped };
  }

  /**
   * List doors for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   Doors ordered by number.
   */
  async listForSite(siteId: string): Promise<Door[]> {
    return this.doors.find({ where: { siteId }, order: { number: 'ASC' } });
  }

  /**
   * Find a door by primary key.
   *
   * Raises:
   *   NotFoundException: When no door exists with the id.
   */
  async findById(id: string): Promise<Door> {
    const door = await this.doors.findOne({ where: { id } });
    if (!door) {
      throw new NotFoundException('Door not found');
    }
    return door;
  }

  /**
   * Mark a door out of service with a note.
   *
   * Args:
   *   id: The door id.
   *   note: The reason the door is out of service.
   *
   * Returns:
   *   The updated door.
   */
  async setOutOfService(id: string, note: string): Promise<Door> {
    const door = await this.findById(id);
    door.status = DoorStatus.OUT_OF_SERVICE;
    door.statusNote = note;
    return this.doors.save(door);
  }

  /**
   * Return a door to service.
   *
   * Args:
   *   id: The door id.
   *
   * Returns:
   *   The updated door.
   */
  async setInService(id: string): Promise<Door> {
    const door = await this.findById(id);
    door.status = DoorStatus.IN_SERVICE;
    door.statusNote = null;
    return this.doors.save(door);
  }
}
