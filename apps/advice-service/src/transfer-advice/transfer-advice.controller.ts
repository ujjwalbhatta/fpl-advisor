import { Controller, Get, Param, Query, ParseIntPipe, BadRequestException } from "@nestjs/common";
import { TransferAdviceService } from "./transfer-advice.service";

@Controller("transfer-advice")
export class TransferAdviceController {
  constructor(private readonly transferAdviceService: TransferAdviceService) {}

  @Get(":teamId")
  async getAdvice(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query("freeTransfers", new ParseIntPipe({ optional: false })) freeTransfers: number,
  ) {
    if (freeTransfers < 1 || freeTransfers > 5) {
      throw new BadRequestException("freeTransfers must be between 1 and 5");
    }
    return this.transferAdviceService.getAdvice(teamId, freeTransfers);
  }
}
