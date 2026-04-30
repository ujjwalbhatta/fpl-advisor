import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { FplBootstrapResponse, FplFixture } from './fpl-api.types';

@Injectable()
export class FplApiService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('FPL_BASE_URL');
  }

  async getBootstrap(): Promise<FplBootstrapResponse> {
    const { data } = await firstValueFrom(
      this.httpService.get<FplBootstrapResponse>(`${this.baseUrl}/bootstrap-static/`),
    );
    return data;
  }

  async getFixtures(): Promise<FplFixture[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<FplFixture[]>(`${this.baseUrl}/fixtures/`),
    );
    return data;
  }
}
