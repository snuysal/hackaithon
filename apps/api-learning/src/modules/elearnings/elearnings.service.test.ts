import assert from "node:assert/strict";
import test from "node:test";

import { ElearningsService } from "./elearnings.service.js";

void test(
	"ElearningsService.listManagedElearnings filters trainer data and returns estimated durations",
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

void test("ElearningsService.getElearningById blocks draft access for participants", async (): Promise<void> => {
	const prisma = {
		elearning: {
			findUnique: (): Promise<FullElearningRecord> =>
				Promise.resolve({
					id: "course-1",
					title: "Security basics",
					description: "Beschrijving",
					level: "JUNIOR",
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
		findById: (): Promise<{ id: string }> => Promise.resolve({ id: "participant-1" }),
	};
	const service = new ElearningsService(prisma as never, userRepository as never);

	await assert.rejects(
		() => service.getElearningById("course-1", "PARTICIPANT", "participant-1"),
		/Draft e-learnings can only be viewed/
	);

	const adminView = await service.getElearningById("course-1", "ADMIN", "participant-1");
	assert.equal(adminView.estimatedDurationMinutes, 5);
	assert.equal(adminView.sections[0]?.estimatedDurationMinutes, 3);
});

function repeatWord(word: string, count: number): string {
	return Array.from({ length: count }, () => word).join(" ");
}

type ManagedElearningRecord = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
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
		assignment: null;
	}>;
};
