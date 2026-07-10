import { TEAM_OPTIONS, type SignupRequest, type TeamName } from "@hackaithon/shared-types";
import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsString, MinLength } from "class-validator";

export class SignupDto implements SignupRequest {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsEmail()
    email!: string;

    @IsDateString()
    birthDateIso!: string;

    @IsIn(TEAM_OPTIONS)
    teamName!: TeamName;

    @IsString()
    @MinLength(6)
    password!: string;
}
