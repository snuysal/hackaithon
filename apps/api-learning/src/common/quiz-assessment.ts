import { QUIZ_PASS_PERCENTAGE, type QuizAssessmentView } from "@hackaithon/shared-types";

export type QuizAssessmentQuestion = {
    id: string;
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
};

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
    const correctAnswers = orderedQuestions.filter(
        question => progressByAssignmentId.get(question.id)?.isCorrect === true
    ).length;
    const scorePercentage =
        orderedQuestions.length === 0 ? 100 : Math.round((correctAnswers / orderedQuestions.length) * 100);
    const passed =
        orderedQuestions.length === 0 || correctAnswers * 100 >= orderedQuestions.length * QUIZ_PASS_PERCENTAGE;

    return {
        totalQuestions: orderedQuestions.length,
        correctAnswers,
        incorrectAnswers: orderedQuestions
            .filter(question => progressByAssignmentId.get(question.id)?.isCorrect !== true)
            .map(question => ({
                sectionId: question.section.id,
                sectionTitle: question.section.title,
                assignmentId: question.id,
                prompt: question.prompt,
                selectedAnswer: progressByAssignmentId.get(question.id)?.answerText ?? null,
            })),
        scorePercentage,
        requiredPercentage: QUIZ_PASS_PERCENTAGE,
        passed,
    };
}
