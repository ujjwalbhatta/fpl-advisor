import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@app/database";
import { RedisModule } from "@app/redis";
import { AiService } from "./ai/ai.service";
import { TopPicksService } from "./top-picks/top-picks.service";
import { TopPicksController } from "./top-picks/top-picks.controller";
import { TransferAdviceService } from "./transfer-advice/transfer-advice.service";
import { TransferAdviceController } from "./transfer-advice/transfer-advice.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule,
    HttpModule,
  ],
  controllers: [TopPicksController, TransferAdviceController],
  providers: [AiService, TopPicksService, TransferAdviceService],
})
export class AdviceModule {}
