import type { AuthUserView, LoginResponse, SignupResponse } from "@hackaithon/shared-types";
import { Body, Controller, Get, Post, Query } from "@nestjs/common";

import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { SignupDto } from "./dto/signup.dto.js";

@Controller("auth")
export class AuthController {
    public constructor(private readonly authService: AuthService) { }

    @Post("signup")
    public signup(@Body() payload: SignupDto): Promise<SignupResponse> {
        return this.authService.signup(payload);
    }

    @Post("login")
    public login(@Body() payload: LoginDto): Promise<LoginResponse> {
        return this.authService.login(payload);
    }

    @Get("me")
    public me(@Query("userId") userId: unknown): Promise<AuthUserView> {
        return this.authService.me(userId);
    }
}
