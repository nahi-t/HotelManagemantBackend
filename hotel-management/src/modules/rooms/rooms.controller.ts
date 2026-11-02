import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role, RoomStatus } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // ─── GET /rooms ──────────────────────────────────────────
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List all rooms',
    description:
      'Returns all rooms in the system. Supports optional filtering by hotel and/or room status. ' +
      'This endpoint is **publicly accessible** — no authentication required.',
  })
  @ApiQuery({
    name: 'hotelId',
    required: false,
    type: String,
    description: 'Filter by hotel ID',
    example: 'hotel-grand-palace',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: RoomStatus,
    enumName: 'RoomStatus',
    description: 'Filter by current room status',
    example: RoomStatus.AVAILABLE,
  })
  @ApiOkResponse({
    description: 'List of rooms (with room type and hotel details included).',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: [
          {
            id: 'room-101',
            hotelId: 'hotel-grand-palace',
            roomTypeId: 'rt-standard',
            roomNumber: '101',
            floor: 1,
            status: 'AVAILABLE',
            notes: null,
            roomType: { name: 'Standard Room', basePrice: '120.00', maxOccupancy: 2 },
            hotel: { id: 'hotel-grand-palace', name: 'Grand Palace Hotel', city: 'New York' },
          },
        ],
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  findAll(
    @Query('hotelId') hotelId?: string,
    @Query('status') status?: RoomStatus,
  ) {
    return this.roomsService.findAll({ hotelId, status });
  }

  // ─── GET /rooms/:id ──────────────────────────────────────
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get a single room by ID',
    description:
      'Returns full details for a specific room including its type and hotel. ' +
      'This endpoint is **publicly accessible**.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Room ID (cuid)',
    example: 'room-201',
  })
  @ApiOkResponse({
    description: 'Room details with associated room type and hotel.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          id: 'room-201',
          roomNumber: '201',
          floor: 2,
          status: 'AVAILABLE',
          notes: null,
          roomType: {
            name: 'Deluxe Room',
            basePrice: '220.00',
            maxOccupancy: 3,
            amenities: ['WiFi', 'AC', 'TV', 'Mini-bar', 'Balcony'],
          },
          hotel: {
            id: 'hotel-grand-palace',
            name: 'Grand Palace Hotel',
            address: '100 Luxury Boulevard',
            city: 'New York',
            country: 'USA',
          },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No room found with the given ID.',
    schema: {
      example: {
        statusCode: 404,
        error: 'Not Found',
        message: 'Room with ID "room-999" not found',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/rooms/room-999',
      },
    },
  })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  // ─── POST /rooms ─────────────────────────────────────────
  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HOTEL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new room',
    description:
      'Adds a new room to the hotel inventory. ' +
      'Validates that the hotel and room type exist and that the room number is unique within the hotel. ' +
      '\n\n**Required roles:** `SUPER_ADMIN`, `HOTEL_MANAGER`',
  })
  @ApiBody({ type: CreateRoomDto })
  @ApiCreatedResponse({
    description: 'Room successfully created.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: {
          id: 'clxyz789',
          hotelId: 'hotel-grand-palace',
          roomNumber: '205',
          floor: 2,
          status: 'AVAILABLE',
          notes: 'Corner room with panoramic city view',
          roomType: { name: 'Deluxe Room', basePrice: '220.00' },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Caller does not have SUPER_ADMIN or HOTEL_MANAGER role.',
    schema: {
      example: {
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied. Required roles: SUPER_ADMIN, HOTEL_MANAGER. Your role: GUEST',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/rooms',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Hotel or room type not found.' })
  @ApiConflictResponse({ description: 'Room number already exists in this hotel.' })
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  // ─── PATCH /rooms/:id/status ─────────────────────────────
  @Patch(':id/status')
  @Roles(Role.HOUSEKEEPING, Role.RECEPTIONIST, Role.HOTEL_MANAGER, Role.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update room cleaning / availability status',
    description:
      'Updates the physical status of a room. Used by housekeeping to mark rooms as ' +
      '`CLEANING` → `AVAILABLE`, or by management to flag rooms for `MAINTENANCE`. ' +
      '\n\n**Required roles:** `HOUSEKEEPING`, `RECEPTIONIST`, `HOTEL_MANAGER`, `SUPER_ADMIN`' +
      '\n\n**Status lifecycle:** `AVAILABLE` → `OCCUPIED` (auto on check-in) → `DIRTY` (auto on check-out) → `CLEANING` → `AVAILABLE`',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Room ID (cuid)',
    example: 'room-103',
  })
  @ApiBody({ type: UpdateRoomStatusDto })
  @ApiOkResponse({
    description: 'Room status successfully updated.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          id: 'room-103',
          roomNumber: '103',
          status: 'AVAILABLE',
          notes: 'Room cleaned and restocked',
          updatedAt: '2025-12-01T11:30:00.000Z',
        },
        timestamp: '2025-12-01T11:30:00.000Z',
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Insufficient role permissions.' })
  @ApiNotFoundResponse({ description: 'Room not found.' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.roomsService.updateStatus(id, dto);
  }
}
