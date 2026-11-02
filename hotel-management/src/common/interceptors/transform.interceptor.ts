import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const statusCode = context.switchToHttp().getResponse().statusCode ?? HttpStatus.OK;

    return next.handle().pipe(
      map((data) => ({
        statusCode,
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
