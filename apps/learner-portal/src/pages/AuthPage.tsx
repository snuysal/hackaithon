import { useState, type ReactElement, type SyntheticEvent } from "react";

import { Icon } from "../components/Icon.js";
import { Button, FormField, Input, PasswordInput } from "../components/ui.js";
import { login, signup } from "../lib/api.js";
import type { FeedbackMessage, SessionState } from "../types.js";

type AuthPageProps = {
	onAuthenticated: (session: SessionState) => void;
	onFeedback: (feedback: FeedbackMessage) => void;
};

type LoginForm = {
	email: string;
	password: string;
};

type SignupForm = {
	birthDateIso: string;
	email: string;
	name: string;
	password: string;
	teamName: string;
};

const initialLoginForm: LoginForm = { email: "", password: "" };
const initialSignupForm: SignupForm = {
	birthDateIso: "2000-01-01",
	email: "",
	name: "",
	password: "",
	teamName: "",
};

export function AuthPage({ onAuthenticated, onFeedback }: AuthPageProps): ReactElement {
	const [mode, setMode] = useState<"login" | "signup">("login");
	const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
	const [signupForm, setSignupForm] = useState<SignupForm>(initialSignupForm);
	const [error, setError] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleLogin(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError("");
		if (!loginForm.email.trim() || !loginForm.password) {
			setError("Vul je e-mailadres en wachtwoord in.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await login(loginForm);
			onAuthenticated({ sessionToken: response.sessionToken, user: response.user });
			onFeedback({ type: "success", text: `Welkom terug, ${response.user.name}.` });
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSignup(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError("");
		if (!signupForm.name.trim() || !signupForm.email.trim() || !signupForm.teamName.trim()) {
			setError("Vul alle verplichte velden in.");
			return;
		}

		if (signupForm.password.length < 6) {
			setError("Kies een wachtwoord van minimaal 6 tekens.");
			return;
		}

		setIsSubmitting(true);
		try {
			const response = await signup(signupForm);
			setSignupForm(initialSignupForm);
			setMode("login");
			onFeedback({ type: "success", text: `${response.message} Je kunt nu inloggen.` });
		} catch (caughtError: unknown) {
			setError((caughtError as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	}

	function switchMode(nextMode: "login" | "signup"): void {
		setMode(nextMode);
		setError("");
	}

	return (
		<main className="auth-layout">
			<section className="auth-story">
				<div className="auth-story__brand">
					<span className="auth-story__mark">
						<i />
						<i />
						<i />
					</span>
					<strong>Cerios</strong>
					<span>Academy</span>
				</div>
				<div className="auth-story__content">
					<p className="eyebrow">Blijf jezelf ontwikkelen</p>
					<h1>Waar jouw talent nooit stilstaat.</h1>
					<p>
						Ontwikkel expertise die verschil maakt. Leer op je eigen tempo, volg je voortgang en zet vandaag de volgende
						stap.
					</p>
					<ul>
						<li>
							<span>
								<Icon name="check" size={17} />
							</span>{" "}
							Praktijkgerichte e-learnings
						</li>
						<li>
							<span>
								<Icon name="check" size={17} />
							</span>{" "}
							Direct inzicht in je voortgang
						</li>
						<li>
							<span>
								<Icon name="check" size={17} />
							</span>{" "}
							Kennis van Cerios-experts
						</li>
					</ul>
				</div>
				<div aria-hidden="true" className="auth-story__orb auth-story__orb--one" />
				<div aria-hidden="true" className="auth-story__orb auth-story__orb--two" />
			</section>

			<section className="auth-panel" aria-labelledby="auth-title">
				<div className="auth-panel__inner">
					<p className="eyebrow">Cerios Academy portal</p>
					<h2 id="auth-title">{mode === "login" ? "Fijn dat je er bent" : "Start jouw ontwikkeling"}</h2>
					<p className="auth-panel__intro">
						{mode === "login"
							? "Log in om verder te gaan waar je gebleven was."
							: "Maak een account aan. Een beheerder beoordeelt daarna je toegang."}
					</p>

					<div aria-label="Kies aanmelden of registreren" className="auth-tabs" role="tablist">
						<button aria-selected={mode === "login"} onClick={() => switchMode("login")} role="tab" type="button">
							Inloggen
						</button>
						<button aria-selected={mode === "signup"} onClick={() => switchMode("signup")} role="tab" type="button">
							Account maken
						</button>
					</div>

					{error ? (
						<div className="form-alert" role="alert">
							{error}
						</div>
					) : null}

					{mode === "login" ? (
						<form className="auth-form" noValidate onSubmit={event => void handleLogin(event)}>
							<FormField htmlFor="login-email" label="E-mailadres" required>
								<Input
									autoComplete="email"
									id="login-email"
									name="email"
									onChange={event => setLoginForm(current => ({ ...current, email: event.target.value }))}
									placeholder="naam@organisatie.nl"
									type="email"
									value={loginForm.email}
								/>
							</FormField>
							<FormField htmlFor="login-password" label="Wachtwoord" required>
								<PasswordInput
									autoComplete="current-password"
									id="login-password"
									name="password"
									onChange={event => setLoginForm(current => ({ ...current, password: event.target.value }))}
									placeholder="Je wachtwoord"
									value={loginForm.password}
								/>
							</FormField>
							<Button isLoading={isSubmitting} type="submit">
								Inloggen
							</Button>
						</form>
					) : (
						<form className="auth-form" noValidate onSubmit={event => void handleSignup(event)}>
							<FormField htmlFor="signup-name" label="Volledige naam" required>
								<Input
									autoComplete="name"
									id="signup-name"
									onChange={event => setSignupForm(current => ({ ...current, name: event.target.value }))}
									placeholder="Bijvoorbeeld Robin de Vries"
									value={signupForm.name}
								/>
							</FormField>
							<FormField htmlFor="signup-email" label="E-mailadres" required>
								<Input
									autoComplete="email"
									id="signup-email"
									onChange={event => setSignupForm(current => ({ ...current, email: event.target.value }))}
									placeholder="naam@organisatie.nl"
									type="email"
									value={signupForm.email}
								/>
							</FormField>
							<div className="form-grid">
								<FormField htmlFor="signup-birthdate" label="Geboortedatum" required>
									<Input
										id="signup-birthdate"
										onChange={event => setSignupForm(current => ({ ...current, birthDateIso: event.target.value }))}
										type="date"
										value={signupForm.birthDateIso}
									/>
								</FormField>
								<FormField htmlFor="signup-team" label="Team" required>
									<Input
										id="signup-team"
										onChange={event => setSignupForm(current => ({ ...current, teamName: event.target.value }))}
										placeholder="Bijvoorbeeld Quality"
										value={signupForm.teamName}
									/>
								</FormField>
							</div>
							<FormField hint="Gebruik minimaal 6 tekens." htmlFor="signup-password" label="Wachtwoord" required>
								<PasswordInput
									autoComplete="new-password"
									id="signup-password"
									onChange={event => setSignupForm(current => ({ ...current, password: event.target.value }))}
									placeholder="Kies een veilig wachtwoord"
									value={signupForm.password}
								/>
							</FormField>
							<Button isLoading={isSubmitting} type="submit">
								Account aanvragen
							</Button>
						</form>
					)}

					<p className="auth-panel__help">Hulp nodig? Neem contact op met je Academy-beheerder.</p>
				</div>
			</section>
		</main>
	);
}
