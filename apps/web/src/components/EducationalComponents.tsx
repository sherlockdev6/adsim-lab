'use client';

import { TrendingUp, TrendingDown, Minus, ArrowRight, Award, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LearningConcept {
    id: string;
    name: string;
    description: string;
    learned: boolean;
    learnedAt?: string;
}

interface LearningProgressProps {
    runId: string;
}

const CONCEPTS: Omit<LearningConcept, 'learned' | 'learnedAt'>[] = [
    { id: 'negative_keywords', name: 'Negative Keywords', description: 'Block irrelevant traffic to reduce waste' },
    { id: 'match_types', name: 'Match Types', description: 'Control query matching precision' },
    { id: 'budget_optimization', name: 'Budget Optimization', description: 'Allocate spend for maximum impact' },
    { id: 'quality_score', name: 'Quality Score', description: 'Improve ad relevance to lower CPC' },
    { id: 'cpa_tracking', name: 'CPA Tracking', description: 'Measure cost per acquisition' },
];

const STORAGE_KEY = 'adsim_learning_progress';

function getProgress(): Record<string, { learned: boolean; learnedAt?: string }> {
    if (typeof window === 'undefined') return {};
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function markAsLearned(conceptId: string) {
    const progress = getProgress();
    progress[conceptId] = { learned: true, learnedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useLearningProgress() {
    const [concepts, setConcepts] = useState<LearningConcept[]>([]);

    useEffect(() => {
        const progress = getProgress();
        setConcepts(CONCEPTS.map(c => ({
            ...c,
            learned: progress[c.id]?.learned || false,
            learnedAt: progress[c.id]?.learnedAt,
        })));
    }, []);

    const markLearned = (conceptId: string) => {
        markAsLearned(conceptId);
        setConcepts(prev => prev.map(c =>
            c.id === conceptId ? { ...c, learned: true, learnedAt: new Date().toISOString() } : c
        ));
    };

    const learnedCount = concepts.filter(c => c.learned).length;
    const totalCount = concepts.length;
    const progressPercent = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;

    return { concepts, markLearned, learnedCount, totalCount, progressPercent };
}

export default function LearningProgress({ runId }: LearningProgressProps) {
    const { concepts, learnedCount, totalCount, progressPercent } = useLearningProgress();

    return (
        <div className="card">
            <div className="card-header">
                <div>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <BookOpen size={18} />
                        Learning Progress
                    </h3>
                    <p className="card-subtitle">{learnedCount} of {totalCount} concepts mastered</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{
                    height: '8px',
                    background: 'var(--gray-800)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        background: progressPercent === 100
                            ? 'linear-gradient(90deg, var(--success), #4ade80)'
                            : 'linear-gradient(90deg, var(--primary-500), var(--primary-400))',
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                    }} />
                </div>
                {progressPercent === 100 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-2)',
                        color: 'var(--success)',
                        fontSize: '0.75rem',
                    }}>
                        <Award size={14} />
                        <span>All concepts mastered! 🎉</span>
                    </div>
                )}
            </div>

            {/* Concept List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {concepts.map(concept => (
                    <div
                        key={concept.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            padding: 'var(--space-2) var(--space-3)',
                            background: concept.learned ? 'rgba(34, 197, 94, 0.1)' : 'var(--gray-800)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: concept.learned ? '3px solid var(--success)' : '3px solid transparent',
                        }}
                    >
                        {/* Checkbox */}
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: concept.learned ? 'none' : '2px solid var(--gray-600)',
                            background: concept.learned ? 'var(--success)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            {concept.learned && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                    <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                color: concept.learned ? 'var(--success)' : 'var(--text)',
                                textDecoration: concept.learned ? 'none' : 'none',
                            }}>
                                {concept.name}
                            </div>
                            <div className="text-xs text-muted">
                                {concept.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Before/After Comparison Component
interface BeforeAfterProps {
    before: {
        label: string;
        metrics: { name: string; value: number; format: 'currency' | 'percent' | 'number' }[];
    };
    after: {
        label: string;
        metrics: { name: string; value: number; format: 'currency' | 'percent' | 'number' }[];
    };
    decision: string;
}

export function BeforeAfterComparison({ before, after, decision }: BeforeAfterProps) {
    const formatValue = (value: number, format: 'currency' | 'percent' | 'number') => {
        switch (format) {
            case 'currency': return `$${value.toFixed(2)}`;
            case 'percent': return `${value.toFixed(1)}%`;
            case 'number': return value.toFixed(0);
        }
    };

    const getChange = (beforeVal: number, afterVal: number, format: string) => {
        if (beforeVal === 0) return { change: 0, direction: 'flat' as const };
        const change = ((afterVal - beforeVal) / beforeVal) * 100;
        return {
            change: Math.abs(change),
            direction: Math.abs(change) < 2 ? 'flat' as const : change > 0 ? 'up' as const : 'down' as const,
        };
    };

    return (
        <div style={{
            background: 'var(--gray-800)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-4)',
        }}>
            {/* Decision Label */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--primary-500)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                fontWeight: 600,
            }}>
                {decision}
            </div>

            {/* Comparison Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 'var(--space-3)' }}>
                {/* Before Column */}
                <div style={{ textAlign: 'center' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                        {before.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {before.metrics.map((metric, i) => (
                            <div key={metric.name} style={{
                                padding: 'var(--space-2)',
                                background: 'var(--surface)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <div className="text-lg font-semibold">{formatValue(metric.value, metric.format)}</div>
                                <div className="text-xs text-muted">{metric.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Arrow Column */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    paddingTop: 'var(--space-6)',
                }}>
                    {before.metrics.map((metric, i) => {
                        const afterMetric = after.metrics[i];
                        const { change, direction } = getChange(metric.value, afterMetric.value, metric.format);
                        // For CPA, down is good; for CVR/ROAS, up is good
                        const isGood = metric.name.toLowerCase().includes('cpa') || metric.name.toLowerCase().includes('cost')
                            ? direction === 'down'
                            : direction === 'up';

                        return (
                            <div key={metric.name} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '44px',
                            }}>
                                {direction === 'flat' ? (
                                    <Minus size={16} className="text-muted" />
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: isGood ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: isGood ? 'var(--success)' : 'var(--error)',
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                    }}>
                                        {direction === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                        {change.toFixed(0)}%
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* After Column */}
                <div style={{ textAlign: 'center' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', textTransform: 'uppercase' }}>
                        {after.label}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {after.metrics.map((metric, i) => {
                            const beforeMetric = before.metrics[i];
                            const { direction } = getChange(beforeMetric.value, metric.value, metric.format);
                            const isGood = metric.name.toLowerCase().includes('cpa') || metric.name.toLowerCase().includes('cost')
                                ? direction === 'down'
                                : direction === 'up';

                            return (
                                <div key={metric.name} style={{
                                    padding: 'var(--space-2)',
                                    background: isGood && direction !== 'flat'
                                        ? 'rgba(34, 197, 94, 0.1)'
                                        : direction !== 'flat'
                                            ? 'rgba(239, 68, 68, 0.1)'
                                            : 'var(--surface)',
                                    borderRadius: 'var(--radius-md)',
                                    border: isGood && direction !== 'flat'
                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                        : direction !== 'flat'
                                            ? '1px solid rgba(239, 68, 68, 0.3)'
                                            : 'none',
                                }}>
                                    <div className="text-lg font-semibold" style={{
                                        color: isGood && direction !== 'flat' ? 'var(--success)' : direction !== 'flat' ? 'var(--error)' : 'var(--text)',
                                    }}>
                                        {formatValue(metric.value, metric.format)}
                                    </div>
                                    <div className="text-xs text-muted">{metric.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Counterfactual "What If" Component
interface CounterfactualProps {
    actualDecision: string;
    alternativeDecision: string;
    actualOutcome: { metric: string; value: number };
    estimatedAlternativeOutcome: { metric: string; value: number };
}

export function CounterfactualHint({
    actualDecision,
    alternativeDecision,
    actualOutcome,
    estimatedAlternativeOutcome
}: CounterfactualProps) {
    const difference = estimatedAlternativeOutcome.value - actualOutcome.value;
    const wasGoodChoice = difference <= 0; // Lower is better for most outcomes like CPA

    return (
        <div style={{
            padding: 'var(--space-3)',
            background: wasGoodChoice ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            border: `1px solid ${wasGoodChoice ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-3)',
        }}>
            <div className="text-xs" style={{
                color: wasGoodChoice ? 'var(--success)' : 'var(--warning)',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
            }}>
                💡 What If Analysis
            </div>
            <p className="text-sm" style={{ lineHeight: 1.5, marginBottom: 0 }}>
                You chose to <strong>{actualDecision}</strong>.{' '}
                {wasGoodChoice ? (
                    <>
                        Had you <strong>{alternativeDecision}</strong>, your {estimatedAlternativeOutcome.metric} would likely be{' '}
                        <span style={{ color: 'var(--error)' }}>
                            ${estimatedAlternativeOutcome.value.toFixed(0)}
                        </span>{' '}
                        instead of{' '}
                        <span style={{ color: 'var(--success)' }}>
                            ${actualOutcome.value.toFixed(0)}
                        </span>. Good choice! ✓
                    </>
                ) : (
                    <>
                        Had you <strong>{alternativeDecision}</strong>, your {estimatedAlternativeOutcome.metric} could have been{' '}
                        <span style={{ color: 'var(--success)' }}>
                            ${estimatedAlternativeOutcome.value.toFixed(0)}
                        </span>{' '}
                        instead of{' '}
                        <span style={{ color: 'var(--warning)' }}>
                            ${actualOutcome.value.toFixed(0)}
                        </span>. Try this next time!
                    </>
                )}
            </p>
        </div>
    );
}

// Guided Tip Component
interface GuidedTipProps {
    tipType: 'first_run' | 'high_waste' | 'good_decision' | 'budget_depleted' | 'concept_unlocked';
    conceptName?: string;
    onDismiss?: () => void;
}

export function GuidedTip({ tipType, conceptName, onDismiss }: GuidedTipProps) {
    const tips = {
        first_run: {
            icon: '🎓',
            title: 'Welcome to Your First Run!',
            message: 'Before each simulation day, you\'ll make decisions. These directly affect your results. Don\'t worry about making mistakes — that\'s how you learn!',
            color: 'var(--primary)',
        },
        high_waste: {
            icon: '⚠️',
            title: 'High Waste Detected',
            message: 'Over 25% of your spend is going to irrelevant queries. Consider adding negative keywords in your next decision checkpoint.',
            color: 'var(--warning)',
        },
        good_decision: {
            icon: '🎉',
            title: 'Great Decision!',
            message: 'Your choice to improve targeting is paying off. Notice how CVR increased while maintaining similar volume.',
            color: 'var(--success)',
        },
        budget_depleted: {
            icon: '💰',
            title: 'Budget Running Out Early',
            message: 'Your ads stop showing before peak hours. Try increasing budget or lowering bids to stretch your spend.',
            color: 'var(--warning)',
        },
        concept_unlocked: {
            icon: '🏆',
            title: `Concept Unlocked: ${conceptName}`,
            message: 'You\'ve demonstrated understanding of this concept through your decisions. Keep building your skills!',
            color: 'var(--success)',
        },
    };

    const tip = tips[tipType];

    return (
        <div style={{
            padding: 'var(--space-4)',
            background: `${tip.color}15`,
            border: `1px solid ${tip.color}30`,
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
            position: 'relative',
        }}>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        position: 'absolute',
                        top: 'var(--space-2)',
                        right: 'var(--space-2)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        opacity: 0.5,
                    }}
                >
                    ×
                </button>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <span style={{ fontSize: '1.5rem' }}>{tip.icon}</span>
                <div>
                    <div style={{ fontWeight: 600, color: tip.color, marginBottom: 'var(--space-1)' }}>
                        {tip.title}
                    </div>
                    <p className="text-sm" style={{ marginBottom: 0, lineHeight: 1.5 }}>
                        {tip.message}
                    </p>
                </div>
            </div>
        </div>
    );
}
