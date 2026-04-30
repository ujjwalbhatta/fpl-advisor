import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConsumerModule } from './consumer.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    ConsumerModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'event-consumer',
          brokers: [process.env.KAFKA_BROKERS ?? 'localhost:9092'],
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID ?? 'fpl-advisor-group',
        },
      },
    },
  );

  await app.listen();
}

bootstrap();
