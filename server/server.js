const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { calculateStats } = require('./utils/statsHelper');
const { detectAllSuspicious, buildBuildingStats } = require('./utils/suspiciousDetector');

const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

// ─── Data stores ─────────────────────────────────────────────────────
let rawData = { ratings: [], submissions: [] };
let existingAddresses = [];
let addressLookup = new Set();
let aliasToCanonical = {};
let cachedBuildingStats = {};

// ─── Load all data ───────────────────────────────────────────────────
function loadAllData() {
    loadRawData();
    loadAddresses();
    buildAddressLookup();
    rebuildBuildingStats();
}

function rebuildBuildingStats() {
    cachedBuildingStats = buildBuildingStats(rawData.submissions || []);
    const keyCount = Object.keys(cachedBuildingStats).length;
    console.log(`✅ Built rent stats for ${keyCount} building+layout combos`);
}

function loadRawData() {
    try {
        const rawPath = path.join(__dirname, '..', 'data', 'Raw_data.json');
        const rawContent = fs.readFileSync(rawPath, 'utf8').trim();
        
        let parsedData;
        try {
            parsedData = JSON.parse(rawContent);
        } catch (e) {
            console.error('❌ Could not parse Raw_data.json as a valid JSON object:', e.message);
            // Fallback object just in case
            parsedData = {};
        }

        const ratings = Array.isArray(parsedData.ratings) ? parsedData.ratings : [];
        const submissions = Array.isArray(parsedData.submissions) ? parsedData.submissions : [];

        rawData = { ratings, submissions };
        console.log(`✅ Loaded raw data: ${submissions.length} submissions, ${ratings.length} ratings`);
    } catch (err) {
        console.error('❌ Error loading raw data:', err.message);
        rawData = { submissions: [], ratings: [] };
    }
}

function loadAddresses() {
    try {
        // Clear Node's require cache so we get fresh data on reload
        const addrPath = path.join(__dirname, '..', 'data', 'known_addresses.js');
        delete require.cache[require.resolve(addrPath)];
        existingAddresses = require(addrPath);
        console.log(`✅ Loaded ${existingAddresses.length} known addresses from known_addresses.js`);
    } catch (err) {
        console.error('❌ Error loading addresses:', err.message);
        existingAddresses = [];
    }
}

function buildAddressLookup() {
    addressLookup = new Set();
    aliasToCanonical = {};

    existingAddresses.forEach(a => {
        addressLookup.add(a.canonical_name.toLowerCase().trim());
        (a.aliases || []).forEach(alias => {
            const key = alias.toLowerCase().trim();
            addressLookup.add(key);
            aliasToCanonical[key] = a.canonical_name;
        });
    });
    console.log(`✅ Address lookup built: ${addressLookup.size} searchable names`);
}

function isKnownAddress(hood) {
    return addressLookup.has((hood || '').toLowerCase().trim());
}

// ─── SUSPICIOUS DETECTION ────────────────────────────────────────────
// Uses the comprehensive multi-module detector from suspiciousDetector.js
function getSuspiciousFlags(submission) {
    return detectAllSuspicious(submission, cachedBuildingStats, rawData.submissions || []);
}

// ─── Boot ────────────────────────────────────────────────────────────
loadAllData();

// ─── API ROUTES ──────────────────────────────────────────────────────

// POST /api/reload - Reload all data from disk (for when you add new addresses)
app.post('/api/reload', (req, res) => {
    console.log('\n🔄 Reloading data...');
    loadAllData();
    const submissions = rawData.submissions || [];
    let unknownCount = 0;
    submissions.forEach(s => { if (!isKnownAddress(s.hood)) unknownCount++; });
    res.json({
        success: true,
        message: 'Data reloaded successfully',
        totalSubmissions: submissions.length,
        totalAddresses: existingAddresses.length,
        unknownAddresses: unknownCount
    });
});

