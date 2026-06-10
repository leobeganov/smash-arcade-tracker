// Retro Super Smash Brothers Mock Database (Bypassed & Cleared)
// Isolated legacy data layer - all seed data is now cleanly managed inside database.js.

const FIGHTERS = [];
const PLAYERS = [];
const MATCHES = [];

// Helper to make these variables available globally in browser module context
window.SMASH_MOCK_DATA = { FIGHTERS, PLAYERS, MATCHES };
