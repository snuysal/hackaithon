import type { LoginRequest } from "@hackaithon/shared-types";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto implements LoginRequest {
    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;
}
