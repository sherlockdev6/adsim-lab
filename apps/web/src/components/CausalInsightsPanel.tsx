'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Search, BarChart3, Info, Lightbulb, AlertTriangle, TrendingDown, TrendingUp, ArrowRight, Zap, Target, Activity, ShieldAlert } from 'lucide-react';
import MetricChangeCard from './MetricChangeCard';

interface CausalDriver {
    id: string;
    cause: string;
    label: string;
    impact_percent: number;
    explanation: string;
    explanation_advanced: string;
    segment_evidence: Array<{
        segment_type: string;
        segment_value: string;
        metric_change: number;
    }>;
}

interface MetricChange {
    previous: number;
    current: number;
    change_percent: number;
    direction: 'up' | 'down' | 'flat';
    drivers: CausalDriver[];
}

interface IntentMixShift {
    high_intent_percent: number;
    medium_intent_percent: number;
    low_intent_percent: number;
    previous: {
        high_intent_percent: number;
        medium_intent_percent: number;
        low_intent_percent: number;
    } | null;
    shift_direction: 'toward_low' | 'toward_high' | 'stable';
    shift_magnitude: number;
    is_significant: boolean;
    explanation_beginner: string;
    explanation_advanced: string;
}

interface ConflictingSignal {
    id: string;
    signal_a: { metric: string; direction: string; change: number };
    signal_b: { metric: string; direction: string; change: number };
    explanation_beginner: string;
    explanation_advanced: string;
    likely_cause: string;
}

interface LearningFlowState {
    is_crisis_day: boolean;
    is_recovery_day: boolean;
    crisis_message_beginner: {
        title: string;
        severity: string;
        summary: string;
        action: string;
        suggested_negatives: string[];
    } | null;
    crisis_message_advanced: {
        title: string;
        severity: string;
        waste_percent: number;
        summary: string;
        root_cause_chain: Array<{ cause: string; contribution: number }>;
        tradeoff: string;
        expected_outcome: string;
    } | null;
    recovery_message: {
        title: string;
        summary: string;
        metrics_comparison: {
            before: { impressions: number; conversions: number; cpa: number };
            after: { impressions: number; conversions: number; cpa: number };
        };
    } | null;
}

interface DetectedIssue {
    id: string;
    severity: 'critical' | 'important';
    title: string;
    summary_beginner: string;
    summary_advanced: string;
    root_causes: Array<{ cause: string; contribution: number }>;
    suggested_action: string;
}

interface PositiveOutcome {
    id: string;
    title: string;
    summary: string;
    likely_cause: string;
}

interface CausalAnalysisData {
    run_id: string;
    day_number: number;
    previous_day: number | null;
    is_first_day: boolean;

    // New data-driven fields
    overall_status?: 'stable' | 'improving' | 'needs_attention' | 'watch';
    overall_message?: string;
    detected_issues?: DetectedIssue[];
    positive_outcomes?: PositiveOutcome[];
    has_issues?: boolean;
    has_positive_outcomes?: boolean;
    decisions_active?: {
        negatives_added: boolean;
        match_types_tightened: boolean;
        budget_changed: boolean;
    };

    // Legacy fields (still supported)
    intent_mix_shift?: IntentMixShift;
    conflicting_signals: ConflictingSignal[];
    has_conflicting_signals: boolean;
    learning_flow?: LearningFlowState;
    metrics: {
        cpc: MetricChange;
        ctr: MetricChange;
        cvr: MetricChange;
        cpa?: MetricChange;
        roas?: MetricChange;
        conversions: MetricChange;
        impression_share: MetricChange;
    };
}

interface CausalInsightsPanelProps {
    runId: string;
    selectedDay: number | null;
    onDayChange?: (day: number | null) => void;
}

async function fetchCausalAnalysis(runId: string, day: number): Promise<CausalAnalysisData> {
    const res = await fetch(`/api/runs/${runId}/days/${day}/causal-analysis`);
    if (!res.ok) throw new Error('Failed to fetch causal analysis');
    return res.json();
}

