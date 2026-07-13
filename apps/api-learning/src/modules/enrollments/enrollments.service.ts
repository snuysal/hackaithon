import type {
    AppRole,
    BadgeAwardView,
    EnrollmentResumeView,
    EnrollmentView,
    ProgressEntryView,
} from "@hackaithon/shared-types";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import {
    calculateCurrentStreakDays,
    mapBadgeAward,
    meetsBadgeRule,
} from "../../common/gamification.js";
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
        await this.saveProgressEntry(enrollmentId, payload);
        const totalScore = await this.calculateTotalScore(enrollmentId);
        const updatedEnrollment = await this.updateEnrollmentAfterProgress(enrollment, payload, totalScore);
        const { enrollment: enrollmentWithGamification, newlyAwardedBadges } = await this.refreshGamification(
            actorUser.id,
            updatedEnrollment,
            payload.markCompleted ?? false
        );
        const progressEntries = await this.listProgressEntries(enrollmentId);

        return {
            enrollment: mapEnrollment(enrollmentWithGamification),
            progressEntries: progressEntries.map(mapProgressEntry),
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

        return {
            enrollment: mapEnrollment(enrollment),
            progressEntries: progressEntries.map(mapProgressEntry),
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

    private async saveProgressEntry(enrollmentId: string, payload: ProgressUpdateDto): Promise<void> {
        const assignmentId = normalizeOptionalString(payload.assignmentId);
        const existingProgressEntry = await this.prisma.progressEntry.findFirst({
            where: {
                enrollmentId,
                sectionId: payload.sectionId,
                assignmentId,
            },
        });

        if (existingProgressEntry) {
            await this.prisma.progressEntry.update({
                where: {
                    id: existingProgressEntry.id,
                },
                data: {
                    answerText: payload.answerText ?? existingProgressEntry.answerText,
                    answerJson: payload.answerJson ?? existingProgressEntry.answerJson,
                    isCorrect: payload.isCorrect ?? existingProgressEntry.isCorrect,
                    score: payload.score ?? existingProgressEntry.score,
                    timeSpentSeconds: payload.timeSpentSeconds ?? existingProgressEntry.timeSpentSeconds,
                },
            });

            return;
        }

        await this.prisma.progressEntry.create({
            data: {
                enrollmentId,
                sectionId: payload.sectionId,
                assignmentId,
                answerText: payload.answerText ?? null,
                answerJson: payload.answerJson ?? null,
                isCorrect: payload.isCorrect ?? null,
                score: payload.score ?? 0,
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
        totalScore: number
    ): Promise<DbEnrollment> {
        return this.prisma.enrollment.update({
            where: {
                id: enrollment.id,
            },
            data: {
                status: payload.markCompleted ? "COMPLETED" : "IN_PROGRESS",
                completedAt: payload.markCompleted ? new Date() : enrollment.completedAt,
                startedAt: enrollment.startedAt ?? new Date(),
                lastPosition: payload.position ?? enrollment.lastPosition,
                totalScore,
                streakDays: payload.markCompleted ? Math.max(enrollment.streakDays, 1) : enrollment.streakDays,
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
