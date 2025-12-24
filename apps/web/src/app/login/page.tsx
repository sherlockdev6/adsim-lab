'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-focus email input
    useEffect(() => {
        const input = document.getElementById('email');
        if (input) input.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }

        if (!email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/auth/mock-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) throw new Error('Login failed');

            const data = await res.json();
            // Store token (in real app, use secure storage)
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/scenarios');
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen" style={{ display: 'flex', flexDirection: 'column' }}>
            <nav className="nav">
                <div className="container nav-content">
                    <Link href="/" className="nav-logo">AdSim Lab</Link>
                    <div className="nav-links">
                        <Link href="/scenarios" className="nav-link">Scenarios</Link>
                    </div>
                </div>
            </nav>

            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-6)',
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <div className="card" style={{ padding: 'var(--space-8)' }}>
                        {/* Header */}
                        <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                margin: '0 auto var(--space-4)',
                                background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                                borderRadius: 'var(--radius-xl)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.75rem',
                            }}>
                                🎯
                            </div>
                            <h1 style={{ marginBottom: 'var(--space-2)' }}>Welcome Back</h1>
                            <p className="text-muted">Sign in to your simulation account</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="email" className="label">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    className={`input ${error ? 'input-error' : ''}`}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (error) setError('');
                                    }}
                                    placeholder="you@example.com"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSubmit(e);
                                    }}
                                />
                                {error && (
                                    <p className="error-message">
                                        <span>⚠</span> {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-full"
                                disabled={isLoading}
                                style={{ marginBottom: 'var(--space-4)' }}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner spinner-sm" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <p className="text-center text-xs text-muted">
                                By continuing, you agree to our Terms of Service
                            </p>
                        </form>
                    </div>

                    {/* Demo Notice */}
                    <div style={{
                        marginTop: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'center',
                    }}>
                        <p className="text-sm text-muted">
                            <strong className="text-primary">Demo Mode:</strong> Any valid email works.
                            No password required.
                        </p>
                    </div>

                    {/* Alternative Actions */}
                    <div className="text-center" style={{ marginTop: 'var(--space-6)' }}>
                        <p className="text-sm text-muted">
                            Don't have an account?{' '}
                            <Link href="/scenarios" className="text-primary font-medium">
                                Start Free →
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
