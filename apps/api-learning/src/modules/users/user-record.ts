import type { ApprovalStatus, AppRole } from "@hackaithon/shared-types";

export type UserRecord = {
    id: string;
    name: string;
    email: string;
    teamName: string;
    passwordHash: string;
    birthDateIso: string;
    role: AppRole;
    approvalStatus: ApprovalStatus;
    createdAtIso: string;
};
