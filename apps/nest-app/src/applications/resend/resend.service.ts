import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateEmailResponseSuccess, Resend } from "resend";

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not defined");
    }
    this.resend = new Resend(apiKey);
  }

  async sendEmail(): Promise<CreateEmailResponseSuccess> {
    const { data, error } = await this.resend.emails.send({
      from: "CHITUBOX <onboarding@ts.chitubox.com>",
      to: ["ligeng@cbd-3d.com"],
      subject: "Hello World",
      html: "<strong>It works!</strong>",
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }

    return data;
  }
}
