/**
 * Address validation utilities
 */

function validateAddresses(submissions, knownAddresses) {
    const knownNames = knownAddresses.map(a => a.canonical_name.toLowerCase().trim());
    const aliasMap = {};
    knownAddresses.forEach(a => {
        (a.aliases || []).forEach(alias => {
            aliasMap[alias.toLowerCase().trim()] = a.canonical_name;
        });
    });

    return submissions.map(s => {
        const hood = (s.hood || '').toLowerCase().trim();
        const isValid = knownNames.includes(hood) || Object.keys(aliasMap).includes(hood);
        return {
            ...s,
            _addressValid: isValid,
            _matchedAddress: isValid ? (aliasMap[hood] || s.hood) : null
        };
    });
}

function detectSuspicious(submission) {
    const reasons = [];

    if (submission.rent > 4000) reasons.push('Extremely high rent');
    if (submission.rent < 200 && submission.rent > 0) reasons.push('Extremely low rent');
    if (submission.rent === 0) reasons.push('Zero rent');

    const hood = (submission.hood || '').trim();
    if (hood.length <= 3 && hood.length > 0) reasons.push('Very short building name');

    return reasons;
}

module.exports = { validateAddresses, detectSuspicious };
