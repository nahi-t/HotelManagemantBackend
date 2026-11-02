import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: 'hotel-grand-palace',
    description: 'ID of the hotel this room belongs to',
  })
  @IsString()
  @IsNotEmpty()
  hotelId!: string;

  @ApiProperty({
    example: 'rt-deluxe',
    description: 'ID of the room type (e.g. Standard, Deluxe, Suite)',
  })
  @IsString()
  @IsNotEmpty()
  roomTypeId!: string;

  @ApiProperty({
    example: '205',
    description: 'Unique room number within the hotel',
  })
  @IsString()
  @IsNotEmpty()
  roomNumber!: string;

  @ApiProperty({
    example: 2,
    description: 'Floor number the room is located on (1–200)',
    minimum: 1,
    maximum: 200,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  floor!: number;

  @ApiPropertyOptional({
    example: 'Corner room with panoramic city view',
    description: 'Optional internal notes about the room',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
