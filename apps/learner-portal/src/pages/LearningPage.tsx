import type { ElearningSectionView, ElearningView, EnrollmentResumeView } from "@hackaithon/shared-types";
import { useEffect, useMemo, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import { Button, Card, EmptyState, ErrorState, LoadingState, ProgressBar, TextArea } from "../components/ui.js";
import { getElearning, getEnrollmentResume, listHistory, saveProgress, startEnrollment } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type LearningPageProps = {
	elearningId: string;
	onFeedback: (feedback: FeedbackMessage) => void;
	onNavigate: (path: string) => void;
	session: SessionState;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

// oxlint-disable-next-line eslint/complexity -- Learning state intentionally handles loading, empty, active and completion views.
export function LearningPage({ elearningId, onFeedback, onNavigate, session }: LearningPageProps): ReactElement {
	const [course, setCourse] = useState<ElearningView | null>(null);
	const [resume, setResume] = useState<EnrollmentResumeView | null>(null);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [dirtySectionId, setDirtySectionId] = useState<string | null>(null);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [isLoading, setIsLoading] = useState(true);
	const [isNavigating, setIsNavigating] = useState(false);
	const [isFinished, setIsFinished] = useState(false);
	const [error, setError] = useState("");

	async function loadLearningEnvironment(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			const [courseData, historyItems] = await Promise.all([getElearning(session, elearningId), listHistory(session)]);
			const existingHistory = historyItems.find(item => item.elearningId === elearningId);
			const enrollmentId = existingHistory?.enrollmentId ?? (await startEnrollment(session, elearningId)).id;
			const resumeData = await getEnrollmentResume(session, enrollmentId);

			setCourse(courseData);
			setResume(resumeData);
			setCurrentIndex(clampPosition(resumeData.enrollment.lastPosition, courseData.sections.length));
			setAnswers(buildInitialAnswers(courseData.sections, resumeData));
			setIsFinished(false);
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadLearningEnvironment();
	}, [elearningId]);

	const activeSection = course?.sections[currentIndex];
	const isCompleted = resume?.enrollment.status === "COMPLETED";

	useEffect(() => {
		if (!dirtySectionId || !resume || !course || isCompleted) {
			return;
		}

		const section = course.sections.find(item => item.id === dirtySectionId);
		if (!section) {
			return;
		}

		setSaveStatus("saving");
		const timeout = window.setTimeout(() => {
			void saveSection(section, currentIndex, false)
				.then((): void => {
					setDirtySectionId(current => (current === section.id ? null : current));
					setSaveStatus("saved");
				})
				.catch((): void => setSaveStatus("error"));
		}, 750);

		return (): void => window.clearTimeout(timeout);
	}, [answers, dirtySectionId]);

	const progressValue = useMemo(() => {
		if (!course || course.sections.length === 0) return 0;
		if (isCompleted || isFinished) return 100;
		return Math.round((currentIndex / course.sections.length) * 100);
	}, [course, currentIndex, isCompleted, isFinished]);

	async function saveSection(
		section: ElearningSectionView,
		position: number,
		markCompleted: boolean
	): Promise<EnrollmentResumeView | null> {
		if (!resume || isCompleted) return resume;

		const updatedResume = await saveProgress(session, resume.enrollment.id, {
			sectionId: section.id,
			assignmentId: section.assignment?.id,
			answerText: answers[section.id]?.trim() || undefined,
			position,
			markCompleted,
		});
		setResume(updatedResume);
		return updatedResume;
	}

	function updateAnswer(value: string): void {
		if (!activeSection || isCompleted) return;
		setAnswers(current => ({ ...current, [activeSection.id]: value }));
		setDirtySectionId(activeSection.id);
		setSaveStatus("idle");
	}

	async function goToSection(nextIndex: number): Promise<void> {
		if (!course || !activeSection || nextIndex < 0 || nextIndex >= course.sections.length) return;
		setIsNavigating(true);
		try {
			await saveSection(activeSection, nextIndex, false);
			setDirtySectionId(null);
			setSaveStatus(isCompleted ? "idle" : "saved");
			setCurrentIndex(nextIndex);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setIsNavigating(false);
		}
	}

	async function completeCourse(): Promise<void> {
		if (!course || !activeSection) return;
		setIsNavigating(true);
		try {
			await saveSection(activeSection, currentIndex, true);
			setDirtySectionId(null);
			setSaveStatus("saved");
			setIsFinished(true);
			onFeedback({ type: "success", text: "Geweldig! Je hebt de e-learning afgerond." });
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setIsNavigating(false);
		}
	}

	if (isLoading) return <LoadingState description="Je leeromgeving wordt klaargezet." />;
	if (error)
		return (
			<ErrorState
				action={
					<>
						<Button onClick={() => void loadLearningEnvironment()}>Opnieuw proberen</Button>
						<Button onClick={() => onNavigate(`/catalogus/${encodeURIComponent(elearningId)}`)} variant="ghost">
							Terug naar details
						</Button>
					</>
				}
				description={error}
				title="Leeromgeving niet beschikbaar"
			/>
		);
	if (!course || !resume)
		return <ErrorState description="De leeromgeving kon niet worden geopend." title="Er ging iets mis" />;
	if (course.sections.length === 0 || !activeSection)
		return (
			<EmptyState
				action={
					<Button onClick={() => onNavigate(`/catalogus/${encodeURIComponent(course.id)}`)} variant="secondary">
						Terug naar details
					</Button>
				}
				description="De trainer is de lesinhoud nog aan het voorbereiden."
				title="Nog geen onderdelen"
			/>
		);

	if (isFinished) {
		return (
			<section className="completion-screen">
				<div aria-hidden="true" className="completion-screen__rings">
					<span />
					<span />
					<span />
				</div>
				<div className="completion-screen__content">
					<div className="completion-screen__icon">
						<Icon name="award" size={40} />
					</div>
					<p className="eyebrow">E-learning afgerond</p>
					<h1>Mooi werk, {session.user.name.split(" ")[0] ?? session.user.name}!</h1>
					<p>
						Je hebt alle onderdelen van <strong>{course.title}</strong> doorlopen. Jouw voortgang staat veilig in je
						historie.
					</p>
					<div className="completion-screen__actions">
						<Button onClick={() => onNavigate("/historie")}>Bekijk mijn historie</Button>
						<Button onClick={() => onNavigate("/catalogus")} variant="secondary">
							Ontdek meer
						</Button>
					</div>
				</div>
			</section>
		);
	}

	return (
		<div className="learning-layout">
			<aside className="learning-sidebar">
				<button
					className="back-link"
					onClick={() => onNavigate(`/catalogus/${encodeURIComponent(course.id)}`)}
					type="button"
				>
					<Icon name="arrow-left" size={18} /> E-learning sluiten
				</button>
				<p className="eyebrow">Jouw leerpad</p>
				<h2>{course.title}</h2>
				<ProgressBar value={progressValue} />
				<nav aria-label="Onderdelen" className="lesson-navigation">
					<ol>
						{course.sections.map((section, index) => {
							const hasProgress = resume.progressEntries.some(entry => entry.sectionId === section.id);
							const isActive = index === currentIndex;
							return (
								<li key={section.id}>
									<button
										aria-current={isActive ? "step" : undefined}
										className={
											isActive ? "lesson-navigation__item lesson-navigation__item--active" : "lesson-navigation__item"
										}
										onClick={() => void goToSection(index)}
										type="button"
									>
										<span>
											{isCompleted || hasProgress || index < currentIndex ? <Icon name="check" size={15} /> : index + 1}
										</span>
										<span>
											<small>Onderdeel {index + 1}</small>
											<strong>{section.title}</strong>
										</span>
									</button>
								</li>
							);
						})}
					</ol>
				</nav>
			</aside>

			<section className="lesson-view" aria-labelledby="lesson-title">
				<header className="lesson-view__header">
					<div>
						<p className="eyebrow">
							Onderdeel {currentIndex + 1} van {course.sections.length}
						</p>
						<h1 id="lesson-title">{activeSection.title}</h1>
					</div>
					<SaveIndicator status={isCompleted ? "idle" : saveStatus} />
				</header>

				<Card className="lesson-content">
					<div className="lesson-content__body">{formatLessonContent(activeSection.content)}</div>
					{activeSection.assignment ? (
						<section className="assignment" aria-labelledby="assignment-title">
							<div className="assignment__heading">
								<span>
									<Icon name="edit" size={20} />
								</span>
								<div>
									<p className="eyebrow">Kennischeck</p>
									<h2 id="assignment-title">{activeSection.assignment.prompt}</h2>
								</div>
							</div>
							{activeSection.assignment.assignmentType === "QUIZ" ? (
								<QuizOptions
									disabled={isCompleted}
									onChange={updateAnswer}
									options={parseQuizOptions(activeSection.assignment.optionsJson)}
									selectedValue={answers[activeSection.id] ?? ""}
								/>
							) : (
								<div className="assignment__answer">
									<label htmlFor="lesson-answer">Jouw antwoord</label>
									<TextArea
										disabled={isCompleted}
										id="lesson-answer"
										onChange={event => updateAnswer(event.target.value)}
										placeholder="Schrijf hier je antwoord. Dit wordt automatisch opgeslagen."
										value={answers[activeSection.id] ?? ""}
									/>
									<small>
										{isCompleted
											? "Deze e-learning is afgerond; je antwoord is alleen-lezen."
											: "Je antwoord wordt automatisch opgeslagen."}
									</small>
								</div>
							)}
						</section>
					) : null}
				</Card>

				<footer className="lesson-footer">
					<Button
						disabled={currentIndex === 0 || isNavigating}
						icon="arrow-left"
						onClick={() => void goToSection(currentIndex - 1)}
						variant="secondary"
					>
						Vorige
					</Button>
					<span>
						{currentIndex + 1} / {course.sections.length}
					</span>
					{currentIndex < course.sections.length - 1 ? (
						<Button
							disabled={isNavigating}
							icon="arrow-right"
							iconPosition="end"
							isLoading={isNavigating}
							onClick={() => void goToSection(currentIndex + 1)}
						>
							Volgende onderdeel
						</Button>
					) : isCompleted ? (
						<Button onClick={() => onNavigate("/historie")} icon="check">
							Bekijk historie
						</Button>
					) : (
						<Button disabled={isNavigating} icon="check" isLoading={isNavigating} onClick={() => void completeCourse()}>
							E-learning afronden
						</Button>
					)}
				</footer>
			</section>
		</div>
	);
}

function SaveIndicator({ status }: { status: SaveStatus }): ReactElement | null {
	if (status === "idle") return null;
	return (
		<div aria-live="polite" className={`save-indicator save-indicator--${status}`}>
			{status === "saving" ? (
				<span className="button__spinner" />
			) : (
				<Icon name={status === "error" ? "close" : "check"} size={16} />
			)}
			<span>{status === "saving" ? "Opslaan..." : status === "error" ? "Opslaan mislukt" : "Opgeslagen"}</span>
		</div>
	);
}

type QuizOptionsProps = {
	disabled: boolean;
	onChange: (value: string) => void;
	options: string[];
	selectedValue: string;
};

function QuizOptions({ disabled, onChange, options, selectedValue }: QuizOptionsProps): ReactElement {
	if (options.length === 0)
		return <p className="muted-copy">De antwoordopties voor deze kennischeck worden nog voorbereid.</p>;
	return (
		<fieldset className="quiz-options" disabled={disabled}>
			<legend className="visually-hidden">Kies één antwoord</legend>
			{options.map(option => (
				<label className={selectedValue === option ? "quiz-option quiz-option--selected" : "quiz-option"} key={option}>
					<input
						checked={selectedValue === option}
						name="quiz-answer"
						onChange={() => onChange(option)}
						type="radio"
						value={option}
					/>
					<span className="quiz-option__radio" />
					<span>{option}</span>
				</label>
			))}
		</fieldset>
	);
}

function parseQuizOptions(value: string | null): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map(item => (typeof item === "string" ? item : getOptionLabel(item)))
			.filter((item): item is string => Boolean(item));
	} catch {
		return [];
	}
}

function getOptionLabel(value: unknown): string | null {
	if (typeof value !== "object" || value === null) return null;
	if ("label" in value && typeof value.label === "string") return value.label;
	if ("value" in value && typeof value.value === "string") return value.value;
	return null;
}

function formatLessonContent(content: string): ReactElement {
	const paragraphs = content
		.split(/\n{2,}/)
		.map(paragraph => paragraph.trim())
		.filter(Boolean);
	return (
		<div>
			{paragraphs.map((paragraph, index) => (
				<p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
			))}
		</div>
	);
}

function buildInitialAnswers(sections: ElearningSectionView[], resume: EnrollmentResumeView): Record<string, string> {
	return Object.fromEntries(
		sections.map(section => {
			const entry = resume.progressEntries.find(item => item.sectionId === section.id);
			return [section.id, entry?.answerText ?? ""];
		})
	);
}

function clampPosition(position: number, sectionCount: number): number {
	return Math.min(Math.max(position, 0), Math.max(sectionCount - 1, 0));
}
