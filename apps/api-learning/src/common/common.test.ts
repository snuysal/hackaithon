import assert from "node:assert/strict";
import test from "node:test";

import { buildGamificationSummary, calculateCurrentStreakDays, meetsBadgeRule } from "./gamification.js";
import { mapUserToAuthView, mapUserToSummary } from "./user-mapper.js";
import { parseActorRole } from "./role-parser.js";
import { calculateQuizAssessment, type QuizAssessmentProgress, type QuizAssessmentQuestion } from "./quiz-assessment.js";
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
		addressLine: null,
		postalCode: null,
		city: null,
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
		addressLine: null,
		postalCode: null,
		city: null,
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

void test("should be able to require an exact quiz score of at least seventy percent", (): void => {
	const roundedUpAssessment = calculateQuizAssessment(
		createQuizQuestions(23),
		createQuizProgress(23, 16)
	);
	const passingAssessment = calculateQuizAssessment(
		createQuizQuestions(10),
		createQuizProgress(10, 7)
	);

	assert.equal(roundedUpAssessment.scorePercentage, 70);
	assert.equal(roundedUpAssessment.passed, false);
	assert.equal(passingAssessment.scorePercentage, 70);
	assert.equal(passingAssessment.passed, true);
});

void test("should be able to pause the assessment while answered open questions await review", (): void => {
	const assessment = calculateQuizAssessment([createOpenQuestion(1)], [
		{
			assignmentId: "open-assignment-1",
			answerText: "Mijn open antwoord",
			grade: null,
			isCorrect: null,
			reviewComment: null,
		},
	]);

	assert.equal(assessment.totalQuestions, 1);
	assert.equal(assessment.awaitingReview, true);
	assert.equal(assessment.pendingReviewAnswers.length, 1);
	assert.equal(assessment.passed, false);
});

void test("should be able to include reviewed open questions in the seventy percent norm", (): void => {
	const assessment = calculateQuizAssessment(
		[...createQuizQuestions(1), createOpenQuestion(1)],
		[
			...createQuizProgress(1, 1),
			{
				assignmentId: "open-assignment-1",
				answerText: "Sterk onderbouwd antwoord",
				grade: 5.4,
				isCorrect: false,
				reviewComment: "Werk je voorbeeld verder uit.",
			},
		]
	);

	assert.equal(assessment.awaitingReview, false);
	assert.equal(assessment.totalQuestions, 2);
	assert.equal(assessment.correctAnswers, 1);
	assert.equal(assessment.scorePercentage, 50);
	assert.equal(assessment.passed, false);
	assert.equal(assessment.incorrectAnswers[0]?.grade, 5.4);
});

function createQuizQuestions(count: number): QuizAssessmentQuestion[] {
	return Array.from({ length: count }, (_, index) => ({
		id: `assignment-${index + 1}`,
		assignmentType: "QUIZ",
		prompt: `Question ${index + 1}`,
		section: {
			id: `section-${index + 1}`,
			title: `Section ${index + 1}`,
			orderIndex: index,
		},
	}));
}

function createOpenQuestion(index: number): QuizAssessmentQuestion {
	return {
		id: `open-assignment-${index}`,
		assignmentType: "OPEN_TEXT",
		prompt: `Open question ${index}`,
		section: {
			id: `open-section-${index}`,
			title: `Open section ${index}`,
			orderIndex: index + 100,
		},
	};
}

function createQuizProgress(totalQuestions: number, correctAnswers: number): QuizAssessmentProgress[] {
	return Array.from({ length: totalQuestions }, (_, index) => ({
		assignmentId: `assignment-${index + 1}`,
		answerText: `Answer ${index + 1}`,
		grade: null,
		isCorrect: index < correctAnswers,
		reviewComment: null,
	}));
}
