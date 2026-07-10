import type {
	AppRole,
	ApprovalStatus,
	AuthUserView,
	CreateElearningRequest,
	ElearningAuditLogView,
	ElearningLevel,
	ElearningSummary,
	ElearningVisibility,
	ElearningView,
	EnrollmentResumeView,
	HistoryDetailView,
	HistorySummaryItem,
	LoginResponse,
	ManagedElearningView,
	SignupResponse,
	TeamName,
	UpdateUserRoleRequest,
	UserSummary,
} from "@hackaithon/shared-types";
import { APP_ROLES, ELEARNING_LEVELS, ELEARNING_VISIBILITIES, TEAM_OPTIONS } from "@hackaithon/shared-types";
import { useEffect, useMemo, useState, type CSSProperties, type ReactElement, type SyntheticEvent } from "react";
import { createRoot } from "react-dom/client";

type SessionState = {
	sessionToken: string;
	user: AuthUserView;
};

type LoginFormState = {
	email: string;
	password: string;
};

type SignupFormState = {
	name: string;
	email: string;
	birthDateIso: string;
	teamName: TeamName;
	password: string;
};

type ElearningFormState = {
	title: string;
	description: string;
	level: ElearningLevel;
	visibility: ElearningVisibility;
	sectionTitle: string;
	sectionContent: string;
	assignmentPrompt: string;
	assignmentType: "QUIZ" | "OPEN_TEXT";
	assignmentOptionsJson: string;
	assignmentCorrectAnswerJson: string;
	assignmentPoints: number;
};

type ProgressFormState = {
	enrollmentId: string;
	sectionId: string;
	assignmentId: string;
	answerText: string;
	answerJson: string;
	score: number;
	position: number;
	markCompleted: boolean;
};

type ManageElearningFormState = {
	id: string;
	title: string;
	description: string;
	level: ElearningLevel;
	visibility: ElearningVisibility;
	ownerEmail: string;
};

type ApiErrorPayload = {
	message?: string | string[];
};

type AuthModalView = "login" | "signup" | null;

const API_BASE_URL = "http://localhost:3000";
const SESSION_STORAGE_KEY = "hackaithon.session";

const defaultLoginForm: LoginFormState = {
	email: "",
	password: "",
};

const defaultSignupForm: SignupFormState = {
	name: "",
	email: "",
	birthDateIso: "2000-01-01",
	teamName: "TAX",
	password: "",
};

const defaultElearningForm: ElearningFormState = {
	title: "",
	description: "",
	level: "JUNIOR",
	visibility: "PUBLIC",
	sectionTitle: "Intro",
	sectionContent: "Leg hier de opdracht of lesinhoud vast.",
	assignmentPrompt: "Wat heb je geleerd?",
	assignmentType: "OPEN_TEXT",
	assignmentOptionsJson: "",
	assignmentCorrectAnswerJson: "",
	assignmentPoints: 10,
};

const defaultProgressForm: ProgressFormState = {
	enrollmentId: "",
	sectionId: "",
	assignmentId: "",
	answerText: "",
	answerJson: "",
	score: 0,
	position: 0,
	markCompleted: false,
};

const defaultManageElearningForm: ManageElearningFormState = {
	id: "",
	title: "",
	description: "",
	level: "JUNIOR",
	visibility: "PUBLIC",
	ownerEmail: "",
};

function readStoredSession(): SessionState | null {
	const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);

	if (!rawValue) {
		return null;
	}

	try {
		const parsedValue = JSON.parse(rawValue) as SessionState;
		return parsedValue;
	} catch {
		return null;
	}
}

