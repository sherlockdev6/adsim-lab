'use client';

import { useState } from 'react';
import {
    Layers, Target, DollarSign, FileText, Wallet, BarChart3,
    AlertTriangle, AlertCircle, Info, ChevronUp, ChevronDown,
    ArrowUp, ArrowDown, ArrowRight, Check, Lightbulb, Sparkles,
    GraduationCap, Plus, Minus
} from 'lucide-react';

// Insight data model
interface CoachingInsight {
    id: string;
    category: 'structure' | 'targeting' | 'bidding' | 'relevance' | 'budget' | 'market';
    severity: 'critical' | 'important' | 'optional';

    // What happened
    title: string;
    description: string;

    // Why it happened (cause chain)
    causeChain: string[];
    causeWeights?: Record<string, number>; // For advanced mode

    // Action
    action: string;
    actionDetails?: string[]; // Specific UI-level suggestions

    // Expected Impact
    expectedImpact: string;
    impactMetrics?: Array<{ metric: string; direction: 'up' | 'down' | 'stable'; estimate?: string }>;

    // Segment references for advanced mode
    segmentRefs?: Array<{ segment: string; value: string; impact: string }>;
}

interface CoachingInsightsPanelProps {
    insights: CoachingInsight[];
    mode?: 'beginner' | 'advanced';
    onModeChange?: (mode: 'beginner' | 'advanced') => void;
}

const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    structure: { icon: <Layers size={12} />, label: 'Structure', color: '#a78bfa' },
    targeting: { icon: <Target size={12} />, label: 'Targeting', color: '#f472b6' },
    bidding: { icon: <DollarSign size={12} />, label: 'Bidding', color: '#fbbf24' },
    relevance: { icon: <FileText size={12} />, label: 'Relevance', color: '#34d399' },
    budget: { icon: <Wallet size={12} />, label: 'Budget', color: '#f87171' },
    market: { icon: <BarChart3 size={12} />, label: 'Market', color: '#60a5fa' },
};

const severityConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string; borderColor: string }> = {
    critical: {
        icon: <AlertTriangle size={10} />,
        label: 'Critical',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    important: {
        icon: <AlertCircle size={10} />,
        label: 'Important',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.5)',
    },
    optional: {
        icon: <Info size={10} />,
        label: 'Optional',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
    },
};

