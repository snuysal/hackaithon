import {
    ELEARNING_AUDIENCES,
    ELEARNING_LEVELS,
    type CreateElearningRequest,
    type ElearningAudience,
    type ElearningLevel,
} from "@hackaithon/shared-types";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsString, ValidateNested } from "class-validator";

import { ElearningSectionInputDto } from "./elearning-section-input.dto.js";

export class CreateElearningDto implements CreateElearningRequest {
    @IsString()
    title!: string;

    @IsString()
    description!: string;

    @IsIn(ELEARNING_LEVELS)
    level!: ElearningLevel;

    @IsIn(ELEARNING_AUDIENCES)
    audience!: ElearningAudience;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ElearningSectionInputDto)
    sections!: ElearningSectionInputDto[];
}
