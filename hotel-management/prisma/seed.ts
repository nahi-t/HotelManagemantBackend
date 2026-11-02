import { PrismaClient, Role, RoomStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ── Super Admin ──────────────────────────────────────────
  const passwordHash = await bcrypt.hash('SuperAdmin@123', 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@hotel.com' },
    update: {},
    create: {
      email: 'superadmin@hotel.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.SUPER_ADMIN,
      phone: '+1-555-000-0001',
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // ── Hotel Manager ────────────────────────────────────────
  const managerHash = await bcrypt.hash('Manager@123', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@grandpalace.com' },
    update: {},
    create: {
      email: 'manager@grandpalace.com',
      passwordHash: managerHash,
      firstName: 'Alice',
      lastName: 'Walker',
      role: Role.HOTEL_MANAGER,
      phone: '+1-555-000-0002',
    },
  });
  console.log(`✅ Hotel Manager: ${manager.email}`);

  // ── Receptionist ─────────────────────────────────────────
  const receptionistHash = await bcrypt.hash('Receptionist@123', 12);
  const receptionist = await prisma.user.upsert({
    where: { email: 'reception@grandpalace.com' },
    update: {},
    create: {
      email: 'reception@grandpalace.com',
      passwordHash: receptionistHash,
      firstName: 'Bob',
      lastName: 'Smith',
      role: Role.RECEPTIONIST,
      phone: '+1-555-000-0003',
    },
  });
  console.log(`✅ Receptionist: ${receptionist.email}`);

  // ── Housekeeping ─────────────────────────────────────────
  const hkHash = await bcrypt.hash('Housekeeping@123', 12);
  const housekeeping = await prisma.user.upsert({
    where: { email: 'housekeeping@grandpalace.com' },
    update: {},
    create: {
      email: 'housekeeping@grandpalace.com',
      passwordHash: hkHash,
      firstName: 'Carol',
      lastName: 'Johnson',
      role: Role.HOUSEKEEPING,
      phone: '+1-555-000-0004',
    },
  });
  console.log(`✅ Housekeeping: ${housekeeping.email}`);

  // ── Guest ────────────────────────────────────────────────
  const guestHash = await bcrypt.hash('Guest@123', 12);
  const guest = await prisma.user.upsert({
    where: { email: 'guest@example.com' },
    update: {},
    create: {
      email: 'guest@example.com',
      passwordHash: guestHash,
      firstName: 'David',
      lastName: 'Lee',
      role: Role.GUEST,
      phone: '+1-555-000-0005',
    },
  });
  console.log(`✅ Guest: ${guest.email}`);

  // ── Hotel Property ────────────────────────────────────────
  const hotel = await prisma.hotel.upsert({
    where: { id: 'hotel-grand-palace' },
    update: {},
    create: {
      id: 'hotel-grand-palace',
      name: 'Grand Palace Hotel',
      address: '100 Luxury Boulevard',
      city: 'New York',
      country: 'USA',
      phone: '+1-555-100-0000',
      email: 'info@grandpalace.com',
      starRating: 5,
    },
  });
  console.log(`✅ Hotel: ${hotel.name}`);

  // ── Room Types ────────────────────────────────────────────
  const standardType = await prisma.roomType.upsert({
    where: { id: 'rt-standard' },
    update: {},
    create: {
      id: 'rt-standard',
      hotelId: hotel.id,
      name: 'Standard Room',
      description: 'Comfortable room with city view, queen bed, and essential amenities.',
      basePrice: 120.00,
      maxOccupancy: 2,
      amenities: ['WiFi', 'AC', 'TV', 'Safe', 'Hair Dryer'],
    },
  });

  const deluxeType = await prisma.roomType.upsert({
    where: { id: 'rt-deluxe' },
    update: {},
    create: {
      id: 'rt-deluxe',
      hotelId: hotel.id,
      name: 'Deluxe Room',
      description: 'Spacious room with king bed, balcony, and premium amenities.',
      basePrice: 220.00,
      maxOccupancy: 3,
      amenities: ['WiFi', 'AC', 'TV', 'Safe', 'Mini-bar', 'Balcony', 'Bathrobe'],
    },
  });

  const suiteType = await prisma.roomType.upsert({
    where: { id: 'rt-suite' },
    update: {},
    create: {
      id: 'rt-suite',
      hotelId: hotel.id,
      name: 'Executive Suite',
      description: 'Luxury suite with separate living area, jacuzzi, and butler service.',
      basePrice: 550.00,
      maxOccupancy: 4,
      amenities: ['WiFi', 'AC', '2x TV', 'Safe', 'Mini-bar', 'Jacuzzi', 'Bathrobe', 'Butler Service', 'Lounge Access'],
    },
  });
  console.log('✅ Room types created');

  // ── Sample Rooms ──────────────────────────────────────────
  const roomsData = [
    // Standard rooms — Floor 1
    { id: 'room-101', roomNumber: '101', floor: 1, roomTypeId: standardType.id, status: RoomStatus.AVAILABLE },
    { id: 'room-102', roomNumber: '102', floor: 1, roomTypeId: standardType.id, status: RoomStatus.AVAILABLE },
    { id: 'room-103', roomNumber: '103', floor: 1, roomTypeId: standardType.id, status: RoomStatus.DIRTY },
    { id: 'room-104', roomNumber: '104', floor: 1, roomTypeId: standardType.id, status: RoomStatus.MAINTENANCE },
    // Deluxe rooms — Floor 2
    { id: 'room-201', roomNumber: '201', floor: 2, roomTypeId: deluxeType.id, status: RoomStatus.AVAILABLE },
    { id: 'room-202', roomNumber: '202', floor: 2, roomTypeId: deluxeType.id, status: RoomStatus.AVAILABLE },
    { id: 'room-203', roomNumber: '203', floor: 2, roomTypeId: deluxeType.id, status: RoomStatus.CLEANING },
    // Suites — Floor 3
    { id: 'room-301', roomNumber: '301', floor: 3, roomTypeId: suiteType.id, status: RoomStatus.AVAILABLE },
    { id: 'room-302', roomNumber: '302', floor: 3, roomTypeId: suiteType.id, status: RoomStatus.OCCUPIED },
  ];

  for (const roomData of roomsData) {
    await prisma.room.upsert({
      where: { id: roomData.id },
      update: {},
      create: {
        id: roomData.id,
        hotelId: hotel.id,
        roomTypeId: roomData.roomTypeId,
        roomNumber: roomData.roomNumber,
        floor: roomData.floor,
        status: roomData.status as RoomStatus,
      },
    });
  }
  console.log(`✅ ${roomsData.length} sample rooms created`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nSeed Credentials:');
  console.log('  Super Admin:   superadmin@hotel.com   / SuperAdmin@123');
  console.log('  Hotel Manager: manager@grandpalace.com / Manager@123');
  console.log('  Receptionist:  reception@grandpalace.com / Receptionist@123');
  console.log('  Housekeeping:  housekeeping@grandpalace.com / Housekeeping@123');
  console.log('  Guest:         guest@example.com       / Guest@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
