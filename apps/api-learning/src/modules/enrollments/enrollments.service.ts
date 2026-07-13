import type {
    AppRole,
    BadgeAwardView,
    EnrollmentResumeView,
    EnrollmentView,
    ProgressEntryView,
    QuizAssessmentView,
} from "@hackaithon/shared-types";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
    calculateCurrentStreakDays,
    mapBadgeAward,
    meetsBadgeRule,
} from "../../common/gamification.js";
import { calculateQuizAssessment, type QuizAssessmentQuestion } from "../../common/quiz-assessment.js";
import { UserRepository } from "../users/user.repository.js";
import { PrismaService } from "../database/prisma.service.js";
import type { ProgressUpdateDto } from "./dto/progress-update.dto.js";

type DbEnrollment = {
    id: string;
    userId: string;
    elearningId: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    startedAt: Date | null;
    completedAt: Date | null;
    lastPosition: number;
    totalScore: number;
    streakDays: number;
    createdAt: Date;
    updatedAt: Date;
};

type DbProgressEntry = {
    id: string;
    sectionId: string;
    assignmentId: string | null;
    answerText: string | null;
    answerJson: string | null;
    isCorrect: boolean | null;
    score: number;
    timeSpentSeconds: number;
    updatedAt: Date;
};

type DbSectionAssignment = {
    id: string;
    assignmentType: "QUIZ" | "OPEN_TEXT";
    correctAnswerJson: string | null;
    points: number;
};

type DbBadgeDefinition = {
    id: string;
    code: string;
    title: string;
    description: string;
    ruleJson: string;
};

type DbUserBadge = {
    id: string;
    awardedAt: Date;
    badgeDefinition: {
        code: string;
        title: string;
        description: string;
    };
};

