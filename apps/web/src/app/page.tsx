'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

interface Scenario {
    slug: string;
    name: string;
    market: string;
    description: string;
}

const scenarioIcons: Record<string, string> = {
    'uae-real-estate': '🏠',
    'uae-local-services': '🔧',
    'uae-ecommerce': '🛒',
};

const scenarioData: Record<string, { cpc: string; competition: string; difficulty: string }> = {
    'uae-real-estate': { cpc: '$5-15', competition: 'High', difficulty: 'Hard' },
    'uae-local-services': { cpc: '$1-5', competition: 'Medium', difficulty: 'Medium' },
    'uae-ecommerce': { cpc: '$0.3-2', competition: 'Low', difficulty: 'Easy' },
};

async function fetchScenarios(): Promise<{ scenarios: Scenario[] }> {
    const res = await fetch('/api/scenarios');
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
}

export default function HomePage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['scenarios'],
        queryFn: fetchScenarios,
    });

    return (
        <main className="min-h-screen">
            {/* Navigation */}
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/scenarios" className="nav-link">Scenarios</Link>
                        <Link href="/login" className="nav-link">Login</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero" style={{ paddingTop: '4rem', paddingBottom: '3rem' }}>
                <div className="container">
                    <h1 className="hero-title">
                        Master Google Ads<br />Without the Risk
                    </h1>
                    <p className="hero-subtitle">
                        Practice PPC advertising in realistic UAE market simulations.
                        Make mistakes, learn from data, and build expertise—without spending real money.
                    </p>
                    <div className="hero-actions">
                        <Link href="/scenarios" className="btn btn-primary btn-lg">
                            Start Simulation
                        </Link>
                        <Link href="/login" className="btn btn-secondary btn-lg">
                            View Demo
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section style={{ padding: 'var(--space-8) 0 var(--space-16)' }}>
                <div className="container">
                    <div className="grid grid-cols-3" style={{ marginBottom: 'var(--space-12)' }}>
                        <div className="text-center" style={{ padding: 'var(--space-6)' }}>
                            <div style={{
                                fontSize: '2.5rem',
                                marginBottom: 'var(--space-4)',
                                filter: 'grayscale(0.2)'
                            }}>🎯</div>
                            <h3 style={{ marginBottom: 'var(--space-2)' }}>Realistic Simulations</h3>
                            <p className="text-sm text-muted">
                                Authentic auction dynamics, quality scores, and competitor behavior
                            </p>
                        </div>
                        <div className="text-center" style={{ padding: 'var(--space-6)' }}>
                            <div style={{
                                fontSize: '2.5rem',
                                marginBottom: 'var(--space-4)',
                                filter: 'grayscale(0.2)'
                            }}>📊</div>
                            <h3 style={{ marginBottom: 'var(--space-2)' }}>Detailed Analytics</h3>
                            <p className="text-sm text-muted">
                                Track every metric, understand what drives performance
                            </p>
                        </div>
                        <div className="text-center" style={{ padding: 'var(--space-6)' }}>
                            <div style={{
                                fontSize: '2.5rem',
                                marginBottom: 'var(--space-4)',
                                filter: 'grayscale(0.2)'
                            }}>💡</div>
                            <h3 style={{ marginBottom: 'var(--space-2)' }}>Smart Coaching</h3>
                            <p className="text-sm text-muted">
                                Get personalized recommendations to improve your campaigns
                            </p>
                        </div>
                    </div>

                    {/* Scenarios Section */}
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: 'var(--space-2)' }}>
                            UAE Market Scenarios
                        </h2>
                        <p className="text-muted">
                            Choose a scenario that matches your learning goals
                        </p>
                    </div>

                    {isLoading && (
                        <div className="grid grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card">
                                    <div className="skeleton" style={{ width: '48px', height: '48px', marginBottom: 'var(--space-4)' }} />
                                    <div className="skeleton skeleton-title" />
                                    <div className="skeleton skeleton-text" />
                                    <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                            <p className="text-error">Failed to load scenarios. Make sure the API is running.</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => window.location.reload()}
                                style={{ marginTop: 'var(--space-4)' }}
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {data?.scenarios && (
                        <div className="grid grid-cols-3">
                            {data.scenarios.map((scenario) => {
                                const info = scenarioData[scenario.slug] || { cpc: 'N/A', competition: 'N/A', difficulty: 'N/A' };
                                return (
                                    <div key={scenario.slug} className="scenario-card">
                                        <div className="scenario-icon">
                                            {scenarioIcons[scenario.slug] || '📈'}
                                        </div>
                                        <h3 className="scenario-title">{scenario.name}</h3>
                                        <p className="scenario-description">{scenario.description}</p>
                                        <div className="scenario-stats">
                                            <div className="scenario-stat">
                                                <div className="scenario-stat-value">{info.cpc}</div>
                                                <div className="scenario-stat-label">Avg CPC</div>
                                            </div>
                                            <div className="scenario-stat">
                                                <div className="scenario-stat-value">{info.competition}</div>
                                                <div className="scenario-stat-label">Competition</div>
                                            </div>
                                            <div className="scenario-stat">
                                                <div className="scenario-stat-value">{info.difficulty}</div>
                                                <div className="scenario-stat-label">Difficulty</div>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/workspace/new?scenario=${scenario.slug}`}
                                            className="btn btn-primary w-full"
                                            style={{ marginTop: 'var(--space-5)' }}
                                        >
                                            Start Simulation →
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section style={{
                padding: 'var(--space-16) 0',
                background: 'linear-gradient(180deg, transparent, rgba(59, 130, 246, 0.05))',
                borderTop: '1px solid var(--border)'
            }}>
                <div className="container text-center">
                    <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-4)' }}>
                        Ready to Start Learning?
                    </h2>
                    <p className="text-muted" style={{ marginBottom: 'var(--space-6)', maxWidth: '500px', margin: '0 auto var(--space-6)' }}>
                        Join thousands of marketers who improved their PPC skills through simulation-based learning.
                    </p>
                    <Link href="/scenarios" className="btn btn-primary btn-lg">
                        Get Started — It's Free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer style={{
                padding: 'var(--space-8) 0',
                borderTop: '1px solid var(--border)',
                textAlign: 'center'
            }}>
                <div className="container">
                    <p className="text-xs text-muted">
                        © 2024 AdSim Lab. Built for learning, not for production advertising.
                    </p>
                </div>
            </footer>
        </main>
    );
}
