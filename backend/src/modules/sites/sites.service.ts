/**
 * Sites service: site creation, listing, and status transitions.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site, SiteStatus } from './site.entity';
import { CreateSiteDto } from './dto/create-site.dto';
import { AuthPrincipal } from '../auth/auth.service';
import { Role } from '../organizations/membership.entity';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly sites: Repository<Site>,
  ) {}

  /**
   * Create a site owned by the caller's property-operator organization.
   *
   * Args:
   *   dto: The site attributes.
   *   principal: The authenticated caller.
   *
   * Returns:
   *   The created site.
   *
   * Raises:
   *   ForbiddenException: When the caller has no property-operator membership.
   */
  async create(dto: CreateSiteDto, principal: AuthPrincipal): Promise<Site> {
    const operatorMembership = principal.memberships.find(
      (m) => m.organizationType === 'property_operator',
    );
    if (!operatorMembership) {
      throw new ForbiddenException('No property-operator membership');
    }
    const site = this.sites.create({
      name: dto.name,
      address: dto.address,
      timezone: dto.timezone,
      operatorId: operatorMembership.organizationId,
      status: SiteStatus.SHADOW,
      yardCapacity: dto.yardCapacity ?? null,
      minBookingNoticeMinutes: dto.minBookingNoticeMinutes ?? 120,
      maxDaysAhead: dto.maxDaysAhead ?? 21,
      doorBufferMinutes: dto.doorBufferMinutes ?? 10,
    });
    return this.sites.save(site);
  }

  /**
   * List sites visible to the caller.
   *
   * Platform admins and operator staff see their operator's sites; tenant and
   * carrier users see only sites their organization is contracted to (scoped
   * here to the caller's operator for v1).
   *
   * Args:
   *   principal: The authenticated caller.
   *
   * Returns:
   *   Sites scoped to the caller's organization.
   */
  async listForPrincipal(principal: AuthPrincipal): Promise<Site[]> {
    const isPlatformAdmin = principal.memberships.some(
      (m) => m.role === Role.PLATFORM_ADMIN,
    );
    if (isPlatformAdmin) {
      return this.sites.find({ order: { name: 'ASC' } });
    }
    const operatorIds = principal.memberships
      .filter((m) => m.organizationType === 'property_operator')
      .map((m) => m.organizationId);
    if (operatorIds.length === 0) {
      // Tenant/carrier users: return sites (contract scoping refined in later
      // slices). For v1 return all sites so booking flows can resolve them.
      return this.sites.find({ order: { name: 'ASC' } });
    }
    return this.sites
      .createQueryBuilder('site')
      .where('site.operatorId IN (:...ids)', { ids: operatorIds })
      .orderBy('site.name', 'ASC')
      .getMany();
  }

  /**
   * Find a site by primary key.
   *
   * Raises:
   *   NotFoundException: When no site exists with the id.
   */
  async findById(id: string): Promise<Site> {
    const site = await this.sites.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  /**
   * Transition a site from shadow to live.
   *
   * Args:
   *   id: The site id.
   *
   * Returns:
   *   The updated site.
   */
  async goLive(id: string): Promise<Site> {
    const site = await this.findById(id);
    site.status = SiteStatus.LIVE;
    return this.sites.save(site);
  }
}