@Injectable()
export class EnrollmentsService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository
    ) { }

    public async startEnrollment(elearningId: string, actorRole: AppRole, actorUserId: string): Promise<EnrollmentView> {
        const actorUser = await this.userRepository.findById(actorUserId);
        assertRoleMatchesStoredUser(actorRole, actorUser.role);

        if (actorUser.role !== "ADMIN" && actorUser.approvalStatus !== "APPROVED") {
            throw new ForbiddenException("Your account is pending approval and cannot start e-learnings.");
        }

        const elearning = await this.prisma.elearning.findUnique({
            where: {
                id: elearningId,
            },
            select: {
                id: true,
                status: true,
                audience: true,
            },
        });

        if (!elearning) {
            throw new NotFoundException(`E-learning with id ${elearningId} was not found.`);
        }

        if (elearning.status === "DRAFT" && actorUser.role === "PARTICIPANT") {
            throw new ForbiddenException("Draft e-learnings cannot be started by participants.");
        }

        if (!isElearningAvailableForRole(elearning.audience, actorUser.role)) {
            throw new ForbiddenException("This e-learning is not available for your role.");
        }

        const existingEnrollment = await this.prisma.enrollment.findUnique({
            where: {
                userId_elearningId: {
                    userId: actorUserId,
                    elearningId,
                },
            },
        });

        if (!existingEnrollment) {
            const createdEnrollment = await this.prisma.enrollment.create({
                data: {
                    userId: actorUserId,
                    elearningId,
                    status: "IN_PROGRESS",
                    startedAt: new Date(),
                },
            });

            return mapEnrollment(createdEnrollment);
        }

        if (existingEnrollment.status === "NOT_STARTED") {
            const updatedEnrollment = await this.prisma.enrollment.update({
                where: {
                    id: existingEnrollment.id,
                },
                data: {
                    status: "IN_PROGRESS",
                    startedAt: existingEnrollment.startedAt ?? new Date(),
                },
            });

            return mapEnrollment(updatedEnrollment);
        }

        return mapEnrollment(existingEnrollment);
    }

    public async updateProgress(
        enrollmentId: string,
        payload: ProgressUpdateDto,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<EnrollmentResumeView> {
        const actorUser = await this.userRepository.findById(actorUserId);
        assertRoleMatchesStoredUser(actorRole, actorUser.role);

        const enrollment = await this.getAccessibleEnrollment(enrollmentId, actorUser.id, actorUser.role);
        await this.saveProgressEntry(enrollment, payload);
        const totalScore = await this.calculateTotalScore(enrollmentId);
        const progressEntries = await this.listProgressEntries(enrollmentId);
        const assessment = await this.buildQuizAssessment(enrollment.elearningId, progressEntries);
        const completedSuccessfully = Boolean(payload.markCompleted && assessment.passed);
        const updatedEnrollment = await this.updateEnrollmentAfterProgress(
            enrollment,
            payload,
            totalScore,
            completedSuccessfully
        );
        const { enrollment: enrollmentWithGamification, newlyAwardedBadges } = await this.refreshGamification(
            actorUser.id,
            updatedEnrollment,
            completedSuccessfully
        );

        return {
            enrollment: mapEnrollment(enrollmentWithGamification),
            progressEntries: progressEntries.map(mapProgressEntry),
            assessment,
            newlyAwardedBadges,
        };
    }

    public async getResume(
        enrollmentId: string,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<EnrollmentResumeView> {
        const actorUser = await this.userRepository.findById(actorUserId);
        assertRoleMatchesStoredUser(actorRole, actorUser.role);

        const enrollment = await this.getAccessibleEnrollment(enrollmentId, actorUser.id, actorUser.role);
        const progressEntries = await this.listProgressEntries(enrollmentId);
        const assessment = await this.buildQuizAssessment(enrollment.elearningId, progressEntries);

        return {
            enrollment: mapEnrollment(enrollment),
            progressEntries: progressEntries.map(mapProgressEntry),
            assessment,
            newlyAwardedBadges: [],
        };
    }

    private async getAccessibleEnrollment(
        enrollmentId: string,
        actorUserId: string,
        actorRole: AppRole
    ): Promise<DbEnrollment> {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                id: enrollmentId,
            },
        });

        if (!enrollment) {
            throw new NotFoundException(`Enrollment with id ${enrollmentId} was not found.`);
        }

        assertEnrollmentAccess(actorUserId, actorRole, enrollment.userId);

        return enrollment;
    }

    private async saveProgressEntry(enrollment: DbEnrollment, payload: ProgressUpdateDto): Promise<void> {
        const section = await this.prisma.elearningSection.findFirst({
            where: {
                id: payload.sectionId,
                elearningId: enrollment.elearningId,
            },
            include: {
                assignment: true,
            },
        });

        if (!section) {
            throw new BadRequestException("The section does not belong to this e-learning.");
        }

        const assignment: DbSectionAssignment | null = section.assignment;
        const suppliedAssignmentId = normalizeOptionalString(payload.assignmentId);
        const assignmentId = assignment?.id ?? null;

        if (suppliedAssignmentId && suppliedAssignmentId !== assignmentId) {
            throw new BadRequestException("The assignment does not belong to this section.");
        }

        const existingProgressEntry = await this.prisma.progressEntry.findFirst({
            where: {
                enrollmentId: enrollment.id,
                sectionId: payload.sectionId,
                assignmentId,
            },
        });
        const answerText = payload.answerText ?? existingProgressEntry?.answerText ?? null;
        const answerJson = payload.answerJson ?? existingProgressEntry?.answerJson ?? null;
        const evaluation = evaluateAssignment(assignment, answerText, answerJson);

        if (existingProgressEntry) {
            await this.prisma.progressEntry.update({
                where: {
                    id: existingProgressEntry.id,
                },
                data: {
                    answerText,
                    answerJson,
                    isCorrect: evaluation.isCorrect,
                    score: evaluation.score,
                    timeSpentSeconds: payload.timeSpentSeconds ?? existingProgressEntry.timeSpentSeconds,
                },
            });

            return;
        }

        await this.prisma.progressEntry.create({
            data: {
                enrollmentId: enrollment.id,
                sectionId: payload.sectionId,
                assignmentId,
                answerText,
                answerJson,
                isCorrect: evaluation.isCorrect,
                score: evaluation.score,
                timeSpentSeconds: payload.timeSpentSeconds ?? 0,
            },
        });
    }

    private async calculateTotalScore(enrollmentId: string): Promise<number> {
        const scoreAggregation = await this.prisma.progressEntry.aggregate({
            where: {
                enrollmentId,
            },
            _sum: {
                score: true,
            },
        });

        return scoreAggregation._sum.score ?? 0;
    }

    private updateEnrollmentAfterProgress(
        enrollment: DbEnrollment,
        payload: ProgressUpdateDto,
        totalScore: number,
        completedSuccessfully: boolean
    ): Promise<DbEnrollment> {
        return this.prisma.enrollment.update({
            where: {
                id: enrollment.id,
            },
            data: {
                status: completedSuccessfully ? "COMPLETED" : "IN_PROGRESS",
                completedAt: completedSuccessfully ? enrollment.completedAt ?? new Date() : null,
                startedAt: enrollment.startedAt ?? new Date(),
                lastPosition: payload.position ?? enrollment.lastPosition,
                totalScore,
                streakDays: completedSuccessfully ? Math.max(enrollment.streakDays, 1) : enrollment.streakDays,
            },
        });
    }

    private listProgressEntries(enrollmentId: string): Promise<DbProgressEntry[]> {
        return this.prisma.progressEntry.findMany({
            where: {
                enrollmentId,
            },
            orderBy: {
                updatedAt: "asc",
            },
        });
    }

    private async buildQuizAssessment(
        elearningId: string,
        progressEntries: DbProgressEntry[]
    ): Promise<QuizAssessmentView> {
        const questions: QuizAssessmentQuestion[] = await this.prisma.assignment.findMany({
            where: {
                assignmentType: "QUIZ",
                section: {
                    elearningId,
                },
            },
            select: {
                id: true,
                prompt: true,
                section: {
                    select: {
                        id: true,
                        title: true,
                        orderIndex: true,
                    },
                },
            },
        });

        return calculateQuizAssessment(questions, progressEntries);
    }

    private async refreshGamification(
        userId: string,
        enrollment: DbEnrollment,
        markCompleted: boolean
    ): Promise<{ enrollment: DbEnrollment; newlyAwardedBadges: BadgeAwardView[] }> {
        const [completedSections, completedEnrollments, badgeDefinitions, userBadges] = await Promise.all([
            this.prisma.progressEntry.count({
                where: {
                    enrollment: {
                        userId,
                    },
                },
            }),
            this.prisma.enrollment.findMany({
                where: {
                    userId,
                    status: "COMPLETED",
                    completedAt: {
                        not: null,
                    },
                },
                select: {
                    completedAt: true,
                },
            }),
            this.prisma.badgeDefinition.findMany({
                orderBy: {
                    createdAt: "asc",
                },
            }),
            this.prisma.userBadge.findMany({
                where: {
                    userId,
                },
                include: {
                    badgeDefinition: {
                        select: {
                            code: true,
                            title: true,
                            description: true,
                        },
                    },
                },
                orderBy: {
                    awardedAt: "desc",
                },
            }),
        ]);

        const currentStreakDays = calculateCurrentStreakDays(completedEnrollments.map(item => item.completedAt));
        const newlyAwardedBadges = await this.awardEligibleBadges(userId, badgeDefinitions, userBadges, {
            totalScore: enrollment.totalScore,
            completedSections,
            completedCourses: completedEnrollments.length,
            currentStreakDays,
        });

        if (!markCompleted || enrollment.streakDays === currentStreakDays) {
            return {
                enrollment,
                newlyAwardedBadges,
            };
        }

        const enrollmentWithStreak = await this.prisma.enrollment.update({
            where: {
                id: enrollment.id,
            },
            data: {
                streakDays: currentStreakDays,
            },
        });

        return {
            enrollment: enrollmentWithStreak,
            newlyAwardedBadges,
        };
    }

    private async awardEligibleBadges(
        userId: string,
        badgeDefinitions: DbBadgeDefinition[],
        userBadges: DbUserBadge[],
        metrics: {
            totalScore: number;
            completedSections: number;
            completedCourses: number;
            currentStreakDays: number;
        }
    ): Promise<BadgeAwardView[]> {
        const awardedDefinitionCodes = new Set(userBadges.map(badge => badge.badgeDefinition.code));
        const newlyAwardedBadges: BadgeAwardView[] = [];

        for (const badgeDefinition of badgeDefinitions) {
            if (awardedDefinitionCodes.has(badgeDefinition.code)) {
                continue;
            }

            if (!meetsBadgeRule(badgeDefinition, metrics)) {
                continue;
            }

            const awardedBadge = await this.prisma.userBadge.upsert({
                where: {
                    userId_badgeDefinitionId: {
                        userId,
                        badgeDefinitionId: badgeDefinition.id,
                    },
                },
                create: {
                    userId,
                    badgeDefinitionId: badgeDefinition.id,
                },
                update: {},
                include: {
                    badgeDefinition: {
                        select: {
                            code: true,
                            title: true,
                            description: true,
                        },
                    },
                },
            });

            awardedDefinitionCodes.add(badgeDefinition.code);
            newlyAwardedBadges.push(mapBadgeAward(awardedBadge));
        }

        return newlyAwardedBadges;
    }
}

