import type { HistoryDetailView, HistorySummaryItem } from "@hackaithon/shared-types";
import { useEffect, useMemo, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import {
	Button,
	Card,
	Dialog,
	EmptyState,
	ErrorState,
	LoadingState,
	PageHeader,
	ProgressBar,
	Select,
	StatusBadge,
} from "../components/ui.js";
import { getHistoryDetail, listHistory } from "../lib/api.js";
import type { SessionState } from "../types.js";

type HistoryPageProps = {
	onNavigate: (path: string) => void;
	session: SessionState;
};

export function HistoryPage({ onNavigate, session }: HistoryPageProps): ReactElement {
	const [items, setItems] = useState<HistorySummaryItem[]>([]);
	const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "COMPLETED">("ALL");
	const [detail, setDetail] = useState<HistoryDetailView | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDetailLoading, setIsDetailLoading] = useState(false);
	const [error, setError] = useState("");

	async function loadItems(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			setItems(await listHistory(session));
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadItems();
	}, [session.user.id]);

	const visibleItems = useMemo(() => items.filter(item => filter === "ALL" || item.status === filter), [filter, items]);
	const totalScore = items.reduce((sum, item) => sum + item.totalScore, 0);

	async function openDetail(enrollmentId: string): Promise<void> {
		setIsDetailLoading(true);
		try {
			setDetail(await getHistoryDetail(session, enrollmentId));
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsDetailLoading(false);
		}
	}

	if (isLoading) return <LoadingState description="We verzamelen je leeractiviteit." />;
	if (error && items.length === 0)
		return (
			<ErrorState
				action={<Button onClick={() => void loadItems()}>Opnieuw proberen</Button>}
				description={error}
				title="Historie niet beschikbaar"
			/>
		);

	return (
		<>
			<PageHeader
				eyebrow="Jouw leerpad"
				subtitle="Bekijk waar je aan gewerkt hebt en vier wat je al hebt afgerond."
				title="Leerhistorie"
			/>
			<section className="history-highlights" aria-label="Samenvatting">
				<Card>
					<span>
						<Icon name="book" />
					</span>
					<div>
						<strong>{items.length}</strong>
						<small>Gestarte e-learnings</small>
					</div>
				</Card>
				<Card>
					<span>
						<Icon name="check" />
					</span>
					<div>
						<strong>{items.filter(item => item.status === "COMPLETED").length}</strong>
						<small>Afgerond</small>
					</div>
				</Card>
				<Card>
					<span>
						<Icon name="award" />
					</span>
					<div>
						<strong>{totalScore}</strong>
						<small>Kennispunten</small>
					</div>
				</Card>
			</section>
			<div className="history-toolbar">
				<div>
					<p className="eyebrow">Activiteit</p>
					<h2>Alle e-learnings</h2>
				</div>
				<Select
					aria-label="Filter historie"
					onChange={event => setFilter(event.target.value as typeof filter)}
					value={filter}
				>
					<option value="ALL">Alle statussen</option>
					<option value="IN_PROGRESS">Bezig</option>
					<option value="COMPLETED">Afgerond</option>
				</Select>
			</div>
			{visibleItems.length > 0 ? (
				<div className="history-list">
					{visibleItems.map(item => (
						<HistoryCard
							isLoading={isDetailLoading}
							item={item}
							key={item.enrollmentId}
							onDetail={() => void openDetail(item.enrollmentId)}
							onResume={() => onNavigate(`/leren/${encodeURIComponent(item.elearningId)}`)}
						/>
					))}
				</div>
			) : (
				<EmptyState
					action={
						items.length === 0 ? (
							<Button onClick={() => onNavigate("/catalogus")}>Ontdek de catalogus</Button>
						) : (
							<Button onClick={() => setFilter("ALL")} variant="secondary">
								Toon alles
							</Button>
						)
					}
					description={
						items.length === 0
							? "Zodra je een e-learning start, zie je de voortgang hier terug."
							: "Er zijn geen e-learnings met deze status."
					}
					title={items.length === 0 ? "Je leerpad begint hier" : "Geen resultaten"}
				/>
			)}

			<Dialog
				isOpen={Boolean(detail)}
				onClose={() => setDetail(null)}
				size="large"
				title={detail?.elearning.title ?? "Leeractiviteit"}
			>
				{detail ? (
					<HistoryDetail
						detail={detail}
						onOpenCourse={() => onNavigate(`/catalogus/${encodeURIComponent(detail.elearning.id)}`)}
					/>
				) : null}
			</Dialog>
		</>
	);
}

