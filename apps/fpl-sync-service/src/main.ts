import { NestFactory } from "@nestjs/core";
import { SyncModule } from "./sync.module";
import { SyncScheduler } from "./scheduler/sync.scheduler";

async function bootstrap() {
  const app = await NestFactory.create(SyncModule);

  const scheduler = app.get(SyncScheduler);
  await scheduler.syncAll();
  await scheduler.syncInjuries();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
