/**
 * Smashalytics - Database Module
 * Handles local storage CRUD operations, statistics aggregation, and dynamic profile stats compilation.
 */

const STORAGE_KEYS = {
  MATCHES: 'smashalytics_matches_v3',
  API_KEY: 'smashalytics_api_key',
  THEME: 'smashalytics_theme',
  PLAYERS: 'smashalytics_players' // Custom nickname mappings
};

// Seed matches from the Smashalytics POC
const POC_SEED_MATCHES = [
  {
    id: "match-seed-1",
    timestamp: Date.now() - 1000 * 60 * 60 * 1, // 1 hour ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "1v1",
    gameStyle: "1v1",
    players: [
      { playerNumber: "P1", playerName: "Matt", character: "Pikachu", placement: 1, kos: 3, falls: -1, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Leo", character: "Joker", placement: 2, kos: 1, falls: -3, sds: 0, outAt: "4:15", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-2",
    timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    screenType: "EndScreen",
    stage: "Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "3-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Jack", character: "Donkey Kong", placement: 1, kos: 4, falls: -2, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Polo", character: "Ness", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:02", teamColor: "None" },
      { playerNumber: "P3", playerName: "Ceets", character: "Zelda", placement: 3, kos: 1, falls: -3, sds: -1, outAt: "2:45", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-3",
    timestamp: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
    screenType: "EndScreen",
    stage: "Final Destination",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Leo", character: "Joker", placement: 1, kos: 4, falls: -1, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Matt", character: "Pikachu", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:30", teamColor: "None" },
      { playerNumber: "P3", playerName: "Polo", character: "Ness", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "3:15", teamColor: "None" },
      { playerNumber: "P4", playerName: "Jack", character: "Donkey Kong", placement: 4, kos: 0, falls: -3, sds: -1, outAt: "1:50", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-4",
    timestamp: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Jack", character: "Terry", placement: 1, kos: 3, falls: -2, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Leo", character: "Sephiroth", placement: 2, kos: 3, falls: -3, sds: 0, outAt: "4:45", teamColor: "None" },
      { playerNumber: "P3", playerName: "Ceets", character: "Peach", placement: 3, kos: 2, falls: -3, sds: 0, outAt: "3:40", teamColor: "None" },
      { playerNumber: "P4", playerName: "Matt", character: "Mario", placement: 4, kos: 1, falls: -3, sds: 0, outAt: "2:20", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-5",
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    screenType: "EndScreen",
    stage: "Town and City",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Polo", character: "Richter", placement: 1, kos: 5, falls: -1, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Jack", character: "Banjo & Kazooie", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:10", teamColor: "None" },
      { playerNumber: "P3", playerName: "Matt", character: "Link", placement: 3, kos: 1, falls: -3, sds: 0, outAt: "3:02", teamColor: "None" },
      { playerNumber: "P4", playerName: "Leo", character: "Cloud", placement: 4, kos: 0, falls: -3, sds: -1, outAt: "1:40", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-6",
    timestamp: Date.now() - 1000 * 60 * 60 * 36, // 1.5 days ago
    screenType: "EndScreen",
    stage: "Smashville",
    rules: "3 Stock, 5:00",
    gameMode: "5-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Ceets", character: "Samus", placement: 1, kos: 4, falls: -2, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Matt", character: "Pikachu", placement: 2, kos: 3, falls: -3, sds: 0, outAt: "4:25", teamColor: "None" },
      { playerNumber: "P3", playerName: "Polo", character: "Fox", placement: 3, kos: 2, falls: -3, sds: 0, outAt: "3:30", teamColor: "None" },
      { playerNumber: "P4", playerName: "Jack", character: "Bowser", placement: 4, kos: 1, falls: -3, sds: -1, outAt: "2:15", teamColor: "None" },
      { playerNumber: "P5", playerName: "Leo", character: "Joker", placement: 5, kos: 1, falls: -3, sds: 0, outAt: "1:30", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-7",
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "6-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Leo", character: "Byleth", placement: 1, kos: 5, falls: -1, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Jack", character: "Donkey Kong", placement: 2, kos: 3, falls: -3, sds: 0, outAt: "4:40", teamColor: "None" },
      { playerNumber: "P3", playerName: "Polo", character: "Hero", placement: 3, kos: 2, falls: -3, sds: 0, outAt: "3:50", teamColor: "None" },
      { playerNumber: "P4", playerName: "Ceets", character: "Zelda", placement: 4, kos: 2, falls: -3, sds: -1, outAt: "2:55", teamColor: "None" },
      { playerNumber: "P5", playerName: "Matt", character: "Sonic", placement: 5, kos: 1, falls: -3, sds: 0, outAt: "2:10", teamColor: "None" },
      { playerNumber: "P6", playerName: "Sylv", character: "Zero Suit Samus", placement: 6, kos: 0, falls: -3, sds: 0, outAt: "1:15", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-8",
    timestamp: Date.now() - 1000 * 60 * 60 * 72, // 3 days ago
    screenType: "EndScreen",
    stage: "Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "7-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Matt", character: "Pikachu", placement: 1, kos: 5, falls: -2, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Ceets", character: "Peach", placement: 2, kos: 4, falls: -3, sds: 0, outAt: "4:50", teamColor: "None" },
      { playerNumber: "P3", playerName: "Leo", character: "Pyra/Mythra", placement: 3, kos: 3, falls: -3, sds: 0, outAt: "4:05", teamColor: "None" },
      { playerNumber: "P4", playerName: "Jack", character: "Kazuya", placement: 4, kos: 2, falls: -3, sds: -1, outAt: "3:20", teamColor: "None" },
      { playerNumber: "P5", playerName: "Polo", character: "Ness", placement: 5, kos: 2, falls: -3, sds: 0, outAt: "2:30", teamColor: "None" },
      { playerNumber: "P6", playerName: "Sylv", character: "Snake", placement: 6, kos: 1, falls: -3, sds: 0, outAt: "1:45", teamColor: "None" },
      { playerNumber: "P7", playerName: "Bones", character: "Mario", placement: 7, kos: 0, falls: -3, sds: 0, outAt: "1:05", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-9",
    timestamp: Date.now() - 1000 * 60 * 60 * 96, // 4 days ago
    screenType: "EndScreen",
    stage: "Final Destination",
    rules: "3 Stock, 5:00",
    gameMode: "8-Player",
    gameStyle: "Free-for-All",
    players: [
      { playerNumber: "P1", playerName: "Jack", character: "Donkey Kong", placement: 1, kos: 6, falls: -1, sds: 0, outAt: "---", teamColor: "None" },
      { playerNumber: "P2", playerName: "Matt", character: "Pikachu", placement: 2, kos: 4, falls: -3, sds: 0, outAt: "4:55", teamColor: "None" },
      { playerNumber: "P3", playerName: "Leo", character: "Joker", placement: 3, kos: 3, falls: -3, sds: 0, outAt: "4:20", teamColor: "None" },
      { playerNumber: "P4", playerName: "Ceets", character: "Zelda", placement: 4, kos: 2, falls: -3, sds: -1, outAt: "3:40", teamColor: "None" },
      { playerNumber: "P5", playerName: "Polo", character: "Ness", placement: 5, kos: 2, falls: -3, sds: 0, outAt: "3:00", teamColor: "None" },
      { playerNumber: "P6", playerName: "Sylv", character: "Zero Suit Samus", placement: 6, kos: 1, falls: -3, sds: 0, outAt: "2:15", teamColor: "None" },
      { playerNumber: "P7", playerName: "Bones", character: "Mario", placement: 7, kos: 1, falls: -3, sds: 0, outAt: "1:35", teamColor: "None" },
      { playerNumber: "P8", playerName: "Mojo", character: "Link", placement: 8, kos: 0, falls: -3, sds: 0, outAt: "0:55", teamColor: "None" }
    ]
  },
  {
    id: "match-seed-10",
    timestamp: Date.now() - 1000 * 60 * 60 * 120, // 5 days ago
    screenType: "EndScreen",
    stage: "Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "8-Player",
    gameStyle: "Teams",
    players: [
      { playerNumber: "P1", playerName: "Matt", character: "Pikachu", placement: 1, kos: 4, falls: -1, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P2", playerName: "Jack", character: "Donkey Kong", placement: 1, kos: 3, falls: -2, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P3", playerName: "Polo", character: "Ness", placement: 1, kos: 2, falls: -2, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P4", playerName: "Bones", character: "Mario", placement: 1, kos: 1, falls: -3, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P5", playerName: "Leo", character: "Joker", placement: 2, kos: 2, falls: -3, sds: 0, outAt: "4:40", teamColor: "Blue" },
      { playerNumber: "P6", playerName: "Ceets", character: "Zelda", placement: 2, kos: 1, falls: -3, sds: -1, outAt: "3:55", teamColor: "Blue" },
      { playerNumber: "P7", playerName: "Sylv", character: "Zero Suit Samus", placement: 2, kos: 1, falls: -3, sds: 0, outAt: "3:10", teamColor: "Blue" },
      { playerNumber: "P8", playerName: "Mojo", character: "Link", placement: 2, kos: 0, falls: -3, sds: 0, outAt: "2:25", teamColor: "Blue" }
    ]
  },
  {
    id: "match-seed-11",
    timestamp: Date.now() - 1000 * 60 * 60 * 144, // 6 days ago
    screenType: "EndScreen",
    stage: "Small Battlefield",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    gameStyle: "Teams",
    players: [
      { playerNumber: "P1", playerName: "Matt", character: "Pikachu", placement: 1, kos: 3, falls: -1, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P2", playerName: "Leo", character: "Joker", placement: 1, kos: 2, falls: -2, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P3", playerName: "Polo", character: "Ness", placement: 2, kos: 1, falls: -3, sds: 0, outAt: "4:15", teamColor: "Blue" },
      { playerNumber: "P4", playerName: "Jack", character: "Donkey Kong", placement: 2, kos: 0, falls: -3, sds: -1, outAt: "3:20", teamColor: "Blue" }
    ]
  },
  {
    id: "match-seed-12",
    timestamp: Date.now() - 1000 * 60 * 60 * 168, // 7 days ago
    screenType: "EndScreen",
    stage: "Town and City",
    rules: "3 Stock, 5:00",
    gameMode: "4-Player",
    gameStyle: "Teams",
    players: [
      { playerNumber: "P1", playerName: "Jack", character: "Donkey Kong", placement: 1, kos: 2, falls: -1, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P2", playerName: "Polo", character: "Ness", placement: 1, kos: 2, falls: -2, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P3", playerName: "Ceets", character: "Zelda", placement: 1, kos: 1, falls: -2, sds: 0, outAt: "---", teamColor: "Red" },
      { playerNumber: "P4", playerName: "Leo", character: "Joker", placement: 2, kos: 4, falls: -3, sds: 0, outAt: "4:50", teamColor: "Blue" }
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
    // Automatically set 2-player matches to "1v1" mode and style
    if (match.players && match.players.length === 2) {
      match.gameMode = "1v1";
      match.gameStyle = "1v1";
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
      const merged = { ...matches[index], ...updatedMatch, id };
      // Automatically set 2-player matches to "1v1" mode and style
      if (merged.players && merged.players.length === 2) {
        merged.gameMode = "1v1";
        merged.gameStyle = "1v1";
      }
      matches[index] = merged;
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

    // Incorporate POC's multi-player seeds
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
  },

  // --- Asynchronous API Emulation (Postgres Ready Adapter) ---
  async getMatchesAsync() {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.getMatches();
  },

  async saveMatchesAsync(matches) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.saveMatches(matches);
  },

  async addMatchAsync(match) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.addMatch(match);
  },

  async deleteMatchAsync(id) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.deleteMatch(id);
  },

  async updateMatchAsync(id, updatedMatch) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.updateMatch(id, updatedMatch);
  },

  async clearMatchesAsync() {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.clearMatches();
  },

  async resetToSeedsAsync() {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.resetToSeeds();
  },

  async getStatsAsync(filters = {}) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return this.getStats(filters);
  }
};

// Bind to window to allow standard non-module script loading (fixes CORS over file://)
window.Database = Database;
