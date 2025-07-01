import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Feedback } from '../entities/feedback.entity';
import { ReputationService } from '../services/reputation.service';
import { BadRequestException } from '@nestjs/common';

const mockFeedbackRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockReputationService = {
  updateMentorReputation: jest.fn(),
};

describe('FeedbackController', () => {
  let controller: FeedbackController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        { provide: getRepositoryToken(Feedback), useValue: mockFeedbackRepo },
        { provide: ReputationService, useValue: mockReputationService },
      ],
    }).compile();

    controller = module.get<FeedbackController>(FeedbackController);
    // Mock the session participation check to true by default
    jest.spyOn(controller as any, 'verifyMenteeParticipation').mockResolvedValue(true);
  });

  const req = { user: { id: 'mentee1' } };
  const dto = { mentorId: 'mentor1', sessionId: 'session1', rating: 5, comment: 'Great!' };

  it('should submit feedback successfully', async () => {
    mockFeedbackRepo.findOne.mockResolvedValue(null);
    mockFeedbackRepo.create.mockReturnValue({ ...dto, mentee: { id: req.user.id } });
    mockFeedbackRepo.save.mockResolvedValue({});
    await expect(controller.createFeedback(dto, req)).resolves.toEqual({ success: true });
    expect(mockReputationService.updateMentorReputation).toHaveBeenCalledWith(dto.mentorId);
  });

  it('should prevent self-feedback', async () => {
    await expect(controller.createFeedback({ ...dto, mentorId: req.user.id }, req)).rejects.toThrow(BadRequestException);
  });

  it('should prevent duplicate feedback', async () => {
    mockFeedbackRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(controller.createFeedback(dto, req)).rejects.toThrow(BadRequestException);
  });

  it('should prevent feedback if not session mentee', async () => {
    mockFeedbackRepo.findOne.mockResolvedValue(null);
    jest.spyOn(controller as any, 'verifyMenteeParticipation').mockResolvedValue(false);
    await expect(controller.createFeedback(dto, req)).rejects.toThrow(BadRequestException);
  });
}); 