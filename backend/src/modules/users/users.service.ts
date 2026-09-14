/**
 * Users service: account lookup and management.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * Find a user by primary key.
   *
   * Args:
   *   id: The user id.
   *
   * Returns:
   *   The matching user.
   *
   * Raises:
   *   NotFoundException: When no user exists with the id.
   */
  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Disable a user account, immediately revoking access.
   *
   * Args:
   *   id: The user id to disable.
   *
   * Returns:
   *   The updated (inactive) user.
   */
  async disable(id: string): Promise<User> {
    const user = await this.findById(id);
    user.active = false;
    return this.users.save(user);
  }
}