export default function CausalInsightsPanel({ runId, selectedDay, onDayChange }: CausalInsightsPanelProps) {
    const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
    const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['causal-analysis', runId, selectedDay],
        queryFn: () => fetchCausalAnalysis(runId, selectedDay!),
        enabled: !!selectedDay && selectedDay > 0,
    });

    // Metric display config
    const metricConfig: Record<string, { label: string; format: (v: number) => string; goodDirection: 'up' | 'down' }> = {
        cpc: { label: 'Cost per Click', format: (v) => `$${(v || 0).toFixed(2)}`, goodDirection: 'down' },
        ctr: { label: 'Click-Through Rate', format: (v) => `${((v || 0) * 100).toFixed(2)}%`, goodDirection: 'up' },
        cvr: { label: 'Conversion Rate', format: (v) => `${((v || 0) * 100).toFixed(2)}%`, goodDirection: 'up' },
        conversions: { label: 'Conversions', format: (v) => Math.round(v || 0).toString(), goodDirection: 'up' },
        impression_share: { label: 'Impression Share', format: (v) => `${((v || 0) * 100).toFixed(0)}%`, goodDirection: 'up' },
    };

    return (
        <div className="card" style={{ height: '100%' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Search size={20} /> Why Did This Change?
                    </h2>
                    <p className="card-subtitle">
                        {selectedDay
                            ? `Analyzing Day ${selectedDay}`
                            : 'Click a day on the chart'
                        }
                    </p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="btn-group-connected w-full" style={{ marginBottom: 'var(--space-4)' }}>
                <button
                    className={`btn btn-sm ${mode === 'beginner' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMode('beginner')}
                >
                    Beginner
                </button>
                <button
                    className={`btn btn-sm ${mode === 'advanced' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setMode('advanced')}
                >
                    Advanced
                </button>
            </div>

            {/* No Day Selected */}
            {!selectedDay && (
                <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                    <div style={{ marginBottom: 'var(--space-3)', color: 'var(--text-muted)' }}>
                        <BarChart3 size={32} />
                    </div>
                    <p className="text-muted text-sm" style={{ textAlign: 'center', lineHeight: 1.7 }}>
                        Click on any day in the "Performance Over Time" chart to see what drove the changes in your metrics.
                    </p>
                </div>
            )}

            {/* Loading */}
            {selectedDay && isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="skeleton" style={{ height: '80px', borderRadius: 'var(--radius-md)' }} />
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{ padding: 'var(--space-4)', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                    <p className="text-error text-sm">Failed to load causal analysis</p>
                </div>
            )}

            {/* First Day Notice */}
            {data?.is_first_day && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <p className="text-sm text-muted" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                        <Info size={16} className="text-primary" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span><strong className="text-primary">Day 1</strong> — This is the first day — no previous day to compare against. Showing baseline drivers.</span>
                    </p>
                </div>
            )}

            {/* Learning Flow Crisis Alert */}
            {data?.learning_flow?.is_crisis_day && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <ShieldAlert size={20} style={{ color: 'var(--error)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--error)', marginBottom: 'var(--space-2)' }}>
                                {mode === 'beginner'
                                    ? data.learning_flow.crisis_message_beginner?.title
                                    : data.learning_flow.crisis_message_advanced?.title}
                            </p>
                            <p className="text-sm" style={{ marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
                                {mode === 'beginner'
                                    ? data.learning_flow.crisis_message_beginner?.summary
                                    : data.learning_flow.crisis_message_advanced?.summary}
                            </p>

                            {mode === 'advanced' && data.learning_flow.crisis_message_advanced?.root_cause_chain && (
                                <div style={{ marginBottom: 'var(--space-3)' }}>
                                    <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)' }}>Root Cause Chain:</p>
                                    {data.learning_flow.crisis_message_advanced.root_cause_chain.map((cause, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '4px' }}>
                                            <div style={{
                                                width: `${cause.contribution}%`,
                                                height: '4px',
                                                background: `rgba(239, 68, 68, ${0.3 + cause.contribution / 100})`,
                                                borderRadius: '2px',
                                                minWidth: '20px'
                                            }} />
                                            <span className="text-xs">{cause.cause} ({cause.contribution}%)</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="text-sm" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Zap size={14} />
                                {mode === 'beginner'
                                    ? data.learning_flow.crisis_message_beginner?.action
                                    : data.learning_flow.crisis_message_advanced?.tradeoff}
                            </p>

                            {mode === 'beginner' && data.learning_flow.crisis_message_beginner?.suggested_negatives && (
                                <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                    {data.learning_flow.crisis_message_beginner.suggested_negatives.map((neg) => (
                                        <span key={neg} className="badge badge-error">{neg}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Learning Flow Recovery Message */}
            {data?.learning_flow?.is_recovery_day && data.learning_flow.recovery_message && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <Target size={20} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 'var(--space-2)' }}>
                                {data.learning_flow.recovery_message.title}
                            </p>
                            <p className="text-sm" style={{ marginBottom: 'var(--space-3)', lineHeight: 1.6 }}>
                                {data.learning_flow.recovery_message.summary}
                            </p>
                            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: '0.75rem' }}>
                                <div>
                                    <span className="text-muted">Before:</span>
                                    <span style={{ marginLeft: 'var(--space-2)' }}>
                                        {data.learning_flow.recovery_message.metrics_comparison.before.impressions.toLocaleString()} imp,
                                        {data.learning_flow.recovery_message.metrics_comparison.before.conversions} conv,
                                        ${data.learning_flow.recovery_message.metrics_comparison.before.cpa} CPA
                                    </span>
                                </div>
                                <ArrowRight size={14} className="text-muted" />
                                <div>
                                    <span className="text-muted">After:</span>
                                    <span style={{ marginLeft: 'var(--space-2)', color: 'var(--success)' }}>
                                        {data.learning_flow.recovery_message.metrics_comparison.after.impressions.toLocaleString()} imp,
                                        {data.learning_flow.recovery_message.metrics_comparison.after.conversions} conv,
                                        ${data.learning_flow.recovery_message.metrics_comparison.after.cpa} CPA
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Data-Driven Overall Status Banner */}
            {data?.overall_status && data.overall_status !== 'stable' && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: data.overall_status === 'improving'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : data.overall_status === 'needs_attention'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                    border: `1px solid ${data.overall_status === 'improving'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : data.overall_status === 'needs_attention'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(245, 158, 11, 0.3)'}`,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {data.overall_status === 'improving' ? (
                            <TrendingUp size={18} style={{ color: 'var(--success)' }} />
                        ) : data.overall_status === 'needs_attention' ? (
                            <AlertTriangle size={18} style={{ color: 'var(--error)' }} />
                        ) : (
                            <Info size={18} style={{ color: 'var(--warning)' }} />
                        )}
                        <span style={{
                            fontWeight: 600,
                            color: data.overall_status === 'improving'
                                ? 'var(--success)'
                                : data.overall_status === 'needs_attention'
                                    ? 'var(--error)'
                                    : 'var(--warning)'
                        }}>
                            {data.overall_message}
                        </span>
                    </div>
                </div>
            )}

            {/* Data-Driven Detected Issues */}
            {data?.detected_issues && data.detected_issues.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Issues Detected
                    </div>
                    {data.detected_issues.map((issue) => (
                        <div key={issue.id} style={{
                            padding: 'var(--space-3)',
                            background: issue.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: `1px solid ${issue.severity === 'critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                <AlertTriangle size={14} style={{ color: issue.severity === 'critical' ? 'var(--error)' : 'var(--warning)', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: issue.severity === 'critical' ? 'var(--error)' : 'var(--warning)' }}>
                                    {issue.title}
                                </span>
                            </div>
                            <p className="text-sm" style={{ marginBottom: 'var(--space-2)', lineHeight: 1.5 }}>
                                {mode === 'beginner' ? issue.summary_beginner : issue.summary_advanced}
                            </p>
                            {mode === 'advanced' && issue.root_causes && (
                                <div style={{ marginBottom: 'var(--space-2)' }}>
                                    {issue.root_causes.slice(0, 3).map((cause, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '2px' }}>
                                            <div style={{
                                                width: `${cause.contribution}%`,
                                                height: '3px',
                                                background: `rgba(239, 68, 68, ${0.4 + cause.contribution / 100})`,
                                                borderRadius: '2px',
                                                minWidth: '15px'
                                            }} />
                                            <span className="text-xs text-muted">{cause.cause} ({cause.contribution}%)</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <Lightbulb size={12} />
                                {issue.suggested_action}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Data-Driven Positive Outcomes */}
            {data?.positive_outcomes && data.positive_outcomes.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', fontWeight: 600, textTransform: 'uppercase' }}>
                        Positive Outcomes
                    </div>
                    {data.positive_outcomes.map((outcome) => (
                        <div key={outcome.id} style={{
                            padding: 'var(--space-3)',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-2)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                <TrendingUp size={14} style={{ color: 'var(--success)', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--success)' }}>
                                    {outcome.title}
                                </span>
                            </div>
                            <p className="text-sm" style={{ marginBottom: 'var(--space-1)', lineHeight: 1.5 }}>
                                {outcome.summary}
                            </p>
                            <p className="text-xs text-muted">
                                Likely cause: {outcome.likely_cause}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Decision Attribution */}
            {data?.decisions_active && (data.decisions_active.negatives_added || data.decisions_active.match_types_tightened) && (
                <div style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div className="text-xs" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--primary)' }}>
                        <Info size={12} />
                        <span>
                            <strong>Your decisions are active:</strong>
                            {data.decisions_active.negatives_added && ' Negative keywords added'}
                            {data.decisions_active.negatives_added && data.decisions_active.match_types_tightened && ' •'}
                            {data.decisions_active.match_types_tightened && ' Match types tightened'}
                        </span>
                    </div>
                </div>
            )}

            {/* Intent Mix Shift Indicator */}
            {data?.intent_mix_shift?.is_significant && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'var(--gray-800)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <Activity size={16} className="text-warning" />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Intent Mix Shift</span>
                    </div>

                    {/* Intent distribution bar */}
                    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: 'var(--space-3)' }}>
                        <div style={{ width: `${data.intent_mix_shift.high_intent_percent}%`, background: 'var(--success)' }} title={`High intent: ${data.intent_mix_shift.high_intent_percent}%`} />
                        <div style={{ width: `${data.intent_mix_shift.medium_intent_percent}%`, background: 'var(--warning)' }} title={`Medium intent: ${data.intent_mix_shift.medium_intent_percent}%`} />
                        <div style={{ width: `${data.intent_mix_shift.low_intent_percent}%`, background: 'var(--error)' }} title={`Low intent: ${data.intent_mix_shift.low_intent_percent}%`} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
                        <span style={{ color: 'var(--success)' }}>High: {data.intent_mix_shift.high_intent_percent}%</span>
                        <span style={{ color: 'var(--warning)' }}>Med: {data.intent_mix_shift.medium_intent_percent}%</span>
                        <span style={{ color: 'var(--error)' }}>Low: {data.intent_mix_shift.low_intent_percent}%</span>
                    </div>

                    <p className="text-sm" style={{ lineHeight: 1.6 }}>
                        {mode === 'beginner'
                            ? data.intent_mix_shift.explanation_beginner
                            : data.intent_mix_shift.explanation_advanced}
                    </p>
                </div>
            )}

            {/* Conflicting Signals (Advanced Mode) */}
            {mode === 'advanced' && data?.has_conflicting_signals && data.conflicting_signals.length > 0 && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <AlertTriangle size={16} className="text-warning" />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--warning)' }}>Conflicting Signals</span>
                    </div>

                    {data.conflicting_signals.map((signal) => (
                        <div key={signal.id} style={{ marginBottom: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                <span className="badge" style={{ background: signal.signal_a.direction === 'up' ? 'var(--success)' : 'var(--error)' }}>
                                    {signal.signal_a.metric} {signal.signal_a.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {signal.signal_a.change}%
                                </span>
                                <span className="text-muted">but</span>
                                <span className="badge" style={{ background: signal.signal_b.direction === 'up' ? 'var(--success)' : 'var(--error)' }}>
                                    {signal.signal_b.metric} {signal.signal_b.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {signal.signal_b.change}%
                                </span>
                            </div>
                            <p className="text-sm text-muted" style={{ lineHeight: 1.6 }}>
                                {signal.explanation_advanced}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Metric Cards */}
            {data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {Object.entries(data.metrics).map(([key, metric]) => {
                        const config = metricConfig[key];
                        if (!config) return null;

                        // Skip metrics with no significant change
                        if (Math.abs(metric.change_percent) < 0.5 && !data.is_first_day) return null;

                        return (
                            <MetricChangeCard
                                key={key}
                                metricKey={key}
                                label={config.label}
                                previous={metric.previous}
                                current={metric.current}
                                changePercent={metric.change_percent}
                                direction={metric.direction}
                                goodDirection={config.goodDirection}
                                format={config.format}
                                drivers={metric.drivers}
                                mode={mode}
                                isExpanded={expandedMetric === key}
                                onToggle={() => setExpandedMetric(expandedMetric === key ? null : key)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Tips */}
            <div style={{
                marginTop: 'var(--space-6)',
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
                <span><strong>Tip:</strong> Click on any metric to see detailed driver breakdown</span>
            </div>
        </div>
    );
}
