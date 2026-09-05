/**
 * Statistical helper functions
 */

function calculateStats(values) {
    if (!values || values.length === 0) {
        return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 };
    }

    const n = values.length;
    const sorted = [...values].sort((a, b) => a - b);

    // Mean
    const sum = values.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    // Median
    let median;
    if (n % 2 === 0) {
        median = (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    } else {
        median = sorted[Math.floor(n / 2)];
    }

    // Standard Deviation
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, v) => acc + v, 0) / n;
    const stdDev = Math.sqrt(avgSquaredDiff);

    // Min and Max
    const min = sorted[0];
    const max = sorted[n - 1];

    return {
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        stdDev: Math.round(stdDev * 100) / 100,
        min,
        max,
        count: n
    };
}

module.exports = { calculateStats };
