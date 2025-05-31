import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get Hello World', description: 'Returns a Hello World string.' })
  getHello(): string {
    return this.appService.getHello();
  }
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return { status: 'ok', date: new Date().toISOString() };
  }
}
