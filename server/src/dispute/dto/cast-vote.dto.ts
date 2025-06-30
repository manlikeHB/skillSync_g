import { IsString, IsOptional } from 'class-validator';

export class CastVoteDto {
  @IsString()
  decision: string;

  @IsOptional()
  @IsString()
  justification?: string;
}
