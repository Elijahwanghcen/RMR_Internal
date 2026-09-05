/**
 * ════════════════════════════════════════════════════════════════
 * RMR Suspicious Submission Detector
 * ════════════════════════════════════════════════════════════════
 *
 * Comprehensive pipeline to flag troll, spam, or incorrectly
 * entered rent submissions. Each check returns an array of
 * { category, reason, severity } objects.
 *
 * CATEGORIES:
 *   layout_invalid  – missing beds/baths or impossible counts
 *   rent_outlier    – rent outside absolute or per-building norms
 *   cost_logic      – contradictions in utility/parking vs rent
 *   text_spam       – gibberish, profanity, or keyboard-mash
 *   total_rent      – user likely entered TOTAL unit rent
 *   spam_rate       – rapid-fire submissions from the same user
 *   year_invalid    – impossible signing year
 *
 * SEVERITY: "high" | "medium" | "low"
 * ════════════════════════════════════════════════════════════════
 */

// ── Layout parsing helper ─────────────────────────────────────
function parseLayout(layout) {
    if (!layout || typeof layout !== 'string') return { beds: null, baths: null };
    const bedMatch = layout.match(/(\d+)\s*bed/i);
    const bathMatch = layout.match(/(\d+)\s*bath/i);
    return {
        beds: bedMatch ? parseInt(bedMatch[1], 10) : null,
        baths: bathMatch ? parseInt(bathMatch[1], 10) : null
    };
}

// ── 1. LAYOUT CHECK ───────────────────────────────────────────
// Flags: missing beds/baths, impossible counts (0 or > 6)
function checkLayout(submission) {
    const flags = [];
    const { beds, baths } = parseLayout(submission.layout);

    if (!submission.layout || submission.layout.trim() === '') {
        flags.push({ category: 'layout_invalid', reason: 'No layout provided', severity: 'medium' });
        return flags;
    }

    if (beds === null) {
        flags.push({ category: 'layout_invalid', reason: `Layout missing bed count: "${submission.layout}"`, severity: 'medium' });
    } else if (beds === 0) {
        flags.push({ category: 'layout_invalid', reason: 'Layout has 0 bedrooms', severity: 'high' });
    } else if (beds > 6) {
        flags.push({ category: 'layout_invalid', reason: `Impossible bed count: ${beds}`, severity: 'high' });
    }

    if (baths === null) {
        flags.push({ category: 'layout_invalid', reason: `Layout missing bath count: "${submission.layout}"`, severity: 'medium' });
    } else if (baths === 0) {
        flags.push({ category: 'layout_invalid', reason: 'Layout has 0 bathrooms', severity: 'high' });
    } else if (baths > 6) {
        flags.push({ category: 'layout_invalid', reason: `Impossible bath count: ${baths}`, severity: 'high' });
    }

    // Baths should never exceed beds (50x50 type scenario)
    if (beds != null && baths != null && baths > beds + 1) {
        flags.push({ category: 'layout_invalid', reason: `Bath count (${baths}) exceeds beds (${beds}) — unrealistic`, severity: 'high' });
    }

    return flags;
}

// ── 2. RENT OUTLIER CHECK ─────────────────────────────────────
// Hard absolute limits + per-building median deviation
function checkRentOutlier(submission, buildingStats) {
    const flags = [];
    const rent = submission.rent;

    if (rent == null) {
        flags.push({ category: 'rent_outlier', reason: 'No rent provided', severity: 'medium' });
        return flags;
    }

    if (rent === 0) {
        flags.push({ category: 'rent_outlier', reason: 'Rent is $0', severity: 'high' });
        return flags;
    }

    // Absolute hard limits
    if (rent < 200) {
        flags.push({ category: 'rent_outlier', reason: `Rent abnormally low: $${rent}`, severity: 'high' });
    }
    if (rent > 3500) {
        flags.push({ category: 'rent_outlier', reason: `Rent abnormally high: $${rent}`, severity: 'high' });
    }

    // Per-building deviation check (needs ≥3 other submissions)
    const hood = (submission.hood || '').toLowerCase().trim();
    const layout = (submission.layout || '').trim();
    const key = `${hood}|||${layout}`;

    if (buildingStats && buildingStats[key]) {
        const stats = buildingStats[key];
        if (stats.count >= 3 && stats.median > 0) {
            const deviation = Math.abs(rent - stats.median) / stats.median;
            if (deviation > 0.50) {
                flags.push({
                    category: 'rent_outlier',
                    reason: `Rent $${rent} deviates ${Math.round(deviation * 100)}% from ${stats.count} similar submissions (median $${stats.median})`,
                    severity: deviation > 0.80 ? 'high' : 'medium'
                });
            }
        }
    }

    return flags;
}

