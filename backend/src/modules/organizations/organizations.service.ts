/**
 * Organizations service: organization and membership management.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization, OrganizationType } from './organization.entity';
import { Membership, Role } from './membership.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizations: Repository<Organization>,
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  /**
   * Create an organization.
   *
   * Args:
   *   name: The organization name.
   *   type: The organization category.
   *   contactEmail: Optional primary contact email.
   *
   * Returns:
   *   The created organization.
   */
  async create(
    name: string,
    type: OrganizationType,
    contactEmail?: string,
  ): Promise<Organization> {
    const org = this.organizations.create({
      name,
      type,
      contactEmail: contactEmail ?? null,
    });
    return this.organizations.save(org);
  }

  /**
   * List organizations, optionally filtered by type.
   *
   * Args:
   *   type: Optional organization category filter.
   *
   * Returns:
   *   Matching organizations ordered by name.
   */
  async list(type?: OrganizationType): Promise<Organization[]> {
    const where = type ? { type } : {};
    return this.organizations.find({ where, order: { name: 'ASC' } });
  }

  /**
   * Find an organization by primary key.
   *
   * Raises:
   *   NotFoundException: When no organization exists with the id.
   */
  async findById(id: string): Promise<Organization> {
    const org = await this.organizations.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  /**
   * Add a user to an organization with a role.
   *
   * Args:
   *   userId: The user id.
   *   organizationId: The organization id.
   *   role: The role to grant.
   *
   * Returns:
   *   The created membership.
   */
  async addMembership(
    userId: string,
    organizationId: string,
    role: Role,
  ): Promise<Membership> {
    const membership = this.memberships.create({ userId, organizationId, role });
    return this.memberships.save(membership);
  }
}
