'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowRight, ChevronDown } from 'lucide-react';

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

interface MetricChangeCardProps {
    metricKey: string;
    label: string;
    previous: number;
    current: number;
    changePercent: number;
    direction: 'up' | 'down' | 'flat';
    goodDirection: 'up' | 'down';
    format: (v: number) => string;
    drivers: CausalDriver[];
    mode: 'beginner' | 'advanced';
    isExpanded: boolean;
    onToggle: () => void;
}

export default function MetricChangeCard({
    metricKey,
    label,
    previous,
    current,
    changePercent,
    direction,
    goodDirection,
    format,
    drivers,
    mode,
    isExpanded,
    onToggle,
}: MetricChangeCardProps) {
    // Determine if the change is good or bad
    const isGood = direction === goodDirection || direction === 'flat';
    const changeColor = direction === 'flat'
        ? 'var(--text-muted)'
        : isGood
            ? 'var(--success)'
            : 'var(--error)';

    const ArrowIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : ArrowRight;

    return (
        <div
            style={{
                background: 'var(--surface)',
                border: `1px solid ${isExpanded ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                transition: 'all var(--transition-fast)',
            }}
        >
            {/* Header - Always visible */}
            <button
                onClick={onToggle}
                style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div>
                    <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>
                        {label}
                    </div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                    }}>
                        <span className="font-semibold">{format(current)}</span>
                        <span
                            style={{
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: changeColor,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                            }}
                        >
                            <ArrowIcon size={14} />{Math.abs(changePercent || 0).toFixed(1)}%
                        </span>
                    </div>
                </div>
                <div style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform var(--transition-fast)',
                }}>
                    <ChevronDown size={16} />
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div style={{
                    padding: '0 var(--space-4) var(--space-4)',
                    borderTop: '1px solid var(--border)',
                }}>
                    {/* Value Change */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        padding: 'var(--space-3) 0',
                        fontSize: '0.875rem',
                        color: 'var(--text-muted)',
                    }}>
                        <span>{format(previous)}</span>
                        <ArrowRight size={14} />
                        <span style={{ color: 'var(--text-primary)' }}>{format(current)}</span>
                    </div>

                    {/* Drivers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {drivers.slice(0, mode === 'beginner' ? 1 : 3).map((driver, idx) => (
                            <div key={driver.id} style={{
                                padding: 'var(--space-3)',
                                background: 'var(--gray-800)',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                {/* Impact Bar */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                    <div style={{
                                        flex: 1,
                                        height: '6px',
                                        background: 'var(--gray-700)',
                                        borderRadius: 'var(--radius-full)',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${driver.impact_percent}%`,
                                            height: '100%',
                                            background: idx === 0
                                                ? 'linear-gradient(90deg, var(--primary), var(--primary-400))'
                                                : 'var(--gray-500)',
                                            borderRadius: 'var(--radius-full)',
                                            transition: 'width 0.5s ease-out',
                                        }} />
                                    </div>
                                    <span className="text-xs font-semibold" style={{
                                        minWidth: '36px',
                                        textAlign: 'right',
                                        color: idx === 0 ? 'var(--primary)' : 'var(--text-muted)'
                                    }}>
                                        {driver.impact_percent}%
                                    </span>
                                </div>

                                {/* Driver Label */}
                                <div className="font-medium text-sm" style={{ marginBottom: 'var(--space-1)' }}>
                                    {driver.label}
                                </div>

                                {/* Explanation */}
                                <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
                                    {mode === 'beginner' ? driver.explanation : driver.explanation_advanced}
                                </p>

                                {/* Segment Evidence (Advanced only) */}
                                {mode === 'advanced' && driver.segment_evidence.length > 0 && (
                                    <div style={{
                                        marginTop: 'var(--space-2)',
                                        paddingTop: 'var(--space-2)',
                                        borderTop: '1px dashed var(--gray-700)',
                                    }}>
                                        <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-1)' }}>
                                            Segment Evidence:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                            {driver.segment_evidence.map((seg, segIdx) => (
                                                <span
                                                    key={segIdx}
                                                    className="badge badge-neutral"
                                                    style={{ fontSize: '0.65rem' }}
                                                >
                                                    {seg.segment_value}: {seg.metric_change > 0 ? '+' : ''}{seg.metric_change}%
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Show more link in beginner mode */}
                    {mode === 'beginner' && drivers.length > 1 && (
                        <div style={{
                            marginTop: 'var(--space-2)',
                            textAlign: 'center',
                        }}>
                            <span className="text-xs text-muted">
                                +{drivers.length - 1} more driver{drivers.length > 2 ? 's' : ''} (switch to Advanced mode)
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
