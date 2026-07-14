import type { ApprovalStatus, AppRole } from "@hackaithon/shared-types";

export type UserRecord = {
    id: string;
    name: string;
    email: string;
    teamName: string;
    passwordHash: string;
    birthDateIso: string;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    role: AppRole;
    approvalStatus: ApprovalStatus;
    createdAtIso: string;
};
