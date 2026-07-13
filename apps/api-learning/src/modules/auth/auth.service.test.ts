import assert from "node:assert/strict";
import test from "node:test";

import { AuthService } from "./auth.service.js";

void test("should be able to normalize e-mail addresses and create participants during signup", async (): Promise<void> => {
	const repository = createUserRepository({
		findByEmail: (): Promise<UserRecord | null> => Promise.resolve(null),
		createParticipant: (input: CreateParticipantInput): Promise<UserRecord> =>
			Promise.resolve({
				id: "user-1",
				name: input.name,
				email: input.email,
				teamName: input.teamName,
				passwordHash: input.password,
				birthDateIso: input.birthDateIso,
				role: "PARTICIPANT",
				approvalStatus: "PENDING",
				createdAtIso: "2026-07-10T10:00:00.000Z",
			}),
	});
	const service = new AuthService(repository as never);

	const response = await service.signup({
		name: "Test User",
		email: " Test@Example.com ",
		birthDateIso: "1990-01-01",
		teamName: "QA Guild",
		password: "secret1",
	});

	assert.equal(response.user.email, "test@example.com");
	assert.equal(response.user.canAccessLearning, false);
	assert.equal(response.message, "Account created. Your account must be approved by an admin.");
	assert.equal(repository.findByEmailCalls[0], "test@example.com");
	assert.equal(repository.createParticipantCalls[0]?.email, "test@example.com");
});

void test("should be able to reject duplicate e-mail addresses during signup", async (): Promise<void> => {
	const repository = createUserRepository({
		findByEmail: (): Promise<UserRecord> =>
			Promise.resolve({
				id: "existing",
				name: "Existing User",
				email: "existing@example.com",
				teamName: "Ops",
				passwordHash: "secret1",
				birthDateIso: "1990-01-01",
				role: "PARTICIPANT",
				approvalStatus: "PENDING",
				createdAtIso: "2026-07-10T10:00:00.000Z",
			}),
	});
	const service = new AuthService(repository as never);

	await assert.rejects(
		() =>
			service.signup({
				name: "Test User",
				email: "existing@example.com",
				birthDateIso: "1990-01-01",
				teamName: "QA Guild",
				password: "secret1",
			}),
		/already exists/i
	);
});

void test("should be able to return the correct next route for approved and pending users during login", async (): Promise<void> => {
	const approvedUser: UserRecord = {
		id: "approved-1",
		name: "Approved User",
		email: "approved@example.com",
		teamName: "QA Guild",
		passwordHash: "secret1",
		birthDateIso: "1990-01-01",
		role: "PARTICIPANT",
		approvalStatus: "APPROVED",
		createdAtIso: "2026-07-10T10:00:00.000Z",
	};
	const repository = createUserRepository({
		findByEmail: (email: string): Promise<UserRecord | null> =>
			Promise.resolve(email === "approved@example.com" ? approvedUser : null),
	});
	const service = new AuthService(repository as never);

	const response = await service.login({
		email: "APPROVED@example.com",
		password: "secret1",
	});

	assert.equal(response.user.id, "approved-1");
	assert.equal(response.nextRoute, "/dashboard");
	assert.ok(response.sessionToken.length > 10);
	await assert.rejects(
		() =>
			service.login({
				email: "approved@example.com",
				password: "wrong-password",
			}),
		/Invalid e-mail or password/
	);
});

void test("should be able to validate the me input and map the stored user response", async (): Promise<void> => {
	const repository = createUserRepository({
		findById: (userId: string): Promise<UserRecord> =>
			Promise.resolve({
				id: userId,
				name: "Trainer",
				email: "trainer@example.com",
				teamName: "Academy",
				passwordHash: "secret1",
				birthDateIso: "1990-01-01",
				role: "TRAINER",
				approvalStatus: "APPROVED",
				createdAtIso: "2026-07-10T10:00:00.000Z",
			}),
	});
	const service = new AuthService(repository as never);

	await assert.rejects(() => service.me("   "), /userId query parameter is required/);

	const response = await service.me("trainer-1");
	assert.equal(response.id, "trainer-1");
	assert.equal(response.canAccessLearning, true);
});

function createUserRepository(overrides: Partial<UserRepositoryDouble> = {}): UserRepositoryDouble {
	const createParticipantCalls: CreateParticipantInput[] = [];
	const findByEmailCalls: string[] = [];
	const findByIdCalls: string[] = [];

	return {
		createParticipantCalls,
		findByEmailCalls,
		findByIdCalls,
		createParticipant: (input: CreateParticipantInput): Promise<UserRecord> => {
			createParticipantCalls.push(input);
			return overrides.createParticipant ? overrides.createParticipant(input) : Promise.reject(new Error("Unexpected call"));
		},
		findByEmail: (email: string): Promise<UserRecord | null> => {
			findByEmailCalls.push(email);
			return overrides.findByEmail ? overrides.findByEmail(email) : Promise.resolve(null);
		},
		findById: (userId: string): Promise<UserRecord> => {
			findByIdCalls.push(userId);
			return overrides.findById ? overrides.findById(userId) : Promise.reject(new Error("Unexpected call"));
		},
	};
}

type UserRecord = {
	id: string;
	name: string;
	email: string;
	teamName: string;
	passwordHash: string;
	birthDateIso: string;
	role: "ADMIN" | "TRAINER" | "PARTICIPANT";
	approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
	createdAtIso: string;
};

type CreateParticipantInput = {
	name: string;
	email: string;
	teamName: string;
	birthDateIso: string;
	password: string;
};

type UserRepositoryDouble = {
	createParticipantCalls: CreateParticipantInput[];
	findByEmailCalls: string[];
	findByIdCalls: string[];
	createParticipant: (input: CreateParticipantInput) => Promise<UserRecord>;
	findByEmail: (email: string) => Promise<UserRecord | null>;
	findById: (userId: string) => Promise<UserRecord>;
};
