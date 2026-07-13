import assert from "node:assert/strict";
import test from "node:test";

import { HistoryService } from "./history.service.js";

void test("should be able to build a gamification summary with streak, badges and the next goal", async (): Promise<void> => {
	const prisma = {
		enrollment: {
			aggregate: (): Promise<{ _sum: { totalScore: number | null } }> =>
				Promise.resolve({ _sum: { totalScore: 48 } }),
			findMany: (): Promise<Array<{ completedAt: Date | null }>> =>
				Promise.resolve([
					{ completedAt: new Date("2026-07-13T08:00:00.000Z") },
					{ completedAt: new Date("2026-07-12T08:00:00.000Z") },
				]),
		},
		progressEntry: {
			count: (): Promise<number> => Promise.resolve(4),
		},
		userBadge: {
			findMany: (): Promise<
				Array<{
					id: string;
					awardedAt: Date;
					badgeDefinition: {
						code: string;
						title: string;
						description: string;
					};
				}>
			> =>
				Promise.resolve([
					{
						id: "award-1",
						awardedAt: new Date("2026-07-13T08:15:00.000Z"),
						badgeDefinition: {
							code: "STARTER",
							title: "Starter",
							description: "Rond je eerste onderdeel af.",
						},
					},
				]),
		},
		badgeDefinition: {
			findMany: (): Promise<
				Array<{
					id: string;
					code: string;
					title: string;
					description: string;
					ruleJson: string;
				}>
			> =>
				Promise.resolve([
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
				]),
		},
	};
	const userRepository = {
		findById: (): Promise<{ id: string; role: "PARTICIPANT" }> =>
			Promise.resolve({ id: "participant-1", role: "PARTICIPANT" }),
	};
	const service = new HistoryService(prisma as never, userRepository as never);

	const summary = await service.getMyGamificationSummary("PARTICIPANT", "participant-1");

	assert.equal(summary.totalScore, 48);
	assert.equal(summary.currentStreakDays, 2);
	assert.equal(summary.completedCourses, 2);
	assert.equal(summary.completedSections, 4);
	assert.equal(summary.badges.length, 1);
	assert.deepEqual(summary.nextBadge, {
		code: "FINISHER",
		title: "Finisher",
		description: "Voltooi je eerste e-learning.",
		metric: "COURSES",
		currentValue: 2,
		targetValue: 1,
		remainingValue: 0,
		progressPercent: 100,
	});
});
