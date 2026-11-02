import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'superadmin@hotel.com',
    description: 'Registered email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'SuperAdmin@123',
    description: 'Account password (8–64 characters)',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
