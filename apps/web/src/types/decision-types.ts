'use client';

// Decision types for the ownership system

export type BudgetAdjustment = 'decrease_20' | 'unchanged' | 'increase_20';
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';
export type CoachingActionType = 'apply' | 'try_different' | 'ignore';

export interface DecisionSet {
    // Pre-run decisions
    addNegativeKeywords: boolean;
    tightenMatchTypes: boolean;
    budgetAdjustment: BudgetAdjustment;
    ignoreAllRecommendations: boolean;

    // Acknowledgment
    acknowledged: boolean;
}

export interface RunDecision {
    runId: string;
    runNumber: number; // Which day or batch this was
    timestamp: string;
    decisions: DecisionSet;
    userLevel: UserLevel;
}

export interface CoachingAction {
    runId: string;
    insightId: string;
    insightTitle: string;
    action: CoachingActionType;
    timestamp: string;
}

export interface DecisionHistory {
    runDecisions: RunDecision[];
    coachingActions: CoachingAction[];
}

// Default decision set
export const defaultDecisionSet: DecisionSet = {
    addNegativeKeywords: false,
    tightenMatchTypes: false,
    budgetAdjustment: 'unchanged',
    ignoreAllRecommendations: false,
    acknowledged: false,
};

// Decision labels for display
export const budgetLabels: Record<BudgetAdjustment, string> = {
    decrease_20: 'Decrease by 20%',
    unchanged: 'Keep unchanged',
    increase_20: 'Increase by 20%',
};

export const userLevelLabels: Record<UserLevel, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
};

export const coachingActionLabels: Record<CoachingActionType, string> = {
    apply: 'Apply this change',
    try_different: 'Try a different approach',
    ignore: 'Ignore and continue',
};
