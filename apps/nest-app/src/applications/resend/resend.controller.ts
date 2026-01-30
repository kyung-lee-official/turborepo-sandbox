import { Controller, Post } from "@nestjs/common";
import { CreateEmailResponseSuccess } from "resend";
import { ResendService } from "./resend.service";

@Controller("resend")
export class ResendController {
  constructor(private readonly resendService: ResendService) {}

  @Post()
  async sendEmail(): Promise<CreateEmailResponseSuccess> {
    return await this.resendService.sendEmail();
  }
}
