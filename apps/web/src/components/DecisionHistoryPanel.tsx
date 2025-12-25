'use client';

import { History, Target, Wallet, Ban, Check, X, RefreshCcw } from 'lucide-react';
import { RunDecision, CoachingAction, budgetLabels, coachingActionLabels } from '@/types/decision-types';
import { getRunDecisions, getCoachingActions } from '@/lib/decision-storage';
import { useEffect, useState } from 'react';

interface DecisionHistoryPanelProps {
    runId: string;
}

export default function DecisionHistoryPanel({ runId }: DecisionHistoryPanelProps) {
    const [runDecisions, setRunDecisions] = useState<RunDecision[]>([]);
    const [coachingActions, setCoachingActions] = useState<CoachingAction[]>([]);

    useEffect(() => {
        setRunDecisions(getRunDecisions(runId));
        setCoachingActions(getCoachingActions(runId));
    }, [runId]);

    // Refresh decisions (for when new ones are added)
    const refresh = () => {
        setRunDecisions(getRunDecisions(runId));
        setCoachingActions(getCoachingActions(runId));
    };

    useEffect(() => {
        // Listen for storage changes
        const handleStorage = () => refresh();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [runId]);

    const hasHistory = runDecisions.length > 0 || coachingActions.length > 0;

    if (!hasHistory) {
        return (
            <div className="card">
                <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                    <div>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <History size={18} /> Decision History
                        </h3>
                        <p className="card-subtitle">Your choices will appear here</p>
                    </div>
                </div>
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <p className="text-sm text-muted">
                        Run a simulation day to start building your decision history.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <History size={18} /> Decision History
                    </h3>
                    <p className="card-subtitle">{runDecisions.length} decision{runDecisions.length !== 1 ? 's' : ''} made</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Run Decisions */}
                {runDecisions.map((decision, idx) => (
                    <div
                        key={`${decision.runNumber}-${idx}`}
                        style={{
                            padding: 'var(--space-3)',
                            background: 'var(--gray-800)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: '3px solid var(--primary-500)',
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-2)',
                        }}>
                            <span className="font-semibold text-sm">Day {decision.runNumber}</span>
                            <span className="text-xs text-muted">
                                {new Date(decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                            {decision.decisions.ignoreAllRecommendations ? (
                                <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Ban size={12} className="text-warning" />
                                    <span>Ignored all recommendations</span>
                                </div>
                            ) : (
                                <>
                                    {decision.decisions.addNegativeKeywords && (
                                        <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Target size={12} className="text-success" />
                                            <span>Added negative keywords</span>
                                        </div>
                                    )}
                                    {decision.decisions.tightenMatchTypes && (
                                        <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Check size={12} className="text-success" />
                                            <span>Tightened match types</span>
                                        </div>
                                    )}
                                    {decision.decisions.budgetAdjustment !== 'unchanged' && (
                                        <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <Wallet size={12} className="text-primary" />
                                            <span>{budgetLabels[decision.decisions.budgetAdjustment]}</span>
                                        </div>
                                    )}
                                    {!decision.decisions.addNegativeKeywords &&
                                        !decision.decisions.tightenMatchTypes &&
                                        decision.decisions.budgetAdjustment === 'unchanged' && (
                                            <div className="text-xs text-muted">
                                                No changes made
                                            </div>
                                        )}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {/* Coaching Actions */}
                {coachingActions.length > 0 && (
                    <>
                        <div className="text-xs text-muted" style={{
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            marginTop: 'var(--space-2)',
                        }}>
                            Coaching Responses
                        </div>
                        {coachingActions.slice(-5).map((action, idx) => (
                            <div
                                key={`${action.insightId}-${idx}`}
                                style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.75rem',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    {action.action === 'apply' && <Check size={10} className="text-success" />}
                                    {action.action === 'try_different' && <RefreshCcw size={10} className="text-primary" />}
                                    {action.action === 'ignore' && <X size={10} className="text-muted" />}
                                    <span className="text-muted">{action.insightTitle}:</span>
                                    <span style={{
                                        color: action.action === 'apply' ? 'var(--success)' :
                                            action.action === 'ignore' ? 'var(--text-muted)' : 'var(--primary)'
                                    }}>
                                        {coachingActionLabels[action.action]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
