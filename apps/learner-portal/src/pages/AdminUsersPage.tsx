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
import { approveUser, changeUserRole, deleteUser, listUsers, rejectUser } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type AdminUsersPageProps = {
	onFeedback: (feedback: FeedbackMessage) => void;
	session: SessionState;
};

export function AdminUsersPage({ onFeedback, session }: AdminUsersPageProps): ReactElement {
	const [users, setUsers] = useState<UserSummary[]>([]);
	const [rejectTarget, setRejectTarget] = useState<UserSummary | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<UserSummary | null>(null);
	const [busyUserId, setBusyUserId] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	async function loadUsers(): Promise<void> {
		setIsLoading(true);
		setError("");
		try {
			setUsers(await listUsers(session));
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
			const updatedUser = await approveUser(session, user.id);
			setUsers(current => current.map(item => (item.id === user.id ? updatedUser : item)));
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
			const updatedUser = await rejectUser(session, rejectTarget.id);
			setUsers(current => current.map(item => (item.id === rejectTarget.id ? updatedUser : item)));
			onFeedback({ type: "info", text: `De toegang van ${rejectTarget.name} is ingetrokken.` });
			setRejectTarget(null);
		} catch (caughtError: unknown) {
			onFeedback({ type: "error", text: (caughtError as Error).message });
		} finally {
			setBusyUserId(null);
		}
	}

	async function handleDelete(): Promise<void> {
		if (!deleteTarget) return;
		setBusyUserId(deleteTarget.id);
		try {
			await deleteUser(session, deleteTarget.id);
			setUsers(current => current.filter(item => item.id !== deleteTarget.id));
			onFeedback({ type: "success", text: `${deleteTarget.name} is verwijderd.` });
			setDeleteTarget(null);
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
				eyebrow="Accounts, toegang en rollen"
				subtitle="Bekijk alle gebruikers, beheer hun toegang en verwijder accounts die niet meer nodig zijn."
				title="Gebruikersbeheer"
			/>
			<Card className="users-overview">
				<header>
					<div>
						<span className="users-overview__icon">
							<Icon name="users" />
						</span>
						<div>
							<h2>Alle gebruikers</h2>
							<p>
								{users.length} {users.length === 1 ? "account" : "accounts"}, waarvan {getPendingCount(users)} in
								afwachting
							</p>
						</div>
					</div>
					<StatusBadge status={getPendingCount(users) > 0 ? "PENDING" : "APPROVED"} />
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
											{user.approvalStatus !== "APPROVED" ? (
												<Button
													disabled={busyUserId === user.id}
													isLoading={busyUserId === user.id}
													onClick={() => void handleApprove(user)}
												>
													Goedkeuren
												</Button>
											) : (
												<Button disabled={busyUserId === user.id} onClick={() => setRejectTarget(user)} variant="ghost">
													Toegang intrekken
												</Button>
											)}
											<Button
												disabled={busyUserId === user.id || isProtectedUser(user, session.user.id)}
												onClick={() => setDeleteTarget(user)}
												variant="danger"
											>
												Verwijderen
											</Button>
										</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<EmptyState description="Er zijn nog geen gebruikers om te beheren." title="Geen gebruikers gevonden" />
				)}
			</Card>

			<Dialog
				footer={
					<>
						<Button onClick={() => setRejectTarget(null)} variant="ghost">
							Annuleren
						</Button>
						<Button isLoading={busyUserId === rejectTarget?.id} onClick={() => void handleReject()} variant="danger">
							Toegang intrekken
						</Button>
					</>
				}
				isOpen={Boolean(rejectTarget)}
				onClose={() => setRejectTarget(null)}
				title="Toegang intrekken?"
			>
				<p>
					<strong>{rejectTarget?.name}</strong> kan na deze wijziging niet meer leren. Het account en de historie blijven
					bewaard en je kunt de toegang later opnieuw goedkeuren.
				</p>
			</Dialog>

			<Dialog
				footer={
					<>
						<Button onClick={() => setDeleteTarget(null)} variant="ghost">
							Annuleren
						</Button>
						<Button isLoading={busyUserId === deleteTarget?.id} onClick={() => void handleDelete()} variant="danger">
							Definitief verwijderen
						</Button>
					</>
				}
				isOpen={Boolean(deleteTarget)}
				onClose={() => setDeleteTarget(null)}
				title="Gebruiker verwijderen?"
			>
				<p>
					<strong>{deleteTarget?.name}</strong> en alle persoonlijke leerhistorie worden definitief verwijderd. Deze actie
					kan niet ongedaan worden gemaakt.
				</p>
			</Dialog>
		</>
	);
}

function getPendingCount(users: UserSummary[]): number {
	return users.filter(user => user.approvalStatus === "PENDING").length;
}

function isProtectedUser(user: UserSummary, currentUserId: string): boolean {
	return (
		user.id === currentUserId ||
		user.email === "admin@hackaithon.local" ||
		user.email === "trainer@hackaithon.local"
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
