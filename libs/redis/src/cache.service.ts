import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.cache.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    await this.cache.set(key, value, ttlSeconds * 1000);
  }

  async del(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
