import type { AppRole, AuthUserView } from "@hackaithon/shared-types";
import { useEffect, useState, type ReactElement, type ReactNode } from "react";

import { Icon, type IconName } from "./Icon.js";
import { StatusBadge } from "./ui.js";

type NavigationItem = {
	href: string;
	icon: IconName;
	label: string;
	roles?: AppRole[];
};

const navigationItems: NavigationItem[] = [
	{ href: "/dashboard", icon: "home", label: "Dashboard" },
	{ href: "/catalogus", icon: "book", label: "Catalogus" },
	{ href: "/historie", icon: "history", label: "Historie" },
	{ href: "/beheer/nakijken", icon: "edit", label: "Antwoorden nakijken", roles: ["ADMIN", "TRAINER"] },
	{
		href: "/beheer/elearnings",
		icon: "settings",
		label: "E-learnings beheren",
		roles: ["ADMIN", "TRAINER"],
	},
	{ href: "/beheer/gebruikers", icon: "users", label: "Gebruikers", roles: ["ADMIN"] },
];

type AppShellProps = {
	children: ReactNode;
	isBusy?: boolean;
	onLogout: () => void;
	onNavigate: (path: string) => void;
	routePath: string;
	user: AuthUserView;
};

export function AppShell({
	children,
	isBusy = false,
	onLogout,
	onNavigate,
	routePath,
	user,
}: AppShellProps): ReactElement {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const visibleNavigationItems = navigationItems.filter(item => !item.roles || item.roles.includes(user.role));

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [routePath]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent): void {
			if (event.key === "Escape") setIsMobileMenuOpen(false);
		}

		document.body.classList.toggle("mobile-menu-open", isMobileMenuOpen);
		if (isMobileMenuOpen) window.addEventListener("keydown", handleKeyDown);
		return (): void => {
			document.body.classList.remove("mobile-menu-open");
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [isMobileMenuOpen]);

	function handleNavigate(path: string): void {
		onNavigate(path);
		setIsMobileMenuOpen(false);
	}

	return (
		<div className="app-shell">
			<a className="skip-link" href="#main-content">
				Ga naar hoofdinhoud
			</a>
			<aside className={`sidebar ${isMobileMenuOpen ? "sidebar--open" : ""}`}>
				<div className="sidebar__brand">
					<Brand />
					<button
						aria-label="Navigatie sluiten"
						className="icon-button icon-button--light sidebar__close"
						onClick={() => setIsMobileMenuOpen(false)}
						type="button"
					>
						<Icon name="close" />
					</button>
				</div>
				<Navigation items={visibleNavigationItems} onNavigate={handleNavigate} routePath={routePath} />
				<div className="sidebar__academy-note">
					<div className="sidebar__academy-icon">
						<Icon name="sparkles" size={20} />
					</div>
					<p className="eyebrow">Cerios Academy</p>
					<strong>Jouw talent staat nooit stil.</strong>
				</div>
			</aside>
			{isMobileMenuOpen ? (
				<button
					aria-label="Navigatie sluiten"
					className="sidebar-backdrop"
					onClick={() => setIsMobileMenuOpen(false)}
					type="button"
				/>
			) : null}
			<div className="app-shell__body">
				<Header
					isBusy={isBusy}
					isMobileMenuOpen={isMobileMenuOpen}
					onLogout={onLogout}
					onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
					user={user}
				/>
				<main className="main-content" id="main-content" tabIndex={-1}>
					{children}
				</main>
			</div>
		</div>
	);
}

type NavigationProps = {
	items: NavigationItem[];
	onNavigate: (path: string) => void;
	routePath: string;
};

export function Navigation({ items, onNavigate, routePath }: NavigationProps): ReactElement {
	return (
		<nav aria-label="Hoofdnavigatie" className="navigation">
			<p className="navigation__label">Academy portal</p>
			<ul>
				{items.map(item => {
					const isActive =
						routePath === item.href || (item.href === "/catalogus" && routePath.startsWith("/catalogus/"));
					return (
						<li key={item.href}>
							<a
								aria-current={isActive ? "page" : undefined}
								className={isActive ? "navigation__link navigation__link--active" : "navigation__link"}
								href={item.href}
								onClick={event => {
									event.preventDefault();
									onNavigate(item.href);
								}}
							>
								<Icon name={item.icon} />
								<span>{item.label}</span>
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}

type HeaderProps = {
	isBusy: boolean;
	isMobileMenuOpen: boolean;
	onLogout: () => void;
	onOpenMobileMenu: () => void;
	user: AuthUserView;
};

export function Header({ isBusy, isMobileMenuOpen, onLogout, onOpenMobileMenu, user }: HeaderProps): ReactElement {
	return (
		<header className="topbar">
			<div className="topbar__inner">
				<button
					aria-expanded={isMobileMenuOpen}
					aria-label="Navigatie openen"
					className="icon-button topbar__menu"
					onClick={onOpenMobileMenu}
					type="button"
				>
					<Icon name="menu" />
				</button>
				<div className="topbar__mobile-brand">
					<Brand compact />
				</div>
				<div className="topbar__spacer" />
				{isBusy ? (
					<span aria-live="polite" className="topbar__saving">
						Bezig met bijwerken...
					</span>
				) : null}
				<details className="user-menu">
					<summary>
						<span className="avatar">{getInitials(user.name)}</span>
						<span className="user-menu__copy">
							<strong>{user.name}</strong>
							<small>{user.teamName}</small>
						</span>
						<Icon name="chevron-down" size={16} />
					</summary>
					<div className="user-menu__popover">
						<div className="user-menu__identity">
							<strong>{user.name}</strong>
							<span>{user.email}</span>
							<StatusBadge status={user.role} />
						</div>
						<button className="user-menu__action" onClick={onLogout} type="button">
							<Icon name="logout" size={18} /> Uitloggen
						</button>
					</div>
				</details>
			</div>
		</header>
	);
}

function Brand({ compact = false }: { compact?: boolean }): ReactElement {
	return (
		<div aria-label="Cerios Academy" className={`brand ${compact ? "brand--compact" : ""}`}>
			<span aria-hidden="true" className="brand__mark">
				<i />
				<i />
				<i />
			</span>
			<span className="brand__wordmark">
				<strong>Cerios</strong>
				<small>Academy</small>
			</span>
		</div>
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
