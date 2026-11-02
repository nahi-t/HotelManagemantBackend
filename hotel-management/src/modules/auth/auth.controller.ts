import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/register ─────────────────────────────────
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new guest account',
    description:
      'Creates a new user account with the **GUEST** role. ' +
      'Returns a signed JWT access token immediately after registration. ' +
      'Role elevation (e.g. to RECEPTIONIST or MANAGER) requires a SUPER_ADMIN action.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Account created. JWT access token returned.',
    schema: {
      example: {
        statusCode: 201,
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'clxyz123',
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'GUEST',
            phone: null,
            isActive: true,
            createdAt: '2025-12-01T10:00:00.000Z',
            updatedAt: '2025-12-01T10:00:00.000Z',
          },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: 'An account with this email already exists.',
    schema: {
      example: {
        statusCode: 409,
        error: 'Conflict',
        message: 'An account with this email already exists',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/auth/register',
      },
    },
  })
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.authService.register(dto);
  }

  // ─── POST /auth/login ────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login and receive a JWT access token',
    description:
      'Authenticate with email and password. ' +
      'Include the returned `accessToken` as a **Bearer token** in the ' +
      '`Authorization` header for all protected endpoints.',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Authentication successful. JWT access token returned.',
    schema: {
      example: {
        statusCode: 200,
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'clxyz456',
            email: 'superadmin@hotel.com',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'SUPER_ADMIN',
            phone: '+1-555-000-0001',
            isActive: true,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        },
        timestamp: '2025-12-01T10:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
    schema: {
      example: {
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid credentials',
        timestamp: '2025-12-01T10:00:00.000Z',
        path: '/api/v1/auth/login',
      },
    },
  })
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.authService.login(dto);
  }
}
