import {
    ELEARNING_LEVELS,
    ELEARNING_VISIBILITIES,
    type ElearningLevel,
    type ElearningVisibility,
    type UpdateElearningRequest,
} from "@hackaithon/shared-types";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";

import { ElearningSectionInputDto } from "./elearning-section-input.dto.js";

export class UpdateElearningDto implements UpdateElearningRequest {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsIn(ELEARNING_LEVELS)
    level?: ElearningLevel;

    @IsOptional()
    @IsIn(ELEARNING_VISIBILITIES)
    visibility?: ElearningVisibility;

    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ElearningSectionInputDto)
    sections?: ElearningSectionInputDto[];
}