type HistoryCardProps = { isLoading: boolean; item: HistorySummaryItem; onDetail: () => void; onResume: () => void };

function HistoryCard({ isLoading, item, onDetail, onResume }: HistoryCardProps): ReactElement {
	const progress = item.status === "COMPLETED" ? 100 : Math.min(90, Math.max(10, (item.lastPosition + 1) * 20));
	return (
		<Card as="article" className="history-card">
			<div className={`history-card__icon history-card__icon--${item.status.toLowerCase()}`}>
				<Icon name={item.status === "COMPLETED" ? "check" : "book"} />
			</div>
			<div className="history-card__copy">
				<div>
					<StatusBadge status={item.status} />
					<span>Laatst bijgewerkt {formatDate(item.updatedAtIso)}</span>
				</div>
				<h2>{item.elearningTitle}</h2>
				<ProgressBar value={progress} />
				<div className="history-card__meta">
					<span>
						<Icon name="award" size={16} /> {item.totalScore} punten
					</span>
					{item.startedAtIso ? (
						<span>
							<Icon name="calendar" size={16} /> Gestart {formatDate(item.startedAtIso)}
						</span>
					) : null}
					{item.completedAtIso ? (
						<span>
							<Icon name="check" size={16} /> Afgerond {formatDate(item.completedAtIso)}
						</span>
					) : null}
				</div>
			</div>
			<div className="history-card__actions">
				<Button onClick={onResume}>{item.status === "COMPLETED" ? "Nogmaals bekijken" : "Verder leren"}</Button>
				<Button disabled={isLoading} onClick={onDetail} variant="ghost">
					Activiteit
				</Button>
			</div>
		</Card>
	);
}

function HistoryDetail({
	detail,
	onOpenCourse,
}: {
	detail: HistoryDetailView;
	onOpenCourse: () => void;
}): ReactElement {
	return (
		<div className="history-detail">
			<div className="history-detail__summary">
				<div>
					<StatusBadge status={detail.enrollment.status} />
					<StatusBadge status={detail.elearning.level} />
				</div>
				<p>{detail.elearning.description}</p>
				<dl>
					<div>
						<dt>Score</dt>
						<dd>{detail.enrollment.totalScore} punten</dd>
					</div>
					<div>
						<dt>Onderdelen bekeken</dt>
						<dd>
							{detail.progressEntries.length} van {detail.elearning.sectionCount}
						</dd>
					</div>
					<div>
						<dt>Laatst actief</dt>
						<dd>{formatDate(detail.enrollment.updatedAtIso)}</dd>
					</div>
				</dl>
			</div>
			<div>
				<p className="eyebrow">Tijdlijn</p>
				<h3>Leeractiviteit</h3>
				{detail.progressEntries.length > 0 ? (
					<ol className="activity-timeline">
						{detail.progressEntries.map((entry, index) => (
							<li key={entry.id}>
								<span>
									<Icon name="check" size={15} />
								</span>
								<div>
									<strong>Onderdeel {index + 1} bekeken</strong>
									<small>
										{formatDate(entry.updatedAtIso)}
										{entry.score > 0 ? ` · ${entry.score} punten` : ""}
									</small>
								</div>
							</li>
						))}
					</ol>
				) : (
					<p className="muted-copy">Er is nog geen onderdeel opgeslagen.</p>
				)}
			</div>
			<div className="form-actions">
				<Button onClick={onOpenCourse} variant="secondary">
					Bekijk e-learning
				</Button>
			</div>
		</div>
	);
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
