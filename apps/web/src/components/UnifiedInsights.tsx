'use client';

import { useState } from 'react';
import {
    Lightbulb,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Check,
    X,
    Sparkles
} from 'lucide-react';

interface Insight {
    id: string;
    type: 'success' | 'warning' | 'tip' | 'action';
    title: string;
    description: string;
    metric?: string;
    priority: number; // 1-5, higher = more important
}

interface UnifiedInsightsProps {
    totals: {
        ctr: number;
        cvr: number;
        cpc: number;
        roas: number;
        impression_share: number;
        lost_is_budget: number;
        lost_is_rank: number;
        avg_quality_score: number;
    } | null;
    wastedSpendPercent: number;
    onAction?: (insightId: string, action: 'apply' | 'dismiss') => void;
}

function generateInsights(totals: UnifiedInsightsProps['totals'], wastedSpendPercent: number): Insight[] {
    if (!totals) return [];

    const insights: Insight[] = [];

    // ROAS check - most important
    if (totals.roas >= 2) {
        insights.push({
            id: 'roas-excellent',
            type: 'success',
            title: 'Excellent ROAS!',
            description: 'Your campaigns are generating strong returns. Consider increasing budget.',
            metric: `${totals.roas.toFixed(2)}x`,
            priority: 5,
        });
    } else if (totals.roas < 1) {
        insights.push({
            id: 'roas-low',
            type: 'warning',
            title: 'ROAS Below Target',
            description: 'You\'re spending more than you\'re earning. Focus on conversion optimization.',
            metric: `${totals.roas.toFixed(2)}x`,
            priority: 5,
        });
    }

    // Wasted spend
    if (wastedSpendPercent > 15) {
        insights.push({
            id: 'wasted-spend',
            type: 'action',
            title: 'High Wasted Spend',
            description: 'Add negative keywords to block irrelevant traffic.',
            metric: `${wastedSpendPercent.toFixed(0)}%`,
            priority: 4,
        });
    }

    // CTR check
    if (totals.ctr < 2) {
        insights.push({
            id: 'ctr-low',
            type: 'tip',
            title: 'Improve Ad Copy',
            description: 'Your CTR is below average. Try more compelling headlines.',
            metric: `${totals.ctr.toFixed(2)}%`,
            priority: 3,
        });
    } else if (totals.ctr > 5) {
        insights.push({
            id: 'ctr-high',
            type: 'success',
            title: 'Strong CTR',
            description: 'Your ads are resonating well with the audience.',
            metric: `${totals.ctr.toFixed(2)}%`,
            priority: 2,
        });
    }

    // Quality Score
    if (totals.avg_quality_score < 0.5) {
        insights.push({
            id: 'qs-low',
            type: 'warning',
            title: 'Low Quality Score',
            description: 'Improve landing page relevance and ad-keyword match.',
            metric: `${(totals.avg_quality_score * 10).toFixed(1)}/10`,
            priority: 4,
        });
    }

    // Impression share
    if (totals.lost_is_budget > 20) {
        insights.push({
            id: 'lost-budget',
            type: 'tip',
            title: 'Budget Limited',
            description: 'You\'re missing impressions due to budget. Consider increasing it.',
            metric: `${totals.lost_is_budget.toFixed(0)}% lost`,
            priority: 3,
        });
    }

    // Sort by priority
    return insights.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

const typeStyles = {
    success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'var(--success)', icon: TrendingUp },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'var(--warning)', icon: AlertTriangle },
    tip: { bg: 'rgba(59, 130, 246, 0.1)', border: 'var(--primary-500)', icon: Lightbulb },
    action: { bg: 'rgba(168, 85, 247, 0.1)', border: '#a855f7', icon: Sparkles },
};

export default function UnifiedInsights({ totals, wastedSpendPercent, onAction }: UnifiedInsightsProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

    const allInsights = generateInsights(totals, wastedSpendPercent);
    const insights = allInsights.filter(i => !dismissedIds.has(i.id));

    if (insights.length === 0) {
        return (
            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-muted)' }}>
                    <Check size={16} />
                    <span className="text-sm">All insights addressed!</span>
                </div>
            </div>
        );
    }

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => new Set(prev).add(id));
        onAction?.(id, 'dismiss');
    };

    return (
        <div className="card">
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    marginBottom: isExpanded ? 'var(--space-3)' : 0,
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Lightbulb size={16} className="text-primary" />
                    <span className="font-medium" style={{ fontSize: '0.875rem' }}>Insights</span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{insights.length}</span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {insights.map((insight) => {
                        const style = typeStyles[insight.type];
                        const IconComponent = style.icon;

                        return (
                            <div
                                key={insight.id}
                                style={{
                                    padding: 'var(--space-3)',
                                    background: style.bg,
                                    borderLeft: `3px solid ${style.border}`,
                                    borderRadius: 'var(--radius-md)',
                                    position: 'relative',
                                }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDismiss(insight.id);
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: '6px',
                                        right: '6px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        opacity: 0.5,
                                    }}
                                    title="Dismiss"
                                >
                                    <X size={12} />
                                </button>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                                    <IconComponent size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                                    <div style={{ flex: 1, paddingRight: 'var(--space-4)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span className="font-medium" style={{ fontSize: '0.8125rem' }}>{insight.title}</span>
                                            {insight.metric && (
                                                <span className="text-xs text-muted">{insight.metric}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted" style={{ marginTop: '2px', lineHeight: 1.4 }}>
                                            {insight.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
