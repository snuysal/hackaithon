import assert from "node:assert/strict";
import test from "node:test";

import { UsersService } from "./users.service.js";

void test("should be able to restrict pending-user listings to admins and map the repository output", async (): Promise<void> => {
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

void test("should be able to delegate user approval and role mutations to the repository", async (): Promise<void> => {
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

void test("should be able to list every user and safely delete a regular account", async (): Promise<void> => {
	const repository = createUserRepository({
		listAll: (): Promise<UserRecord[]> =>
			Promise.resolve([
				createUserRecord({ id: "admin-1", role: "ADMIN", email: "owner@example.com" }),
				createUserRecord({ id: "participant-1", approvalStatus: "APPROVED" }),
			]),
		findById: (userId: string): Promise<UserRecord> =>
			Promise.resolve(
				userId === "admin-1"
					? createUserRecord({ id: userId, role: "ADMIN", email: "owner@example.com" })
					: createUserRecord({ id: userId, approvalStatus: "APPROVED" })
			),
		deleteUser: (): Promise<void> => Promise.resolve(),
	});
	const service = new UsersService(repository as never);

	await assert.rejects(() => service.listUsers("TRAINER"), /Only ADMIN/);
	assert.equal((await service.listUsers("ADMIN")).length, 2);
	await assert.rejects(() => service.deleteUser("admin-1", "ADMIN", "admin-1"), /eigen beheerdersaccount/);

	await service.deleteUser("participant-1", "ADMIN", "admin-1");
	assert.deepEqual(repository.deleteUserCalls, [{ userId: "participant-1", replacementAuthorId: "admin-1" }]);
});

void test("should not be able to delete a protected default account", async (): Promise<void> => {
	const repository = createUserRepository({
		findById: (userId: string): Promise<UserRecord> =>
			Promise.resolve(
				userId === "admin-1"
					? createUserRecord({ id: userId, role: "ADMIN", email: "owner@example.com" })
					: createUserRecord({ id: userId, role: "TRAINER", email: "trainer@hackaithon.local" })
			),
	});
	const service = new UsersService(repository as never);

	await assert.rejects(
		() => service.deleteUser("trainer-1", "ADMIN", "admin-1"),
		/standaardaccount kan niet worden verwijderd/i
	);
});

function createUserRepository(overrides: Partial<UserRepositoryDouble> = {}): UserRepositoryDouble {
	const listByApprovalStatusCalls: ApprovalStatus[] = [];
	const updateApprovalStatusCalls: Array<{ userId: string; status: MutableApprovalStatus }> = [];
	const updateRoleCalls: Array<{ userId: string; role: AppRole }> = [];
	const deleteUserCalls: Array<{ userId: string; replacementAuthorId: string }> = [];

	return {
		listByApprovalStatusCalls,
		updateApprovalStatusCalls,
		updateRoleCalls,
		deleteUserCalls,
		listAll: (): Promise<UserRecord[]> => (overrides.listAll ? overrides.listAll() : Promise.resolve([])),
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
		findById: (userId: string): Promise<UserRecord> =>
			overrides.findById ? overrides.findById(userId) : Promise.reject(new Error("Unexpected call")),
		deleteUser: (userId: string, replacementAuthorId: string): Promise<void> => {
			deleteUserCalls.push({ userId, replacementAuthorId });
			return overrides.deleteUser
				? overrides.deleteUser(userId, replacementAuthorId)
				: Promise.reject(new Error("Unexpected call"));
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
	deleteUserCalls: Array<{ userId: string; replacementAuthorId: string }>;
	listAll: () => Promise<UserRecord[]>;
	listByApprovalStatus: (status: ApprovalStatus) => Promise<UserRecord[]>;
	updateApprovalStatus: (userId: string, status: MutableApprovalStatus) => Promise<UserRecord>;
	updateRole: (userId: string, role: AppRole) => Promise<UserRecord>;
	findById: (userId: string) => Promise<UserRecord>;
	deleteUser: (userId: string, replacementAuthorId: string) => Promise<void>;
};
