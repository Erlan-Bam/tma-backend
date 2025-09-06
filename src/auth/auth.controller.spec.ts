// auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return tokens', async () => {
      const dto = {
        email: 'user@example.com',
        password: 'StrongP@ssw0rd!',
        telegramId: 975314612,
      } as any; // RegisterDto
      const serviceResult = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      };
      (authService.register as jest.Mock).mockResolvedValue(serviceResult);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      });
    });

    it('should bubble up errors from authService.register', async () => {
      const dto = { phone: '+15551234567', password: 'StrongP@ssw0rd!' } as any; // RegisterDto
      (authService.register as jest.Mock).mockRejectedValue(
        new Error('User already exists'),
      );

      await expect(controller.register(dto)).rejects.toThrow(
        'User already exists',
      );
      expect(authService.register).toHaveBeenCalledWith(dto);
    });
  });
});
