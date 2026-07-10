import type { ElearningView, HistorySummaryItem } from "@hackaithon/shared-types";
import { useEffect, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import { Button, Card, ErrorState, LoadingState, ProgressBar, StatusBadge } from "../components/ui.js";
import { getElearning, listHistory } from "../lib/api.js";
import type { SessionState } from "../types.js";

type CourseDetailPageProps = {
	elearningId: string;
	onNavigate: (path: string) => void;
	session: SessionState;
};

// oxlint-disable-next-line eslint/complexity -- The page intentionally maps access and enrollment states to one CTA.
export function CourseDetailPage({ elearningId, onNavigate, session }: CourseDetailPageProps): ReactElement {
	const [course, setCourse] = useState<ElearningView | null>(null);
	const [historyItem, setHistoryItem] = useState<HistorySummaryItem | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const canLearn = session.user.canAccessLearning || session.user.role === "ADMIN";

	async function loadCourse(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			const [courseData, history] = await Promise.all([
				getElearning(session, elearningId),
				canLearn ? listHistory(session) : Promise.resolve([]),
			]);
			setCourse(courseData);
			setHistoryItem(history.find(item => item.elearningId === elearningId) ?? null);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadCourse();
	}, [elearningId]);

	if (isLoading) return <LoadingState description="We openen de e-learning." />;
	if (error || !course)
		return (
			<ErrorState
				action={
					<>
						<Button onClick={() => void loadCourse()}>Opnieuw proberen</Button>
						<Button onClick={() => onNavigate("/catalogus")} variant="ghost">
							Terug naar catalogus
						</Button>
					</>
				}
				description={error || "Deze e-learning bestaat niet meer."}
				title="E-learning niet gevonden"
			/>
		);

	const duration = Math.max(15, course.sections.length * 20);
	const progress = historyItem
		? historyItem.status === "COMPLETED"
			? 100
			: Math.min(95, Math.round(((historyItem.lastPosition + 1) / Math.max(course.sections.length, 1)) * 100))
		: 0;

	return (
		<>
			<button className="back-link" onClick={() => onNavigate("/catalogus")} type="button">
				<Icon name="arrow-left" size={18} /> Terug naar catalogus
			</button>
			<section className="course-hero">
				<div className="course-hero__copy">
					<div className="course-hero__badges">
						<StatusBadge status={course.level} />
						<StatusBadge status={course.status} />
					</div>
					<h1>{course.title}</h1>
					<p>{course.description}</p>
					<div className="course-hero__meta">
						<span>
							<Icon name="clock" size={18} /> Ongeveer {duration} minuten
						</span>
						<span>
							<Icon name="layers" size={18} /> {course.sections.length} onderdelen
						</span>
						<span>
							<Icon name="award" size={18} /> Certificaat van deelname
						</span>
					</div>
					{historyItem ? (
						<div className="course-hero__progress">
							<ProgressBar
								label={historyItem.status === "COMPLETED" ? "Afgerond" : "Jouw voortgang"}
								value={progress}
							/>
						</div>
					) : null}
					{canLearn ? (
						<Button icon="play" onClick={() => onNavigate(`/leren/${encodeURIComponent(course.id)}`)}>
							{historyItem?.status === "IN_PROGRESS"
								? "Ga verder waar je was"
								: historyItem?.status === "COMPLETED"
									? "Bekijk opnieuw"
									: "Start e-learning"}
						</Button>
					) : (
						<div className="course-access-note">
							<Icon name="clock" size={18} /> Je kunt starten zodra je account is goedgekeurd.
						</div>
					)}
				</div>
				<div aria-hidden="true" className="course-hero__art">
					<span className="course-hero__art-icon">
						<Icon name="sparkles" size={34} />
					</span>
					<span />
					<span />
					<span />
				</div>
			</section>

			<div className="detail-grid">
				<div className="detail-main">
					<section aria-labelledby="objectives-title">
						<p className="eyebrow">Dit ga je leren</p>
						<h2 id="objectives-title">Leerdoelen</h2>
						<ul className="check-list">
							{course.sections.map(section => (
								<li key={section.id}>
									<span>
										<Icon name="check" size={17} />
									</span>
									<p>
										Je begrijpt en kunt werken met <strong>{section.title.toLowerCase()}</strong>.
									</p>
								</li>
							))}
						</ul>
					</section>
					<section aria-labelledby="contents-title">
						<p className="eyebrow">Programma</p>
						<h2 id="contents-title">Onderdelen</h2>
						<ol className="curriculum-list">
							{course.sections.map((section, index) => (
								<li key={section.id}>
									<span>{String(index + 1).padStart(2, "0")}</span>
									<div>
										<strong>{section.title}</strong>
										<small>{section.assignment ? "Lesstof en opdracht" : "Lesstof"} · circa 20 min</small>
									</div>
									<Icon name={historyItem && historyItem.lastPosition > index ? "check" : "book"} size={19} />
								</li>
							))}
						</ol>
					</section>
				</div>
				<aside>
					<Card className="course-summary">
						<p className="eyebrow">In het kort</p>
						<h2>Over deze e-learning</h2>
						<dl>
							<div>
								<dt>Niveau</dt>
								<dd>
									<StatusBadge status={course.level} />
								</dd>
							</div>
							<div>
								<dt>Duur</dt>
								<dd>{duration} minuten</dd>
							</div>
							<div>
								<dt>Onderdelen</dt>
								<dd>{course.sections.length}</dd>
							</div>
							<div>
								<dt>Vorm</dt>
								<dd>Zelfstandig online</dd>
							</div>
						</dl>
						{canLearn ? (
							<Button
								icon="arrow-right"
								iconPosition="end"
								onClick={() => onNavigate(`/leren/${encodeURIComponent(course.id)}`)}
							>
								{historyItem?.status === "IN_PROGRESS" ? "Verder leren" : "Aan de slag"}
							</Button>
						) : null}
					</Card>
				</aside>
			</div>
		</>
	);
}
