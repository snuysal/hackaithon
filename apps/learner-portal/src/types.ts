import type { AuthUserView } from "@hackaithon/shared-types";

export type SessionState = {
	sessionToken: string;
	user: AuthUserView;
};

export type AppRoute =
	| { name: "auth"; path: "/login" }
	| { name: "dashboard"; path: "/dashboard" }
	| { name: "catalog"; path: "/catalogus" }
	| { name: "course-detail"; path: string; elearningId: string }
	| { name: "learning"; path: string; elearningId: string }
	| { name: "history"; path: "/historie" }
	| { name: "manage-courses"; path: "/beheer/elearnings" }
	| { name: "manage-users"; path: "/beheer/gebruikers" }
	| { name: "not-found"; path: string };

export type FeedbackMessage = {
	type: "success" | "error" | "info";
	text: string;
};
