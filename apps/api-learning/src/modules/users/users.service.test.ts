import assert from "node:assert/strict";
import test from "node:test";

import { UsersService } from "./users.service.js";

void test("UsersService.listPendingUsers only allows admins and maps repository output", async (): Promise<void> => {
	const repository = createUserRepository({
		listByApprovalStatus: (status: ApprovalStatus): Promise<UserRecord[]> =>
			Promise.resolve([
				createUserRecord({
					id: "pending-1",
					name: `User with status ${status}`,
					approvalStatus: status,
				}),
			]),
	});
	const service = new UsersService(repository as never);

	await assert.rejects(() => service.listPendingUsers("TRAINER"), /Only ADMIN can execute this action/);

	const users = await service.listPendingUsers("ADMIN");
	assert.equal(repository.listByApprovalStatusCalls[0], "PENDING");
	assert.deepEqual(users, [
		{
			id: "pending-1",
			name: "User with status PENDING",
			email: "pending-1@example.com",
			teamName: "QA Guild",
			role: "PARTICIPANT",
			approvalStatus: "PENDING",
			createdAtIso: "2026-07-10T10:00:00.000Z",
		},
	]);
});

void test("UsersService approval and role mutations delegate to the repository", async (): Promise<void> => {
	const repository = createUserRepository({
		updateApprovalStatus: (userId: string, status: MutableApprovalStatus): Promise<UserRecord> =>
			Promise.resolve(createUserRecord({ id: userId, approvalStatus: status })),
		updateRole: (userId: string, role: AppRole): Promise<UserRecord> =>
			Promise.resolve(createUserRecord({ id: userId, role })),
	});
	const service = new UsersService(repository as never);

	const approvedUser = await service.approveUser("user-1", "ADMIN");
	const rejectedUser = await service.rejectUser("user-2", "ADMIN");
	const promotedUser = await service.changeRole("user-3", "ADMIN", { newRole: "TRAINER" });

	assert.deepEqual(repository.updateApprovalStatusCalls, [
		{ userId: "user-1", status: "APPROVED" },
		{ userId: "user-2", status: "REJECTED" },
	]);
	assert.deepEqual(repository.updateRoleCalls, [{ userId: "user-3", role: "TRAINER" }]);
	assert.equal(approvedUser.approvalStatus, "APPROVED");
	assert.equal(rejectedUser.approvalStatus, "REJECTED");
	assert.equal(promotedUser.role, "TRAINER");
});

function createUserRepository(overrides: Partial<UserRepositoryDouble> = {}): UserRepositoryDouble {
	const listByApprovalStatusCalls: ApprovalStatus[] = [];
	const updateApprovalStatusCalls: Array<{ userId: string; status: MutableApprovalStatus }> = [];
	const updateRoleCalls: Array<{ userId: string; role: AppRole }> = [];

	return {
		listByApprovalStatusCalls,
		updateApprovalStatusCalls,
		updateRoleCalls,
		listByApprovalStatus: (status: ApprovalStatus): Promise<UserRecord[]> => {
			listByApprovalStatusCalls.push(status);
			return overrides.listByApprovalStatus ? overrides.listByApprovalStatus(status) : Promise.resolve([]);
		},
		updateApprovalStatus: (userId: string, status: MutableApprovalStatus): Promise<UserRecord> => {
			updateApprovalStatusCalls.push({ userId, status });
			return overrides.updateApprovalStatus
				? overrides.updateApprovalStatus(userId, status)
				: Promise.reject(new Error("Unexpected call"));
		},
		updateRole: (userId: string, role: AppRole): Promise<UserRecord> => {
			updateRoleCalls.push({ userId, role });
			return overrides.updateRole ? overrides.updateRole(userId, role) : Promise.reject(new Error("Unexpected call"));
		},
	};
}

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
	return {
		id: overrides.id ?? "user-1",
		name: overrides.name ?? "Test User",
		email: overrides.email ?? `${overrides.id ?? "user-1"}@example.com`,
		teamName: overrides.teamName ?? "QA Guild",
		passwordHash: overrides.passwordHash ?? "secret1",
		birthDateIso: overrides.birthDateIso ?? "1990-01-01",
		role: overrides.role ?? "PARTICIPANT",
		approvalStatus: overrides.approvalStatus ?? "PENDING",
		createdAtIso: overrides.createdAtIso ?? "2026-07-10T10:00:00.000Z",
	};
}

type AppRole = "ADMIN" | "TRAINER" | "PARTICIPANT";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type MutableApprovalStatus = "APPROVED" | "REJECTED";

type UserRecord = {
	id: string;
	name: string;
	email: string;
	teamName: string;
	passwordHash: string;
	birthDateIso: string;
	role: AppRole;
	approvalStatus: ApprovalStatus;
	createdAtIso: string;
};

type UserRepositoryDouble = {
	listByApprovalStatusCalls: ApprovalStatus[];
	updateApprovalStatusCalls: Array<{ userId: string; status: MutableApprovalStatus }>;
	updateRoleCalls: Array<{ userId: string; role: AppRole }>;
	listByApprovalStatus: (status: ApprovalStatus) => Promise<UserRecord[]>;
	updateApprovalStatus: (userId: string, status: MutableApprovalStatus) => Promise<UserRecord>;
	updateRole: (userId: string, role: AppRole) => Promise<UserRecord>;
};
