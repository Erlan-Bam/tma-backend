// auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    tmaAuth: jest.fn(),
    refreshAccessToken: jest.fn(),
    refreshAccessTokenV2: jest.fn(),
    validateTokenAndUser: jest.fn(),
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

  describe('tmaAuth', () => {
    it('should call authService.tmaAuth and return tokens', async () => {
      const dto = {
        initData:
          'query_id=AAHdF6IQAAAAAN0XohDhrOrc&user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22John%22%2C%22last_name%22%3A%22Doe%22%2C%22username%22%3A%22johndoe%22%2C%22language_code%22%3A%22en%22%7D&auth_date=1662771648&hash=c501b71e775f74ce10e377dea85a7ea24ecd640b223ea86dfe453e0eaed2e2b2',
      };
      const serviceResult = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      };
      (authService.tmaAuth as jest.Mock).mockResolvedValue(serviceResult);

      const result = await controller.tmaAuth(dto);

      expect(authService.tmaAuth).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-456',
      });
    });

    it('should bubble up errors from authService.tmaAuth', async () => {
      const dto = {
        initData: 'invalid-data',
      };
      (authService.tmaAuth as jest.Mock).mockRejectedValue(
        new Error('Invalid Telegram data'),
      );

      await expect(controller.tmaAuth(dto)).rejects.toThrow(
        'Invalid Telegram data',
      );
      expect(authService.tmaAuth).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshAccessToken and return access token', async () => {
      const token = 'refresh-token-456';
      const newAccessToken = 'new-access-token-789';
      (authService.refreshAccessToken as jest.Mock).mockResolvedValue(
        newAccessToken,
      );

      const result = await controller.refresh({ token });

      expect(authService.refreshAccessToken).toHaveBeenCalledWith(token);
      expect(result).toEqual({ access_token: newAccessToken });
    });
  });
});
