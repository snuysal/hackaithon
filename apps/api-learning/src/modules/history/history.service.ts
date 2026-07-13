import type {
    AppRole,
    HistoryDetailView,
    HistorySummaryItem,
    ProgressEntryView,
} from "@hackaithon/shared-types";
import { estimateElearningDurationMinutes } from "@hackaithon/shared-types";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { UserRepository } from "../users/user.repository.js";
import { PrismaService } from "../database/prisma.service.js";

type DbHistoryEnrollment = {
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
    elearning: {
        id: string;
        title: string;
        description: string;
        level: "JUNIOR" | "MEDIOR" | "SENIOR";
        status: "DRAFT" | "PUBLISHED";
        publishedAt: Date | null;
        sections: Array<{
            id: string;
            title: string;
            content: string;
            assignment: {
                assignmentType: "QUIZ" | "OPEN_TEXT";
                prompt: string;
                optionsJson: string | null;
            } | null;
        }>;
    };
    progressEntries: Array<{
        id: string;
        sectionId: string;
        assignmentId: string | null;
        answerText: string | null;
        answerJson: string | null;
        isCorrect: boolean | null;
        score: number;
        timeSpentSeconds: number;
        updatedAt: Date;
    }>;
};

type DbHistorySummaryEnrollment = {
    id: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    startedAt: Date | null;
    completedAt: Date | null;
    lastPosition: number;
    totalScore: number;
    updatedAt: Date;
    elearning: {
        id: string;
        title: string;
    };
};

@Injectable()
export class HistoryService {
    public constructor(
        private readonly prisma: PrismaService,
        private readonly userRepository: UserRepository
    ) { }

    public async listMyHistory(actorRole: AppRole, actorUserId: string): Promise<HistorySummaryItem[]> {
        const actorUser = await this.userRepository.findById(actorUserId);
        assertRoleMatchesStoredUser(actorRole, actorUser.role);

        const enrollments: DbHistorySummaryEnrollment[] = await this.prisma.enrollment.findMany({
            where: {
                userId: actorUserId,
            },
            include: {
                elearning: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return enrollments.map(enrollment => ({
            enrollmentId: enrollment.id,
            elearningId: enrollment.elearning.id,
            elearningTitle: enrollment.elearning.title,
            status: enrollment.status,
            totalScore: enrollment.totalScore,
            lastPosition: enrollment.lastPosition,
            startedAtIso: enrollment.startedAt ? enrollment.startedAt.toISOString() : null,
            completedAtIso: enrollment.completedAt ? enrollment.completedAt.toISOString() : null,
            updatedAtIso: enrollment.updatedAt.toISOString(),
        }));
    }

    public async getHistoryDetail(
        enrollmentId: string,
        actorRole: AppRole,
        actorUserId: string
    ): Promise<HistoryDetailView> {
        const actorUser = await this.userRepository.findById(actorUserId);
        assertRoleMatchesStoredUser(actorRole, actorUser.role);

        const enrollment = await this.prisma.enrollment.findUnique({
            where: {
                id: enrollmentId,
            },
            include: {
                elearning: {
                    include: {
                        sections: {
                            select: {
                                id: true,
                                title: true,
                                content: true,
                                assignment: {
                                    select: {
                                        assignmentType: true,
                                        prompt: true,
                                        optionsJson: true,
                                    },
                                },
                            },
                            orderBy: {
                                orderIndex: "asc",
                            },
                        },
                    },
                },
                progressEntries: {
                    orderBy: {
                        updatedAt: "asc",
                    },
                },
            },
        });

        if (!enrollment) {
            throw new NotFoundException(`Enrollment with id ${enrollmentId} was not found.`);
        }

        if (actorUser.role !== "ADMIN" && enrollment.userId !== actorUser.id) {
            throw new ForbiddenException("You cannot access another participant's history.");
        }

        const typedEnrollment: DbHistoryEnrollment = enrollment;

        return {
            enrollment: {
                id: typedEnrollment.id,
                userId: typedEnrollment.userId,
                elearningId: typedEnrollment.elearningId,
                status: typedEnrollment.status,
                startedAtIso: typedEnrollment.startedAt ? typedEnrollment.startedAt.toISOString() : null,
                completedAtIso: typedEnrollment.completedAt ? typedEnrollment.completedAt.toISOString() : null,
                lastPosition: typedEnrollment.lastPosition,
                totalScore: typedEnrollment.totalScore,
                streakDays: typedEnrollment.streakDays,
                createdAtIso: typedEnrollment.createdAt.toISOString(),
                updatedAtIso: typedEnrollment.updatedAt.toISOString(),
            },
            elearning: {
                id: typedEnrollment.elearning.id,
                title: typedEnrollment.elearning.title,
                description: typedEnrollment.elearning.description,
                level: typedEnrollment.elearning.level,
                status: typedEnrollment.elearning.status,
                sectionCount: typedEnrollment.elearning.sections.length,
                estimatedDurationMinutes: estimateElearningDurationMinutes({
                    description: typedEnrollment.elearning.description,
                    level: typedEnrollment.elearning.level,
                    sections: typedEnrollment.elearning.sections,
                }),
                publishedAtIso: typedEnrollment.elearning.publishedAt
                    ? typedEnrollment.elearning.publishedAt.toISOString()
                    : null,
            },
            progressEntries: typedEnrollment.progressEntries.map(mapProgressEntry),
        };
    }
}

function mapProgressEntry(entry: DbHistoryEnrollment["progressEntries"][number]): ProgressEntryView {
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

function assertRoleMatchesStoredUser(requestedRole: AppRole, storedRole: AppRole): void {
    if (requestedRole !== storedRole) {
        throw new ForbiddenException("actorRole does not match the stored role for actorUserId.");
    }
}
