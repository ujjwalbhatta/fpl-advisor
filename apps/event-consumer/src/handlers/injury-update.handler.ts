import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CacheService } from '@app/redis';
import { InjuryUpdatedEvent } from '@app/shared-types';

@Controller()
export class InjuryUpdateHandler {
  private readonly logger = new Logger(InjuryUpdateHandler.name);

  constructor(private readonly cache: CacheService) {}

  @EventPattern('fpl.player.injury-updated')
  async handle(@Payload() data: InjuryUpdatedEvent): Promise<void> {
    this.logger.log(
      `Injury update: ${data.playerName} → ${data.status} (${data.chanceOfPlayingNext}% chance)`,
    );

    await Promise.all([
      this.cache.del('fpl:players:all'),
      this.cache.del(`fpl:player:${data.playerId}:details`),
    ]);
  }
}