function storeSession(session: SessionState | null): void {
	if (!session) {
		localStorage.removeItem(SESSION_STORAGE_KEY);
		return;
	}

	localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function buildActorQuery(session: SessionState): string {
	const params = new URLSearchParams();
	params.set("actorRole", session.user.role);
	params.set("actorUserId", session.user.id);
	return params.toString();
}

function buildAdminQuery(session: SessionState): string {
	const params = new URLSearchParams();
	params.set("actorRole", session.user.role);
	return params.toString();
}

async function callApi<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
	const headers = new Headers(init?.headers);

	if (!headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	const response = await fetch(`${API_BASE_URL}${path}`, {
		...init,
		headers,
	});

	if (!response.ok) {
		const errorPayload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
		const message = Array.isArray(errorPayload.message)
			? errorPayload.message.join(", ")
			: (errorPayload.message ?? `Request failed with status ${response.status}`);
		throw new Error(message);
	}

	if (response.status === 204) {
		return undefined as TResponse;
	}

	return (await response.json()) as TResponse;
}

function getApprovalLabel(status: ApprovalStatus): string {
	if (status === "APPROVED") {
		return "Approved";
	}

	if (status === "REJECTED") {
		return "Rejected";
	}

	return "Pending";
}

function isContentManager(role: AppRole): boolean {
	return role === "ADMIN" || role === "TRAINER";
}

// oxlint-disable-next-line eslint/complexity
function App(): ReactElement {
	const [session, setSession] = useState<SessionState | null>(() => readStoredSession());
	const [message, setMessage] = useState<string>("");
	const [error, setError] = useState<string>("");
	const [isBusy, setIsBusy] = useState<boolean>(false);
	const [authModalView, setAuthModalView] = useState<AuthModalView>(null);

	const [loginForm, setLoginForm] = useState<LoginFormState>(defaultLoginForm);
	const [signupForm, setSignupForm] = useState<SignupFormState>(defaultSignupForm);
	const [elearningForm, setElearningForm] = useState<ElearningFormState>(defaultElearningForm);
	const [progressForm, setProgressForm] = useState<ProgressFormState>(defaultProgressForm);

	const [publicElearnings, setPublicElearnings] = useState<ElearningSummary[]>([]);
	const [selectedElearning, setSelectedElearning] = useState<ElearningView | null>(null);
	const [createdElearning, setCreatedElearning] = useState<ElearningView | null>(null);
	const [activeEnrollment, setActiveEnrollment] = useState<EnrollmentResumeView | null>(null);
	const [historyItems, setHistoryItems] = useState<HistorySummaryItem[]>([]);
	const [historyDetail, setHistoryDetail] = useState<HistoryDetailView | null>(null);
	const [pendingUsers, setPendingUsers] = useState<UserSummary[]>([]);
	const [manageableElearnings, setManageableElearnings] = useState<ManagedElearningView[]>([]);
	const [manageElearningForm, setManageElearningForm] = useState<ManageElearningFormState>(defaultManageElearningForm);

	const isApprovedUser = useMemo<boolean>(() => {
		if (!session) {
			return false;
		}

		if (session.user.role === "ADMIN") {
			return true;
		}

		return session.user.approvalStatus === "APPROVED";
	}, [session]);

	function clearStatus(): void {
		setMessage("");
		setError("");
	}

	useEffect(() => {
		void loadPublicElearnings(true);
	}, []);

	async function handleSignup(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		clearStatus();
		setIsBusy(true);

		try {
			const payload = {
				name: signupForm.name,
				email: signupForm.email,
				birthDateIso: signupForm.birthDateIso,
				teamName: signupForm.teamName,
				password: signupForm.password,
			};
			const response = await callApi<SignupResponse>("/auth/signup", {
				method: "POST",
				body: JSON.stringify(payload),
			});

			setMessage(`${response.message} Je kunt nu inloggen.`);
			setSignupForm(defaultSignupForm);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function handleLogin(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		clearStatus();
		setIsBusy(true);

		try {
			const response = await callApi<LoginResponse>("/auth/login", {
				method: "POST",
				body: JSON.stringify(loginForm),
			});

			const newSession: SessionState = {
				sessionToken: response.sessionToken,
				user: response.user,
			};

			storeSession(newSession);
			setSession(newSession);
			setAuthModalView(null);
			setLoginForm(defaultLoginForm);
			setMessage(`Ingelogd als ${response.user.name}.`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	function handleLogout(): void {
		storeSession(null);
		setSession(null);
		setSelectedElearning(null);
		setCreatedElearning(null);
		setActiveEnrollment(null);
		setHistoryItems([]);
		setHistoryDetail(null);
		setPendingUsers([]);
		setManageableElearnings([]);
		setManageElearningForm(defaultManageElearningForm);
		setMessage("Uitgelogd.");
		setError("");
	}

	async function refreshCurrentUser(): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const refreshedUser = await callApi<AuthUserView>(`/auth/me?userId=${encodeURIComponent(session.user.id)}`);
			const updatedSession: SessionState = {
				...session,
				user: refreshedUser,
			};
			storeSession(updatedSession);
			setSession(updatedSession);
			setMessage("Gebruikerstatus ververst.");
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadPublicElearnings(silent = false): Promise<void> {
		if (!silent) {
			clearStatus();
		}
		setIsBusy(true);
		try {
			const data = await callApi<ElearningSummary[]>("/elearnings/public");
			setPublicElearnings(data);
			if (!silent) {
				setMessage(`Publieke e-learnings geladen (${data.length}).`);
			}
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadElearningDetail(elearningId: string): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const data = await callApi<ElearningView>(`/elearnings/${encodeURIComponent(elearningId)}?${query}`);
			setSelectedElearning(data);
			setMessage(`Detail geladen: ${data.title}.`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function handleCreateElearning(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const payload: CreateElearningRequest = {
				title: elearningForm.title,
				description: elearningForm.description,
				level: elearningForm.level,
				visibility: elearningForm.visibility,
				sections: [
					{
						title: elearningForm.sectionTitle,
						content: elearningForm.sectionContent,
						assignment: {
							assignmentType: elearningForm.assignmentType,
							prompt: elearningForm.assignmentPrompt,
							optionsJson:
								elearningForm.assignmentOptionsJson.length > 0
									? elearningForm.assignmentOptionsJson
									: undefined,
							correctAnswerJson:
								elearningForm.assignmentCorrectAnswerJson.length > 0
									? elearningForm.assignmentCorrectAnswerJson
									: undefined,
							points: elearningForm.assignmentPoints,
						},
					},
				],
			};

			const query = buildActorQuery(session);
			const created = await callApi<ElearningView>(`/elearnings?${query}`, {
				method: "POST",
				body: JSON.stringify(payload),
			});

			setCreatedElearning(created);
			setManageElearningForm({
				id: created.id,
				title: created.title,
				description: created.description,
				level: created.level,
				visibility: created.visibility,
				ownerEmail: "",
			});
			setMessage(`E-learning aangemaakt als draft: ${created.title}.`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function publishCreatedElearning(): Promise<void> {
		if (!session || !createdElearning) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const published = await callApi<ElearningView>(
				`/elearnings/${encodeURIComponent(createdElearning.id)}/publish?${query}`,
				{
					method: "POST",
				}
			);
			setCreatedElearning(published);
			setMessage(`E-learning gepubliceerd: ${published.title}.`);
			await loadPublicElearnings();
			await loadManageableElearnings();
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadManageableElearnings(): Promise<void> {
		if (!session || !isContentManager(session.user.role)) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const data = await callApi<ManagedElearningView[]>(`/elearnings/manage?${query}`);
			setManageableElearnings(data);

			if (data.length > 0) {
				const selected = data[0];
				setManageElearningForm({
					id: selected.id,
					title: selected.title,
					description: selected.description,
					level: selected.level,
					visibility: selected.visibility,
					ownerEmail: "",
				});
			}

			setMessage(`Beheerbare trainingen geladen (${data.length}).`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function saveManagedElearning(): Promise<void> {
		if (!session || manageElearningForm.id.length === 0) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			await callApi<ElearningView>(`/elearnings/${encodeURIComponent(manageElearningForm.id)}?${query}`, {
				method: "PATCH",
				body: JSON.stringify({
					title: manageElearningForm.title,
					description: manageElearningForm.description,
					level: manageElearningForm.level,
					visibility: manageElearningForm.visibility,
				}),
			});
			await loadManageableElearnings();
			await loadPublicElearnings(true);
			setMessage("Training bijgewerkt.");
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function deleteManagedElearning(elearningId: string): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			await callApi<{ deleted: true }>(`/elearnings/${encodeURIComponent(elearningId)}?${query}`, {
				method: "DELETE",
			});
			setManageElearningForm(defaultManageElearningForm);
			await loadManageableElearnings();
			await loadPublicElearnings(true);
			setMessage("Training verwijderd.");
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function addManagedOwner(): Promise<void> {
		if (!session || manageElearningForm.id.length === 0 || manageElearningForm.ownerEmail.length === 0) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const updated = await callApi<ManagedElearningView>(
				`/elearnings/${encodeURIComponent(manageElearningForm.id)}/owners?${query}`,
				{
					method: "POST",
					body: JSON.stringify({ ownerEmail: manageElearningForm.ownerEmail }),
				}
			);
			setManageableElearnings(current =>
				current.map(item => (item.id === updated.id ? updated : item))
			);
			setManageElearningForm(current => ({ ...current, ownerEmail: "" }));
			setMessage("Co-owner toegevoegd.");
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	const selectedManagedElearning = manageableElearnings.find(item => item.id === manageElearningForm.id) ?? null;

	async function startEnrollment(elearningId: string): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const enrollment = await callApi<{
				id: string;
			}>(`/elearnings/${encodeURIComponent(elearningId)}/start?${query}`, {
				method: "POST",
			});

			setProgressForm(currentForm => ({
				...currentForm,
				enrollmentId: enrollment.id,
			}));

			const resume = await callApi<EnrollmentResumeView>(`/enrollments/${encodeURIComponent(enrollment.id)}/resume?${query}`);
			setActiveEnrollment(resume);
			setMessage(`Enrollment gestart: ${enrollment.id}.`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function updateProgress(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const payload = {
				sectionId: progressForm.sectionId,
				assignmentId: progressForm.assignmentId.length > 0 ? progressForm.assignmentId : undefined,
				answerText: progressForm.answerText.length > 0 ? progressForm.answerText : undefined,
				answerJson: progressForm.answerJson.length > 0 ? progressForm.answerJson : undefined,
				score: progressForm.score,
				position: progressForm.position,
				markCompleted: progressForm.markCompleted,
			};

			const resume = await callApi<EnrollmentResumeView>(
				`/enrollments/${encodeURIComponent(progressForm.enrollmentId)}/progress?${query}`,
				{
					method: "PATCH",
					body: JSON.stringify(payload),
				}
			);

			setActiveEnrollment(resume);
			setMessage("Voortgang opgeslagen.");
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadHistory(): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const items = await callApi<HistorySummaryItem[]>(`/me/history?${query}`);
			setHistoryItems(items);
			setMessage(`Historie geladen (${items.length}).`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadHistoryDetail(enrollmentId: string): Promise<void> {
		if (!session) {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildActorQuery(session);
			const detail = await callApi<HistoryDetailView>(
				`/me/history/${encodeURIComponent(enrollmentId)}?${query}`
			);
			setHistoryDetail(detail);
			setMessage(`Historie detail geladen voor enrollment ${enrollmentId}.`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function loadPendingUsers(): Promise<void> {
		if (!session || session.user.role !== "ADMIN") {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildAdminQuery(session);
			const users = await callApi<UserSummary[]>(`/admin/users/pending?${query}`);
			setPendingUsers(users);
			setMessage(`Pending users geladen (${users.length}).`);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function approveUser(userId: string): Promise<void> {
		if (!session || session.user.role !== "ADMIN") {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildAdminQuery(session);
			await callApi<UserSummary>(`/admin/users/${encodeURIComponent(userId)}/approve?${query}`, {
				method: "PATCH",
			});
			await loadPendingUsers();
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function rejectUser(userId: string): Promise<void> {
		if (!session || session.user.role !== "ADMIN") {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildAdminQuery(session);
			await callApi<UserSummary>(`/admin/users/${encodeURIComponent(userId)}/reject?${query}`, {
				method: "PATCH",
			});
			await loadPendingUsers();
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	async function changeUserRole(userId: string, role: AppRole): Promise<void> {
		if (!session || session.user.role !== "ADMIN") {
			return;
		}

		clearStatus();
		setIsBusy(true);
		try {
			const query = buildAdminQuery(session);
			const payload: UpdateUserRoleRequest = {
				newRole: role,
			};
			await callApi<UserSummary>(`/admin/users/${encodeURIComponent(userId)}/role?${query}`, {
				method: "PATCH",
				body: JSON.stringify(payload),
			});
			await loadPendingUsers();
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsBusy(false);
		}
	}

	return (
		<div style={styles.page}>
			<header style={styles.heroHeader}>
				<div>
					<h1 style={styles.heading}>Cerios Aicademy e-learning</h1>
					<p style={styles.subHeading}>Softwarekwaliteit, kennisontwikkeling en interne expertise op een plek.</p>
					<p style={styles.heroText}>
						Publieke trainingen laden automatisch. Interne trainingen blijven alleen zichtbaar voor bevoegde gebruikers.
					</p>
				</div>
				{session ? null : (
					<div style={styles.rowWrap}>
						<button disabled={isBusy} onClick={() => setAuthModalView("login")}>Login</button>
						<button disabled={isBusy} onClick={() => setAuthModalView("signup")}>Registreer</button>
					</div>
				)}
			</header>

			{renderAuthForm(
				authModalView,
				loginForm,
				signupForm,
				setAuthModalView,
				setLoginForm,
				setSignupForm,
				handleLogin,
				handleSignup
			)}

			{message.length > 0 && authModalView === null ? <div style={styles.messageSuccess}>{message}</div> : null}
			{error.length > 0 ? <div style={styles.messageError}>{error}</div> : null}

			{session ? (
				<section style={styles.card}>
					<h2>Ingelogd</h2>
					<p>
						{session.user.name} ({session.user.role}) • {getApprovalLabel(session.user.approvalStatus)}
					</p>
					<div style={styles.rowWrap}>
						<button onClick={() => void refreshCurrentUser()}>Refresh me</button>
						<button onClick={handleLogout}>Logout</button>
					</div>
				</section>
			) : null}

			<section style={styles.card}>
				<h2>Catalogus</h2>
				<ul style={styles.list}>
					{publicElearnings.map(item => (
						<li key={item.id} style={styles.listItem}>
							<div>
								<strong>{item.title}</strong> ({item.level})
								<div style={styles.metaText}>{item.description}</div>
							</div>
							<div style={styles.rowWrap}>
								{session ? (
									<button onClick={() => void loadElearningDetail(item.id)}>Detail</button>
								) : null}
								{session && isApprovedUser ? (
									<button onClick={() => void startEnrollment(item.id)}>Start</button>
								) : null}
							</div>
						</li>
					))}
				</ul>
				{selectedElearning ? (
					<div style={styles.miniCard}>
						<h3>Detail: {selectedElearning.title}</h3>
						<p>{selectedElearning.description}</p>
						<p>Sections: {selectedElearning.sections.length}</p>
					</div>
				) : null}
			</section>

			{session && isContentManager(session.user.role) ? (
				<section style={styles.card}>
					<h2>Trainer/Admin: e-learning maken</h2>
					<form onSubmit={event => void handleCreateElearning(event)} style={styles.formGrid}>
						<input
							placeholder="Titel"
							value={elearningForm.title}
							onChange={event =>
								setElearningForm(currentForm => ({ ...currentForm, title: event.target.value }))
							}
						/>
						<input
							placeholder="Beschrijving"
							value={elearningForm.description}
							onChange={event =>
								setElearningForm(currentForm => ({ ...currentForm, description: event.target.value }))
							}
						/>
						<select
							value={elearningForm.level}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									level: event.target.value as ElearningLevel,
								}))
							}
						>
							{ELEARNING_LEVELS.map(level => (
								<option key={level} value={level}>
									{level}
								</option>
							))}
						</select>
						<select
							value={elearningForm.visibility}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									visibility: event.target.value as ElearningVisibility,
								}))
							}
						>
							{ELEARNING_VISIBILITIES.map(visibility => (
								<option key={visibility} value={visibility}>
									{visibility}
								</option>
							))}
						</select>
						<input
							placeholder="Section title"
							value={elearningForm.sectionTitle}
							onChange={event =>
								setElearningForm(currentForm => ({ ...currentForm, sectionTitle: event.target.value }))
							}
						/>
						<textarea
							placeholder="Section content"
							value={elearningForm.sectionContent}
							onChange={event =>
								setElearningForm(currentForm => ({ ...currentForm, sectionContent: event.target.value }))
							}
						/>
						<input
							placeholder="Assignment prompt"
							value={elearningForm.assignmentPrompt}
							onChange={event =>
								setElearningForm(currentForm => ({ ...currentForm, assignmentPrompt: event.target.value }))
							}
						/>
						<select
							value={elearningForm.assignmentType}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									assignmentType: event.target.value as "QUIZ" | "OPEN_TEXT",
								}))
							}
						>
							<option value="OPEN_TEXT">OPEN_TEXT</option>
							<option value="QUIZ">QUIZ</option>
						</select>
						<input
							placeholder="Options JSON (quiz)"
							value={elearningForm.assignmentOptionsJson}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									assignmentOptionsJson: event.target.value,
								}))
							}
						/>
						<input
							placeholder="Correct answer JSON"
							value={elearningForm.assignmentCorrectAnswerJson}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									assignmentCorrectAnswerJson: event.target.value,
								}))
							}
						/>
						<input
							type="number"
							min={0}
							value={elearningForm.assignmentPoints}
							onChange={event =>
								setElearningForm(currentForm => ({
									...currentForm,
									assignmentPoints: Number(event.target.value),
								}))
							}
						/>
						<button type="submit">Maak draft e-learning</button>
					</form>

					{createdElearning ? (
						<div style={styles.miniCard}>
							<p>
								Draft gemaakt: <strong>{createdElearning.title}</strong> ({createdElearning.status}, {createdElearning.visibility})
							</p>
							<button onClick={() => void publishCreatedElearning()}>Publiceer deze draft</button>
						</div>
					) : null}
				</section>
			) : null}

			{session && isContentManager(session.user.role) ? (
				<section style={styles.card}>
					<h2>Trainer/Admin: beheer trainingen</h2>
					<div style={styles.rowWrap}>
						<button onClick={() => void loadManageableElearnings()}>Laad beheerbare trainingen</button>
					</div>
					<ul style={styles.list}>
						{manageableElearnings.map(item => (
							<li key={item.id} style={styles.listItem}>
								<div>
									<strong>{item.title}</strong> ({item.status}, {item.visibility})
								</div>
								<div style={styles.rowWrap}>
									<button
										onClick={() =>
											setManageElearningForm({
												id: item.id,
												title: item.title,
												description: item.description,
												level: item.level,
												visibility: item.visibility,
												ownerEmail: "",
											})
										}
									>
										Selecteer
									</button>
									<button onClick={() => void deleteManagedElearning(item.id)}>Verwijder</button>
								</div>
							</li>
						))}
					</ul>

					{selectedManagedElearning ? (
						<div style={styles.miniCard}>
							<h3>Bewerk training</h3>
							<div style={styles.formGrid}>
								<input
									value={manageElearningForm.title}
									onChange={event =>
										setManageElearningForm(current => ({ ...current, title: event.target.value }))
									}
								/>
								<input
									value={manageElearningForm.description}
									onChange={event =>
										setManageElearningForm(current => ({ ...current, description: event.target.value }))
									}
								/>
								<select
									value={manageElearningForm.level}
									onChange={event =>
										setManageElearningForm(current => ({
											...current,
											level: event.target.value as ElearningLevel,
										}))
									}
								>
									{ELEARNING_LEVELS.map(level => (
										<option key={level} value={level}>
											{level}
										</option>
									))}
								</select>
								<select
									value={manageElearningForm.visibility}
									onChange={event =>
										setManageElearningForm(current => ({
											...current,
											visibility: event.target.value as ElearningVisibility,
										}))
									}
								>
									{ELEARNING_VISIBILITIES.map(visibility => (
										<option key={visibility} value={visibility}>
											{visibility}
										</option>
									))}
								</select>
								<button onClick={() => void saveManagedElearning()}>Sla wijzigingen op</button>
							</div>

							<h4>Co-owners</h4>
							<ul style={styles.list}>
								{selectedManagedElearning.owners.map(owner => (
									<li key={owner.userId} style={styles.listItem}>
										<div>
											{owner.name} - {owner.email} ({owner.role})
										</div>
									</li>
								))}
							</ul>
							<div style={styles.rowWrap}>
								<input
									placeholder="trainer@email.nl"
									value={manageElearningForm.ownerEmail}
									onChange={event =>
										setManageElearningForm(current => ({ ...current, ownerEmail: event.target.value }))
									}
								/>
								<button onClick={() => void addManagedOwner()}>Voeg co-owner toe</button>
							</div>

							<h4>Logs</h4>
							<ul style={styles.list}>
								{selectedManagedElearning.logs.map((log: ElearningAuditLogView) => (
									<li key={log.id} style={styles.listItem}>
										<div>
											<strong>{log.action}</strong> - {log.summary}
											<div>{log.actorName}</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</section>
			) : null}

			{session && session.user.role === "ADMIN" ? (
				<section style={styles.card}>
					<h2>Admin: pending users</h2>
					<button onClick={() => void loadPendingUsers()}>Laad pending users</button>
					<ul style={styles.list}>
						{pendingUsers.map(user => (
							<li key={user.id} style={styles.listItem}>
								<div>
									{user.name} - {user.email} ({getApprovalLabel(user.approvalStatus)})
								</div>
								<div style={styles.rowWrap}>
									<button onClick={() => void approveUser(user.id)}>Approve</button>
									<button onClick={() => void rejectUser(user.id)}>Reject</button>
									<select
										onChange={event => void changeUserRole(user.id, event.target.value as AppRole)}
										value={user.role}
									>
										{APP_ROLES.map(role => (
											<option key={role} value={role}>
												{role}
											</option>
										))}
									</select>
								</div>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{session && isApprovedUser ? (
				<section style={styles.card}>
					<h2>Leerflow: progress en resume</h2>
					<form onSubmit={event => void updateProgress(event)} style={styles.formGrid}>
						<input
							placeholder="Enrollment ID"
							value={progressForm.enrollmentId}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, enrollmentId: event.target.value }))
							}
						/>
						<input
							placeholder="Section ID"
							value={progressForm.sectionId}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, sectionId: event.target.value }))
							}
						/>
						<input
							placeholder="Assignment ID (optioneel)"
							value={progressForm.assignmentId}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, assignmentId: event.target.value }))
							}
						/>
						<input
							placeholder="Antwoord tekst"
							value={progressForm.answerText}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, answerText: event.target.value }))
							}
						/>
						<input
							placeholder="Antwoord JSON"
							value={progressForm.answerJson}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, answerJson: event.target.value }))
							}
						/>
						<input
							type="number"
							min={0}
							value={progressForm.score}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, score: Number(event.target.value) }))
							}
						/>
						<input
							type="number"
							min={0}
							value={progressForm.position}
							onChange={event =>
								setProgressForm(currentForm => ({ ...currentForm, position: Number(event.target.value) }))
							}
						/>
						<label>
							<input
								type="checkbox"
								checked={progressForm.markCompleted}
								onChange={event =>
									setProgressForm(currentForm => ({
										...currentForm,
										markCompleted: event.target.checked,
									}))
								}
							/>
							Mark completed
						</label>
						<button type="submit">Sla voortgang op</button>
					</form>
					{activeEnrollment ? (
						<div style={styles.miniCard}>
							<p>
								Enrollment status: {activeEnrollment.enrollment.status}, score: {activeEnrollment.enrollment.totalScore}
							</p>
							<p>Progress entries: {activeEnrollment.progressEntries.length}</p>
						</div>
					) : null}
				</section>
			) : null}

			{session && isApprovedUser ? (
				<section style={styles.card}>
					<h2>Historie</h2>
					<button onClick={() => void loadHistory()}>Laad historie</button>
					<ul style={styles.list}>
						{historyItems.map(item => (
							<li key={item.enrollmentId} style={styles.listItem}>
								<div>
									{item.elearningTitle} ({item.status})
								</div>
								<div style={styles.rowWrap}>
									<button onClick={() => void loadHistoryDetail(item.enrollmentId)}>Detail</button>
								</div>
							</li>
						))}
					</ul>

					{historyDetail ? (
						<div style={styles.miniCard}>
							<h3>{historyDetail.elearning.title}</h3>
							<p>Status: {historyDetail.enrollment.status}</p>
							<p>Score: {historyDetail.enrollment.totalScore}</p>
							<p>Entries: {historyDetail.progressEntries.length}</p>
						</div>
					) : null}
				</section>
			) : null}
		</div>
	);
}

