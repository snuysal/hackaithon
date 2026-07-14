import type { UpdateProfileRequest } from "@hackaithon/shared-types";
import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateProfileDto implements UpdateProfileRequest {
	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	name!: string;

	@IsEmail()
	@MaxLength(200)
	email!: string;

	@IsDateString()
	birthDateIso!: string;

	@IsString()
	@IsNotEmpty()
	@MaxLength(120)
	teamName!: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	addressLine?: string;

	@IsOptional()
	@IsString()
	@MaxLength(20)
	postalCode?: string;

	@IsOptional()
	@IsString()
	@MaxLength(120)
	city?: string;

	@IsOptional()
	@IsString()
	@MinLength(6)
	currentPassword?: string;

	@IsOptional()
	@IsString()
	@MinLength(6)
	newPassword?: string;
}
