import type { ElearningSectionInput } from "@hackaithon/shared-types";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

import { AssignmentInputDto } from "./assignment-input.dto.js";

export class ElearningSectionInputDto implements ElearningSectionInput {
    @IsString()
    title!: string;

    @IsString()
    content!: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => AssignmentInputDto)
    assignment?: AssignmentInputDto;
}
