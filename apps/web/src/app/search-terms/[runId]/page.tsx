'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useMemo } from 'react';

interface SearchTerm {
    id: string;
    query_text: string;
    match_type: 'exact' | 'phrase' | 'broad';
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    cvr: number;
}

// Generate mock search terms with realistic data
function generateMockSearchTerms(runId: string): SearchTerm[] {
    const seed = parseInt(runId.replace(/-/g, '').slice(0, 8), 16) || 12345;
    const rng = (n: number) => ((seed * n * 9301 + 49297) % 233280) / 233280;

    const queryTemplates = [
        'buy {type} in {location}',
        '{type} for sale {location}',
        '{location} {type} price',
        'luxury {type} {location}',
        'cheap {type} near me',
        '{type} investment opportunities',
        'rent {type} {location}',
        'new {type} projects {location}',
        'best {type} deals {location}',
        '{type} {location} 2024',
        'affordable {type} {location}',
        '{type} agent {location}',
        'how to buy {type}',
        '{type} mortgage rates',
        '{type} down payment',
    ];

    const types = ['villa', 'apartment', 'townhouse', 'penthouse', 'studio', 'property', 'home', 'flat'];
    const locations = ['dubai', 'dubai marina', 'downtown dubai', 'palm jumeirah', 'abu dhabi', 'jbr', 'business bay'];

    const terms: SearchTerm[] = [];

    for (let i = 0; i < 50; i++) {
        const template = queryTemplates[Math.floor(rng(i + 1) * queryTemplates.length)];
        const type = types[Math.floor(rng(i + 2) * types.length)];
        const location = locations[Math.floor(rng(i + 3) * locations.length)];

        const query = template
            .replace('{type}', type)
            .replace('{location}', location);

        const impr = Math.floor(50 + rng(i + 4) * 500);
        const ctr = 0.02 + rng(i + 5) * 0.08;
        const clicks = Math.floor(impr * ctr);
        const cvr = clicks > 0 ? (0.03 + rng(i + 6) * 0.12) : 0;
        const convs = Math.floor(clicks * cvr);
        const cpc = 3 + rng(i + 7) * 12;
        const cost = clicks * cpc;

        terms.push({
            id: `term_${i}`,
            query_text: query,
            match_type: ['exact', 'phrase', 'broad', 'broad', 'broad'][Math.floor(rng(i + 8) * 5)] as SearchTerm['match_type'],
            impressions: impr,
            clicks,
            conversions: convs,
            cost: Math.round(cost * 100) / 100,
            ctr: Math.round(ctr * 10000) / 10000,
            cvr: Math.round(cvr * 10000) / 10000,
        });
    }

    return terms.sort((a, b) => b.impressions - a.impressions);
}

export default function SearchTermsPage() {
    const params = useParams();
    const runId = params.runId as string;

    const [matchFilter, setMatchFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'impressions' | 'clicks' | 'conversions' | 'cost'>('impressions');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const allTerms = useMemo(() => generateMockSearchTerms(runId), [runId]);

    const filteredTerms = useMemo(() => {
        let terms = [...allTerms];

        if (matchFilter !== 'all') {
            terms = terms.filter(t => t.match_type === matchFilter);
        }

        terms.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return terms;
    }, [allTerms, matchFilter, sortBy, sortDir]);

    const totals = useMemo(() => {
        return filteredTerms.reduce(
            (acc, t) => ({
                impressions: acc.impressions + t.impressions,
                clicks: acc.clicks + t.clicks,
                conversions: acc.conversions + t.conversions,
                cost: acc.cost + t.cost,
            }),
            { impressions: 0, clicks: 0, conversions: 0, cost: 0 }
        );
    }, [filteredTerms]);

    const handleSort = (column: typeof sortBy) => {
        if (sortBy === column) {
            setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(column);
            setSortDir('desc');
        }
    };

    const SortIcon = ({ column }: { column: typeof sortBy }) => (
        <span style={{ marginLeft: '4px', opacity: sortBy === column ? 1 : 0.3 }}>
            {sortBy === column ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
        </span>
    );

    return (
        <main className="min-h-screen">
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href={`/results/${runId}`} className="nav-link">← Back to Results</Link>
                    </div>
                </div>
            </nav>

            <div className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-12)' }}>
                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    <Link href="/">Home</Link>
                    <span>/</span>
                    <Link href={`/results/${runId}`}>Results</Link>
                    <span>/</span>
                    <span>Search Terms</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-1)' }}>Search Terms Report</h1>
                        <p className="text-muted text-sm">Queries that triggered your ads</p>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-4" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="metric-card">
                        <div className="metric-value">{totals.impressions.toLocaleString()}</div>
                        <div className="metric-label">Total Impressions</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-value">{totals.clicks.toLocaleString()}</div>
                        <div className="metric-label">Total Clicks</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-value">{totals.conversions}</div>
                        <div className="metric-label">Conversions</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-value">${(totals.cost || 0).toFixed(0)}</div>
                        <div className="metric-label">Total Cost</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted">Match Type:</span>
                            <div className="btn-group">
                                {['all', 'exact', 'phrase', 'broad'].map((type) => (
                                    <button
                                        key={type}
                                        className={`btn btn-sm ${matchFilter === type ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setMatchFilter(type)}
                                    >
                                        {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                                        {type !== 'all' && (
                                            <span className="text-xs" style={{ marginLeft: '4px', opacity: 0.7 }}>
                                                ({allTerms.filter(t => t.match_type === type).length})
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="text-sm text-muted">
                            Showing {filteredTerms.length} of {allTerms.length} terms
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Search Term</th>
                                    <th>Match Type</th>
                                    <th
                                        onClick={() => handleSort('impressions')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Impr. <SortIcon column="impressions" />
                                    </th>
                                    <th
                                        onClick={() => handleSort('clicks')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Clicks <SortIcon column="clicks" />
                                    </th>
                                    <th>CTR</th>
                                    <th
                                        onClick={() => handleSort('conversions')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Conv. <SortIcon column="conversions" />
                                    </th>
                                    <th
                                        onClick={() => handleSort('cost')}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        Cost <SortIcon column="cost" />
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTerms.map((term) => (
                                    <tr key={term.id}>
                                        <td>
                                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {term.query_text}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${term.match_type === 'exact' ? 'badge-success' :
                                                term.match_type === 'phrase' ? 'badge-info' :
                                                    'badge-neutral'
                                                }`}>
                                                {term.match_type}
                                            </span>
                                        </td>
                                        <td>{term.impressions.toLocaleString()}</td>
                                        <td>{term.clicks.toLocaleString()}</td>
                                        <td>
                                            <span className={term.ctr >= 0.04 ? 'text-success' : ''}>
                                                {((term.ctr || 0) * 100).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td>{term.conversions}</td>
                                        <td>${(term.cost || 0).toFixed(2)}</td>
                                        <td>
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    title="Add as keyword"
                                                    onClick={() => alert(`Add "${term.query_text}" as keyword`)}
                                                >
                                                    ➕
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    title="Add as negative"
                                                    onClick={() => alert(`Add "${term.query_text}" as negative`)}
                                                >
                                                    ➖
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div style={{
                    marginTop: 'var(--space-6)',
                    padding: 'var(--space-4)',
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: 'var(--radius-lg)',
                }}>
                    <p className="text-sm text-muted">
                        <strong className="text-primary">💡 Tip:</strong> Look for high-impression,
                        low-CTR queries — they may be irrelevant and worth adding as negative keywords.
                        High-converting queries should be added as exact match keywords for better control.
                    </p>
                </div>
            </div>
        </main>
    );
}