function mapEnrollment(enrollment: DbEnrollment): EnrollmentView {
    return {
        id: enrollment.id,
        userId: enrollment.userId,
        elearningId: enrollment.elearningId,
        status: enrollment.status,
        startedAtIso: enrollment.startedAt ? enrollment.startedAt.toISOString() : null,
        completedAtIso: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
        lastPosition: enrollment.lastPosition,
        totalScore: enrollment.totalScore,
        streakDays: enrollment.streakDays,
        createdAtIso: enrollment.createdAt.toISOString(),
        updatedAtIso: enrollment.updatedAt.toISOString(),
    };
}

function mapProgressEntry(entry: DbProgressEntry): ProgressEntryView {
    return {
        id: entry.id,
        sectionId: entry.sectionId,
        assignmentId: entry.assignmentId,
        answerText: entry.answerText,
        answerJson: entry.answerJson,
        isCorrect: entry.isCorrect,
        score: entry.score,
        timeSpentSeconds: entry.timeSpentSeconds,
        updatedAtIso: entry.updatedAt.toISOString(),
    };
}

function normalizeOptionalString(value: string | undefined): string | null {
    if (!value) {
        return null;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0) {
        return null;
    }

    return normalizedValue;
}

function evaluateAssignment(
    assignment: DbSectionAssignment | null,
    answerText: string | null,
    answerJson: string | null
): { isCorrect: boolean | null; score: number } {
    if (!assignment || assignment.assignmentType === "OPEN_TEXT") {
        return { isCorrect: null, score: 0 };
    }

    const selectedAnswer = normalizeAnswer(answerText ?? parseAnswerJson(answerJson));
    const correctAnswer = normalizeAnswer(parseAnswerJson(assignment.correctAnswerJson));
    const isCorrect = Boolean(selectedAnswer && correctAnswer && selectedAnswer === correctAnswer);

    return {
        isCorrect,
        score: isCorrect ? assignment.points : 0,
    };
}

