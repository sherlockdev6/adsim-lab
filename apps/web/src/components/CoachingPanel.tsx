'use client';

interface CoachingInsight {
    type: 'must_fix' | 'should_improve' | 'nice_to_have';
    title: string;
    what: string;
    why: string;
    action: string;
    impact: string;
}

interface CoachingPanelProps {
    causalLog?: Record<string, number>;
    metrics?: {
        ctr: number;
        cvr: number;
        cpc: number;
        impression_share: number;
        lost_is_budget: number;
        lost_is_rank: number;
        avg_quality_score: number;
    };
    level?: 'beginner' | 'advanced';
}

function generateInsights(
    causalLog: Record<string, number> | undefined,
    metrics: CoachingPanelProps['metrics']
): CoachingInsight[] {
    const insights: CoachingInsight[] = [];

    if (!metrics) return insights;

    // Budget Limited
    if (metrics.lost_is_budget > 0.2) {
        insights.push({
            type: 'must_fix',
            title: 'Budget is Limiting Your Reach',
            what: `You're losing ${(metrics.lost_is_budget * 100).toFixed(0)}% of impression share due to budget constraints.`,
            why: `Your daily budget runs out before all potential customers have searched. You're missing valuable traffic.`,
            action: 'Increase your daily campaign budget by 25-50%, or reduce bids on lower-performing keywords to spread budget further.',
            impact: `Could increase impressions by up to ${(metrics.lost_is_budget * 100).toFixed(0)}%`,
        });
    }

    // Low Quality Score
    if (metrics.avg_quality_score < 0.5) {
        insights.push({
            type: 'must_fix',
            title: 'Quality Score Needs Improvement',
            what: `Your average Quality Score is ${(metrics.avg_quality_score * 10).toFixed(1)}/10, which is below average.`,
            why: 'Low Quality Score means you pay more for each click and get worse ad positions. This affects both cost and visibility.',
            action: 'Review your ad copy to ensure keywords appear in headlines. Check landing page relevance and load speed.',
            impact: 'Improving QS by 2 points typically reduces CPC by 15-25%',
        });
    }

    // Lost to Rank
    if (metrics.lost_is_rank > 0.3) {
        insights.push({
            type: 'should_improve',
            title: 'Losing Auctions to Competitors',
            what: `You're losing ${(metrics.lost_is_rank * 100).toFixed(0)}% of eligible impressions due to ad rank.`,
            why: 'Competitors have higher Ad Rank (bid × Quality Score). You need to improve one or both factors.',
            action: 'Either increase bids on your best-performing keywords, or focus on improving Quality Score for a long-term advantage.',
            impact: `Could capture an additional ${(metrics.lost_is_rank * 100 * 0.5).toFixed(0)}% of impressions`,
        });
    }

    // Low CTR
    if (metrics.ctr < 0.02) {
        insights.push({
            type: 'should_improve',
            title: 'Click-Through Rate is Low',
            what: `Your CTR of ${(metrics.ctr * 100).toFixed(2)}% is below the typical 2-5% range.`,
            why: `Low CTR suggests your ads aren't resonating with searchers. This hurts Quality Score and wastes impression share.`,
            action: 'Test new ad copy with stronger calls-to-action. Include keywords in headlines. Highlight unique value propositions.',
            impact: 'Doubling CTR typically improves QS by 1-2 points',
        });
    }

    // Low CVR
    if (metrics.cvr < 0.02 && metrics.ctr > 0.02) {
        insights.push({
            type: 'should_improve',
            title: 'Conversion Rate Could Be Better',
            what: `Your CVR of ${(metrics.cvr * 100).toFixed(2)}% means most clicks don't convert.`,
            why: `You're paying for clicks that don't result in leads or sales. This directly impacts your ROI.`,
            action: 'Review landing page experience. Ensure the page matches ad messaging. Check mobile responsiveness and load speed.',
            impact: 'Improving CVR by 1% can double your ROAS',
        });
    }

    // High CPC
    if (metrics.cpc > 10) {
        insights.push({
            type: 'nice_to_have',
            title: 'Consider CPC Optimization',
            what: `Your average CPC of $${metrics.cpc.toFixed(2)} is relatively high for this market.`,
            why: 'High CPCs eat into margins. While some competition is unavoidable, there may be optimization opportunities.',
            action: 'Consider adding more long-tail keywords which typically have lower competition. Use bid adjustments for devices/times.',
            impact: 'Reducing CPC by 20% without losing volume saves significant budget',
        });
    }

    // Broad match leakage (from causal log)
    if (causalLog?.['broad_match_leak'] && causalLog['broad_match_leak'] > 0.1) {
        insights.push({
            type: 'should_improve',
            title: 'Broad Match May Be Matching Irrelevant Queries',
            what: 'Your broad match keywords are triggering on some irrelevant searches.',
            why: 'Irrelevant traffic wastes budget and hurts Quality Score through low CTR.',
            action: 'Check your Search Terms Report. Add irrelevant terms as negative keywords. Consider using phrase match for tighter control.',
            impact: 'Reducing wasted spend by 10-20%',
        });
    }

    // If no issues found
    if (insights.length === 0) {
        insights.push({
            type: 'nice_to_have',
            title: 'Campaign Performing Well',
            what: 'Your key metrics are within healthy ranges.',
            why: 'Keep monitoring for changes and opportunities.',
            action: 'Consider testing new keywords or ad variations to find additional growth.',
            impact: 'Continuous optimization maintains competitive edge',
        });
    }

    return insights;
}

