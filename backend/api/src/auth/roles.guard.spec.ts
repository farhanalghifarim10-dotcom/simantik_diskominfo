import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { AuthenticatedUser } from './auth.types.js';

describe('RolesGuard (RBAC)', () => {
  it('should allow access when no roles are required on handler or class', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'TECHNICIAN' } as AuthenticatedUser,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow SUPER_ADMIN when SUPER_ADMIN is in required roles', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);

    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'SUPER_ADMIN' } as AuthenticatedUser,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException when TECHNICIAN attempts to access SUPER_ADMIN endpoint', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPER_ADMIN']);

    const guard = new RolesGuard(reflector);

    const mockContext = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          user: { role: 'TECHNICIAN' } as AuthenticatedUser,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrowError(
      /does not have sufficient permissions/,
    );
  });
});
