import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    example: 'room-201',
    description: 'ID of the room to reserve',
  })
  @IsString()
  @IsNotEmpty()
  roomId!: string;

  @ApiProperty({
    example: '2025-12-25',
    description:
      'Check-in date in ISO 8601 format (YYYY-MM-DD). Must not be in the past.',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'checkInDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  checkInDate!: string;

  @ApiProperty({
    example: '2025-12-28',
    description:
      'Check-out date in ISO 8601 format (YYYY-MM-DD). Must be after check-in date.',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'checkOutDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  checkOutDate!: string;

  @ApiProperty({
    example: 2,
    description: 'Number of guests. Must not exceed the room type maximum occupancy.',
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1, { message: 'At least 1 guest is required' })
  @Max(10, { message: 'Maximum 10 guests per booking' })
  guestCount!: number;

  @ApiPropertyOptional({
    example: 'Late check-in after 10 PM. Extra towels requested.',
    description: 'Optional special requests forwarded to hotel staff',
  })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