function parseAnswerJson(value: string | null): string | null {
    if (!value) {
        return null;
    }

    try {
        return extractAnswerValue(JSON.parse(value) as unknown);
    } catch {
        return value;
    }
}

function extractAnswerValue(value: unknown): string | null {
    if (typeof value === "string") {
        return value;
    }

    if (Array.isArray(value)) {
        return value.length === 1 ? extractAnswerValue(value[0]) : null;
    }

    if (typeof value !== "object" || value === null) {
        return null;
    }

    if ("value" in value) {
        return extractAnswerValue(value.value);
    }

    if ("label" in value) {
        return extractAnswerValue(value.label);
    }

    return null;
}

function normalizeAnswer(value: string | null): string | null {
    const normalizedValue = value?.trim();
    if (!normalizedValue) {
        return null;
    }

    return normalizedValue;
}

function assertRoleMatchesStoredUser(requestedRole: AppRole, storedRole: AppRole): void {
    if (requestedRole !== storedRole) {
        throw new ForbiddenException("actorRole does not match the stored role for actorUserId.");
    }
}

function assertEnrollmentAccess(actorUserId: string, actorRole: AppRole, enrollmentOwnerUserId: string): void {
    if (actorRole === "ADMIN") {
        return;
    }

    if (actorUserId !== enrollmentOwnerUserId) {
        throw new ForbiddenException("You cannot access another participant's enrollment.");
    }
}

function isElearningAvailableForRole(
    audience: "ALL" | "STAFF" | "PARTICIPANT",
    role: AppRole
): boolean {
    if (audience === "ALL") {
        return true;
    }

    return audience === "STAFF" ? role === "ADMIN" || role === "TRAINER" : role === "PARTICIPANT";
}