export default function CoachingPanel({ causalLog, metrics, level = 'beginner' }: CoachingPanelProps) {
    const insights = generateInsights(causalLog, metrics);

    const typeConfig = {
        must_fix: {
            icon: '🔴',
            label: 'Critical',
            border: 'var(--error-500)',
            bg: 'rgba(239, 68, 68, 0.08)'
        },
        should_improve: {
            icon: '🟡',
            label: 'Recommended',
            border: 'var(--warning-500)',
            bg: 'rgba(245, 158, 11, 0.08)'
        },
        nice_to_have: {
            icon: '🔵',
            label: 'Optimization',
            border: 'var(--primary-500)',
            bg: 'rgba(59, 130, 246, 0.08)'
        },
    };

    return (
        <div className="card">
            <div className="card-header" style={{
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div>
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span>💡</span> Coaching Insights
                    </h2>
                    <p className="card-subtitle">
                        {level === 'beginner'
                            ? 'Personalized recommendations for your campaign'
                            : 'Detailed analysis with advanced strategies'}
                    </p>
                </div>
            </div>

            {!metrics ? (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <p className="text-muted text-sm">
                        Run a simulation day to receive coaching insights
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {insights.map((insight, idx) => {
                        const config = typeConfig[insight.type];
                        return (
                            <div
                                key={idx}
                                style={{
                                    borderLeft: `3px solid ${config.border}`,
                                    background: config.bg,
                                    padding: 'var(--space-4)',
                                    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                                }}
                            >
                                {/* Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    marginBottom: 'var(--space-2)'
                                }}>
                                    <span>{config.icon}</span>
                                    <span className="text-xs font-semibold" style={{
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        opacity: 0.8
                                    }}>
                                        {config.label}
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 style={{
                                    fontSize: '0.9375rem',
                                    fontWeight: 600,
                                    marginBottom: 'var(--space-3)'
                                }}>
                                    {insight.title}
                                </h4>

                                {/* Content */}
                                <div className="text-sm" style={{ lineHeight: 1.7 }}>
                                    <p style={{ marginBottom: 'var(--space-2)' }}>
                                        <strong style={{ color: 'var(--text-secondary)' }}>Issue:</strong>{' '}
                                        <span className="text-muted">{insight.what}</span>
                                    </p>

                                    {level === 'advanced' && (
                                        <p style={{ marginBottom: 'var(--space-2)', opacity: 0.8 }}>
                                            <strong style={{ color: 'var(--text-secondary)' }}>Why it matters:</strong>{' '}
                                            <span className="text-muted">{insight.why}</span>
                                        </p>
                                    )}

                                    <p style={{ marginBottom: 'var(--space-2)' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Action:</strong>{' '}
                                        <span className="text-muted">{insight.action}</span>
                                    </p>

                                    <p>
                                        <strong style={{ color: 'var(--success)' }}>Expected Impact:</strong>{' '}
                                        <span className="text-muted">{insight.impact}</span>
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
