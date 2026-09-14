/**
 * Shared TypeScript types mirroring the Dockwise API contract.
 *
 * These types are the single source of truth for request/response shapes used
 * across the frontend. They mirror the backend DTOs and entities.
 */

/** The kind of organization in the access model. */
export type OrganizationType = 'property_operator' | 'tenant' | 'carrier';

/** A role a user holds within an organization. */
export type Role =
  | 'platform_admin'
  | 'site_admin'
  | 'site_coordinator'
  | 'gate_officer'
  | 'dock_lead'
  | 'tenant_admin'
  | 'tenant_booker'
  | 'carrier_dispatcher'
  | 'auditor';

/** A single organization membership on the authenticated principal. */
export interface PrincipalMembership {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  role: Role;
}

/** The authenticated principal returned by the API. */
export interface AuthPrincipal {
  userId: string;
  email: string;
  fullName: string;
  memberships: PrincipalMembership[];
  impersonatedBy?: string;
}

/** Response from the login endpoint. */
export interface LoginResponse {
  accessToken: string;
  user: AuthPrincipal;
}

/** An organization. */
export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}
