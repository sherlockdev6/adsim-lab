'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

interface Scenario {
    slug: string;
    name: string;
    market: string;
    description: string;
}

const scenarioDetails: Record<string, {
    icon: string;
    cpc: string;
    volume: string;
    difficulty: string;
    features: string[];
    color: string;
}> = {
    'uae-real-estate': {
        icon: '🏠',
        cpc: '$5 - $15',
        volume: '10K-50K/month',
        difficulty: 'Hard',
        features: ['High-value leads', 'Long decision cycle', 'Seasonal trends', 'Luxury segment'],
        color: '#3b82f6',
    },
    'uae-local-services': {
        icon: '🔧',
        cpc: '$1 - $5',
        volume: '5K-20K/month',
        difficulty: 'Medium',
        features: ['Quick conversions', 'Mobile-first', 'Location targeting', 'Repeat customers'],
        color: '#22c55e',
    },
    'uae-ecommerce': {
        icon: '🛒',
        cpc: '$0.30 - $2',
        volume: '50K-200K/month',
        difficulty: 'Easy',
        features: ['High volume', 'Peak seasons', 'Cart abandonment', 'Remarketing'],
        color: '#f59e0b',
    },
};

async function fetchScenarios(): Promise<{ scenarios: Scenario[] }> {
    const res = await fetch('/api/scenarios');
    if (!res.ok) throw new Error('Failed to fetch scenarios');
    return res.json();
}

export default function ScenariosPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['scenarios'],
        queryFn: fetchScenarios,
    });

    return (
        <main className="min-h-screen">
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/scenarios" className="nav-link active">Scenarios</Link>
                        <Link href="/login" className="nav-link">Login</Link>
                    </div>
                </div>
            </nav>

            <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
                {/* Header */}
                <div className="text-center" style={{ marginBottom: 'var(--space-12)' }}>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>Choose Your Scenario</h1>
                    <p className="text-muted" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        Select a UAE market scenario to begin your simulation. Each scenario has unique
                        challenges, competition levels, and learning opportunities.
                    </p>
                </div>

                {isLoading && (
                    <div className="grid grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card" style={{ padding: 'var(--space-8)' }}>
                                <div className="skeleton" style={{ width: '64px', height: '64px', marginBottom: 'var(--space-4)' }} />
                                <div className="skeleton skeleton-title" />
                                <div className="skeleton skeleton-text" />
                                <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <div className="empty-state-icon" style={{ margin: '0 auto var(--space-4)' }}>⚠️</div>
                        <h2 className="empty-state-title">Unable to Load Scenarios</h2>
                        <p className="empty-state-description">
                            Make sure the API is running at localhost:8000
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {data?.scenarios && (
                    <div className="grid grid-cols-3" style={{ gap: 'var(--space-8)' }}>
                        {data.scenarios.map((scenario) => {
                            const details = scenarioDetails[scenario.slug] || {
                                icon: '📈',
                                cpc: 'N/A',
                                volume: 'N/A',
                                difficulty: 'N/A',
                                features: [],
                                color: '#3b82f6',
                            };

                            return (
                                <div
                                    key={scenario.slug}
                                    className="card card-hover"
                                    style={{
                                        padding: 0,
                                        overflow: 'hidden',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Top Color Bar */}
                                    <div style={{
                                        height: '4px',
                                        background: `linear-gradient(90deg, ${details.color}, ${details.color}80)`,
                                    }} />

                                    <div style={{ padding: 'var(--space-6)' }}>
                                        {/* Icon & Title */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                            <div
                                                className="scenario-icon"
                                                style={{
                                                    background: `linear-gradient(135deg, ${details.color}20, ${details.color}40)`,
                                                    border: `1px solid ${details.color}40`,
                                                }}
                                            >
                                                {details.icon}
                                            </div>
                                            <div>
                                                <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-1)' }}>
                                                    {scenario.name}
                                                </h2>
                                                <span className={`badge ${details.difficulty === 'Easy' ? 'badge-success' :
                                                        details.difficulty === 'Medium' ? 'badge-warning' :
                                                            'badge-error'
                                                    }`}>
                                                    {details.difficulty}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-5)', lineHeight: 1.7 }}>
                                            {scenario.description}
                                        </p>

                                        {/* Stats */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 'var(--space-4)',
                                            marginBottom: 'var(--space-5)',
                                            padding: 'var(--space-4)',
                                            background: 'var(--gray-800)',
                                            borderRadius: 'var(--radius-lg)',
                                        }}>
                                            <div>
                                                <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>Avg CPC</div>
                                                <div className="font-semibold">{details.cpc}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted" style={{ marginBottom: '2px' }}>Search Volume</div>
                                                <div className="font-semibold">{details.volume}</div>
                                            </div>
                                        </div>

                                        {/* Features */}
                                        <div style={{ marginBottom: 'var(--space-5)' }}>
                                            <div className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)' }}>What you'll learn</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                                {details.features.map((feature, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="badge badge-neutral"
                                                        style={{ fontSize: '0.7rem' }}
                                                    >
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* CTA */}
                                        <Link
                                            href={`/workspace/new?scenario=${scenario.slug}`}
                                            className="btn btn-primary w-full"
                                        >
                                            Start Simulation →
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Bottom Info */}
                <div style={{
                    marginTop: 'var(--space-16)',
                    textAlign: 'center',
                    padding: 'var(--space-8)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--border)',
                }}>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>🎓 New to Google Ads?</h3>
                    <p className="text-muted text-sm" style={{ maxWidth: '500px', margin: '0 auto var(--space-4)' }}>
                        Start with the Ecommerce scenario. It has lower competition, faster feedback loops,
                        and is perfect for learning the basics before moving to more challenging markets.
                    </p>
                    <Link
                        href="/workspace/new?scenario=uae-ecommerce"
                        className="btn btn-secondary"
                    >
                        Start with Ecommerce (Recommended for Beginners)
                    </Link>
                </div>
            </div>
        </main>
    );
}