// ── 3. TOTAL RENT DETECTION ───────────────────────────────────
// If rent / beds ≈ building median, they likely entered unit total
function checkTotalRent(submission, buildingStats) {
    const flags = [];
    const rent = submission.rent;
    if (rent == null || rent < 1500) return flags; // only suspect for high values

    const { beds } = parseLayout(submission.layout);
    if (!beds || beds < 2) return flags;

    const hood = (submission.hood || '').toLowerCase().trim();
    const layout = (submission.layout || '').trim();
    const key = `${hood}|||${layout}`;

    if (buildingStats && buildingStats[key]) {
        const stats = buildingStats[key];
        if (stats.count >= 2 && stats.median > 0) {
            const perBedRent = rent / beds;
            const ratioToMedian = Math.abs(perBedRent - stats.median) / stats.median;
            if (ratioToMedian < 0.20) {
                flags.push({
                    category: 'total_rent',
                    reason: `Rent $${rent} ÷ ${beds} beds = $${Math.round(perBedRent)}, which is close to the median $${stats.median} — possible total unit rent`,
                    severity: 'medium'
                });
            }
        }
    }

    return flags;
}

// ── 4. COST LOGIC CHECK ──────────────────────────────────────
// Utility / parking contradictions
function checkCostLogic(submission) {
    const flags = [];
    const rent = submission.rent || 0;

    // Utilities included = true but utilityCost > 0
    if (submission.utils === true && submission.utilityCost > 0) {
        flags.push({
            category: 'cost_logic',
            reason: `Utilities marked "included" but utility cost is $${submission.utilityCost}`,
            severity: 'low'
        });
    }

    // Utility cost >= rent is almost always wrong
    if (submission.utilityCost != null && submission.utilityCost > 0 && rent > 0 && submission.utilityCost >= rent) {
        flags.push({
            category: 'cost_logic',
            reason: `Utility cost ($${submission.utilityCost}) ≥ rent ($${rent})`,
            severity: 'high'
        });
    }

    // Abnormally high utility cost
    if (submission.utilityCost != null && submission.utilityCost > 300) {
        flags.push({
            category: 'cost_logic',
            reason: `Utility cost unusually high: $${submission.utilityCost}`,
            severity: 'medium'
        });
    }

    // Parking not checked but parkingCost > 0
    if (submission.parking === false && submission.parkingCost > 0) {
        flags.push({
            category: 'cost_logic',
            reason: `No parking selected but parking cost is $${submission.parkingCost}`,
            severity: 'low'
        });
    }

    // Abnormally high parking cost
    if (submission.parkingCost != null && submission.parkingCost > 300) {
        flags.push({
            category: 'cost_logic',
            reason: `Parking cost unusually high: $${submission.parkingCost}`,
            severity: 'medium'
        });
    }

    return flags;
}

// ── 5. TEXT / SPAM CHECK ─────────────────────────────────────
// Gibberish building names, spam notes, profanity
function checkTextSpam(submission) {
    const flags = [];
    const hood = (submission.hood || '').trim();
    const note = (submission.note || '').trim();

    // Very short building name (except known short ones like "Ion")
    const shortNameExceptions = ['ion', '21 rio', '22 rio', '26 west', '34 west'];
    if (hood.length > 0 && hood.length <= 3 && !shortNameExceptions.includes(hood.toLowerCase())) {
        flags.push({ category: 'text_spam', reason: `Building name suspiciously short: "${hood}"`, severity: 'medium' });
    }

    // Consonant-only gibberish (4+ consecutive consonants with no vowels)
    if (/^[bcdfghjklmnpqrstvwxyz]{4,}$/i.test(hood)) {
        flags.push({ category: 'text_spam', reason: `Building name looks like gibberish: "${hood}"`, severity: 'high' });
    }

    // Known test / troll words
    const testWords = ['test', 'asdf', 'aaa', 'xxx', 'awef', 'sdfs', 'qwerty', 'hello', 'abc', 'lol', 'fake', 'idk', 'na', 'n/a', 'none', 'testing'];
    const hoodLower = hood.toLowerCase();
    const noteLower = note.toLowerCase();
    for (const tw of testWords) {
        if (hoodLower === tw) {
            flags.push({ category: 'text_spam', reason: `Building name is test/gibberish: "${hood}"`, severity: 'high' });
            break;
        }
    }

    // Note contains only consonants / keyboard mash (20+ chars, no spaces, few vowels)
    if (note.length > 20) {
        const vowelCount = (note.match(/[aeiou]/gi) || []).length;
        const vowelRatio = vowelCount / note.length;
        if (vowelRatio < 0.10 && !note.includes(' ')) {
            flags.push({ category: 'text_spam', reason: `Note looks like keyboard mashing`, severity: 'medium' });
        }
    }

    // Profanity check (basic list)
    const profanityList = ['fuck', 'shit', 'ass ', 'bitch', 'dick', 'cunt', 'damn'];
    for (const word of profanityList) {
        if (noteLower.includes(word) || hoodLower.includes(word)) {
            flags.push({ category: 'text_spam', reason: `Contains profanity`, severity: 'medium' });
            break;
        }
    }

    return flags;
}

