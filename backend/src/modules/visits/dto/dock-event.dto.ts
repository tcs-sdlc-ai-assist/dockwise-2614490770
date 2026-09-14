/**
 * DTO for a dock status event.
 */
import { IsIn, IsUUID } from 'class-validator';

/** Request body for a dock status tap. */
export class DockEventDto {
  /** The visit id. */
  @IsUUID()
  visitId!: string;

  /** The dock event type. */
  @IsIn(['door_ready', 'load_start', 'load_complete'])
  type!: 'door_ready' | 'load_start' | 'load_complete';
}
