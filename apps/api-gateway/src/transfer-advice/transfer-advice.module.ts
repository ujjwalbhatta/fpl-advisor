import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransferAdviceController } from './transfer-advice.controller';

@Module({
  imports: [HttpModule],
  controllers: [TransferAdviceController],
})
export class TransferAdviceModule {}