// ── 6. SIGNING YEAR VALIDATION ───────────────────────────────
function checkSigningYear(submission) {
    const flags = [];
    const year = submission.signingYear;

    if (!year) return flags;

    // Acceptable values: "Current Year", "Current Lease", "2025", "2026", "2027"
    const acceptable = ['current year', 'current lease', '2024', '2025', '2026', '2027', '2028'];
    if (!acceptable.includes(year.toString().toLowerCase().trim())) {
        // Check if it's a numeric year
        const numYear = parseInt(year, 10);
        if (!isNaN(numYear)) {
            if (numYear < 2020 || numYear > 2030) {
                flags.push({
                    category: 'year_invalid',
                    reason: `Signing year "${year}" is outside realistic range (2020–2030)`,
                    severity: 'medium'
                });
            }
        }
    }

    return flags;
}

// ── 7. SPAM RATE CHECK ─────────────────────────────────────
// Detect rapid-fire submissions from the same user
function checkSpamRate(submission, allSubmissions) {
    const flags = [];
    const userId = submission.userId || submission._user?.id;
    const createdAt = submission.createdAt;

    if (!userId || !createdAt) return flags;

    // Find all submissions from this user within 5 minutes
    const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
    const userSubmissions = allSubmissions.filter(s => {
        const sUserId = s.userId || s._user?.id;
        return sUserId === userId
            && s.id !== submission.id
            && Math.abs((s.createdAt || 0) - createdAt) < WINDOW_MS;
    });

    if (userSubmissions.length >= 3) {
        flags.push({
            category: 'spam_rate',
            reason: `${userSubmissions.length + 1} submissions within 5 minutes from same user`,
            severity: 'medium'
        });
    }

    return flags;
}


// ════════════════════════════════════════════════════════════════
// MAIN: Run all checks on a single submission
// ════════════════════════════════════════════════════════════════
function detectAllSuspicious(submission, buildingStats, allSubmissions) {
    const allFlags = [
        ...checkLayout(submission),
        ...checkRentOutlier(submission, buildingStats),
        ...checkTotalRent(submission, buildingStats),
        ...checkCostLogic(submission),
        ...checkTextSpam(submission),
        ...checkSigningYear(submission),
        ...checkSpamRate(submission, allSubmissions || []),
    ];
    return allFlags;
}


// ════════════════════════════════════════════════════════════════
// Build per-building + per-layout stats for deviation checks
// ════════════════════════════════════════════════════════════════
function buildBuildingStats(submissions) {
    const groups = {};

    submissions.forEach(s => {
        const hood = (s.hood || '').toLowerCase().trim();
        const layout = (s.layout || '').trim();
        const key = `${hood}|||${layout}`;
        const rent = s.rent;

        if (rent == null || rent <= 0) return;

        if (!groups[key]) groups[key] = [];
        groups[key].push(rent);
    });

    const stats = {};
    for (const [key, rents] of Object.entries(groups)) {
        const sorted = [...rents].sort((a, b) => a - b);
        const n = sorted.length;
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[Math.floor(n / 2)];
        const mean = rents.reduce((a, b) => a + b, 0) / n;

        stats[key] = { count: n, median: Math.round(median), mean: Math.round(mean) };
    }

    return stats;
}


module.exports = {
    detectAllSuspicious,
    buildBuildingStats,
    parseLayout,
    // Export individual checks for testing
    checkLayout,
    checkRentOutlier,
    checkTotalRent,
    checkCostLogic,
    checkTextSpam,
    checkSigningYear,
    checkSpamRate,
};
