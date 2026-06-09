/**
 * Smashalytics - Database Module
 * Handles local storage CRUD operations, statistics aggregation, and dynamic profile stats compilation.
 */

const STORAGE_KEYS = {
  MATCHES: 'smashalytics_matches',
  API_KEY: 'smashalytics_api_key',
  THEME: 'smashalytics_theme',
  PLAYERS: 'smashalytics_players' // Custom nickname mappings
};

// Seed matches from the Smashalytics POC
const POC_SEED_MATCHES = [
  {
    id: "match-seed-1",
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    players: [
      { playerNumber: "P2", playerName: "jack", character: "Donkey Kong", placement: 1, kos: 4, falls: -2, sds: 0, outAt: "---" },
      { playerNumber: "P3", playerName: "polo", character: "Ness", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:12" },
      { playerNumber: "P4", playerName: "Matt", character: "Pikachu", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "3:04" },
      { playerNumber: "P1", playerName: "sylv", character: "Zero Suit Samus", placement: 4, kos: 1, falls: -3, sds: 0, outAt: "2:15" }
    ]
  },
  {
    id: "match-seed-2",
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "3-Player",
    players: [
      { playerNumber: "P2", playerName: "jack", character: "Bayonetta", placement: 1, kos: 3, falls: -2, sds: 0, outAt: "---" },
      { playerNumber: "P3", playerName: "polo", character: "Richter", placement: 2, kos: 3, falls: -3, sds: 0, outAt: "2:48" },
      { playerNumber: "P4", playerName: "Matt", character: "Terry", placement: 3, kos: 1, falls: -2, sds: -1, outAt: "1:42" }
    ]
  },
  {
    id: "match-seed-3",
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    screenType: "EndScreen",
    stage: "Final Destination",
    rules: "3 Stock, 5:00",
    gameMode: "1v1",
    players: [
      { playerNumber: "P4", playerName: "Matt", character: "Pikachu", placement: 1, kos: 3, falls: -1, sds: 0, outAt: "---" },
      { playerNumber: "P3", playerName: "polo", character: "Ness", placement: 2, kos: 1, falls: -3, sds: 0, outAt: "4:01" }
    ]
  },
  {
    id: "match-seed-4",
    timestamp: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    screenType: "EndScreen",
    stage: "Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    players: [
      { playerNumber: "P3", playerName: "polo", character: "Ness", placement: 1, kos: 4, falls: -1, sds: 0, outAt: "---" },
      { playerNumber: "P2", playerName: "jack", character: "Donkey Kong", placement: 2, kos: 3, falls: -3, sds: 0, outAt: "4:45" },
      { playerNumber: "P1", playerName: "sylv", character: "Zero Suit Samus", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "3:20" },
      { playerNumber: "P4", playerName: "Matt", character: "Pikachu", placement: 4, kos: 0, falls: -3, sds: -1, outAt: "1:55" }
    ]
  },
  {
    id: "match-seed-5",
    timestamp: Date.now() - 1000 * 60 * 60 * 96, // 4 days ago
    screenType: "EndScreen",
    stage: "Town and City",
    rules: "3 Stock, 5:00",
    gameMode: "3-Player",
    players: [
      { playerNumber: "P4", playerName: "Matt", character: "Terry", placement: 1, kos: 4, falls: -1, sds: 0, outAt: "---" },
      { playerNumber: "P2", playerName: "jack", character: "Bayonetta", placement: 2, kos: 1, falls: -3, sds: 0, outAt: "3:58" },
      { playerNumber: "P3", playerName: "polo", character: "Richter", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "2:10" }
    ]
  },
  {
    id: "match-seed-6",
    timestamp: Date.now() - 1000 * 60 * 60 * 120, // 5 days ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    players: [
      { playerNumber: "P1", playerName: "sylv", character: "Zero Suit Samus", placement: 1, kos: 3, falls: -2, sds: 0, outAt: "---" },
      { playerNumber: "P4", playerName: "Matt", character: "Pikachu", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:32" },
      { playerNumber: "P2", playerName: "jack", character: "Donkey Kong", placement: 3, kos: 2, falls: -3, sds: 0, outAt: "3:40" },
      { playerNumber: "P3", playerName: "polo", character: "Ness", placement: 4, kos: 1, falls: -3, sds: 0, outAt: "2:50" }
    ]
  },
  {
    id: "match-seed-7",
    timestamp: Date.now() - 1000 * 60 * 60 * 144, // 6 days ago
    screenType: "EndScreen",
    stage: "Yoshi's Story",
    rules: "3 Stock, 5:00",
    gameMode: "1v1",
    players: [
      { playerNumber: "P2", playerName: "jack", character: "Donkey Kong", placement: 1, kos: 3, falls: -0, sds: 0, outAt: "---" },
      { playerNumber: "P4", playerName: "Matt", character: "Terry", placement: 2, kos: 0, falls: -3, sds: 0, outAt: "3:12" }
    ]
  },
  {
    id: "match-seed-8",
    timestamp: Date.now() - 1000 * 60 * 60 * 168, // 7 days ago
    screenType: "EndScreen",
    stage: "Smashville",
    rules: "3 Stock, 5:00",
    gameMode: "3-Player",
    players: [
      { playerNumber: "P3", playerName: "polo", character: "Richter", placement: 1, kos: 3, falls: -2, sds: 0, outAt: "---" },
      { playerNumber: "P2", playerName: "jack", character: "Bayonetta", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:05" },
      { playerNumber: "P4", playerName: "Matt", character: "Pikachu", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "3:12" }
    ]
  }
];

const Database = {
  /**
   * Retrieves all matches from Local Storage.
   * If storage is empty, initialize it with converted coworker seed data + POC seed data.
   */
  getMatches() {
    let matchesJson = localStorage.getItem(STORAGE_KEYS.MATCHES);
    if (!matchesJson) {
      return this.resetToSeeds();
    }
    try {
      return JSON.parse(matchesJson).sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Failed to parse matches from localStorage', e);
      return [];
    }
  },

  /**
   * Overwrites the stored matches array.
   */
  saveMatches(matches) {
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
  },

  /**
   * Adds a new match to storage.
   */
  addMatch(match) {
    const matches = this.getMatches();
    if (!match.id) {
      match.id = 'match-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    if (!match.timestamp) {
      match.timestamp = Date.now();
    }
    matches.unshift(match);
    this.saveMatches(matches);
    return match;
  },

  /**
   * Deletes a match by its ID.
   */
  deleteMatch(id) {
    let matches = this.getMatches();
    matches = matches.filter(m => m.id !== id);
    this.saveMatches(matches);
  },

  /**
   * Updates an existing match by ID.
   */
  updateMatch(id, updatedMatch) {
    let matches = this.getMatches();
    const index = matches.findIndex(m => m.id === id);
    if (index !== -1) {
      matches[index] = { ...matches[index], ...updatedMatch, id };
      this.saveMatches(matches);
      return matches[index];
    }
    return null;
  },

  /**
   * Clears the match history completely.
   */
  clearMatches() {
    this.saveMatches([]);
  },

  /**
   * Resets the database back to original seed records, combining both datasets dynamically.
   */
  resetToSeeds() {
    let mergedSeeds = [];

    // 1. Incorporate and convert coworker's retro matches
    if (window.SMASH_MOCK_DATA) {
      const { MATCHES, PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;
      if (Array.isArray(MATCHES) && Array.isArray(PLAYERS) && Array.isArray(FIGHTERS)) {
        MATCHES.forEach(m => {
          const winner = PLAYERS.find(p => p.id === m.winnerId) || { name: m.winnerId };
          const loser = PLAYERS.find(p => p.id === m.loserId) || { name: m.loserId };
          const winFighter = FIGHTERS.find(f => f.id === m.winnerFighter) || { name: m.winnerFighter };
          const loseFighter = FIGHTERS.find(f => f.id === m.loserFighter) || { name: m.loserFighter };

          // Construct standard multi-player placement record
          mergedSeeds.push({
            id: `match-retro-${m.id}`,
            timestamp: Date.now() - (1000 * 60 * 60 * 3.5 * m.id), // staggered historical stamps
            screenType: "EndScreen",
            stage: "Battlefield",
            rules: "4 Stock, 8:00",
            gameMode: "1v1",
            gameStyle: "Free-for-All",
            players: [
              {
                playerNumber: "P1",
                playerName: winner.name,
                character: winFighter.name,
                placement: 1,
                kos: m.winnerKOs || 4,
                falls: -Math.abs(m.winnerFalls !== undefined ? m.winnerFalls : 2),
                sds: 0,
                outAt: "---",
                damageDealt: m.winnerDamageDealt || 250,
                damageTaken: m.winnerDamageTaken || 180
              },
              {
                playerNumber: "P2",
                playerName: loser.name,
                character: loseFighter.name,
                placement: 2,
                kos: m.loserKOs || 2,
                falls: -Math.abs(m.loserFalls !== undefined ? m.loserFalls : 4),
                sds: 0,
                outAt: "5:30",
                damageDealt: m.loserDamageDealt || 180,
                damageTaken: m.loserDamageTaken || 250
              }
            ]
          });
        });
      }
    }

    // 2. Incorporate POC's multi-player seeds
    mergedSeeds = mergedSeeds.concat(POC_SEED_MATCHES);

    // Sort chronologically descending
    mergedSeeds.sort((a, b) => b.timestamp - a.timestamp);

    this.saveMatches(mergedSeeds);
    return mergedSeeds;
  },

  /**
   * Gets the API key from local storage.
   */
  getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  /**
   * Saves the API key in local storage.
   */
  saveApiKey(key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
  },

  /**
   * Gets the saved UI theme.
   */
  getTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'storm';
  },

  /**
   * Saves the UI theme.
   */
  saveTheme(theme) {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  /**
   * Aggregates stats from matches for dashboards and reports.
   * Handles filtering.
   */
  getStats(filters = {}) {
    let matches = this.getMatches();

    // Apply filters
    if (filters.gameMode && filters.gameMode !== 'All') {
      matches = matches.filter(m => m.gameMode === filters.gameMode);
    }
    if (filters.stage && filters.stage !== 'All') {
      matches = matches.filter(m => m.stage === filters.stage);
    }
    if (filters.player && filters.player !== 'All') {
      matches = matches.filter(m => m.players.some(p => p.playerName.toLowerCase() === filters.player.toLowerCase()));
    }
    if (filters.character && filters.character !== 'All') {
      matches = matches.filter(m => m.players.some(p => p.character.toLowerCase() === filters.character.toLowerCase()));
    }

    const totalMatches = matches.length;

    // Track analytics maps
    const characterStats = {};
    const playerStats = {};
    const stageStats = {};

    matches.forEach(m => {
      // Stage stats
      if (!stageStats[m.stage]) {
        stageStats[m.stage] = { name: m.stage, count: 0 };
      }
      stageStats[m.stage].count++;

      // Player and character stats
      m.players.forEach(p => {
        const char = p.character || 'Unknown';
        const name = p.playerName || p.playerNumber || 'Unknown';
        const isWin = p.placement === 1;

        // Character aggregation
        if (!characterStats[char]) {
          characterStats[char] = { name: char, games: 0, wins: 0, placements: [], kos: 0, falls: 0, sds: 0 };
        }
        characterStats[char].games++;
        if (isWin) characterStats[char].wins++;
        characterStats[char].placements.push(p.placement);
        characterStats[char].kos += (p.kos || 0);
        characterStats[char].falls += Math.abs(p.falls || 0);
        characterStats[char].sds += Math.abs(p.sds || 0);

        // Player aggregation
        if (!playerStats[name]) {
          playerStats[name] = { name, games: 0, wins: 0, placements: [], kos: 0, falls: 0, sds: 0, characters: {} };
        }
        playerStats[name].games++;
        if (isWin) playerStats[name].wins++;
        playerStats[name].placements.push(p.placement);
        playerStats[name].kos += (p.kos || 0);
        playerStats[name].falls += Math.abs(p.falls || 0);
        playerStats[name].sds += Math.abs(p.sds || 0);

        if (!playerStats[name].characters[char]) {
          playerStats[name].characters[char] = 0;
        }
        playerStats[name].characters[char]++;
      });
    });

    // Helper functions for final stats lists
    const characterList = Object.values(characterStats).map(c => {
      const avgPlacement = c.placements.reduce((sum, val) => sum + val, 0) / c.placements.length;
      return {
        ...c,
        winRate: c.games > 0 ? (c.wins / c.games) * 100 : 0,
        avgPlacement: avgPlacement || 0,
        kdRatio: c.falls > 0 ? (c.kos / c.falls) : c.kos
      };
    }).sort((a, b) => b.games - a.games);

    const playerList = Object.values(playerStats).map(p => {
      const avgPlacement = p.placements.reduce((sum, val) => sum + val, 0) / p.placements.length;
      // Get favorite character
      let favoriteCharacter = 'None';
      let maxCount = 0;
      Object.entries(p.characters).forEach(([cName, count]) => {
        if (count > maxCount) {
          maxCount = count;
          favoriteCharacter = cName;
        }
      });

      return {
        ...p,
        winRate: p.games > 0 ? (p.wins / p.games) * 100 : 0,
        avgPlacement: avgPlacement || 0,
        favoriteCharacter,
        kdRatio: p.falls > 0 ? (p.kos / p.falls) : p.kos
      };
    }).sort((a, b) => b.games - a.games);

    const stageList = Object.values(stageStats).sort((a, b) => b.count - a.count);

    // High level KPIs
    const mostActiveStage = stageList[0]?.name || 'N/A';
    const topPlayer = [...playerList].sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0]?.name || 'N/A';
    const dominantCharacter = [...characterList].sort((a, b) => b.winRate - a.winRate || b.games - a.games)[0]?.name || 'N/A';

    return {
      totalMatches,
      mostActiveStage,
      topPlayer,
      dominantCharacter,
      characters: characterList,
      players: playerList,
      stages: stageList,
      recentMatches: matches.slice(0, 5)
    };
  }
};

// Bind to window to allow standard non-module script loading (fixes CORS over file://)
window.Database = Database;
