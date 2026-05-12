import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TopPicksController } from './top-picks.controller';

@Module({
  imports: [HttpModule],
  controllers: [TopPicksController],
})
export class TopPicksModule {}
