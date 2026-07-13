import type { ElearningSummary } from "@hackaithon/shared-types";
import {
	cloneElement,
	useEffect,
	useId,
	useRef,
	type ButtonHTMLAttributes,
	type InputHTMLAttributes,
	type ReactElement,
	type ReactNode,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";

import { Icon, type IconName } from "./Icon.js";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "secondary" | "ghost" | "danger";
	icon?: IconName;
	iconPosition?: "start" | "end";
	isLoading?: boolean;
};

export function Button({
	children,
	className = "",
	variant = "primary",
	icon,
	iconPosition = "start",
	isLoading = false,
	disabled,
	...props
}: ButtonProps): ReactElement {
	return (
		<button
			className={`button button--${variant} ${className}`.trim()}
			disabled={disabled === true || isLoading}
			{...props}
		>
			{isLoading ? <span aria-hidden="true" className="button__spinner" /> : null}
			{!isLoading && icon && iconPosition === "start" ? <Icon name={icon} size={18} /> : null}
			<span>{isLoading ? "Even geduld..." : children}</span>
			{!isLoading && icon && iconPosition === "end" ? <Icon name={icon} size={18} /> : null}
		</button>
	);
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>): ReactElement {
	return <input className={`form-control ${className}`.trim()} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactElement {
	return <textarea className={`form-control form-control--textarea ${className}`.trim()} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>): ReactElement {
	return (
		<div className="select-wrap">
			<select className={`form-control form-control--select ${className}`.trim()} {...props}>
				{children}
			</select>
			<Icon name="chevron-down" size={18} />
		</div>
	);
}

type FormFieldProps = {
	children: ReactElement<FieldControlProps>;
	error?: string;
	hint?: string;
	htmlFor: string;
	label: string;
	required?: boolean;
};

type FieldControlProps = {
	"aria-describedby"?: string;
	"aria-invalid"?: boolean | "false" | "true";
	required?: boolean;
};

export function FormField({ children, error, hint, htmlFor, label, required }: FormFieldProps): ReactElement {
	const hintId = hint ? `${htmlFor}-hint` : undefined;
	const errorId = error ? `${htmlFor}-error` : undefined;
	const describedByValues = [children.props["aria-describedby"], hintId, errorId].filter((value): value is string =>
		Boolean(value)
	);
	const describedBy = describedByValues.length > 0 ? describedByValues.join(" ") : undefined;
	const control = cloneElement(children, {
		"aria-describedby": describedBy,
		"aria-invalid": error ? true : children.props["aria-invalid"],
		required: required === true || children.props.required === true,
	});

	return (
		<div className={`form-field ${error ? "form-field--error" : ""}`}>
			<label htmlFor={htmlFor}>
				{label}
				{required ? <span aria-hidden="true"> *</span> : null}
			</label>
			{control}
			{hint ? (
				<p className="form-field__hint" id={hintId}>
					{hint}
				</p>
			) : null}
			{error ? (
				<p className="form-field__error" id={errorId} role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

type CardProps = {
	children: ReactNode;
	className?: string;
	as?: "article" | "div" | "section";
};

export function Card({ children, className = "", as: Element = "div" }: CardProps): ReactElement {
	return <Element className={`card ${className}`.trim()}>{children}</Element>;
}

type PageHeaderProps = {
	actions?: ReactNode;
	eyebrow?: string;
	subtitle?: string;
	title: string;
};

export function PageHeader({ actions, eyebrow, subtitle, title }: PageHeaderProps): ReactElement {
	return (
		<header className="page-header">
			<div className="page-header__copy">
				{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
				<h1>{title}</h1>
				{subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
			</div>
			{actions ? <div className="page-header__actions">{actions}</div> : null}
		</header>
	);
}

type ProgressBarProps = {
	label?: string;
	showValue?: boolean;
	value: number;
};

export function ProgressBar({ label = "Voortgang", showValue = true, value }: ProgressBarProps): ReactElement {
	const safeValue = Math.min(100, Math.max(0, Math.round(value)));
	return (
		<div className="progress">
			{showValue ? (
				<div className="progress__meta">
					<span>{label}</span>
					<strong>{safeValue}%</strong>
				</div>
			) : null}
			<div
				aria-label={label}
				aria-valuemax={100}
				aria-valuemin={0}
				aria-valuenow={safeValue}
				className="progress__track"
				role="progressbar"
			>
				<span className="progress__value" style={{ width: `${safeValue}%` }} />
			</div>
		</div>
	);
}

type StatusBadgeProps = {
	status: string;
};

const statusLabels: Record<string, string> = {
	APPROVED: "Goedgekeurd",
	COMPLETED: "Afgerond",
	DRAFT: "Concept",
	IN_PROGRESS: "Bezig",
	JUNIOR: "Basis",
	MEDIOR: "Gevorderd",
	NOT_STARTED: "Nog niet gestart",
	PARTICIPANT: "Deelnemer",
	PENDING: "In afwachting",
	PUBLISHED: "Gepubliceerd",
	REJECTED: "Afgewezen",
	SENIOR: "Expert",
	TRAINER: "Trainer",
	ADMIN: "Beheerder",
};

export function StatusBadge({ status }: StatusBadgeProps): ReactElement {
	return <span className={`status-badge status-badge--${status.toLowerCase()}`}>{statusLabels[status] ?? status}</span>;
}

type StateProps = {
	action?: ReactNode;
	description: string;
	title: string;
};

export function EmptyState({ action, description, title }: StateProps): ReactElement {
	return (
		<div className="state state--empty">
			<div className="state__icon">
				<Icon name="book" size={24} />
			</div>
			<h2>{title}</h2>
			<p>{description}</p>
			{action ? <div className="state__action">{action}</div> : null}
		</div>
	);
}

export function LoadingState({ description = "We halen je leeromgeving op." }: { description?: string }): ReactElement {
	return (
		<div aria-live="polite" className="state state--loading" role="status">
			<span aria-hidden="true" className="loader" />
			<p>{description}</p>
		</div>
	);
}

export function ErrorState({ action, description, title }: StateProps): ReactElement {
	return (
		<div className="state state--error" role="alert">
			<div className="state__icon">!</div>
			<h2>{title}</h2>
			<p>{description}</p>
			{action ? <div className="state__action">{action}</div> : null}
		</div>
	);
}

type DialogProps = {
	children: ReactNode;
	footer?: ReactNode;
	isOpen: boolean;
	onClose: () => void;
	size?: "default" | "large";
	title: string;
};

export function Dialog({
	children,
	footer,
	isOpen,
	onClose,
	size = "default",
	title,
}: DialogProps): ReactElement | null {
	const dialogRef = useRef<HTMLDivElement>(null);
	const titleId = useId();

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const dialog = dialogRef.current;
		const focusableSelector =
			'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === "Escape") {
				onClose();
				return;
			}

			if (event.key !== "Tab" || !dialog) {
				return;
			}

			const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
				element => element.getClientRects().length > 0
			);
			const firstElement = focusableElements[0];
			const lastElement = focusableElements.at(-1);
			if (!firstElement || !lastElement) return;

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();
			} else if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}

		document.body.classList.add("dialog-open");
		window.addEventListener("keydown", handleKeyDown);
		window.requestAnimationFrame((): void => {
			dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
		});
		return (): void => {
			document.body.classList.remove("dialog-open");
			window.removeEventListener("keydown", handleKeyDown);
			previouslyFocused?.focus();
		};
	}, [isOpen, onClose]);

	if (!isOpen) {
		return null;
	}

	return (
		<div className="dialog-backdrop" onMouseDown={onClose}>
			<div
				aria-labelledby={titleId}
				aria-modal="true"
				className={`dialog dialog--${size}`}
				onMouseDown={event => event.stopPropagation()}
				ref={dialogRef}
				role="dialog"
			>
				<header className="dialog__header">
					<h2 id={titleId}>{title}</h2>
					<button aria-label="Sluiten" className="icon-button" onClick={onClose} type="button">
						<Icon name="close" />
					</button>
				</header>
				<div className="dialog__content">{children}</div>
				{footer ? <footer className="dialog__footer">{footer}</footer> : null}
			</div>
		</div>
	);
}

type ToastProps = {
	message: string;
	onClose: () => void;
	type: "success" | "error" | "info";
};

export function Toast({ message, onClose, type }: ToastProps): ReactElement {
	useEffect(() => {
		const timeout = window.setTimeout(onClose, 5000);
		return (): void => window.clearTimeout(timeout);
	}, [message, onClose]);

	return (
		<div aria-live="polite" className={`toast toast--${type}`} role={type === "error" ? "alert" : "status"}>
			<div className="toast__mark">{type === "success" ? <Icon name="check" size={18} /> : "i"}</div>
			<p>{message}</p>
			<button aria-label="Melding sluiten" className="toast__close" onClick={onClose} type="button">
				<Icon name="close" size={18} />
			</button>
		</div>
	);
}

type CourseCardProps = {
	course: ElearningSummary;
	onOpen: () => void;
	onPrimary?: () => void;
	primaryLabel?: string;
	progress?: number;
};

export function CourseCard({
	course,
	onOpen,
	onPrimary,
	primaryLabel = "Bekijk e-learning",
	progress,
}: CourseCardProps): ReactElement {
	return (
		<Card as="article" className="course-card">
			<div className={`course-card__visual course-card__visual--${course.level.toLowerCase()}`}>
				<div className="course-card__visual-icon">
					<Icon name="sparkles" size={24} />
				</div>
				<StatusBadge status={course.level} />
			</div>
			<div className="course-card__body">
				<div className="course-card__meta">
					<span>
						<Icon name="clock" size={16} /> {course.estimatedDurationMinutes} min
					</span>
					<span>
						<Icon name="layers" size={16} /> {course.sectionCount} onderdelen
					</span>
				</div>
				<h2>{course.title}</h2>
				<p>{course.description}</p>
				{progress === undefined ? null : <ProgressBar value={progress} />}
			</div>
			<div className="course-card__actions">
				<Button onClick={onPrimary ?? onOpen} icon="arrow-right" iconPosition="end">
					{primaryLabel}
				</Button>
				{onPrimary ? (
					<Button onClick={onOpen} variant="ghost">
						Details
					</Button>
				) : null}
			</div>
		</Card>
	);
}
