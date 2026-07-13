import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { ElearningsController } from "./elearnings.controller.js";
import { ElearningsService } from "./elearnings.service.js";
import { createHttpTestApp, messageText, readJson } from "../../testing/http-test-app.js";

void test("should be able to validate e-learning payloads and actor queries over HTTP", async (t: TestContext): Promise<void> => {
	const calls: Array<{ actorRole: string; actorUserId: string; elearningId?: string; payload?: unknown }> = [];
	const app = await createHttpTestApp({
		controllers: [ElearningsController],
		providers: [
			{
				provide: ElearningsService,
				useValue: {
					createElearning: (
						payload: unknown,
						actorRole: string,
						actorUserId: string
					): Promise<ElearningViewShape> => {
						calls.push({ actorRole, actorUserId, payload });
						return Promise.resolve(createElearningView());
					},
					getElearningById: (
						elearningId: string,
						actorRole: string,
						actorUserId: string
					): Promise<ElearningViewShape> => {
						calls.push({ elearningId, actorRole, actorUserId });
						return Promise.resolve(createElearningView());
					},
					listManagedElearnings: (): Promise<unknown[]> => Promise.resolve([]),
					listPublicElearnings: (): Promise<unknown[]> => Promise.resolve([]),
					publishElearning: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
					updateElearning: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const invalidResponse = await fetch(`${app.baseUrl}/elearnings?actorRole=TRAINER&actorUserId=trainer-1`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			title: "Intro",
			description: "Beschrijving",
			level: "JUNIOR",
			sections: [],
		}),
	});

	assert.equal(invalidResponse.status, 400);
	assert.match(messageText(await readJson(invalidResponse)), /sections/i);

	const validPayload = {
		title: "Intro",
		description: "Beschrijving",
		level: "JUNIOR",
		sections: [{ title: "Start", content: "Welkom" }],
	};
	const validResponse = await fetch(`${app.baseUrl}/elearnings?actorRole=TRAINER&actorUserId=%20trainer-1%20`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(validPayload),
	});

	assert.equal(validResponse.status, 201);
	assert.deepEqual(
		{
			actorRole: calls[0]?.actorRole,
			actorUserId: calls[0]?.actorUserId,
			payload: JSON.parse(JSON.stringify(calls[0]?.payload)),
		},
		{
		actorRole: "TRAINER",
		actorUserId: "trainer-1",
		payload: validPayload,
		}
	);

	const detailResponse = await fetch(`${app.baseUrl}/elearnings/course-1?actorRole=ADMIN&actorUserId=admin-1`);
	assert.equal(detailResponse.status, 200);
	assert.deepEqual(calls[1], {
		elearningId: "course-1",
		actorRole: "ADMIN",
		actorUserId: "admin-1",
	});
});

void test("should be able to reject missing actor roles for managed e-learning endpoints", async (t: TestContext): Promise<void> => {
	const app = await createHttpTestApp({
		controllers: [ElearningsController],
		providers: [
			{
				provide: ElearningsService,
				useValue: {
					createElearning: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
					getElearningById: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
					listManagedElearnings: (): Promise<unknown[]> => Promise.resolve([]),
					listPublicElearnings: (): Promise<unknown[]> => Promise.resolve([]),
					publishElearning: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
					updateElearning: (): Promise<ElearningViewShape> => Promise.resolve(createElearningView()),
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const response = await fetch(`${app.baseUrl}/elearnings/manage?actorUserId=trainer-1`);

	assert.equal(response.status, 400);
	assert.match(messageText(await readJson(response)), /actorRole must be one of/i);
});

function createElearningView(): ElearningViewShape {
	return {
		id: "course-1",
		title: "Intro",
		description: "Beschrijving",
		level: "JUNIOR",
		status: "DRAFT",
		publishedAtIso: null,
		createdAtIso: "2026-07-10T10:00:00.000Z",
		updatedAtIso: "2026-07-10T10:00:00.000Z",
		createdById: "trainer-1",
		estimatedDurationMinutes: 5,
		sections: [],
	};
}

type ElearningViewShape = {
	id: string;
	title: string;
	description: string;
	level: "JUNIOR" | "MEDIOR" | "SENIOR";
	status: "DRAFT" | "PUBLISHED";
	publishedAtIso: string | null;
	createdAtIso: string;
	updatedAtIso: string;
	createdById: string;
	estimatedDurationMinutes: number;
	sections: unknown[];
};
