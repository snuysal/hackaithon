import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { createHttpTestApp, messageText, readJson } from "../../testing/http-test-app.js";

void test("should be able to validate user admin actor roles and update payloads over HTTP", async (t: TestContext): Promise<void> => {
	const calls: Array<{ userId: string; actorRole: string; payload?: unknown }> = [];
	const deleteCalls: Array<{ userId: string; actorRole: string; actorUserId: string }> = [];
	const app = await createHttpTestApp({
		controllers: [UsersController],
		providers: [
			{
				provide: UsersService,
				useValue: {
					listUsers: (): Promise<UserSummaryShape[]> => Promise.resolve([createUserSummary()]),
					listPendingUsers: (): Promise<unknown[]> => Promise.resolve([]),
					approveUser: (): Promise<UserSummaryShape> => Promise.resolve(createUserSummary()),
					rejectUser: (): Promise<UserSummaryShape> => Promise.resolve(createUserSummary()),
					changeRole: (userId: string, actorRole: string, payload: unknown): Promise<UserSummaryShape> => {
						calls.push({ userId, actorRole, payload });
						return Promise.resolve(createUserSummary({ id: userId, role: "TRAINER" }));
					},
					deleteUser: (userId: string, actorRole: string, actorUserId: string): Promise<void> => {
						deleteCalls.push({ userId, actorRole, actorUserId });
						return Promise.resolve();
					},
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const invalidPayloadResponse = await fetch(`${app.baseUrl}/admin/users/user-1/role?actorRole=ADMIN`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ newRole: "OWNER" }),
	});

	assert.equal(invalidPayloadResponse.status, 400);
	assert.match(messageText(await readJson(invalidPayloadResponse)), /newRole/i);

	const missingActorResponse = await fetch(`${app.baseUrl}/admin/users/pending`);
	assert.equal(missingActorResponse.status, 400);
	assert.match(messageText(await readJson(missingActorResponse)), /actorRole must be one of/i);

	const validResponse = await fetch(`${app.baseUrl}/admin/users/user-1/role?actorRole=ADMIN`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ newRole: "TRAINER" }),
	});

	assert.equal(validResponse.status, 200);
	assert.deepEqual(
		calls.map(call => ({
			userId: call.userId,
			actorRole: call.actorRole,
			payload: JSON.parse(JSON.stringify(call.payload)),
		})),
		[
			{
				userId: "user-1",
				actorRole: "ADMIN",
				payload: { newRole: "TRAINER" },
			},
		]
	);

	const listResponse = await fetch(`${app.baseUrl}/admin/users?actorRole=ADMIN`);
	assert.equal(listResponse.status, 200);
	assert.equal(((await readJson(listResponse)) as unknown[]).length, 1);

	const deleteResponse = await fetch(
		`${app.baseUrl}/admin/users/user-2?actorRole=ADMIN&actorUserId=admin-1`,
		{ method: "DELETE" }
	);
	assert.equal(deleteResponse.status, 204);
	assert.deepEqual(deleteCalls, [{ userId: "user-2", actorRole: "ADMIN", actorUserId: "admin-1" }]);
});

function createUserSummary(overrides: Partial<UserSummaryShape> = {}): UserSummaryShape {
	return {
		id: overrides.id ?? "user-1",
		name: overrides.name ?? "Test User",
		email: overrides.email ?? "user-1@example.com",
		teamName: overrides.teamName ?? "QA Guild",
		role: overrides.role ?? "PARTICIPANT",
		approvalStatus: overrides.approvalStatus ?? "PENDING",
		createdAtIso: overrides.createdAtIso ?? "2026-07-10T10:00:00.000Z",
	};
}

type UserSummaryShape = {
	id: string;
	name: string;
	email: string;
	teamName: string;
	role: "ADMIN" | "TRAINER" | "PARTICIPANT";
	approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
	createdAtIso: string;
};
