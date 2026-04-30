import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CacheService } from '@app/redis';
import { PriceChangedEvent } from '@app/shared-types';

@Controller()
export class PriceChangeHandler {
  private readonly logger = new Logger(PriceChangeHandler.name);

  constructor(private readonly cache: CacheService) {}

  @EventPattern('fpl.player.price-changed')
  async handle(@Payload() data: PriceChangedEvent): Promise<void> {
    this.logger.log(
      `Price change: ${data.playerName} ${data.oldPrice} → ${data.newPrice} (${data.direction})`,
    );

    await Promise.all([
      this.cache.del('fpl:players:all'),
      this.cache.del(`fpl:player:${data.playerId}:details`),
    ]);
  }
}
