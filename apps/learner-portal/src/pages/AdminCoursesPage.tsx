import type {
	AssignmentType,
	CreateElearningRequest,
	ElearningLevel,
	ElearningSummary,
	ElearningView,
} from "@hackaithon/shared-types";
import { estimateElearningDurationMinutes } from "@hackaithon/shared-types";
import { useEffect, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import {
	Button,
	Card,
	Dialog,
	EmptyState,
	ErrorState,
	FormField,
	Input,
	LoadingState,
	PageHeader,
	Select,
	StatusBadge,
	TextArea,
} from "../components/ui.js";
import { createElearning, getElearning, listManagedElearnings, publishElearning, updateElearning } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type AdminCoursesPageProps = {
	onFeedback: (feedback: FeedbackMessage) => void;
	session: SessionState;
};

export function AdminCoursesPage({ onFeedback, session }: AdminCoursesPageProps): ReactElement {
	const [courses, setCourses] = useState<ElearningSummary[]>([]);
	const [editingCourse, setEditingCourse] = useState<ElearningView | null>(null);
	const [isEditorOpen, setIsEditorOpen] = useState(false);
	const [publishTarget, setPublishTarget] = useState<ElearningSummary | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [busyCourseId, setBusyCourseId] = useState<string | null>(null);
	const [error, setError] = useState("");

	async function loadCourses(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			setCourses(await listManagedElearnings(session));
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadCourses();
	}, [session.user.id]);

	function openCreate(): void {
		setEditingCourse(null);
		setIsEditorOpen(true);
	}

	async function openEdit(courseId: string): Promise<void> {
		setBusyCourseId(courseId);
		try {
			setEditingCourse(await getElearning(session, courseId));
			setIsEditorOpen(true);
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyCourseId(null);
		}
	}

	async function handlePublish(): Promise<void> {
		if (!publishTarget) return;
		setBusyCourseId(publishTarget.id);
		try {
			await publishElearning(session, publishTarget.id);
			onFeedback({ type: "success", text: `${publishTarget.title} is gepubliceerd.` });
			setPublishTarget(null);
			await loadCourses();
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyCourseId(null);
		}
	}

	async function handleSaved(): Promise<void> {
		setIsEditorOpen(false);
		setEditingCourse(null);
		await loadCourses();
	}

	if (isLoading) return <LoadingState description="We halen het e-learningbeheer op." />;
	if (error)
		return (
			<ErrorState
				action={<Button onClick={() => void loadCourses()}>Opnieuw proberen</Button>}
				description={error}
				title="Beheer niet beschikbaar"
			/>
		);

	return (
		<>
			<PageHeader
				actions={
					<Button icon="plus" onClick={openCreate}>
						Nieuwe e-learning
					</Button>
				}
				eyebrow="Academy beheer"
				subtitle="Maak lesstof overzichtelijk, controleer de inhoud en publiceer wanneer alles klaarstaat."
				title="E-learnings beheren"
			/>

			<div className="management-summary">
				<div>
					<strong>{courses.length}</strong>
					<span>Totaal</span>
				</div>
				<div>
					<strong>{courses.filter(course => course.status === "DRAFT").length}</strong>
					<span>Concept</span>
				</div>
				<div>
					<strong>{courses.filter(course => course.status === "PUBLISHED").length}</strong>
					<span>Gepubliceerd</span>
				</div>
			</div>

			{courses.length > 0 ? (
				<div className="management-list">
					{courses.map(course => (
						<Card as="article" className="management-course" key={course.id}>
							<div className={`management-course__visual management-course__visual--${course.level.toLowerCase()}`}>
								<Icon name="book" size={24} />
							</div>
							<div className="management-course__copy">
								<div>
									<StatusBadge status={course.status} />
									<StatusBadge status={course.level} />
								</div>
								<h2>{course.title}</h2>
								<p>{course.description}</p>
								<small>
									<Icon name="layers" size={15} /> {course.sectionCount}{" "}
									{course.sectionCount === 1 ? "onderdeel" : "onderdelen"}
									{course.publishedAtIso ? ` · gepubliceerd ${formatDate(course.publishedAtIso)}` : ""}
								</small>
							</div>
							<div className="management-course__actions">
								<Button
									disabled={busyCourseId === course.id}
									icon="edit"
									isLoading={busyCourseId === course.id}
									onClick={() => void openEdit(course.id)}
									variant="secondary"
								>
									Bewerken
								</Button>
								{course.status === "DRAFT" ? (
									<Button icon="arrow-right" iconPosition="end" onClick={() => setPublishTarget(course)}>
										Publiceren
									</Button>
								) : null}
							</div>
						</Card>
					))}
				</div>
			) : (
				<EmptyState
					action={
						<Button icon="plus" onClick={openCreate}>
							Maak je eerste e-learning
						</Button>
					}
					description="Zet je expertise om in een helder leerpad voor deelnemers."
					title="Nog geen e-learnings"
				/>
			)}

			<Dialog
				isOpen={isEditorOpen}
				onClose={() => setIsEditorOpen(false)}
				size="large"
				title={editingCourse ? "E-learning bewerken" : "Nieuwe e-learning"}
			>
				<CourseEditor
					course={editingCourse}
					onCancel={() => setIsEditorOpen(false)}
					onFeedback={onFeedback}
					onSaved={handleSaved}
					session={session}
				/>
			</Dialog>

			<Dialog
				footer={
					<>
						<Button onClick={() => setPublishTarget(null)} variant="ghost">
							Annuleren
						</Button>
						<Button isLoading={busyCourseId === publishTarget?.id} onClick={() => void handlePublish()}>
							Nu publiceren
						</Button>
					</>
				}
				isOpen={Boolean(publishTarget)}
				onClose={() => setPublishTarget(null)}
				title="E-learning publiceren?"
			>
				<p>
					<strong>{publishTarget?.title}</strong> wordt direct zichtbaar voor alle goedgekeurde deelnemers.
				</p>
			</Dialog>
		</>
	);
}

