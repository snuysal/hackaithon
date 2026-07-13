import assert from "node:assert/strict";
import test from "node:test";

import { ElearningsService } from "./elearnings.service.js";

void test(
	"should be able to filter managed e-learnings for a trainer and return estimated durations",
	async (): Promise<void> => {
		let capturedWhere: unknown;
		const prisma = {
			elearning: {
				findMany: ({ where }: { where: unknown }): Promise<ManagedElearningRecord[]> => {
					capturedWhere = where;
					return Promise.resolve([
						{
							id: "course-1",
							title: "Security basics",
							description: repeatWord("intro", 220),
							level: "MEDIOR",
							audience: "PARTICIPANT",
							status: "DRAFT",
							publishedAt: null,
							sections: [
								{
									id: "section-1",
									title: "Threat model",
									content: repeatWord("content", 650),
									assignment: {
										assignmentType: "QUIZ",
										optionsJson: JSON.stringify(["A", "B", "C"]),
										prompt: repeatWord("vraag", 20),
									},
								},
							],
						},
					]);
				},
			},
		};
		const userRepository = {
			findById: (): Promise<{ id: string }> => Promise.resolve({ id: "trainer-1" }),
		};
		const service = new ElearningsService(prisma as never, userRepository as never);

		const result = await service.listManagedElearnings("TRAINER", "trainer-1");

		assert.deepEqual(capturedWhere, { createdById: "trainer-1" });
		assert.equal(result[0]?.sectionCount, 1);
		assert.ok((result[0]?.estimatedDurationMinutes ?? 0) >= 6);
	}
);

void test("should be able to block participant access to draft e-learnings by id", async (): Promise<void> => {
	const prisma = {
		elearning: {
			findUnique: (): Promise<FullElearningRecord> =>
				Promise.resolve({
					id: "course-1",
					title: "Security basics",
					description: "Beschrijving",
					level: "JUNIOR",
					audience: "PARTICIPANT",
					status: "DRAFT",
					publishedAt: null,
					createdAt: new Date("2026-07-10T10:00:00.000Z"),
					updatedAt: new Date("2026-07-10T10:00:00.000Z"),
					createdById: "trainer-1",
					sections: [
						{
							id: "section-1",
							title: "Intro",
							content: "Korte uitleg",
							orderIndex: 0,
							assignment: null,
						},
					],
				}),
		},
	};
	const userRepository = {
		findById: (userId: string): Promise<{ id: string; role: "ADMIN" | "PARTICIPANT" }> =>
			Promise.resolve({ id: userId, role: userId === "admin-1" ? "ADMIN" : "PARTICIPANT" }),
	};
	const service = new ElearningsService(prisma as never, userRepository as never);

	await assert.rejects(
		() => service.getElearningById("course-1", "PARTICIPANT", "participant-1"),
		/Draft e-learnings can only be viewed/
	);

	const adminView = await service.getElearningById("course-1", "ADMIN", "admin-1");
	assert.equal(adminView.estimatedDurationMinutes, 5);
	assert.equal(adminView.sections[0]?.estimatedDurationMinutes, 3);
});

void test("should be able to hide correct quiz answers from participants", async (): Promise<void> => {
	const prisma = {
		elearning: {
			findUnique: (): Promise<FullElearningRecord> =>
				Promise.resolve({
					id: "course-1",
					title: "Security basics",
					description: "Beschrijving",
					level: "JUNIOR",
					audience: "PARTICIPANT",
					status: "PUBLISHED",
					publishedAt: new Date("2026-07-10T10:00:00.000Z"),
					createdAt: new Date("2026-07-10T10:00:00.000Z"),
					updatedAt: new Date("2026-07-10T10:00:00.000Z"),
					createdById: "trainer-1",
					sections: [
						{
							id: "section-1",
							title: "Quiz",
							content: "Kies het juiste antwoord.",
							orderIndex: 0,
							assignment: {
								id: "assignment-1",
								assignmentType: "QUIZ",
								prompt: "Welke optie klopt?",
								optionsJson: JSON.stringify(["A", "B"]),
								correctAnswerJson: JSON.stringify("B"),
								points: 10,
								configJson: null,
							},
						},
					],
				}),
		},
	};
	const userRepository = {
		findById: (userId: string): Promise<{ id: string; role: "PARTICIPANT" }> =>
			Promise.resolve({ id: userId, role: "PARTICIPANT" }),
	};
	const service = new ElearningsService(prisma as never, userRepository as never);

	const participantView = await service.getElearningById("course-1", "PARTICIPANT", "participant-1");

	assert.equal(participantView.sections[0]?.assignment?.correctAnswerJson, null);
});

void test("should be able to return only published e-learnings for the participant audience", async (): Promise<void> => {
	let capturedWhere: unknown;
	const prisma = {
		elearning: {
			findMany: ({ where }: { where: unknown }): Promise<ManagedElearningRecord[]> => {
				capturedWhere = where;
				return Promise.resolve([]);
			},
		},
	};
	const userRepository = {
		findById: (userId: string): Promise<{ id: string; role: "PARTICIPANT" }> =>
			Promise.resolve({ id: userId, role: "PARTICIPANT" }),
	};
	const service = new ElearningsService(prisma as never, userRepository as never);

	const result = await service.listPublicElearnings("PARTICIPANT", "participant-1");

	assert.deepEqual(result, []);
	assert.deepEqual(capturedWhere, {
		status: "PUBLISHED",
		audience: {
			in: ["ALL", "PARTICIPANT"],
		},
	});
});

function repeatWord(word: string, count: number): string {
	return Array.from({ length: count }, () => word).join(" ");
}

type ManagedElearningRecord = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
	audience: "ALL" | "STAFF" | "PARTICIPANT";
	status: "DRAFT" | "PUBLISHED";
	publishedAt: Date | null;
	sections: Array<{
		id: string;
		title: string;
		content: string;
		assignment: {
			assignmentType: "QUIZ" | "OPEN_TEXT";
			optionsJson: string | null;
			prompt: string;
		} | null;
	}>;
};

type FullElearningRecord = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
	audience: "ALL" | "STAFF" | "PARTICIPANT";
	status: "DRAFT" | "PUBLISHED";
	publishedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	createdById: string;
	sections: Array<{
		id: string;
		title: string;
		content: string;
		orderIndex: number;
		assignment: {
			id: string;
			assignmentType: "QUIZ" | "OPEN_TEXT";
			prompt: string;
			optionsJson: string | null;
			correctAnswerJson: string | null;
			points: number;
			configJson: string | null;
		} | null;
	}>;
};
