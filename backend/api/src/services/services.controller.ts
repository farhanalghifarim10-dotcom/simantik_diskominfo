import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service.js';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async getServices() {
    const data = await this.servicesService.getPublicServices();
    return {
      success: true,
      data,
    };
  }

  @Get(':slugOrId')
  async getServiceBySlugOrId(@Param('slugOrId') slugOrId: string) {
    const data = await this.servicesService.getPublicServiceBySlugOrId(slugOrId);
    return {
      success: true,
      data,
    };
  }

  @Get(':slugOrId/requirements')
  async getRequirements(@Param('slugOrId') slugOrId: string) {
    const data = await this.servicesService.getPublicRequirements(slugOrId);
    return {
      success: true,
      data,
    };
  }
}
