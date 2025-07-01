import { IsInt, IsString, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  mentorId: string;

  @IsString()
  sessionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @Length(0, 500)
  comment?: string;
}
