'use client';

import { useState } from 'react';
import {
    AlertCircle,
    Check,
    Target,
    Wallet,
    Ban,
    ChevronDown,
    ChevronUp,
    Lightbulb
} from 'lucide-react';
import {
    DecisionSet,
    BudgetAdjustment,
    UserLevel,
    defaultDecisionSet,
    budgetLabels,
    userLevelLabels
} from '@/types/decision-types';

interface DecisionCheckpointModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (decisions: DecisionSet) => void;
    userLevel: UserLevel;
    daysToRun: number;
    currentDay: number;
    suggestedNegatives?: string[];
}

export default function DecisionCheckpointModal({
    isOpen,
    onClose,
    onConfirm,
    userLevel,
    daysToRun,
    currentDay,
    suggestedNegatives = ['free', 'jobs', 'salary', 'definition'],
}: DecisionCheckpointModalProps) {
    const [decisions, setDecisions] = useState<DecisionSet>(defaultDecisionSet);
    const [showAdvanced, setShowAdvanced] = useState(userLevel !== 'beginner');

    if (!isOpen) return null;

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

    const handleConfirm = () => {
        if (decisions.acknowledged) {
            onConfirm(decisions);
        }
    };

    const isBeginnerMode = userLevel === 'beginner';
    const hasChanges = decisions.addNegativeKeywords ||
        decisions.tightenMatchTypes ||
        decisions.budgetAdjustment !== 'unchanged';

    return (
        <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '520px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-lg)',
                            background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Target size={20} color="white" />
                        </div>
                        <div>
                            <h3 style={{ marginBottom: '2px' }}>Decision Checkpoint</h3>
                            <p className="text-sm text-muted">
                                Day {currentDay + 1}{daysToRun > 1 ? ` → ${currentDay + daysToRun}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Intro */}
                    <div style={{
                        padding: 'var(--space-4)',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-5)',
                    }}>
                        <p className="text-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                            <Lightbulb size={16} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                                Before running the simulation, decide what changes you want to make.
                                {isBeginnerMode && ' We recommend the options below based on your campaign data.'}
                            </span>
                        </p>
                    </div>

                    {/* Recommendations */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                        {/* Add Negative Keywords */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-4)',
                            background: decisions.addNegativeKeywords ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                            border: `1px solid ${decisions.addNegativeKeywords ? 'var(--success-500)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.addNegativeKeywords}
                                onChange={(e) => handleChange('addNegativeKeywords', e.target.checked)}
                                disabled={decisions.ignoreAllRecommendations}
                                style={{ marginTop: '2px' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div className="font-medium" style={{ marginBottom: 'var(--space-1)' }}>
                                    Add recommended negative keywords
                                </div>
                                <p className="text-xs text-muted">
                                    Block irrelevant searches like: {suggestedNegatives.map(n => `-${n}`).join(', ')}
                                </p>
                                {isBeginnerMode && (
                                    <span className="badge badge-success" style={{ marginTop: 'var(--space-2)', fontSize: '0.65rem' }}>
                                        Recommended
                                    </span>
                                )}
                            </div>
                        </label>

                        {/* Tighten Match Types */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-4)',
                            background: decisions.tightenMatchTypes ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                            border: `1px solid ${decisions.tightenMatchTypes ? 'var(--success-500)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.tightenMatchTypes}
                                onChange={(e) => handleChange('tightenMatchTypes', e.target.checked)}
                                disabled={decisions.ignoreAllRecommendations}
                                style={{ marginTop: '2px' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div className="font-medium" style={{ marginBottom: 'var(--space-1)' }}>
                                    Tighten match types
                                </div>
                                <p className="text-xs text-muted">
                                    Convert broad match to phrase match for better targeting
                                </p>
                            </div>
                        </label>

                        {/* Budget Adjustment - Show in expanded or non-beginner */}
                        {(showAdvanced || !isBeginnerMode) && (
                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <div className="font-medium" style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Wallet size={16} />
                                    Budget adjustment
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    {(['decrease_20', 'unchanged', 'increase_20'] as BudgetAdjustment[]).map((option) => (
                                        <label key={option} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="budget"
                                                checked={decisions.budgetAdjustment === option}
                                                onChange={() => handleChange('budgetAdjustment', option)}
                                                disabled={decisions.ignoreAllRecommendations}
                                            />
                                            <span className="text-sm">{budgetLabels[option]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Toggle Advanced for Beginners */}
                        {isBeginnerMode && (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                {showAdvanced ? 'Hide' : 'Show'} advanced options
                            </button>
                        )}

                        {/* Divider */}
                        <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }} />

                        {/* Ignore All */}
                        <label style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-4)',
                            background: decisions.ignoreAllRecommendations ? 'rgba(245, 158, 11, 0.1)' : 'var(--gray-800)',
                            border: `1px solid ${decisions.ignoreAllRecommendations ? 'var(--warning-500)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}>
                            <input
                                type="checkbox"
                                checked={decisions.ignoreAllRecommendations}
                                onChange={(e) => handleChange('ignoreAllRecommendations', e.target.checked)}
                                style={{ marginTop: '2px' }}
                            />
                            <div>
                                <div className="font-medium" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Ban size={14} />
                                    Ignore all recommendations
                                </div>
                                <p className="text-xs text-muted">
                                    Run simulation without making any changes
                                </p>
                            </div>
                        </label>

                        {/* Acknowledgment */}
                        <div style={{
                            padding: 'var(--space-4)',
                            background: 'var(--gray-900)',
                            borderRadius: 'var(--radius-md)',
                            border: decisions.acknowledged ? '1px solid var(--primary-500)' : '1px solid var(--border)',
                        }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={decisions.acknowledged}
                                    onChange={(e) => handleChange('acknowledged', e.target.checked)}
                                    style={{ marginTop: '2px' }}
                                />
                                <div>
                                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                        I understand the results are based on these decisions
                                    </div>
                                    <p className="text-xs text-muted">
                                        {hasChanges
                                            ? 'Your changes will affect the simulation outcomes.'
                                            : decisions.ignoreAllRecommendations
                                                ? 'The simulation will run with current settings.'
                                                : 'You have not selected any changes yet.'
                                        }
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleConfirm}
                        disabled={!decisions.acknowledged}
                    >
                        <Check size={16} />
                        {daysToRun > 1 ? `Run ${daysToRun} Days` : 'Run 1 Day'}
                    </button>
                </div>
            </div>
        </div>
    );
}
