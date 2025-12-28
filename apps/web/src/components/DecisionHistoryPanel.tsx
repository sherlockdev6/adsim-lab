'use client';

import { History, Target, Wallet, Ban, Check, X, RefreshCcw, TrendingUp, TrendingDown, Minus, Clock, Zap } from 'lucide-react';
import { RunDecision, CoachingAction, budgetLabels, coachingActionLabels } from '@/types/decision-types';
import { getRunDecisions, getCoachingActions } from '@/lib/decision-storage';
import { useEffect, useState } from 'react';

interface DecisionHistoryPanelProps {
    runId: string;
    dailyResults?: Array<{
        day_number: number;
        conversions: number;
        cost: number;
        ctr?: number;
        cvr?: number;
        cpc?: number;
        roas?: number;
    }>;
}

// Calculate impact by comparing metrics before/after a decision
function calculateImpact(
    dailyResults: DecisionHistoryPanelProps['dailyResults'],
    runNumber: number
): { cvr?: string; cpa?: string; roas?: string; direction: 'positive' | 'negative' | 'neutral' } | null {
    if (!dailyResults || dailyResults.length < 2) return null;

    const currentDay = dailyResults.find(d => d.day_number === runNumber);
    const prevDay = dailyResults.find(d => d.day_number === runNumber - 1);

    if (!currentDay || !prevDay) return null;

    const currCvr = currentDay.cvr || 0;
    const prevCvr = prevDay.cvr || 0;
    const cvrChange = prevCvr > 0 ? ((currCvr - prevCvr) / prevCvr) * 100 : 0;

    const currCpa = currentDay.conversions > 0 ? currentDay.cost / currentDay.conversions : 0;
    const prevCpa = prevDay.conversions > 0 ? prevDay.cost / prevDay.conversions : 0;
    const cpaChange = prevCpa > 0 ? ((currCpa - prevCpa) / prevCpa) * 100 : 0;

    const currRoas = currentDay.roas || 0;
    const prevRoas = prevDay.roas || 0;
    const roasChange = prevRoas > 0 ? ((currRoas - prevRoas) / prevRoas) * 100 : 0;

    // Determine overall direction
    let direction: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (cvrChange > 5 || cpaChange < -5 || roasChange > 5) {
        direction = 'positive';
    } else if (cvrChange < -5 || cpaChange > 5 || roasChange < -5) {
        direction = 'negative';
    }

    return {
        cvr: Math.abs(cvrChange) > 2 ? `${cvrChange > 0 ? '+' : ''}${cvrChange.toFixed(0)}%` : undefined,
        cpa: Math.abs(cpaChange) > 2 ? `${cpaChange > 0 ? '+' : ''}${cpaChange.toFixed(0)}%` : undefined,
        roas: Math.abs(roasChange) > 2 ? `${roasChange > 0 ? '+' : ''}${roasChange.toFixed(0)}%` : undefined,
        direction,
    };
}

