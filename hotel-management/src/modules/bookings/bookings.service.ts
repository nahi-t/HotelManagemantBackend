import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Booking, BookingStatus, Role, RoomStatus, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

/** Roles that have elevated (non-guest) booking management access */
const STAFF_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.HOTEL_MANAGER,
  Role.RECEPTIONIST,
];

/** Booking statuses considered as "active" for overlap detection */
const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.CHECKED_IN,
];

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────────────────────────────────────────
  // Create Booking (with atomic concurrency-safe transaction)
  // ───────────────────────────────────────────────────────────
  async create(dto: CreateBookingDto, currentUser: User): Promise<Booking> {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ── Date validations ──
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // ── Atomic transaction ──
    return this.prisma.$transaction(async (tx) => {
      // Fetch room with lock-row semantics via SELECT (Prisma handles serialized reads)
      const room = await tx.room.findUnique({
        where: { id: dto.roomId },
        include: { roomType: true },
      });

      if (!room) {
        throw new NotFoundException(`Room with ID "${dto.roomId}" not found`);
      }

      if (room.status === RoomStatus.OUT_OF_ORDER || room.status === RoomStatus.MAINTENANCE) {
        throw new BadRequestException(
          `Room "${room.roomNumber}" is currently under maintenance and cannot be booked`,
        );
      }

      // ── Guest count vs room capacity ──
      if (dto.guestCount > room.roomType.maxOccupancy) {
        throw new BadRequestException(
          `Room "${room.roomNumber}" has a maximum occupancy of ${room.roomType.maxOccupancy} guests`,
        );
      }

      // ── Overlap detection ──
      // Active booking overlaps if: existingCheckIn < requestedCheckOut AND existingCheckOut > requestedCheckIn
      const overlappingBooking = await tx.booking.findFirst({
        where: {
          roomId: dto.roomId,
          status: { in: ACTIVE_STATUSES },
          checkInDate: { lt: checkOut },
          checkOutDate: { gt: checkIn },
        },
      });

      if (overlappingBooking) {
        throw new ConflictException(
          `Room "${room.roomNumber}" is already booked from ` +
            `${overlappingBooking.checkInDate.toISOString().split('T')[0]} ` +
            `to ${overlappingBooking.checkOutDate.toISOString().split('T')[0]}`,
        );
      }

      // ── Price calculation ──
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );
      const totalPrice = Number(room.roomType.basePrice) * nights;

      // ── Create booking ──
      const booking = await tx.booking.create({
        data: {
          userId: currentUser.id,
          roomId: dto.roomId,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          guestCount: dto.guestCount,
          totalPrice,
          status: BookingStatus.CONFIRMED,
          specialRequests: dto.specialRequests,
        },
        include: {
          room: { include: { roomType: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      return booking;
    });
  }

  // ───────────────────────────────────────────────────────────
  // Find All Bookings (scoped by role)
  // ───────────────────────────────────────────────────────────
  async findAll(currentUser: User): Promise<Booking[]> {
    const isStaff = STAFF_ROLES.includes(currentUser.role);

    return this.prisma.booking.findMany({
      where: isStaff ? {} : { userId: currentUser.id },
      include: {
        room: {
          include: {
            roomType: true,
            hotel: { select: { id: true, name: true, city: true } },
          },
        },
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ───────────────────────────────────────────────────────────
  // Find One Booking
  // ───────────────────────────────────────────────────────────
  async findOne(id: string, currentUser: User): Promise<Booking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        room: { include: { roomType: true, hotel: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    // Guests can only view their own bookings
    const isStaff = STAFF_ROLES.includes(currentUser.role);
    if (!isStaff && booking.userId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to view this booking');
    }

    return booking;
  }

  // ───────────────────────────────────────────────────────────
  // Update Booking Status (with room sync on check-in/check-out)
  // ───────────────────────────────────────────────────────────
  async updateStatus(
    id: string,
    dto: UpdateBookingStatusDto,
    currentUser: User,
  ): Promise<Booking> {
    const booking = await this.findOne(id, currentUser);

    return this.prisma.$transaction(async (tx) => {
      // Sync physical room status
      let newRoomStatus: RoomStatus | null = null;

      if (dto.status === BookingStatus.CHECKED_IN) {
        newRoomStatus = RoomStatus.OCCUPIED;
      } else if (dto.status === BookingStatus.CHECKED_OUT) {
        newRoomStatus = RoomStatus.DIRTY;
      } else if (
        dto.status === BookingStatus.CANCELLED ||
        dto.status === BookingStatus.NO_SHOW
      ) {
        // Only free up room if it was OCCUPIED due to this booking
        const currentRoom = await tx.room.findUnique({ where: { id: booking.roomId } });
        if (currentRoom?.status === RoomStatus.OCCUPIED) {
          newRoomStatus = RoomStatus.AVAILABLE;
        }
      }

      if (newRoomStatus) {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: newRoomStatus },
        });
      }

      return tx.booking.update({
        where: { id },
        data: { status: dto.status },
        include: {
          room: { include: { roomType: true } },
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          payments: true,
        },
      });
    });
  }
}
