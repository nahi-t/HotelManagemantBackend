import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: BookingStatus,
    enumName: 'BookingStatus',
    example: BookingStatus.CHECKED_IN,
    description:
      'New booking lifecycle status. ' +
      'PENDING=awaiting confirmation | CONFIRMED=reservation confirmed | ' +
      'CHECKED_IN=guest has arrived (room → OCCUPIED) | ' +
      'CHECKED_OUT=guest has left (room → DIRTY) | ' +
      'CANCELLED=reservation cancelled | NO_SHOW=guest did not arrive',
  })
  @IsEnum(BookingStatus)
  status!: BookingStatus;
}
