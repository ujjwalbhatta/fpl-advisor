import { NestFactory } from '@nestjs/core';
import { AdviceModule } from './advice.module';

async function bootstrap() {
  const app = await NestFactory.create(AdviceModule);

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`Advice service running on port ${port}`);
}

bootstrap();
