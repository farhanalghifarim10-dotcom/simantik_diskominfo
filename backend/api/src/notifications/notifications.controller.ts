import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { NotificationsService } from './notifications.service.js';
import { AuthGuard } from '../auth/auth.guard.js';

@SkipThrottle()
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getMyNotifications(@Req() req: any) {
    const data = await this.notificationsService.getUserNotifications(req.user);
    return {
      success: true,
      data,
    };
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user);
    return {
      success: true,
      data: { unread_count: count },
    };
  }

  @Post('read-all')
  async markAllRead(@Req() req: any) {
    const result = await this.notificationsService.markAllAsRead(req.user);
    return {
      success: true,
      data: result,
      message: 'Semua notifikasi ditandai telah dibaca.',
    };
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @Req() req: any) {
    await this.notificationsService.markAsRead(id, req.user);
    return {
      success: true,
      message: 'Notifikasi ditandai telah dibaca.',
    };
  }
}