type DraftAssignmentType = AssignmentType | "NONE";

type DraftSection = {
	assignmentType: DraftAssignmentType;
	content: string;
	correctAnswer: string;
	key: string;
	optionsText: string;
	points: number;
	prompt: string;
	title: string;
};

type CourseDraft = {
	description: string;
	level: ElearningLevel;
	sections: DraftSection[];
	title: string;
};

type CourseEditorProps = {
	course: ElearningView | null;
	onCancel: () => void;
	onFeedback: (feedback: FeedbackMessage) => void;
	onSaved: () => Promise<void>;
	session: SessionState;
};

function CourseEditor({ course, onCancel, onFeedback, onSaved, session }: CourseEditorProps): ReactElement {
	const [draft, setDraft] = useState<CourseDraft>(() => buildDraft(course));
	const [step, setStep] = useState(1);
	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const estimatedDurationMinutes = estimateDraftDurationMinutes(draft);

	function goNext(): void {
		const validationError = validateStep(draft, step);
		if (validationError) {
			setError(validationError);
			return;
		}

		setError("");
		setStep(current => Math.min(3, current + 1));
	}

	function updateSection(index: number, changes: Partial<DraftSection>): void {
		setDraft(current => ({
			...current,
			sections: current.sections.map((section, sectionIndex) =>
				sectionIndex === index ? { ...section, ...changes } : section
			),
		}));
	}

	function addSection(): void {
		setDraft(current => ({ ...current, sections: [...current.sections, createDraftSection(current.sections.length)] }));
	}

	function removeSection(index: number): void {
		setDraft(current => ({
			...current,
			sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index),
		}));
	}

	async function handleSave(): Promise<void> {
		const validationError = validateStep(draft, 2);
		if (validationError) {
			setError(validationError);
			setStep(2);
			return;
		}

		setIsSaving(true);
		setError("");
		try {
			const payload = buildPayload(draft);
			if (course) {
				await updateElearning(session, course.id, payload);
			} else {
				await createElearning(session, payload);
			}
			onFeedback({
				type: "success",
				text: course ? "De e-learning is bijgewerkt." : "De e-learning is als concept opgeslagen.",
			});
			await onSaved();
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<div className="course-editor">
			<ol aria-label="Stappen" className="stepper">
				<li className={step >= 1 ? "stepper__active" : ""}>
					<span>1</span>
					<small>Basis</small>
				</li>
				<li className={step >= 2 ? "stepper__active" : ""}>
					<span>2</span>
					<small>Inhoud</small>
				</li>
				<li className={step >= 3 ? "stepper__active" : ""}>
					<span>3</span>
					<small>Controleren</small>
				</li>
			</ol>
			{error ? (
				<div className="form-alert" role="alert">
					{error}
				</div>
			) : null}

			{step === 1 ? (
				<div className="form-grid form-grid--single">
					<div>
						<p className="eyebrow">Stap 1</p>
						<h3>De basis van je e-learning</h3>
						<p className="muted-copy">Geef deelnemers een helder beeld van onderwerp en niveau.</p>
					</div>
					<FormField htmlFor="course-title" label="Titel" required>
						<Input
							id="course-title"
							onChange={event => setDraft(current => ({ ...current, title: event.target.value }))}
							placeholder="Bijvoorbeeld Introductie testautomatisering"
							value={draft.title}
						/>
					</FormField>
					<FormField
						hint="Vertel kort wat de deelnemer leert en waarom dit relevant is."
						htmlFor="course-description"
						label="Korte beschrijving"
						required
					>
						<TextArea
							id="course-description"
							onChange={event => setDraft(current => ({ ...current, description: event.target.value }))}
							placeholder="Beschrijf de e-learning in enkele zinnen."
							value={draft.description}
						/>
					</FormField>
					<FormField htmlFor="course-level" label="Niveau" required>
						<Select
							id="course-level"
							onChange={event => setDraft(current => ({ ...current, level: event.target.value as ElearningLevel }))}
							value={draft.level}
						>
							<option value="JUNIOR">Basis</option>
							<option value="MEDIOR">Gevorderd</option>
							<option value="SENIOR">Expert</option>
						</Select>
					</FormField>
				</div>
			) : null}

			{step === 2 ? (
				<div className="editor-sections">
					<div className="editor-sections__heading">
						<div>
							<p className="eyebrow">Stap 2</p>
							<h3>Bouw het leerpad op</h3>
							<p className="muted-copy">Deelnemers zien steeds één onderdeel tegelijk.</p>
						</div>
						<Button icon="plus" onClick={addSection} type="button" variant="secondary">
							Onderdeel toevoegen
						</Button>
					</div>
					{draft.sections.map((section, index) => (
						<section className="editor-section" key={section.key}>
							<header>
								<div>
									<span>{String(index + 1).padStart(2, "0")}</span>
									<h4>Onderdeel {index + 1}</h4>
								</div>
								{draft.sections.length > 1 ? (
									<Button onClick={() => removeSection(index)} type="button" variant="ghost">
										Verwijderen
									</Button>
								) : null}
							</header>
							<div className="form-grid">
								<FormField htmlFor={`section-title-${section.key}`} label="Titel" required>
									<Input
										id={`section-title-${section.key}`}
										onChange={event => updateSection(index, { title: event.target.value })}
										placeholder="Titel van dit onderdeel"
										value={section.title}
									/>
								</FormField>
								<FormField htmlFor={`section-assignment-${section.key}`} label="Afsluiting">
									<Select
										id={`section-assignment-${section.key}`}
										onChange={event =>
											updateSection(index, { assignmentType: event.target.value as DraftAssignmentType })
										}
										value={section.assignmentType}
									>
										<option value="NONE">Geen opdracht</option>
										<option value="OPEN_TEXT">Open vraag</option>
										<option value="QUIZ">Meerkeuzevraag</option>
									</Select>
								</FormField>
								<div className="form-grid__full">
									<FormField htmlFor={`section-content-${section.key}`} label="Lesinhoud" required>
										<TextArea
											id={`section-content-${section.key}`}
											onChange={event => updateSection(index, { content: event.target.value })}
											placeholder="Schrijf de uitleg, voorbeelden en belangrijkste inzichten."
											value={section.content}
										/>
									</FormField>
								</div>
								{section.assignmentType !== "NONE" ? (
									<div className="form-grid__full">
										<FormField htmlFor={`section-prompt-${section.key}`} label="Vraag of opdracht" required>
											<Input
												id={`section-prompt-${section.key}`}
												onChange={event => updateSection(index, { prompt: event.target.value })}
												placeholder="Wat wil je de deelnemer laten beantwoorden?"
												value={section.prompt}
											/>
										</FormField>
									</div>
								) : null}
								{section.assignmentType === "QUIZ" ? (
									<>
										<div className="form-grid__full">
											<FormField
												hint="Zet ieder antwoord op een nieuwe regel."
												htmlFor={`section-options-${section.key}`}
												label="Antwoordopties"
												required
											>
												<TextArea
													id={`section-options-${section.key}`}
													onChange={event => updateSection(index, { optionsText: event.target.value })}
													placeholder={"Antwoord A\nAntwoord B\nAntwoord C"}
													value={section.optionsText}
												/>
											</FormField>
										</div>
										<FormField htmlFor={`section-correct-${section.key}`} label="Juiste antwoord">
											<Select
												id={`section-correct-${section.key}`}
												onChange={event => updateSection(index, { correctAnswer: event.target.value })}
												value={section.correctAnswer}
											>
												<option value="">Kies het juiste antwoord</option>
												{getOptionLines(section.optionsText).map(option => (
													<option key={option} value={option}>
														{option}
													</option>
												))}
											</Select>
										</FormField>
										<FormField htmlFor={`section-points-${section.key}`} label="Punten">
											<Input
												id={`section-points-${section.key}`}
												min={0}
												onChange={event => updateSection(index, { points: Number(event.target.value) })}
												type="number"
												value={section.points}
											/>
										</FormField>
									</>
								) : null}
							</div>
						</section>
					))}
				</div>
			) : null}

			{step === 3 ? (
				<div className="editor-review">
					<div>
						<p className="eyebrow">Stap 3</p>
						<h3>Klaar voor controle</h3>
						<p className="muted-copy">
							Controleer de samenvatting. Je slaat eerst een concept op; publiceren doe je daarna vanuit het overzicht.
						</p>
					</div>
					<Card className="review-card">
						<div>
							<StatusBadge status={draft.level} />
							<StatusBadge status={course?.status ?? "DRAFT"} />
						</div>
						<h2>{draft.title}</h2>
						<p>{draft.description}</p>
						<dl>
							<div>
								<dt>Onderdelen</dt>
								<dd>{draft.sections.length}</dd>
							</div>
							<div>
								<dt>Opdrachten</dt>
								<dd>{draft.sections.filter(section => section.assignmentType !== "NONE").length}</dd>
							</div>
							<div>
								<dt>Geschatte duur</dt>
								<dd>{estimatedDurationMinutes} min</dd>
							</div>
						</dl>
						<ol>
							{draft.sections.map((section, index) => (
								<li key={section.key}>
									<span>{index + 1}</span>
									<div>
										<strong>{section.title}</strong>
										<small>
											{section.assignmentType === "NONE"
												? "Lesstof"
												: section.assignmentType === "QUIZ"
													? "Lesstof en meerkeuzevraag"
													: "Lesstof en open vraag"}
										</small>
									</div>
								</li>
							))}
						</ol>
					</Card>
				</div>
			) : null}

			<div className="form-actions editor-actions">
				<Button
					onClick={
						step === 1
							? onCancel
							: () => {
									setError("");
									setStep(current => current - 1);
								}
					}
					type="button"
					variant="ghost"
				>
					{step === 1 ? "Annuleren" : "Vorige stap"}
				</Button>
				{step < 3 ? (
					<Button icon="arrow-right" iconPosition="end" onClick={goNext} type="button">
						Volgende stap
					</Button>
				) : (
					<Button icon="check" isLoading={isSaving} onClick={() => void handleSave()} type="button">
						{course ? "Wijzigingen opslaan" : "Concept opslaan"}
					</Button>
				)}
			</div>
		</div>
	);
}

