/**
 * Catch-all API route for Vercel deployment
 * Replicates mock-api.js functionality for serverless environment
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// In serverless, we use a simple in-memory store per request
// For a real app, you'd use a database
let scenarios: any[] = [];
let accounts: any[] = [];
let campaigns: any[] = [];
let runs: any[] = [];
let dailyResults: any[] = [];

// Try to load scenarios from seed files
function loadScenarios() {
    if (scenarios.length > 0) return scenarios;

    try {
        const seedDir = path.join(process.cwd(), '..', 'api', 'seed');
        const files = ['uae_real_estate.json', 'uae_local_services.json', 'uae_ecommerce.json'];

        for (const file of files) {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'));
                scenarios.push(data);
            } catch (e) {
                // If seed files don't exist, use hardcoded scenarios
            }
        }
    } catch (e) {
        // Fallback to default scenarios
    }

    // Fallback scenarios if files don't exist
    if (scenarios.length === 0) {
        scenarios = [
            {
                slug: 'uae-local-services',
                name: 'UAE Local Services Leads',
                market: 'UAE',
                description: 'Generate leads for a local plumbing/AC repair business in Dubai',
                config: {
                    daily_budget: 100,
                    duration_days: 7,
                    cpc_base: 2.5,
                    cvr_base: 0.03,
                }
            },
            {
                slug: 'uae-real-estate',
                name: 'UAE Real Estate',
                market: 'UAE',
                description: 'Luxury property listings in Dubai Marina',
                config: {
                    daily_budget: 200,
                    duration_days: 14,
                    cpc_base: 5.0,
                    cvr_base: 0.02,
                }
            },
            {
                slug: 'uae-ecommerce',
                name: 'UAE E-commerce Fashion',
                market: 'UAE',
                description: 'Online fashion store targeting UAE customers',
                config: {
                    daily_budget: 150,
                    duration_days: 10,
                    cpc_base: 1.5,
                    cvr_base: 0.04,
                }
            }
        ];
    }

    return scenarios;
}

// UUID generator
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Session storage using global variable (persists across requests in same instance)
declare global {
    var __apiStorage: {
        accounts: any[];
        campaigns: any[];
        runs: any[];
        dailyResults: any[];
    } | undefined;
}

function getStorage() {
    if (!global.__apiStorage) {
        global.__apiStorage = {
            accounts: [],
            campaigns: [],
            runs: [],
            dailyResults: []
        };
    }
    return global.__apiStorage;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const pathSegments = params.path;
    const fullPath = '/' + pathSegments.join('/');
    const storage = getStorage();

    // Health check
    if (fullPath === '/health') {
        return NextResponse.json({
            status: 'healthy',
            service: 'adsim-api-vercel',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
        });
    }

    // Scenarios list
    if (fullPath === '/scenarios') {
        const scens = loadScenarios();
        return NextResponse.json({
            scenarios: scens.map(s => ({
                slug: s.slug,
                name: s.name,
                market: s.market,
                description: s.description,
            })),
            count: scens.length,
        });
    }

    // Single scenario
    const scenarioMatch = fullPath.match(/^\/scenarios\/([^/]+)$/);
    if (scenarioMatch) {
        const slug = scenarioMatch[1];
        const scens = loadScenarios();
        const scenario = scens.find(s => s.slug === slug);
        if (!scenario) {
            return NextResponse.json({ detail: 'Scenario not found' }, { status: 404 });
        }
        return NextResponse.json(scenario);
    }

    // Accounts list
    if (fullPath === '/accounts') {
        return NextResponse.json({
            accounts: storage.accounts,
            count: storage.accounts.length,
        });
    }

    // Single account - auto-create if not found (serverless workaround)
    const accountMatch = fullPath.match(/^\/accounts\/([^/]+)$/);
    if (accountMatch) {
        const id = accountMatch[1];
        let account = storage.accounts.find(a => a.id === id);
        if (!account) {
            // Auto-create account to handle serverless cold starts
            account = {
                id,
                name: 'Restored Account',
                daily_budget: 100,
                currency: 'USD',
                created_at: new Date().toISOString(),
            };
            storage.accounts.push(account);
        }
        return NextResponse.json(account);
    }

    // Account campaigns
    const campaignsMatch = fullPath.match(/^\/accounts\/([^/]+)\/campaigns$/);
    if (campaignsMatch) {
        const accountId = campaignsMatch[1];
        const accountCampaigns = storage.campaigns.filter(c => c.account_id === accountId);
        return NextResponse.json({
            campaigns: accountCampaigns,
            count: accountCampaigns.length,
        });
    }

    // Account runs (direct - without campaign)
    const accountRunsMatch = fullPath.match(/^\/accounts\/([^/]+)\/runs$/);
    if (accountRunsMatch) {
        const accountId = accountRunsMatch[1];
        const accountRuns = storage.runs.filter(r => r.account_id === accountId);
        return NextResponse.json({
            runs: accountRuns,
            count: accountRuns.length,
        });
    }

    // Campaign runs (with campaign)
    const runsMatch = fullPath.match(/^\/accounts\/([^/]+)\/campaigns\/([^/]+)\/runs$/);
    if (runsMatch) {
        const campaignId = runsMatch[2];
        const campaignRuns = storage.runs.filter(r => r.campaign_id === campaignId);
        return NextResponse.json({
            runs: campaignRuns,
            count: campaignRuns.length,
        });
    }

    // Run results
    const resultsMatch = fullPath.match(/^\/runs\/([^/]+)\/results$/);
    if (resultsMatch) {
        const runId = resultsMatch[1];
        let run = storage.runs.find(r => r.id === runId);
        if (!run) {
            // Auto-create run for serverless cold starts
            run = {
                id: runId,
                account_id: 'restored',
                status: 'pending',
                current_day: 0,
                duration_days: 30,
                rng_seed: Math.floor(Math.random() * 100000),
                created_at: new Date().toISOString(),
            };
            storage.runs.push(run);
        }

        const runResults = storage.dailyResults
            .filter(r => r.run_id === runId)
            .sort((a, b) => a.day_number - b.day_number);

        let totals = null;
        if (runResults.length > 0) {
            totals = {
                day_number: 0,
                impressions: runResults.reduce((s, r) => s + r.impressions, 0),
                clicks: runResults.reduce((s, r) => s + r.clicks, 0),
                conversions: runResults.reduce((s, r) => s + r.conversions, 0),
                cost: runResults.reduce((s, r) => s + r.cost, 0),
                revenue: runResults.reduce((s, r) => s + r.revenue, 0),
                avg_position: runResults.reduce((s, r) => s + r.avg_position, 0) / runResults.length,
                avg_quality_score: runResults.reduce((s, r) => s + r.avg_quality_score, 0) / runResults.length,
                impression_share: runResults.reduce((s, r) => s + r.impression_share, 0) / runResults.length,
                lost_is_budget: runResults.reduce((s, r) => s + r.lost_is_budget, 0) / runResults.length,
                lost_is_rank: runResults.reduce((s, r) => s + r.lost_is_rank, 0) / runResults.length,
                ctr: 0, cvr: 0, cpc: 0, cpa: 0, roas: 0
            };
            totals.ctr = totals.clicks / totals.impressions;
            totals.cvr = totals.conversions / totals.clicks;
            totals.cpc = totals.cost / totals.clicks;
            totals.cpa = totals.cost / totals.conversions;
            totals.roas = totals.revenue / totals.cost;
        }

        return NextResponse.json({
            run_id: runId,
            status: run.status,
            current_day: run.current_day,
            duration_days: run.duration_days,
            daily_results: runResults.map(r => ({
                ...r,
                ctr: r.clicks / r.impressions,
                cvr: r.conversions / r.clicks,
                cpc: r.cost / r.clicks,
                cpa: r.cost / r.conversions,
                roas: r.revenue / r.cost,
            })),
            totals,
        });
    }

    // Causal analysis
    const causalMatch = fullPath.match(/^\/runs\/([^/]+)\/days\/(\d+)\/causal-analysis$/);
    if (causalMatch) {
        const runId = causalMatch[1];
        const dayNumber = parseInt(causalMatch[2]);
        const run = storage.runs.find(r => r.id === runId);

        if (!run) {
            return NextResponse.json({ detail: 'Run not found' }, { status: 404 });
        }

        const runResults = storage.dailyResults.filter(r => r.run_id === runId);
        const current = runResults.find(r => r.day_number === dayNumber);
        const previous = runResults.find(r => r.day_number === dayNumber - 1);

        if (!current) {
            return NextResponse.json({ detail: 'Day not found' }, { status: 404 });
        }

        // Generate causal analysis data
        const rng = (run.rng_seed || 12345) + dayNumber;
        const rand = (n: number) => ((rng * n * 9301 + 49297) % 233280) / 233280;

        // Intent Mix Shift
        const baseHighIntent = 45;
        const baseLowIntent = 20;
        let intentShiftFactor = 0;
        if (dayNumber <= 3) {
            intentShiftFactor = dayNumber * 8;
        } else {
            intentShiftFactor = Math.max(0, 24 - (dayNumber - 3) * 6);
        }

        const highIntentPercent = Math.max(15, baseHighIntent - intentShiftFactor + Math.round(rand(100) * 5));
        const lowIntentPercent = Math.min(50, baseLowIntent + intentShiftFactor + Math.round(rand(101) * 5));
        const medIntentPercent = 100 - highIntentPercent - lowIntentPercent;

        const prevHighIntent = previous ? baseHighIntent - (dayNumber - 1) * (dayNumber <= 3 ? 8 : -4) : highIntentPercent;
        const prevLowIntent = previous ? baseLowIntent + (dayNumber - 1) * (dayNumber <= 3 ? 8 : -4) : lowIntentPercent;

        const intentMixShift = {
            high_intent_percent: highIntentPercent,
            medium_intent_percent: medIntentPercent,
            low_intent_percent: lowIntentPercent,
            previous: previous ? {
                high_intent_percent: Math.round(prevHighIntent),
                medium_intent_percent: Math.round(100 - prevHighIntent - prevLowIntent),
                low_intent_percent: Math.round(prevLowIntent),
            } : null,
            shift_direction: lowIntentPercent > prevLowIntent + 5 ? 'toward_low' :
                highIntentPercent > prevHighIntent + 5 ? 'toward_high' : 'stable',
            shift_magnitude: Math.abs(lowIntentPercent - prevLowIntent),
            is_significant: Math.abs(lowIntentPercent - prevLowIntent) > 10,
            explanation_beginner: lowIntentPercent > 30
                ? `Traffic quality shifted toward lower intent queries (+${Math.round(lowIntentPercent - prevLowIntent)}%). This means more clicks but fewer conversions.`
                : highIntentPercent > prevHighIntent
                    ? 'Traffic quality improved — more serious buyers are clicking.'
                    : 'Traffic quality is stable.',
            explanation_advanced: `Intent distribution shifted: High ${Math.round(prevHighIntent)}%→${highIntentPercent}%, Low ${Math.round(prevLowIntent)}%→${lowIntentPercent}%.`,
        };

        // Metrics calculations
        const currCtr = current.clicks / current.impressions;
        const currCvr = current.conversions / current.clicks;
        const currCpc = current.cost / current.clicks;
        const currCpa = current.cost / Math.max(1, current.conversions);

        const prevCtr = previous ? previous.clicks / previous.impressions : currCtr;
        const prevCvr = previous ? previous.conversions / previous.clicks : currCvr;
        const prevCpc = previous ? previous.cost / previous.clicks : currCpc;

        const ctrChange = (currCtr - prevCtr) / prevCtr;
        const cvrChange = (currCvr - prevCvr) / prevCvr;

        const conflictingSignals: any[] = [];
        if (ctrChange > 0.05 && cvrChange < -0.03) {
            conflictingSignals.push({
                id: 'ctr_up_cvr_down',
                signal_a: { metric: 'CTR', direction: 'up', change: Math.round(ctrChange * 100) },
                signal_b: { metric: 'CVR', direction: 'down', change: Math.round(cvrChange * 100) },
                explanation_beginner: 'More people are clicking, but fewer are converting.',
                explanation_advanced: `CTR increased ${Math.round(ctrChange * 100)}% while CVR declined ${Math.abs(Math.round(cvrChange * 100))}%.`,
                likely_cause: 'intent_mix_shift',
            });
        }

        // Crisis/Recovery detection
        const isCrisisDay = dayNumber === 3 && lowIntentPercent > 35;
        const isRecoveryDay = dayNumber >= 4 && lowIntentPercent < 30;

        const learningFlowState = {
            is_crisis_day: isCrisisDay,
            is_recovery_day: isRecoveryDay,
            crisis_message_beginner: isCrisisDay ? {
                title: 'High Waste Detected',
                severity: 'critical',
                summary: 'Your broad match keywords are showing ads to people searching for informational queries.',
                action: 'Add negative keywords to block irrelevant traffic.',
                suggested_negatives: ['free', 'jobs', 'salary', 'what is'],
            } : null,
            crisis_message_advanced: isCrisisDay ? {
                title: 'High Waste Detected',
                severity: 'critical',
                waste_percent: lowIntentPercent,
                summary: `${lowIntentPercent}% of spend on low-intent traffic.`,
                root_cause_chain: [
                    { cause: 'Broad match expanded to informational queries', contribution: 45 },
                    { cause: 'Low-intent users clicked but didn\'t convert', contribution: 30 },
                    { cause: 'Quality Score erosion from poor CTR', contribution: 15 },
                    { cause: 'CPC increased due to lower Quality Score', contribution: 10 },
                ],
                tradeoff: 'Adding negatives will reduce volume 25-35% but improve CVR 40-60%.',
                expected_outcome: 'CPA $22-26 (vs current estimate)',
            } : null,
            recovery_message: isRecoveryDay ? {
                title: 'You traded volume for quality. This is expected.',
                summary: 'Same conversions, much lower cost.',
                metrics_comparison: {
                    before: { impressions: 3000, conversions: 4, cpa: 38 },
                    after: { impressions: 1800, conversions: 4, cpa: 24 },
                },
            } : null,
        };

        // Build metric changes - using arrow function to avoid ES5 strict mode error
        const buildMetricChange = (prevVal: number, currVal: number, metricName: string) => {
            const prev = prevVal || currVal;
            const changePercent = prev === 0 ? 0 : ((currVal - prev) / prev) * 100;
            const direction = Math.abs(changePercent) < 1 ? 'flat' : (changePercent > 0 ? 'up' : 'down');

            return {
                previous: Math.round(prev * 10000) / 10000,
                current: Math.round(currVal * 10000) / 10000,
                change_percent: Math.round(changePercent * 100) / 100,
                direction,
                drivers: [
                    {
                        id: 'competitor_bid_increase',
                        cause: 'competitor_bid_increase',
                        label: 'Competitor Bid Increase',
                        impact_percent: 45,
                        explanation: 'A competitor raised their bids.',
                        explanation_advanced: 'Competitor increased max CPC by 35%.',
                        segment_evidence: []
                    },
                    {
                        id: 'quality_score_decrease',
                        cause: 'quality_score_decrease',
                        label: 'Quality Score Dropped',
                        impact_percent: 35,
                        explanation: 'Your Quality Score decreased.',
                        explanation_advanced: 'Avg QS dropped from 7.2 to 5.8.',
                        segment_evidence: []
                    }
                ]
            };
        };

        return NextResponse.json({
            run_id: runId,
            day_number: dayNumber,
            previous_day: previous ? dayNumber - 1 : null,
            is_first_day: !previous,
            intent_mix_shift: intentMixShift,
            conflicting_signals: conflictingSignals,
            has_conflicting_signals: conflictingSignals.length > 0,
            learning_flow: learningFlowState,
            metrics: {
                cpc: buildMetricChange(prevCpc, currCpc, 'cpc'),
                ctr: buildMetricChange(prevCtr, currCtr, 'ctr'),
                cvr: buildMetricChange(prevCvr, currCvr, 'cvr'),
                conversions: buildMetricChange(
                    previous ? previous.conversions : current.conversions,
                    current.conversions,
                    'conversions'
                ),
                impression_share: buildMetricChange(
                    previous ? previous.impression_share : current.impression_share,
                    current.impression_share,
                    'impression_share'
                ),
            },
        });
    }

    // Search terms analysis
    const searchTermsMatch = fullPath.match(/^\/runs\/([^/]+)\/search-terms-analysis$/);
    if (searchTermsMatch) {
        const runId = searchTermsMatch[1];
        return NextResponse.json({
            run_id: runId,
            wasted_spend: {
                amount: 141.23,
                percent: 22,
                severity: 'high',
                trend: 'increasing',
                query_count: 47
            },
            harmful_queries: [
                { query: 'plumber salary dubai', classification: 'Low Intent', spend: 23.50, explanation: 'Informational query', suggested_negative: 'salary' },
                { query: 'how to fix leaky faucet', classification: 'Low Intent', spend: 18.20, explanation: 'DIY intent', suggested_negative: 'how to' },
                { query: 'free plumber services', classification: 'Off-Topic', spend: 15.80, explanation: 'Price-sensitive, unlikely to convert', suggested_negative: 'free' },
            ],
            negative_suggestions: [
                { keyword: 'salary', potential_savings: 45.30, confidence: 0.92 },
                { keyword: 'free', potential_savings: 38.50, confidence: 0.88 },
                { keyword: 'jobs', potential_savings: 28.20, confidence: 0.85 },
            ]
        });
    }

    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path: string[] } }
) {
    const pathSegments = params.path;
    const fullPath = '/' + pathSegments.join('/');
    const storage = getStorage();
    const body = await request.json().catch(() => ({}));

    // Create account
    if (fullPath === '/accounts') {
        const scens = loadScenarios();
        const scenario = scens.find(s => s.slug === body.scenario_slug) || scens[0];

        const account = {
            id: uuid(),
            name: body.name || 'New Account',
            scenario_slug: body.scenario_slug || scenario.slug,
            daily_budget: body.daily_budget || scenario?.config?.daily_budget || 100,
            created_at: new Date().toISOString(),
        };
        storage.accounts.push(account);

        return NextResponse.json(account, { status: 201 });
    }

    // Create campaign
    const campaignMatch = fullPath.match(/^\/accounts\/([^/]+)\/campaigns$/);
    if (campaignMatch) {
        const accountId = campaignMatch[1];
        let account = storage.accounts.find(a => a.id === accountId);
        if (!account) {
            // Auto-create account for serverless cold starts
            account = {
                id: accountId,
                name: 'Restored Account',
                daily_budget: 100,
                currency: 'USD',
                created_at: new Date().toISOString(),
            };
            storage.accounts.push(account);
        }

        const campaign = {
            id: uuid(),
            account_id: accountId,
            name: body.name || 'New Campaign',
            status: 'active',
            daily_budget: body.daily_budget || account.daily_budget,
            created_at: new Date().toISOString(),
        };
        storage.campaigns.push(campaign);

        return NextResponse.json(campaign, { status: 201 });
    }

    // Create run (with campaign)
    const runMatch = fullPath.match(/^\/accounts\/([^/]+)\/campaigns\/([^/]+)\/runs$/);
    if (runMatch) {
        const campaignId = runMatch[2];
        const campaign = storage.campaigns.find(c => c.id === campaignId);
        if (!campaign) {
            return NextResponse.json({ detail: 'Campaign not found' }, { status: 404 });
        }

        const run = {
            id: uuid(),
            campaign_id: campaignId,
            status: 'pending',
            current_day: 0,
            duration_days: body.duration_days || 7,
            rng_seed: Math.floor(Math.random() * 100000),
            created_at: new Date().toISOString(),
        };
        storage.runs.push(run);

        return NextResponse.json(run, { status: 201 });
    }

    // Create run directly from account (simplified - no campaign required)
    const directRunMatch = fullPath.match(/^\/accounts\/([^/]+)\/runs$/);
    if (directRunMatch) {
        const accountId = directRunMatch[1];
        let account = storage.accounts.find(a => a.id === accountId);
        if (!account) {
            // Auto-create account for serverless cold starts
            account = {
                id: accountId,
                name: 'Restored Account',
                daily_budget: 100,
                currency: 'USD',
                created_at: new Date().toISOString(),
            };
            storage.accounts.push(account);
        }

        const run = {
            id: uuid(),
            account_id: accountId,
            scenario_slug: body.scenario_slug || account.scenario_slug,
            status: 'pending',
            current_day: 0,
            duration_days: body.duration_days || 7,
            rng_seed: body.seed || Math.floor(Math.random() * 100000),
            created_at: new Date().toISOString(),
        };
        storage.runs.push(run);

        return NextResponse.json(run, { status: 201 });
    }

    // Simulate day
    const simulateMatch = fullPath.match(/^\/runs\/([^/]+)\/simulate-day$/);
    if (simulateMatch) {
        const runId = simulateMatch[1];
        let run = storage.runs.find(r => r.id === runId);
        if (!run) {
            // Auto-create run for serverless cold starts
            run = {
                id: runId,
                account_id: 'restored',
                status: 'pending',
                current_day: 0,
                duration_days: 30,
                rng_seed: Math.floor(Math.random() * 100000),
                created_at: new Date().toISOString(),
            };
            storage.runs.push(run);
        }

        if (run.status === 'completed') {
            return NextResponse.json({ detail: 'Run already completed' }, { status: 400 });
        }

        run.current_day += 1;
        if (run.status === 'pending') {
            run.status = 'running';
            run.started_at = new Date().toISOString();
        }

        const rng = (run.rng_seed || 12345) + run.current_day;
        const rand = (n: number) => ((rng * n * 9301 + 49297) % 233280) / 233280;

        const result = {
            id: uuid(),
            run_id: runId,
            day_number: run.current_day,
            impressions: Math.floor(500 + rand(1) * 2000),
            clicks: Math.floor(20 + rand(2) * 100),
            conversions: Math.floor(1 + rand(3) * 15),
            cost: Math.round((50 + rand(4) * 150) * 100) / 100,
            revenue: Math.round((20 + rand(5) * 300) * 100) / 100,
            avg_position: Math.round((1 + rand(6) * 3) * 10) / 10,
            avg_quality_score: Math.round((0.4 + rand(7) * 0.4) * 100) / 100,
            impression_share: Math.round((0.5 + rand(8) * 0.4) * 100) / 100,
            lost_is_budget: Math.round(rand(9) * 0.3 * 100) / 100,
            lost_is_rank: Math.round(rand(10) * 0.3 * 100) / 100,
            created_at: new Date().toISOString(),
        };
        storage.dailyResults.push(result);

        if (run.current_day >= run.duration_days) {
            run.status = 'completed';
            run.completed_at = new Date().toISOString();
        }

        return NextResponse.json({
            status: 'success',
            day: run.current_day,
            ...result,
        });
    }

    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
}
