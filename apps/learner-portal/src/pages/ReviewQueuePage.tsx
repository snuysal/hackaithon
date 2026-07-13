import type { PendingOpenAnswerReviewView } from "@hackaithon/shared-types";
import { useEffect, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import { Button, Card, EmptyState, ErrorState, Input, LoadingState, PageHeader, TextArea } from "../components/ui.js";
import { listPendingOpenAnswerReviews, reviewOpenAnswer } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type ReviewQueuePageProps = {
	onFeedback: (feedback: FeedbackMessage) => void;
	session: SessionState;
};

type ReviewFormState = {
	comment: string;
	grade: string;
};

export function ReviewQueuePage({ onFeedback, session }: ReviewQueuePageProps): ReactElement {
	const [items, setItems] = useState<PendingOpenAnswerReviewView[]>([]);
	const [forms, setForms] = useState<Record<string, ReviewFormState>>({});
	const [reviewingId, setReviewingId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	async function loadReviews(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			const reviewItems = await listPendingOpenAnswerReviews(session);
			setItems(reviewItems);
			setForms(current => ({
				...Object.fromEntries(reviewItems.map(item => [item.progressEntryId, current[item.progressEntryId] ?? { comment: "", grade: "" }])),
			}));
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadReviews();
	}, [session.user.id]);

	function updateForm(progressEntryId: string, patch: Partial<ReviewFormState>): void {
		setForms(current => ({
			...current,
			[progressEntryId]: {
				comment: current[progressEntryId]?.comment ?? "",
				grade: current[progressEntryId]?.grade ?? "",
				...patch,
			},
		}));
	}

	async function submitReview(item: PendingOpenAnswerReviewView): Promise<void> {
		const form = forms[item.progressEntryId] ?? { comment: "", grade: "" };
		const grade = Number(form.grade.replace(",", "."));
		if (!Number.isFinite(grade) || grade < 1 || grade > 10) {
			onFeedback({ type: "error", text: "Vul een cijfer tussen 1 en 10 in." });
			return;
		}

		setReviewingId(item.progressEntryId);
		try {
			const result = await reviewOpenAnswer(session, item.progressEntryId, {
				comment: form.comment.trim() || undefined,
				grade,
			});
			setItems(current => current.filter(currentItem => currentItem.progressEntryId !== item.progressEntryId));
			setForms(current => {
				const { [item.progressEntryId]: _removed, ...remainingForms } = current;
				return remainingForms;
			});
			onFeedback({
				type: result.assessment.passed ? "success" : "info",
				text: getReviewFeedbackMessage(result.assessment.awaitingReview, result.assessment.passed),
			});
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setReviewingId(null);
		}
	}

	if (isLoading) return <LoadingState description="We halen open antwoorden op die nagekeken moeten worden." />;
	if (error)
		return (
			<ErrorState
				action={<Button onClick={() => void loadReviews()}>Opnieuw proberen</Button>}
				description={error}
				title="Nakijklijst niet beschikbaar"
			/>
		);

	return (
		<>
			<PageHeader
				eyebrow="Beoordelen"
				subtitle="Geef open antwoorden een cijfer. Vanaf 5,5 telt de vraag als geslaagd mee in de 70%-norm."
				title="Antwoorden nakijken"
			/>
			{items.length > 0 ? (
				<div className="review-list">
					{items.map(item => (
						<ReviewCard
							form={forms[item.progressEntryId] ?? { comment: "", grade: "" }}
							isReviewing={reviewingId === item.progressEntryId}
							item={item}
							key={item.progressEntryId}
							onSubmit={() => void submitReview(item)}
							onUpdate={patch => updateForm(item.progressEntryId, patch)}
						/>
					))}
				</div>
			) : (
				<EmptyState
					description="Er staan op dit moment geen open antwoorden klaar voor beoordeling."
					title="Alles is nagekeken"
				/>
			)}
		</>
	);
}

type ReviewCardProps = {
	form: ReviewFormState;
	isReviewing: boolean;
	item: PendingOpenAnswerReviewView;
	onSubmit: () => void;
	onUpdate: (patch: Partial<ReviewFormState>) => void;
};

function ReviewCard({ form, isReviewing, item, onSubmit, onUpdate }: ReviewCardProps): ReactElement {
	const gradeId = `grade-${item.progressEntryId}`;
	const commentId = `comment-${item.progressEntryId}`;

	return (
		<Card as="article" className="open-review-card">
			<header className="open-review-card__header">
				<div>
					<p className="eyebrow">{item.elearningTitle}</p>
					<h2>{item.sectionTitle}</h2>
				</div>
				<span className="open-review-card__student">
					<Icon name="user" size={17} />
					{item.userName}
				</span>
			</header>
			<div className="open-review-card__question">
				<small>Vraag</small>
				<strong>{item.prompt}</strong>
			</div>
			<blockquote className="open-review-card__answer">{item.answerText}</blockquote>
			<div className="open-review-card__meta">
				<span>Ingestuurd {formatDate(item.submittedAtIso)}</span>
			</div>
			<div className="open-review-card__form">
				<label htmlFor={gradeId}>
					Cijfer
					<Input
						id={gradeId}
						inputMode="decimal"
						max="10"
						min="1"
						onChange={event => onUpdate({ grade: event.target.value })}
						placeholder="Bijv. 7.5"
						step="0.1"
						type="number"
						value={form.grade}
					/>
				</label>
				<label htmlFor={commentId}>
					Opmerking
					<TextArea
						id={commentId}
						onChange={event => onUpdate({ comment: event.target.value })}
						placeholder="Optioneel: geef feedback die de deelnemer helpt bij een herkansing."
						value={form.comment}
					/>
				</label>
			</div>
			<footer className="open-review-card__actions">
				<Button icon="check" isLoading={isReviewing} onClick={onSubmit}>
					Beoordeling opslaan
				</Button>
			</footer>
		</Card>
	);
}

function getReviewFeedbackMessage(awaitingReview: boolean, passed: boolean): string {
	if (awaitingReview) {
		return "Antwoord opgeslagen. Er wachten nog open antwoorden voor deze e-learning.";
	}

	if (passed) {
		return "Antwoord opgeslagen. De deelnemer is geslaagd voor de e-learning.";
	}

	return "Antwoord opgeslagen. De deelnemer kan de foute antwoorden opnieuw doen.";
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("nl-NL", {
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(value));
}
