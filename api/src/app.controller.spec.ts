import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PgClientService } from './infrastructure/sql-db/pg-client.service';

describe('AppController', () => {
  let appController: AppController;
  let pgPing: jest.Mock;

  beforeEach(async () => {
    pgPing = jest.fn().mockResolvedValue(true);
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PgClientService,
          useValue: { ping: pgPing },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should report ok when database is up', async () => {
      const health = await appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.checks.database).toBe('up');
      expect(pgPing).toHaveBeenCalled();
    });

    it('should report degraded when database is down', async () => {
      pgPing.mockResolvedValueOnce(false);
      const health = await appController.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.checks.database).toBe('down');
    });
  });
});
