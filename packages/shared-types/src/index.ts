export const APP_ROLES = ["ADMIN", "TRAINER", "PARTICIPANT"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const ELEARNING_LEVELS = ["JUNIOR", "MEDIOR", "SENIOR"] as const;

export type ElearningLevel = (typeof ELEARNING_LEVELS)[number];

export const ELEARNING_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ElearningStatus = (typeof ELEARNING_STATUSES)[number];

export const ASSIGNMENT_TYPES = ["QUIZ", "OPEN_TEXT"] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export type SignupRequest = {
    name: string;
    email: string;
    birthDateIso: string;
    teamName: string;
    password: string;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type AuthUserView = {
    id: string;
    name: string;
    email: string;
    teamName: string;
    role: AppRole;
    approvalStatus: ApprovalStatus;
    birthDateIso: string;
    canAccessLearning: boolean;
};

export type SignupResponse = {
    user: AuthUserView;
    message: string;
};

export type LoginResponse = {
    sessionToken: string;
    user: AuthUserView;
    nextRoute: string;
};

export type UserSummary = {
    id: string;
    name: string;
    email: string;
    teamName: string;
    role: AppRole;
    approvalStatus: ApprovalStatus;
    createdAtIso: string;
};

export type UpdateUserRoleRequest = {
    newRole: AppRole;
};

export type AssignmentInput = {
    assignmentType: AssignmentType;
    prompt: string;
    optionsJson?: string;
    correctAnswerJson?: string;
    points?: number;
    configJson?: string;
};

export type ElearningSectionInput = {
    title: string;
    content: string;
    assignment?: AssignmentInput;
};

export type CreateElearningRequest = {
    title: string;
    description: string;
    level: ElearningLevel;
    sections: ElearningSectionInput[];
};

export type UpdateElearningRequest = {
    title?: string;
    description?: string;
    level?: ElearningLevel;
    sections?: ElearningSectionInput[];
};

export type AssignmentView = {
    id: string;
    assignmentType: AssignmentType;
    prompt: string;
    optionsJson: string | null;
    correctAnswerJson: string | null;
    points: number;
    configJson: string | null;
};

export type ElearningSectionView = {
    id: string;
    title: string;
    content: string;
    orderIndex: number;
    assignment: AssignmentView | null;
};

export type ElearningView = {
    id: string;
    title: string;
    description: string;
    level: ElearningLevel;
    status: ElearningStatus;
    publishedAtIso: string | null;
    createdAtIso: string;
    updatedAtIso: string;
    createdById: string;
    sections: ElearningSectionView[];
};

export type ElearningSummary = {
    id: string;
    title: string;
    description: string;
    level: ElearningLevel;
    status: ElearningStatus;
    sectionCount: number;
    publishedAtIso: string | null;
};

export const ENROLLMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export type EnrollmentView = {
    id: string;
    userId: string;
    elearningId: string;
    status: EnrollmentStatus;
    startedAtIso: string | null;
    completedAtIso: string | null;
    lastPosition: number;
    totalScore: number;
    streakDays: number;
    createdAtIso: string;
    updatedAtIso: string;
};

export type ProgressUpdateRequest = {
    sectionId: string;
    assignmentId?: string;
    answerText?: string;
    answerJson?: string;
    isCorrect?: boolean;
    score?: number;
    timeSpentSeconds?: number;
    position?: number;
    markCompleted?: boolean;
};

export type ProgressEntryView = {
    id: string;
    sectionId: string;
    assignmentId: string | null;
    answerText: string | null;
    answerJson: string | null;
    isCorrect: boolean | null;
    score: number;
    timeSpentSeconds: number;
    updatedAtIso: string;
};

export type EnrollmentResumeView = {
    enrollment: EnrollmentView;
    progressEntries: ProgressEntryView[];
};

export type HistorySummaryItem = {
    enrollmentId: string;
    elearningId: string;
    elearningTitle: string;
    status: EnrollmentStatus;
    totalScore: number;
    lastPosition: number;
    startedAtIso: string | null;
    completedAtIso: string | null;
    updatedAtIso: string;
};

export type HistoryDetailView = {
    enrollment: EnrollmentView;
    elearning: ElearningSummary;
    progressEntries: ProgressEntryView[];
};
