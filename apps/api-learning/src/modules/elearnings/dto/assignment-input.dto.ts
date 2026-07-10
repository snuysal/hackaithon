import { ASSIGNMENT_TYPES, type AssignmentInput, type AssignmentType } from "@hackaithon/shared-types";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class AssignmentInputDto implements AssignmentInput {
    @IsIn(ASSIGNMENT_TYPES)
    assignmentType!: AssignmentType;

    @IsString()
    prompt!: string;

    @IsOptional()
    @IsString()
    optionsJson?: string;

    @IsOptional()
    @IsString()
    correctAnswerJson?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    points?: number;

    @IsOptional()
    @IsString()
    configJson?: string;
}
