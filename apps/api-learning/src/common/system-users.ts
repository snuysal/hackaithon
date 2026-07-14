const SYSTEM_USER_EMAILS = new Set(["admin@hackaithon.local", "trainer@hackaithon.local"]);

export function isSystemUserEmail(email: string): boolean {
	return SYSTEM_USER_EMAILS.has(email.trim().toLowerCase());
}
