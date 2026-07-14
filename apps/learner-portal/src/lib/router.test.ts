import assert from "node:assert/strict";
import test from "node:test";

import { parseRoute } from "./router.js";

void test("should be able to resolve supported portal routes", (): void => {
	assert.deepEqual(parseRoute("/"), { name: "auth", path: "/login" });
	assert.deepEqual(parseRoute("/catalogus"), { name: "catalog", path: "/catalogus" });
	assert.deepEqual(parseRoute("/dashboard/"), { name: "dashboard", path: "/dashboard" });
	assert.deepEqual(parseRoute("/historie"), { name: "history", path: "/historie" });
	assert.deepEqual(parseRoute("/profiel"), { name: "profile", path: "/profiel" });
	assert.deepEqual(parseRoute("/beheer/elearnings"), { name: "manage-courses", path: "/beheer/elearnings" });
	assert.deepEqual(parseRoute("/beheer/gebruikers"), { name: "manage-users", path: "/beheer/gebruikers" });
});

void test("should be able to decode dynamic course and learning routes", (): void => {
	assert.deepEqual(parseRoute("/catalogus/course%201"), {
		name: "course-detail",
		path: "/catalogus/course%201",
		elearningId: "course 1",
	});
	assert.deepEqual(parseRoute("leren/course-2"), {
		name: "learning",
		path: "/leren/course-2",
		elearningId: "course-2",
	});
	assert.deepEqual(parseRoute("/onbekend"), { name: "not-found", path: "/onbekend" });
});
