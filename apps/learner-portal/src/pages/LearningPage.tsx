import type {
	CourseAssessmentView,
	ElearningSectionView,
	ElearningView,
	EnrollmentResumeView,
} from "@hackaithon/shared-types";
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
	const [retrySectionIds, setRetrySectionIds] = useState<string[] | null>(null);
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
			setRetrySectionIds(null);
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
	const isAwaitingReview = resume?.enrollment.status === "AWAITING_REVIEW";
	const isReadOnly = isCompleted || isAwaitingReview;
	const retryIndexes = useMemo(() => {
		if (!course || !retrySectionIds) return null;
		return retrySectionIds
			.map(sectionId => course.sections.findIndex(section => section.id === sectionId))
			.filter(index => index >= 0);
	}, [course, retrySectionIds]);
	const retryPosition = retryIndexes?.indexOf(currentIndex) ?? -1;
	const previousIndex = retryIndexes
		? retryPosition > 0
			? retryIndexes[retryPosition - 1]
			: undefined
		: currentIndex > 0
			? currentIndex - 1
			: undefined;
	const nextIndex = retryIndexes
		? retryPosition >= 0 && retryPosition < retryIndexes.length - 1
			? retryIndexes[retryPosition + 1]
			: undefined
		: course && currentIndex < course.sections.length - 1
			? currentIndex + 1
			: undefined;

	useEffect(() => {
		if (!dirtySectionId || !resume || !course || isReadOnly) {
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
		if (isCompleted || isAwaitingReview || isFinished) return 100;
		if (retryIndexes) {
			return Math.round((Math.max(retryPosition, 0) / Math.max(retryIndexes.length, 1)) * 100);
		}
		return Math.round((currentIndex / course.sections.length) * 100);
	}, [course, currentIndex, isCompleted, isFinished, retryIndexes, retryPosition]);

	async function saveSection(
		section: ElearningSectionView,
		position: number,
		markCompleted: boolean
	): Promise<EnrollmentResumeView | null> {
		if (!resume || isReadOnly) return resume;

		const updatedResume = await saveProgress(session, resume.enrollment.id, {
			sectionId: section.id,
			assignmentId: section.assignment?.id,
			answerText: answers[section.id] ?? "",
			position,
			markCompleted,
		});
		setResume(updatedResume);
		if (!markCompleted && updatedResume.newlyAwardedBadges.length > 0) {
			onFeedback({ type: "success", text: getBadgeUnlockMessage(updatedResume.newlyAwardedBadges) });
		}
		return updatedResume;
	}

	function updateAnswer(value: string): void {
		if (!activeSection || isReadOnly) return;
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
			const updatedResume = await saveSection(activeSection, currentIndex, true);
			if (!updatedResume) return;
			setDirtySectionId(null);
			setSaveStatus("saved");
			setIsFinished(true);
			if (updatedResume.assessment.awaitingReview) {
				setRetrySectionIds(null);
				onFeedback({
					type: "info",
					text: "Je antwoorden zijn ingestuurd. Een trainer of beheerder kijkt je open vragen na.",
				});
			} else if (updatedResume.assessment.passed) {
				setRetrySectionIds(null);
				onFeedback({
					type: "success",
					text: getCompletionMessage(updatedResume.newlyAwardedBadges.length),
				});
			} else {
				onFeedback({
					type: "info",
					text: `Je score is ${updatedResume.assessment.scorePercentage}%. Bekijk je antwoorden en probeer de foute vragen opnieuw.`,
				});
			}
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setIsNavigating(false);
		}
	}

	function startRetry(): void {
		if (!course || !resume || resume.assessment.incorrectAnswers.length === 0) return;

		const incorrectSectionIds = [...new Set(resume.assessment.incorrectAnswers.map(answer => answer.sectionId))];
		const firstRetryIndex = course.sections.findIndex(section => section.id === incorrectSectionIds[0]);
		setAnswers(current => ({
			...current,
			...Object.fromEntries(incorrectSectionIds.map(sectionId => [sectionId, ""])),
		}));
		setRetrySectionIds(incorrectSectionIds);
		setCurrentIndex(Math.max(firstRetryIndex, 0));
		setIsFinished(false);
		setDirtySectionId(null);
		setSaveStatus("idle");
		window.scrollTo({ top: 0, behavior: "smooth" });
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

	if (isAwaitingReview || (isFinished && resume.assessment.awaitingReview)) {
		return (
			<AssessmentPendingScreen
				assessment={resume.assessment}
				courseTitle={course.title}
				onNavigate={onNavigate}
				userName={session.user.name.split(" ")[0] ?? session.user.name}
			/>
		);
	}

	if (isFinished) {
		if (!resume.assessment.passed) {
			return (
				<AssessmentRetryScreen
					assessment={resume.assessment}
					courseTitle={course.title}
					onNavigate={onNavigate}
					onRetry={startRetry}
					userName={session.user.name.split(" ")[0] ?? session.user.name}
				/>
			);
		}

		const unlockedBadges = resume.newlyAwardedBadges;
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
					<p className="eyebrow">E-learning geslaagd</p>
					<h1>Mooi werk, {session.user.name.split(" ")[0] ?? session.user.name}!</h1>
					<p>
						Je hebt <strong>{course.title}</strong> afgerond met een score van {resume.assessment.scorePercentage}%.
						 Jouw resultaat staat veilig in je historie.
					</p>
					<div className="completion-screen__stats">
						<div>
							<small>Toetsresultaat</small>
							<strong>{resume.assessment.scorePercentage}%</strong>
							<span>minimaal {resume.assessment.requiredPercentage}% nodig</span>
						</div>
						<div>
							<small>Goed beantwoord</small>
							<strong>{resume.assessment.correctAnswers}</strong>
							<span>van {resume.assessment.totalQuestions} vragen</span>
						</div>
						<div>
							<small>Nieuwe badges</small>
							<strong>{unlockedBadges.length}</strong>
							<span>{unlockedBadges.length === 1 ? "badge vrijgespeeld" : "badges vrijgespeeld"}</span>
						</div>
					</div>
					{unlockedBadges.length > 0 ? (
						<div className="completion-screen__badges">
							<p className="eyebrow">Nieuw verdiend</p>
							<ul>
								{unlockedBadges.map(badge => (
									<li key={badge.id}>
										<span>
											<Icon name="award" size={18} />
										</span>
										<div>
											<strong>{badge.title}</strong>
											<small>{badge.description}</small>
										</div>
									</li>
								))}
							</ul>
						</div>
					) : null}
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

	const navigationSections = retrySectionIds
		? course.sections.filter(section => retrySectionIds.includes(section.id))
		: course.sections;
	const displayedPosition = retryIndexes ? Math.max(retryPosition + 1, 1) : currentIndex + 1;
	const displayedTotal = retryIndexes?.length ?? course.sections.length;

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
				<p className="eyebrow">{retrySectionIds ? "Jouw herkansing" : "Jouw leerpad"}</p>
				<h2>{course.title}</h2>
				<ProgressBar value={progressValue} />
				<nav aria-label="Onderdelen" className="lesson-navigation">
					<ol>
						{navigationSections.map(section => {
							const index = course.sections.findIndex(item => item.id === section.id);
							const progressEntry = resume.progressEntries.find(entry => entry.sectionId === section.id);
							const hasProgress = Boolean(progressEntry);
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
											{progressEntry?.isCorrect === false ? (
												<Icon name="close" size={15} />
											) : isCompleted || hasProgress || index < currentIndex ? (
												<Icon name="check" size={15} />
											) : (
												index + 1
											)}
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
							{retrySectionIds ? "Herkansing" : "Onderdeel"} {displayedPosition} van {displayedTotal}
						</p>
						<h1 id="lesson-title">{activeSection.title}</h1>
					</div>
					<SaveIndicator status={isReadOnly ? "idle" : saveStatus} />
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
									disabled={isReadOnly}
									onChange={updateAnswer}
									options={parseQuizOptions(activeSection.assignment.optionsJson)}
									selectedValue={answers[activeSection.id] ?? ""}
								/>
							) : (
								<div className="assignment__answer">
									<label htmlFor="lesson-answer">Jouw antwoord</label>
									<TextArea
										disabled={isReadOnly}
										id="lesson-answer"
										onChange={event => updateAnswer(event.target.value)}
										placeholder="Schrijf hier je antwoord. Dit wordt automatisch opgeslagen."
										value={answers[activeSection.id] ?? ""}
									/>
									<small>
										{isReadOnly
											? "Deze e-learning is ingestuurd; je antwoord is alleen-lezen."
											: "Je antwoord wordt automatisch opgeslagen. Open vragen tellen mee na beoordeling door een trainer of beheerder."}
									</small>
								</div>
							)}
						</section>
					) : null}
				</Card>

				<footer className="lesson-footer">
					<Button
						disabled={previousIndex === undefined || isNavigating}
						icon="arrow-left"
						onClick={() => previousIndex !== undefined && void goToSection(previousIndex)}
						variant="secondary"
					>
						Vorige
					</Button>
					<span>
						{displayedPosition} / {displayedTotal}
					</span>
					{nextIndex !== undefined ? (
						<Button
							disabled={isNavigating}
							icon="arrow-right"
							iconPosition="end"
							isLoading={isNavigating}
							onClick={() => void goToSection(nextIndex)}
						>
							{retrySectionIds ? "Volgende foute vraag" : "Volgende onderdeel"}
						</Button>
					) : isCompleted ? (
						<Button onClick={() => onNavigate("/historie")} icon="check">
							Bekijk historie
						</Button>
					) : (
						<Button disabled={isNavigating} icon="check" isLoading={isNavigating} onClick={() => void completeCourse()}>
							{retrySectionIds ? "Herkansing beoordelen" : "E-learning beoordelen"}
						</Button>
					)}
				</footer>
			</section>
		</div>
	);
}

