import { ASSIGNMENT_TYPES, type AssignmentInput, type AssignmentType } from "@hackaithon/shared-types";
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from "class-validator";

export class AssignmentInputDto implements AssignmentInput {
    @IsIn(ASSIGNMENT_TYPES)
    assignmentType!: AssignmentType;

    @IsString()
    prompt!: string;

    @ValidateIf((assignment: AssignmentInputDto) => assignment.assignmentType === "QUIZ")
    @IsString()
    @IsNotEmpty()
    optionsJson?: string;

    @ValidateIf((assignment: AssignmentInputDto) => assignment.assignmentType === "QUIZ")
    @IsString()
    @IsNotEmpty()
    correctAnswerJson?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    points?: number;

    @IsOptional()
    @IsString()
    configJson?: string;
}
