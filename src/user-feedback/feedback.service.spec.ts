import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FeedbackService } from '../services/feedback.service';
import { Feedback, FeedbackType } from '../entities/feedback.entity';
import { Match, MatchStatus } from '../entities/match.entity';
import { User, UserRole } from '../entities/user.entity';

describe('FeedbackService', () => {
  let service: FeedbackService;
  let feedbackRepository: Repository<Feedback>;
  let matchRepository: Repository<Match>;

  const mockFeedbackRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockMatchRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        {
          provide: getRepositoryToken(Feedback),
          useValue: mockFeedbackRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepository,
        },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
    feedbackRepository = module.get<Repository<Feedback>>(getRepositoryToken(Feedback));
    matchRepository = module.get<Repository<Match>>(getRepositoryToken(Match));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeedback', () => {
    const mockUser: User = {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.MENTOR,
      skills: ['JavaScript'],
      interests: ['Web Development'],
      preferences: {},
      mentorMatches: [],
      menteeMatches: [],
      givenFeedback: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockMatch: Match = {
      id: 'match-1',
      mentorId: 'user-1',
      menteeId: 'user-2',
      mentor: mockUser,
      mentee: { ...mockUser, id: 'user-2', role: UserRole.MENTEE },
      status: MatchStatus.ACTIVE,
      matchingCriteria: null,
      algorithmScore: 0.85,
      startDate: new Date(),
      endDate: null,
      feedback: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createFeedbackDto = {
      matchId: 'match-1',
      type: FeedbackType.MATCH_QUALITY,
      rating: 5,
      comment: 'Great match!',
      tags: ['helpful'],
      specificFeedback: {
        skillsMatched: true,
        communicationEffective: true,
      },
      isAnonymous: false,
    };

    it('should create feedback successfully', async () => {
      const expectedFeedback = {
        id: 'feedback-1',
        ...createFeedbackDto,
        reviewerId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockFeedbackRepository.findOne.mockResolvedValue(null);
      mockFeedbackRepository.create.mockReturnValue(expectedFeedback);
      mockFeedbackRepository.save.mockResolvedValue(expectedFeedback);

      const result = await service.createFeedback('user-1', createFeedbackDto);

      expect(mockMatchRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'match-1' },
        relations: ['mentor', 'mentee'],
      });
      expect(mockFeedbackRepository.create).toHaveBeenCalledWith({
        ...createFeedbackDto,
        reviewerId: 'user-1',
      });
      expect(result).toEqual(expectedFeedback);
    });

    it('should throw NotFoundException when match not found', async () => {
      mockMatchRepository.findOne.mockResolvedValue(null);

      await expect(service.createFeedback('user-1', createFeedbackDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not part of match', async () => {
      const invalidMatch = { ...mockMatch, mentorId: 'other-user', menteeId: 'another-user' };
      mockMatchRepository.findOne.mockResolvedValue(invalidMatch);

      await expect(service.createFeedback('user-1', createFeedbackDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when feedback already exists', async () => {
      const existingFeedback = { id: 'existing-feedback' };
      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockFeedbackRepository.findOne.mockResolvedValue(existingFeedback);

      await expect(service.createFeedback('user-1', createFeedbackDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getFeedbackSummary', () => {
    it('should return feedback summary', async () => {
      const mockMatch = { id: 'match-1' };
      const mockFeedback = [
        {
          type: FeedbackType.MATCH_QUALITY,
          rating: 5,
          tags: ['helpful', 'responsive'],
          specificFeedback: { skillsMatched: true, communicationEffective: true },
        },
        {
          type: FeedbackType.COMMUNICATION,
          rating: 4,
          tags: ['clear'],
          specificFeedback: { communicationEffective: true },
        },
      ];

      mockMatchRepository.findOne.mockResolvedValue(mockMatch);
      mockFeedbackRepository.find.mockResolvedValue(mockFeedback);

      const result = await service.getFeedbackSummary('match-1');

      expect(result).toMatchObject({
        matchId: 'match-1',
        averageRating: 4.5,
        totalFeedbackCount: 2,
      });
      expect(result.commonTags).toContainEqual({ tag: 'helpful', count: 1 });
      expect(result.specificMetrics.skillsMatchRate).toBe(0.5);
    });

    it('should throw NotFoundException when match not found', async () => {
      mockMatchRepository.findOne.mockResolvedValue(null);

      await expect(service.getFeedbackSummary('nonexistent-match'))
        .rejects.toThrow(NotFoundException);
    });
  });
});

