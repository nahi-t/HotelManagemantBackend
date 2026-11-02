# Hotel Management System — NestJS Backend

An enterprise-grade Hotel Management System built with **NestJS v10+**, **Prisma ORM**, and **PostgreSQL**, featuring fine-grained **Role-Based Access Control (RBAC)** across five roles.

## 🏗️ Architecture

```
src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts   # @CurrentUser() param decorator
│   │   ├── public.decorator.ts         # @Public() bypass auth
│   │   └── roles.decorator.ts          # @Roles(...roles) metadata
│   ├── filters/
│   │   └── http-exception.filter.ts    # Global RFC 7807 error envelope
│   ├── guards/
│   │   ├── jwt-auth.guard.ts           # JWT guard respecting @Public()
│   │   └── roles.guard.ts              # RBAC guard via Reflector
│   └── interceptors/
│       └── transform.interceptor.ts    # Standardized response wrapper
├── modules/
│   ├── auth/
│   │   ├── dto/                        # RegisterDto, LoginDto
│   │   ├── strategies/jwt.strategy.ts  # Passport JWT strategy
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   └── auth.module.ts
│   ├── rooms/
│   │   ├── dto/                        # CreateRoomDto, UpdateRoomStatusDto
│   │   ├── rooms.service.ts
│   │   ├── rooms.controller.ts
│   │   └── rooms.module.ts
│   └── bookings/
│       ├── dto/                        # CreateBookingDto, UpdateBookingStatusDto
│       ├── bookings.service.ts         # Atomic transactions, concurrency control
│       ├── bookings.controller.ts
│       └── bookings.module.ts
├── prisma/
│   ├── prisma.service.ts               # PrismaClient with lifecycle hooks
│   └── prisma.module.ts                # Global module
├── app.module.ts
└── main.ts                             # Bootstrap, Swagger, CORS, ValidationPipe
prisma/
├── schema.prisma                       # Full DB schema
└── seed.ts                             # Seed with all 5 user roles + data
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL connection string and JWT secret
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed initial data
npm run seed
```

### 4. Start the Server
```bash
npm run start:dev
```

The API will be available at:
- **Base URL**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/api/docs`

## 🔐 User Roles & Permissions

| Role | Permissions |
|------|------------|
| **SUPER_ADMIN** | Full system access: all rooms, bookings, users, role management |
| **HOTEL_MANAGER** | Room inventory, pricing, staff, analytics |
| **RECEPTIONIST** | Check-in/out, walk-in bookings, billing, room availability |
| **HOUSEKEEPING** | Update room cleaning status only |
| **GUEST** | Self-service booking, view own bookings, cancel |

## 📋 API Endpoints

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register a new guest account |
| `POST` | `/api/v1/auth/login` | Login and receive JWT |

### Rooms
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| `GET` | `/api/v1/rooms` | Public | — |
| `GET` | `/api/v1/rooms/:id` | Public | — |
| `POST` | `/api/v1/rooms` | Required | SUPER_ADMIN, HOTEL_MANAGER |
| `PATCH` | `/api/v1/rooms/:id/status` | Required | HOUSEKEEPING, RECEPTIONIST, HOTEL_MANAGER, SUPER_ADMIN |

### Bookings
| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| `POST` | `/api/v1/bookings` | Required | All authenticated |
| `GET` | `/api/v1/bookings` | Required | Staff: all; Guest: own |
| `GET` | `/api/v1/bookings/:id` | Required | Staff: any; Guest: own |
| `PATCH` | `/api/v1/bookings/:id/status` | Required | SUPER_ADMIN, HOTEL_MANAGER, RECEPTIONIST |

## 🌱 Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | `superadmin@hotel.com` | `SuperAdmin@123` |
| HOTEL_MANAGER | `manager@grandpalace.com` | `Manager@123` |
| RECEPTIONIST | `reception@grandpalace.com` | `Receptionist@123` |
| HOUSEKEEPING | `housekeeping@grandpalace.com` | `Housekeeping@123` |
| GUEST | `guest@example.com` | `Guest@123` |

## ⚙️ Key Design Decisions

### Concurrency-Safe Bookings
Booking creation is wrapped in a Prisma `$transaction`. Inside the transaction, the system:
1. Validates dates (not in past, check-out > check-in)
2. Checks room capacity against guest count
3. Queries for overlapping active bookings (`PENDING | CONFIRMED | CHECKED_IN`)
4. Computes total price from nights × base price
5. Creates the booking atomically — no double-booking possible

### Room Status Lifecycle
```
AVAILABLE → OCCUPIED (on CHECKED_IN)
OCCUPIED  → DIRTY    (on CHECKED_OUT)
DIRTY     → CLEANING → AVAILABLE  (housekeeping workflow)
ANY       → MAINTENANCE / OUT_OF_ORDER (admin/manager)
```

### Response Envelope
All responses wrapped in:
```json
{
  "statusCode": 200,
  "success": true,
  "data": { ... },
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

All errors formatted as:
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["checkInDate must be a valid ISO 8601 date"],
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/bookings"
}
```
