import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

import { createHttpTestApp, messageText, readJson } from "../../testing/http-test-app.js";
import { EnrollmentsController } from "./enrollments.controller.js";
import { EnrollmentsService } from "./enrollments.service.js";

void test("should be able to reject client-provided quiz scores and accept answers over HTTP", async (t: TestContext) => {
    const payloads: unknown[] = [];
    const app = await createHttpTestApp({
        controllers: [EnrollmentsController],
        providers: [
            {
                provide: EnrollmentsService,
                useValue: {
                    startEnrollment: (): Promise<unknown> => Promise.resolve({}),
                    getResume: (): Promise<unknown> => Promise.resolve(createResumeView()),
                    updateProgress: (_enrollmentId: string, payload: unknown): Promise<unknown> => {
                        payloads.push(payload);
                        return Promise.resolve(createResumeView());
                    },
                },
            },
        ],
    });
    t.after((): Promise<void> => app.close());

    const invalidResponse = await fetch(
        `${app.baseUrl}/enrollments/enrollment-1/progress?actorRole=PARTICIPANT&actorUserId=user-1`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sectionId: "section-1",
                assignmentId: "assignment-1",
                answerText: "Answer A",
                isCorrect: true,
                score: 100,
            }),
        }
    );

    assert.equal(invalidResponse.status, 400);
    assert.match(messageText(await readJson(invalidResponse)), /isCorrect|score/);
    assert.deepEqual(payloads, []);

    const validResponse = await fetch(
        `${app.baseUrl}/enrollments/enrollment-1/progress?actorRole=PARTICIPANT&actorUserId=user-1`,
        {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sectionId: "section-1",
                assignmentId: "assignment-1",
                answerText: "Answer A",
                markCompleted: true,
            }),
        }
    );

    assert.equal(validResponse.status, 200);
    assert.deepEqual(JSON.parse(JSON.stringify(payloads[0])), {
        sectionId: "section-1",
        assignmentId: "assignment-1",
        answerText: "Answer A",
        markCompleted: true,
    });
});

function createResumeView(): unknown {
    return {
        enrollment: {
            id: "enrollment-1",
            userId: "user-1",
            elearningId: "course-1",
            status: "IN_PROGRESS",
            startedAtIso: "2026-07-13T10:00:00.000Z",
            completedAtIso: null,
            lastPosition: 0,
            totalScore: 0,
            streakDays: 0,
            createdAtIso: "2026-07-13T10:00:00.000Z",
            updatedAtIso: "2026-07-13T10:00:00.000Z",
        },
        progressEntries: [],
        assessment: {
            totalQuestions: 1,
            correctAnswers: 0,
            incorrectAnswers: [],
            scorePercentage: 0,
            requiredPercentage: 70,
            passed: false,
        },
        newlyAwardedBadges: [],
    };
}
