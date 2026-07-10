import type { AppRole } from "@hackaithon/shared-types";

export type MenuItem = {
	label: string;
	path: string;
};

export function getMainMenu(role: AppRole): MenuItem[] {
	const baseItems: MenuItem[] = [
		{ label: "Dashboard", path: "/dashboard" },
		{ label: "E-learnings", path: "/elearnings" },
		{ label: "History", path: "/history" },
		{ label: "Achievements", path: "/achievements" },
	];

	if (role === "ADMIN" || role === "TRAINER") {
		baseItems.push({ label: "Manage E-learnings", path: "/admin/elearnings" });
	}

	if (role === "ADMIN") {
		baseItems.push({ label: "Manage Users", path: "/admin/users" });
	}

	return baseItems;
}
