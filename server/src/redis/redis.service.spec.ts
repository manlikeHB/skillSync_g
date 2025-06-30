import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  let service: RedisService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RedisService],
    }).compile();
    service = module.get<RedisService>(RedisService);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for Redis connect
  });

  afterAll(async () => {
    await service['client'].quit();
  });

  it('should set and get a value', async () => {
    await service.set('test-key', 'test-value', 10);
    const value = await service.get('test-key');
    expect(value).toBe('test-value');
  });
});
