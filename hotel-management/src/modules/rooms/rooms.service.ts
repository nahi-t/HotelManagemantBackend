import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Room, RoomStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';

export interface RoomsFilter {
  hotelId?: string;
  status?: RoomStatus;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: RoomsFilter): Promise<Room[]> {
    return this.prisma.room.findMany({
      where: {
        ...(filter.hotelId && { hotelId: filter.hotelId }),
        ...(filter.status && { status: filter.status }),
      },
      include: {
        roomType: true,
        hotel: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
        hotel: {
          select: { id: true, name: true, address: true, city: true, country: true, phone: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID "${id}" not found`);
    }

    return room;
  }

  async create(dto: CreateRoomDto): Promise<Room> {
    // Verify hotel exists
    const hotel = await this.prisma.hotel.findUnique({ where: { id: dto.hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel with ID "${dto.hotelId}" not found`);
    }

    // Verify room type exists and belongs to hotel
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, hotelId: dto.hotelId },
    });
    if (!roomType) {
      throw new NotFoundException(
        `RoomType "${dto.roomTypeId}" not found for hotel "${dto.hotelId}"`,
      );
    }

    // Check for duplicate room number in hotel
    const duplicate = await this.prisma.room.findUnique({
      where: { hotelId_roomNumber: { hotelId: dto.hotelId, roomNumber: dto.roomNumber } },
    });
    if (duplicate) {
      throw new ConflictException(
        `Room number "${dto.roomNumber}" already exists in this hotel`,
      );
    }

    return this.prisma.room.create({
      data: {
        hotelId: dto.hotelId,
        roomTypeId: dto.roomTypeId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        notes: dto.notes,
      },
      include: { roomType: true },
    });
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto): Promise<Room> {
    await this.findOne(id); // throws if not found

    return this.prisma.room.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { roomType: true },
    });
  }
}
