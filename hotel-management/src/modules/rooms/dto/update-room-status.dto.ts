import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateRoomStatusDto {
  @ApiProperty({
    enum: RoomStatus,
    enumName: 'RoomStatus',
    example: RoomStatus.CLEANING,
    description:
      'New physical status of the room. ' +
      'AVAILABLE=ready for check-in | OCCUPIED=guest present | ' +
      'DIRTY=needs cleaning | CLEANING=being cleaned | ' +
      'MAINTENANCE=under repair | OUT_OF_ORDER=not usable',
  })
  @IsEnum(RoomStatus)
  status!: RoomStatus;

  @ApiPropertyOptional({
    example: 'Deep cleaning after long-stay guest',
    description: 'Optional note recorded alongside the status change',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