function InsightCard({ insight, mode, isFirst }: { insight: CoachingInsight; mode: 'beginner' | 'advanced'; isFirst: boolean }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const category = categoryConfig[insight.category];
    const severity = severityConfig[insight.severity];

    return (
        <div
            style={{
                background: severity.bgColor,
                border: `1px solid ${severity.borderColor}`,
                borderLeft: `4px solid ${severity.color}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)',
                transition: 'all var(--transition-fast)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span
                        className="badge"
                        style={{
                            background: severity.color,
                            color: '#fff',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        {severity.icon} {severity.label}
                    </span>
                    <span
                        className="badge"
                        style={{
                            background: `${category.color}30`,
                            color: category.color,
                            fontSize: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        {category.icon} {category.label}
                    </span>
                    {isFirst && mode === 'beginner' && (
                        <span
                            className="badge badge-success"
                            style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <ChevronUp size={10} /> Do this first
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}
                >
                    {isExpanded ? <Minus size={14} /> : <Plus size={14} />}
                </button>
            </div>

            {/* Title */}
            <h4 style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
                color: 'var(--text-primary)',
            }}>
                {insight.title}
            </h4>

            {/* Description - What happened */}
            <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                {insight.description}
            </p>

            {/* Cause Chain - Why it happened */}
            {(isExpanded || mode === 'advanced') && (
                <div style={{
                    marginBottom: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    <div className="text-xs font-semibold" style={{ marginBottom: 'var(--space-2)', color: 'var(--text-muted)' }}>
                        Why this happened:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        {insight.causeChain.map((cause, idx) => (
                            <div key={idx} className="text-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                                <ArrowRight size={14} style={{ color: severity.color, flexShrink: 0, marginTop: '2px' }} />
                                <span>
                                    {cause}
                                    {mode === 'advanced' && insight.causeWeights?.[cause] && (
                                        <span className="text-xs text-muted" style={{ marginLeft: 'var(--space-2)' }}>
                                            ({insight.causeWeights[cause]}% contribution)
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action */}
            <div style={{
                marginBottom: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 'var(--radius-md)',
            }}>
                <div className="text-xs font-semibold" style={{ marginBottom: 'var(--space-1)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} /> Action:
                </div>
                <p className="text-sm font-medium">{insight.action}</p>
                {(isExpanded || mode === 'advanced') && insight.actionDetails && (
                    <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-4)' }}>
                        {insight.actionDetails.map((detail, idx) => (
                            <li key={idx} className="text-xs text-muted" style={{ marginBottom: '2px' }}>
                                {detail}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Expected Impact */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                flexWrap: 'wrap',
            }}>
                <span className="text-xs text-muted">Expected:</span>
                {insight.impactMetrics ? (
                    insight.impactMetrics.map((im, idx) => (
                        <span
                            key={idx}
                            className="badge"
                            style={{
                                background: im.direction === 'up' ? 'rgba(34, 197, 94, 0.2)' : im.direction === 'down' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                                color: im.direction === 'up' ? 'var(--success)' : im.direction === 'down' ? 'var(--error)' : 'var(--text-muted)',
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                            }}
                        >
                            {im.direction === 'up' ? <ArrowUp size={10} /> : im.direction === 'down' ? <ArrowDown size={10} /> : <ArrowRight size={10} />} {im.metric}
                            {im.estimate && ` ${im.estimate}`}
                        </span>
                    ))
                ) : (
                    <span className="text-sm">{insight.expectedImpact}</span>
                )}
            </div>

            {/* Segment References - Advanced only */}
            {mode === 'advanced' && insight.segmentRefs && insight.segmentRefs.length > 0 && (
                <div style={{
                    marginTop: 'var(--space-3)',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px dashed var(--border)',
                }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-1)' }}>
                        Segment Evidence:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {insight.segmentRefs.map((seg, idx) => (
                            <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                                {seg.segment}: {seg.value} ({seg.impact})
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CoachingInsightsPanel({ insights, mode = 'beginner', onModeChange }: CoachingInsightsPanelProps) {
    const [localMode, setLocalMode] = useState<'beginner' | 'advanced'>(mode);

    const currentMode = onModeChange ? mode : localMode;
    const handleModeChange = (newMode: 'beginner' | 'advanced') => {
        if (onModeChange) {
            onModeChange(newMode);
        } else {
            setLocalMode(newMode);
        }
    };

    // Sort by severity (critical first), then limit for beginner mode
    const sortedInsights = [...insights].sort((a, b) => {
        const order = { critical: 0, important: 1, optional: 2 };
        return order[a.severity] - order[b.severity];
    });

    const displayedInsights = currentMode === 'beginner' ? sortedInsights.slice(0, 3) : sortedInsights;

    return (
        <div className="card" style={{ height: '100%' }}>
            {/* Header */}
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <GraduationCap size={20} /> Coaching Insights
                    </h2>
                    <p className="card-subtitle">
                        {displayedInsights.length} actionable recommendation{displayedInsights.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="btn-group-connected w-full" style={{ marginBottom: 'var(--space-4)' }}>
                <button
                    className={`btn btn-sm ${currentMode === 'beginner' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleModeChange('beginner')}
                >
                    Beginner
                </button>
                <button
                    className={`btn btn-sm ${currentMode === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => handleModeChange('advanced')}
                >
                    Advanced
                </button>
            </div>

            {/* No Insights */}
            {displayedInsights.length === 0 && (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <div style={{ marginBottom: 'var(--space-3)', color: 'var(--success)' }}>
                        <Sparkles size={32} />
                    </div>
                    <p className="text-muted text-sm" style={{ textAlign: 'center' }}>
                        No issues detected. Your campaign is running well!
                    </p>
                </div>
            )}

            {/* Insights List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {displayedInsights.map((insight, idx) => (
                    <InsightCard
                        key={insight.id}
                        insight={insight}
                        mode={currentMode}
                        isFirst={idx === 0}
                    />
                ))}
            </div>

            {/* Show More (Beginner mode) */}
            {currentMode === 'beginner' && sortedInsights.length > 3 && (
                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                    <button
                        className="btn btn-ghost btn-sm text-muted"
                        onClick={() => handleModeChange('advanced')}
                    >
                        +{sortedInsights.length - 3} more insights (switch to Advanced)
                    </button>
                </div>
            )}

            {/* Tips */}
            <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'var(--gray-800)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
            }}>
                <Lightbulb size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span><strong>Learning tip:</strong> Focus on Critical issues first. They have the biggest impact on your results.</span>
            </div>
        </div>
    );
}

// Generate insights from metrics
export function generateCoachingInsights(metrics: {
    ctr?: number;
    cvr?: number;
    cpc?: number;
    impression_share?: number;
    lost_is_budget?: number;
    lost_is_rank?: number;
    avg_quality_score?: number;
    wasted_spend_percent?: number;
}): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    // Broad match abuse / Query Quality
    if (metrics.wasted_spend_percent && metrics.wasted_spend_percent > 15) {
        insights.push({
            id: 'query-quality',
            category: 'targeting',
            severity: metrics.wasted_spend_percent > 25 ? 'critical' : 'important',
            title: 'Query Quality Issue',
            description: 'Your broad match keywords are pulling low-intent research queries that rarely convert.',
            causeChain: [
                'Broad match keywords matched to irrelevant searches',
                'Low-intent users clicked but didn\'t convert',
                'CTR dropped, Quality Score decreased',
                'CPC increased due to lower Quality Score',
            ],
            causeWeights: {
                'Broad match keywords matched to irrelevant searches': 45,
                'Low-intent users clicked but didn\'t convert': 30,
                'CTR dropped, Quality Score decreased': 15,
                'CPC increased due to lower Quality Score': 10,
            },
            action: 'Add negative keywords to block irrelevant traffic',
            actionDetails: [
                'Review Search Terms report',
                'Add negatives for "jobs", "free", "definition", "salary"',
                'Consider switching broad match to phrase match for high-spend keywords',
            ],
            expectedImpact: '-12–18% CPC within 2–3 days',
            impactMetrics: [
                { metric: 'CPC', direction: 'down', estimate: '12-18%' },
                { metric: 'CTR', direction: 'up', estimate: '5-10%' },
                { metric: 'CVR', direction: 'up' },
            ],
            segmentRefs: [
                { segment: 'Query Type', value: 'Informational', impact: '-67% CVR' },
                { segment: 'Match Type', value: 'Broad', impact: '80% of waste' },
            ],
        });
    }

    // Budget-limited campaigns
    if (metrics.lost_is_budget && metrics.lost_is_budget > 0.15) {
        insights.push({
            id: 'budget-limited',
            category: 'budget',
            severity: metrics.lost_is_budget > 0.3 ? 'critical' : 'important',
            title: 'Budget Exhausting Too Early',
            description: `You're losing ${Math.round(metrics.lost_is_budget * 100)}% of potential impressions because your budget runs out before peak hours end.`,
            causeChain: [
                'Daily budget depleted before end of day',
                'Ads stopped showing during peak conversion hours',
                'Missed high-intent searches in the evening',
                'Total conversions limited by budget, not demand',
            ],
            causeWeights: {
                'Daily budget depleted before end of day': 50,
                'Ads stopped showing during peak conversion hours': 30,
                'Missed high-intent searches in the evening': 15,
                'Total conversions limited by budget, not demand': 5,
            },
            action: 'Increase daily budget or optimize spend distribution',
            actionDetails: [
                `Increase budget by ${Math.round(metrics.lost_is_budget * 100 * 1.2)}% to capture lost impressions`,
                'Enable ad scheduling to focus on high-converting hours',
                'Lower bids on low-performing keywords to stretch budget',
            ],
            expectedImpact: `+${Math.round(metrics.lost_is_budget * 50)}% conversions`,
            impactMetrics: [
                { metric: 'Conversions', direction: 'up', estimate: `${Math.round(metrics.lost_is_budget * 50)}%` },
                { metric: 'Impression Share', direction: 'up' },
            ],
            segmentRefs: [
                { segment: 'Time', value: '6-10 PM', impact: 'Most missed' },
                { segment: 'Device', value: 'Mobile', impact: 'Higher loss' },
            ],
        });
    }

    // Competitor pressure / Rank issues
    if (metrics.lost_is_rank && metrics.lost_is_rank > 0.2) {
        insights.push({
            id: 'competitor-pressure',
            category: 'market',
            severity: metrics.lost_is_rank > 0.35 ? 'critical' : 'important',
            title: 'Competitors Outranking You',
            description: `You're losing ${Math.round(metrics.lost_is_rank * 100)}% of impressions because competitors have better Ad Rank.`,
            causeChain: [
                'Competitors increased their bids or improved Quality Score',
                'Your Ad Rank fell below theirs',
                'Your ads appear in lower positions or not at all',
                'CTR and conversions decrease with lower visibility',
            ],
            causeWeights: {
                'Competitors increased their bids or improved Quality Score': 40,
                'Your Ad Rank fell below theirs': 30,
                'Your ads appear in lower positions or not at all': 20,
                'CTR and conversions decrease with lower visibility': 10,
            },
            action: 'Improve Quality Score or increase bids strategically',
            actionDetails: [
                'Improve ad relevance by matching ad copy to keywords',
                'Increase bids on high-converting keywords only',
                'Improve landing page experience for better QS',
            ],
            expectedImpact: '+15-25% impression share',
            impactMetrics: [
                { metric: 'Impression Share', direction: 'up', estimate: '15-25%' },
                { metric: 'Avg Position', direction: 'up' },
                { metric: 'CPC', direction: 'up', estimate: '5-15%' },
            ],
            segmentRefs: [
                { segment: 'Keyword', value: 'High-intent terms', impact: 'Most competitive' },
            ],
        });
    }

    // Low Quality Score
    if (metrics.avg_quality_score && metrics.avg_quality_score < 0.5) {
        insights.push({
            id: 'low-quality-score',
            category: 'relevance',
            severity: metrics.avg_quality_score < 0.35 ? 'critical' : 'important',
            title: 'Quality Score Below Average',
            description: 'Low Quality Score is increasing your costs and reducing your visibility.',
            causeChain: [
                'Ad copy doesn\'t match keyword intent closely enough',
                'Landing page experience needs improvement',
                'Historical CTR is lower than expected',
                'Google charges you more per click',
            ],
            action: 'Align ad copy with keywords and improve landing pages',
            actionDetails: [
                'Include primary keywords in ad headlines',
                'Ensure landing page matches ad promise',
                'Improve landing page load speed',
                'Add more relevant ad extensions',
            ],
            expectedImpact: '-20-30% CPC, +10% CTR',
            impactMetrics: [
                { metric: 'CPC', direction: 'down', estimate: '20-30%' },
                { metric: 'CTR', direction: 'up', estimate: '10%' },
                { metric: 'Quality Score', direction: 'up' },
            ],
        });
    }

    // Low CTR
    if (metrics.ctr && metrics.ctr < 0.02) {
        insights.push({
            id: 'low-ctr',
            category: 'relevance',
            severity: metrics.ctr < 0.01 ? 'critical' : 'optional',
            title: 'Click-Through Rate Below Industry Average',
            description: 'Your ads are showing but people aren\'t clicking. This hurts Quality Score over time.',
            causeChain: [
                'Ad copy may not be compelling enough',
                'Ad not appearing in top positions',
                'Keyword targeting may be too broad',
            ],
            action: 'Improve ad copy and test new variations',
            actionDetails: [
                'A/B test new headlines with stronger value propositions',
                'Add emotional triggers or urgency',
                'Include prices or promotions if applicable',
            ],
            expectedImpact: '+50-100% CTR with good ad copy',
            impactMetrics: [
                { metric: 'CTR', direction: 'up', estimate: '50-100%' },
                { metric: 'Quality Score', direction: 'up' },
            ],
        });
    }

    // Low conversion rate
    if (metrics.cvr && metrics.cvr < 0.03) {
        insights.push({
            id: 'low-cvr',
            category: 'structure',
            severity: metrics.cvr < 0.01 ? 'critical' : 'optional',
            title: 'Conversion Rate Needs Improvement',
            description: 'People are clicking but not converting. The issue is likely on your landing page or targeting.',
            causeChain: [
                'Landing page may not match user expectations',
                'Targeting may include low-intent audiences',
                'Conversion process may be too complex',
            ],
            action: 'Optimize landing page and refine targeting',
            actionDetails: [
                'Simplify the conversion form',
                'Ensure landing page headline matches ad',
                'Add trust signals (reviews, guarantees)',
                'Consider remarketing to warmer audiences',
            ],
            expectedImpact: '+30-50% CVR with optimization',
            impactMetrics: [
                { metric: 'CVR', direction: 'up', estimate: '30-50%' },
                { metric: 'CPA', direction: 'down' },
            ],
        });
    }

    return insights;
}
