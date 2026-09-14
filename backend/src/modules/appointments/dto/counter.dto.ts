/**
 * DTO for proposing a counter window.
 */
import { IsDateString } from 'class-validator';

/** Request body for countering an appointment with a new window. */
export class CounterDto {
  /** The proposed window start (ISO 8601, UTC). */
  @IsDateString()
  windowStart!: string;

  /** The proposed window end (ISO 8601, UTC). */
  @IsDateString()
  windowEnd!: string;
}
