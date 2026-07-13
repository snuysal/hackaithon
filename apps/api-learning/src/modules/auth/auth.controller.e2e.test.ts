import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { createHttpTestApp, messageText, readJson } from "../../testing/http-test-app.js";

void test("AuthController validates signup payloads and forwards valid requests", async (t: TestContext): Promise<void> => {
	let capturedPayload: unknown;
	const app = await createHttpTestApp({
		controllers: [AuthController],
		providers: [
			{
				provide: AuthService,
				useValue: {
					signup: (payload: unknown): Promise<AuthResponse> => {
						capturedPayload = payload;
						return Promise.resolve({
							user: {
								id: "user-1",
								name: "Test User",
								email: "test@example.com",
								teamName: "QA Guild",
								role: "PARTICIPANT",
								approvalStatus: "PENDING",
								birthDateIso: "1990-01-01",
								canAccessLearning: false,
							},
							message: "ok",
						});
					},
					login: (): Promise<unknown> => Promise.resolve({ sessionToken: "token", user: null, nextRoute: "/dashboard" }),
					me: (): Promise<unknown> => Promise.resolve(null),
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const invalidResponse = await fetch(`${app.baseUrl}/auth/signup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			name: "",
			email: "geen-email",
			birthDateIso: "morgen",
			teamName: "",
			password: "123",
		}),
	});

	assert.equal(invalidResponse.status, 400);
	assert.match(messageText(await readJson(invalidResponse)), /email/i);

	const validPayload = {
		name: "Test User",
		email: "test@example.com",
		birthDateIso: "1990-01-01",
		teamName: "QA Guild",
		password: "secret1",
	};
	const validResponse = await fetch(`${app.baseUrl}/auth/signup`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(validPayload),
	});

	assert.equal(validResponse.status, 201);
	assert.deepEqual(JSON.parse(JSON.stringify(capturedPayload)), validPayload);
});

void test("AuthController exposes the current user over HTTP", async (t: TestContext): Promise<void> => {
	const app = await createHttpTestApp({
		controllers: [AuthController],
		providers: [
			{
				provide: AuthService,
				useValue: {
					signup: (): Promise<unknown> => Promise.resolve(null),
					login: (): Promise<unknown> => Promise.resolve(null),
					me: (userId: unknown): Promise<AuthResponse["user"]> =>
						Promise.resolve({
							id: String(userId),
							name: "Trainer",
							email: "trainer@example.com",
							teamName: "Academy",
							role: "TRAINER",
							approvalStatus: "APPROVED",
							birthDateIso: "1990-01-01",
							canAccessLearning: true,
						}),
				},
			},
		],
	});
	t.after((): Promise<void> => app.close());

	const response = await fetch(`${app.baseUrl}/auth/me?userId=trainer-1`);
	const payload = (await readJson(response)) as { id: string };

	assert.equal(response.status, 200);
	assert.equal(payload.id, "trainer-1");
});

type AuthResponse = {
	user: {
		id: string;
		name: string;
		email: string;
		teamName: string;
		role: "ADMIN" | "TRAINER" | "PARTICIPANT";
		approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
		birthDateIso: string;
		canAccessLearning: boolean;
	};
	message: string;
};
