'use client';

import { CheckCircle, ArrowRight, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { RunDecision } from '@/types/decision-types';
import { formatDecisionSummary } from '@/lib/decision-storage';

interface OwnershipSummaryProps {
    decision: RunDecision;
    results: {
        impressions?: number;
        clicks?: number;
        conversions?: number;
        cost?: number;
        ctr?: number;
        cvr?: number;
        roas?: number;
    };
    previousResults?: {
        impressions?: number;
        clicks?: number;
        conversions?: number;
        cost?: number;
        ctr?: number;
        cvr?: number;
        roas?: number;
    };
}

export default function OwnershipSummary({ decision, results, previousResults }: OwnershipSummaryProps) {
    const decisionSummary = formatDecisionSummary(decision.decisions);

    // Calculate changes if we have previous results
    const getChange = (current: number | undefined, previous: number | undefined) => {
        if (!current || !previous || previous === 0) return null;
        return ((current - previous) / previous) * 100;
    };

    const costChange = getChange(results.cost, previousResults?.cost);
    const conversionsChange = getChange(results.conversions, previousResults?.conversions);
    const roasChange = getChange(results.roas, previousResults?.roas);

    // Determine overall outcome
    const isPositive = (roasChange && roasChange > 0) || (conversionsChange && conversionsChange > 5);
    const isNegative = (roasChange && roasChange < -10) || (costChange && costChange > 20);

    return (
        <div style={{
            padding: 'var(--space-5)',
            background: isPositive
                ? 'rgba(34, 197, 94, 0.08)'
                : isNegative
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'rgba(59, 130, 246, 0.08)',
            border: `1px solid ${isPositive ? 'var(--success-500)' : isNegative ? 'var(--error-500)' : 'var(--primary-500)'}`,
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
            }}>
                <CheckCircle size={20} style={{ color: isPositive ? 'var(--success)' : isNegative ? 'var(--error)' : 'var(--primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                    Your Day {decision.runNumber} Summary
                </h3>
            </div>

            {/* What You Decided */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div className="text-xs text-muted" style={{
                    marginBottom: 'var(--space-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                }}>
                    What You Chose
                </div>
                <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                }}>
                    {decisionSummary.map((item, idx) => (
                        <li key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            fontSize: '0.875rem',
                        }}>
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                flexShrink: 0,
                            }} />
                            <span>You chose to <strong>{item.toLowerCase()}</strong></span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Arrow */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 'var(--space-4) 0',
            }}>
                <ArrowRight size={20} className="text-muted" />
            </div>

            {/* What Happened */}
            <div>
                <div className="text-xs text-muted" style={{
                    marginBottom: 'var(--space-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: 600,
                }}>
                    What Happened
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--space-3)',
                }}>
                    {/* Cost */}
                    <div style={{ textAlign: 'center' }}>
                        <div className="text-lg font-semibold">
                            ${(results.cost || 0).toFixed(0)}
                        </div>
                        <div className="text-xs text-muted">Cost</div>
                        {costChange !== null && (
                            <div style={{
                                fontSize: '0.7rem',
                                color: costChange > 0 ? 'var(--error)' : 'var(--success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                            }}>
                                {costChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {costChange > 0 ? '+' : ''}{costChange.toFixed(1)}%
                            </div>
                        )}
                    </div>

                    {/* Conversions */}
                    <div style={{ textAlign: 'center' }}>
                        <div className="text-lg font-semibold">
                            {Math.round(results.conversions || 0)}
                        </div>
                        <div className="text-xs text-muted">Conversions</div>
                        {conversionsChange !== null && (
                            <div style={{
                                fontSize: '0.7rem',
                                color: conversionsChange > 0 ? 'var(--success)' : 'var(--error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                            }}>
                                {conversionsChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {conversionsChange > 0 ? '+' : ''}{conversionsChange.toFixed(1)}%
                            </div>
                        )}
                    </div>

                    {/* ROAS */}
                    <div style={{ textAlign: 'center' }}>
                        <div className="text-lg font-semibold">
                            {(results.roas || 0).toFixed(2)}x
                        </div>
                        <div className="text-xs text-muted">ROAS</div>
                        {roasChange !== null && (
                            <div style={{
                                fontSize: '0.7rem',
                                color: roasChange > 0 ? 'var(--success)' : 'var(--error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '2px',
                            }}>
                                {roasChange > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {roasChange > 0 ? '+' : ''}{roasChange.toFixed(1)}%
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ownership Message */}
            <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
            }}>
                {isPositive ? (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--success)' }}>
                        <CheckCircle size={14} />
                        <span><strong>Great choice!</strong> Your decisions led to improved performance.</span>
                    </p>
                ) : isNegative ? (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--warning)' }}>
                        <AlertCircle size={14} />
                        <span><strong>Learning opportunity:</strong> This decision affected results. Try adjusting next run.</span>
                    </p>
                ) : (
                    <p className="text-muted">
                        These results reflect the decisions you made before this run.
                    </p>
                )}
            </div>
        </div>
    );
}