type AssessmentRetryScreenProps = {
	assessment: CourseAssessmentView;
	courseTitle: string;
	onNavigate: (path: string) => void;
	onRetry: () => void;
	userName: string;
};

function AssessmentRetryScreen({
	assessment,
	courseTitle,
	onNavigate,
	onRetry,
	userName,
}: AssessmentRetryScreenProps): ReactElement {
	return (
		<section className="completion-screen completion-screen--retry">
			<div aria-hidden="true" className="completion-screen__rings">
				<span />
				<span />
				<span />
			</div>
			<div className="completion-screen__content">
				<div className="completion-screen__icon">
					<Icon name="edit" size={36} />
				</div>
				<p className="eyebrow">Poging beoordeeld</p>
				<h1>Nog niet geslaagd, {userName}</h1>
				<p>
					Voor <strong>{courseTitle}</strong> heb je minimaal {assessment.requiredPercentage}% nodig. Bekijk je foute
					 antwoorden en probeer alleen deze vragen opnieuw.
				</p>
				<div className="completion-screen__stats">
					<div>
						<small>Jouw resultaat</small>
						<strong>{assessment.scorePercentage}%</strong>
						<span>nog niet voldoende</span>
					</div>
					<div>
						<small>Goed beantwoord</small>
						<strong>{assessment.correctAnswers}</strong>
						<span>van {assessment.totalQuestions} vragen</span>
					</div>
					<div>
						<small>Opnieuw proberen</small>
						<strong>{assessment.incorrectAnswers.length}</strong>
						<span>foute of openstaande vragen</span>
					</div>
				</div>
				<div className="completion-screen__answers">
					<div>
						<p className="eyebrow">Dit kan beter</p>
						<h2>Fout beantwoorde vragen</h2>
					</div>
					<ul>
						{assessment.incorrectAnswers.map(answer => (
							<li key={answer.assignmentId}>
								<span>
									<Icon name="close" size={16} />
								</span>
								<div>
									<small>
										{answer.assignmentType === "OPEN_TEXT" ? "Open vraag" : "Quizvraag"} - {answer.sectionTitle}
									</small>
									<strong>{answer.prompt}</strong>
									<p>Jouw antwoord: {formatSelectedAnswer(answer.selectedAnswer)}</p>
									{answer.grade === null ? null : <p>Beoordeling: {formatGrade(answer.grade)}</p>}
									{answer.reviewerComment ? <p>Feedback: {answer.reviewerComment}</p> : null}
								</div>
							</li>
						))}
					</ul>
				</div>
				<div className="completion-screen__actions">
					<Button icon="edit" onClick={onRetry}>
						Foute antwoorden opnieuw doen
					</Button>
					<Button onClick={() => onNavigate("/dashboard")} variant="secondary">
						Later verder
					</Button>
				</div>
			</div>
		</section>
	);
}

