import { IsString, IsOptional } from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  contractId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  evidenceDescription?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
