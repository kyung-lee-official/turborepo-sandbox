import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { SignUpDto } from "../dto/signup.dto";

export class SignUp {
  id: string;

  constructor(dto: SignUpDto) {
    this.id = dto.id;
  }
}

export const signUpOperationOptions: ApiOperationOptions = {
  summary: "Sign up a new member",
  description: "Sign up a new member",
};

export const signUpBodyOptions: ApiBodyOptions = {
  type: SignUp,
  examples: {
    Bob: {
      value: {
        id: "Bob",
      },
    },
  },
};
