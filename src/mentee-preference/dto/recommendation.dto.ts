export class RecommendationRequestDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 10;
  
    @IsOptional()
    @IsString({ each: true })
    skills?: string[];
  
    @IsOptional()
    @IsString({ each: true })
    interests?: string[];
  }
  
  export class RecommendationResponseDto {
    mentor: {
      id: string;
      firstName: string;
      lastName: string;
      skills: string[];
      interests: string[];
      bio?: string;
      profileImage?: string;
    };
    score: number;
    matchReasons: string[];
    isPreferred: boolean;
    preferenceWeight?: number;
  }