function createDraftSection(index: number): DraftSection {
	return {
		assignmentType: "NONE",
		content: "",
		correctAnswer: "",
		key: `section-${Date.now()}-${index}`,
		optionsText: "",
		points: 10,
		prompt: "",
		title: "",
	};
}

function buildDraft(course: ElearningView | null): CourseDraft {
	if (!course) return { description: "", level: "JUNIOR", sections: [createDraftSection(0)], title: "" };
	return {
		description: course.description,
		level: course.level,
		sections: course.sections.map((section, index) => ({
			assignmentType: section.assignment?.assignmentType ?? "NONE",
			content: section.content,
			correctAnswer: parseCorrectAnswer(section.assignment?.correctAnswerJson ?? null),
			key: `existing-${index}-${section.id}`,
			optionsText: parseOptionsText(section.assignment?.optionsJson ?? null),
			points: section.assignment?.points ?? 10,
			prompt: section.assignment?.prompt ?? "",
			title: section.title,
		})),
		title: course.title,
	};
}

function validateStep(draft: CourseDraft, step: number): string {
	if (step === 1 && (!draft.title.trim() || !draft.description.trim())) return "Vul een titel en beschrijving in.";
	if (step === 2) {
		if (draft.sections.length === 0) return "Voeg minimaal één onderdeel toe.";
		for (const [index, section] of draft.sections.entries()) {
			if (!section.title.trim() || !section.content.trim())
				return `Vul de titel en lesinhoud van onderdeel ${index + 1} in.`;
			if (section.assignmentType !== "NONE" && !section.prompt.trim())
				return `Vul de opdracht van onderdeel ${index + 1} in.`;
			if (section.assignmentType === "QUIZ" && getOptionLines(section.optionsText).length < 2)
				return `Voeg minimaal twee antwoordopties toe bij onderdeel ${index + 1}.`;
		}
	}
	return "";
}

