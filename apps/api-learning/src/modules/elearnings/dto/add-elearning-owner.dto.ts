import type { AddElearningOwnerRequest } from "@hackaithon/shared-types";
import { IsEmail } from "class-validator";

export class AddElearningOwnerDto implements AddElearningOwnerRequest {
    @IsEmail()
    ownerEmail!: string;
}
