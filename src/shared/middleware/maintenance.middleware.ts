import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MaintenanceMiddleware.name);

  constructor(private maintenanceService: MaintenanceService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip maintenance check for health endpoint and admin endpoints
    // Use originalUrl to get the full path including any global prefixes
    const path = req.originalUrl || req.url || req.path;

    this.logger.debug(
      `Maintenance check - Path: ${path}, URL: ${req.url}, Original URL: ${req.originalUrl}`,
    );

    if (path.includes('/health') || path.includes('/admin')) {
      this.logger.debug(`Skipping maintenance check for: ${path}`);
      return next();
    }

    const isInMaintenance = this.maintenanceService.getMaintenanceStatus();
    this.logger.debug(`Maintenance status: ${isInMaintenance}`);

    if (isInMaintenance) {
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