function renderAuthForm(
	authModalView: AuthModalView,
	loginForm: LoginFormState,
	signupForm: SignupFormState,
	setAuthModalView: (value: AuthModalView) => void,
	setLoginForm: React.Dispatch<React.SetStateAction<LoginFormState>>,
	setSignupForm: React.Dispatch<React.SetStateAction<SignupFormState>>,
	handleLogin: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>,
	handleSignup: (event: SyntheticEvent<HTMLFormElement>) => Promise<void>
): ReactElement | null {
	if (authModalView === null) {
		return null;
	}

	const isLoginView = authModalView === "login";

	return (
		<div style={styles.modalOverlay} onClick={() => setAuthModalView(null)}>
			<div style={styles.modalCard} onClick={event => event.stopPropagation()}>
				<div style={styles.modalHeader}>
					<h2>{isLoginView ? "Login" : "Registreer"}</h2>
					<button onClick={() => setAuthModalView(null)}>Sluit</button>
				</div>
				{isLoginView ? (
					<form onSubmit={event => void handleLogin(event)} style={styles.formGrid}>
						<input
							placeholder="E-mail"
							value={loginForm.email}
							onChange={event =>
								setLoginForm(currentForm => ({ ...currentForm, email: event.target.value }))
							}
						/>
						<input
							type="password"
							placeholder="Wachtwoord"
							value={loginForm.password}
							onChange={event =>
								setLoginForm(currentForm => ({ ...currentForm, password: event.target.value }))
							}
						/>
						<button type="submit">Inloggen</button>
					</form>
				) : (
					<form onSubmit={event => void handleSignup(event)} style={styles.formGrid}>
						<input
							placeholder="Naam"
							value={signupForm.name}
							onChange={event =>
								setSignupForm(currentForm => ({ ...currentForm, name: event.target.value }))
							}
						/>
						<input
							placeholder="E-mail"
							value={signupForm.email}
							onChange={event =>
								setSignupForm(currentForm => ({ ...currentForm, email: event.target.value }))
							}
						/>
						<input
							type="date"
							value={signupForm.birthDateIso}
							onChange={event =>
								setSignupForm(currentForm => ({ ...currentForm, birthDateIso: event.target.value }))
							}
						/>
						<select
							value={signupForm.teamName}
							onChange={event =>
								setSignupForm(currentForm => ({
									...currentForm,
									teamName: event.target.value as TeamName,
								}))
							}
						>
							{TEAM_OPTIONS.map(teamName => (
								<option key={teamName} value={teamName}>
									{teamName}
								</option>
							))}
						</select>
						<input
							type="password"
							placeholder="Wachtwoord"
							value={signupForm.password}
							onChange={event =>
								setSignupForm(currentForm => ({ ...currentForm, password: event.target.value }))
							}
						/>
						<button type="submit">Account aanmaken</button>
					</form>
				)}
			</div>
		</div>
	);
}

