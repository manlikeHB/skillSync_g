import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf, IsArray } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(UserRole)
  role: UserRole;

  @ValidateIf((o) => o.role === UserRole.MENTOR)
  @IsNotEmpty({ message: 'Credential file is required for mentors' })
  credentialFile?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsString()
  availability?: string;
}