export default function DecisionHistoryPanel({ runId, dailyResults }: DecisionHistoryPanelProps) {
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
                            <History size={18} /> Decision Timeline
                        </h3>
                        <p className="card-subtitle">Your choices will appear here</p>
                    </div>
                </div>
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'var(--gray-800)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--space-3)'
                    }}>
                        <Clock size={24} className="text-muted" />
                    </div>
                    <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
                        Run a simulation day to start building your decision timeline.
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
                        <History size={18} /> Decision Timeline
                    </h3>
                    <p className="card-subtitle">
                        {runDecisions.length} decision{runDecisions.length !== 1 ? 's' : ''} •
                        {coachingActions.length > 0 && ` ${coachingActions.length} coaching response${coachingActions.length !== 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>

            {/* Timeline View */}
            <div style={{
                position: 'relative',
                paddingLeft: 'var(--space-4)',
            }}>
                {/* Timeline line */}
                <div style={{
                    position: 'absolute',
                    left: '6px',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'linear-gradient(to bottom, var(--primary-500), var(--gray-700))',
                    borderRadius: '1px',
                }} />

                {/* Run Decisions */}
                {runDecisions.map((decision, idx) => {
                    const impact = calculateImpact(dailyResults, decision.runNumber);
                    const hasPositiveDecisions = decision.decisions.addNegativeKeywords ||
                        decision.decisions.tightenMatchTypes;

                    return (
                        <div
                            key={`${decision.runNumber}-${idx}`}
                            style={{
                                position: 'relative',
                                paddingBottom: 'var(--space-4)',
                                paddingLeft: 'var(--space-4)',
                            }}
                        >
                            {/* Timeline dot */}
                            <div style={{
                                position: 'absolute',
                                left: '-7px',
                                top: '4px',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: impact?.direction === 'positive'
                                    ? 'var(--success)'
                                    : impact?.direction === 'negative'
                                        ? 'var(--error)'
                                        : hasPositiveDecisions
                                            ? 'var(--primary-500)'
                                            : 'var(--gray-600)',
                                border: '2px solid var(--gray-900)',
                            }} />

                            {/* Decision Card */}
                            <div style={{
                                padding: 'var(--space-3)',
                                background: impact?.direction === 'positive'
                                    ? 'rgba(34, 197, 94, 0.08)'
                                    : impact?.direction === 'negative'
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : 'var(--gray-800)',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${impact?.direction === 'positive'
                                    ? 'rgba(34, 197, 94, 0.2)'
                                    : impact?.direction === 'negative'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'transparent'}`,
                            }}>
                                {/* Header */}
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

                                {/* Decisions */}
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

                                {/* Impact Badges */}
                                {impact && (impact.cvr || impact.cpa || impact.roas) && (
                                    <div style={{
                                        marginTop: 'var(--space-2)',
                                        paddingTop: 'var(--space-2)',
                                        borderTop: '1px solid var(--gray-700)',
                                        display: 'flex',
                                        gap: 'var(--space-2)',
                                        flexWrap: 'wrap',
                                    }}>
                                        {impact.cvr && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: impact.cvr.startsWith('+') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: impact.cvr.startsWith('+') ? 'var(--success)' : 'var(--error)',
                                            }}>
                                                {impact.cvr.startsWith('+') ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                CVR {impact.cvr}
                                            </span>
                                        )}
                                        {impact.cpa && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                borderRadius: 'var(--radius-sm)',
                                                // CPA: lower is better, so flip the colors
                                                background: impact.cpa.startsWith('+') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                color: impact.cpa.startsWith('+') ? 'var(--error)' : 'var(--success)',
                                            }}>
                                                {impact.cpa.startsWith('+') ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                CPA {impact.cpa}
                                            </span>
                                        )}
                                        {impact.roas && (
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                borderRadius: 'var(--radius-sm)',
                                                background: impact.roas.startsWith('+') ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: impact.roas.startsWith('+') ? 'var(--success)' : 'var(--error)',
                                            }}>
                                                {impact.roas.startsWith('+') ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                                ROAS {impact.roas}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Coaching Actions */}
                {coachingActions.length > 0 && (
                    <>
                        <div style={{
                            position: 'relative',
                            paddingLeft: 'var(--space-4)',
                            marginTop: 'var(--space-2)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            <div className="text-xs text-muted" style={{
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                            }}>
                                <Zap size={12} />
                                Coaching Responses
                            </div>
                        </div>
                        {coachingActions.slice(-5).map((action, idx) => (
                            <div
                                key={`${action.insightId}-${idx}`}
                                style={{
                                    position: 'relative',
                                    paddingBottom: 'var(--space-2)',
                                    paddingLeft: 'var(--space-4)',
                                }}
                            >
                                {/* Timeline dot (smaller) */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-4px',
                                    top: '6px',
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: action.action === 'apply' ? 'var(--success)' :
                                        action.action === 'try_different' ? 'var(--primary)' : 'var(--gray-600)',
                                }} />

                                <div style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.75rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        {action.action === 'apply' && <Check size={10} className="text-success" />}
                                        {action.action === 'try_different' && <RefreshCcw size={10} className="text-primary" />}
                                        {action.action === 'ignore' && <X size={10} className="text-muted" />}
                                        <span className="text-muted" style={{
                                            maxWidth: '100px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {action.insightTitle}:
                                        </span>
                                        <span style={{
                                            color: action.action === 'apply' ? 'var(--success)' :
                                                action.action === 'ignore' ? 'var(--text-muted)' : 'var(--primary)'
                                        }}>
                                            {coachingActionLabels[action.action]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
