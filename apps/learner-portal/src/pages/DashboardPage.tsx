import type { BadgeGoalView, ElearningSummary, GamificationSummaryView, HistorySummaryItem } from "@hackaithon/shared-types";
import { useEffect, useMemo, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import {
	Button,
	Card,
	CourseCard,
	EmptyState,
	ErrorState,
	LoadingState,
	PageHeader,
	StatusBadge,
} from "../components/ui.js";
import { getGamificationSummary, listHistory, listPublicElearnings } from "../lib/api.js";
import type { SessionState } from "../types.js";

type DashboardPageProps = {
	onNavigate: (path: string) => void;
	session: SessionState;
};

// oxlint-disable-next-line eslint/complexity -- Dashboard intentionally combines approval, progress and motivation states.
export function DashboardPage({ onNavigate, session }: DashboardPageProps): ReactElement {
	const [courses, setCourses] = useState<ElearningSummary[]>([]);
	const [gamification, setGamification] = useState<GamificationSummaryView | null>(null);
	const [history, setHistory] = useState<HistorySummaryItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const canLearn = session.user.canAccessLearning || session.user.role === "ADMIN";

	async function loadDashboard(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			const [courseItems, historyItems, gamificationSummary] = await Promise.all([
				listPublicElearnings(session),
				canLearn ? listHistory(session) : Promise.resolve([]),
				canLearn ? getGamificationSummary(session) : Promise.resolve(null),
			]);
			setCourses(courseItems);
			setHistory(historyItems);
			setGamification(gamificationSummary);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadDashboard();
	}, [session.user.id]);

	const activeHistory = history.filter(item => item.status === "IN_PROGRESS");
	const completedHistory = history.filter(item => item.status === "COMPLETED");
	const totalScore = gamification?.totalScore ?? history.reduce((sum, item) => sum + item.totalScore, 0);
	const activeCourses = useMemo(
		() =>
			activeHistory
				.map(item => ({ history: item, course: courses.find(course => course.id === item.elearningId) }))
				.filter((item): item is { history: HistorySummaryItem; course: ElearningSummary } => Boolean(item.course)),
		[activeHistory, courses]
	);

	if (isLoading) {
		return <LoadingState description="We zetten je persoonlijke dashboard klaar." />;
	}

	if (error) {
		return (
			<ErrorState
				action={<Button onClick={() => void loadDashboard()}>Opnieuw proberen</Button>}
				description={error}
				title="Dashboard niet beschikbaar"
			/>
		);
	}

	return (
		<>
			<PageHeader
				eyebrow={`${getGreeting()}, ${session.user.name.split(" ")[0] ?? session.user.name}`}
				subtitle={
					canLearn
						? "Pak de draad weer op of ontdek iets nieuws in de Academy."
						: "Je account wacht nog op goedkeuring. Je kunt het aanbod alvast bekijken."
				}
				title="Jouw ontwikkeling, in één overzicht"
			/>

			{!canLearn ? (
				<Card className="approval-banner">
					<div className="approval-banner__icon">
						<Icon name="clock" />
					</div>
					<div>
						<StatusBadge status={session.user.approvalStatus} />
						<h2>Je aanvraag wordt beoordeeld</h2>
						<p>Een beheerder geeft je toegang. Daarna kun je direct starten met leren.</p>
					</div>
					<Button onClick={() => onNavigate("/catalogus")} variant="secondary">
						Bekijk catalogus
					</Button>
				</Card>
			) : null}

			<section aria-label="Leerstatistieken" className="stats-grid">
				<StatCard
					icon="book"
					label="Actief"
					value={activeHistory.length}
					supportingText="e-learnings om verder te gaan"
				/>
				<StatCard icon="check" label="Afgerond" value={completedHistory.length} supportingText="behaalde e-learnings" />
				<StatCard icon="award" label="Kennispunten" value={totalScore} supportingText="opgebouwd met opdrachten" />
				<StatCard
					icon="sparkles"
					label="Beschikbaar"
					value={courses.length}
					supportingText="e-learnings in de catalogus"
				/>
			</section>

			<div className="dashboard-grid">
				<section className="dashboard-main" aria-labelledby="active-courses-title">
					<div className="section-heading">
						<div>
							<p className="eyebrow">Verder leren</p>
							<h2 id="active-courses-title">Actieve e-learnings</h2>
						</div>
					<Button onClick={() => onNavigate("/catalogus")} variant="ghost" icon="arrow-right" iconPosition="end">
						Alles bekijken
					</Button>
					</div>
					{activeCourses.length > 0 ? (
						<div className="course-grid course-grid--dashboard">
							{activeCourses.slice(0, 2).map(({ course, history: item }) => (
								<CourseCard
									course={course}
									key={course.id}
									onOpen={() => onNavigate(`/catalogus/${encodeURIComponent(course.id)}`)}
									onPrimary={() => onNavigate(`/leren/${encodeURIComponent(course.id)}`)}
									primaryLabel="Ga verder"
									progress={getProgress(item, course)}
								/>
							))}
						</div>
					) : (
						<EmptyState
							action={
								<Button onClick={() => onNavigate("/catalogus")} icon="arrow-right" iconPosition="end">
									Ontdek e-learnings
								</Button>
							}
							description="Kies een e-learning die past bij jouw volgende stap."
							title="Klaar om iets nieuws te leren?"
						/>
					)}
				</section>

				<aside className="dashboard-aside">
					<Card className="quick-actions">
						<p className="eyebrow">Snel naar</p>
						<h2>Wat wil je doen?</h2>
						<button onClick={() => onNavigate("/catalogus")} type="button">
							<span>
								<Icon name="search" />
							</span>
							<span>
								<strong>Nieuwe e-learning</strong>
								<small>Ontdek het actuele aanbod</small>
							</span>
							<Icon name="arrow-right" size={17} />
						</button>
						<button onClick={() => onNavigate("/historie")} type="button">
							<span>
								<Icon name="history" />
							</span>
							<span>
								<strong>Mijn historie</strong>
								<small>Bekijk je leeractiviteit</small>
							</span>
							<Icon name="arrow-right" size={17} />
						</button>
						{session.user.role === "ADMIN" || session.user.role === "TRAINER" ? (
							<button onClick={() => onNavigate("/beheer/elearnings")} type="button">
								<span>
									<Icon name="plus" />
								</span>
								<span>
									<strong>E-learning maken</strong>
									<small>Deel kennis met deelnemers</small>
								</span>
								<Icon name="arrow-right" size={17} />
							</button>
						) : null}
					</Card>

					{canLearn && gamification ? (
						<Card className="learning-momentum">
							<div className="learning-momentum__header">
								<p className="eyebrow">Gamification</p>
								<h2>Je momentum</h2>
								<p>Elke opgeslagen stap telt mee voor badges, streaks en zichtbare voortgang.</p>
							</div>
							<div className="learning-momentum__stats">
								<div>
									<small>Huidige streak</small>
									<strong>{gamification.currentStreakDays}</strong>
									<span>{gamification.currentStreakDays === 1 ? "dag actief" : "dagen actief"}</span>
								</div>
								<div>
									<small>Badges</small>
									<strong>{gamification.badges.length}</strong>
									<span>vrijgespeeld</span>
								</div>
								<div>
									<small>Onderdelen</small>
									<strong>{gamification.completedSections}</strong>
									<span>opgeslagen</span>
								</div>
							</div>
							<div className="learning-momentum__goal">
								<p className="eyebrow">Volgende beloning</p>
								{gamification.nextBadge ? (
									<>
										<strong>{gamification.nextBadge.title}</strong>
										<span>{formatNextBadgeHint(gamification.nextBadge)}</span>
									</>
								) : (
									<>
										<strong>Alle badges vrijgespeeld</strong>
										<span>Je hebt alle huidige gamification-doelen al behaald.</span>
									</>
								)}
							</div>
							<div className="learning-momentum__badges">
								<div>
									<p className="eyebrow">Recent verdiend</p>
									<h3>Laatste badges</h3>
								</div>
								{gamification.badges.length > 0 ? (
									<ul>
										{gamification.badges.slice(0, 3).map(badge => (
											<li key={badge.id}>
												<span>
													<Icon name="award" size={16} />
												</span>
												<div>
													<strong>{badge.title}</strong>
													<small>
														{badge.description} · {formatRelativeDate(badge.awardedAtIso)}
													</small>
												</div>
											</li>
										))}
									</ul>
								) : (
									<p className="muted-copy">Je eerste badge verschijnt zodra je je eerste onderdeel afrondt.</p>
								)}
							</div>
						</Card>
					) : null}

					<Card className="recent-activity">
						<p className="eyebrow">Recente activiteit</p>
						<h2>Laatste updates</h2>
						{history.length > 0 ? (
							<ul>
								{history.slice(0, 4).map(item => (
									<li key={item.enrollmentId}>
										<span className={`activity-dot activity-dot--${item.status.toLowerCase()}`} />
										<div>
											<strong>{item.elearningTitle}</strong>
											<small>
												{item.status === "COMPLETED" ? "Afgerond" : "Laatst bekeken"} ·{" "}
												{formatRelativeDate(item.updatedAtIso)}
											</small>
										</div>
									</li>
								))}
							</ul>
						) : (
							<p className="muted-copy">Je recente leeractiviteit verschijnt hier.</p>
						)}
					</Card>
				</aside>
			</div>
		</>
	);
}

