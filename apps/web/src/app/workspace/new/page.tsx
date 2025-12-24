'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState, Suspense, useEffect } from 'react';

interface Scenario {
    slug: string;
    name: string;
    description: string;
}

function NewWorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const scenarioSlug = searchParams.get('scenario') || 'uae-real-estate';

    const [accountName, setAccountName] = useState('');
    const [dailyBudget, setDailyBudget] = useState(100);
    const [nameError, setNameError] = useState('');

    // Fetch scenario details
    const { data: scenario } = useQuery<Scenario>({
        queryKey: ['scenario', scenarioSlug],
        queryFn: async () => {
            const res = await fetch(`/api/scenarios/${scenarioSlug}`);
            if (!res.ok) throw new Error('Failed to fetch scenario');
            return res.json();
        },
    });

    // Auto-focus input on mount
    useEffect(() => {
        const input = document.getElementById('account-name');
        if (input) input.focus();
    }, []);

    // Create account mutation
    const createAccountMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: accountName,
                    daily_budget: dailyBudget,
                    currency: 'USD',
                }),
            });
            if (!res.ok) throw new Error('Failed to create account');
            return res.json();
        },
        onSuccess: (data) => {
            router.push(`/workspace?account=${data.id}&scenario=${scenarioSlug}`);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!accountName.trim()) {
            setNameError('Please enter an account name');
            return;
        }

        if (accountName.length < 3) {
            setNameError('Name must be at least 3 characters');
            return;
        }

        setNameError('');
        createAccountMutation.mutate();
    };

    const scenarioIcons: Record<string, string> = {
        'uae-real-estate': '🏠',
        'uae-local-services': '🔧',
        'uae-ecommerce': '🛒',
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
            {/* Breadcrumbs */}
            <div className="breadcrumbs">
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/scenarios">Scenarios</Link>
                <span>/</span>
                <span>New Workspace</span>
            </div>

            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
                {/* Scenario Badge */}
                {scenario && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-6)',
                        padding: 'var(--space-4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-4)',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <div className="scenario-icon" style={{ width: '40px', height: '40px', fontSize: '1.25rem' }}>
                            {scenarioIcons[scenarioSlug] || '📈'}
                        </div>
                        <div>
                            <p className="text-sm text-muted">Selected Scenario</p>
                            <p className="font-semibold">{scenario.name}</p>
                        </div>
                        <Link href="/scenarios" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                            Change
                        </Link>
                    </div>
                )}

                {/* Main Form */}
                <div className="card">
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                        <h1 style={{ marginBottom: 'var(--space-2)' }}>Create Your Workspace</h1>
                        <p className="text-muted">
                            Set up your simulation account to start practicing
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="account-name" className="label label-required">
                                Account Name
                            </label>
                            <input
                                id="account-name"
                                type="text"
                                className={`input ${nameError ? 'input-error' : ''}`}
                                value={accountName}
                                onChange={(e) => {
                                    setAccountName(e.target.value);
                                    if (nameError) setNameError('');
                                }}
                                placeholder="e.g., Dubai Property Agency"
                                maxLength={50}
                            />
                            {nameError && (
                                <p className="error-message">
                                    <span>⚠</span> {nameError}
                                </p>
                            )}
                            <p className="help-text">
                                This is the name of your simulated advertising account
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="daily-budget" className="label">
                                Daily Budget (USD)
                            </label>
                            <input
                                id="daily-budget"
                                type="number"
                                className="input"
                                value={dailyBudget}
                                onChange={(e) => setDailyBudget(Number(e.target.value))}
                                min={10}
                                max={10000}
                                step={10}
                            />
                            <p className="help-text">
                                Your daily spending limit across all campaigns. Start with $50-200 for testing.
                            </p>
                        </div>

                        {/* Budget Presets */}
                        <div style={{
                            display: 'flex',
                            gap: 'var(--space-2)',
                            marginBottom: 'var(--space-6)'
                        }}>
                            {[50, 100, 200, 500].map((amount) => (
                                <button
                                    key={amount}
                                    type="button"
                                    className={`btn ${dailyBudget === amount ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                                    style={{ flex: 1 }}
                                    onClick={() => setDailyBudget(amount)}
                                >
                                    ${amount}
                                </button>
                            ))}
                        </div>

                        {/* Info Box */}
                        <div style={{
                            background: 'var(--gray-800)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-4)',
                            marginBottom: 'var(--space-6)',
                        }}>
                            <p className="text-sm text-muted" style={{ lineHeight: 1.7 }}>
                                💡 <strong>Tip:</strong> In a simulation, there's no real money spent.
                                Feel free to experiment with different budget levels to see how they affect performance.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={createAccountMutation.isPending}
                        >
                            {createAccountMutation.isPending ? (
                                <>
                                    <span className="spinner spinner-sm" />
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account & Continue →'
                            )}
                        </button>

                        {createAccountMutation.error && (
                            <p className="error-message mt-4 text-center">
                                Failed to create account. Please try again.
                            </p>
                        )}
                    </form>
                </div>

                {/* Help Link */}
                <p className="text-center text-sm text-muted" style={{ marginTop: 'var(--space-6)' }}>
                    Need help getting started?{' '}
                    <a href="#" className="text-primary">View the tutorial →</a>
                </p>
            </div>
        </div>
    );
}

export default function NewWorkspacePage() {
    return (
        <main className="min-h-screen">
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/scenarios" className="nav-link">Scenarios</Link>
                    </div>
                </div>
            </nav>

            <Suspense fallback={
                <div className="container py-8" style={{ maxWidth: '560px', margin: '0 auto' }}>
                    <div className="card">
                        <div className="skeleton skeleton-title" style={{ margin: '0 auto var(--space-8)', width: '60%' }} />
                        <div className="skeleton" style={{ height: '48px', marginBottom: 'var(--space-6)' }} />
                        <div className="skeleton" style={{ height: '48px', marginBottom: 'var(--space-6)' }} />
                        <div className="skeleton" style={{ height: '48px' }} />
                    </div>
                </div>
            }>
                <NewWorkspaceContent />
            </Suspense>
        </main>
    );
}