function buildPayload(draft: CourseDraft): CreateElearningRequest {
	return {
		description: draft.description.trim(),
		level: draft.level,
		sections: draft.sections.map(section => ({
			assignment:
				section.assignmentType === "NONE"
					? undefined
					: {
							assignmentType: section.assignmentType,
							correctAnswerJson:
								section.assignmentType === "QUIZ" && section.correctAnswer
									? JSON.stringify(section.correctAnswer)
									: undefined,
							optionsJson:
								section.assignmentType === "QUIZ" ? JSON.stringify(getOptionLines(section.optionsText)) : undefined,
							points: section.points,
							prompt: section.prompt.trim(),
						},
			content: section.content.trim(),
			title: section.title.trim(),
		})),
		title: draft.title.trim(),
	};
}

function estimateDraftDurationMinutes(draft: CourseDraft): number {
	return estimateElearningDurationMinutes({
		description: draft.description,
		level: draft.level,
		sections: draft.sections.map(section => ({
			title: section.title,
			content: section.content,
			assignment:
				section.assignmentType === "NONE"
					? null
					: {
							assignmentType: section.assignmentType,
							optionsJson: section.assignmentType === "QUIZ" ? JSON.stringify(getOptionLines(section.optionsText)) : null,
							prompt: section.prompt,
						},
		})),
	});
}

function getOptionLines(value: string): string[] {
	return value
		.split("\n")
		.map(line => line.trim())
		.filter(Boolean);
}

function parseOptionsText(value: string | null): string {
	if (!value) return "";
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").join("\n") : "";
	} catch {
		return "";
	}
}

function parseCorrectAnswer(value: string | null): string {
	if (!value) return "";
	try {
		const parsed = JSON.parse(value) as unknown;
		return typeof parsed === "string" ? parsed : "";
	} catch {
		return "";
	}
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
