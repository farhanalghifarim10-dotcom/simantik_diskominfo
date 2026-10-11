import { Controller, Get, Query } from '@nestjs/common';
import { OpdService } from './opd.service.js';

@Controller('opd')
export class OpdController {
  constructor(private readonly opdService: OpdService) {}

  @Get()
  async getPublicOpds(@Query('search') search?: string) {
    const data = await this.opdService.listOpds({ search }, false);
    return {
      success: true,
      data,
    };
  }
}
