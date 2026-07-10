import {
    ELEARNING_LEVELS,
    ELEARNING_VISIBILITIES,
    type CreateElearningRequest,
    type ElearningLevel,
    type ElearningVisibility,
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

    @IsIn(ELEARNING_VISIBILITIES)
    visibility!: ElearningVisibility;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ElearningSectionInputDto)
    sections!: ElearningSectionInputDto[];
}
