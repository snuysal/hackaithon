import assert from "node:assert/strict";
import test from "node:test";

import { EnrollmentsService } from "./enrollments.service.js";

void test("should be able to award the starter badge after the first saved learning step", async (): Promise<void> => {
	const context = createEnrollmentContext({ existingCompletionDates: [] });
	const service = new EnrollmentsService(context.prisma as never, context.userRepository as never);

	const result = await service.updateProgress(
		"enrollment-1",
		{
			sectionId: "section-1",
			score: 8,
			position: 0,
		},
		"PARTICIPANT",
		"participant-1"
	);

	assert.equal(result.enrollment.totalScore, 8);
	assert.equal(result.enrollment.status, "IN_PROGRESS");
	assert.deepEqual(
		result.newlyAwardedBadges.map(badge => badge.code),
		["STARTER"]
	);
});

void test("should be able to unlock streak and completion badges when a course is finished on the third day", async (): Promise<void> => {
	const context = createEnrollmentContext({
		existingCompletionDates: [daysAgo(1), daysAgo(2)],
	});
	const service = new EnrollmentsService(context.prisma as never, context.userRepository as never);

	const result = await service.updateProgress(
		"enrollment-1",
		{
			sectionId: "section-1",
			score: 12,
			position: 1,
			markCompleted: true,
		},
		"PARTICIPANT",
		"participant-1"
	);

	assert.equal(result.enrollment.status, "COMPLETED");
	assert.equal(result.enrollment.streakDays, 3);
	assert.deepEqual(
		result.newlyAwardedBadges.map(badge => badge.code).sort(),
		["CONSISTENT", "FINISHER", "STARTER"]
	);
});

function createEnrollmentContext(input: {
	existingCompletionDates: Date[];
}): {
	prisma: PrismaDouble;
	userRepository: {
		findById: (userId: string) => Promise<{ id: string; role: "PARTICIPANT"; approvalStatus: "APPROVED" }>;
	};
} {
	const progressEntries: ProgressEntryRecord[] = [];
	const enrollment: EnrollmentRecord = {
		id: "enrollment-1",
		userId: "participant-1",
		elearningId: "course-1",
		status: "IN_PROGRESS",
		startedAt: new Date("2026-07-13T08:00:00.000Z"),
		completedAt: null,
		lastPosition: 0,
		totalScore: 0,
		streakDays: 0,
		createdAt: new Date("2026-07-13T08:00:00.000Z"),
		updatedAt: new Date("2026-07-13T08:00:00.000Z"),
	};
	const badgeDefinitions: BadgeDefinitionRecord[] = [
		{
			id: "badge-1",
			code: "STARTER",
			title: "Starter",
			description: "Rond je eerste onderdeel af.",
			ruleJson: JSON.stringify({ trigger: "section_completed", minCount: 1 }),
		},
		{
			id: "badge-2",
			code: "CONSISTENT",
			title: "Consistent",
			description: "Houd een 3-daagse leerstreak vol.",
			ruleJson: JSON.stringify({ trigger: "streak_days", minDays: 3 }),
		},
		{
			id: "badge-3",
			code: "FINISHER",
			title: "Finisher",
			description: "Voltooi je eerste e-learning.",
			ruleJson: JSON.stringify({ trigger: "course_completed", minCount: 1 }),
		},
	];
	const awardedBadges: UserBadgeRecord[] = [];

	const prisma: PrismaDouble = {
		enrollment: {
			findUnique: ({ where: { id } }: { where: { id: string } }): Promise<EnrollmentRecord | null> =>
				Promise.resolve(id === enrollment.id ? { ...enrollment } : null),
			update: ({
				where: { id },
				data,
			}: {
				where: { id: string };
				data: Partial<EnrollmentRecord>;
			}): Promise<EnrollmentRecord> => {
				assert.equal(id, enrollment.id);
				Object.assign(enrollment, data, { updatedAt: new Date() });
				return Promise.resolve({ ...enrollment });
			},
			findMany: (): Promise<Array<{ completedAt: Date | null }>> =>
				Promise.resolve(
					[
						...input.existingCompletionDates.map(completedAt => ({ completedAt })),
						...(enrollment.status === "COMPLETED" && enrollment.completedAt ? [{ completedAt: enrollment.completedAt }] : []),
					].sort((left, right) => (right.completedAt?.getTime() ?? 0) - (left.completedAt?.getTime() ?? 0))
				),
		},
		progressEntry: {
			findFirst: ({
				where,
			}: {
				where: { enrollmentId: string; sectionId: string; assignmentId: string | null };
			}): Promise<ProgressEntryRecord | null> =>
				Promise.resolve(
					progressEntries.find(
						entry =>
							entry.enrollmentId === where.enrollmentId &&
							entry.sectionId === where.sectionId &&
							entry.assignmentId === where.assignmentId
					) ?? null
				),
			create: ({
				data,
			}: {
				data: {
					enrollmentId: string;
					sectionId: string;
					assignmentId: string | null;
					answerText: string | null;
					answerJson: string | null;
					isCorrect: boolean | null;
					score: number;
					timeSpentSeconds: number;
				};
			}): Promise<void> => {
				progressEntries.push({
					id: `progress-${progressEntries.length + 1}`,
					updatedAt: new Date(),
					...data,
				});
				return Promise.resolve();
			},
			update: ({
				where,
				data,
			}: {
				where: { id: string };
				data: Partial<ProgressEntryRecord>;
			}): Promise<void> => {
				const entry = progressEntries.find(item => item.id === where.id);
				if (entry) {
					Object.assign(entry, data, { updatedAt: new Date() });
				}
				return Promise.resolve();
			},
			aggregate: (): Promise<{ _sum: { score: number | null } }> =>
				Promise.resolve({
					_sum: {
						score: progressEntries.reduce((sum, entry) => sum + entry.score, 0),
					},
				}),
			findMany: (): Promise<ProgressEntryRecord[]> =>
				Promise.resolve(
					[...progressEntries]
						.sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
						.map(entry => ({ ...entry }))
				),
			count: (): Promise<number> => Promise.resolve(progressEntries.length),
		},
		badgeDefinition: {
			findMany: (): Promise<BadgeDefinitionRecord[]> => Promise.resolve(badgeDefinitions.map(badge => ({ ...badge }))),
		},
		userBadge: {
			findMany: (): Promise<UserBadgeRecord[]> =>
				Promise.resolve(
					awardedBadges
						.sort((left, right) => right.awardedAt.getTime() - left.awardedAt.getTime())
						.map(badge => ({
							...badge,
							badgeDefinition: { ...badge.badgeDefinition },
						}))
				),
			upsert: ({
				where,
			}: {
				where: { userId_badgeDefinitionId: { userId: string; badgeDefinitionId: string } };
				create: { userId: string; badgeDefinitionId: string };
				update: Record<string, never>;
				include: {
					badgeDefinition: {
						select: {
							code: boolean;
							title: boolean;
							description: boolean;
						};
					};
				};
			}): Promise<UserBadgeRecord> => {
				const existingBadge = awardedBadges.find(
					badge =>
						badge.userId === where.userId_badgeDefinitionId.userId &&
						badge.badgeDefinitionId === where.userId_badgeDefinitionId.badgeDefinitionId
				);
				if (existingBadge) {
					return Promise.resolve(existingBadge);
				}

				const badgeDefinition = badgeDefinitions.find(
					badge => badge.id === where.userId_badgeDefinitionId.badgeDefinitionId
				);
				assert.ok(badgeDefinition);

				const createdBadge: UserBadgeRecord = {
					id: `award-${awardedBadges.length + 1}`,
					awardedAt: new Date(),
					userId: where.userId_badgeDefinitionId.userId,
					badgeDefinitionId: where.userId_badgeDefinitionId.badgeDefinitionId,
					badgeDefinition: {
						code: badgeDefinition.code,
						title: badgeDefinition.title,
						description: badgeDefinition.description,
					},
				};
				awardedBadges.push(createdBadge);
				return Promise.resolve(createdBadge);
			},
		},
	};

	return {
		prisma,
		userRepository: {
			findById: (userId: string): Promise<{ id: string; role: "PARTICIPANT"; approvalStatus: "APPROVED" }> =>
				Promise.resolve({ id: userId, role: "PARTICIPANT", approvalStatus: "APPROVED" }),
		},
	};
}

