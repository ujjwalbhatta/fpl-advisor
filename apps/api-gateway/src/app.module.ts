import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TopPicksModule } from './top-picks/top-picks.module';
import { TransferAdviceModule } from './transfer-advice/transfer-advice.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TopPicksModule,
    TransferAdviceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
