/**
 * Organizations module: registers organization and membership persistence.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { Membership } from './membership.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, Membership])],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService, TypeOrmModule],
})
export class OrganizationsModule {}
