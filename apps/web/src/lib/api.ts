/**
 * API client for AdSim Lab
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(
        path: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch(url, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || 'Request failed');
        }

        return res.json();
    }

    // Health
    async health() {
        return this.request<{ status: string; version: string }>('/health');
    }

    // Auth
    async mockLogin(email: string) {
        return this.request<{
            access_token: string;
            token_type: string;
            expires_in: number;
            user: { id: string; email: string; name: string };
        }>('/auth/mock-login', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }

    // Scenarios
    async listScenarios() {
        return this.request<{
            scenarios: Array<{
                slug: string;
                name: string;
                market: string;
                description: string;
            }>;
            count: number;
        }>('/scenarios');
    }

    async getScenario(slug: string) {
        return this.request<{
            slug: string;
            name: string;
            market: string;
            description: string;
            demand_config: Record<string, unknown>;
            ctr_cvr_config: Record<string, unknown>;
            cpc_anchors: Record<string, unknown>;
            tracking_loss_rate: number;
            fraud_rate: number;
            seasonality: Record<string, unknown>;
            event_shocks: Array<Record<string, unknown>>;
            competitor_mix: Record<string, number>;
        }>(`/scenarios/${slug}`);
    }

    // Sim Accounts
    async listAccounts() {
        return this.request<{ accounts: Array<{ id: string; name: string }> }>('/accounts');
    }

    async createAccount(data: { name: string; daily_budget: number }) {
        return this.request<{ id: string; name: string }>('/accounts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Runs
    async createRun(accountId: string, scenarioSlug: string, seed?: number) {
        return this.request<{ id: string; status: string }>(`/accounts/${accountId}/runs`, {
            method: 'POST',
            body: JSON.stringify({
                scenario_slug: scenarioSlug,
                seed: seed || Math.floor(Math.random() * 2147483647),
            }),
        });
    }

    async simulateDay(runId: string) {
        return this.request<{ status: string }>(`/runs/${runId}/simulate-day`, {
            method: 'POST',
        });
    }

    async getRunResults(runId: string) {
        return this.request<{
            run_id: string;
            status: string;
            current_day: number;
            daily_results: Array<{
                day: number;
                impressions: number;
                clicks: number;
                conversions: number;
                cost: number;
                revenue: number;
            }>;
        }>(`/runs/${runId}/results`);
    }
}

export const api = new ApiClient(API_BASE);

// Initialize token from localStorage if available
if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
        api.setToken(token);
    }
}
