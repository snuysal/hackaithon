import type { OpenAnswerReviewRequest } from "@hackaithon/shared-types";
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class ReviewOpenAnswerDto implements OpenAnswerReviewRequest {
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(1)
    @Max(10)
    grade!: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}
