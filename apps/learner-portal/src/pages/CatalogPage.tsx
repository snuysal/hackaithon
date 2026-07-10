import type { ElearningLevel, ElearningSummary, HistorySummaryItem } from "@hackaithon/shared-types";
import { useEffect, useMemo, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import {
	Button,
	CourseCard,
	EmptyState,
	ErrorState,
	Input,
	LoadingState,
	PageHeader,
	Select,
} from "../components/ui.js";
import { listHistory, listPublicElearnings } from "../lib/api.js";
import type { SessionState } from "../types.js";

type CatalogPageProps = {
	onNavigate: (path: string) => void;
	session: SessionState;
};

export function CatalogPage({ onNavigate, session }: CatalogPageProps): ReactElement {
	const [courses, setCourses] = useState<ElearningSummary[]>([]);
	const [history, setHistory] = useState<HistorySummaryItem[]>([]);
	const [query, setQuery] = useState("");
	const [level, setLevel] = useState<ElearningLevel | "ALL">("ALL");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");
	const canLearn = session.user.canAccessLearning || session.user.role === "ADMIN";

	async function loadCatalog(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			const [courseItems, historyItems] = await Promise.all([
				listPublicElearnings(),
				canLearn ? listHistory(session) : Promise.resolve([]),
			]);
			setCourses(courseItems);
			setHistory(historyItems);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadCatalog();
	}, [session.user.id]);

	const visibleCourses = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return courses.filter(course => {
			const matchesQuery =
				!normalizedQuery ||
				course.title.toLowerCase().includes(normalizedQuery) ||
				course.description.toLowerCase().includes(normalizedQuery);
			return matchesQuery && (level === "ALL" || course.level === level);
		});
	}, [courses, level, query]);

	function getCourseHistory(elearningId: string): HistorySummaryItem | undefined {
		return history.find(item => item.elearningId === elearningId);
	}

	if (isLoading) return <LoadingState description="We halen het actuele trainingsaanbod op." />;
	if (error)
		return (
			<ErrorState
				action={<Button onClick={() => void loadCatalog()}>Opnieuw proberen</Button>}
				description={error}
				title="Catalogus niet beschikbaar"
			/>
		);

	return (
		<>
			<PageHeader
				eyebrow="Ontdek de Academy"
				subtitle="Van stevige basis tot verdiepende expertise: kies wat past bij jouw volgende stap."
				title="E-learningcatalogus"
			/>
			<div className="catalog-toolbar">
				<div className="search-field">
					<Icon name="search" size={19} />
					<Input
						aria-label="Zoek in de catalogus"
						onChange={event => setQuery(event.target.value)}
						placeholder="Zoek op titel of onderwerp"
						type="search"
						value={query}
					/>
				</div>
				<Select
					aria-label="Filter op niveau"
					onChange={event => setLevel(event.target.value as ElearningLevel | "ALL")}
					value={level}
				>
					<option value="ALL">Alle niveaus</option>
					<option value="JUNIOR">Basis</option>
					<option value="MEDIOR">Gevorderd</option>
					<option value="SENIOR">Expert</option>
				</Select>
				<p>
					{visibleCourses.length} {visibleCourses.length === 1 ? "e-learning" : "e-learnings"}
				</p>
			</div>

			{visibleCourses.length > 0 ? (
				<div className="course-grid">
					{visibleCourses.map(course => {
						const enrollment = getCourseHistory(course.id);
						const progress = enrollment ? getProgress(enrollment, course) : undefined;
						return (
							<CourseCard
								course={course}
								key={course.id}
								onOpen={() => onNavigate(`/catalogus/${encodeURIComponent(course.id)}`)}
								onPrimary={canLearn ? () => onNavigate(`/leren/${encodeURIComponent(course.id)}`) : undefined}
								primaryLabel={
									enrollment?.status === "IN_PROGRESS"
										? "Ga verder"
										: enrollment?.status === "COMPLETED"
											? "Nogmaals bekijken"
											: "Start e-learning"
								}
								progress={progress}
							/>
						);
					})}
				</div>
			) : (
				<EmptyState
					action={
						query || level !== "ALL" ? (
							<Button
								onClick={() => {
									setQuery("");
									setLevel("ALL");
								}}
								variant="secondary"
							>
								Wis filters
							</Button>
						) : undefined
					}
					description={
						query || level !== "ALL"
							? "Probeer een andere zoekterm of bekijk alle niveaus."
							: "Er zijn op dit moment nog geen gepubliceerde e-learnings."
					}
					title={query || level !== "ALL" ? "Geen passende e-learnings" : "Het aanbod wordt voorbereid"}
				/>
			)}
		</>
	);
}

function getProgress(history: HistorySummaryItem, course: ElearningSummary): number {
	if (history.status === "COMPLETED") return 100;
	return Math.min(95, Math.round(((history.lastPosition + 1) / Math.max(course.sectionCount, 1)) * 100));
}