type StatCardProps = {
	icon: "award" | "book" | "check" | "sparkles";
	label: string;
	supportingText: string;
	value: number;
};

function StatCard({ icon, label, supportingText, value }: StatCardProps): ReactElement {
	return (
		<Card className="stat-card">
			<div className="stat-card__icon">
				<Icon name={icon} />
			</div>
			<div>
				<p>{label}</p>
				<strong>{value}</strong>
				<small>{supportingText}</small>
			</div>
		</Card>
	);
}

function getProgress(history: HistorySummaryItem, course: ElearningSummary): number {
	if (history.status === "COMPLETED") return 100;
	return Math.min(95, Math.round(((history.lastPosition + 1) / Math.max(course.sectionCount, 1)) * 100));
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Goedemorgen";
	if (hour < 18) return "Goedemiddag";
	return "Goedenavond";
}

function formatNextBadgeHint(goal: BadgeGoalView): string {
	if (goal.metric === "STREAK_DAYS") {
		return `Nog ${goal.remainingValue} ${goal.remainingValue === 1 ? "dag" : "dagen"} leren voor ${goal.title.toLowerCase()}.`;
	}

	if (goal.metric === "COURSES") {
		return `Nog ${goal.remainingValue} ${goal.remainingValue === 1 ? "e-learning" : "e-learnings"} afronden voor ${goal.title.toLowerCase()}.`;
	}

	return `Nog ${goal.remainingValue} ${goal.remainingValue === 1 ? "onderdeel" : "onderdelen"} opslaan voor ${goal.title.toLowerCase()}.`;
}

function formatRelativeDate(value: string): string {
	const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
	if (days <= 0) return "vandaag";
	if (days === 1) return "gisteren";
	return `${days} dagen geleden`;
}
