import type { ProgressUpdateRequest } from "@hackaithon/shared-types";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class ProgressUpdateDto implements ProgressUpdateRequest {
    @IsString()
    sectionId!: string;

    @IsOptional()
    @IsString()
    assignmentId?: string;

    @IsOptional()
    @IsString()
    answerText?: string;

    @IsOptional()
    @IsString()
    answerJson?: string;

    @IsOptional()
    @IsBoolean()
    isCorrect?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    score?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    timeSpentSeconds?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    position?: number;

    @IsOptional()
    @IsBoolean()
    markCompleted?: boolean;
}
