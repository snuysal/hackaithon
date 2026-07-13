import assert from "node:assert/strict";
import test from "node:test";

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
