export const APP_ROLES = ["ADMIN", "TRAINER", "PARTICIPANT"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const ELEARNING_LEVELS = ["JUNIOR", "MEDIOR", "SENIOR"] as const;

export type ElearningLevel = (typeof ELEARNING_LEVELS)[number];

export const ELEARNING_STATUSES = ["DRAFT", "PUBLISHED"] as const;

export type ElearningStatus = (typeof ELEARNING_STATUSES)[number];

export const ELEARNING_AUDIENCES = ["ALL", "STAFF", "PARTICIPANT"] as const;

export type ElearningAudience = (typeof ELEARNING_AUDIENCES)[number];

export const ASSIGNMENT_TYPES = ["QUIZ", "OPEN_TEXT"] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

const WORDS_PER_MINUTE_BY_LEVEL: Record<ElearningLevel, number> = {
    JUNIOR: 220,
    MEDIOR: 190,
    SENIOR: 160,
};

const SECTION_OVERHEAD_MINUTES = 0.75;
const QUIZ_ASSIGNMENT_MINUTES = 1.5;
const OPEN_TEXT_ASSIGNMENT_MINUTES = 3.5;
const MIN_SECTION_DURATION_MINUTES = 3;
const MIN_ELEARNING_DURATION_MINUTES = 5;

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
    audience: ElearningAudience;
    sections: ElearningSectionInput[];
};

export type UpdateElearningRequest = {
    title?: string;
    description?: string;
    level?: ElearningLevel;
    audience?: ElearningAudience;
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
    estimatedDurationMinutes: number;
    assignment: AssignmentView | null;
};

export type ElearningView = {
    id: string;
    title: string;
    description: string;
    level: ElearningLevel;
    audience: ElearningAudience;
    status: ElearningStatus;
    publishedAtIso: string | null;
    createdAtIso: string;
    updatedAtIso: string;
    createdById: string;
    estimatedDurationMinutes: number;
    sections: ElearningSectionView[];
};

export type ElearningSummary = {
    id: string;
    title: string;
    description: string;
    level: ElearningLevel;
    audience: ElearningAudience;
    status: ElearningStatus;
    sectionCount: number;
    estimatedDurationMinutes: number;
    publishedAtIso: string | null;
};

export type DurationEstimateAssignment = {
    assignmentType: AssignmentType;
    prompt?: string | null;
    optionsJson?: string | null;
};

export type DurationEstimateSection = {
    title?: string | null;
    content: string;
    assignment?: DurationEstimateAssignment | null;
};

export type DurationEstimateInput = {
    description?: string | null;
    level: ElearningLevel;
    sections: DurationEstimateSection[];
};

export function estimateSectionDurationMinutes(level: ElearningLevel, section: DurationEstimateSection): number {
    const readingMinutes =
        countWords(section.title) / WORDS_PER_MINUTE_BY_LEVEL[level] +
        countWords(section.content) / WORDS_PER_MINUTE_BY_LEVEL[level] +
        countWords(section.assignment?.prompt) / WORDS_PER_MINUTE_BY_LEVEL[level] +
        countWords(getAssignmentOptionsText(section.assignment?.optionsJson)) / WORDS_PER_MINUTE_BY_LEVEL[level];

    const assignmentMinutes = getAssignmentDurationMinutes(section.assignment);

    return Math.max(MIN_SECTION_DURATION_MINUTES, Math.ceil(readingMinutes + SECTION_OVERHEAD_MINUTES + assignmentMinutes));
}

export function estimateElearningDurationMinutes({
    description,
    level,
    sections,
}: DurationEstimateInput): number {
    const descriptionMinutes = countWords(description) / WORDS_PER_MINUTE_BY_LEVEL[level];
    const sectionMinutes = sections.reduce((total, section) => total + estimateSectionDurationMinutes(level, section), 0);

    return Math.max(MIN_ELEARNING_DURATION_MINUTES, Math.ceil(descriptionMinutes + sectionMinutes));
}

export const ENROLLMENT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "AWAITING_REVIEW", "COMPLETED"] as const;

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ASSESSMENT_PASS_PERCENTAGE = 70;

export const QUIZ_PASS_PERCENTAGE = ASSESSMENT_PASS_PERCENTAGE;

export const OPEN_QUESTION_PASS_GRADE = 5.5;

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

export type BadgeAwardView = {
    id: string;
    code: string;
    title: string;
    description: string;
    awardedAtIso: string;
};

export const BADGE_GOAL_METRICS = ["SECTIONS", "COURSES", "STREAK_DAYS"] as const;

export type BadgeGoalMetric = (typeof BADGE_GOAL_METRICS)[number];

export type BadgeGoalView = {
    code: string;
    title: string;
    description: string;
    metric: BadgeGoalMetric;
    currentValue: number;
    targetValue: number;
    remainingValue: number;
    progressPercent: number;
};

export type ProgressUpdateRequest = {
    sectionId: string;
    assignmentId?: string;
    answerText?: string;
    answerJson?: string;
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
    grade: number | null;
    reviewComment: string | null;
    reviewedAtIso: string | null;
    reviewedById: string | null;
    timeSpentSeconds: number;
    updatedAtIso: string;
};

export type AssessmentAnswerView = {
    sectionId: string;
    sectionTitle: string;
    assignmentId: string;
    assignmentType: AssignmentType;
    prompt: string;
    selectedAnswer: string | null;
    grade: number | null;
    reviewerComment: string | null;
};

export type CourseAssessmentView = {
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: AssessmentAnswerView[];
    pendingReviewAnswers: AssessmentAnswerView[];
    scorePercentage: number;
    requiredPercentage: number;
    awaitingReview: boolean;
    passed: boolean;
};

export type IncorrectQuizAnswerView = AssessmentAnswerView;

export type QuizAssessmentView = CourseAssessmentView;

export type EnrollmentResumeView = {
    enrollment: EnrollmentView;
    progressEntries: ProgressEntryView[];
    assessment: QuizAssessmentView;
    newlyAwardedBadges: BadgeAwardView[];
};

export type PendingOpenAnswerReviewView = {
    progressEntryId: string;
    enrollmentId: string;
    userId: string;
    userName: string;
    elearningId: string;
    elearningTitle: string;
    sectionId: string;
    sectionTitle: string;
    assignmentId: string;
    prompt: string;
    answerText: string;
    submittedAtIso: string;
};

export type OpenAnswerReviewRequest = {
    grade: number;
    comment?: string;
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

export type GamificationSummaryView = {
    totalScore: number;
    currentStreakDays: number;
    completedCourses: number;
    completedSections: number;
    badges: BadgeAwardView[];
    nextBadge: BadgeGoalView | null;
};

function countWords(value: string | null | undefined): number {
    if (!value) return 0;

    return value
        .trim()
        .split(/\s+/u)
        .filter(Boolean).length;
}

function getAssignmentDurationMinutes(assignment: DurationEstimateAssignment | null | undefined): number {
    if (!assignment) return 0;
    if (assignment.assignmentType === "QUIZ") return QUIZ_ASSIGNMENT_MINUTES;
    return OPEN_TEXT_ASSIGNMENT_MINUTES;
}

function getAssignmentOptionsText(optionsJson: string | null | undefined): string {
    if (!optionsJson) return "";

    try {
        const parsed = JSON.parse(optionsJson) as unknown;
        if (!Array.isArray(parsed)) return optionsJson;
        return parsed.filter((option): option is string => typeof option === "string").join(" ");
    } catch {
        return optionsJson;
    }
}
