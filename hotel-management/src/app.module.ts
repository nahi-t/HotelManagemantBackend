import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // Configuration — load .env globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    RoomsModule,
    BookingsModule,
  ],
  providers: [
    // ── Global JWT auth guard (apply to ALL routes) ──
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // ── Global RBAC guard (runs after JWT guard) ──
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // ── Global response transform interceptor ──
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // ── Global exception filter ──
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
