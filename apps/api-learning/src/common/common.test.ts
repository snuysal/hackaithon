import assert from "node:assert/strict";
import test from "node:test";

import { buildGamificationSummary, calculateCurrentStreakDays, meetsBadgeRule } from "./gamification.js";
import { mapUserToAuthView, mapUserToSummary } from "./user-mapper.js";
import { parseActorRole } from "./role-parser.js";
import { assertCanManageElearnings, assertSuperuser, canManageElearnings, isSuperuser } from "./superuser-policy.js";
import { parseRequiredUserId } from "./user-id-parser.js";

void test("should be able to accept supported actor roles and reject invalid values", (): void => {
	assert.equal(parseActorRole("ADMIN"), "ADMIN");
	assert.equal(parseActorRole("TRAINER"), "TRAINER");
	assert.equal(parseActorRole("PARTICIPANT"), "PARTICIPANT");
	assert.throws(() => parseActorRole("OWNER"), /actorRole must be one of/);
});

void test("should be able to trim a required user id and reject empty input", (): void => {
	assert.equal(parseRequiredUserId("  user-123  "), "user-123");
	assert.throws(() => parseRequiredUserId("   "), /actorUserId must be a non-empty string/);
	assert.throws(() => parseRequiredUserId(undefined), /actorUserId must be a non-empty string/);
});

void test("should be able to enforce the current superuser and e-learning management rules", (): void => {
	assert.equal(isSuperuser("ADMIN"), true);
	assert.equal(isSuperuser("TRAINER"), false);
	assert.equal(canManageElearnings("ADMIN"), true);
	assert.equal(canManageElearnings("TRAINER"), true);
	assert.equal(canManageElearnings("PARTICIPANT"), false);
	assert.doesNotThrow(() => assertSuperuser("ADMIN"));
	assert.throws(() => assertSuperuser("TRAINER"), /Only ADMIN can execute this action/);
	assert.doesNotThrow(() => assertCanManageElearnings("TRAINER"));
	assert.throws(() => assertCanManageElearnings("PARTICIPANT"), /Only ADMIN or TRAINER can execute this action/);
});

void test("should be able to map users to the expected frontend view models", (): void => {
	const pendingUser = {
		id: "user-1",
		name: "Test User",
		email: "test@example.com",
		teamName: "QA Guild",
		passwordHash: "secret",
		birthDateIso: "1990-01-01",
		role: "PARTICIPANT" as const,
		approvalStatus: "PENDING" as const,
		createdAtIso: "2026-07-10T10:00:00.000Z",
	};
	const approvedUser = { ...pendingUser, approvalStatus: "APPROVED" as const };

	assert.deepEqual(mapUserToAuthView(pendingUser), {
		id: "user-1",
		name: "Test User",
		email: "test@example.com",
		teamName: "QA Guild",
		role: "PARTICIPANT",
		approvalStatus: "PENDING",
		birthDateIso: "1990-01-01",
		canAccessLearning: false,
	});
	assert.equal(mapUserToAuthView(approvedUser).canAccessLearning, true);
	assert.deepEqual(mapUserToSummary(approvedUser), {
		id: "user-1",
		name: "Test User",
		email: "test@example.com",
		teamName: "QA Guild",
		role: "PARTICIPANT",
		approvalStatus: "APPROVED",
		createdAtIso: "2026-07-10T10:00:00.000Z",
	});
});

void test("should be able to calculate a live learning streak from recent completion days", (): void => {
	assert.equal(
		calculateCurrentStreakDays(
			[
				new Date("2026-07-13T09:00:00.000Z"),
				new Date("2026-07-12T09:00:00.000Z"),
				new Date("2026-07-11T09:00:00.000Z"),
			],
			new Date("2026-07-13T12:00:00.000Z")
		),
		3
	);

	assert.equal(
		calculateCurrentStreakDays(
			[
				new Date("2026-07-10T09:00:00.000Z"),
				new Date("2026-07-09T09:00:00.000Z"),
			],
			new Date("2026-07-13T12:00:00.000Z")
		),
		0
	);
});

void test("should be able to match badge rules and surface the next badge goal", (): void => {
	const badgeDefinitions = [
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
	];

	assert.equal(
		meetsBadgeRule(badgeDefinitions[0], {
			totalScore: 12,
			completedSections: 1,
			completedCourses: 0,
			currentStreakDays: 1,
		}),
		true
	);

	const summary = buildGamificationSummary({
		badgeDefinitions,
		badges: [
			{
				id: "award-1",
				awardedAt: new Date("2026-07-13T09:00:00.000Z"),
				badgeDefinition: {
					code: "STARTER",
					title: "Starter",
					description: "Rond je eerste onderdeel af.",
				},
			},
		],
		metrics: {
			totalScore: 12,
			completedSections: 1,
			completedCourses: 0,
			currentStreakDays: 2,
		},
	});

	assert.equal(summary.badges.length, 1);
	assert.deepEqual(summary.nextBadge, {
		code: "CONSISTENT",
		title: "Consistent",
		description: "Houd een 3-daagse leerstreak vol.",
		metric: "STREAK_DAYS",
		currentValue: 2,
		targetValue: 3,
		remainingValue: 1,
		progressPercent: 67,
	});
});
