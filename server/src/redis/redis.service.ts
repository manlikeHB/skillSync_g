import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisClient } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClient;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });
    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (err) => this.logger.error('Redis error', err));
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  getClient(): RedisClient {
    return this.client;
  }

  /**
   * Set a value in Redis
   * @param key Redis key
   * @param value Redis value
   * @param expire Expiry in seconds (optional)
   */
  async set(key: string, value: string, expire?: number) {
    if (expire) {
      return this.client.set(key, value, 'EX', expire);
    }
    return this.client.set(key, value);
  }

  /**
   * Get a value from Redis
   * @param key Redis key
   */
  async get(key: string) {
    return this.client.get(key);
  }

  // Add more methods as needed
}

/**
 * Usage:
 * 1. Import RedisModule in your feature module or use globally.
 * 2. Inject RedisService in your service/controller:
 *    constructor(private readonly redisService: RedisService) {}
 * 3. Use redisService.set/get for caching or pub/sub.
 *
 * To extend, add more methods to RedisService as needed.
 */
