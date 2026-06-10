// Retro Super Smash Brothers Asynchronous API Service
// Fully mimics network latency to model real-world API queries.
// Re-architected to pull data dynamically from window.Database (localStorage).

const apiDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let rosterData = [];

async function initRoster() {
  if (rosterData.length > 0) return;
  try {
    const res = await fetch('assets/roster_slots.json');
    rosterData = await res.json();
  } catch (e) {
    console.error("Failed to load roster slots in apiService:", e);
  }
}

function getPlayersList(matches) {
  if (!window.Database) return [];

  if (!matches) {
    matches = window.Database.getMatches();
  }
  const playersMap = {};

  const specialTaglines = {
    "jack": "The Combo King",
    "polo": "The Technical Prodigy",
    "matt": "The Wall of Defense",
    "sylv": "The Aggressive Rusher"
  };

  matches.forEach(m => {
    if (m.players) {
      m.players.forEach(p => {
        const name = p.playerName;
        if (name) {
          const lower = name.toLowerCase().trim();
          if (!playersMap[lower]) {
            playersMap[lower] = {
              id: lower.replace(/\s+/g, '-'),
              name: name,
              tagline: specialTaglines[lower] || "The Rising Challenger"
            };
          }
        }
      });
    }
  });

  return Object.values(playersMap);
}

// Dynamically resolve details for any fighter in Smash Ultimate
function getFighterDetails(fighterNameOrId) {
  if (!fighterNameOrId) {
    return { id: "unknown", name: "Unknown", img: "assets/mario.png?v=5", bio: "A mysterious newcomer." };
  }

  // Search roster_slots data first
  if (Array.isArray(rosterData) && rosterData.length > 0) {
    const foundRoster = rosterData.find(r => 
      r.name.toLowerCase() === fighterNameOrId.toLowerCase() || 
      r.slug.toLowerCase() === fighterNameOrId.toLowerCase() ||
      (r.variants && r.variants.some(v => v.name.toLowerCase() === fighterNameOrId.toLowerCase()))
    );

    if (foundRoster) {
      const imgUrl = foundRoster.alts && foundRoster.alts[0] ? foundRoster.alts[0].image : "assets/mario.png?v=5";
      const bioText = foundRoster.variants && foundRoster.variants[0] && foundRoster.variants[0].boxing_ring_title
        ? foundRoster.variants[0].boxing_ring_title
        : "A legendary champion of the Smash arena.";
      return {
        id: foundRoster.slug,
        name: foundRoster.name,
        img: imgUrl,
        bio: bioText,
        icon: foundRoster.icon,
        series: foundRoster.series
      };
    }
  }

  const baseFighters = [
    { id: "mario", name: "Mario", img: "assets/mario.png?v=5", bio: "The versatile jumpman. An all-around fighting champion." },
    { id: "link", name: "Link", img: "assets/link.png?v=5", bio: "The hero of Hyrule. Lethal with master sword and bombs." },
    { id: "samus", name: "Samus", img: "assets/samus.png?v=5", bio: "Intergalactic bounty hunter armed with a devastating arm cannon." },
    { id: "fox", name: "Fox", img: "assets/fox.png?v=5", bio: "Leader of Star Fox. Blazing fast speed and laser reflector." },
    { id: "pikachu", name: "Pikachu", img: "assets/pikachu.png?v=5", bio: "The electric mouse. Shocks opponents with lightning speed." },
    { id: "donkey_kong", name: "Donkey Kong", img: "assets/donkey_kong.png?v=5", bio: "The powerhouse of Kong Island. Devastating giant punches." }
  ];

  // Try fallback exact match on ID or name
  const foundBase = baseFighters.find(f => 
    f.id.toLowerCase() === fighterNameOrId.toLowerCase() || 
    f.name.toLowerCase() === fighterNameOrId.toLowerCase()
  );
  if (foundBase) return foundBase;

  // Fallback slug generation
  return {
    id: fighterNameOrId.toLowerCase().trim().replace(/\s+/g, '-'),
    name: fighterNameOrId,
    img: "assets/mario.png?v=5",
    bio: "A mysterious challenger from another dimension."
  };
}

