import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from '../controllers/feedback.controller';
import { FeedbackService } from '../services/feedback.service';
import { CreateFeedbackDto } from '../dto/feedback/create-feedback.dto';
import { FeedbackType } from '../entities/feedback.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('FeedbackController', () => {
  let controller: FeedbackController;
  let feedbackService: FeedbackService;

  const mockFeedbackService = {
    createFeedback: jest.fn(),
    getFeedbackSummary: jest.fn(),
    getFeedbackForMatch: jest.fn(),
    getUserFeedbackHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        {
          provide: FeedbackService,
          useValue: mockFeedbackService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<FeedbackController>(FeedbackController);
    feedbackService = module.get<FeedbackService>(FeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeedback', () => {
    it('should create feedback', async () => {
      const createFeedbackDto: CreateFeedbackDto = {
        matchId: 'match-1',
        type: FeedbackType.MATCH_QUALITY,
        rating: 5,
        comment: 'Great match!',
      };

      const mockRequest = { user: { id: 'user-1' } };
      const expectedResult = { id: 'feedback-1', ...createFeedbackDto };

      mockFeedbackService.createFeedback.mockResolvedValue(expectedResult);

      const result = await controller.createFeedback(mockRequest, createFeedbackDto);

      expect(feedbackService.createFeedback).toHaveBeenCalledWith('user-1', createFeedbackDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getFeedbackSummary', () => {
    it('should return feedback summary', async () => {
      const expectedSummary = {
        matchId: 'match-1',
        averageRating: 4.5,
        totalFeedbackCount: 10,
      };

      mockFeedbackService.getFeedbackSummary.mockResolvedValue(expectedSummary);

      const result = await controller.getFeedbackSummary('match-1');

      expect(feedbackService.getFeedbackSummary).toHaveBeenCalledWith('match-1');
      expect(result).toEqual(expectedSummary);
    });
  });

  describe('getMatchFeedback', () => {
    it('should return feedback for match', async () => {
      const expectedFeedback = [
        { id: 'feedback-1', rating: 5 },
        { id: 'feedback-2', rating: 4 },
      ];

      mockFeedbackService.getFeedbackForMatch.mockResolvedValue(expectedFeedback);

      const result = await controller.getMatchFeedback('match-1');

      expect(feedbackService.getFeedbackForMatch).toHaveBeenCalledWith('match-1');
      expect(result).toEqual(expectedFeedback);
    });
  });

  describe('getMyFeedback', () => {
    it('should return user feedback history', async () => {
      const mockRequest = { user: { id: 'user-1' } };
      const expectedHistory = [
        { id: 'feedback-1', rating: 5 },
        { id: 'feedback-2', rating: 4 },
      ];

      mockFeedbackService.getUserFeedbackHistory.mockResolvedValue(expectedHistory);

      const result = await controller.getMyFeedback(mockRequest);

      expect(feedbackService.getUserFeedbackHistory).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expectedHistory);
    });
  });
});
