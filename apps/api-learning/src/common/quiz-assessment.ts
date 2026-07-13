import {
    ASSESSMENT_PASS_PERCENTAGE,
    OPEN_QUESTION_PASS_GRADE,
    type AssignmentType,
    type QuizAssessmentView,
} from "@hackaithon/shared-types";

export type QuizAssessmentQuestion = {
    id: string;
    assignmentType: AssignmentType;
    prompt: string;
    section: {
        id: string;
        title: string;
        orderIndex: number;
    };
};

export type QuizAssessmentProgress = {
    assignmentId: string | null;
    answerText: string | null;
    isCorrect: boolean | null;
    grade: number | null;
    reviewComment: string | null;
};

export const calculateCourseAssessment = calculateQuizAssessment;

export function calculateQuizAssessment(
    questions: QuizAssessmentQuestion[],
    progressEntries: QuizAssessmentProgress[]
): QuizAssessmentView {
    const orderedQuestions = [...questions].sort((left, right) => left.section.orderIndex - right.section.orderIndex);
    const progressByAssignmentId = new Map(
        progressEntries
            .filter(entry => entry.assignmentId)
            .map(entry => [entry.assignmentId as string, entry] as const)
    );
    const answerResults = orderedQuestions.map(question =>
        assessQuestion(question, progressByAssignmentId.get(question.id) ?? null)
    );
    const correctAnswers = answerResults.filter(result => result.isCorrect).length;
    const pendingReviewAnswers = answerResults
        .filter(result => result.isPendingReview)
        .map(result => result.answerView);
    const incorrectAnswers = answerResults
        .filter(result => !result.isCorrect && !result.isPendingReview)
        .map(result => result.answerView);
    const scorePercentage =
        orderedQuestions.length === 0 ? 100 : Math.round((correctAnswers / orderedQuestions.length) * 100);
    const passed =
        pendingReviewAnswers.length === 0 &&
        (orderedQuestions.length === 0 ||
            correctAnswers * 100 >= orderedQuestions.length * ASSESSMENT_PASS_PERCENTAGE);

    return {
        totalQuestions: orderedQuestions.length,
        correctAnswers,
        incorrectAnswers,
        pendingReviewAnswers,
        scorePercentage,
        requiredPercentage: ASSESSMENT_PASS_PERCENTAGE,
        awaitingReview: pendingReviewAnswers.length > 0,
        passed,
    };
}

function assessQuestion(
    question: QuizAssessmentQuestion,
    progressEntry: QuizAssessmentProgress | null
): {
    answerView: QuizAssessmentView["incorrectAnswers"][number];
    isCorrect: boolean;
    isPendingReview: boolean;
} {
    const answerView = {
        sectionId: question.section.id,
        sectionTitle: question.section.title,
        assignmentId: question.id,
        assignmentType: question.assignmentType,
        prompt: question.prompt,
        selectedAnswer: progressEntry?.answerText ?? null,
        grade: progressEntry?.grade ?? null,
        reviewerComment: progressEntry?.reviewComment ?? null,
    };

    if (question.assignmentType === "OPEN_TEXT") {
        return assessOpenQuestion(answerView, progressEntry);
    }

    return {
        answerView,
        isCorrect: progressEntry?.isCorrect === true,
        isPendingReview: false,
    };
}

function assessOpenQuestion(
    answerView: QuizAssessmentView["incorrectAnswers"][number],
    progressEntry: QuizAssessmentProgress | null
): {
    answerView: QuizAssessmentView["incorrectAnswers"][number];
    isCorrect: boolean;
    isPendingReview: boolean;
} {
    if (!progressEntry?.answerText?.trim()) {
        return { answerView, isCorrect: false, isPendingReview: false };
    }

    if (progressEntry.grade === null || progressEntry.grade === undefined) {
        return { answerView, isCorrect: false, isPendingReview: true };
    }

    return {
        answerView,
        isCorrect: progressEntry.grade >= OPEN_QUESTION_PASS_GRADE,
        isPendingReview: false,
    };
}
