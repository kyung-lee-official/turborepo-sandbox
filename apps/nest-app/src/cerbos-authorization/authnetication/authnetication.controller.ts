import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	UsePipes,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuthneticationService } from "./authnetication.service";
import { type SignInDto, signInSchema } from "./dto/signin.dto";
import { type SignUpDto, signUpSchema } from "./dto/signup.dto";
import { SignInPipe } from "./pipes/signin.pipe";
import { SignUpPipe } from "./pipes/signup.pipe";
import {
	signInBodyOptions,
	signInOperationOptions,
} from "./swagger/signin.swagger";
import {
	signUpBodyOptions,
	signUpOperationOptions,
} from "./swagger/signup.swagger";

@Controller("authnetication")
export class AuthneticationController {
	constructor(
		private readonly authneticationService: AuthneticationService
	) {}

	@ApiTags("Authentication")
	@ApiOperation(signUpOperationOptions)
	@ApiBody(signUpBodyOptions)
	@UsePipes(new SignUpPipe(signUpSchema))
	@Post("sign-up")
	async signUp(@Body() signUpDto: SignUpDto) {
		return await this.authneticationService.signUp(signUpDto);
	}

	@ApiTags("Authentication")
	@ApiOperation(signInOperationOptions)
	@ApiBody(signInBodyOptions)
	@UsePipes(new SignInPipe(signInSchema))
	@Post("sign-in")
	signIn(@Body() signInDto: SignInDto) {
		return this.authneticationService.signIn(signInDto);
	}
}
