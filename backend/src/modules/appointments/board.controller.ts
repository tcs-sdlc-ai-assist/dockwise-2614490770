/**
 * Live board controller: the board snapshot endpoint.
 */
import { Controller, Get, Param } from '@nestjs/common';
import { BoardService, BoardSnapshot } from './board.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../organizations/membership.entity';

@Controller('v1/board')
@Roles(
  Role.SITE_COORDINATOR,
  Role.SITE_ADMIN,
  Role.PLATFORM_ADMIN,
  Role.GATE_OFFICER,
  Role.DOCK_LEAD,
)
export class BoardController {
  constructor(private readonly board: BoardService) {}

  /**
   * Get the live board snapshot for a site.
   *
   * Args:
   *   siteId: The site id.
   *
   * Returns:
   *   The board snapshot with the four buckets.
   */
  @Get(':siteId')
  snapshot(@Param('siteId') siteId: string): Promise<BoardSnapshot> {
    return this.board.snapshot(siteId);
  }
}
