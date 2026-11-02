import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ─── POST /bookings ──────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new booking',
    description:
      'Reserves a room for the authenticated user for the given date range. ' +
      'The operation is **atomic** — it uses a database transaction to prevent double-booking. ' +
      '\n\n**Validations performed:**\n' +
      '- Check-in date must not be in the past\n' +
      '- Check-out must be after check-in\n' +
      '- Guest count must not exceed the room type\'s max occupancy\n' +
      '- No overlapping active bookings (`PENDING | CONFIRMED | CHECKED_IN`) for the same room\n\n' +
      '**Total price** is computed automatically as `nights × room base price`.\n\n' +
      '**Required roles:** Any authenticated user (GUEST, RECEPTIONIST, HOTEL_MANAGER, SUPER_ADMIN)',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiCreatedResponse({
    description: 'Booking confirmed. Returns the full booking record.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: {
          id: 'clbooking001',
          userId: 'clguest123',
          roomId: 'room-201',
          checkInDate: '2025-12-25T00:00:00.000Z',
          checkOutDate: '2025-12-28T00:00:00.000Z',
          guestCount: 2,
          status: 'CONFIRMED',
          totalPrice: '660.00',
          specialRequests: 'Late check-in after 10 PM',
          createdAt: '2025-12-01T10:00:00.000Z',
          room: {
            roomNumber: '201',
            floor: 2,
            roomType: { name: 'Deluxe Room', basePrice: '220.00' },
          },
          user: { id: 'clguest123', email: 'guest@example.com', firstName: 'David' },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request — past dates, check-out before check-in, or guest count exceeds room capacity.',
    schema: {
      example: {
        statusCode: 400,
        error: 'Bad Request',
        message: 'Check-in date cannot be in the past',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/bookings',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Room is already booked for the requested date range.',
    schema: {
      example: {
        statusCode: 409,
        error: 'Conflict',
        message: 'Room "201" is already booked from 2025-12-24 to 2025-12-27',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/bookings',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.bookingsService.create(dto, currentUser);
  }

  // ─── GET /bookings ───────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List bookings',
    description:
      'Returns a list of bookings scoped by the caller\'s role:\n\n' +
      '- **GUEST** — sees only their own bookings\n' +
      '- **RECEPTIONIST / HOTEL_MANAGER / SUPER_ADMIN** — sees all bookings system-wide\n\n' +
      'Results are ordered by creation date descending (newest first).',
  })
  @ApiOkResponse({
    description: 'List of bookings. Scope depends on caller role.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: [
          {
            id: 'clbooking001',
            status: 'CONFIRMED',
            checkInDate: '2025-12-25T00:00:00.000Z',
            checkOutDate: '2025-12-28T00:00:00.000Z',
            guestCount: 2,
            totalPrice: '660.00',
            room: { roomNumber: '201', hotel: { name: 'Grand Palace Hotel' } },
            user: { email: 'guest@example.com', firstName: 'David', lastName: 'Lee' },
            payments: [],
          },
        ],
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  findAll(@CurrentUser() currentUser: User) {
    return this.bookingsService.findAll(currentUser);
  }

  // ─── GET /bookings/:id ───────────────────────────────────
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single booking by ID',
    description:
      'Returns full details for a specific booking including room, hotel, user, and payment records. ' +
      '\n\n**Access control:** Guests can only retrieve their own bookings. ' +
      'Staff and managers can retrieve any booking.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Booking ID (cuid)',
    example: 'clbooking001',
  })
  @ApiOkResponse({
    description: 'Full booking record.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          id: 'clbooking001',
          status: 'CONFIRMED',
          checkInDate: '2025-12-25T00:00:00.000Z',
          checkOutDate: '2025-12-28T00:00:00.000Z',
          guestCount: 2,
          totalPrice: '660.00',
          specialRequests: 'Late check-in after 10 PM',
          room: {
            roomNumber: '201',
            floor: 2,
            status: 'AVAILABLE',
            roomType: { name: 'Deluxe Room', basePrice: '220.00', maxOccupancy: 3 },
            hotel: { name: 'Grand Palace Hotel', city: 'New York' },
          },
          user: { id: 'clguest123', email: 'guest@example.com', firstName: 'David', lastName: 'Lee' },
          payments: [],
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Guests cannot view another user\'s booking.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  findOne(@Param('id') id: string, @CurrentUser() currentUser: User) {
    return this.bookingsService.findOne(id, currentUser);
  }

  // ─── PATCH /bookings/:id/status ──────────────────────────
  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN, Role.HOTEL_MANAGER, Role.RECEPTIONIST)
  @ApiOperation({
    summary: 'Update booking status (check-in, check-out, cancel)',
    description:
      'Advances a booking through its lifecycle. Automatically syncs the physical room status:\n\n' +
      '| New Booking Status | Room Status Becomes |\n' +
      '|--------------------|---------------------|\n' +
      '| `CHECKED_IN`       | `OCCUPIED`          |\n' +
      '| `CHECKED_OUT`      | `DIRTY`             |\n' +
      '| `CANCELLED`/`NO_SHOW` | `AVAILABLE` (if room was OCCUPIED) |\n\n' +
      '**Required roles:** `SUPER_ADMIN`, `HOTEL_MANAGER`, `RECEPTIONIST`',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Booking ID (cuid)',
    example: 'clbooking001',
  })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiOkResponse({
    description: 'Booking status updated and room status synced atomically.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          id: 'clbooking001',
          status: 'CHECKED_IN',
          room: { roomNumber: '201', status: 'OCCUPIED' },
          updatedAt: '2025-12-25T14:00:00.000Z',
        },
        timestamp: '2025-12-25T14:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Only SUPER_ADMIN, HOTEL_MANAGER, and RECEPTIONIST can update booking status.' })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.bookingsService.updateStatus(id, dto, currentUser);
  }
}
