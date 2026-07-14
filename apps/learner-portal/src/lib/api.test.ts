import assert from "node:assert/strict";
import test from "node:test";

import { getElearning, getGamificationSummary, listPublicElearnings, readStoredSession, storeSession } from "./api.js";

void test("should be able to store and restore a valid session while clearing invalid session data", (): void => {
	const storage = createLocalStorage();
	installLocalStorage(storage);

	const session = {
		sessionToken: "token-1",
		user: {
			id: "user-1",
			name: "Test User",
			email: "test@example.com",
			teamName: "QA Guild",
			addressLine: null,
			postalCode: null,
			city: null,
			role: "TRAINER" as const,
			approvalStatus: "APPROVED" as const,
			birthDateIso: "1990-01-01",
			canAccessLearning: true,
		},
	};

	storeSession(session);
	assert.deepEqual(readStoredSession(), session);

	storage.setItem("hackaithon.session", "{geen-json");
	assert.equal(readStoredSession(), null);
	assert.equal(storage.getItem("hackaithon.session"), null);
});

void test("should be able to encode API path parameters and actor context correctly", async (): Promise<void> => {
	const originalFetch = globalThis.fetch;
	const calls: Array<{ input: string; init?: RequestInit }> = [];

	const fetchMock: typeof fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const requestUrl =
			typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		calls.push({ input: requestUrl, init });
		return Promise.resolve(
			new Response(
				JSON.stringify({
					id: "course-1",
					title: "Intro",
					description: "Beschrijving",
					level: "JUNIOR",
					audience: "PARTICIPANT",
					status: "DRAFT",
					publishedAtIso: null,
					createdAtIso: "2026-07-10T10:00:00.000Z",
					updatedAtIso: "2026-07-10T10:00:00.000Z",
					createdById: "trainer-1",
					estimatedDurationMinutes: 5,
					sections: [],
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			)
		);
	};

	globalThis.fetch = fetchMock;

	try {
		await getElearning(
			{
				sessionToken: "token-1",
				user: {
					id: "trainer 1",
					name: "Trainer",
					email: "trainer@example.com",
					teamName: "Academy",
					addressLine: null,
					postalCode: null,
					city: null,
					role: "TRAINER",
					approvalStatus: "APPROVED",
					birthDateIso: "1990-01-01",
					canAccessLearning: true,
				},
			},
			"course/1"
		);
	} finally {
		globalThis.fetch = originalFetch;
	}

	assert.equal(calls.length, 1);
	assert.equal(calls[0]?.input, "/api/elearnings/course%2F1?actorRole=TRAINER&actorUserId=trainer+1");

	const headers = calls[0]?.init?.headers;
	assert.ok(headers instanceof Headers);
	assert.equal(headers.get("Content-Type"), "application/json");
});

void test("should be able to request the role-specific catalog with the current actor context", async (): Promise<void> => {
	const originalFetch = globalThis.fetch;
	const calls: string[] = [];
	globalThis.fetch = (input: string | URL | Request): Promise<Response> => {
		calls.push(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
		return Promise.resolve(new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } }));
	};

	try {
		await listPublicElearnings({
			sessionToken: "token-1",
			user: {
				id: "participant-1",
				name: "Participant",
				email: "participant@example.com",
				teamName: "Academy",
				addressLine: null,
				postalCode: null,
				city: null,
				role: "PARTICIPANT",
				approvalStatus: "APPROVED",
				birthDateIso: "1990-01-01",
				canAccessLearning: true,
			},
		});
	} finally {
		globalThis.fetch = originalFetch;
	}

	assert.deepEqual(calls, [
		"/api/elearnings/public?actorRole=PARTICIPANT&actorUserId=participant-1",
	]);
});

void test("should be able to translate backend and network failures into user-friendly errors", async (): Promise<void> => {
	const originalFetch = globalThis.fetch;

	globalThis.fetch = (): Promise<Response> =>
		Promise.resolve(
			new Response(JSON.stringify({ message: ["Eerste fout", "Tweede fout"] }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			})
		);

	try {
		await assert.rejects(() => getCourse("course-1"), /Eerste fout, Tweede fout/);
	} finally {
		globalThis.fetch = originalFetch;
	}

	globalThis.fetch = (): Promise<Response> => Promise.reject(new Error("connect ECONNREFUSED"));

	try {
		await assert.rejects(() => getCourse("course-1"), /Academy-server is niet bereikbaar/);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

void test("should be able to request the gamification summary with the current actor context", async (): Promise<void> => {
	const originalFetch = globalThis.fetch;
	const calls: string[] = [];

	globalThis.fetch = (input: string | URL | Request): Promise<Response> => {
		const requestUrl =
			typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		calls.push(requestUrl);
		return Promise.resolve(
			new Response(
				JSON.stringify({
					totalScore: 12,
					currentStreakDays: 1,
					completedCourses: 0,
					completedSections: 1,
					badges: [],
					nextBadge: null,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			)
		);
	};

	try {
		await getGamificationSummary({
			sessionToken: "token-1",
			user: {
				id: "participant-1",
				name: "Participant",
				email: "participant@example.com",
				teamName: "Academy",
				addressLine: null,
				postalCode: null,
				city: null,
				role: "PARTICIPANT",
				approvalStatus: "APPROVED",
				birthDateIso: "1990-01-01",
				canAccessLearning: true,
			},
		});
	} finally {
		globalThis.fetch = originalFetch;
	}

	assert.deepEqual(calls, ["/api/me/history/gamification/summary?actorRole=PARTICIPANT&actorUserId=participant-1"]);
});

function installLocalStorage(storage: StorageDouble): void {
	Object.defineProperty(globalThis, "localStorage", {
		value: storage,
		configurable: true,
	});
}

function createLocalStorage(): StorageDouble {
	const values = new Map<string, string>();

	return {
		getItem(key: string): string | null {
			return values.has(key) ? values.get(key) ?? null : null;
		},
		setItem(key: string, value: string): void {
			values.set(key, value);
		},
		removeItem(key: string): void {
			values.delete(key);
		},
	};
}

function getCourse(elearningId: string): Promise<unknown> {
	return getElearning(
		{
			sessionToken: "token-1",
			user: {
				id: "trainer-1",
				name: "Trainer",
				email: "trainer@example.com",
				teamName: "Academy",
				addressLine: null,
				postalCode: null,
				city: null,
				role: "TRAINER",
				approvalStatus: "APPROVED",
				birthDateIso: "1990-01-01",
				canAccessLearning: true,
			},
		},
		elearningId
	);
}

type StorageDouble = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
};
