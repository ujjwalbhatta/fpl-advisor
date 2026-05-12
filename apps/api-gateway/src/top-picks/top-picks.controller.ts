import {
  Controller,
  Get,
  Query,
  BadRequestException,
  ParseFloatPipe,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';

const VALID_POSITIONS = ['GKP', 'DEF', 'MID', 'FWD'];

@ApiTags('top-picks')
@Controller('top-picks')
export class TopPicksController {
  private readonly adviceUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.adviceUrl = this.config.get<string>('ADVICE_SERVICE_URL', 'http://localhost:3002');
  }

  @Get()
  @ApiOperation({ summary: 'Get top-ranked players for the current gameweek' })
  @ApiQuery({ name: 'position', required: false, enum: ['GKP', 'DEF', 'MID', 'FWD'], description: 'Filter by position' })
  @ApiQuery({ name: 'budget', required: false, type: Number, description: 'Max price in millions (e.g. 9.5)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1–20, default varies by position)' })
  async getTopPicks(
    @Query('position') position?: string,
    @Query('budget', new ParseFloatPipe({ optional: true })) budget?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    if (position && !VALID_POSITIONS.includes(position.toUpperCase())) {
      throw new BadRequestException(`position must be one of: ${VALID_POSITIONS.join(', ')}`);
    }
    if (budget !== undefined && budget <= 0) {
      throw new BadRequestException('budget must be a positive number');
    }
    if (limit !== undefined && (limit < 1 || limit > 20)) {
      throw new BadRequestException('limit must be between 1 and 20');
    }

    try {
      const params: Record<string, string> = {};
      if (position) params['position'] = position.toUpperCase();
      if (budget !== undefined) params['budget'] = String(budget);
      if (limit !== undefined) params['limit'] = String(limit);

      const res = await firstValueFrom(
        this.http.get(`${this.adviceUrl}/top-picks`, { params }),
      );
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status ?? HttpStatus.BAD_GATEWAY;
      const message = err?.response?.data?.message ?? 'advice-service unavailable';
      throw new HttpException(message, status);
    }
  }
}