function daysAgo(days: number): Date {
	const date = new Date();
	date.setUTCHours(12, 0, 0, 0);
	date.setUTCDate(date.getUTCDate() - days);
	return date;
}

type EnrollmentRecord = {
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

type ProgressEntryRecord = {
	id: string;
	enrollmentId: string;
	sectionId: string;
	assignmentId: string | null;
	answerText: string | null;
	answerJson: string | null;
	isCorrect: boolean | null;
	score: number;
	timeSpentSeconds: number;
	updatedAt: Date;
};

type BadgeDefinitionRecord = {
	id: string;
	code: string;
	title: string;
	description: string;
	ruleJson: string;
};

type UserBadgeRecord = {
	id: string;
	awardedAt: Date;
	userId: string;
	badgeDefinitionId: string;
	badgeDefinition: {
		code: string;
		title: string;
		description: string;
	};
};

type PrismaDouble = {
	enrollment: {
		findUnique: (args: { where: { id: string } }) => Promise<EnrollmentRecord | null>;
		update: (args: {
			where: { id: string };
			data: Partial<EnrollmentRecord>;
		}) => Promise<EnrollmentRecord>;
		findMany: () => Promise<Array<{ completedAt: Date | null }>>;
	};
	progressEntry: {
		findFirst: (args: {
			where: { enrollmentId: string; sectionId: string; assignmentId: string | null };
		}) => Promise<ProgressEntryRecord | null>;
		create: (args: {
			data: {
				enrollmentId: string;
				sectionId: string;
				assignmentId: string | null;
				answerText: string | null;
				answerJson: string | null;
				isCorrect: boolean | null;
				score: number;
				timeSpentSeconds: number;
			};
		}) => Promise<void>;
		update: (args: {
			where: { id: string };
			data: Partial<ProgressEntryRecord>;
		}) => Promise<void>;
		aggregate: () => Promise<{ _sum: { score: number | null } }>;
		findMany: () => Promise<ProgressEntryRecord[]>;
		count: () => Promise<number>;
	};
	badgeDefinition: {
		findMany: () => Promise<BadgeDefinitionRecord[]>;
	};
	userBadge: {
		findMany: () => Promise<UserBadgeRecord[]>;
		upsert: (args: {
			where: { userId_badgeDefinitionId: { userId: string; badgeDefinitionId: string } };
			create: { userId: string; badgeDefinitionId: string };
			update: Record<string, never>;
			include: {
				badgeDefinition: {
					select: {
						code: boolean;
						title: boolean;
						description: boolean;
					};
				};
			};
		}) => Promise<UserBadgeRecord>;
	};
};
