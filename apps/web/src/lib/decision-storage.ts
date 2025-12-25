'use client';

import {
    RunDecision,
    CoachingAction,
    DecisionHistory,
    DecisionSet,
    UserLevel,
    CoachingActionType
} from '@/types/decision-types';

const STORAGE_KEY = 'adsim_decision_history';

// Get all decision history
export function getDecisionHistory(): DecisionHistory {
    if (typeof window === 'undefined') {
        return { runDecisions: [], coachingActions: [] };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load decision history:', e);
    }

    return { runDecisions: [], coachingActions: [] };
}

// Save decision history
function saveDecisionHistory(history: DecisionHistory): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Failed to save decision history:', e);
    }
}

// Save a run decision
export function saveRunDecision(
    runId: string,
    runNumber: number,
    decisions: DecisionSet,
    userLevel: UserLevel
): RunDecision {
    const history = getDecisionHistory();

    const runDecision: RunDecision = {
        runId,
        runNumber,
        timestamp: new Date().toISOString(),
        decisions,
        userLevel,
    };

    // Add to history (avoid duplicates for same run)
    const existingIndex = history.runDecisions.findIndex(
        d => d.runId === runId && d.runNumber === runNumber
    );

    if (existingIndex >= 0) {
        history.runDecisions[existingIndex] = runDecision;
    } else {
        history.runDecisions.push(runDecision);
    }

    saveDecisionHistory(history);
    return runDecision;
}

// Get decisions for a specific run
export function getRunDecisions(runId: string): RunDecision[] {
    const history = getDecisionHistory();
    return history.runDecisions.filter(d => d.runId === runId);
}

// Log a coaching action
export function logCoachingAction(
    runId: string,
    insightId: string,
    insightTitle: string,
    action: CoachingActionType
): CoachingAction {
    const history = getDecisionHistory();

    const coachingAction: CoachingAction = {
        runId,
        insightId,
        insightTitle,
        action,
        timestamp: new Date().toISOString(),
    };

    history.coachingActions.push(coachingAction);
    saveDecisionHistory(history);

    return coachingAction;
}

// Get coaching actions for a specific run
export function getCoachingActions(runId: string): CoachingAction[] {
    const history = getDecisionHistory();
    return history.coachingActions.filter(a => a.runId === runId);
}

// Get the latest run decision
export function getLatestDecision(runId: string): RunDecision | null {
    const decisions = getRunDecisions(runId);
    if (decisions.length === 0) return null;
    return decisions[decisions.length - 1];
}

// Clear all decision history (for testing)
export function clearDecisionHistory(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

// Format decision for display
export function formatDecisionSummary(decision: DecisionSet): string[] {
    const summary: string[] = [];

    if (decision.ignoreAllRecommendations) {
        summary.push('Ignored all recommendations');
    } else {
        if (decision.addNegativeKeywords) {
            summary.push('Added recommended negative keywords');
        }
        if (decision.tightenMatchTypes) {
            summary.push('Tightened match types');
        }
        if (decision.budgetAdjustment === 'decrease_20') {
            summary.push('Decreased budget by 20%');
        } else if (decision.budgetAdjustment === 'increase_20') {
            summary.push('Increased budget by 20%');
        }
    }

    if (summary.length === 0) {
        summary.push('Made no changes');
    }

    return summary;
}
