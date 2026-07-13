import type {
    BadgeAwardView,
    BadgeGoalMetric,
    BadgeGoalView,
    GamificationSummaryView,
} from "@hackaithon/shared-types";

export type BadgeDefinitionRecord = {
    id: string;
    code: string;
    title: string;
    description: string;
    ruleJson: string;
};

export type BadgeAwardRecord = {
    id: string;
    awardedAt: Date;
    badgeDefinition: {
        code: string;
        title: string;
        description: string;
    };
};

export type GamificationMetrics = {
    totalScore: number;
    completedSections: number;
    completedCourses: number;
    currentStreakDays: number;
};

type BadgeRule =
    | {
        trigger: "section_completed";
        minCount: number;
    }
    | {
        trigger: "course_completed";
        minCount: number;
    }
    | {
        trigger: "streak_days";
        minDays: number;
    };

export function calculateCurrentStreakDays(
    completedAtValues: Array<Date | null | undefined>,
    today: Date = new Date()
): number {
    const completionKeys = Array.from(
        new Set(
            completedAtValues
                .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
                .map(toUtcDateKey)
        )
    ).sort(compareDescendingDateKeys);

    if (completionKeys.length === 0) {
        return 0;
    }

    const todayKey = toUtcDateKey(today);
    const yesterdayKey = toUtcDateKey(addUtcDays(today, -1));
    const mostRecentCompletionKey = completionKeys[0];

    if (mostRecentCompletionKey !== todayKey && mostRecentCompletionKey !== yesterdayKey) {
        return 0;
    }

    let streakDays = 1;

    for (let index = 1; index < completionKeys.length; index += 1) {
        const previousKey = completionKeys[index - 1];
        const expectedKey = toUtcDateKey(addUtcDays(parseUtcDateKey(previousKey), -1));

        if (completionKeys[index] !== expectedKey) {
            break;
        }

        streakDays += 1;
    }

    return streakDays;
}

export function meetsBadgeRule(definition: BadgeDefinitionRecord, metrics: GamificationMetrics): boolean {
    const progress = getBadgeGoal(definition, metrics);

    if (!progress) {
        return false;
    }

    return progress.remainingValue === 0;
}

export function buildGamificationSummary(input: {
    badgeDefinitions: BadgeDefinitionRecord[];
    badges: BadgeAwardRecord[];
    metrics: GamificationMetrics;
}): GamificationSummaryView {
    return {
        totalScore: input.metrics.totalScore,
        currentStreakDays: input.metrics.currentStreakDays,
        completedCourses: input.metrics.completedCourses,
        completedSections: input.metrics.completedSections,
        badges: input.badges.map(mapBadgeAward),
        nextBadge: getNextBadge(input.badgeDefinitions, input.badges, input.metrics),
    };
}

export function mapBadgeAward(badge: BadgeAwardRecord): BadgeAwardView {
    return {
        id: badge.id,
        code: badge.badgeDefinition.code,
        title: badge.badgeDefinition.title,
        description: badge.badgeDefinition.description,
        awardedAtIso: badge.awardedAt.toISOString(),
    };
}

function getNextBadge(
    badgeDefinitions: BadgeDefinitionRecord[],
    awardedBadges: BadgeAwardRecord[],
    metrics: GamificationMetrics
): BadgeGoalView | null {
    const awardedCodes = new Set(awardedBadges.map(badge => badge.badgeDefinition.code));

    const nextGoals = badgeDefinitions
        .filter(definition => !awardedCodes.has(definition.code))
        .map(definition => getBadgeGoal(definition, metrics))
        .filter((goal): goal is BadgeGoalView => goal !== null)
        .sort(compareBadgeGoals);

    return nextGoals[0] ?? null;
}

function getBadgeGoal(definition: BadgeDefinitionRecord, metrics: GamificationMetrics): BadgeGoalView | null {
    const rule = parseBadgeRule(definition.ruleJson);

    if (!rule) {
        return null;
    }

    if (rule.trigger === "section_completed") {
        return createBadgeGoal(definition, "SECTIONS", metrics.completedSections, rule.minCount);
    }

    if (rule.trigger === "course_completed") {
        return createBadgeGoal(definition, "COURSES", metrics.completedCourses, rule.minCount);
    }

    return createBadgeGoal(definition, "STREAK_DAYS", metrics.currentStreakDays, rule.minDays);
}

function createBadgeGoal(
    definition: BadgeDefinitionRecord,
    metric: BadgeGoalMetric,
    currentValue: number,
    targetValue: number
): BadgeGoalView {
    const normalizedTargetValue = Math.max(targetValue, 1);
    const boundedCurrentValue = Math.max(currentValue, 0);
    const remainingValue = Math.max(normalizedTargetValue - boundedCurrentValue, 0);

    return {
        code: definition.code,
        title: definition.title,
        description: definition.description,
        metric,
        currentValue: boundedCurrentValue,
        targetValue: normalizedTargetValue,
        remainingValue,
        progressPercent: Math.min(100, Math.round((Math.min(boundedCurrentValue, normalizedTargetValue) / normalizedTargetValue) * 100)),
    };
}

function parseBadgeRule(value: string): BadgeRule | null {
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;

        if (parsed.trigger === "section_completed" && typeof parsed.minCount === "number") {
            return { trigger: "section_completed", minCount: parsed.minCount };
        }

        if (parsed.trigger === "course_completed" && typeof parsed.minCount === "number") {
            return { trigger: "course_completed", minCount: parsed.minCount };
        }

        if (parsed.trigger === "streak_days" && typeof parsed.minDays === "number") {
            return { trigger: "streak_days", minDays: parsed.minDays };
        }
    } catch {
        return null;
    }

    return null;
}

function compareBadgeGoals(left: BadgeGoalView, right: BadgeGoalView): number {
    if (left.progressPercent !== right.progressPercent) {
        return right.progressPercent - left.progressPercent;
    }

    if (left.remainingValue !== right.remainingValue) {
        return left.remainingValue - right.remainingValue;
    }

    return left.title.localeCompare(right.title, "nl-NL");
}

function compareDescendingDateKeys(left: string, right: string): number {
    return right.localeCompare(left);
}

function addUtcDays(value: Date, days: number): Date {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));
}

function parseUtcDateKey(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function toUtcDateKey(value: Date): string {
    return value.toISOString().split("T")[0] ?? "";
}
