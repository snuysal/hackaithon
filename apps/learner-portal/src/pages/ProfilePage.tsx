import type { AuthUserView, UpdateProfileRequest } from "@hackaithon/shared-types";
import { useState, type ReactElement, type SyntheticEvent } from "react";

import { Button, Card, FormField, Input, PageHeader, PasswordInput } from "../components/ui.js";
import { updateProfile } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type ProfilePageProps = {
	onFeedback: (feedback: FeedbackMessage) => void;
	onUserUpdated: (user: AuthUserView) => void;
	session: SessionState;
};

type ProfileForm = UpdateProfileRequest & {
	confirmPassword: string;
};

export function ProfilePage({ onFeedback, onUserUpdated, session }: ProfilePageProps): ReactElement {
	const [form, setForm] = useState<ProfileForm>(() => createProfileForm(session.user));
	const [error, setError] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const age = calculateAge(form.birthDateIso);

	async function handleSubmit(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError("");

		if (!form.name.trim() || !form.email.trim() || !form.birthDateIso || !form.teamName.trim()) {
			setError("Vul je naam, e-mailadres, geboortedatum en team in.");
			return;
		}

		if (form.newPassword && form.newPassword.length < 6) {
			setError("Het nieuwe wachtwoord moet minimaal 6 tekens bevatten.");
			return;
		}

		if (form.newPassword && !form.currentPassword) {
			setError("Vul je huidige wachtwoord in om een nieuw wachtwoord te kiezen.");
			return;
		}

		if (form.currentPassword && !form.newPassword) {
			setError("Vul ook een nieuw wachtwoord in.");
			return;
		}

		if (form.newPassword !== form.confirmPassword) {
			setError("De nieuwe wachtwoorden komen niet overeen.");
			return;
		}

		setIsSaving(true);
		try {
			const payload: UpdateProfileRequest = {
				name: form.name,
				email: form.email,
				birthDateIso: form.birthDateIso,
				teamName: form.teamName,
				addressLine: form.addressLine,
				postalCode: form.postalCode,
				city: form.city,
				...(form.currentPassword ? { currentPassword: form.currentPassword } : {}),
				...(form.newPassword ? { newPassword: form.newPassword } : {}),
			};
			const updatedUser = await updateProfile(session, payload);
			onUserUpdated(updatedUser);
			setForm(createProfileForm(updatedUser));
			onFeedback({ type: "success", text: "Je profielgegevens zijn opgeslagen." });
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<>
			<PageHeader
				eyebrow="Persoonlijke instellingen"
				subtitle="Houd je contactgegevens, team en beveiligingsinstellingen actueel."
				title="Mijn profiel"
			/>

			<form className="profile-form" noValidate onSubmit={event => void handleSubmit(event)}>
				{error ? (
					<div className="form-alert" role="alert">
						{error}
					</div>
				) : null}

				<Card className="profile-card" as="section">
					<header>
						<div>
							<p className="eyebrow">Basisgegevens</p>
							<h2>Persoonlijke informatie</h2>
						</div>
						<span className="profile-card__age">{age === null ? "Leeftijd onbekend" : `${age} jaar`}</span>
					</header>
					<div className="profile-card__body form-grid">
						<FormField htmlFor="profile-name" label="Volledige naam" required>
							<Input
								autoComplete="name"
								id="profile-name"
								onChange={event => setForm(current => ({ ...current, name: event.target.value }))}
								value={form.name}
							/>
						</FormField>
						<FormField htmlFor="profile-email" label="E-mailadres" required>
							<Input
								autoComplete="email"
								id="profile-email"
								onChange={event => setForm(current => ({ ...current, email: event.target.value }))}
								type="email"
								value={form.email}
							/>
						</FormField>
						<FormField htmlFor="profile-birthdate" label="Geboortedatum" required>
							<Input
								autoComplete="bday"
								id="profile-birthdate"
								onChange={event => setForm(current => ({ ...current, birthDateIso: event.target.value }))}
								type="date"
								value={form.birthDateIso}
							/>
						</FormField>
						<FormField htmlFor="profile-team" label="Team" required>
							<Input
								id="profile-team"
								onChange={event => setForm(current => ({ ...current, teamName: event.target.value }))}
								value={form.teamName}
							/>
						</FormField>
					</div>
				</Card>

				<Card className="profile-card" as="section">
					<header>
						<div>
							<p className="eyebrow">Contact</p>
							<h2>Adresgegevens</h2>
						</div>
					</header>
					<div className="profile-card__body form-grid">
						<FormField htmlFor="profile-address" label="Adres en huisnummer">
							<Input
								autoComplete="street-address"
								id="profile-address"
								onChange={event => setForm(current => ({ ...current, addressLine: event.target.value }))}
								placeholder="Bijvoorbeeld Oudegracht 123"
								value={form.addressLine}
							/>
						</FormField>
						<div className="form-grid">
							<FormField htmlFor="profile-postal-code" label="Postcode">
								<Input
									autoComplete="postal-code"
									id="profile-postal-code"
									onChange={event => setForm(current => ({ ...current, postalCode: event.target.value }))}
									placeholder="1234 AB"
									value={form.postalCode}
								/>
							</FormField>
							<FormField htmlFor="profile-city" label="Woonplaats">
								<Input
									autoComplete="address-level2"
									id="profile-city"
									onChange={event => setForm(current => ({ ...current, city: event.target.value }))}
									placeholder="Utrecht"
									value={form.city}
								/>
							</FormField>
						</div>
					</div>
				</Card>

				<Card className="profile-card" as="section">
					<header>
						<div>
							<p className="eyebrow">Beveiliging</p>
							<h2>Wachtwoord wijzigen</h2>
						</div>
					</header>
					<div className="profile-card__body form-grid">
						<FormField htmlFor="profile-current-password" label="Huidig wachtwoord">
							<PasswordInput
								autoComplete="current-password"
								id="profile-current-password"
								onChange={event => setForm(current => ({ ...current, currentPassword: event.target.value }))}
								value={form.currentPassword}
							/>
						</FormField>
						<div className="form-grid">
							<FormField hint="Minimaal 6 tekens." htmlFor="profile-new-password" label="Nieuw wachtwoord">
								<PasswordInput
									autoComplete="new-password"
									id="profile-new-password"
									onChange={event => setForm(current => ({ ...current, newPassword: event.target.value }))}
									value={form.newPassword}
								/>
							</FormField>
							<FormField htmlFor="profile-confirm-password" label="Nieuw wachtwoord herhalen">
								<PasswordInput
									autoComplete="new-password"
									id="profile-confirm-password"
									onChange={event => setForm(current => ({ ...current, confirmPassword: event.target.value }))}
									value={form.confirmPassword}
								/>
							</FormField>
						</div>
					</div>
				</Card>

				<div className="form-actions profile-form__actions">
					<Button isLoading={isSaving} type="submit">
						Wijzigingen opslaan
					</Button>
				</div>
			</form>
		</>
	);
}

function createProfileForm(user: AuthUserView): ProfileForm {
	return {
		name: user.name,
		email: user.email,
		birthDateIso: user.birthDateIso,
		teamName: user.teamName,
		addressLine: user.addressLine ?? "",
		postalCode: user.postalCode ?? "",
		city: user.city ?? "",
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	};
}

function calculateAge(birthDateIso: string): number | null {
	const birthDate = new Date(`${birthDateIso}T00:00:00`);
	if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return null;

	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const hasNotHadBirthday =
		today.getMonth() < birthDate.getMonth() ||
		(today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
	if (hasNotHadBirthday) age -= 1;
	return age;
}
