/**
 * DTO for gate check-out.
 */
import { IsIn, IsOptional, IsString } from 'class-validator';

/** Request body for checking a vehicle out at the gate. */
export class CheckOutDto {
  /** Optional outbound seal. */
  @IsOptional()
  @IsString()
  outboundSeal?: string;

  /** Whether the trailer left empty or loaded. */
  @IsOptional()
  @IsIn(['empty', 'loaded'])
  outboundLoadState?: 'empty' | 'loaded';
}
