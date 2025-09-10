import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Добавляем дополнительную логику если нужно
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Если есть ошибка или пользователь не найден
    if (err || !user) {
      throw err || new UnauthorizedException('Access denied');
    }
    return user;
  }
}
