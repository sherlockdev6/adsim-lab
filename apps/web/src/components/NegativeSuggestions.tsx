'use client';

import { useState } from 'react';
import { Lightbulb, Check, PartyPopper, BookOpen, Plus } from 'lucide-react';

interface NegativeSuggestion {
    keyword: string;
    match_type: 'phrase' | 'exact';
    reason: string;
    queries_blocked: number;
    estimated_savings: number;
}

interface NegativeSuggestionsProps {
    suggestions: NegativeSuggestion[];
    totalSavings: number;
    mode?: 'beginner' | 'advanced';
    onAddNegative?: (keyword: string, matchType: string) => void;
    onAddAll?: () => void;
}

export default function NegativeSuggestions({
    suggestions,
    totalSavings,
    mode = 'beginner',
    onAddNegative,
    onAddAll,
}: NegativeSuggestionsProps) {
    const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());
    const [showAllAdded, setShowAllAdded] = useState(false);

    const handleAddSingle = (keyword: string, matchType: string) => {
        setAddedKeywords(prev => new Set(Array.from(prev).concat(keyword)));
        onAddNegative?.(keyword, matchType);
    };

    const handleAddAll = () => {
        const allKeywords = new Set(suggestions.map(s => s.keyword));
        setAddedKeywords(allKeywords);
        setShowAllAdded(true);
        onAddAll?.();
    };

    const remainingSavings = suggestions
        .filter(s => !addedKeywords.has(s.keyword))
        .reduce((sum, s) => sum + s.estimated_savings, 0);

    return (
        <div
            className="card"
            style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02))',
                border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
            }}>
                <div>
                    <h3 style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)',
                    }}>
                        <Lightbulb size={18} style={{ color: 'var(--success)' }} /> This Could Have Been Avoided
                    </h3>
                    <p className="text-sm text-muted">
                        Add these negative keywords to save money
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--success)',
                    }}>
                        ${(totalSavings || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted">potential savings</div>
                </div>
            </div>

            {/* Suggestions List */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
            }}>
                {suggestions.slice(0, 5).map((suggestion) => {
                    const isAdded = addedKeywords.has(suggestion.keyword);

                    return (
                        <div
                            key={suggestion.keyword}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--space-3)',
                                background: isAdded ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface)',
                                border: `1px solid ${isAdded ? 'var(--success-500)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-md)',
                                transition: 'all var(--transition-fast)',
                                opacity: isAdded ? 0.7 : 1,
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '2px' }}>
                                    <code style={{
                                        background: 'var(--gray-700)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        color: isAdded ? 'var(--success)' : 'var(--primary)',
                                        fontSize: '0.875rem',
                                    }}>
                                        -{suggestion.keyword}
                                    </code>
                                    <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                                        {suggestion.match_type}
                                    </span>
                                </div>
                                <div className="text-xs text-muted">
                                    {mode === 'beginner'
                                        ? suggestion.reason
                                        : `Blocks ${suggestion.queries_blocked} queries • ${suggestion.reason}`
                                    }
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span className="font-semibold" style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                                    +${(suggestion.estimated_savings || 0).toFixed(2)}
                                </span>
                                <button
                                    className={`btn btn-sm ${isAdded ? 'btn-ghost' : 'btn-primary'}`}
                                    onClick={() => handleAddSingle(suggestion.keyword, suggestion.match_type)}
                                    disabled={isAdded}
                                    style={{ minWidth: '60px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {isAdded ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            {remainingSavings > 0 && !showAllAdded && (
                <div style={{
                    padding: 'var(--space-3)',
                    background: 'rgba(34, 197, 94, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    marginBottom: 'var(--space-4)',
                }}>
                    <p className="text-sm" style={{ marginBottom: 'var(--space-2)' }}>
                        <strong>${(remainingSavings || 0).toFixed(2)}</strong> still recoverable
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={handleAddAll}
                        style={{
                            background: 'linear-gradient(135deg, var(--success-500), var(--success-600, #16a34a))',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}
                    >
                        <Plus size={16} /> Add All as Negatives
                    </button>
                </div>
            )}

            {showAllAdded && (
                <div style={{
                    padding: 'var(--space-4)',
                    background: 'rgba(34, 197, 94, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                }}>
                    <div style={{ marginBottom: 'var(--space-2)', color: 'var(--success)' }}>
                        <PartyPopper size={32} />
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--success)', marginBottom: 'var(--space-1)' }}>
                        All negatives added!
                    </p>
                    <p className="text-xs text-muted">
                        These will take effect on your next simulation day
                    </p>
                </div>
            )}

            {/* Learn More */}
            <div style={{
                marginTop: 'var(--space-3)',
                paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border)',
                textAlign: 'center',
            }}>
                <button className="btn btn-ghost btn-sm text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <BookOpen size={14} /> Learn about negative keywords
                </button>
            </div>
        </div>
    );
}
