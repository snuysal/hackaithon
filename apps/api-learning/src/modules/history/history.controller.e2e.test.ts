import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { createHttpTestApp, messageText, readJson } from "../../testing/http-test-app.js";
import { HistoryController } from "./history.controller.js";
import { HistoryService } from "./history.service.js";

void test("should be able to validate actor context and expose the gamification summary over HTTP", async (t: TestContext): Promise<void> => {
	const calls: Array<{ actorRole: string; actorUserId: string }> = [];
	const detailCalls: string[] = [];
	const app = await createHttpTestApp({
		controllers: [HistoryController],
		providers: [
			{
				provide: HistoryService,
				useValue: {
					listMyHistory: (): Promise<unknown[]> => Promise.resolve([]),
					getMyGamificationSummary: (actorRole: string, actorUserId: string): Promise<unknown> => {
						calls.push({ actorRole, actorUserId });
						return Promise.resolve({
							totalScore: 42,
							currentStreakDays: 2,
							completedCourses: 1,
							completedSections: 3,
							badges: [],
							nextBadge: null,
						});
					},
					getHistoryDetail: (enrollmentId: string): Promise<unknown> => {
						detailCalls.push(enrollmentId);
						return Promise.resolve(null);
					},
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const invalidResponse = await fetch(`${app.baseUrl}/me/history/gamification/summary?actorRole=PARTICIPANT`);

	assert.equal(invalidResponse.status, 400);
	assert.match(messageText(await readJson(invalidResponse)), /actorUserId/i);

	const validResponse = await fetch(
		`${app.baseUrl}/me/history/gamification/summary?actorRole=PARTICIPANT&actorUserId=participant-1`
	);

	assert.equal(validResponse.status, 200);
	assert.deepEqual(calls, [{ actorRole: "PARTICIPANT", actorUserId: "participant-1" }]);
	assert.deepEqual(detailCalls, []);
	assert.deepEqual(await readJson(validResponse), {
		totalScore: 42,
		currentStreakDays: 2,
		completedCourses: 1,
		completedSections: 3,
		badges: [],
		nextBadge: null,
	});
});
