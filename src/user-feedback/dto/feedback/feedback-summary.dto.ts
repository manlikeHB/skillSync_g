export class FeedbackSummaryDto {
    matchId: string;
    averageRating: number;
    totalFeedbackCount: number;
    feedbackByType: Record<FeedbackType, { average: number; count: number }>;
    commonTags: { tag: string; count: number }[];
    specificMetrics: {
      skillsMatchRate: number;
      communicationEffectiveness: number;
      goalAlignment: number;
      timeCommitmentRate: number;
      recommendationRate: number;
    };
  }