import { IsOptional, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';

export class CreateMatchingRequestDto {
  @IsString()
  mentorId: string;

  @IsString()
  menteeId: string;

  @IsArray()
  @IsOptional()
  skills?: string[];

  @IsArray()
  @IsOptional()
  preferences?: string[];

  @IsOptional()
  demographicInfo?: DemographicInfo;
}

export class FairnessConfigDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  maxDemographicImbalance: number = 0.2;

  @IsNumber()
  @Min(0)
  @Max(1)
  minEqualOpportunity: number = 0.8;

  @IsNumber()
  @Min(0)
  @Max(1)
  diversityWeight: number = 0.3;

  @IsNumber()
  @Min(0)
  @Max(1)
  skillWeight: number = 0.4;

  @IsNumber()
  @Min(0)
  @Max(1)
  preferenceWeight: number = 0.3;
}
