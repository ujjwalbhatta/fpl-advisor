import {
  Controller,
  Get,
  Query,
  BadRequestException,
  ParseFloatPipe,
  ParseIntPipe,
} from "@nestjs/common";
import { TopPicksService } from "./top-picks.service";
import { PlayerResponse, TopPicksResult } from "./top-picks.dto";

const VALID_POSITIONS = ["GKP", "DEF", "MID", "FWD"];

@Controller("top-picks")
export class TopPicksController {
  constructor(private readonly topPicksService: TopPicksService) {}

  @Get()
  async getTopPicks(
    @Query("position") position?: string,
    @Query("budget", new ParseFloatPipe({ optional: true })) budget?: number,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number
  ): Promise<TopPicksResult | PlayerResponse[]> {
    if (position && !VALID_POSITIONS.includes(position.toUpperCase())) {
      throw new BadRequestException(
        `position must be one of: ${VALID_POSITIONS.join(", ")}`
      );
    }

    if (budget !== undefined && budget <= 0) {
      throw new BadRequestException("budget must be a positive number");
    }

    if (limit !== undefined && (limit < 1 || limit > 20)) {
      throw new BadRequestException("limit must be between 1 and 20");
    }

    return this.topPicksService.getTopPicks({ position, budget, limit });
  }
}
