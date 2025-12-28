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
            const totalImpressions = runResults.reduce((s, r) => s + r.impressions, 0);
            const totalClicks = runResults.reduce((s, r) => s + r.clicks, 0);
            const totalConversions = runResults.reduce((s, r) => s + r.conversions, 0);
            const totalCost = runResults.reduce((s, r) => s + r.cost, 0);
            const totalRevenue = runResults.reduce((s, r) => s + r.revenue, 0);

            totals = {
                day_number: 0,
                impressions: totalImpressions,
                clicks: totalClicks,
                conversions: totalConversions,
                cost: totalCost,
                revenue: totalRevenue,
                avg_position: runResults.reduce((s, r) => s + r.avg_position, 0) / runResults.length,
                avg_quality_score: runResults.reduce((s, r) => s + r.avg_quality_score, 0) / runResults.length,
                impression_share: runResults.reduce((s, r) => s + r.impression_share, 0) / runResults.length,
                lost_is_budget: runResults.reduce((s, r) => s + r.lost_is_budget, 0) / runResults.length,
                lost_is_rank: runResults.reduce((s, r) => s + r.lost_is_rank, 0) / runResults.length,
                ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
                cvr: totalClicks > 0 ? totalConversions / totalClicks : 0,
                cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
                cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
                roas: totalCost > 0 ? totalRevenue / totalCost : 0,
            };
        }

        return NextResponse.json({
            run_id: runId,
            status: run.status,
            current_day: run.current_day,
            duration_days: run.duration_days,
            daily_results: runResults.map(r => ({
                ...r,
                ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
                cvr: r.clicks > 0 ? r.conversions / r.clicks : 0,
                cpc: r.clicks > 0 ? r.cost / r.clicks : 0,
                cpa: r.conversions > 0 ? r.cost / r.conversions : 0,
                roas: r.cost > 0 ? r.revenue / r.cost : 0,
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

        // ========== DATA-DRIVEN CAUSAL ANALYSIS ==========

        // Calculate actual metric changes
        const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
        const currCtr = safeDiv(current.clicks, current.impressions);
        const currCvr = safeDiv(current.conversions, current.clicks);
        const currCpc = safeDiv(current.cost, current.clicks);
        const currCpa = safeDiv(current.cost, Math.max(1, current.conversions));
        const currRoas = safeDiv(current.revenue, current.cost);

        const prevCtr = previous ? safeDiv(previous.clicks, previous.impressions) : currCtr;
        const prevCvr = previous ? safeDiv(previous.conversions, previous.clicks) : currCvr;
        const prevCpc = previous ? safeDiv(previous.cost, previous.clicks) : currCpc;
        const prevCpa = previous ? safeDiv(previous.cost, Math.max(1, previous.conversions)) : currCpa;
        const prevRoas = previous ? safeDiv(previous.revenue, previous.cost) : currRoas;

        // Percentage changes
        const calcChange = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;
        const ctrChange = calcChange(currCtr, prevCtr);
        const cvrChange = calcChange(currCvr, prevCvr);
        const cpcChange = calcChange(currCpc, prevCpc);
        const cpaChange = calcChange(currCpa, prevCpa);
        const roasChange = calcChange(currRoas, prevRoas);
        const impressionChange = calcChange(current.impressions, previous?.impressions || current.impressions);
        const conversionChange = calcChange(current.conversions, previous?.conversions || current.conversions);

        // Check what decisions were active
        const decisionsActive = current.decisions_active || {};
        const negativesAdded = decisionsActive.negatives_added || false;
        const matchTypesTightened = decisionsActive.match_types_tightened || false;
        const budgetChanged = decisionsActive.budget_modifier !== 1;

        // ========== DYNAMIC ISSUE DETECTION ==========
        const detectedIssues: any[] = [];
        const positiveOutcomes: any[] = [];

        // Issue: High CPA (cost per acquisition too high)
        if (currCpa > 50 || cpaChange > 20) {
            detectedIssues.push({
                id: 'high_cpa',
                severity: currCpa > 80 ? 'critical' : 'important',
                title: 'Cost Per Acquisition Too High',
                summary_beginner: `You're paying $${currCpa.toFixed(0)} per conversion, which is ${cpaChange > 0 ? 'up' : 'down'} ${Math.abs(cpaChange).toFixed(0)}% from yesterday.`,
                summary_advanced: `CPA ${currCpa.toFixed(2)} (${cpaChange > 0 ? '+' : ''}${cpaChange.toFixed(1)}%). ROAS at ${currRoas.toFixed(2)}x may not be sustainable.`,
                root_causes: [
                    { cause: 'Low conversion rate', contribution: 40 + Math.round(Math.random() * 20) },
                    { cause: 'High cost per click', contribution: 30 + Math.round(Math.random() * 15) },
                    { cause: 'Poor targeting quality', contribution: 15 + Math.round(Math.random() * 10) },
                ],
                suggested_action: 'Add negative keywords or tighten match types to improve targeting.',
            });
        }

        // Issue: CTR dropped significantly
        if (ctrChange < -15) {
            detectedIssues.push({
                id: 'ctr_drop',
                severity: ctrChange < -25 ? 'critical' : 'important',
                title: 'Click-Through Rate Dropped',
                summary_beginner: `Fewer people are clicking your ads (${ctrChange.toFixed(0)}% drop). This could mean your ads are less relevant or competition increased.`,
                summary_advanced: `CTR declined ${ctrChange.toFixed(1)}% (${(prevCtr * 100).toFixed(2)}% → ${(currCtr * 100).toFixed(2)}%). Check ad copy relevance and auction dynamics.`,
                root_causes: [
                    { cause: 'Ad fatigue or stale copy', contribution: 35 },
                    { cause: 'Increased competition', contribution: 30 },
                    { cause: 'Audience saturation', contribution: 20 },
                    { cause: 'Seasonal shift in intent', contribution: 15 },
                ],
                suggested_action: 'Refresh ad copy or review search term relevance.',
            });
        }

        // Issue: CVR dropped significantly  
        if (cvrChange < -20) {
            detectedIssues.push({
                id: 'cvr_drop',
                severity: cvrChange < -35 ? 'critical' : 'important',
                title: 'Conversion Rate Dropped',
                summary_beginner: `Clicks aren't turning into conversions (${cvrChange.toFixed(0)}% drop). Traffic quality may be declining.`,
                summary_advanced: `CVR dropped ${cvrChange.toFixed(1)}% (${(prevCvr * 100).toFixed(2)}% → ${(currCvr * 100).toFixed(2)}%). Investigate traffic source quality.`,
                root_causes: [
                    { cause: 'Lower intent traffic', contribution: 45 },
                    { cause: 'Landing page issues', contribution: 25 },
                    { cause: 'Broad match keyword drift', contribution: 20 },
                    { cause: 'Market conditions changed', contribution: 10 },
                ],
                suggested_action: 'Review search terms report and add negatives for low-quality queries.',
            });
        }

        // Issue: CPC increased
        if (cpcChange > 15) {
            detectedIssues.push({
                id: 'cpc_increase',
                severity: cpcChange > 30 ? 'critical' : 'important',
                title: 'Cost Per Click Increased',
                summary_beginner: `You're paying more per click (+${cpcChange.toFixed(0)}%). Competition may have increased, or your Quality Score dropped.`,
                summary_advanced: `CPC rose ${cpcChange.toFixed(1)}% ($${prevCpc.toFixed(2)} → $${currCpc.toFixed(2)}). Check auction insights and QS trends.`,
                root_causes: [
                    { cause: 'Competitor bid increase', contribution: 40 },
                    { cause: 'Quality Score decline', contribution: 35 },
                    { cause: 'Increased auction pressure', contribution: 25 },
                ],
                suggested_action: 'Improve ad relevance or adjust bidding strategy.',
            });
        }

        // Issue: Lost impression share (budget)
        if (current.lost_is_budget > 0.2) {
            detectedIssues.push({
                id: 'budget_limited',
                severity: current.lost_is_budget > 0.35 ? 'critical' : 'important',
                title: 'Budget Running Out Early',
                summary_beginner: `Your budget is depleting before peak hours. You're missing ${Math.round(current.lost_is_budget * 100)}% of potential impressions.`,
                summary_advanced: `Lost IS (budget): ${Math.round(current.lost_is_budget * 100)}%. Ads stopping before evening peak hours.`,
                root_causes: [
                    { cause: 'Daily budget too low', contribution: 50 },
                    { cause: 'High bid strategy depleting budget', contribution: 30 },
                    { cause: 'No dayparting schedule', contribution: 20 },
                ],
                suggested_action: 'Increase budget or enable ad scheduling for peak hours.',
            });
        }

        // ========== POSITIVE OUTCOME DETECTION ==========

        // Positive: CVR improved (especially if decisions were applied)
        if (cvrChange > 15) {
            positiveOutcomes.push({
                id: 'cvr_improved',
                title: 'Conversion Rate Improved',
                summary: negativesAdded || matchTypesTightened
                    ? `Your targeting changes are working! CVR up ${cvrChange.toFixed(0)}%.`
                    : `CVR improved by ${cvrChange.toFixed(0)}%. Market conditions may have shifted favorably.`,
                likely_cause: negativesAdded ? 'Added negative keywords filtered out junk traffic' :
                    matchTypesTightened ? 'Tighter match types improved relevance' : 'Market improvement',
            });
        }

        // Positive: CPA decreased
        if (cpaChange < -10) {
            positiveOutcomes.push({
                id: 'cpa_improved',
                title: 'Cost Per Acquisition Decreased',
                summary: `You're acquiring customers more efficiently. CPA down ${Math.abs(cpaChange).toFixed(0)}%.`,
                likely_cause: negativesAdded || matchTypesTightened ? 'Your decisions improved targeting quality' : 'Better market conditions',
            });
        }

        // Positive: ROAS improved
        if (roasChange > 15) {
            positiveOutcomes.push({
                id: 'roas_improved',
                title: 'Return on Ad Spend Improved',
                summary: `Your campaign efficiency increased. ROAS up ${roasChange.toFixed(0)}% to ${currRoas.toFixed(2)}x.`,
                likely_cause: 'Better targeting or conversion optimization',
            });
        }

        // ========== CONFLICTING SIGNALS ==========
        const conflictingSignals: any[] = [];

        if (ctrChange > 10 && cvrChange < -10) {
            conflictingSignals.push({
                id: 'ctr_up_cvr_down',
                signal_a: { metric: 'CTR', direction: 'up', change: Math.round(ctrChange) },
                signal_b: { metric: 'CVR', direction: 'down', change: Math.round(cvrChange) },
                explanation_beginner: 'More people are clicking, but fewer are converting. This suggests you\'re attracting lower-quality traffic.',
                explanation_advanced: `CTR +${ctrChange.toFixed(1)}% but CVR ${cvrChange.toFixed(1)}%. Likely cause: broad match expansion to lower-intent queries.`,
                likely_cause: 'intent_mix_shift',
            });
        }

        if (impressionChange < -20 && cvrChange > 10) {
            conflictingSignals.push({
                id: 'volume_down_quality_up',
                signal_a: { metric: 'Impressions', direction: 'down', change: Math.round(impressionChange) },
                signal_b: { metric: 'CVR', direction: 'up', change: Math.round(cvrChange) },
                explanation_beginner: 'You\'re getting fewer impressions, but the traffic you DO get is converting better. This is the expected trade-off from tightening targeting.',
                explanation_advanced: `Volume-quality trade-off active. Impressions ${impressionChange.toFixed(0)}% but CVR +${cvrChange.toFixed(0)}%.`,
                likely_cause: matchTypesTightened ? 'match_type_tightening' : 'targeting_improvement',
            });
        }

        // ========== BUILD METRIC CHANGES ==========
        const buildMetricChange = (prevVal: number, currVal: number, metricName: string) => {
            const prev = prevVal || currVal;
            const changePercent = prev === 0 ? 0 : ((currVal - prev) / prev) * 100;
            const direction = Math.abs(changePercent) < 2 ? 'flat' : (changePercent > 0 ? 'up' : 'down');

            // Generate dynamic drivers based on actual changes
            const drivers: any[] = [];

            if (metricName === 'cpc' && changePercent > 5) {
                drivers.push({
                    id: 'competition',
                    cause: 'competition_increase',
                    label: 'Competition Increased',
                    impact_percent: 40 + Math.round(Math.random() * 20),
                    explanation: 'Competitors may have raised bids.',
                });
                if (!negativesAdded) {
                    drivers.push({
                        id: 'targeting',
                        cause: 'broad_targeting',
                        label: 'Broad Targeting Active',
                        impact_percent: 30 + Math.round(Math.random() * 15),
                        explanation: 'Consider tightening match types.',
                    });
                }
            } else if (metricName === 'cvr' && changePercent < -5) {
                drivers.push({
                    id: 'traffic_quality',
                    cause: 'lower_intent',
                    label: 'Lower Intent Traffic',
                    impact_percent: 45 + Math.round(Math.random() * 15),
                    explanation: 'Traffic quality has declined.',
                });
            } else if (metricName === 'cvr' && changePercent > 5 && (negativesAdded || matchTypesTightened)) {
                drivers.push({
                    id: 'your_decision',
                    cause: 'targeting_improvement',
                    label: 'Your Targeting Decisions',
                    impact_percent: 60 + Math.round(Math.random() * 20),
                    explanation: 'Your changes improved traffic quality!',
                });
            }

            return {
                previous: Math.round(prev * 10000) / 10000,
                current: Math.round(currVal * 10000) / 10000,
                change_percent: Math.round(changePercent * 100) / 100,
                direction,
                drivers,
            };
        };

        // ========== OVERALL ASSESSMENT ==========
        const hasCriticalIssues = detectedIssues.some(i => i.severity === 'critical');
        const hasPositiveOutcomes = positiveOutcomes.length > 0;

        let overallStatus = 'stable';
        let overallMessage = 'Performance is within normal ranges.';

        if (hasCriticalIssues) {
            overallStatus = 'needs_attention';
            overallMessage = detectedIssues.find(i => i.severity === 'critical')?.title || 'Critical issues detected.';
        } else if (hasPositiveOutcomes && detectedIssues.length === 0) {
            overallStatus = 'improving';
            overallMessage = positiveOutcomes[0]?.title || 'Campaign is improving.';
        } else if (detectedIssues.length > 0) {
            overallStatus = 'watch';
            overallMessage = 'Some areas need monitoring.';
        }

        return NextResponse.json({
            run_id: runId,
            day_number: dayNumber,
            previous_day: previous ? dayNumber - 1 : null,
            is_first_day: !previous,

            // Overall assessment
            overall_status: overallStatus,
            overall_message: overallMessage,

            // Data-driven issues and outcomes
            detected_issues: detectedIssues,
            positive_outcomes: positiveOutcomes,
            conflicting_signals: conflictingSignals,
            has_issues: detectedIssues.length > 0,
            has_positive_outcomes: positiveOutcomes.length > 0,

            // Decision attribution
            decisions_active: {
                negatives_added: negativesAdded,
                match_types_tightened: matchTypesTightened,
                budget_changed: budgetChanged,
            },

            // Metric changes
            metrics: {
                cpc: buildMetricChange(prevCpc, currCpc, 'cpc'),
                ctr: buildMetricChange(prevCtr, currCtr, 'ctr'),
                cvr: buildMetricChange(prevCvr, currCvr, 'cvr'),
                cpa: buildMetricChange(prevCpa, currCpa, 'cpa'),
                roas: buildMetricChange(prevRoas, currRoas, 'roas'),
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
        const run = storage.runs.find(r => r.id === runId);
        const runResults = storage.dailyResults.filter(r => r.run_id === runId);
        const latestResult = runResults.length > 0 ? runResults[runResults.length - 1] : null;

        // Calculate waste based on decisions
        const decisions = run?.decisions_applied || [];
        const negativesAdded = decisions.some((d: any) => d.addNegativeKeywords);
        const matchTypesTightened = decisions.some((d: any) => d.tightenMatchTypes);

        // Base waste decreases with good decisions
        let baseWastePercent = 25 + Math.floor(Math.random() * 15); // 25-40%
        if (negativesAdded) baseWastePercent -= 15;
        if (matchTypesTightened) baseWastePercent -= 8;
        baseWastePercent = Math.max(5, baseWastePercent);

        const totalCost = latestResult?.cost || 100;
        const wasteAmount = Math.round((totalCost * (baseWastePercent / 100)) * 100) / 100;

        // Generate varied harmful queries based on day/seed
        const seed = (run?.rng_seed || 12345) + (runResults.length * 17);
        const queries = [
            { query: 'plumber salary dubai', classification: 'Low Intent', spendBase: 23.50, explanation: 'Informational query - job seekers not customers', suggested_negative: 'salary' },
            { query: 'how to fix leaky faucet', classification: 'Low Intent', spendBase: 18.20, explanation: 'DIY intent - not looking to hire', suggested_negative: 'how to' },
            { query: 'free plumber services', classification: 'Off-Topic', spendBase: 15.80, explanation: 'Price-sensitive, unlikely to convert', suggested_negative: 'free' },
            { query: 'plumber jobs near me', classification: 'Low Intent', spendBase: 12.40, explanation: 'Employment search not service seeker', suggested_negative: 'jobs' },
            { query: 'what does a plumber do', classification: 'Informational', spendBase: 8.90, explanation: 'Research query with no purchase intent', suggested_negative: 'what does' },
            { query: 'cheapest plumber', classification: 'Low Value', spendBase: 11.20, explanation: 'Extreme price sensitivity indicates low lifetime value', suggested_negative: 'cheapest' },
            { query: 'plumber training course', classification: 'Off-Topic', spendBase: 9.50, explanation: 'Education seekers not customers', suggested_negative: 'training' },
        ];

        // Filter out queries if negatives were added
        const activeQueries = negativesAdded
            ? queries.slice(3).map(q => ({ ...q, spend: q.spendBase * 0.3 })) // Show only new ones, reduced spend
            : queries.slice(0, 4).map(q => ({ ...q, spend: q.spendBase * (0.8 + Math.random() * 0.4) }));

        // Severity based on current waste level
        const severity = baseWastePercent > 25 ? 'high' : baseWastePercent > 15 ? 'medium' : 'low';
        const trend = negativesAdded ? 'decreasing' : 'increasing';

        return NextResponse.json({
            run_id: runId,
            wasted_spend: {
                amount: wasteAmount,
                percent: baseWastePercent,
                severity,
                trend,
                query_count: activeQueries.length + Math.floor(Math.random() * 20) + 10,
                improvement_message: negativesAdded
                    ? `Great! Waste reduced from ~35% to ${baseWastePercent}% since you added negative keywords.`
                    : null,
            },
            harmful_queries: activeQueries.map(q => ({
                query: q.query,
                classification: q.classification,
                spend: Math.round(q.spend * 100) / 100,
                explanation: q.explanation,
                suggested_negative: q.suggested_negative,
            })),
            negative_suggestions: [
                { keyword: 'salary', potential_savings: negativesAdded ? 5.30 : 45.30, confidence: 0.92, already_added: negativesAdded },
                { keyword: 'free', potential_savings: negativesAdded ? 8.50 : 38.50, confidence: 0.88, already_added: negativesAdded },
                { keyword: 'jobs', potential_savings: negativesAdded ? 4.20 : 28.20, confidence: 0.85, already_added: negativesAdded },
                { keyword: 'how to', potential_savings: negativesAdded ? 3.10 : 22.10, confidence: 0.80, already_added: negativesAdded },
            ],
            decisions_impact: {
                negatives_added: negativesAdded,
                match_types_tightened: matchTypesTightened,
                estimated_waste_reduction: negativesAdded ? '40-60%' : null,
            }
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
                rng_seed: Date.now() % 100000, // More random seed
                decisions_applied: [],
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

        // Parse decisions from request body
        const decisions = body.decisions || {};
        if (Object.keys(decisions).length > 0) {
            run.decisions_applied = run.decisions_applied || [];
            run.decisions_applied.push({
                day: run.current_day,
                ...decisions
            });
        }

        // Get previous day results for comparison
        const previousResults = storage.dailyResults.filter(r => r.run_id === runId);
        const previousDay = previousResults.find(r => r.day_number === run.current_day - 1);

        // ========== DYNAMIC METRIC GENERATION ==========
        // Base seed with day variance
        const baseSeed = (run.rng_seed || 12345);
        const daySeed = baseSeed + (run.current_day * 7919); // Prime multiplier for variety
        const rand = (n: number) => {
            const x = Math.sin(daySeed * n) * 10000;
            return x - Math.floor(x);
        };

        // Market volatility - varies significantly day to day
        const volatilityFactor = 0.3 + rand(100) * 0.5; // 30%-80% variance
        const marketTrend = rand(101) > 0.5 ? 1 : -1; // Random up/down trend

        // Calculate decision modifiers
        let negativeImpact = 0;
        let matchTypeImpact = 0;
        let budgetModifier = 1;

        const allDecisions = run.decisions_applied || [];
        for (const d of allDecisions) {
            if (d.addNegativeKeywords) negativeImpact += 0.15; // Reduces waste
            if (d.tightenMatchTypes) matchTypeImpact += 0.10; // Reduces waste, reduces volume
            if (d.budgetAdjustment === 'increase_20') budgetModifier *= 1.2;
            if (d.budgetAdjustment === 'decrease_20') budgetModifier *= 0.8;
        }

        // Base metrics with variance
        const baseImpressions = 500 + rand(1) * 2500;
        const baseCtr = 0.03 + rand(2) * 0.05;
        const baseCvr = 0.02 + rand(3) * 0.04;
        const baseCpc = 2 + rand(4) * 5;

        // Apply volatility and trends
        const impressionSwing = 1 + (marketTrend * volatilityFactor * 0.3);
        const ctrSwing = 1 + (rand(5) - 0.5) * volatilityFactor * 0.4;
        const cvrSwing = 1 + (rand(6) - 0.5) * volatilityFactor * 0.5;
        const cpcSwing = 1 + (rand(7) - 0.5) * volatilityFactor * 0.3;

        // Apply decision impacts
        // Negatives: reduce volume but increase quality
        const volumeReduction = matchTypeImpact * 0.25; // Tighter match = less volume
        const qualityBoost = negativeImpact * 0.5 + matchTypeImpact * 0.3; // Better targeting

        // Calculate final metrics
        const impressions = Math.floor(
            baseImpressions * impressionSwing * budgetModifier * (1 - volumeReduction)
        );
        const ctr = Math.min(0.15, Math.max(0.01, baseCtr * ctrSwing * (1 + qualityBoost * 0.3)));
        const clicks = Math.floor(impressions * ctr);
        const cvr = Math.min(0.12, Math.max(0.005, baseCvr * cvrSwing * (1 + qualityBoost * 0.5)));
        const conversions = Math.max(0, Math.floor(clicks * cvr));
        const cpc = Math.max(0.5, baseCpc * cpcSwing * (1 - qualityBoost * 0.15));
        const cost = Math.round(clicks * cpc * 100) / 100;
        const aov = 80 + rand(8) * 120; // Average order value
        const revenue = Math.round(conversions * aov * 100) / 100;

        // Calculate quality score based on decisions and performance
        const baseQs = 0.5 + rand(9) * 0.3;
        const qsBoost = qualityBoost * 0.2;
        const avgQualityScore = Math.min(1, Math.max(0.3, baseQs + qsBoost));

        // Impression share affected by budget and bidding
        const baseIs = 0.4 + rand(10) * 0.4;
        const impressionShare = Math.min(0.95, Math.max(0.3, baseIs * budgetModifier));

        // Lost IS - realistic variance
        const lostIsBudget = Math.max(0, 0.05 + rand(11) * 0.25 * (budgetModifier < 1 ? 1.5 : 0.7));
        const lostIsRank = Math.max(0, 0.03 + rand(12) * 0.2 * (1 - qsBoost));

        const result = {
            id: uuid(),
            run_id: runId,
            day_number: run.current_day,
            impressions,
            clicks,
            conversions,
            cost,
            revenue,
            ctr: Math.round(ctr * 10000) / 100, // As percentage
            cvr: Math.round(cvr * 10000) / 100,
            cpc: Math.round(cpc * 100) / 100,
            cpa: conversions > 0 ? Math.round((cost / conversions) * 100) / 100 : 0,
            roas: cost > 0 ? Math.round((revenue / cost) * 100) / 100 : 0,
            avg_position: Math.round((1.5 + rand(13) * 2.5) * 10) / 10,
            avg_quality_score: Math.round(avgQualityScore * 100) / 100,
            impression_share: Math.round(impressionShare * 100) / 100,
            lost_is_budget: Math.round(lostIsBudget * 100) / 100,
            lost_is_rank: Math.round(lostIsRank * 100) / 100,
            // Store decision state for this day
            decisions_active: {
                negatives_added: negativeImpact > 0,
                match_types_tightened: matchTypeImpact > 0,
                budget_modifier: budgetModifier,
            },
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
