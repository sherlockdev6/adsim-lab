'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, Suspense } from 'react';

interface AdGroup {
    id: string;
    name: string;
    default_bid: number;
}

interface Keyword {
    id: string;
    text: string;
    match_type: string;
}

interface Ad {
    id: string;
    headline1: string;
    headline2: string;
    description1: string;
}

function CampaignBuilderContent() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const campaignId = params.campaignId as string;
    const accountId = searchParams.get('account');

    const [step, setStep] = useState(1);
    const [adGroupName, setAdGroupName] = useState('');
    const [defaultBid, setDefaultBid] = useState(2.0);
    const [keywords, setKeywords] = useState('');
    const [matchType, setMatchType] = useState('broad');
    const [headline1, setHeadline1] = useState('');
    const [headline2, setHeadline2] = useState('');
    const [description1, setDescription1] = useState('');

    const [createdAdGroupId, setCreatedAdGroupId] = useState<string | null>(null);

    // Fetch campaign details
    const { data: campaign } = useQuery({
        queryKey: ['campaign', campaignId],
        queryFn: async () => {
            const res = await fetch(`/api/campaigns/${campaignId}`);
            if (!res.ok) throw new Error('Failed to fetch campaign');
            return res.json();
        },
        enabled: !!campaignId,
    });

    // Fetch existing ad groups
    const { data: adGroups } = useQuery({
        queryKey: ['adGroups', campaignId],
        queryFn: async () => {
            const res = await fetch(`/api/campaigns/${campaignId}/ad-groups`);
            if (!res.ok) throw new Error('Failed to fetch ad groups');
            return res.json();
        },
        enabled: !!campaignId,
    });

    // Create ad group
    const createAdGroupMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/campaigns/${campaignId}/ad-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: adGroupName,
                    default_bid: defaultBid,
                    status: 'active',
                }),
            });
            if (!res.ok) throw new Error('Failed to create ad group');
            return res.json();
        },
        onSuccess: (data) => {
            setCreatedAdGroupId(data.id);
            queryClient.invalidateQueries({ queryKey: ['adGroups', campaignId] });
            setStep(2);
        },
    });

    // Create keywords
    const createKeywordsMutation = useMutation({
        mutationFn: async () => {
            const keywordLines = keywords.split('\n').filter(k => k.trim());
            const results = [];

            for (const kw of keywordLines) {
                const res = await fetch(`/api/ad-groups/${createdAdGroupId}/keywords`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: kw.trim(),
                        match_type: matchType,
                        is_negative: false,
                    }),
                });
                if (res.ok) {
                    results.push(await res.json());
                }
            }
            return results;
        },
        onSuccess: () => {
            setStep(3);
        },
    });

    // Create ad
    const createAdMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/ad-groups/${createdAdGroupId}/ads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headline1,
                    headline2,
                    description1,
                }),
            });
            if (!res.ok) throw new Error('Failed to create ad');
            return res.json();
        },
        onSuccess: () => {
            setStep(4);
        },
    });

    const handleFinish = () => {
        if (accountId) {
            router.push(`/workspace?account=${accountId}`);
        } else {
            router.push('/scenarios');
        }
    };

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '700px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Campaign Builder
            </h1>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem' }}>
                {campaign?.name || 'Loading...'}
            </p>

            {/* Progress Steps */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        style={{
                            flex: 1,
                            height: '4px',
                            borderRadius: '2px',
                            background: s <= step ? 'var(--primary)' : 'var(--border)',
                        }}
                    />
                ))}
            </div>

            {/* Step 1: Create Ad Group */}
            {step === 1 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Step 1: Create Ad Group
                    </h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        Ad groups contain your keywords and ads. Start by naming your first ad group.
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Ad Group Name</label>
                        <input
                            type="text"
                            className="input"
                            value={adGroupName}
                            onChange={(e) => setAdGroupName(e.target.value)}
                            placeholder="e.g., Dubai Villas - High Intent"
                        />
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Default Bid ($)</label>
                        <input
                            type="number"
                            className="input"
                            value={defaultBid}
                            onChange={(e) => setDefaultBid(Number(e.target.value))}
                            min={0.01}
                            max={500}
                            step={0.1}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => createAdGroupMutation.mutate()}
                        disabled={!adGroupName || createAdGroupMutation.isPending}
                    >
                        {createAdGroupMutation.isPending ? 'Creating...' : 'Continue'}
                    </button>
                </div>
            )}

            {/* Step 2: Add Keywords */}
            {step === 2 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Step 2: Add Keywords
                    </h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        Enter keywords that should trigger your ads. One keyword per line.
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Match Type</label>
                        <select
                            className="input"
                            value={matchType}
                            onChange={(e) => setMatchType(e.target.value)}
                        >
                            <option value="broad">Broad Match</option>
                            <option value="phrase">Phrase Match</option>
                            <option value="exact">Exact Match</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Keywords (one per line)</label>
                        <textarea
                            className="input"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            placeholder="buy villa dubai&#10;dubai property for sale&#10;luxury apartment dubai"
                            rows={6}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(1)}>
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => createKeywordsMutation.mutate()}
                            disabled={!keywords.trim() || createKeywordsMutation.isPending}
                        >
                            {createKeywordsMutation.isPending ? 'Adding...' : 'Continue'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Create Ad */}
            {step === 3 && (
                <div className="card">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Step 3: Create Ad
                    </h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        Write compelling ad copy. Headlines should be under 30 characters.
                    </p>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Headline 1 (required, max 30 chars)</label>
                        <input
                            type="text"
                            className="input"
                            value={headline1}
                            onChange={(e) => setHeadline1(e.target.value.slice(0, 30))}
                            placeholder="Premium Dubai Villas"
                            maxLength={30}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{headline1.length}/30</span>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label className="label">Headline 2 (optional, max 30 chars)</label>
                        <input
                            type="text"
                            className="input"
                            value={headline2}
                            onChange={(e) => setHeadline2(e.target.value.slice(0, 30))}
                            placeholder="Starting From $500K"
                            maxLength={30}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{headline2.length}/30</span>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label className="label">Description (required, max 90 chars)</label>
                        <textarea
                            className="input"
                            value={description1}
                            onChange={(e) => setDescription1(e.target.value.slice(0, 90))}
                            placeholder="Find your dream villa in Dubai. Premium locations, expert agents. Call now!"
                            rows={2}
                            maxLength={90}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{description1.length}/90</span>
                    </div>

                    {/* Ad Preview */}
                    <div style={{
                        background: 'var(--background)',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        border: '1px solid var(--border)',
                    }}>
                        <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>Ad Preview</p>
                        <p style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 500 }}>
                            {headline1 || 'Headline 1'} | {headline2 || 'Headline 2'}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                            {description1 || 'Your description will appear here...'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={() => setStep(2)}>
                            Back
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={() => createAdMutation.mutate()}
                            disabled={!headline1 || !description1 || createAdMutation.isPending}
                        >
                            {createAdMutation.isPending ? 'Creating...' : 'Create Ad'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 4 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        Campaign Ready!
                    </h2>
                    <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                        Your ad group, keywords, and ad have been created. You're ready to run a simulation!
                    </p>
                    <button className="btn btn-primary" onClick={handleFinish}>
                        Go to Workspace
                    </button>
                </div>
            )}

            {/* Existing Ad Groups */}
            {adGroups?.ad_groups && adGroups.ad_groups.length > 0 && step === 1 && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                        Existing Ad Groups
                    </h3>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Default Bid</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adGroups.ad_groups.map((ag: AdGroup) => (
                                <tr key={ag.id}>
                                    <td>{ag.name}</td>
                                    <td>${ag.default_bid}</td>
                                    <td><span className="badge badge-success">active</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function CampaignBuilderPage() {
    return (
        <main>
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/workspace" className="nav-link">Workspace</Link>
                    </div>
                </div>
            </nav>

            <Suspense fallback={<div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}><p>Loading...</p></div>}>
                <CampaignBuilderContent />
            </Suspense>
        </main>
    );
}
