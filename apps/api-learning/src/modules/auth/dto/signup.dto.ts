import type { SignupRequest } from "@hackaithon/shared-types";
import { IsDateString, IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class SignupDto implements SignupRequest {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    email!: string;

    @IsDateString()
    birthDateIso!: string;

    @IsString()
    @IsNotEmpty()
    teamName!: string;

    @IsString()
    @MinLength(6)
    password!: string;
}
