'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertCircle, Zap, Target, Building2, Megaphone, Lightbulb, Plus, Check, ArrowRight } from 'lucide-react';

interface HarmfulQuery {
    query: string;
    spend: number;
    clicks: number;
    conversions: number;
    classification: 'low_intent' | 'off_topic' | 'competitor' | 'too_broad';
    intent_score: number;
    why_bad: string;
    why_bad_advanced: string;
    suggested_negative: string;
    estimated_savings: number;
}

interface HarmfulQueriesWidgetProps {
    runId: string;
    queries: HarmfulQuery[];
    totalHarmfulCount: number;
    mode?: 'beginner' | 'advanced';
    onAddNegative?: (keyword: string) => void;
}

const classificationConfig = {
    low_intent: { icon: <Zap size={10} />, label: 'Low Intent', color: 'var(--warning-500)' },
    off_topic: { icon: <Target size={10} />, label: 'Off-Topic', color: 'var(--error-500)' },
    competitor: { icon: <Building2 size={10} />, label: 'Competitor', color: 'var(--purple-500, #a855f7)' },
    too_broad: { icon: <Megaphone size={10} />, label: 'Too Broad', color: 'var(--orange-500, #f97316)' },
};

export default function HarmfulQueriesWidget({
    runId,
    queries,
    totalHarmfulCount,
    mode = 'beginner',
    onAddNegative,
}: HarmfulQueriesWidgetProps) {
    const [hoveredQuery, setHoveredQuery] = useState<string | null>(null);
    const [addedNegatives, setAddedNegatives] = useState<Set<string>>(new Set());

    const handleAddNegative = (keyword: string) => {
        setAddedNegatives(prev => new Set(Array.from(prev).concat(keyword)));
        onAddNegative?.(keyword);
    };

    const topQueries = queries.slice(0, 5);

    return (
        <div className="card" style={{
            border: '1px solid var(--error-500)',
            borderTop: '3px solid var(--error-500)',
        }}>
            {/* Header */}
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <AlertCircle size={18} style={{ color: 'var(--error)' }} /> Top Harmful Queries
                    </h3>
                    <p className="card-subtitle">Costing you money without results</p>
                </div>
                <span className="badge badge-error">
                    {totalHarmfulCount} total
                </span>
            </div>

            {/* Queries List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {topQueries.map((q, idx) => {
                    const config = classificationConfig[q.classification] || classificationConfig.low_intent;
                    const isHovered = hoveredQuery === q.query;
                    const isAdded = addedNegatives.has(q.suggested_negative);

                    return (
                        <div
                            key={q.query}
                            onMouseEnter={() => setHoveredQuery(q.query)}
                            onMouseLeave={() => setHoveredQuery(null)}
                            style={{
                                padding: 'var(--space-3)',
                                background: isHovered ? 'var(--gray-800)' : 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)',
                                transition: 'all var(--transition-fast)',
                            }}
                        >
                            {/* Query + Spend */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: 'var(--space-2)',
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div className="font-mono text-sm" style={{
                                        color: 'var(--text-primary)',
                                        marginBottom: '2px',
                                    }}>
                                        "{q.query}"
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <span
                                            className="badge"
                                            style={{
                                                background: `${config.color}20`,
                                                color: config.color,
                                                fontSize: '0.65rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                            }}
                                        >
                                            {config.icon} {config.label}
                                        </span>
                                        {mode === 'advanced' && (
                                            <span className="text-xs text-muted">
                                                {q.clicks} clicks • {q.conversions} conv
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className="font-semibold" style={{ color: 'var(--error)' }}>
                                        ${(q.spend || 0).toFixed(2)}
                                    </div>
                                    {mode === 'advanced' && (
                                        <div className="text-xs text-muted">
                                            Intent: {((q.intent_score || 0) * 100).toFixed(0)}%
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Why Bad */}
                            <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', lineHeight: 1.5 }}>
                                {mode === 'beginner' ? q.why_bad : q.why_bad_advanced}
                            </p>

                            {/* Suggestion */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--space-2)',
                                background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                                border: `1px solid ${isAdded ? 'var(--success-500)' : 'rgba(59, 130, 246, 0.2)'}`,
                                borderRadius: 'var(--radius-sm)',
                            }}>
                                <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                    <Lightbulb size={12} className="text-muted" />
                                    <span className="text-muted">Suggested:</span>
                                    <code style={{
                                        background: 'var(--gray-700)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--primary)',
                                    }}>
                                        -{q.suggested_negative}
                                    </code>
                                </div>
                                <button
                                    className={`btn btn-sm ${isAdded ? 'btn-ghost' : 'btn-primary'}`}
                                    onClick={() => handleAddNegative(q.suggested_negative)}
                                    disabled={isAdded}
                                    style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {isAdded ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer CTA */}
            {totalHarmfulCount > 5 && (
                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                    <Link
                        href={`/search-terms/${runId}?filter=harmful`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
                    >
                        See all {totalHarmfulCount} harmful queries <ArrowRight size={14} />
                    </Link>
                </div>
            )}
        </div>
    );
}
