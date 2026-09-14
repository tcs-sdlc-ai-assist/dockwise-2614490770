/**
 * Authentication controller: login and current-principal endpoints.
 *
 * The login endpoint is public; every other route requires a valid token via
 * the global JWT guard.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService, AuthPrincipal } from './auth.service';
import { Public } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/** Request body for email/password login. */
export class LoginDto {
  /** Account email. */
  @IsEmail()
  email!: string;

  /** Account password (NIST-style minimum length 12). */
  @IsString()
  @MinLength(12)
  password!: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Authenticate with email and password.
   *
   * Args:
   *   dto: The login credentials.
   *
   * Returns:
   *   An access token and the authenticated principal.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<{ accessToken: string; user: AuthPrincipal }> {
    return this.auth.login(dto.email, dto.password);
  }

  /**
   * Return the authenticated principal for the current token.
   *
   * Args:
   *   principal: The principal injected by the auth guard.
   *
   * Returns:
   *   The authenticated principal with memberships.
   */
  @Get('me')
  me(@CurrentUser() principal: AuthPrincipal): AuthPrincipal {
    return principal;
  }
}
