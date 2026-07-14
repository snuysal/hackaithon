import { useEffect, useState, type ReactElement } from "react";

import { AppShell } from "./components/AppShell.js";
import { Button, ErrorState, LoadingState, Toast } from "./components/ui.js";
import { getCurrentUser, readStoredSession, storeSession } from "./lib/api.js";
import { navigate, useAppRoute } from "./lib/router.js";
import { AdminCoursesPage } from "./pages/AdminCoursesPage.js";
import { AdminUsersPage } from "./pages/AdminUsersPage.js";
import { AuthPage } from "./pages/AuthPage.js";
import { CatalogPage } from "./pages/CatalogPage.js";
import { CourseDetailPage } from "./pages/CourseDetailPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { HistoryPage } from "./pages/HistoryPage.js";
import { LearningPage } from "./pages/LearningPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { ReviewQueuePage } from "./pages/ReviewQueuePage.js";
import type { AppRoute, FeedbackMessage, SessionState } from "./types.js";

export function App(): ReactElement {
	const [session, setSession] = useState<SessionState | null>(() => readStoredSession());
	const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
	const [isRefreshingSession, setIsRefreshingSession] = useState(false);
	const route = useAppRoute();

	useEffect(() => {
		if (!session && route.name !== "auth") {
			navigate("/login", true);
			return;
		}

		if (session && route.name === "auth") {
			navigate("/dashboard", true);
			return;
		}

		if (session && route.name === "manage-users" && session.user.role !== "ADMIN") {
			navigate("/dashboard", true);
			setFeedback({ type: "error", text: "Je hebt geen toegang tot gebruikersbeheer." });
			return;
		}

		if (
			session &&
			(route.name === "manage-courses" || route.name === "reviews") &&
			session.user.role !== "ADMIN" &&
			session.user.role !== "TRAINER"
		) {
			navigate("/dashboard", true);
			setFeedback({ type: "error", text: "Je hebt geen toegang tot dit beheerscherm." });
		}
	}, [route.name, session]);

	useEffect(() => {
		if (!session) return;

		let isCancelled = false;
		setIsRefreshingSession(true);
		void getCurrentUser(session)
			.then(user => {
				if (isCancelled) return;
				const updatedSession = { ...session, user };
				setSession(updatedSession);
				storeSession(updatedSession);
			})
			.catch((): void => {
				if (!isCancelled) setFeedback({ type: "info", text: "Je profielstatus kon niet worden ververst." });
			})
			.finally((): void => {
				if (!isCancelled) setIsRefreshingSession(false);
			});

		return (): void => {
			isCancelled = true;
		};
	}, [session?.user.id]);

	function handleAuthenticated(nextSession: SessionState): void {
		storeSession(nextSession);
		setSession(nextSession);
		navigate("/dashboard", true);
	}

	function handleLogout(): void {
		storeSession(null);
		setSession(null);
		setFeedback({ type: "info", text: "Je bent veilig uitgelogd." });
		navigate("/login", true);
	}

	function handleUserUpdated(user: SessionState["user"]): void {
		if (!session) return;
		const updatedSession = { ...session, user };
		storeSession(updatedSession);
		setSession(updatedSession);
	}

	function dismissFeedback(): void {
		setFeedback(null);
	}

	if (!session) {
		return (
			<>
				<AuthPage onAuthenticated={handleAuthenticated} onFeedback={setFeedback} />
				{feedback ? <Toast message={feedback.text} onClose={dismissFeedback} type={feedback.type} /> : null}
			</>
		);
	}

	return (
		<AppShell
			isBusy={isRefreshingSession}
			onLogout={handleLogout}
			onNavigate={navigate}
			routePath={route.path}
			user={session.user}
		>
			{renderRoute(route, session, setFeedback, handleUserUpdated)}
			{feedback ? <Toast message={feedback.text} onClose={dismissFeedback} type={feedback.type} /> : null}
		</AppShell>
	);
}

// oxlint-disable-next-line eslint/complexity -- Route rendering centralizes access-aware page selection for this small SPA.
function renderRoute(
	route: AppRoute,
	session: SessionState,
	onFeedback: (feedback: FeedbackMessage) => void,
	onUserUpdated: (user: SessionState["user"]) => void
): ReactElement {
	switch (route.name) {
		case "auth":
			return <LoadingState description="Je dashboard wordt geopend." />;
		case "dashboard":
			return <DashboardPage onNavigate={navigate} session={session} />;
		case "catalog":
			return <CatalogPage onNavigate={navigate} session={session} />;
		case "course-detail":
			return <CourseDetailPage elearningId={route.elearningId} onNavigate={navigate} session={session} />;
		case "learning":
			if (!session.user.canAccessLearning && session.user.role !== "ADMIN") {
				return (
					<ErrorState
						action={
							<Button onClick={() => navigate(`/catalogus/${encodeURIComponent(route.elearningId)}`)}>
								Bekijk e-learning
							</Button>
						}
						description="Je kunt starten zodra een beheerder je account heeft goedgekeurd."
						title="Nog geen leertoegang"
					/>
				);
			}
			return (
				<LearningPage elearningId={route.elearningId} onFeedback={onFeedback} onNavigate={navigate} session={session} />
			);
		case "history":
			return <HistoryPage onNavigate={navigate} session={session} />;
		case "profile":
			return <ProfilePage onFeedback={onFeedback} onUserUpdated={onUserUpdated} session={session} />;
		case "reviews":
			return session.user.role === "ADMIN" || session.user.role === "TRAINER" ? (
				<ReviewQueuePage onFeedback={onFeedback} session={session} />
			) : (
				<LoadingState />
			);
		case "manage-courses":
			return session.user.role === "ADMIN" || session.user.role === "TRAINER" ? (
				<AdminCoursesPage onFeedback={onFeedback} session={session} />
			) : (
				<LoadingState />
			);
		case "manage-users":
			return session.user.role === "ADMIN" ? (
				<AdminUsersPage onFeedback={onFeedback} session={session} />
			) : (
				<LoadingState />
			);
		case "not-found":
			return (
				<ErrorState
					action={<Button onClick={() => navigate("/dashboard")}>Naar dashboard</Button>}
					description="Deze pagina bestaat niet of is verplaatst."
					title="Pagina niet gevonden"
				/>
			);
	}
}
