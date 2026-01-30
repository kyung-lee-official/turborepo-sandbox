import { Injectable } from "@nestjs/common";
import { Resend } from "resend";

@Injectable()
export class ResendService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail() {
    const { data, error } = await this.resend.emails.send({
      from: "CHITUBOX <onboarding@ts.chitubox.com>",
      to: ["ligeng@cbd-3d.com"],
      subject: "Hello World",
      html: "<strong>It works!</strong>",
    });

    if (error) {
      return console.error({ error });
    }

    console.log({ data });
    return data;
  }
}
