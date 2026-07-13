import { useEffect, useState } from "react";

import type { AppRoute } from "../types.js";

export function parseRoute(pathname: string): AppRoute {
	const normalizedPath = normalizePath(pathname);

	if (normalizedPath === "/" || normalizedPath === "/login") {
		return { name: "auth", path: "/login" };
	}

	if (normalizedPath === "/dashboard") {
		return { name: "dashboard", path: "/dashboard" };
	}

	if (normalizedPath === "/catalogus") {
		return { name: "catalog", path: "/catalogus" };
	}

	const courseDetailMatch = /^\/catalogus\/([^/]+)$/.exec(normalizedPath);
	if (courseDetailMatch?.[1]) {
		return {
			name: "course-detail",
			path: normalizedPath,
			elearningId: decodeURIComponent(courseDetailMatch[1]),
		};
	}

	const learningMatch = /^\/leren\/([^/]+)$/.exec(normalizedPath);
	if (learningMatch?.[1]) {
		return {
			name: "learning",
			path: normalizedPath,
			elearningId: decodeURIComponent(learningMatch[1]),
		};
	}

	if (normalizedPath === "/historie") {
		return { name: "history", path: "/historie" };
	}

	if (normalizedPath === "/beheer/nakijken") {
		return { name: "reviews", path: "/beheer/nakijken" };
	}

	if (normalizedPath === "/beheer/elearnings") {
		return { name: "manage-courses", path: "/beheer/elearnings" };
	}

	if (normalizedPath === "/beheer/gebruikers") {
		return { name: "manage-users", path: "/beheer/gebruikers" };
	}

	return { name: "not-found", path: normalizedPath };
}

export function navigate(path: string, replace = false): void {
	if (replace) {
		window.history.replaceState({}, "", path);
	} else {
		window.history.pushState({}, "", path);
	}

	window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useAppRoute(): AppRoute {
	const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.pathname));

	useEffect(() => {
		function handleLocationChange(): void {
			setRoute(parseRoute(window.location.pathname));
		}

		window.addEventListener("popstate", handleLocationChange);
		return (): void => window.removeEventListener("popstate", handleLocationChange);
	}, []);

	return route;
}

function normalizePath(pathname: string): string {
	const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
	if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")) {
		return withLeadingSlash.slice(0, -1);
	}

	return withLeadingSlash;
}