const apiService = {
  // Expose getFighterDetails globally
  getFighterDetails,

  // 1. Get Top 3 Player-Fighter Combinations for the Olympic Podium
  async getPodium(timeframe = '7days', activeStyles = ["1v1", "free-for-all", "teams"], selectedPlayers = [], selectedFighters = [], winnerPlayer = null, winnerFighter = null) {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return [];

    const allMatches = await window.Database.getMatchesAsync();
    
    // Apply timeframe filtering
    const now = Date.now();
    let matches = allMatches;

    if (timeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();
      matches = allMatches.filter(m => m.timestamp >= todayStartMs);
    } else if (timeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = allMatches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (timeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = allMatches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    // Apply activeStyles filtering
    const activeStylesLower = activeStyles.map(s => s.toLowerCase());
    matches = matches.filter(m => {
      const is1v1 = (m.gameMode && m.gameMode.toLowerCase() === '1v1') || 
                    (m.gameStyle && m.gameStyle.toLowerCase() === '1v1') || 
                    (m.players && m.players.length === 2);
      if (is1v1) {
        return activeStylesLower.includes('1v1');
      }
      const isTeams = m.gameStyle && m.gameStyle.toLowerCase() === 'teams';
      if (isTeams) {
        return activeStylesLower.includes('teams');
      }
      // Otherwise Free-for-all
      return activeStylesLower.includes('free-for-all');
    });

    // Apply winner filters (from player or fighter click-through redirections)
    if (winnerPlayer) {
      const wpLower = winnerPlayer.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.playerName.toLowerCase().trim() === wpLower && p.placement === 1));
    }
    if (winnerFighter) {
      const wfLower = winnerFighter.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.character.toLowerCase().trim() === wfLower && p.placement === 1));
    }

    // Apply player selection filtering (if any specified)
    if (selectedPlayers && selectedPlayers.length > 0) {
      const lowerPlayers = selectedPlayers.map(p => p.toLowerCase().trim());
      matches = matches.filter(m => m.players && m.players.some(p => lowerPlayers.includes(p.playerName.toLowerCase().trim())));
    }

    // Apply fighter selection filtering (if any specified)
    if (selectedFighters && selectedFighters.length > 0) {
      const lowerFighters = selectedFighters.map(f => f.toLowerCase().trim());
      matches = matches.filter(m => m.players && m.players.some(p => {
        const fighterObj = getFighterDetails(p.character);
        return lowerFighters.includes(p.character.toLowerCase().trim()) || lowerFighters.includes(fighterObj.id.toLowerCase().trim());
      }));
    }

    const playersList = getPlayersList(allMatches);
    const playerStats = {};

    matches.forEach(match => {
      if (!match.players) return;
      match.players.forEach(p => {
        // If a player filter is active, only aggregate for the searched players
        if (selectedPlayers && selectedPlayers.length > 0) {
          const isSelected = selectedPlayers.some(sp => sp.toLowerCase().trim() === p.playerName.toLowerCase().trim());
          if (!isSelected) return;
        }
        // If a fighter filter is active, only aggregate for the searched fighters
        if (selectedFighters && selectedFighters.length > 0) {
          const fighterObj = getFighterDetails(p.character);
          const isSelected = selectedFighters.some(sf => 
            sf.toLowerCase().trim() === p.character.toLowerCase().trim() ||
            sf.toLowerCase().trim() === fighterObj.id.toLowerCase().trim()
          );
          if (!isSelected) return;
        }

        const playerName = p.playerName;
        const playerObj = playersList.find(pl => pl.name.toLowerCase() === playerName.toLowerCase());
        const playerId = playerObj ? playerObj.id : playerName.toLowerCase().replace(/\s+/g, '-');
        
        if (!playerStats[playerId]) {
          playerStats[playerId] = {
            playerId: playerId,
            playerName: playerName,
            wins: 0,
            total: 0,
            characters: {}
          };
        }
        
        playerStats[playerId].total += 1;
        if (p.placement === 1) {
          playerStats[playerId].wins += 1;
        }
        
        if (!playerStats[playerId].characters[p.character]) {
          playerStats[playerId].characters[p.character] = 0;
        }
        playerStats[playerId].characters[p.character] += 1;
      });
    });

    // Compute Adjusted Wins score for each player using the formula: wins^2.5 / total^1.5
    const playerScores = Object.values(playerStats).map(player => {
      const adjustedWins = player.total > 0 
        ? Math.pow(player.wins, 2.5) / Math.pow(player.total, 1.5) 
        : 0;
      
      // Determine their most used character in this match pool
      let mostUsedFighterName = "Mario";
      let maxCount = -1;
      Object.entries(player.characters).forEach(([charName, count]) => {
        if (count > maxCount) {
          maxCount = count;
          mostUsedFighterName = charName;
        }
      });

      return {
        ...player,
        adjustedWins,
        mostUsedFighterName
      };
    });

    // Sort players descending by Adjusted Wins rating
    const sortedPlayers = playerScores
      .sort((a, b) => b.adjustedWins - a.adjustedWins)
      .slice(0, 3);

    // Populate player details with full player and fighter models
    return sortedPlayers.map((player, index) => {
      const playerObj = playersList.find(p => p.id === player.playerId) || { 
        id: player.playerId, 
        name: player.playerName, 
        tagline: "The Challenger" 
      };
      const fighter = getFighterDetails(player.mostUsedFighterName);
      return {
        rank: index + 1,
        wins: player.wins,
        total: player.total,
        adjustedWins: parseFloat(player.adjustedWins.toFixed(2)),
        player: playerObj,
        fighter
      };
    });
  },

  // 2. Search Autocomplete
  async search(query) {
    if (!query || query.trim() === "") return [];
    await initRoster();
    await apiDelay(100);
    const lowerQuery = query.toLowerCase();

    const results = [];

    // Search players
    const matches = await window.Database.getMatchesAsync();
    const playersList = getPlayersList(matches);
    playersList.forEach(player => {
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
    const seenFighterSlugs = new Set();
    const baseFighters = [
      { id: "mario", name: "Mario" },
      { id: "link", name: "Link" },
      { id: "samus", name: "Samus" },
      { id: "fox", name: "Fox" },
      { id: "pikachu", name: "Pikachu" },
      { id: "donkey_kong", name: "Donkey Kong" }
    ];

    baseFighters.forEach(f => {
      if (f.name.toLowerCase().includes(lowerQuery)) {
        const details = getFighterDetails(f.id);
        seenFighterSlugs.add(details.id);
        results.push({
          id: details.id,
          name: details.name,
          type: "fighter",
          label: `${details.name} (fighter)`,
          img: details.img
        });
      }
    });

    if (Array.isArray(rosterData)) {
      rosterData.forEach(r => {
        if (r.name.toLowerCase().includes(lowerQuery) && !seenFighterSlugs.has(r.slug)) {
          const details = getFighterDetails(r.slug);
          seenFighterSlugs.add(details.id);
          results.push({
            id: details.id,
            name: details.name,
            type: "fighter",
            label: `${details.name} (fighter)`,
            img: details.img
          });
        }
      });
    }

    return results;
  },

  // 3. Get Player Profile Stats
  async getPlayerProfile(playerId, customMatches = null) {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return null;

    const matches = customMatches || await window.Database.getMatchesAsync();
    const playersList = getPlayersList(matches);
    const player = playersList.find(p => p.id === playerId || p.name.toLowerCase() === playerId.toLowerCase());
    if (!player) return null;
    const playerMatches = matches.filter(m => 
      m.players && m.players.some(p => p.playerName.toLowerCase() === player.name.toLowerCase())
    );
    const totalMatches = playerMatches.length;

    let wins = 0;
    let falls = 0;
    let KOs = 0;
    let damageDealtSum = 0;
    let damageTakenSum = 0;

    const opponentCounts = {};
    const fighterCounts = {};

    playerMatches.forEach(match => {
      const pRec = match.players.find(p => p.playerName.toLowerCase() === player.name.toLowerCase());
      if (!pRec) return;

      const isWin = pRec.placement === 1;
      if (isWin) wins++;

      falls += Math.abs(pRec.falls || 0);
      KOs += (pRec.kos || 0);
      damageDealtSum += (pRec.damageDealt || 0);
      damageTakenSum += (pRec.damageTaken || 0);

      // Record opponent player and fighter played
      match.players.forEach(otherP => {
        if (otherP.playerName.toLowerCase() !== player.name.toLowerCase()) {
          const oppName = otherP.playerName;
          const oppObj = playersList.find(pl => pl.name.toLowerCase() === oppName.toLowerCase());
          const oppId = oppObj ? oppObj.id : oppName.toLowerCase().replace(/\s+/g, '-');
          opponentCounts[oppId] = (opponentCounts[oppId] || 0) + 1;
        }
      });

      const fighterDetails = getFighterDetails(pRec.character);
      fighterCounts[fighterDetails.id] = (fighterCounts[fighterDetails.id] || 0) + 1;
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
    const rival = playersList.find(p => p.id === rivalId) || (rivalId ? { id: rivalId, name: rivalId.charAt(0).toUpperCase() + rivalId.slice(1) } : null);

    // Find rival's most used fighter (their Signature Fighter)
    let rivalMostUsedFighter = null;
    if (rival) {
      const rivalMatches = matches.filter(m => 
        m.players && m.players.some(p => p.playerName.toLowerCase() === rival.name.toLowerCase())
      );
      const rivalFighterCounts = {};
      rivalMatches.forEach(match => {
        const pRec = match.players.find(p => p.playerName.toLowerCase() === rival.name.toLowerCase());
        if (pRec) {
          const fDetails = getFighterDetails(pRec.character);
          rivalFighterCounts[fDetails.id] = (rivalFighterCounts[fDetails.id] || 0) + 1;
        }
      });
      let rivalMostUsedFighterId = null;
      let rivalMaxCount = 0;
      Object.entries(rivalFighterCounts).forEach(([fighterId, count]) => {
        if (count > rivalMaxCount) {
          rivalMaxCount = count;
          rivalMostUsedFighterId = fighterId;
        }
      });
      rivalMostUsedFighter = rivalMostUsedFighterId ? getFighterDetails(rivalMostUsedFighterId) : null;
    }

    // Find most used fighter (our Signature Fighter)
    let mostUsedFighterId = null;
    let fighterCount = 0;
    Object.entries(fighterCounts).forEach(([fid, count]) => {
      if (count > fighterCount) {
        fighterCount = count;
        mostUsedFighterId = fid;
      }
    });
    const mostUsedFighter = mostUsedFighterId ? getFighterDetails(mostUsedFighterId) : null;

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
      rival: rival ? { 
        name: rival.name, 
        id: rival.id, 
        count: rivalCount,
        mostUsedFighter: rivalMostUsedFighter ? {
          name: rivalMostUsedFighter.name,
          id: rivalMostUsedFighter.id,
          img: rivalMostUsedFighter.img,
          icon: rivalMostUsedFighter.icon
        } : null
      } : null,
      mostUsedFighter: mostUsedFighter ? { name: mostUsedFighter.name, id: mostUsedFighter.id, img: mostUsedFighter.img, icon: mostUsedFighter.icon, count: fighterCount } : null
    };
  },

  // 4. Get Fighter Profile Stats
  async getFighterProfile(fighterId, customMatches = null) {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return null;

    const fighter = getFighterDetails(fighterId);
    if (!fighter) return null;

    const matches = customMatches || await window.Database.getMatchesAsync();
    const playersList = getPlayersList(matches);
    
    // Find all player records in any match that played this fighter
    const fighterRecords = [];
    matches.forEach(match => {
      if (!match.players) return;
      match.players.forEach(p => {
        const fDetails = getFighterDetails(p.character);
        if (fDetails.id === fighter.id) {
          fighterRecords.push({ match, playerRec: p });
        }
      });
    });

    const totalMatches = fighterRecords.length;

    let wins = 0;
    let falls = 0;
    let KOs = 0;
    let damageDealtSum = 0;
    let damageTakenSum = 0;

    const matchupCounts = {};
    const playerUsage = {};

    fighterRecords.forEach(({ match, playerRec }) => {
      const isWin = playerRec.placement === 1;
      if (isWin) wins++;

      falls += Math.abs(playerRec.falls || 0);
      KOs += (playerRec.kos || 0);
      damageDealtSum += (playerRec.damageDealt || 0);
      damageTakenSum += (playerRec.damageTaken || 0);

      // Record matchup frequencies against other fighters in the same match
      match.players.forEach(otherP => {
        const otherF = getFighterDetails(otherP.character);
        if (otherF.id !== fighter.id) {
          matchupCounts[otherF.id] = (matchupCounts[otherF.id] || 0) + 1;
        }
      });

      // Record which players used this fighter
      const pName = playerRec.playerName;
      const pObj = playersList.find(pl => pl.name.toLowerCase() === pName.toLowerCase());
      const pId = pObj ? pObj.id : pName.toLowerCase().replace(/\s+/g, '-');
      playerUsage[pId] = (playerUsage[pId] || 0) + 1;
    });

    // Find nemesis (most vs'd other fighter)
    let nemesisFighterId = null;
    let nemesisCount = 0;
    Object.entries(matchupCounts).forEach(([fid, count]) => {
      if (count > nemesisCount) {
        nemesisCount = count;
        nemesisFighterId = fid;
      }
    });
    const nemesisFighter = nemesisFighterId ? getFighterDetails(nemesisFighterId) : null;

    // Find top 3 players who use this fighter most
    const topPlayers = Object.entries(playerUsage)
      .map(([pId, count]) => {
        const player = playersList.find(p => p.id === pId) || { 
          id: pId, 
          name: pId.charAt(0).toUpperCase() + pId.slice(1), 
          tagline: "The Challenger" 
        };
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
  async getLeaderboard(sortBy = "wins", isFighterMode = false, activeStyles = ["1v1", "free-for-all", "teams"], timeframe = "alltime") {
    await initRoster();
    await apiDelay(250);

    let records = [];
    const activeStylesLower = activeStyles.map(s => s.toLowerCase());

    if (!window.Database) return [];
    
    const allMatches = await window.Database.getMatchesAsync();
    
    // Apply timeframe filtering
    const now = Date.now();
    let matches = allMatches;

    if (timeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();
      matches = allMatches.filter(m => m.timestamp >= todayStartMs);
    } else if (timeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = allMatches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (timeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = allMatches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    // Filter matches based on activeStyles
    matches = matches.filter(m => {
      const is1v1 = (m.gameMode && m.gameMode.toLowerCase() === '1v1') || 
                    (m.gameStyle && m.gameStyle.toLowerCase() === '1v1') || 
                    (m.players && m.players.length === 2);
      if (is1v1) {
        return activeStylesLower.includes('1v1');
      }
      const isTeams = m.gameStyle && m.gameStyle.toLowerCase() === 'teams';
      if (isTeams) {
        return activeStylesLower.includes('teams');
      }
      // Otherwise Free-for-all
      return activeStylesLower.includes('free-for-all');
    });

    if (!isFighterMode) {
      // Gather Player Stats
      const playersList = getPlayersList(allMatches);
      for (const player of playersList) {
        const stats = await this.getPlayerProfile(player.id, matches);
        if (!stats) continue;
        const totalGames = stats.totalMatches;
        if (totalGames === 0) continue; // Skip players with no matches under current filters
        
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
          detailType: "fighter",
          detailImg: stats.mostUsedFighter ? stats.mostUsedFighter.img : null,
          detailIcon: stats.mostUsedFighter ? stats.mostUsedFighter.icon : null
        });
      }
    } else {
      // Gather Fighter Stats
      // Dynamically compile slugs of fighters that exist in match history + base fighters
      const baseSlugs = ["mario", "link", "samus", "fox", "pikachu", "donkey_kong"];
      const playedSlugs = new Set(baseSlugs);
      
      matches.forEach(m => {
        if (m.players) {
          m.players.forEach(p => {
            const f = getFighterDetails(p.character);
            playedSlugs.add(f.id);
          });
        }
      });

      for (const fId of playedSlugs) {
        const stats = await this.getFighterProfile(fId, matches);
        if (!stats) continue;
        const totalGames = stats.totalMatches;
        if (totalGames === 0) continue; // Skip fighters with no matches under current filters
        
        const adjustedWins = totalGames > 0
          ? Math.pow(stats.wins, 2.5) / Math.pow(totalGames, 1.5)
          : 0;
        
        const topPlayerRecord = stats.topPlayers[0];

        records.push({
          id: stats.fighter.id,
          name: stats.fighter.name,
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

    // Determine actual sorting field
    const sortField = sortBy === "wins" ? "adjustedWins" : sortBy;

    // Sort records dynamically
    records.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

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
  },

  // Get all fighter names for dropdown lists
  async getAllFighters() {
    await initRoster();
    const baseFighters = ["Mario", "Link", "Samus", "Fox", "Pikachu", "Donkey Kong"];
    const rosterNames = Array.isArray(rosterData) ? rosterData.map(r => r.name) : [];
    return Array.from(new Set([...baseFighters, ...rosterNames])).sort();
  },

  // Get all stage names for dropdown lists
  async getAllStages() {
    try {
      const res = await fetch('assets/stages.json');
      const stages = await res.json();
      return stages.map(s => s.name).sort();
    } catch (e) {
      console.error("Failed to load stages in apiService:", e);
      return ["Battlefield", "Small Battlefield", "Final Destination", "Yoshi's Story", "Town and City", "Smashville", "Lylat Cruise", "Kalos Pokémon League", "Pokémon Stadium 2"].sort();
    }
  }
};

window.apiService = apiService;
