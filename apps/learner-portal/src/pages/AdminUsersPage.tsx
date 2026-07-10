import type { AppRole, UserSummary } from "@hackaithon/shared-types";
import { useEffect, useState, type ReactElement } from "react";

import { Icon } from "../components/Icon.js";
import {
	Button,
	Card,
	Dialog,
	EmptyState,
	ErrorState,
	LoadingState,
	PageHeader,
	Select,
	StatusBadge,
} from "../components/ui.js";
import { approveUser, changeUserRole, listPendingUsers, rejectUser } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type AdminUsersPageProps = {
	onFeedback: (feedback: FeedbackMessage) => void;
	session: SessionState;
};

export function AdminUsersPage({ onFeedback, session }: AdminUsersPageProps): ReactElement {
	const [users, setUsers] = useState<UserSummary[]>([]);
	const [rejectTarget, setRejectTarget] = useState<UserSummary | null>(null);
	const [busyUserId, setBusyUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	async function loadUsers(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			setUsers(await listPendingUsers(session));
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		void loadUsers();
	}, [session.user.id]);

	async function handleApprove(user: UserSummary): Promise<void> {
		setBusyUserId(user.id);
		try {
			await approveUser(session, user.id);
			setUsers(current => current.filter(item => item.id !== user.id));
			onFeedback({ type: "success", text: `${user.name} heeft nu toegang tot de Academy.` });
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyUserId(null);
		}
	}

	async function handleReject(): Promise<void> {
		if (!rejectTarget) return;
		setBusyUserId(rejectTarget.id);
		try {
			await rejectUser(session, rejectTarget.id);
			setUsers(current => current.filter(item => item.id !== rejectTarget.id));
			onFeedback({ type: "info", text: `De aanvraag van ${rejectTarget.name} is afgewezen.` });
			setRejectTarget(null);
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyUserId(null);
		}
	}

	async function handleRoleChange(user: UserSummary, role: AppRole): Promise<void> {
		setBusyUserId(user.id);
		try {
			const updatedUser = await changeUserRole(session, user.id, role);
			setUsers(current => current.map(item => (item.id === user.id ? updatedUser : item)));
			onFeedback({ type: "success", text: `De rol van ${user.name} is aangepast.` });
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyUserId(null);
		}
	}

	if (isLoading) return <LoadingState description="We halen de toegangsaanvragen op." />;
	if (error)
		return (
			<ErrorState
				action={<Button onClick={() => void loadUsers()}>Opnieuw proberen</Button>}
				description={error}
				title="Gebruikersbeheer niet beschikbaar"
			/>
		);

	return (
		<>
			<PageHeader
				eyebrow="Toegang en rollen"
				subtitle="Beoordeel nieuwe deelnemers en kies direct welke rol bij hun werkzaamheden past."
				title="Gebruikersbeheer"
			/>
			<Card className="users-overview">
				<header>
					<div>
						<span className="users-overview__icon">
							<Icon name="users" />
						</span>
						<div>
							<h2>Openstaande aanvragen</h2>
							<p>
								{users.length} {users.length === 1 ? "aanvraag wacht" : "aanvragen wachten"} op beoordeling
							</p>
						</div>
					</div>
					<StatusBadge status="PENDING" />
				</header>
				{users.length > 0 ? (
					<div className="user-table-wrap">
						<table className="user-table">
							<thead>
								<tr>
									<th>Gebruiker</th>
									<th>Team</th>
									<th>Aangevraagd</th>
									<th>Rol</th>
									<th>Status</th>
									<th>
										<span className="visually-hidden">Acties</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{users.map(user => (
									<tr key={user.id}>
										<td data-label="Gebruiker">
											<div className="user-cell">
												<span>{getInitials(user.name)}</span>
												<div>
													<strong>{user.name}</strong>
													<small>{user.email}</small>
												</div>
											</div>
										</td>
										<td data-label="Team">{user.teamName}</td>
										<td data-label="Aangevraagd">{formatDate(user.createdAtIso)}</td>
										<td data-label="Rol">
											<Select
												aria-label={`Rol voor ${user.name}`}
												disabled={busyUserId === user.id}
												onChange={event => void handleRoleChange(user, event.target.value as AppRole)}
												value={user.role}
											>
												<option value="PARTICIPANT">Deelnemer</option>
												<option value="TRAINER">Trainer</option>
												<option value="ADMIN">Beheerder</option>
											</Select>
										</td>
										<td data-label="Status">
											<StatusBadge status={user.approvalStatus} />
										</td>
										<td>
											<div className="user-actions">
												<Button
													disabled={busyUserId === user.id}
													isLoading={busyUserId === user.id}
													onClick={() => void handleApprove(user)}
												>
													Goedkeuren
												</Button>
												<Button disabled={busyUserId === user.id} onClick={() => setRejectTarget(user)} variant="ghost">
													Afwijzen
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyState
						description="Er zijn geen nieuwe deelnemers die op beoordeling wachten."
						title="Alles is bijgewerkt"
					/>
				)}
			</Card>

			<Dialog
				footer={
					<>
						<Button onClick={() => setRejectTarget(null)} variant="ghost">
							Annuleren
						</Button>
						<Button isLoading={busyUserId === rejectTarget?.id} onClick={() => void handleReject()} variant="danger">
							Aanvraag afwijzen
						</Button>
					</>
				}
				isOpen={Boolean(rejectTarget)}
				onClose={() => setRejectTarget(null)}
				title="Aanvraag afwijzen?"
			>
				<p>
					<strong>{rejectTarget?.name}</strong> krijgt geen toegang tot de Academy. Je kunt dit later alleen via de
					beheeromgeving herstellen.
				</p>
			</Dialog>
		</>
	);
}

function getInitials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0]?.toUpperCase())
		.join("");
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
