import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private maintenanceService: MaintenanceService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip maintenance check for health endpoint and admin endpoints
    if (req.path.includes('/health') || req.path.includes('/admin')) {
      return next();
    }

    if (this.maintenanceService.getMaintenanceStatus()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Service is under maintenance. Please try again later.',
          isMaintenance: true,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    next();
  }
}
