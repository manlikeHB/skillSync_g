import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  async blacklistToken(token: string, ttl: number): Promise<void> {
    await this.redisClient.set(`bl:${token}`, 'blacklisted', 'EX', ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisClient.get(`bl:${token}`);
    return result === 'blacklisted';
  }
}
