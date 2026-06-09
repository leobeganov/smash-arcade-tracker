// Retro Super Smash Brothers Asynchronous API Service
// Fully mimics network latency to model real-world API queries.

const apiDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const apiService = {
  // 1. Get Top 3 Player-Fighter Combinations for the Olympic Podium
  async getPodium() {
    await apiDelay(250);
    const { MATCHES, PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;

    // Aggregate wins and total games per Player-Fighter combo
    const comboStats = {};
    MATCHES.forEach(match => {
      const winKey = `${match.winnerId}-${match.winnerFighter}`;
      if (!comboStats[winKey]) {
        comboStats[winKey] = {
          playerId: match.winnerId,
          fighterId: match.winnerFighter,
          wins: 0,
          total: 0
        };
      }
      comboStats[winKey].wins += 1;
      comboStats[winKey].total += 1;

      const loseKey = `${match.loserId}-${match.loserFighter}`;
      if (!comboStats[loseKey]) {
        comboStats[loseKey] = {
          playerId: match.loserId,
          fighterId: match.loserFighter,
          wins: 0,
          total: 0
        };
      }
      comboStats[loseKey].total += 1;
    });

    // Compute Adjusted Wins score for each combo using the formula: wins^2.5 / total^1.5
    const comboScores = Object.values(comboStats).map(combo => {
      const adjustedWins = combo.total > 0 
        ? Math.pow(combo.wins, 2.5) / Math.pow(combo.total, 1.5) 
        : 0;
      return {
        ...combo,
        adjustedWins
      };
    });

    // Sort combos descending by Adjusted Wins rating
    const sortedCombos = comboScores
      .sort((a, b) => b.adjustedWins - a.adjustedWins)
      .slice(0, 3);

    // Populate combo details with full player and fighter models
    return sortedCombos.map((combo, index) => {
      const player = PLAYERS.find(p => p.id === combo.playerId);
      const fighter = FIGHTERS.find(f => f.id === combo.fighterId);
      return {
        rank: index + 1,
        wins: combo.wins,
        total: combo.total,
        adjustedWins: parseFloat(combo.adjustedWins.toFixed(2)),
        player,
        fighter
      };
    });
  },

  // 2. Search Autocomplete
  async search(query) {
    if (!query || query.trim() === "") return [];
    await apiDelay(100);
    const { PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;
    const lowerQuery = query.toLowerCase();

    const results = [];

    // Search players
    PLAYERS.forEach(player => {
      if (player.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: player.id,
          name: player.name,
          type: "player",
          label: `${player.name} (player)`,
          tagline: player.tagline
        });
      }
    });

    // Search fighters
    FIGHTERS.forEach(fighter => {
      if (fighter.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: fighter.id,
          name: fighter.name,
          type: "fighter",
          label: `${fighter.name} (fighter)`,
          img: fighter.img
        });
      }
    });

    return results;
  },

  // 3. Get Player Profile Stats
  async getPlayerProfile(playerId) {
    await apiDelay(250);
    const { MATCHES, PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;
    const player = PLAYERS.find(p => p.id === playerId);
    if (!player) return null;

    const playerMatches = MATCHES.filter(m => m.winnerId === playerId || m.loserId === playerId);
    const totalMatches = playerMatches.length;

    let wins = 0;
    let falls = 0;
    let KOs = 0;
    let damageDealtSum = 0;
    let damageTakenSum = 0;

    const opponentCounts = {};
    const fighterCounts = {};

    playerMatches.forEach(match => {
      const isWinner = match.winnerId === playerId;
      
      if (isWinner) {
        wins++;
        falls += match.winnerFalls;
        KOs += match.winnerKOs;
        damageDealtSum += match.winnerDamageDealt;
        damageTakenSum += match.winnerDamageTaken;

        // Record opponent player and fighter played
        opponentCounts[match.loserId] = (opponentCounts[match.loserId] || 0) + 1;
        fighterCounts[match.winnerFighter] = (fighterCounts[match.winnerFighter] || 0) + 1;
      } else {
        falls += match.loserFalls;
        KOs += match.loserKOs;
        damageDealtSum += match.loserDamageDealt;
        damageTakenSum += match.loserDamageTaken;

        opponentCounts[match.winnerId] = (opponentCounts[match.winnerId] || 0) + 1;
        fighterCounts[match.loserFighter] = (fighterCounts[match.loserFighter] || 0) + 1;
      }
    });

    // Find rival (most played against player, which is our Arch Nemesis)
    let rivalId = null;
    let rivalCount = 0;
    Object.entries(opponentCounts).forEach(([oppId, count]) => {
      if (count > rivalCount) {
        rivalCount = count;
        rivalId = oppId;
      }
    });
    const rival = PLAYERS.find(p => p.id === rivalId);

    // Find most used fighter (our Signature Fighter)
    let mostUsedFighterId = null;
    let fighterCount = 0;
    Object.entries(fighterCounts).forEach(([fighterId, count]) => {
      if (count > fighterCount) {
        fighterCount = count;
        mostUsedFighterId = fighterId;
      }
    });
    const mostUsedFighter = FIGHTERS.find(f => f.id === mostUsedFighterId);

    const adjustedWins = totalMatches > 0
      ? Math.pow(wins, 2.5) / Math.pow(totalMatches, 1.5)
      : 0;

    return {
      player,
      totalMatches,
      wins,
      losses: totalMatches - wins,
      adjustedWins: parseFloat(adjustedWins.toFixed(2)),
      falls,
      KOs,
      winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0",
      kdRatio: falls > 0 ? (KOs / falls).toFixed(2) : KOs.toFixed(2),
      avgDamageDealt: totalMatches > 0 ? Math.round(damageDealtSum / totalMatches) : 0,
      avgDamageTaken: totalMatches > 0 ? Math.round(damageTakenSum / totalMatches) : 0,
      rival: rival ? { name: rival.name, id: rival.id, count: rivalCount } : null,
      mostUsedFighter: mostUsedFighter ? { name: mostUsedFighter.name, id: mostUsedFighter.id, img: mostUsedFighter.img, count: fighterCount } : null
    };
  },

  // 4. Get Fighter Profile Stats
  async getFighterProfile(fighterId) {
    await apiDelay(250);
    const { MATCHES, PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;
    const fighter = FIGHTERS.find(f => f.id === fighterId);
    if (!fighter) return null;

    const fighterMatches = MATCHES.filter(m => m.winnerFighter === fighterId || m.loserFighter === fighterId);
    const totalMatches = fighterMatches.length;

    let wins = 0;
    let falls = 0;
    let KOs = 0;
    let damageDealtSum = 0;
    let damageTakenSum = 0;

    const matchupCounts = {};
    const playerUsage = {};

    fighterMatches.forEach(match => {
      const isWinnerFighter = match.winnerFighter === fighterId;

      if (isWinnerFighter) {
        wins++;
        falls += match.winnerFalls;
        KOs += match.winnerKOs;
        damageDealtSum += match.winnerDamageDealt;
        damageTakenSum += match.winnerDamageTaken;

        matchupCounts[match.loserFighter] = (matchupCounts[match.loserFighter] || 0) + 1;
        playerUsage[match.winnerId] = (playerUsage[match.winnerId] || 0) + 1;
      } else {
        falls += match.loserFalls;
        KOs += match.loserKOs;
        damageDealtSum += match.loserDamageDealt;
        damageTakenSum += match.loserDamageTaken;

        matchupCounts[match.winnerFighter] = (matchupCounts[match.winnerFighter] || 0) + 1;
        playerUsage[match.loserId] = (playerUsage[match.loserId] || 0) + 1;
      }
    });

    // Find nemesis (most vs'd fighter)
    let nemesisFighterId = null;
    let nemesisCount = 0;
    Object.entries(matchupCounts).forEach(([oppFighterId, count]) => {
      if (count > nemesisCount) {
        nemesisCount = count;
        nemesisFighterId = oppFighterId;
      }
    });
    const nemesisFighter = FIGHTERS.find(f => f.id === nemesisFighterId);

    // Find top 3 players who use this fighter most
    const topPlayers = Object.entries(playerUsage)
      .map(([playerId, count]) => {
        const player = PLAYERS.find(p => p.id === playerId);
        return { player, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const adjustedWins = totalMatches > 0
      ? Math.pow(wins, 2.5) / Math.pow(totalMatches, 1.5)
      : 0;

    return {
      fighter,
      totalMatches,
      wins,
      losses: totalMatches - wins,
      adjustedWins: parseFloat(adjustedWins.toFixed(2)),
      falls,
      KOs,
      winRate: totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : "0.0",
      kdRatio: falls > 0 ? (KOs / falls).toFixed(2) : KOs.toFixed(2),
      avgDamageDealt: totalMatches > 0 ? Math.round(damageDealtSum / totalMatches) : 0,
      avgDamageTaken: totalMatches > 0 ? Math.round(damageTakenSum / totalMatches) : 0,
      nemesis: nemesisFighter ? { name: nemesisFighter.name, id: nemesisFighter.id, img: nemesisFighter.img, count: nemesisCount } : null,
      topPlayers
    };
  },

  // 5. Get Combined Global Leaderboard Stats
  async getLeaderboard(sortBy = "wins", isFighterMode = false) {
    await apiDelay(250);
    const { PLAYERS, FIGHTERS } = window.SMASH_MOCK_DATA;

    let records = [];

    if (!isFighterMode) {
      // Gather Player Stats
      for (const player of PLAYERS) {
        const stats = await this.getPlayerProfile(player.id);
        const totalGames = stats.totalMatches;
        const adjustedWins = totalGames > 0
          ? Math.pow(stats.wins, 2.5) / Math.pow(totalGames, 1.5)
          : 0;

        records.push({
          id: player.id,
          name: player.name,
          type: "player",
          wins: stats.wins,
          totalGames,
          adjustedWins: parseFloat(adjustedWins.toFixed(2)),
          falls: stats.falls,
          KOs: stats.KOs,
          winRate: parseFloat(stats.winRate),
          kd: parseFloat(stats.kdRatio),
          detailLabel: stats.mostUsedFighter ? stats.mostUsedFighter.name : "None",
          detailId: stats.mostUsedFighter ? stats.mostUsedFighter.id : null,
          detailType: "fighter"
        });
      }
    } else {
      // Gather Fighter Stats
      for (const fighter of FIGHTERS) {
        const stats = await this.getFighterProfile(fighter.id);
        const totalGames = stats.totalMatches;
        const adjustedWins = totalGames > 0
          ? Math.pow(stats.wins, 2.5) / Math.pow(totalGames, 1.5)
          : 0;
        
        // Find player with most wins on this fighter
        const topPlayerRecord = stats.topPlayers[0];

        records.push({
          id: fighter.id,
          name: fighter.name,
          type: "fighter",
          wins: stats.wins,
          totalGames,
          adjustedWins: parseFloat(adjustedWins.toFixed(2)),
          falls: stats.falls,
          KOs: stats.KOs,
          winRate: parseFloat(stats.winRate),
          kd: parseFloat(stats.kdRatio),
          detailLabel: topPlayerRecord ? topPlayerRecord.player.name : "None",
          detailId: topPlayerRecord ? topPlayerRecord.player.id : null,
          detailType: "player"
        });
      }
    }

    // Determine actual sorting field (wins -> adjustedWins)
    const sortField = sortBy === "wins" ? "adjustedWins" : sortBy;

    // Sort records dynamically
    records.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle fallback string sorting if any
      if (typeof valA === "string") {
        return valB.localeCompare(valA);
      }
      return valB - valA;
    });

    // Append Rank
    return records.map((record, index) => ({
      rank: index + 1,
      ...record
    }));
  }
};

window.apiService = apiService;
