import type {
	AppRole,
	AuthUserView,
	CreateElearningRequest,
	ElearningSummary,
	ElearningView,
	EnrollmentResumeView,
	EnrollmentView,
	HistoryDetailView,
	HistorySummaryItem,
	LoginRequest,
	LoginResponse,
	ProgressUpdateRequest,
	SignupRequest,
	SignupResponse,
	UpdateElearningRequest,
	UpdateUserRoleRequest,
	UserSummary,
} from "@hackaithon/shared-types";

import type { SessionState } from "../types.js";

type ApiErrorPayload = {
	message?: string | string[];
};

const API_BASE_URL = "http://localhost:3000";
const SESSION_STORAGE_KEY = "hackaithon.session";

export function readStoredSession(): SessionState | null {
	const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);
	if (!rawValue) {
		return null;
	}

	try {
		return JSON.parse(rawValue) as SessionState;
	} catch {
		localStorage.removeItem(SESSION_STORAGE_KEY);
		return null;
	}
}

export function storeSession(session: SessionState | null): void {
	if (!session) {
		localStorage.removeItem(SESSION_STORAGE_KEY);
		return;
	}

	localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
	return callApi<SignupResponse>("/auth/signup", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
	return callApi<LoginResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function getCurrentUser(session: SessionState): Promise<AuthUserView> {
	return callApi<AuthUserView>(`/auth/me?userId=${encodeURIComponent(session.user.id)}`);
}

export async function listPublicElearnings(): Promise<ElearningSummary[]> {
	return callApi<ElearningSummary[]>("/elearnings/public");
}

export async function listManagedElearnings(session: SessionState): Promise<ElearningSummary[]> {
	return callApi<ElearningSummary[]>(`/elearnings/manage?${buildActorQuery(session)}`);
}

export async function getElearning(session: SessionState, elearningId: string): Promise<ElearningView> {
	return callApi<ElearningView>(`/elearnings/${encodeURIComponent(elearningId)}?${buildActorQuery(session)}`);
}

export async function createElearning(session: SessionState, payload: CreateElearningRequest): Promise<ElearningView> {
	return callApi<ElearningView>(`/elearnings?${buildActorQuery(session)}`, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export async function updateElearning(
	session: SessionState,
	elearningId: string,
	payload: UpdateElearningRequest
): Promise<ElearningView> {
	return callApi<ElearningView>(`/elearnings/${encodeURIComponent(elearningId)}?${buildActorQuery(session)}`, {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
}

export async function publishElearning(session: SessionState, elearningId: string): Promise<ElearningView> {
	return callApi<ElearningView>(`/elearnings/${encodeURIComponent(elearningId)}/publish?${buildActorQuery(session)}`, {
		method: "POST",
	});
}

export async function startEnrollment(session: SessionState, elearningId: string): Promise<EnrollmentView> {
	return callApi<EnrollmentView>(`/elearnings/${encodeURIComponent(elearningId)}/start?${buildActorQuery(session)}`, {
		method: "POST",
	});
}

export async function getEnrollmentResume(session: SessionState, enrollmentId: string): Promise<EnrollmentResumeView> {
	return callApi<EnrollmentResumeView>(
		`/enrollments/${encodeURIComponent(enrollmentId)}/resume?${buildActorQuery(session)}`
	);
}

export async function saveProgress(
	session: SessionState,
	enrollmentId: string,
	payload: ProgressUpdateRequest
): Promise<EnrollmentResumeView> {
	return callApi<EnrollmentResumeView>(
		`/enrollments/${encodeURIComponent(enrollmentId)}/progress?${buildActorQuery(session)}`,
		{
			method: "PATCH",
			body: JSON.stringify(payload),
		}
	);
}

export async function listHistory(session: SessionState): Promise<HistorySummaryItem[]> {
	return callApi<HistorySummaryItem[]>(`/me/history?${buildActorQuery(session)}`);
}

export async function getHistoryDetail(session: SessionState, enrollmentId: string): Promise<HistoryDetailView> {
	return callApi<HistoryDetailView>(`/me/history/${encodeURIComponent(enrollmentId)}?${buildActorQuery(session)}`);
}

export async function listPendingUsers(session: SessionState): Promise<UserSummary[]> {
	return callApi<UserSummary[]>(`/admin/users/pending?${buildAdminQuery(session.user.role)}`);
}

export async function approveUser(session: SessionState, userId: string): Promise<UserSummary> {
	return callApi<UserSummary>(
		`/admin/users/${encodeURIComponent(userId)}/approve?${buildAdminQuery(session.user.role)}`,
		{ method: "PATCH" }
	);
}

export async function rejectUser(session: SessionState, userId: string): Promise<UserSummary> {
	return callApi<UserSummary>(
		`/admin/users/${encodeURIComponent(userId)}/reject?${buildAdminQuery(session.user.role)}`,
		{ method: "PATCH" }
	);
}

export async function changeUserRole(session: SessionState, userId: string, newRole: AppRole): Promise<UserSummary> {
	const payload: UpdateUserRoleRequest = { newRole };
	return callApi<UserSummary>(`/admin/users/${encodeURIComponent(userId)}/role?${buildAdminQuery(session.user.role)}`, {
		method: "PATCH",
		body: JSON.stringify(payload),
	});
}

function buildActorQuery(session: SessionState): string {
	const params = new URLSearchParams();
	params.set("actorRole", session.user.role);
	params.set("actorUserId", session.user.id);
	return params.toString();
}

function buildAdminQuery(role: AppRole): string {
	const params = new URLSearchParams();
	params.set("actorRole", role);
	return params.toString();
}

async function callApi<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
	const headers = new Headers(init?.headers);
	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
	} catch {
		throw new Error("De Academy-server is niet bereikbaar. Controleer of de API actief is.");
	}

	if (!response.ok) {
		const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
		const message = Array.isArray(errorPayload.message)
			? errorPayload.message.join(", ")
			: (errorPayload.message ?? `De aanvraag is mislukt (${response.status}).`);
		throw new Error(message);
	}

	if (response.status === 204) {
		return undefined as TResponse;
	}

	return (await response.json()) as TResponse;
}
