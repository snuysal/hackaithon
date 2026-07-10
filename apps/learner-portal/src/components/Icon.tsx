import type { ReactElement } from "react";

export type IconName =
	| "arrow-left"
	| "arrow-right"
	| "award"
	| "book"
	| "calendar"
	| "check"
	| "chevron-down"
	| "clock"
	| "close"
	| "edit"
	| "history"
	| "home"
	| "layers"
	| "logout"
	| "menu"
	| "plus"
	| "play"
	| "search"
	| "settings"
	| "sparkles"
	| "user"
	| "users";

type IconProps = {
	name: IconName;
	size?: number;
};

export function Icon({ name, size = 20 }: IconProps): ReactElement {
	return (
		<svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>
			{getIconPaths(name)}
		</svg>
	);
}

// oxlint-disable-next-line eslint/complexity
function getIconPaths(name: IconName): ReactElement {
	const sharedProps = {
		stroke: "currentColor",
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		strokeWidth: 1.8,
	};

	switch (name) {
		case "home":
			return <path {...sharedProps} d="m3.5 10.5 8.5-7 8.5 7v9a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />;
		case "book":
			return (
				<>
					<path {...sharedProps} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
					<path {...sharedProps} d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
				</>
			);
		case "history":
			return (
				<>
					<path {...sharedProps} d="M4.4 8A8.5 8.5 0 1 1 3.7 15" />
					<path {...sharedProps} d="M3.5 4v4.5H8" />
					<path {...sharedProps} d="M12 7.5V12l3 2" />
				</>
			);
		case "settings":
			return (
				<>
					<circle {...sharedProps} cx="12" cy="12" r="3" />
					<path
						{...sharedProps}
						d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
					/>
				</>
			);
		case "users":
			return (
				<>
					<path {...sharedProps} d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
					<circle {...sharedProps} cx="9" cy="7" r="4" />
					<path {...sharedProps} d="M22 20v-1.5a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6" />
				</>
			);
		case "menu":
			return <path {...sharedProps} d="M4 7h16M4 12h16M4 17h16" />;
		case "close":
			return <path {...sharedProps} d="m6 6 12 12M18 6 6 18" />;
		case "arrow-right":
			return <path {...sharedProps} d="M5 12h14m-5-5 5 5-5 5" />;
		case "arrow-left":
			return <path {...sharedProps} d="M19 12H5m5 5-5-5 5-5" />;
		case "play":
			return <path {...sharedProps} d="m9 6 9 6-9 6z" />;
		case "clock":
			return (
				<>
					<circle {...sharedProps} cx="12" cy="12" r="9" />
					<path {...sharedProps} d="M12 7v5l3 2" />
				</>
			);
		case "check":
			return <path {...sharedProps} d="m5 12 4 4L19 6" />;
		case "sparkles":
			return (
				<path
					{...sharedProps}
					d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2zM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z"
				/>
			);
		case "plus":
			return <path {...sharedProps} d="M12 5v14M5 12h14" />;
		case "edit":
			return (
				<>
					<path {...sharedProps} d="M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.8 2.8 0 0 0-4-4l-10 10z" />
					<path {...sharedProps} d="M13 5.5 18.5 11" />
				</>
			);
		case "logout":
			return <path {...sharedProps} d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8" />;
		case "chevron-down":
			return <path {...sharedProps} d="m7 9 5 5 5-5" />;
		case "search":
			return (
				<>
					<circle {...sharedProps} cx="10.5" cy="10.5" r="6.5" />
					<path {...sharedProps} d="m15.5 15.5 4 4" />
				</>
			);
		case "user":
			return (
				<>
					<circle {...sharedProps} cx="12" cy="8" r="4" />
					<path {...sharedProps} d="M4 21a8 8 0 0 1 16 0" />
				</>
			);
		case "layers":
			return <path {...sharedProps} d="m12 3 9 5-9 5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5" />;
		case "award":
			return <path {...sharedProps} d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm-3 0-1 6 4-2 4 2-1-6" />;
		case "calendar":
			return (
				<path
					{...sharedProps}
					d="M5 4v3M19 4v3M3 9h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
				/>
			);
	}
}
