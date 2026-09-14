/**
 * DTO for pausing the detention clock.
 */
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DetentionPauseReason } from '../detention-pause.entity';

/** Request body for pausing detention. */
export class PauseDetentionDto {
  /** The pause reason category. */
  @IsEnum(DetentionPauseReason)
  reason!: DetentionPauseReason;

  /** Optional free-text detail. */
  @IsOptional()
  @IsString()
  detail?: string;

  /** Pause start (ISO 8601, UTC). */
  @IsDateString()
  startAt!: string;

  /** Pause end (ISO 8601, UTC). */
  @IsDateString()
  endAt!: string;
}
