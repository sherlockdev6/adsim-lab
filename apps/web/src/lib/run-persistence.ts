'use client';

/**
 * Client-side persistence for run data
 * Helps survive page refreshes and serverless cold starts
 */

const STORAGE_KEY = 'adsim_run_cache';
const CACHE_EXPIRY_HOURS = 24;

interface CachedRunData {
    runId: string;
    accountId: string;
    currentDay: number;
    status: 'pending' | 'running' | 'completed';
    dailyResults: any[];
    decisions: any[];
    cachedAt: string;
}

interface RunCache {
    [runId: string]: CachedRunData;
}

function getCache(): RunCache {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const cache = JSON.parse(raw) as RunCache;

        // Clean expired entries
        const now = new Date();
        const cleaned: RunCache = {};
        for (const [id, data] of Object.entries(cache)) {
            const cachedAt = new Date(data.cachedAt);
            const hoursOld = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
            if (hoursOld < CACHE_EXPIRY_HOURS) {
                cleaned[id] = data;
            }
        }
        return cleaned;
    } catch {
        return {};
    }
}

function saveCache(cache: RunCache) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.warn('Failed to save run cache:', e);
    }
}

/**
 * Cache run data after each API response
 */
export function cacheRunData(runId: string, data: {
    accountId?: string;
    currentDay: number;
    status: 'pending' | 'running' | 'completed';
    dailyResults?: any[];
    decisions?: any[];
}) {
    const cache = getCache();
    const existing = cache[runId] || {};

    cache[runId] = {
        runId,
        accountId: data.accountId || existing.accountId || 'unknown',
        currentDay: data.currentDay,
        status: data.status,
        dailyResults: data.dailyResults || existing.dailyResults || [],
        decisions: data.decisions || existing.decisions || [],
        cachedAt: new Date().toISOString(),
    };

    saveCache(cache);
}

/**
 * Get cached run data (fallback for cold starts)
 */
export function getCachedRunData(runId: string): CachedRunData | null {
    const cache = getCache();
    return cache[runId] || null;
}

/**
 * Add a new daily result to the cache
 */
export function addDayToCache(runId: string, dayResult: any) {
    const cache = getCache();
    const existing = cache[runId];

    if (existing) {
        // Avoid duplicates
        const alreadyExists = existing.dailyResults.some(
            (r: any) => r.day_number === dayResult.day_number
        );
        if (!alreadyExists) {
            existing.dailyResults.push(dayResult);
            existing.currentDay = dayResult.day_number;
            existing.cachedAt = new Date().toISOString();
            saveCache(cache);
        }
    }
}

/**
 * Add decision to cache
 */
export function addDecisionToCache(runId: string, decision: any) {
    const cache = getCache();
    const existing = cache[runId];

    if (existing) {
        existing.decisions.push(decision);
        existing.cachedAt = new Date().toISOString();
        saveCache(cache);
    }
}

/**
 * Clear cache for a specific run
 */
export function clearRunCache(runId: string) {
    const cache = getCache();
    delete cache[runId];
    saveCache(cache);
}

/**
 * Clear all cached runs
 */
export function clearAllRunCache() {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

/**
 * Get all cached run IDs
 */
export function getCachedRunIds(): string[] {
    const cache = getCache();
    return Object.keys(cache);
}
