/**
 * Simple mock API server for development without Docker/Python
 * Run with: node mock-api.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;

// Load scenario data
const scenariosDir = path.join(__dirname, 'apps', 'api', 'seed');
const scenarios = [];

try {
    const files = ['uae_real_estate.json', 'uae_local_services.json', 'uae_ecommerce.json'];
    for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
        scenarios.push(data);
    }
} catch (e) {
    console.error('Failed to load scenarios:', e.message);
}

// In-memory storage for MVP
const accounts = [];
const campaigns = [];
const runs = [];
const dailyResults = [];

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
};

// UUID generator
function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Parse JSON body
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

// Route handler
async function handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const method = req.method;
    const path = url.pathname;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
    }

    // Health check
    if (path === '/health' && method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'adsim-api-mock',
            version: '0.1.0',
            timestamp: new Date().toISOString(),
        }));
        return;
    }

    // Scenarios list
    if (path === '/scenarios' && method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            scenarios: scenarios.map(s => ({
                slug: s.slug,
                name: s.name,
                market: s.market,
                description: s.description,
            })),
            count: scenarios.length,
        }));
        return;
    }

    // Scenario detail
    const scenarioMatch = path.match(/^\/scenarios\/([^/]+)$/);
    if (scenarioMatch && method === 'GET') {
        const slug = scenarioMatch[1];
        const scenario = scenarios.find(s => s.slug === slug);
        if (scenario) {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify(scenario));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Scenario not found' }));
        }
        return;
    }

    // Mock login
    if (path === '/auth/mock-login' && method === 'POST') {
        const body = await parseBody(req);
        const email = body.email || 'demo@example.com';
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            access_token: 'mock_token_' + Date.now(),
            token_type: 'bearer',
            expires_in: 86400,
            user: {
                id: '00000000-0000-0000-0000-000000000001',
                email: email,
                name: email.split('@')[0],
            },
        }));
        return;
    }

    // Accounts list
    if (path === '/accounts' && method === 'GET') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ accounts, count: accounts.length }));
        return;
    }

    // Create account
    if (path === '/accounts' && method === 'POST') {
        const body = await parseBody(req);
        const account = {
            id: uuid(),
            name: body.name || 'New Account',
            daily_budget: body.daily_budget || 100,
            currency: body.currency || 'USD',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        accounts.push(account);
        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify(account));
        return;
    }

    // Account detail
    const accountMatch = path.match(/^\/accounts\/([^/]+)$/);
    if (accountMatch && method === 'GET') {
        const id = accountMatch[1];
        const account = accounts.find(a => a.id === id);
        if (account) {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify(account));
        } else {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Account not found' }));
        }
        return;
    }

    // Campaigns for account
    const campaignsMatch = path.match(/^\/accounts\/([^/]+)\/campaigns$/);
    if (campaignsMatch && method === 'GET') {
        const accountId = campaignsMatch[1];
        const accountCampaigns = campaigns.filter(c => c.sim_account_id === accountId);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ campaigns: accountCampaigns, count: accountCampaigns.length }));
        return;
    }

    if (campaignsMatch && method === 'POST') {
        const accountId = campaignsMatch[1];
        const body = await parseBody(req);
        const campaign = {
            id: uuid(),
            sim_account_id: accountId,
            name: body.name || 'New Campaign',
            status: body.status || 'draft',
            budget: body.budget || 50,
            bid_strategy: body.bid_strategy || 'manual_cpc',
            target_cpa: body.target_cpa || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        campaigns.push(campaign);
        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify(campaign));
        return;
    }

    // Runs for account
    const runsMatch = path.match(/^\/accounts\/([^/]+)\/runs$/);
    if (runsMatch && method === 'GET') {
        const accountId = runsMatch[1];
        const accountRuns = runs.filter(r => r.sim_account_id === accountId);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ runs: accountRuns, count: accountRuns.length }));
        return;
    }

    if (runsMatch && method === 'POST') {
        const accountId = runsMatch[1];
        const body = await parseBody(req);
        const run = {
            id: uuid(),
            sim_account_id: accountId,
            scenario_id: body.scenario_slug || 'uae-real-estate',
            rng_seed: body.seed || Math.floor(Math.random() * 2147483647),
            duration_days: body.duration_days || 30,
            current_day: 0,
            status: 'pending',
            started_at: null,
            completed_at: null,
            created_at: new Date().toISOString(),
        };
        runs.push(run);
        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify(run));
        return;
    }

    // Simulate day
    const simulateMatch = path.match(/^\/runs\/([^/]+)\/simulate-day$/);
    if (simulateMatch && method === 'POST') {
        const runId = simulateMatch[1];
        const run = runs.find(r => r.id === runId);
        if (!run) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Run not found' }));
            return;
        }

        // Simulate a day with mock data
        run.current_day += 1;
        if (run.status === 'pending') {
            run.status = 'running';
            run.started_at = new Date().toISOString();
        }

        const rng = run.rng_seed + run.current_day;
        const rand = (n) => ((rng * n * 9301 + 49297) % 233280) / 233280;

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
        dailyResults.push(result);

        if (run.current_day >= run.duration_days) {
            run.status = 'completed';
            run.completed_at = new Date().toISOString();
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            status: 'success',
            day: run.current_day,
            ...result,
        }));
        return;
    }

    // Run results
    const resultsMatch = path.match(/^\/runs\/([^/]+)\/results$/);
    if (resultsMatch && method === 'GET') {
        const runId = resultsMatch[1];
        const run = runs.find(r => r.id === runId);
        if (!run) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Run not found' }));
            return;
        }

        const runResults = dailyResults.filter(r => r.run_id === runId).sort((a, b) => a.day_number - b.day_number);

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
            };
            totals.ctr = totals.clicks / totals.impressions;
            totals.cvr = totals.conversions / totals.clicks;
            totals.cpc = totals.cost / totals.clicks;
            totals.cpa = totals.cost / totals.conversions;
            totals.roas = totals.revenue / totals.cost;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
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
        }));
        return;
    }

    // Causal analysis for a specific day
    const causalMatch = path.match(/^\/runs\/([^/]+)\/days\/(\d+)\/causal-analysis$/);
    if (causalMatch && method === 'GET') {
        const runId = causalMatch[1];
        const dayNumber = parseInt(causalMatch[2]);
        const run = runs.find(r => r.id === runId);
        if (!run) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Run not found' }));
            return;
        }

        const runResults = dailyResults.filter(r => r.run_id === runId);
        const current = runResults.find(r => r.day_number === dayNumber);
        const previous = runResults.find(r => r.day_number === dayNumber - 1);

        if (!current) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Day not found' }));
            return;
        }

        // Generate mock causal drivers based on seed
        const rng = run.rng_seed + dayNumber;
        const rand = (n) => ((rng * n * 9301 + 49297) % 233280) / 233280;

        // Intent Mix Shift - Calculate based on day number for learning flow
        const baseHighIntent = 45;
        const baseMedIntent = 35;
        const baseLowIntent = 20;

        // Learning flow: Intent degrades Days 1-3, then improves if "fixed"
        let intentShiftFactor = 0;
        if (dayNumber <= 3) {
            intentShiftFactor = dayNumber * 8; // Progressively worse
        } else {
            intentShiftFactor = Math.max(0, 24 - (dayNumber - 3) * 6); // Gradually recovers
        }

        const highIntentPercent = Math.max(15, baseHighIntent - intentShiftFactor + Math.round(rand(100) * 5));
        const lowIntentPercent = Math.min(50, baseLowIntent + intentShiftFactor + Math.round(rand(101) * 5));
        const medIntentPercent = 100 - highIntentPercent - lowIntentPercent;

        // Calculate shift from previous day
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
            // Plain language explanations
            explanation_beginner: lowIntentPercent > 30
                ? `Traffic quality shifted toward lower intent queries (+${Math.round(lowIntentPercent - prevLowIntent)}%). This means more clicks but fewer conversions.`
                : highIntentPercent > prevHighIntent
                    ? 'Traffic quality improved — more serious buyers are clicking.'
                    : 'Traffic quality is stable.',
            explanation_advanced: `Intent distribution shifted: High ${Math.round(prevHighIntent)}%→${highIntentPercent}%, Low ${Math.round(prevLowIntent)}%→${lowIntentPercent}%. ${lowIntentPercent > 30 ? `Broad match triggered +${Math.round(lowIntentPercent - prevLowIntent)}% low-intent informational queries. CVR impact: -${Math.round((lowIntentPercent - prevLowIntent) * 0.5)}% estimated.` : 'Distribution within normal range.'}`,
        };

        // Conflicting Signals Detection (Advanced mode only)
        const currCtr = current.clicks / current.impressions;
        const currCvr = current.conversions / current.clicks;
        const currCpc = current.cost / current.clicks;
        const currCpa = current.cost / Math.max(1, current.conversions);

        const prevCtr = previous ? previous.clicks / previous.impressions : currCtr;
        const prevCvr = previous ? previous.conversions / previous.clicks : currCvr;
        const prevCpc = previous ? previous.cost / previous.clicks : currCpc;
        const prevCpa = previous ? previous.cost / Math.max(1, previous.conversions) : currCpa;

        const ctrChange = (currCtr - prevCtr) / prevCtr;
        const cvrChange = (currCvr - prevCvr) / prevCvr;
        const cpcChange = (currCpc - prevCpc) / prevCpc;
        const cpaChange = (currCpa - prevCpa) / prevCpa;

        const conflictingSignals = [];

        // CTR up but CVR down
        if (ctrChange > 0.05 && cvrChange < -0.03) {
            conflictingSignals.push({
                id: 'ctr_up_cvr_down',
                signal_a: { metric: 'CTR', direction: 'up', change: Math.round(ctrChange * 100) },
                signal_b: { metric: 'CVR', direction: 'down', change: Math.round(cvrChange * 100) },
                explanation_beginner: 'More people are clicking, but fewer are converting. Your ads may be attracting the wrong audience.',
                explanation_advanced: `CTR increased ${Math.round(ctrChange * 100)}% while CVR declined ${Math.abs(Math.round(cvrChange * 100))}%. Primary driver appears to be intent mix shift toward informational queries (likely broad match expansion).`,
                likely_cause: 'intent_mix_shift',
            });
        }

        // CPC down but CPA up
        if (cpcChange < -0.05 && cpaChange > 0.10) {
            conflictingSignals.push({
                id: 'cpc_down_cpa_up',
                signal_a: { metric: 'CPC', direction: 'down', change: Math.round(cpcChange * 100) },
                signal_b: { metric: 'CPA', direction: 'up', change: Math.round(cpaChange * 100) },
                explanation_beginner: 'Your clicks got cheaper, but each conversion costs more. Focus on quality over volume.',
                explanation_advanced: `CPC decreased ${Math.abs(Math.round(cpcChange * 100))}% but CPA increased ${Math.round(cpaChange * 100)}%. Secondary contributing factor: competitor pullback on low-intent terms increased your share of unqualified traffic.`,
                likely_cause: 'traffic_quality_decline',
            });
        }

        // Impressions up but CVR down
        if (current.impressions > (previous?.impressions || 0) * 1.1 && cvrChange < -0.03) {
            conflictingSignals.push({
                id: 'reach_up_cvr_down',
                signal_a: { metric: 'Impressions', direction: 'up', change: Math.round(((current.impressions / (previous?.impressions || current.impressions)) - 1) * 100) },
                signal_b: { metric: 'CVR', direction: 'down', change: Math.round(cvrChange * 100) },
                explanation_beginner: 'Your ads are reaching more people, but they\'re less likely to convert.',
                explanation_advanced: `Reach expanded ${Math.round(((current.impressions / (previous?.impressions || current.impressions)) - 1) * 100)}% while CVR declined. Likely influenced by broader keyword matching reaching lower-intent segments.`,
                likely_cause: 'broad_reach_dilution',
            });
        }

        // Crisis Day Detection (Day 3 in learning flow)
        const isCrisisDay = dayNumber === 3 && lowIntentPercent > 35;
        const isRecoveryDay = dayNumber >= 4 && lowIntentPercent < 30;

        const learningFlowState = {
            is_crisis_day: isCrisisDay,
            is_recovery_day: isRecoveryDay,
            crisis_message_beginner: isCrisisDay ? {
                title: 'High Waste Detected',
                severity: 'critical',
                summary: 'Your broad match keywords are showing ads to people searching for informational queries — they\'re not buyers.',
                action: 'Add negative keywords to block irrelevant traffic. Your volume will drop, but conversions will improve.',
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
                    { cause: 'Quality Score erosion from poor CTR on bad matches', contribution: 15 },
                    { cause: 'CPC increased due to lower Quality Score', contribution: 10 },
                ],
                tradeoff: 'Adding negatives will reduce volume 25-35% but improve CVR 40-60%.',
                expected_outcome: 'CPA $22-26 (vs current estimate)',
            } : null,
            recovery_message: isRecoveryDay ? {
                title: 'You traded volume for quality. This is expected.',
                summary: 'Same conversions, much lower cost. This is the goal.',
                metrics_comparison: {
                    before: { impressions: 3000, conversions: 4, cpa: 38 },
                    after: { impressions: 1800, conversions: 4, cpa: 24 },
                },
            } : null,
        };

        const causeTypes = [
            {
                id: 'competitor_bid_increase', label: 'Competitor Bid Increase', metric: 'cpc',
                explanation: 'A competitor raised their bids significantly.',
                explanation_advanced: `Competitor 'Startup X' increased max CPC by ${Math.round(30 + rand(1) * 40)}%. This raised auction pressure across overlapping keywords.`
            },
            {
                id: 'quality_score_decrease', label: 'Quality Score Dropped', metric: 'cpc',
                explanation: 'Your Quality Score decreased, raising your cost per click.',
                explanation_advanced: `Avg QS dropped from ${(7 + rand(2)).toFixed(1)} to ${(5 + rand(3)).toFixed(1)} due to landing page load time.`
            },
            {
                id: 'low_intent_query_share', label: 'More Low-Intent Queries', metric: 'cpc',
                explanation: 'Broad match triggered on more general searches.',
                explanation_advanced: `Broad match keywords matched ${Math.round(10 + rand(4) * 20)}% more low-intent queries.`
            },
            {
                id: 'ad_fatigue', label: 'Ad Fatigue', metric: 'ctr',
                explanation: 'Users saw your ads too many times.',
                explanation_advanced: `Avg frequency reached ${(3 + rand(5) * 2).toFixed(1)} impressions per user.`
            },
            {
                id: 'position_decrease', label: 'Lower Ad Position', metric: 'ctr',
                explanation: 'Your ads appeared lower on the page.',
                explanation_advanced: `Avg position dropped from ${(1.5 + rand(6)).toFixed(1)} to ${(2.5 + rand(7)).toFixed(1)}.`
            },
            {
                id: 'landing_page_slow', label: 'Landing Page Slow', metric: 'cvr',
                explanation: 'Your landing page took longer to load, hurting conversions.',
                explanation_advanced: `Load time increased from 2.1s to ${(3 + rand(8) * 2).toFixed(1)}s.`
            },
            {
                id: 'budget_limited', label: 'Budget Ran Out Early', metric: 'conversions',
                explanation: 'Your daily budget was exhausted before peak hours ended.',
                explanation_advanced: `Budget exhausted by ${Math.round(14 + rand(9) * 4)}:00, missing ${Math.round(15 + rand(10) * 20)}% of searches.`
            },
            {
                id: 'high_intent_query_share', label: 'More High-Intent Queries', metric: 'cvr',
                explanation: 'Your keywords matched more purchase-ready searches.',
                explanation_advanced: `High-intent query share increased by ${Math.round(10 + rand(11) * 20)}%.`
            }
        ];

        function buildMetricChange(prevVal, currVal, metricName) {
            const prev = prevVal || currVal;
            const changePercent = prev === 0 ? 0 : ((currVal - prev) / prev) * 100;
            const direction = Math.abs(changePercent) < 1 ? 'flat' : (changePercent > 0 ? 'up' : 'down');

            // Select 2-3 random drivers for this metric
            const relevantCauses = causeTypes.filter(c => c.metric === metricName || rand(causeTypes.indexOf(c)) > 0.7);
            const selectedCauses = relevantCauses.slice(0, 2 + Math.floor(rand(metricName.length) * 2));

            // Normalize impacts to 100%
            const totalWeight = selectedCauses.reduce((s, _, i) => s + (60 - i * 15), 0);

            return {
                previous: Math.round(prev * 10000) / 10000,
                current: Math.round(currVal * 10000) / 10000,
                change_percent: Math.round(changePercent * 100) / 100,
                direction,
                drivers: selectedCauses.map((cause, i) => ({
                    id: cause.id,
                    cause: cause.id,
                    label: cause.label,
                    impact_percent: Math.round((60 - i * 15) / totalWeight * 100),
                    explanation: cause.explanation,
                    explanation_advanced: cause.explanation_advanced,
                    segment_evidence: i === 0 ? [
                        { segment_type: 'device', segment_value: 'Mobile', metric_change: Math.round(rand(i + 20) * 30) },
                        { segment_type: 'geo', segment_value: 'Dubai Marina', metric_change: Math.round(rand(i + 21) * 25) }
                    ] : []
                }))
            };
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            run_id: runId,
            day_number: dayNumber,
            previous_day: previous ? dayNumber - 1 : null,
            is_first_day: !previous,
            // New: Intent Mix Shift
            intent_mix_shift: intentMixShift,
            // New: Conflicting Signals (for Advanced mode)
            conflicting_signals: conflictingSignals,
            has_conflicting_signals: conflictingSignals.length > 0,
            // New: Learning Flow State
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
            raw_causal_log: {
                competitor_bid_up: rand(50) * 0.5,
                qs_drop: rand(51) * 0.3,
                fatigue: rand(52) * 0.4,
                position_drop: rand(53) * 0.3,
                low_intent_share: rand(54) * 0.25,
                landing_slow: rand(55) * 0.2,
                budget_limited: rand(56) * 0.15,
            }
        }));
        return;
    }

    // Search Terms Analysis - wasted spend and harmful queries
    const searchAnalysisMatch = path.match(/^\/runs\/([^/]+)\/search-terms-analysis$/);
    if (searchAnalysisMatch && method === 'GET') {
        const runId = searchAnalysisMatch[1];
        const run = runs.find(r => r.id === runId);

        if (!run) {
            res.writeHead(404, corsHeaders);
            res.end(JSON.stringify({ detail: 'Run not found' }));
            return;
        }

        const runResults = dailyResults.filter(r => r.run_id === runId);
        const totalCost = runResults.reduce((s, r) => s + r.cost, 0);

        // Generate deterministic harmful queries based on seed
        const rng = run.rng_seed;
        const rand = (n) => ((rng * n * 9301 + 49297) % 233280) / 233280;

        // Real estate scenario queries
        const realEstateHarmful = [
            {
                query: 'what is a villa in dubai', classification: 'low_intent',
                why_bad: 'People searching "what is" are researching, not buying.',
                why_bad_advanced: 'Query contains informational trigger "what is". Historical CVR for this pattern: 0.1%. Matched via broad match on keyword "villa dubai".',
                suggested_negative: 'what is'
            },
            {
                query: 'emaar properties contact', classification: 'competitor',
                why_bad: 'They want your competitor, not you.',
                why_bad_advanced: 'Competitor brand query. User intent is navigational to Emaar. Click represents curiosity, not purchase intent.',
                suggested_negative: 'emaar'
            },
            {
                query: 'dubai weather today', classification: 'off_topic',
                why_bad: 'Completely unrelated to real estate.',
                why_bad_advanced: 'Broad match on "dubai" triggered this irrelevant query. Zero purchase intent detected.',
                suggested_negative: 'weather'
            },
            {
                query: 'cheap apartments under 500 aed', classification: 'low_intent',
                why_bad: 'Budget too low for your properties.',
                why_bad_advanced: 'Price-sensitive query with unrealistic expectations. Avg property price is 50x higher than query implies.',
                suggested_negative: 'cheap'
            },
            {
                query: 'property management jobs dubai', classification: 'off_topic',
                why_bad: 'Job seekers, not buyers.',
                why_bad_advanced: 'Employment-related query. User is looking for work, not property investment.',
                suggested_negative: 'jobs'
            },
            {
                query: 'free villa giveaway dubai', classification: 'low_intent',
                why_bad: 'Looking for free things, not buying.',
                why_bad_advanced: 'Freebie-seeker behavior. Zero conversion likelihood.',
                suggested_negative: 'free'
            },
            {
                query: 'how to become a real estate agent', classification: 'off_topic',
                why_bad: 'Career interest, not property buyer.',
                why_bad_advanced: 'Career-oriented query with no transactional intent.',
                suggested_negative: 'become agent'
            },
        ];

        // Local services scenario queries  
        const localServicesHarmful = [
            {
                query: 'how to fix a leaky faucet myself', classification: 'low_intent',
                why_bad: 'DIY searchers won\'t hire you.',
                why_bad_advanced: 'Self-service intent indicated by "myself". CVR typically 0% for these queries.',
                suggested_negative: 'myself'
            },
            {
                query: 'plumber salary dubai', classification: 'off_topic',
                why_bad: 'Job seekers, not customers.',
                why_bad_advanced: 'Employment research query. Looking for career info, not services.',
                suggested_negative: 'salary'
            },
            {
                query: 'free plumbing estimate', classification: 'low_intent',
                why_bad: 'Price shopping without intent to hire.',
                why_bad_advanced: 'Free-seeker behavior often leads to no conversion.',
                suggested_negative: 'free'
            },
        ];

        const harmfulTemplates = run.scenario_id?.includes('local') ? localServicesHarmful : realEstateHarmful;

        // Build harmful queries with random spend
        const harmfulQueries = harmfulTemplates.map((template, i) => ({
            ...template,
            spend: Math.round((20 + rand(i + 100) * 50) * 100) / 100,
            clicks: Math.floor(30 + rand(i + 101) * 150),
            impressions: Math.floor(500 + rand(i + 102) * 2000),
            conversions: 0,
            match_type: ['broad', 'broad', 'phrase'][Math.floor(rand(i + 103) * 3)],
            triggered_keyword: 'villa dubai',
            intent_score: Math.round(rand(i + 104) * 0.3 * 100) / 100,
            estimated_savings: Math.round((20 + rand(i + 100) * 50) * 100) / 100,
        }));

        // Sort by spend
        harmfulQueries.sort((a, b) => b.spend - a.spend);

        // Calculate wasted spend
        const wastedAmount = harmfulQueries.reduce((s, q) => s + q.spend, 0);
        const wastedPercent = totalCost > 0 ? (wastedAmount / totalCost) * 100 : 0;

        // Generate negative suggestions
        const negativeSuggestions = [];
        const seenNegatives = new Set();
        harmfulQueries.forEach(q => {
            if (!seenNegatives.has(q.suggested_negative)) {
                seenNegatives.add(q.suggested_negative);
                const queriesWithNegative = harmfulQueries.filter(hq => hq.suggested_negative === q.suggested_negative);
                negativeSuggestions.push({
                    keyword: q.suggested_negative,
                    match_type: q.suggested_negative.includes(' ') ? 'phrase' : 'exact',
                    reason: `Blocks "${q.query}" and similar`,
                    queries_blocked: queriesWithNegative.length + Math.floor(rand(negativeSuggestions.length + 200) * 5),
                    estimated_savings: queriesWithNegative.reduce((s, hq) => s + hq.spend, 0),
                });
            }
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
            run_id: runId,
            day_number: run.current_day,
            wasted_spend: {
                amount: Math.round(wastedAmount * 100) / 100,
                percent: Math.round(wastedPercent * 100) / 100,
                trend_percent: Math.round((rand(300) * 10 - 3) * 100) / 100,
                query_count: harmfulQueries.length,
            },
            harmful_queries: harmfulQueries,
            negative_suggestions: negativeSuggestions,
            potential_savings: {
                total: Math.round(wastedAmount * 100) / 100,
                by_suggestion: Object.fromEntries(negativeSuggestions.map(s => [s.keyword, s.estimated_savings])),
            },
        }));
        return;
    }

    // 404 fallback
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ detail: 'Not found', path, method }));
}

// Start server
const server = http.createServer(async (req, res) => {
    try {
        await handleRequest(req, res);
    } catch (err) {
        console.error('Error:', err);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ detail: 'Internal server error' }));
    }
});

server.listen(PORT, () => {
    console.log(`\n🚀 AdSim Lab Mock API running at http://localhost:${PORT}`);
    console.log(`📚 Scenarios loaded: ${scenarios.length}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /health`);
    console.log(`  GET  /scenarios`);
    console.log(`  POST /auth/mock-login`);
    console.log(`  GET  /accounts`);
    console.log(`  POST /accounts`);
    console.log(`  GET  /accounts/:id/campaigns`);
    console.log(`  POST /accounts/:id/campaigns`);
    console.log(`  GET  /accounts/:id/runs`);
    console.log(`  POST /accounts/:id/runs`);
    console.log(`  POST /runs/:id/simulate-day`);
    console.log(`  GET  /runs/:id/results`);
    console.log(`\nPress Ctrl+C to stop\n`);
});
