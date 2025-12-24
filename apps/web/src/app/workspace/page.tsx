'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, Suspense, useCallback } from 'react';

interface Account {
    id: string;
    name: string;
    daily_budget: number;
    currency: string;
}

interface Campaign {
    id: string;
    name: string;
    status: string;
    budget: number;
}

interface Run {
    id: string;
    status: string;
    current_day: number;
    duration_days: number;
    created_at: string;
}

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`}>
            <span style={{ fontSize: '1.25rem' }}>
                {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
            </span>
            <span>{message}</span>
        </div>
    );
}

function WorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const accountId = searchParams.get('account');
    const scenario = searchParams.get('scenario');

    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [campaignName, setCampaignName] = useState('');
    const [campaignBudget, setCampaignBudget] = useState(50);
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([]);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Fetch account
    const { data: account, isLoading: accountLoading } = useQuery<Account>({
        queryKey: ['account', accountId],
        queryFn: async () => {
            const res = await fetch(`/api/accounts/${accountId}`);
            if (!res.ok) throw new Error('Failed to fetch account');
            return res.json();
        },
        enabled: !!accountId,
    });

    // Fetch campaigns
    const { data: campaignsData } = useQuery({
        queryKey: ['campaigns', accountId],
        queryFn: async () => {
            const res = await fetch(`/api/accounts/${accountId}/campaigns`);
            if (!res.ok) throw new Error('Failed to fetch campaigns');
            return res.json();
        },
        enabled: !!accountId,
    });

    // Fetch runs
    const { data: runsData, refetch: refetchRuns } = useQuery({
        queryKey: ['runs', accountId],
        queryFn: async () => {
            const res = await fetch(`/api/accounts/${accountId}/runs`);
            if (!res.ok) throw new Error('Failed to fetch runs');
            return res.json();
        },
        enabled: !!accountId,
    });

    // Create campaign mutation
    const createCampaignMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/accounts/${accountId}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: campaignName, budget: campaignBudget, status: 'active' }),
            });
            if (!res.ok) throw new Error('Failed to create campaign');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns', accountId] });
            setShowNewCampaign(false);
            setCampaignName('');
            setCampaignBudget(50);
            addToast('Campaign created successfully!', 'success');
        },
        onError: () => {
            addToast('Failed to create campaign', 'error');
        },
    });

    // Create run mutation
    const createRunMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/accounts/${accountId}/runs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenario_slug: scenario || 'uae-real-estate', duration_days: 30 }),
            });
            if (!res.ok) throw new Error('Failed to create run');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['runs', accountId] });
            addToast('Simulation run created!', 'success');
        },
        onError: () => {
            addToast('Failed to create run', 'error');
        },
    });

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'n' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setShowNewCampaign(true);
            }
            if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                createRunMutation.mutate();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [createRunMutation]);

    const campaigns: Campaign[] = campaignsData?.campaigns || [];
    const runs: Run[] = runsData?.runs || [];

    if (!accountId) {
        return (
            <div className="container py-8">
                <div className="empty-state">
                    <div className="empty-state-icon">🏢</div>
                    <h2 className="empty-state-title">No Account Selected</h2>
                    <p className="empty-state-description">
                        Please create an account first to access your workspace.
                    </p>
                    <Link href="/scenarios" className="btn btn-primary">
                        Browse Scenarios
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
            {/* Breadcrumbs */}
            <div className="breadcrumbs">
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/scenarios">Scenarios</Link>
                <span>/</span>
                <span>Workspace</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-1)' }}>
                        {accountLoading ? (
                            <span className="skeleton" style={{ width: '200px', height: '36px', display: 'inline-block' }} />
                        ) : (
                            account?.name || 'Workspace'
                        )}
                    </h1>
                    <p className="text-muted text-sm">
                        {scenario && `Scenario: ${scenario.replace(/-/g, ' ').replace(/uae /i, 'UAE ')}`}
                    </p>
                </div>
                <div className="btn-group">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowNewCampaign(true)}
                    >
                        + New Campaign
                        <span className="text-xs text-muted" style={{ marginLeft: 'var(--space-2)' }}>⌘N</span>
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => createRunMutation.mutate()}
                        disabled={createRunMutation.isPending}
                    >
                        {createRunMutation.isPending ? (
                            <>
                                <span className="spinner spinner-sm" />
                                Starting...
                            </>
                        ) : (
                            <>▶ Start Run</>
                        )}
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-8)' }}>
                <div className="metric-card">
                    <div className="metric-value">{campaigns.length}</div>
                    <div className="metric-label">Campaigns</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{runs.length}</div>
                    <div className="metric-label">Total Runs</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">{runs.filter(r => r.status === 'running').length}</div>
                    <div className="metric-label">Active Runs</div>
                </div>
                <div className="metric-card">
                    <div className="metric-value">${account?.daily_budget || 100}</div>
                    <div className="metric-label">Daily Budget</div>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Main Content */}
                <div className="dashboard-main">
                    {/* Campaigns Table */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">Campaigns</h2>
                                <p className="card-subtitle">Manage your advertising campaigns</p>
                            </div>
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setShowNewCampaign(true)}
                            >
                                + Add
                            </button>
                        </div>

                        {campaigns.length === 0 ? (
                            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                                <div className="empty-state-icon">📢</div>
                                <h3 className="empty-state-title">No Campaigns Yet</h3>
                                <p className="empty-state-description">
                                    Create your first campaign to start advertising in the simulation.
                                </p>
                                <button className="btn btn-primary" onClick={() => setShowNewCampaign(true)}>
                                    Create Campaign
                                </button>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Budget</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campaigns.map((campaign) => (
                                            <tr key={campaign.id}>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {campaign.name}
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${campaign.status === 'active' ? 'success' : 'neutral'}`}>
                                                        <span className={`status-dot ${campaign.status === 'active' ? 'active' : ''}`} />
                                                        {campaign.status}
                                                    </span>
                                                </td>
                                                <td>${campaign.budget}/day</td>
                                                <td>
                                                    <Link
                                                        href={`/campaigns/${campaign.id}?account=${accountId}`}
                                                        className="btn btn-ghost btn-sm"
                                                    >
                                                        Edit →
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Runs Table */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">Simulation Runs</h2>
                                <p className="card-subtitle">Track your simulation progress</p>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => createRunMutation.mutate()}
                                disabled={createRunMutation.isPending}
                            >
                                + New Run
                            </button>
                        </div>

                        {runs.length === 0 ? (
                            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                                <div className="empty-state-icon">🚀</div>
                                <h3 className="empty-state-title">No Runs Yet</h3>
                                <p className="empty-state-description">
                                    Start a simulation run to see how your campaigns perform.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => createRunMutation.mutate()}
                                    disabled={createRunMutation.isPending}
                                >
                                    Start First Run
                                </button>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Run ID</th>
                                            <th>Status</th>
                                            <th>Progress</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {runs.map((run) => (
                                            <tr key={run.id}>
                                                <td className="font-mono text-sm">{run.id.slice(0, 8)}...</td>
                                                <td>
                                                    <span className={`badge badge-${run.status === 'completed' ? 'success' :
                                                            run.status === 'running' ? 'warning' :
                                                                'neutral'
                                                        }`}>
                                                        <span className={`status-dot ${run.status}`} />
                                                        {run.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                        <div className="progress-bar" style={{ width: '100px' }}>
                                                            <div
                                                                className="progress-fill"
                                                                style={{ width: `${(run.current_day / run.duration_days) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm text-muted">
                                                            Day {run.current_day}/{run.duration_days}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <Link
                                                        href={`/results/${run.id}`}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        View Results
                                                    </Link>
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
                    {/* Quick Actions */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <button
                                className="btn btn-secondary w-full justify-between"
                                onClick={() => setShowNewCampaign(true)}
                            >
                                <span>New Campaign</span>
                                <span className="text-muted text-xs">⌘N</span>
                            </button>
                            <button
                                className="btn btn-secondary w-full justify-between"
                                onClick={() => createRunMutation.mutate()}
                                disabled={createRunMutation.isPending}
                            >
                                <span>Start Run</span>
                                <span className="text-muted text-xs">⌘R</span>
                            </button>
                            <Link
                                href="/scenarios"
                                className="btn btn-ghost w-full"
                            >
                                Change Scenario
                            </Link>
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-3)' }}>💡 Pro Tip</h3>
                        <p className="text-sm text-secondary" style={{ lineHeight: 1.7 }}>
                            Start with a single campaign and 5-10 keywords. Run the simulation for
                            a few days, review the results, then optimize before scaling up.
                        </p>
                    </div>

                    {/* Keyboard Shortcuts */}
                    <div className="card">
                        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Keyboard Shortcuts</h3>
                        <div style={{ fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                <span className="text-muted">New Campaign</span>
                                <kbd style={{
                                    background: 'var(--gray-800)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                }}>⌘ N</kbd>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                <span className="text-muted">Start Run</span>
                                <kbd style={{
                                    background: 'var(--gray-800)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                }}>⌘ R</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Campaign Modal */}
            {showNewCampaign && (
                <div className="modal-backdrop" onClick={() => setShowNewCampaign(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create Campaign</h2>
                            <p className="text-sm text-muted" style={{ marginTop: 'var(--space-1)' }}>
                                Set up a new advertising campaign
                            </p>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="label label-required">Campaign Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="e.g., Dubai Villas - Brand"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && campaignName) {
                                            createCampaignMutation.mutate();
                                        }
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="label">Daily Budget ($)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={campaignBudget}
                                    onChange={(e) => setCampaignBudget(Number(e.target.value))}
                                    min={1}
                                    max={10000}
                                />
                                <p className="help-text">Recommended: $50-200 for testing</p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowNewCampaign(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => createCampaignMutation.mutate()}
                                disabled={!campaignName || createCampaignMutation.isPending}
                            >
                                {createCampaignMutation.isPending ? (
                                    <>
                                        <span className="spinner spinner-sm" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Campaign'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}

export default function WorkspacePage() {
    return (
        <main className="min-h-screen">
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/scenarios" className="nav-link">Scenarios</Link>
                        <Link href="/workspace" className="nav-link active">Workspace</Link>
                    </div>
                </div>
            </nav>

            <Suspense fallback={
                <div className="container py-8">
                    <div className="skeleton skeleton-title" style={{ marginBottom: 'var(--space-6)' }} />
                    <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-6)' }}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="skeleton skeleton-card" />
                        ))}
                    </div>
                </div>
            }>
                <WorkspaceContent />
            </Suspense>
        </main>
    );
}
