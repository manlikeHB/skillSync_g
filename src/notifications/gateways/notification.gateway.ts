import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, UseGuards } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { Notification } from '../entities/notification.entity';
  
  @WebSocketGateway({
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
    namespace: 'notifications',
  })
  export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(NotificationGateway.name);
    private userSocketMap = new Map<string, Set<string>>();
  
    constructor(private jwtService: JwtService) {}
  
    async handleConnection(client: Socket) {
      try {
        const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          client.disconnect();
          return;
        }
  
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;
  
        if (!this.userSocketMap.has(userId)) {
          this.userSocketMap.set(userId, new Set());
        }
        this.userSocketMap.get(userId).add(client.id);
  
        client.data.userId = userId;
        client.join(`user:${userId}`);
  
        this.logger.log(`Client ${client.id} connected for user ${userId}`);
      } catch (error) {
        this.logger.error('Connection authentication failed:', error);
        client.disconnect();
      }
    }
  
    handleDisconnect(client: Socket) {
      const userId = client.data.userId;
      if (userId) {
        const userSockets = this.userSocketMap.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.userSocketMap.delete(userId);
          }
        }
        this.logger.log(`Client ${client.id} disconnected for user ${userId}`);
      }
    }
  
    @SubscribeMessage('joinRoom')
    handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
      client.join(data.room);
      this.logger.log(`Client ${client.id} joined room ${data.room}`);
    }
  
    sendNotificationToUser(userId: string, notification: Notification) {
      this.server.to(`user:${userId}`).emit('newNotification', notification);
      this.logger.log(`Sent notification to user ${userId}`);
    }
  
    sendNotificationToRoom(room: string, notification: Notification) {
      this.server.to(room).emit('newNotification', notification);
      this.logger.log(`Sent notification to room ${room}`);
    }
  
    getUserOnlineStatus(userId: string): boolean {
      return this.userSocketMap.has(userId) && this.userSocketMap.get(userId).size > 0;
    }
  }
  