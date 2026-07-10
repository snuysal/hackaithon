import { ELEARNING_LEVELS, type ElearningLevel, type UpdateElearningRequest } from "@hackaithon/shared-types";
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
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ElearningSectionInputDto)
    sections?: ElearningSectionInputDto[];
}
