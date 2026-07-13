import type { EnrollmentResumeView, EnrollmentView, PendingOpenAnswerReviewView } from "@hackaithon/shared-types";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { parseActorRole } from "../../common/role-parser.js";
import { parseRequiredUserId } from "../../common/user-id-parser.js";
import { ProgressUpdateDto } from "./dto/progress-update.dto.js";
import { ReviewOpenAnswerDto } from "./dto/review-open-answer.dto.js";
import { EnrollmentsService } from "./enrollments.service.js";

@Controller()
export class EnrollmentsController {
    public constructor(private readonly enrollmentsService: EnrollmentsService) { }

    @Post("elearnings/:id/start")
    public startEnrollment(
        @Param("id") elearningId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<EnrollmentView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.startEnrollment(elearningId, actorRole, actorUserId);
    }

    @Patch("enrollments/:id/progress")
    public updateProgress(
        @Param("id") enrollmentId: string,
        @Body() payload: ProgressUpdateDto,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<EnrollmentResumeView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.updateProgress(enrollmentId, payload, actorRole, actorUserId);
    }

    @Get("enrollments/:id/resume")
    public getResume(
        @Param("id") enrollmentId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<EnrollmentResumeView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.getResume(enrollmentId, actorRole, actorUserId);
    }

    @Post("enrollments/:id/restart")
    public restartEnrollment(
        @Param("id") enrollmentId: string,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<EnrollmentResumeView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.restartEnrollment(enrollmentId, actorRole, actorUserId);
    }

    @Get("reviews/open-answers")
    public listPendingOpenAnswerReviews(
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<PendingOpenAnswerReviewView[]> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.listPendingOpenAnswerReviews(actorRole, actorUserId);
    }

    @Patch("reviews/open-answers/:id")
    public reviewOpenAnswer(
        @Param("id") progressEntryId: string,
        @Body() payload: ReviewOpenAnswerDto,
        @Query("actorRole") actorRoleParam: unknown,
        @Query("actorUserId") actorUserIdParam: unknown
    ): Promise<EnrollmentResumeView> {
        const actorRole = parseActorRole(actorRoleParam);
        const actorUserId = parseRequiredUserId(actorUserIdParam);

        return this.enrollmentsService.reviewOpenAnswer(progressEntryId, payload, actorRole, actorUserId);
    }
}
