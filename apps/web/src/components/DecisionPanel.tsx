'use client';

import { useState, useEffect } from 'react';
import {
    Target,
    Wallet,
    Ban,
    ChevronDown,
    ChevronUp,
    Zap,
    Play
} from 'lucide-react';
import {
    DecisionSet,
    BudgetAdjustment,
    UserLevel,
    defaultDecisionSet,
    budgetLabels,
} from '@/types/decision-types';

interface DecisionPanelProps {
    onRun: (decisions: DecisionSet) => void;
    isRunning: boolean;
    currentDay: number;
    userLevel: UserLevel;
}

const STORAGE_KEY = 'adsim_last_decisions';

function getLastDecisions(): DecisionSet | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
}

function saveLastDecisions(decisions: DecisionSet) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
    } catch {
        // ignore
    }
}

export default function DecisionPanel({
    onRun,
    isRunning,
    currentDay,
    userLevel,
}: DecisionPanelProps) {
    const [decisions, setDecisions] = useState<DecisionSet>(defaultDecisionSet);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasEverExpanded, setHasEverExpanded] = useState(false);

    // Load last decisions on mount
    useEffect(() => {
        const last = getLastDecisions();
        if (last) {
            setDecisions({ ...last, acknowledged: true });
        }
    }, []);

    const handleChange = (key: keyof DecisionSet, value: any) => {
        setDecisions(prev => {
            const updated = { ...prev, [key]: value };

            // If ignoring all, reset other options
            if (key === 'ignoreAllRecommendations' && value) {
                updated.addNegativeKeywords = false;
                updated.tightenMatchTypes = false;
                updated.budgetAdjustment = 'unchanged';
            }

            // If making any change, uncheck ignore
            if (key !== 'ignoreAllRecommendations' && key !== 'acknowledged') {
                if (value === true || (key === 'budgetAdjustment' && value !== 'unchanged')) {
                    updated.ignoreAllRecommendations = false;
                }
            }

            return updated;
        });
    };

    const handleQuickRun = () => {
        const quickDecisions = { ...decisions, acknowledged: true };
        saveLastDecisions(quickDecisions);
        onRun(quickDecisions);
    };

    const handleExpandedRun = () => {
        const runDecisions = { ...decisions, acknowledged: true };
        saveLastDecisions(runDecisions);
        onRun(runDecisions);
    };

    const toggleExpanded = () => {
        if (!isExpanded) {
            setHasEverExpanded(true);
        }
        setIsExpanded(!isExpanded);
    };

    const hasChanges = decisions.addNegativeKeywords ||
        decisions.tightenMatchTypes ||
        decisions.budgetAdjustment !== 'unchanged';

    const decisionSummary = hasChanges
        ? [
            decisions.addNegativeKeywords && 'Negatives',
            decisions.tightenMatchTypes && 'Match Types',
            decisions.budgetAdjustment !== 'unchanged' && budgetLabels[decisions.budgetAdjustment],
        ].filter(Boolean).join(' • ')
        : decisions.ignoreAllRecommendations
            ? 'No changes'
            : 'Default settings';

    return (
        <div className="card" style={{
            border: isExpanded ? '1px solid var(--primary-500)' : '1px solid var(--border)',
            transition: 'border-color var(--transition-base)',
        }}>
            {/* Header - Always Visible */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isExpanded ? 'var(--space-4)' : 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <Target size={18} color="white" />
                    </div>
                    <div>
                        <h3 className="card-title" style={{ marginBottom: 0, fontSize: '0.9375rem' }}>
                            Run Simulation
                        </h3>
                        <p className="text-xs text-muted">{decisionSummary}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions - Always Visible */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-3)',
            }}>
                <button
                    className="btn btn-primary btn-ripple"
                    onClick={handleQuickRun}
                    disabled={isRunning}
                    style={{ flex: 1 }}
                >
                    {isRunning ? (
                        <>
                            <span className="spinner spinner-sm" />
                            Running...
                        </>
                    ) : (
                        <>
                            <Zap size={16} />
                            Quick Run
                        </>
                    )}
                </button>
                <button
                    className={`btn ${isExpanded ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={toggleExpanded}
                    style={{ padding: 'var(--space-3)' }}
                    title="Customize decisions"
                >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {/* Expanded Options */}
            {isExpanded && (
                <div style={{
                    marginTop: 'var(--space-4)',
                    paddingTop: 'var(--space-4)',
                    borderTop: '1px solid var(--border)',
                }}>
                    {/* First-time tip */}
                    {!hasEverExpanded || currentDay === 0 ? (
                        <div style={{
                            padding: 'var(--space-3)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                        }}>
                            💡 Customize your decisions before running. These affect simulation outcomes.
                        </div>
                    ) : null}

                    {/* Decision Options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {/* Add Negative Keywords */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: decisions.addNegativeKeywords ? 'rgba(34, 197, 94, 0.1)' : 'var(--gray-800)',
                            border: `1px solid ${decisions.addNegativeKeywords ? 'var(--success)' : 'transparent'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.addNegativeKeywords}
                                onChange={(e) => handleChange('addNegativeKeywords', e.target.checked)}
                                disabled={decisions.ignoreAllRecommendations}
                            />
                            <span style={{ flex: 1 }}>Add negative keywords</span>
                            {decisions.addNegativeKeywords && <span className="text-success">✓</span>}
                        </label>

                        {/* Tighten Match Types */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-3)',
                            background: decisions.tightenMatchTypes ? 'rgba(34, 197, 94, 0.1)' : 'var(--gray-800)',
                            border: `1px solid ${decisions.tightenMatchTypes ? 'var(--success)' : 'transparent'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.tightenMatchTypes}
                                onChange={(e) => handleChange('tightenMatchTypes', e.target.checked)}
                                disabled={decisions.ignoreAllRecommendations}
                            />
                            <span style={{ flex: 1 }}>Tighten match types</span>
                            {decisions.tightenMatchTypes && <span className="text-success">✓</span>}
                        </label>

                        {/* Budget */}
                        <div style={{
                            padding: 'var(--space-3)',
                            background: 'var(--gray-800)',
                            borderRadius: 'var(--radius-md)',
                        }}>
                            <div className="text-xs text-muted" style={{
                                marginBottom: 'var(--space-2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)'
                            }}>
                                <Wallet size={12} /> Budget
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                {(['decrease_20', 'unchanged', 'increase_20'] as BudgetAdjustment[]).map((option) => (
                                    <button
                                        key={option}
                                        className={`btn btn-sm ${decisions.budgetAdjustment === option ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => handleChange('budgetAdjustment', option)}
                                        disabled={decisions.ignoreAllRecommendations}
                                        style={{ flex: 1, fontSize: '0.7rem', padding: 'var(--space-2)' }}
                                    >
                                        {option === 'decrease_20' ? '-20%' : option === 'increase_20' ? '+20%' : 'Same'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ignore All */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.ignoreAllRecommendations}
                                onChange={(e) => handleChange('ignoreAllRecommendations', e.target.checked)}
                            />
                            <Ban size={12} />
                            Skip all optimizations
                        </label>
                    </div>

                    {/* Run Button */}
                    <button
                        className="btn btn-success w-full"
                        onClick={handleExpandedRun}
                        disabled={isRunning}
                        style={{ marginTop: 'var(--space-4)' }}
                    >
                        <Play size={16} />
                        Run with {hasChanges ? 'Changes' : 'Current Settings'}
                    </button>
                </div>
            )}
        </div>
    );
}
