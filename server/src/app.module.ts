import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './app.controller';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [AuthModule, UserModule, DatabaseModule, RedisModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
