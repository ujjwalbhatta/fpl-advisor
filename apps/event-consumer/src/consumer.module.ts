import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { PriceChangeHandler } from './handlers/price-change.handler';
import { InjuryUpdateHandler } from './handlers/injury-update.handler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
  ],
  controllers: [PriceChangeHandler, InjuryUpdateHandler],
})
export class ConsumerModule {}
