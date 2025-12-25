'use client';

import Link from 'next/link';
import { AlertTriangle, AlertCircle, Info, TrendingUp, TrendingDown, Lightbulb, BarChart3, ArrowRight } from 'lucide-react';

interface WastedSpendCardProps {
    runId: string;
    wastedAmount: number;
    wastedPercent: number;
    trendPercent: number;
    queryCount: number;
    mode?: 'beginner' | 'advanced';
}

export default function WastedSpendCard({
    runId,
    wastedAmount,
    wastedPercent,
    trendPercent,
    queryCount,
    mode = 'beginner',
}: WastedSpendCardProps) {
    // Determine severity
    const severity = wastedPercent >= 25 ? 'critical' : wastedPercent >= 15 ? 'warning' : 'info';

    const severityConfig = {
        critical: {
            borderColor: 'var(--error-500)',
            bgColor: 'rgba(239, 68, 68, 0.08)',
            icon: <AlertTriangle size={20} />,
            label: 'High Waste Detected',
        },
        warning: {
            borderColor: 'var(--warning-500)',
            bgColor: 'rgba(245, 158, 11, 0.08)',
            icon: <AlertCircle size={20} />,
            label: 'Optimization Opportunity',
        },
        info: {
            borderColor: 'var(--primary-500)',
            bgColor: 'rgba(59, 130, 246, 0.08)',
            icon: <Info size={20} />,
            label: 'Minor Leakage',
        },
    };

    const config = severityConfig[severity] || severityConfig.info;
    const trendUp = trendPercent > 0;

    return (
        <div
            style={{
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                borderLeft: `4px solid ${config.borderColor}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span style={{ color: config.borderColor }}>{config.icon}</span>
                    <span className="font-semibold">{config.label}</span>
                </div>
                <span className="badge badge-neutral text-xs">
                    {queryCount} queries
                </span>
            </div>

            {/* Main Metric */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                }}>
                    ${(wastedAmount || 0).toFixed(2)}
                </div>

                {/* Progress Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-2)',
                }}>
                    <div style={{
                        flex: 1,
                        height: '8px',
                        background: 'var(--gray-700)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            width: `${Math.min(wastedPercent, 100)}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, ${config.borderColor}, ${config.borderColor}aa)`,
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.5s ease-out',
                        }} />
                    </div>
                    <span className="font-semibold" style={{ minWidth: '48px', color: config.borderColor }}>
                        {(wastedPercent || 0).toFixed(1)}%
                    </span>
                </div>

                <p className="text-sm text-muted">
                    of total spend on low-quality traffic
                </p>
            </div>

            {/* Trend */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--gray-800)',
                borderRadius: 'var(--radius-md)',
            }}>
                <span style={{ color: trendUp ? 'var(--error)' : 'var(--success)' }}>
                    {trendUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </span>
                <span className="text-sm">
                    <strong style={{ color: trendUp ? 'var(--error)' : 'var(--success)' }}>
                        {trendUp ? '+' : ''}{(trendPercent || 0).toFixed(1)}%
                    </strong>
                    {' '}
                    <span className="text-muted">
                        {trendUp ? 'worse' : 'better'} than yesterday
                    </span>
                </span>
            </div>

            {/* Explanation (mode-based) */}
            {mode === 'beginner' && (
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <Lightbulb size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span><strong>Tip:</strong> This money went to clicks from people who were unlikely to become customers.
                        Review your search terms and add negative keywords.</span>
                </p>
            )}

            {mode === 'advanced' && (
                <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-4)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                    <BarChart3 size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span><strong>Analysis:</strong> {queryCount} queries with intent score &lt;0.3 or CVR = 0% over 10+ clicks.
                        Broad match contributing {Math.round(wastedPercent * 0.6)}% of leakage.</span>
                </p>
            )}

            {/* CTA */}
            <Link
                href={`/search-terms/${runId}?filter=harmful`}
                className="btn btn-primary w-full"
                style={{
                    background: `linear-gradient(135deg, ${config.borderColor}, ${config.borderColor}dd)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                }}
            >
                View Harmful Queries <ArrowRight size={16} />
            </Link>
        </div>
    );
}
