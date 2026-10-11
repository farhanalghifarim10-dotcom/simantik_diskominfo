import { describe, expect, it } from 'vitest';
import 'reflect-metadata';
import { HealthController } from './health/health.controller.js';
import { AppModule } from './app.module.js';
import { HealthModule } from './health/health.module.js';

describe('HealthController', () => {
  it('should return status ok and service name', () => {
    const controller = new HealthController();
    const result = controller.check();
    expect(result).toEqual({
      success: true,
      data: {
        status: 'ok',
        service: 'simantik-api',
      },
    });
  });

  it('should have HealthModule registered in AppModule imports', () => {
    const imports = Reflect.getMetadata('imports', AppModule);
    expect(imports).toContain(HealthModule);
  });
});

