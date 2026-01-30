import type { ApiBodyOptions, ApiOperationOptions } from "@nestjs/swagger";
import type { SignInDto } from "../dto/signin.dto";

export class SignIn {
  id: string;

  constructor(dto: SignInDto) {
    this.id = dto.id;
  }
}

export const signInOperationOptions: ApiOperationOptions = {
  summary: "Sign in",
  description: "Sign in",
};

export const signInBodyOptions: ApiBodyOptions = {
  type: SignIn,
  examples: {
    Bob: {
      value: {
        id: "Bob",
      },
    },
  },
};