const styles: Record<string, CSSProperties> = {
	page: {
		fontFamily: "Segoe UI, sans-serif",
		maxWidth: "1180px",
		margin: "0 auto",
		padding: "24px",
		lineHeight: 1.5,
		color: "#0f172a",
		background: "linear-gradient(180deg, #eaf4f5 0%, #f8fbfc 38%, #ffffff 100%)",
		minHeight: "100vh",
	},
	heroHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "flex-start",
		gap: "16px",
		marginBottom: "24px",
		padding: "24px",
		borderRadius: "22px",
		background: "linear-gradient(135deg, #0f2740 0%, #153a59 60%, #1f5f6b 100%)",
		color: "#f8fafc",
		boxShadow: "0 24px 60px rgba(15, 39, 64, 0.18)",
	},
	heading: {
		marginBottom: "4px",
		fontSize: "clamp(2rem, 4vw, 3rem)",
	},
	subHeading: {
		color: "#d7f5ef",
		marginTop: "0",
		marginBottom: "8px",
		fontWeight: 600,
	},
	heroText: {
		margin: 0,
		maxWidth: "640px",
		color: "#d9e8ef",
	},
	card: {
		border: "1px solid #dbe8ea",
		borderRadius: "18px",
		padding: "18px",
		marginBottom: "16px",
		background: "rgba(255, 255, 255, 0.92)",
		boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
	},
	miniCard: {
		border: "1px solid #dce9e7",
		borderRadius: "12px",
		padding: "12px",
		marginTop: "12px",
		background: "#fdfefe",
	},
	formGrid: {
		display: "grid",
		gap: "8px",
	},
	messageSuccess: {
		background: "#e8fbf4",
		border: "1px solid #51b58b",
		color: "#14513a",
		padding: "10px",
		borderRadius: "8px",
		marginBottom: "12px",
	},
	messageError: {
		background: "#fff1f2",
		border: "1px solid #ef7f8f",
		color: "#7f1d2d",
		padding: "10px",
		borderRadius: "8px",
		marginBottom: "12px",
	},
	rowWrap: {
		display: "flex",
		gap: "8px",
		flexWrap: "wrap",
		alignItems: "center",
	},
	list: {
		listStyle: "none",
		padding: 0,
		margin: "8px 0 0 0",
		display: "grid",
		gap: "8px",
	},
	listItem: {
		border: "1px solid #deebec",
		borderRadius: "12px",
		padding: "10px",
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		gap: "12px",
		background: "#fff",
	},
	metaText: {
		fontSize: "0.92rem",
		color: "#47606b",
		marginTop: "4px",
	},
	modalOverlay: {
		position: "fixed",
		inset: 0,
		background: "rgba(7, 25, 42, 0.58)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		padding: "24px",
		zIndex: 10,
	},
	modalCard: {
		width: "min(100%, 460px)",
		background: "#ffffff",
		borderRadius: "16px",
		padding: "20px",
		boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
	},
	modalHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		gap: "12px",
		marginBottom: "12px",
	},
};

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element was not found.");
}

createRoot(rootElement).render(<App />);
