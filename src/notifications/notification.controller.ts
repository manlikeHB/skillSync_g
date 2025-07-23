import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
  } from '@nestjs/common';
  import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
  import { NotificationService } from './services/notification.service';
  import { CreateNotificationDto } from './dto/create-notification.dto';
  import { UpdateNotificationDto } from './dto/update-notification.dto';
  import { NotificationQueryDto } from './dto/notification-query.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  
  @ApiTags('notifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('notifications')
  export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}
  
    @Post()
    @ApiOperation({ summary: 'Create a new notification' })
    create(@Body() createNotificationDto: CreateNotificationDto) {
      return this.notificationService.create(createNotificationDto);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all notifications for the current user' })
    findAll(@Request() req, @Query() query: NotificationQueryDto) {
      return this.notificationService.findAllForUser(req.user.sub, query);
    }
  
    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    getUnreadCount(@Request() req) {
      return this.notificationService.getUnreadCount(req.user.sub);
    }
  
    @Post('mark-all-read')
    @ApiOperation({ summary: 'Mark all notifications as read' })
    markAllAsRead(@Request() req) {
      return this.notificationService.markAllAsRead(req.user.sub);
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific notification' })
    findOne(@Param('id') id: string, @Request() req) {
      return this.notificationService.findOne(id, req.user.sub);
    }
  
    @Patch(':id')
    @ApiOperation({ summary: 'Update a notification' })
    update(
      @Param('id') id: string,
      @Request() req,
      @Body() updateNotificationDto: UpdateNotificationDto,
    ) {
      return this.notificationService.update(id, req.user.sub, updateNotificationDto);
    }
  
    @Post(':id/mark-read')
    @ApiOperation({ summary: 'Mark a notification as read' })
    markAsRead(@Param('id') id: string, @Request() req) {
      return this.notificationService.markAsRead(id, req.user.sub);
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a notification' })
    remove(@Param('id') id: string, @Request() req) {
      return this.notificationService.remove(id, req.user.sub);
    }
  }