type AssessmentPendingScreenProps = {
	assessment: CourseAssessmentView;
	courseTitle: string;
	onNavigate: (path: string) => void;
	userName: string;
};

function AssessmentPendingScreen({
	assessment,
	courseTitle,
	onNavigate,
	userName,
}: AssessmentPendingScreenProps): ReactElement {
	return (
		<section className="completion-screen completion-screen--pending">
			<div aria-hidden="true" className="completion-screen__rings">
				<span />
				<span />
				<span />
			</div>
			<div className="completion-screen__content">
				<div className="completion-screen__icon">
					<Icon name="clock" size={36} />
				</div>
				<p className="eyebrow">Ingestuurd</p>
				<h1>Je antwoorden worden nagekeken, {userName}</h1>
				<p>
					Voor <strong>{courseTitle}</strong> wachten je open vragen op beoordeling. Zodra alles is nagekeken,
					telt je resultaat mee in de {assessment.requiredPercentage}%-norm.
				</p>
				<div className="completion-screen__stats">
					<div>
						<small>Voorlopige score</small>
						<strong>{assessment.scorePercentage}%</strong>
						<span>kan nog stijgen na beoordeling</span>
					</div>
					<div>
						<small>Wacht op review</small>
						<strong>{assessment.pendingReviewAnswers.length}</strong>
						<span>open {assessment.pendingReviewAnswers.length === 1 ? "vraag" : "vragen"}</span>
					</div>
					<div>
						<small>Goed beantwoord</small>
						<strong>{assessment.correctAnswers}</strong>
						<span>van {assessment.totalQuestions} vragen</span>
					</div>
				</div>
				<div className="completion-screen__actions">
					<Button onClick={() => onNavigate("/dashboard")}>Naar dashboard</Button>
					<Button onClick={() => onNavigate("/historie")} variant="secondary">
						Bekijk historie
					</Button>
				</div>
			</div>
		</section>
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

function formatSelectedAnswer(value: string | null): string {
	const normalizedValue = value?.trim();
	if (!normalizedValue) return "Niet beantwoord";
	return normalizedValue;
}

function formatGrade(value: number): string {
	return value.toLocaleString("nl-NL", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
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

function getCompletionMessage(unlockedBadgeCount: number): string {
	if (unlockedBadgeCount <= 0) {
		return "Geweldig! Je bent geslaagd voor de e-learning.";
	}

	if (unlockedBadgeCount === 1) {
		return "Geweldig! Je bent geslaagd en hebt een nieuwe badge vrijgespeeld.";
	}

	return `Geweldig! Je bent geslaagd en hebt ${unlockedBadgeCount} nieuwe badges vrijgespeeld.`;
}

function getBadgeUnlockMessage(
	badges: EnrollmentResumeView["newlyAwardedBadges"]
): string {
	if (badges.length === 1) {
		return `Badge vrijgespeeld: ${badges[0]?.title}.`;
	}

	return `Nieuwe badges vrijgespeeld: ${badges.map(badge => badge.title).join(", ")}.`;
}
