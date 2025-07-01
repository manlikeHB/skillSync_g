import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from '../entities/feedback.entity';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

const mockFeedbacks = [
  { rating: 5, createdAt: new Date('2024-01-01'), mentee: { id: 'u1' } },
  { rating: 4, createdAt: new Date('2024-01-15'), mentee: { id: 'u2' } },
  { rating: 3, createdAt: new Date('2024-02-01'), mentee: { id: 'u1' } },
  { rating: 5, createdAt: new Date('2024-02-10'), mentee: { id: 'u3' } },
];

const mockRepo = {
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(mockFeedbacks),
  })),
  count: jest.fn().mockResolvedValue(mockFeedbacks.length),
  find: jest.fn().mockResolvedValue(mockFeedbacks),
};

// Mock RolesGuard to always allow
class MockRolesGuard {
  canActivate(context: ExecutionContext) {
    return true;
  }
}

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: getRepositoryToken(Feedback), useValue: mockRepo },
      ],
    })
      .overrideGuard(RolesGuard)
      .useClass(MockRolesGuard)
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns average ratings over time', async () => {
    const result = await controller.getAverageRatings(2);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('month');
    expect(result[0]).toHaveProperty('average');
    expect(result[0]).toHaveProperty('count');
  });

  it('returns sessions count', async () => {
    const result = await controller.getSessionsCount();
    expect(result).toHaveProperty('sessionsCompleted', mockFeedbacks.length);
  });

  it('returns engagement metrics', async () => {
    const result = await controller.getEngagementMetrics();
    expect(result).toHaveProperty('uniqueMentees');
    expect(result).toHaveProperty('totalFeedbacks', mockFeedbacks.length);
    expect(result).toHaveProperty('averageFeedbacksPerMentee');
  });
}); 