import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service.js';
import { ServicesController } from './services.controller.js';
import { AdminServicesController } from './admin-services.controller.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { SupabaseService } from '../supabase/supabase.service.js';

describe('Services Vertical Slice', () => {
  let supabaseServiceMock: SupabaseService;
  let servicesService: ServicesService;
  let publicController: ServicesController;
  let adminController: AdminServicesController;

  beforeEach(() => {
    // Supabase service mock that throws by default so fallback in-memory is tested predictably
    supabaseServiceMock = {
      getClient: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB offline') }),
        }),
      }),
    } as unknown as SupabaseService;

    servicesService = new ServicesService(supabaseServiceMock);
    publicController = new ServicesController(servicesService);
    adminController = new AdminServicesController(servicesService);
  });

  describe('1. Public Service Retrieval', () => {
    it('should list all active public services with requirements attached', async () => {
      const response = await publicController.getServices();
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(2);

      const devService = response.data.find((s) => s.slug === 'pembangunan-aplikasi');
      expect(devService).toBeDefined();
      expect(devService?.type).toBe('DEVELOPMENT');
      expect(devService?.requirements?.length).toBeGreaterThan(0);
    });

    it('should retrieve a single public service by slug', async () => {
      const response = await publicController.getServiceBySlugOrId('pembangunan-aplikasi');
      expect(response.success).toBe(true);
      expect(response.data.slug).toBe('pembangunan-aplikasi');
      expect(response.data.name).toBe('Pembangunan Aplikasi Baru');
    });

    it('should retrieve a single public service by UUID', async () => {
      const response = await publicController.getServiceBySlugOrId('11111111-1111-1111-1111-111111111111');
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('should throw NotFoundException for unknown slug or ID', async () => {
      await expect(publicController.getServiceBySlugOrId('layanan-tidak-ada')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('2. Requirement Retrieval', () => {
    it('should retrieve requirements list for a specific service', async () => {
      const response = await publicController.getRequirements('pembangunan-aplikasi');
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Verify requirement fields
      const firstReq = response.data[0];
      expect(firstReq).toHaveProperty('id');
      expect(firstReq).toHaveProperty('name');
      expect(firstReq).toHaveProperty('type');
      expect(firstReq).toHaveProperty('is_required');
    });

    it('should distinguish required vs optional documents', async () => {
      const response = await publicController.getRequirements('pembangunan-aplikasi');
      const requiredDocs = response.data.filter((r) => r.is_required);
      const optionalDocs = response.data.filter((r) => !r.is_required);

      expect(requiredDocs.length).toBeGreaterThan(0);
      expect(optionalDocs.length).toBeGreaterThan(0);
      expect(optionalDocs.some((d) => d.name.includes('Bagan Alur Bisnis'))).toBe(true);
    });
  });

  describe('3. Admin Access & Metadata Management', () => {
    it('should allow admin to list all services', async () => {
      const response = await adminController.getServices();
      expect(response.success).toBe(true);
      expect(response.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow admin to get service detail with requirements', async () => {
      const response = await adminController.getServiceDetail('11111111-1111-1111-1111-111111111111');
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('11111111-1111-1111-1111-111111111111');
      expect(response.data.requirements).toBeDefined();
    });

    it('should allow admin to update service metadata', async () => {
      const response = await adminController.updateService('11111111-1111-1111-1111-111111111111', {
        name: 'Pembangunan Aplikasi Baru (Updated)',
        sort_order: 10,
      });

      expect(response.success).toBe(true);
      expect(response.data.name).toBe('Pembangunan Aplikasi Baru (Updated)');
      expect(response.data.sort_order).toBe(10);
    });
  });

  describe('4. Requirement Management (CRUD)', () => {
    it('should allow admin to add a new requirement to a service', async () => {
      const response = await adminController.createRequirement('11111111-1111-1111-1111-111111111111', {
        name: 'Dokumen Desain Mockup / Prototipe',
        description: 'Tautan atau file Figma / PDF wireframe sistem',
        type: 'DOCUMENT',
        is_required: false,
        is_placeholder: true,
      });

      expect(response.success).toBe(true);
      expect(response.data.name).toBe('Dokumen Desain Mockup / Prototipe');
      expect(response.data.type).toBe('DOCUMENT');
      expect(response.data.is_required).toBe(false);
      expect(response.data.is_placeholder).toBe(true);

      // Verify requirement is in service detail
      const detail = await adminController.getServiceDetail('11111111-1111-1111-1111-111111111111');
      expect(detail.data.requirements?.some((r) => r.id === response.data.id)).toBe(true);
    });

    it('should allow admin to update a requirement', async () => {
      const reqId = 'a1111111-1111-1111-1111-111111111111';
      const response = await adminController.updateRequirement(
        '11111111-1111-1111-1111-111111111111',
        reqId,
        {
          name: 'Surat Permohonan Resmi OPD (Wajib bertandatangan basah/TTE)',
          is_required: true,
        },
      );

      expect(response.success).toBe(true);
      expect(response.data.name).toContain('Wajib bertandatangan basah/TTE');
    });

    it('should allow admin to delete a requirement', async () => {
      // First create one to delete
      const created = await adminController.createRequirement('11111111-1111-1111-1111-111111111111', {
        name: 'Temporary Requirement',
        type: 'DATA',
        is_required: false,
      });

      const deleteRes = await adminController.deleteRequirement(
        '11111111-1111-1111-1111-111111111111',
        created.data.id,
      );
      expect(deleteRes.success).toBe(true);

      // Verify it's gone
      const detail = await adminController.getServiceDetail('11111111-1111-1111-1111-111111111111');
      expect(detail.data.requirements?.some((r) => r.id === created.data.id)).toBe(false);
    });
  });

  describe('5. Validation Failures', () => {
    it('should reject requirement creation with missing name', async () => {
      await expect(
        adminController.createRequirement('11111111-1111-1111-1111-111111111111', {
          name: '',
          type: 'DOCUMENT',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject requirement creation with invalid type', async () => {
      await expect(
        adminController.createRequirement('11111111-1111-1111-1111-111111111111', {
          name: 'Valid Name',
          type: 'INVALID_TYPE' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject service update with invalid sort_order', async () => {
      await expect(
        adminController.updateService('11111111-1111-1111-1111-111111111111', {
          sort_order: 'bukan_angka' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject requirement update on non-existent requirement ID', async () => {
      await expect(
        adminController.updateRequirement('11111111-1111-1111-1111-111111111111', 'non-existent-id', {
          name: 'Updated Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('6. Authorization & Unauthorized Mutation Protection', () => {
    it('should have SUPER_ADMIN role protection configured on AdminServicesController class', () => {
      const rolesMeta = Reflect.getMetadata('roles', AdminServicesController);
      expect(rolesMeta).toBeDefined();
      expect(rolesMeta).toContain('SUPER_ADMIN');
    });

    it('should block technician or unauthenticated users from mutating services', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      // Simulate technician user context trying to call updateService
      const mockTechnicianContext = {
        getHandler: () => adminController.updateService,
        getClass: () => AdminServicesController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'tech-1', role: 'TECHNICIAN' },
          }),
        }),
      };

      expect(() => guard.canActivate(mockTechnicianContext as any)).toThrowError(
        /does not have sufficient permissions/,
      );

      // Simulate unauthenticated user context
      const mockAnonContext = {
        getHandler: () => adminController.updateService,
        getClass: () => AdminServicesController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: undefined,
          }),
        }),
      };

      expect(() => guard.canActivate(mockAnonContext as any)).toThrowError(
        /User authentication context was not found/,
      );
    });
  });
});

