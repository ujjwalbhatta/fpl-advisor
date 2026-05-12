import { NestFactory } from "@nestjs/core";
import { SyncModule } from "./sync.module";
import { SyncScheduler } from "./scheduler/sync.scheduler";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SyncModule);

  const scheduler = app.get(SyncScheduler);
  await scheduler.syncAll();
  await scheduler.syncInjuries();

  console.log("FPL sync service running — cron jobs active");
}

bootstrap();