// GET /api/submissions
app.get('/api/submissions', (req, res) => {
    let submissions = rawData.submissions || [];
    const { layout, hasNotes, search, hood, flagged, suspicious, sortBy, sortDir } = req.query;

    if (layout && layout !== 'all') submissions = submissions.filter(s => s.layout === layout);
    if (hood && hood !== 'all') submissions = submissions.filter(s => (s.hood || '').toLowerCase() === hood.toLowerCase());
    if (hasNotes === 'true') submissions = submissions.filter(s => s.note && s.note.trim().length > 0);

    if (search) {
        const searchLower = search.toLowerCase();
        submissions = submissions.filter(s => {
            const noteText = (s.note || '').toLowerCase();
            const hoodName = (s.hood || '').toLowerCase();
            const user = (s._user?.displayName || '').toLowerCase();
            return noteText.includes(searchLower) || hoodName.includes(searchLower) || user.includes(searchLower);
        });
    }

    // Enrich with validation data
    submissions = submissions.map(s => {
        const addressValid = isKnownAddress(s.hood);
        const suspiciousFlags = getSuspiciousFlags(s);
        const reasons = suspiciousFlags.map(f => f.reason);
        const categories = [...new Set(suspiciousFlags.map(f => f.category))];
        const maxSeverity = suspiciousFlags.some(f => f.severity === 'high') ? 'high'
            : suspiciousFlags.some(f => f.severity === 'medium') ? 'medium'
            : suspiciousFlags.length > 0 ? 'low' : null;
        return {
            ...s,
            _addressValid: addressValid,
            _suspicious: suspiciousFlags.length > 0,
            _suspiciousReasons: reasons,
            _suspiciousCategories: categories,
            _suspiciousFlags: suspiciousFlags,
            _suspiciousSeverity: maxSeverity,
        };
    });

    if (flagged === 'true') submissions = submissions.filter(s => !s._addressValid);
    if (suspicious === 'true') submissions = submissions.filter(s => s._suspicious);

    // Sort
    if (sortBy) {
        const dir = sortDir === 'asc' ? 1 : -1;
        submissions.sort((a, b) => {
            let va = sortBy.includes('.') ? sortBy.split('.').reduce((o, k) => o?.[k], a) : a[sortBy];
            let vb = sortBy.includes('.') ? sortBy.split('.').reduce((o, k) => o?.[k], b) : b[sortBy];
            if (va == null) va = '';
            if (vb == null) vb = '';
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });
    } else {
        submissions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    res.json({ total: submissions.length, data: submissions });
});

// GET /api/stats
app.get('/api/stats', (req, res) => {
    let submissions = rawData.submissions || [];
    const { layout, hood } = req.query;

    if (layout && layout !== 'all') submissions = submissions.filter(s => s.layout === layout);
    if (hood && hood !== 'all') submissions = submissions.filter(s => (s.hood || '').toLowerCase() === hood.toLowerCase());

    const rents = submissions.map(s => s.rent).filter(r => r != null && r > 0);
    const utilities = submissions.map(s => s.utilityCost).filter(u => u != null);
    const parking = submissions.map(s => s.parkingCost).filter(p => p != null);

    res.json({
        count: submissions.length,
        rent: calculateStats(rents),
        utility: calculateStats(utilities),
        parking: calculateStats(parking)
    });
});

// GET /api/ratings
app.get('/api/ratings', (req, res) => { res.json(rawData.ratings || []); });

// GET /api/layouts
app.get('/api/layouts', (req, res) => {
    const layouts = [...new Set((rawData.submissions || []).map(s => s.layout).filter(Boolean))].sort();
    res.json(layouts);
});

// GET /api/hoods
app.get('/api/hoods', (req, res) => {
    const hoods = [...new Set((rawData.submissions || []).map(s => s.hood).filter(Boolean))].sort();
    res.json(hoods);
});

// GET /api/addresses
app.get('/api/addresses', (req, res) => { res.json(existingAddresses); });

// GET /api/flagged-summary
app.get('/api/flagged-summary', (req, res) => {
    const submissions = rawData.submissions || [];
    let unknownCount = 0;
    let suspiciousCount = 0;
    const unknownHoods = {};

    const categoryCounts = {};
    const severityCounts = { high: 0, medium: 0, low: 0 };

    submissions.forEach(s => {
        if (!isKnownAddress(s.hood)) {
            unknownCount++;
            const h = s.hood || 'N/A';
            unknownHoods[h] = (unknownHoods[h] || 0) + 1;
        }
        const flags = getSuspiciousFlags(s);
        if (flags.length > 0) {
            suspiciousCount++;
            flags.forEach(f => {
                categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
                if (f.severity) severityCounts[f.severity]++;
            });
        }
    });

    res.json({
        totalSubmissions: submissions.length,
        unknownAddresses: unknownCount,
        suspiciousSubmissions: suspiciousCount,
        unknownHoodBreakdown: unknownHoods,
        suspiciousByCategory: categoryCounts,
        suspiciousBySeverity: severityCounts,
    });
});

// ─── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 RMR Internal Tool running at http://localhost:${PORT}\n`);
});
