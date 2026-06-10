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
    "sylv": "The Aggressive Rusher",
    "bones": "The Arcade Legend",
    "mojo": "The Speed Demon"
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

  const baseFighters = [
    { id: "mario", name: "Mario", img: "assets/mario.png?v=5", bio: "The versatile jumpman. An all-around fighting champion." },
    { id: "link", name: "Link", img: "assets/link.png?v=5", bio: "The hero of Hyrule. Lethal with master sword and bombs." },
    { id: "samus", name: "Samus", img: "assets/samus.png?v=5", bio: "Intergalactic bounty hunter armed with a devastating arm cannon." },
    { id: "fox", name: "Fox", img: "assets/fox.png?v=5", bio: "Leader of Star Fox. Blazing fast speed and laser reflector." },
    { id: "pikachu", name: "Pikachu", img: "assets/pikachu.png?v=5", bio: "The electric mouse. Shocks opponents with lightning speed." },
    { id: "donkey_kong", name: "Donkey Kong", img: "assets/donkey_kong.png?v=5", bio: "The powerhouse of Kong Island. Devastating giant punches." }
  ];

  // Try exact match on ID or name
  const foundBase = baseFighters.find(f => 
    f.id.toLowerCase() === fighterNameOrId.toLowerCase() || 
    f.name.toLowerCase() === fighterNameOrId.toLowerCase()
  );
  if (foundBase) return foundBase;

  // Search roster_slots data
  if (Array.isArray(rosterData)) {
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
        bio: bioText
      };
    }
  }

  // Fallback slug generation
  return {
    id: fighterNameOrId.toLowerCase().trim().replace(/\s+/g, '-'),
    name: fighterNameOrId,
    img: "assets/mario.png?v=5",
    bio: "A mysterious challenger from another dimension."
  };
}

const apiService = {
  // 1. Get Top 3 Player-Fighter Combinations for the Olympic Podium
  async getPodium() {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return [];

    const matches = await window.Database.getMatchesAsync();
    const playersList = getPlayersList(matches);
    const comboStats = {};

    matches.forEach(match => {
      if (!match.players) return;
      match.players.forEach(p => {
        const playerName = p.playerName;
        const playerObj = playersList.find(pl => pl.name.toLowerCase() === playerName.toLowerCase());
        const playerId = playerObj ? playerObj.id : playerName.toLowerCase().replace(/\s+/g, '-');
        
        const fighterObj = getFighterDetails(p.character);
        const fighterId = fighterObj.id;

        const comboKey = `${playerId}-${fighterId}`;
        if (!comboStats[comboKey]) {
          comboStats[comboKey] = {
            playerId: playerId,
            fighterId: fighterId,
            playerName: playerName,
            fighterName: p.character,
            wins: 0,
            total: 0
          };
        }
        
        comboStats[comboKey].total += 1;
        if (p.placement === 1) {
          comboStats[comboKey].wins += 1;
        }
      });
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
      const player = playersList.find(p => p.id === combo.playerId) || { 
        id: combo.playerId, 
        name: combo.playerName, 
        tagline: "The Challenger" 
      };
      const fighter = getFighterDetails(combo.fighterId);
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
  async getPlayerProfile(playerId) {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return null;

    const matches = await window.Database.getMatchesAsync();
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
      const rivalMatches = MATCHES.filter(m => m.winnerId === rival.id || m.loserId === rival.id);
      const rivalFighterCounts = {};
      rivalMatches.forEach(match => {
        const isRivalWinner = match.winnerId === rival.id;
        const fighterId = isRivalWinner ? match.winnerFighter : match.loserFighter;
        rivalFighterCounts[fighterId] = (rivalFighterCounts[fighterId] || 0) + 1;
      });
      let rivalMostUsedFighterId = null;
      let rivalMaxCount = 0;
      Object.entries(rivalFighterCounts).forEach(([fighterId, count]) => {
        if (count > rivalMaxCount) {
          rivalMaxCount = count;
          rivalMostUsedFighterId = fighterId;
        }
      });
      rivalMostUsedFighter = FIGHTERS.find(f => f.id === rivalMostUsedFighterId);
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
          img: rivalMostUsedFighter.img
        } : null
      } : null,
      mostUsedFighter: mostUsedFighter ? { name: mostUsedFighter.name, id: mostUsedFighter.id, img: mostUsedFighter.img, count: fighterCount } : null
    };
  },

  // 4. Get Fighter Profile Stats
  async getFighterProfile(fighterId) {
    await initRoster();
    await apiDelay(250);

    if (!window.Database) return null;

    const fighter = getFighterDetails(fighterId);
    if (!fighter) return null;

    const matches = await window.Database.getMatchesAsync();
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
  async getLeaderboard(sortBy = "wins", isFighterMode = false) {
    await initRoster();
    await apiDelay(250);

    let records = [];

    if (!isFighterMode) {
      // Gather Player Stats
      const matches = await window.Database.getMatchesAsync();
      const playersList = getPlayersList(matches);
      for (const player of playersList) {
        const stats = await this.getPlayerProfile(player.id);
        if (!stats) continue;
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
      // Dynamically compile slugs of fighters that exist in match history + base fighters
      const baseSlugs = ["mario", "link", "samus", "fox", "pikachu", "donkey_kong"];
      const playedSlugs = new Set(baseSlugs);
      
      if (window.Database) {
        const matches = await window.Database.getMatchesAsync();
        matches.forEach(m => {
          if (m.players) {
            m.players.forEach(p => {
              const f = getFighterDetails(p.character);
              playedSlugs.add(f.id);
            });
          }
        });
      }

      for (const fId of playedSlugs) {
        const stats = await this.getFighterProfile(fId);
        if (!stats) continue;
        const totalGames = stats.totalMatches;
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
