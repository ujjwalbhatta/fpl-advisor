import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

@ApiTags('transfer-advice')
@Controller('transfer-advice')
export class TransferAdviceController {
  private readonly adviceUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.adviceUrl = this.config.get<string>('ADVICE_SERVICE_URL', 'http://localhost:3002');
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'Get AI-powered transfer advice for a FPL team' })
  @ApiParam({ name: 'teamId', type: Number, description: 'Your FPL team ID (find it in the URL on the FPL website)' })
  @ApiQuery({ name: 'freeTransfers', type: Number, description: 'Number of free transfers available (1–5)' })
  async getAdvice(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Query('freeTransfers', new ParseIntPipe({ optional: false })) freeTransfers: number,
  ) {
    if (freeTransfers < 1 || freeTransfers > 5) {
      throw new BadRequestException('freeTransfers must be between 1 and 5');
    }

    try {
      const res = await firstValueFrom(
        this.http.get(`${this.adviceUrl}/transfer-advice/${teamId}`, {
          params: { freeTransfers: String(freeTransfers) },
        }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const message = err?.response?.data?.message ?? 'advice-service unavailable';
      throw new HttpException(message, status);
    }
  }
}
