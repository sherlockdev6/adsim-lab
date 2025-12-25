'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, ReferenceDot,
} from 'recharts';
import CoachingInsightsPanel, { generateCoachingInsights } from '@/components/CoachingInsightsPanel';
import CausalInsightsPanel from '@/components/CausalInsightsPanel';
import WastedSpendCard from '@/components/WastedSpendCard';
import HarmfulQueriesWidget from '@/components/HarmfulQueriesWidget';
import NegativeSuggestions from '@/components/NegativeSuggestions';
import { Search, Lightbulb, MapPin, Check, X, Info, BarChart3 } from 'lucide-react';

interface DailyResult {
    day_number: number;
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    ctr: number;
    cvr: number;
    cpc: number;
    cpa: number;
    roas: number;
    avg_position: number;
    avg_quality_score: number;
    impression_share: number;
    lost_is_budget: number;
    lost_is_rank: number;
}

interface RunResults {
    run_id: string;
    status: string;
    current_day: number;
    duration_days: number;
    daily_results: DailyResult[];
    totals: DailyResult | null;
}

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const IconComponent = type === 'success' ? Check : type === 'error' ? X : Info;

    return (
        <div className={`toast toast-${type}`}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <IconComponent size={20} />
            </span>
            <span>{message}</span>
        </div>
    );
}

async function fetchResults(runId: string): Promise<RunResults> {
    const res = await fetch(`/api/runs/${runId}/results`);
    if (!res.ok) throw new Error('Failed to fetch results');
    return res.json();
}

// Custom dot component for chart click
const ClickableDot = ({ cx, cy, payload, selectedDay, onClick }: any) => {
    const isSelected = payload?.day_number === selectedDay;

    return (
        <circle
            cx={cx}
            cy={cy}
            r={isSelected ? 8 : 5}
            fill={isSelected ? '#3b82f6' : '#60a5fa'}
            stroke={isSelected ? '#fff' : 'transparent'}
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onClick={() => onClick?.(payload?.day_number)}
        />
    );
};

