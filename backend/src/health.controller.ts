/**
 * Health controller: dependency-free liveness probe.
 *
 * Mounted at /api/health (the single carve-out from the /api/v1 prefix) so
 * Docker, load balancers, and deployment platforms can reach it.
 */
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/guards/jwt-auth.guard';

@Controller()
export class HealthController {
  /**
   * Return liveness status.
   *
   * Returns:
   *   A 200 payload with status "ok". Free of DB/secret access.
   */
  @Public()
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
