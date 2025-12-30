'use client';

import { TrendingUp, TrendingDown, Minus, Target, DollarSign, MousePointer, ShoppingCart } from 'lucide-react';

interface QuickStatsProps {
    currentDay: number;
    todayResults: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        revenue: number;
        ctr: number;
        cvr: number;
        roas: number;
    } | null;
    previousResults: {
        impressions: number;
        clicks: number;
        conversions: number;
        cost: number;
        ctr: number;
        cvr: number;
        roas: number;
    } | null;
}

function TrendIndicator({ current, previous, isPercentage = false, higherIsBetter = true }: {
    current: number;
    previous: number | null;
    isPercentage?: boolean;
    higherIsBetter?: boolean;
}) {
    if (previous === null || previous === 0) {
        return <span className="text-xs text-muted">—</span>;
    }

    const diff = current - previous;
    const percentChange = (diff / previous) * 100;
    const isPositive = higherIsBetter ? diff > 0 : diff < 0;
    const isNeutral = Math.abs(percentChange) < 1;

    if (isNeutral) {
        return (
            <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <Minus size={10} /> Same
            </span>
        );
    }

    return (
        <span
            className={`text-xs ${isPositive ? 'text-success' : 'text-error'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
        >
            {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {diff > 0 ? '+' : ''}{isPercentage ? diff.toFixed(2) + '%' : Math.round(diff).toLocaleString()}
        </span>
    );
}

export default function QuickStats({ currentDay, todayResults, previousResults }: QuickStatsProps) {
    if (!todayResults || currentDay === 0) {
        return (
            <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))',
                border: '1px solid rgba(59, 130, 246, 0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <Target size={18} className="text-primary" />
                    <span className="font-medium" style={{ fontSize: '0.875rem' }}>Ready to Simulate</span>
                </div>
                <p className="text-xs text-muted">
                    Click "Quick Run" above to start your first day of simulation.
                </p>
            </div>
        );
    }

    const stats = [
        {
            icon: MousePointer,
            label: 'Clicks',
            value: todayResults.clicks,
            previous: previousResults?.clicks || null,
            format: (v: number) => v.toLocaleString(),
        },
        {
            icon: ShoppingCart,
            label: 'Conversions',
            value: todayResults.conversions,
            previous: previousResults?.conversions || null,
            format: (v: number) => v.toLocaleString(),
        },
        {
            icon: DollarSign,
            label: 'ROAS',
            value: todayResults.roas,
            previous: previousResults?.roas || null,
            format: (v: number) => v.toFixed(2) + 'x',
        },
    ];

    return (
        <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))',
            border: '1px solid rgba(59, 130, 246, 0.2)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <span className="font-medium" style={{ fontSize: '0.875rem' }}>Day {currentDay} Results</span>
                <span className={`badge ${todayResults.roas >= 1 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                    {todayResults.roas >= 1 ? 'Profitable' : 'Below Target'}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {stats.map((stat) => (
                    <div key={stat.label} style={{ textAlign: 'center' }}>
                        <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>{stat.label}</div>
                        <div className="font-medium" style={{ fontSize: '1rem' }}>{stat.format(stat.value)}</div>
                        <TrendIndicator
                            current={stat.value}
                            previous={stat.previous}
                            higherIsBetter={stat.label !== 'Cost'}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