export default function ResultsPage() {
    const params = useParams();
    const runId = params.runId as string;
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'coaching' | 'causal'>('causal');
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['results', runId],
        queryFn: () => fetchResults(runId),
        refetchInterval: (query) => {
            return query.state.data?.status === 'running' ? 3000 : false;
        },
    });

    // Fetch search terms analysis for wasted spend
    const { data: searchAnalysis } = useQuery({
        queryKey: ['search-terms-analysis', runId],
        queryFn: async () => {
            const res = await fetch(`/api/runs/${runId}/search-terms-analysis`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!data && data.current_day > 0,
    });

    // Simulate single day
    const simulateDayMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/runs/${runId}/simulate-day`, { method: 'POST' });
            if (!res.ok) throw new Error('Failed to simulate day');
            return res.json();
        },
        onSuccess: (data) => {
            addToast(`Day ${data.day} completed!`, 'success');
            setSelectedDay(data.day); // Auto-select the new day
            setTimeout(() => refetch(), 500);
        },
        onError: () => {
            addToast('Failed to simulate day', 'error');
        },
    });

    // Simulate multiple days
    const simulateMultipleMutation = useMutation({
        mutationFn: async (days: number) => {
            const results = [];
            for (let i = 0; i < days; i++) {
                const res = await fetch(`/api/runs/${runId}/simulate-day`, { method: 'POST' });
                if (!res.ok) break;
                results.push(await res.json());
                await refetch();
            }
            return results;
        },
        onSuccess: (data) => {
            addToast(`${data.length} days simulated!`, 'success');
            if (data.length > 0) {
                setSelectedDay(data[data.length - 1].day);
            }
        },
        onError: () => {
            addToast('Simulation stopped due to error', 'error');
        },
    });

    const isRunning = simulateDayMutation.isPending || simulateMultipleMutation.isPending;
    const isComplete = data?.status === 'completed';

    // Handle chart click
    const handleChartClick = (dayNumber: number) => {
        setSelectedDay(dayNumber);
        setActiveTab('causal'); // Switch to causal tab when clicking
    };

    return (
        <main className="min-h-screen">
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/workspace" className="nav-link">← Back to Workspace</Link>
                    </div>
                </div>
            </nav>

            <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link href="/">Home</Link>
                    <span>/</span>
                    <Link href="/workspace">Workspace</Link>
                    <span>/</span>
                    <span>Results</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-1)' }}>Simulation Results</h1>
                        <p className="text-muted text-sm font-mono">Run #{runId?.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
                        {data && (
                            <>
                                <div className="flex items-center gap-3">
                                    <span className={`badge badge-${data.status === 'completed' ? 'success' : data.status === 'running' ? 'warning' : 'neutral'}`}>
                                        <span className={`status-dot ${data.status}`} />
                                        {data.status}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className="progress-bar" style={{ width: '80px' }}>
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${(data.current_day / data.duration_days) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-muted">
                                            Day {data.current_day}/{data.duration_days}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {!isComplete && (
                            <div className="btn-group">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => simulateDayMutation.mutate()}
                                    disabled={isRunning}
                                >
                                    {isRunning ? (
                                        <>
                                            <span className="spinner spinner-sm" />
                                            Running...
                                        </>
                                    ) : (
                                        '▶ Run 1 Day'
                                    )}
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => simulateMultipleMutation.mutate(5)}
                                    disabled={isRunning}
                                >
                                    Run 5 Days
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => simulateMultipleMutation.mutate(10)}
                                    disabled={isRunning}
                                >
                                    Run 10 Days
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {isLoading && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-4)' }} />
                        <p className="text-muted">Loading results...</p>
                    </div>
                )}

                {error && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <p className="text-error">Failed to load results</p>
                        <button className="btn btn-secondary mt-4" onClick={() => refetch()}>
                            Retry
                        </button>
                    </div>
                )}

                {data && (
                    <div className="dashboard-grid">
                        {/* Main Content */}
                        <div className="dashboard-main">
                            {/* Metrics Cards */}
                            {data.totals ? (
                                <div className="grid grid-cols-5">
                                    <div className="metric-card">
                                        <div className="metric-value">{Math.round(data.totals.impressions).toLocaleString()}</div>
                                        <div className="metric-label">Impressions</div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{Math.round(data.totals.clicks).toLocaleString()}</div>
                                        <div className="metric-label">Clicks</div>
                                        <div className={`metric-change ${(data.totals.ctr || 0) >= 0.03 ? 'positive' : ''}`}>
                                            {((data.totals.ctr || 0) * 100).toFixed(2)}% CTR
                                        </div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">{Math.round(data.totals.conversions).toLocaleString()}</div>
                                        <div className="metric-label">Conversions</div>
                                        <div className={`metric-change ${(data.totals.cvr || 0) >= 0.05 ? 'positive' : ''}`}>
                                            {((data.totals.cvr || 0) * 100).toFixed(2)}% CVR
                                        </div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">${(data.totals.cost || 0).toFixed(0)}</div>
                                        <div className="metric-label">Cost</div>
                                        <div className="metric-change">
                                            ${data.totals.cpc?.toFixed(2) || '0'} CPC
                                        </div>
                                    </div>
                                    <div className="metric-card">
                                        <div className="metric-value">${(data.totals.revenue || 0).toFixed(0)}</div>
                                        <div className="metric-label">Revenue</div>
                                        <div className={`metric-change ${(data.totals.roas || 0) >= 1 ? 'positive' : 'negative'}`}>
                                            {(data.totals.roas || 0).toFixed(2)}x ROAS
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="metric-card">
                                            <div className="skeleton" style={{ width: '60px', height: '28px', margin: '0 auto var(--space-2)' }} />
                                            <div className="skeleton" style={{ width: '80px', height: '12px', margin: '0 auto' }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Wasted Spend Alert - Only show if there's data */}
                            {searchAnalysis && searchAnalysis.wasted_spend && searchAnalysis.wasted_spend.amount > 0 && (
                                <WastedSpendCard
                                    runId={runId}
                                    wastedAmount={searchAnalysis.wasted_spend.amount}
                                    wastedPercent={searchAnalysis.wasted_spend.percent}
                                    trendPercent={searchAnalysis.wasted_spend.trend_percent}
                                    queryCount={searchAnalysis.wasted_spend.query_count}
                                />
                            )}
                            {/* Performance Chart - Interactive */}
                            <div className="card">
                                <div className="card-header">
                                    <div>
                                        <h2 className="card-title">Performance Over Time</h2>
                                        <p className="card-subtitle">
                                            {selectedDay
                                                ? `Day ${selectedDay} selected — viewing insights`
                                                : 'Click on any day to see what drove changes'
                                            }
                                        </p>
                                    </div>
                                    {selectedDay && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setSelectedDay(null)}
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                </div>

                                {data.daily_results.length === 0 ? (
                                    <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                                        <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                                            <BarChart3 size={48} />
                                        </div>
                                        <h3 className="empty-state-title">No Data Yet</h3>
                                        <p className="empty-state-description">
                                            Click "Run 1 Day" to start simulating and see your performance metrics.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="chart-container">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart
                                                data={data.daily_results}
                                                onClick={(e) => {
                                                    if (e?.activePayload?.[0]) {
                                                        handleChartClick(e.activePayload[0].payload.day_number);
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                    </linearGradient>
                                                    <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                <XAxis
                                                    dataKey="day_number"
                                                    stroke="#64748b"
                                                    fontSize={12}
                                                    tickFormatter={(v) => `Day ${v}`}
                                                />
                                                <YAxis stroke="#64748b" fontSize={12} />
                                                <Tooltip
                                                    contentStyle={{
                                                        background: '#1e293b',
                                                        border: '1px solid #334155',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                                    }}
                                                    labelStyle={{ color: '#f8fafc' }}
                                                    labelFormatter={(v) => `Day ${v}`}
                                                    formatter={(value: any, name: string) => {
                                                        if (name === 'Cost ($)') return [`$${(value || 0).toFixed(2)}`, name];
                                                        return [value, name];
                                                    }}
                                                />
                                                <Legend />
                                                <Area
                                                    type="monotone"
                                                    dataKey="clicks"
                                                    stroke="#3b82f6"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorClicks)"
                                                    name="Clicks"
                                                    dot={(props) => (
                                                        <ClickableDot
                                                            {...props}
                                                            selectedDay={selectedDay}
                                                            onClick={handleChartClick}
                                                        />
                                                    )}
                                                    activeDot={{ r: 8 }}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="conversions"
                                                    stroke="#22c55e"
                                                    strokeWidth={2}
                                                    fillOpacity={1}
                                                    fill="url(#colorConversions)"
                                                    name="Conversions"
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="cost"
                                                    stroke="#ef4444"
                                                    strokeWidth={2}
                                                    dot={false}
                                                    name="Cost ($)"
                                                />
                                                {/* Highlight selected day */}
                                                {selectedDay && data.daily_results.find(r => r.day_number === selectedDay) && (
                                                    <ReferenceDot
                                                        x={selectedDay}
                                                        y={data.daily_results.find(r => r.day_number === selectedDay)?.clicks || 0}
                                                        r={12}
                                                        fill="transparent"
                                                        stroke="#3b82f6"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Daily Results Table */}
                            <div className="card">
                                <div className="card-header">
                                    <div>
                                        <h2 className="card-title">Daily Breakdown</h2>
                                        <p className="card-subtitle">Detailed metrics for each simulated day</p>
                                    </div>
                                    <Link
                                        href={`/search-terms/${runId}`}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        View Search Terms →
                                    </Link>
                                </div>

                                {data.daily_results.length === 0 ? (
                                    <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                                        <p className="text-muted">Run a simulation day to see detailed breakdown</p>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Day</th>
                                                    <th>Impr.</th>
                                                    <th>Clicks</th>
                                                    <th>CTR</th>
                                                    <th>Conv.</th>
                                                    <th>Cost</th>
                                                    <th>CPC</th>
                                                    <th>ROAS</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.daily_results.map((r) => (
                                                    <tr
                                                        key={r.day_number}
                                                        style={{
                                                            background: selectedDay === r.day_number ? 'rgba(59, 130, 246, 0.1)' : undefined,
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => handleChartClick(r.day_number)}
                                                    >
                                                        <td className="font-medium">
                                                            {selectedDay === r.day_number && <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />}
                                                            {r.day_number}
                                                        </td>
                                                        <td>{Math.round(r.impressions).toLocaleString()}</td>
                                                        <td>{Math.round(r.clicks).toLocaleString()}</td>
                                                        <td>
                                                            <span className={`badge ${(r.ctr || 0) >= 0.04 ? 'badge-success' : 'badge-neutral'}`}>
                                                                {((r.ctr || 0) * 100).toFixed(1)}%
                                                            </span>
                                                        </td>
                                                        <td>{Math.round(r.conversions)}</td>
                                                        <td>${(r.cost || 0).toFixed(0)}</td>
                                                        <td>${(r.cpc || 0).toFixed(2)}</td>
                                                        <td>
                                                            <span className={`badge ${(r.roas || 0) >= 1 ? 'badge-success' : 'badge-error'}`}>
                                                                {(r.roas || 0).toFixed(1)}x
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleChartClick(r.day_number);
                                                                }}
                                                            >
                                                                <Search size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="dashboard-sidebar">
                            {/* Tab Toggle */}
                            <div className="btn-group-connected w-full">
                                <button
                                    className={`btn ${activeTab === 'causal' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    onClick={() => setActiveTab('causal')}
                                >
                                    <Search size={16} /> Why Changed?
                                </button>
                                <button
                                    className={`btn ${activeTab === 'coaching' ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    onClick={() => setActiveTab('coaching')}
                                >
                                    <Lightbulb size={16} /> Coaching
                                </button>
                            </div>

                            {/* Causal Insights Panel */}
                            {activeTab === 'causal' && (
                                <CausalInsightsPanel
                                    runId={runId}
                                    selectedDay={selectedDay}
                                    onDayChange={setSelectedDay}
                                />
                            )}

                            {/* Coaching Panel */}
                            {activeTab === 'coaching' && (
                                <CoachingInsightsPanel
                                    insights={generateCoachingInsights({
                                        ctr: data.totals?.ctr || 0,
                                        cvr: data.totals?.cvr || 0,
                                        cpc: data.totals?.cpc || 0,
                                        impression_share: data.totals?.impression_share || 0.5,
                                        lost_is_budget: data.totals?.lost_is_budget || 0,
                                        lost_is_rank: data.totals?.lost_is_rank || 0,
                                        avg_quality_score: data.totals?.avg_quality_score || 0.5,
                                        wasted_spend_percent: searchAnalysis?.wasted_spend?.percent || 0,
                                    })}
                                />
                            )}

                            {/* Harmful Queries Widget - Show when we have search analysis data */}
                            {searchAnalysis && searchAnalysis.harmful_queries && searchAnalysis.harmful_queries.length > 0 && (
                                <HarmfulQueriesWidget
                                    runId={runId}
                                    queries={searchAnalysis.harmful_queries}
                                    totalHarmfulCount={searchAnalysis.wasted_spend?.query_count || searchAnalysis.harmful_queries.length}
                                    onAddNegative={(keyword) => addToast(`Added negative: -${keyword}`, 'success')}
                                />
                            )}

                            {/* Negative Suggestions - Show potential savings */}
                            {searchAnalysis && searchAnalysis.negative_suggestions && searchAnalysis.negative_suggestions.length > 0 && (
                                <NegativeSuggestions
                                    suggestions={searchAnalysis.negative_suggestions}
                                    totalSavings={searchAnalysis.potential_savings?.total || 0}
                                    onAddNegative={(keyword) => addToast(`Added negative: -${keyword}`, 'success')}
                                    onAddAll={() => addToast('All negatives added!', 'success')}
                                />
                            )}

                            {/* Quick Actions */}
                            <div className="card">
                                <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    <button
                                        className="btn btn-primary w-full"
                                        onClick={() => simulateMultipleMutation.mutate(30 - (data?.current_day || 0))}
                                        disabled={isRunning || isComplete}
                                    >
                                        Complete Simulation
                                    </button>
                                    <Link
                                        href="/workspace"
                                        className="btn btn-secondary w-full"
                                    >
                                        Back to Workspace
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </main>
    );
}
