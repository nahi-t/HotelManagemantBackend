import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── CORS ──────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global Validation Pipe ────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,           // Auto-transform payloads to DTO classes
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global API Prefix ─────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Swagger / OpenAPI ─────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hotel Management System API')
    .setDescription(
      'Enterprise-grade hotel management backend with RBAC across 5 roles: ' +
        'SUPER_ADMIN, HOTEL_MANAGER, RECEPTIONIST, HOUSEKEEPING, and GUEST.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT Bearer token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Authentication', 'Register and login endpoints')
    .addTag('Rooms', 'Room inventory management and availability')
    .addTag('Bookings', 'Reservation lifecycle management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Hotel Management API Docs',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 Hotel Management System is running!`);
  console.log(`   API Base:   http://localhost:${port}/api/v1`);
  console.log(`   Swagger UI: http://localhost:${port}/api/docs\n`);
}

bootstrap();
