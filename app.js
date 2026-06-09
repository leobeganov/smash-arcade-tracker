// Retro Super Smash Brothers Application Logic
// Orchestrates routing, VS transition animations, autocomplete, and leaderboard sorting.

document.addEventListener("DOMContentLoaded", () => {
  const api = window.apiService;

  // --- Global State ---
  let currentLeaderboardMode = "players"; // "players" or "fighters"
  let currentSortBy = "wins";
  let activeSearchHighlightIndex = -1;
  let searchResults = [];

  // --- DOM Elements ---
  const views = {
    home: document.getElementById("home-view"),
    player: document.getElementById("player-profile-view"),
    fighter: document.getElementById("fighter-profile-view"),
    leaderboard: document.getElementById("leaderboard-view")
  };

  const searchBox = document.getElementById("search-box");
  const searchDropdown = document.getElementById("search-dropdown");
  const vsOverlay = document.getElementById("vs-overlay");

  // ==========================================
  // 2. VS Screen Loading Transition Controller (Simplified Curtains Only)
  // ==========================================
  async function runVsTransition() {
    vsOverlay.classList.add("active");
    // Wait for curtains to close (e.g. 250ms)
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  async function endVsTransition() {
    // Wait a brief moment before sliding curtains out
    await new Promise(resolve => setTimeout(resolve, 50));
    vsOverlay.classList.remove("active");
  }

  // ==========================================
  // Client Router
  // ==========================================
  async function router() {
    const hash = window.location.hash || "#home";
    const [route, id] = hash.slice(1).split("/");

    closeSearch();

    let target = "home";
    if (route === "player" && id) target = "player";
    else if (route === "fighter" && id) target = "fighter";
    else if (route === "leaderboard") target = "leaderboard";

    // Run transition in-between view switches
    await runVsTransition();

    // Toggle active views
    Object.keys(views).forEach(key => {
      if (key === target) {
        views[key].classList.add("active");
      } else {
        views[key].classList.remove("active");
      }
    });

    // Render corresponding view data
    if (target === "home") {
      await renderHome();
    } else if (target === "player") {
      await renderPlayerProfile(id);
    } else if (target === "fighter") {
      await renderFighterProfile(id);
    } else if (target === "leaderboard") {
      await renderLeaderboard();
    }

    await endVsTransition();
  }

  // Bind router and trigger initial routing
  window.addEventListener("hashchange", router);
  router();


  // ==========================================
  // 3. Render Home (The Main Stage)
  // ==========================================
  async function renderHome() {
    const podiumData = await api.getPodium();

    // Populate Gold (1st)
    const gold = podiumData.find(p => p.rank === 1);
    if (gold) {
      document.getElementById("podium-gold-img").src = gold.fighter.img;
      document.getElementById("podium-gold-name").textContent = gold.player.name;
      document.getElementById("podium-gold-stat").textContent = `${gold.wins}/${gold.total} WINS (${gold.fighter.name})`;
      
      const goldPlaque = document.getElementById("podium-gold-plaque");
      goldPlaque.onclick = () => window.location.hash = `#player/${gold.player.id}`;
    }

    // Populate Silver (2nd)
    const silver = podiumData.find(p => p.rank === 2);
    if (silver) {
      document.getElementById("podium-silver-img").src = silver.fighter.img;
      document.getElementById("podium-silver-name").textContent = silver.player.name;
      document.getElementById("podium-silver-stat").textContent = `${silver.wins}/${silver.total} WINS (${silver.fighter.name})`;
      
      const silverPlaque = document.getElementById("podium-silver-plaque");
      silverPlaque.onclick = () => window.location.hash = `#player/${silver.player.id}`;
    }

    // Populate Bronze (3rd)
    const bronze = podiumData.find(p => p.rank === 3);
    if (bronze) {
      document.getElementById("podium-bronze-img").src = bronze.fighter.img;
      document.getElementById("podium-bronze-name").textContent = bronze.player.name;
      document.getElementById("podium-bronze-stat").textContent = `${bronze.wins}/${bronze.total} WINS (${bronze.fighter.name})`;
      
      const bronzePlaque = document.getElementById("podium-bronze-plaque");
      bronzePlaque.onclick = () => window.location.hash = `#player/${bronze.player.id}`;
    }
  }


  // ==========================================
  // 4. Render Player Profile
  // ==========================================
  async function renderPlayerProfile(playerId) {
    const stats = await api.getPlayerProfile(playerId);
    if (!stats) return;

    // Sidebar Portrait and Info
    document.getElementById("player-profile-fighter-img").src = stats.mostUsedFighter ? stats.mostUsedFighter.img : "assets/mario.png?v=5";
    document.getElementById("player-profile-name").textContent = stats.player.name;
    document.getElementById("player-profile-tagline").textContent = stats.player.tagline;

    // Stat grids
    document.getElementById("player-stat-wins").textContent = stats.adjustedWins;
    document.getElementById("player-stat-wins-raw").textContent = `${stats.wins} / ${stats.totalMatches} WINS`;
    document.getElementById("player-stat-losses").textContent = stats.losses;
    document.getElementById("player-stat-winrate").textContent = `${stats.winRate}%`;
    document.getElementById("player-stat-kd").textContent = stats.kdRatio;

    // Render Signature Fighter
    const sigCard = document.getElementById("player-sig-card");
    const sigImg = document.getElementById("player-sig-img");
    const sigName = document.getElementById("player-sig-name");
    const sigCount = document.getElementById("player-sig-count");

    if (stats.mostUsedFighter) {
      sigImg.src = `${stats.mostUsedFighter.img}`;
      sigImg.style.display = "block";
      sigName.textContent = stats.mostUsedFighter.name;
      sigCount.textContent = `${stats.mostUsedFighter.count} games`;
      sigCard.onclick = () => {
        window.location.hash = `#fighter/${stats.mostUsedFighter.id}`;
      };
      sigCard.style.cursor = "pointer";
    } else {
      sigImg.style.display = "none";
      sigName.textContent = "None";
      sigCount.textContent = "0 games";
      sigCard.onclick = null;
      sigCard.style.cursor = "default";
    }

    // Render Arch Nemesis
    const nemesisCard = document.getElementById("player-nemesis-card");
    const nemesisName = document.getElementById("player-nemesis-name");
    const nemesisCount = document.getElementById("player-nemesis-count");

    if (stats.rival) {
      nemesisName.textContent = stats.rival.name;
      nemesisCount.textContent = `${stats.rival.count} encounters`;
      nemesisCard.onclick = () => {
        window.location.hash = `#player/${stats.rival.id}`;
      };
      nemesisCard.style.cursor = "pointer";
    } else {
      nemesisName.textContent = "None";
      nemesisCount.textContent = "0 encounters";
      nemesisCard.onclick = null;
      nemesisCard.style.cursor = "default";
    }
  }


  // ==========================================
  // 5. Render Fighter Profile
  // ==========================================
  async function renderFighterProfile(fighterId) {
    const stats = await api.getFighterProfile(fighterId);
    if (!stats) return;

    // Sidebar Portrait and Bio
    document.getElementById("fighter-profile-img").src = stats.fighter.img;
    document.getElementById("fighter-profile-name").textContent = stats.fighter.name;
    document.getElementById("fighter-profile-bio").textContent = stats.fighter.bio;

    // Stat grids
    document.getElementById("fighter-stat-wins").textContent = stats.adjustedWins;
    document.getElementById("fighter-stat-wins-raw").textContent = `${stats.wins} / ${stats.totalMatches} WINS`;
    document.getElementById("fighter-stat-losses").textContent = stats.losses;
    document.getElementById("fighter-stat-winrate").textContent = `${stats.winRate}%`;
    document.getElementById("fighter-stat-kd").textContent = stats.kdRatio;

    // Render Nemesis Fighter
    const nemesisImg = document.getElementById("fighter-nemesis-img");
    const nemesisName = document.getElementById("fighter-nemesis-name");
    const nemesisCount = document.getElementById("fighter-nemesis-count");

    if (stats.nemesis) {
      nemesisImg.src = `${stats.nemesis.img}`;
      nemesisImg.style.display = "block";
      nemesisName.textContent = stats.nemesis.name;
      nemesisCount.textContent = `${stats.nemesis.count} matchups`;
    } else {
      nemesisImg.style.display = "none";
      nemesisName.textContent = "None";
      nemesisCount.textContent = "0 matchups";
    }

    // Render Top Players
    const topPlayersContainer = document.getElementById("fighter-top-players");
    topPlayersContainer.innerHTML = "";

    if (stats.topPlayers && stats.topPlayers.length > 0) {
      stats.topPlayers.forEach((tp, i) => {
        const item = document.createElement("div");
        item.className = "top-player-item";
        item.innerHTML = `
          <span class="top-player-rank">#${i + 1}</span>
          <span class="top-player-name text-glow-yellow">${tp.player.name}</span>
          <span class="top-player-count">${tp.count} wins</span>
        `;
        item.style.cursor = "pointer";
        item.onclick = () => {
          window.location.hash = `#player/${tp.player.id}`;
        };
        topPlayersContainer.appendChild(item);
      });
    } else {
      topPlayersContainer.innerHTML = `<div style="font-family: var(--font-stats); opacity: 0.6; font-size: 13px;">NO BATTLE RECORD</div>`;
    }
  }


  // ==========================================
  // 6. Render Global Leaderboard
  // ==========================================
  async function renderLeaderboard() {
    const isFighterMode = currentLeaderboardMode === "fighters";
    const headerTitle = document.getElementById("leaderboard-header-title");
    headerTitle.textContent = isFighterMode ? "RANKINGS: FIGHTER MODE" : "RANKINGS: PLAYER MODE";

    // Dynamic Headers based on Mode
    const headersRow = document.getElementById("leaderboard-table-headers");
    headersRow.innerHTML = "";

    const headers = [
      { key: "rank", label: "Rank" },
      { key: "name", label: isFighterMode ? "Fighter" : "Player" },
      { key: "wins", label: "Adj Wins" },
      { key: "KOs", label: "KOs" },
      { key: "winRate", label: "Win %" },
      { key: "kd", label: "K/D" },
      { key: "detailLabel", label: isFighterMode ? "Top Player" : "Signature" }
    ];

    headers.forEach(h => {
      const th = document.createElement("th");
      th.textContent = h.label;

      // Make fields sortable except Rank
      if (h.key !== "rank") {
        th.className = "sortable-th";
        if (currentSortBy === h.key) {
          th.classList.add("sorted-desc");
        }
        th.onclick = () => {
          currentSortBy = h.key;
          renderLeaderboard();
        };
      }
      headersRow.appendChild(th);
    });

    // Fetch and Sort Data
    const records = await api.getLeaderboard(currentSortBy, isFighterMode);

    // Populate rows
    const rowsBody = document.getElementById("leaderboard-rows");
    rowsBody.innerHTML = "";

    records.forEach(rec => {
      const tr = document.createElement("tr");

      // Custom link paths
      const mainLink = rec.type === "player" ? `#player/${rec.id}` : `#fighter/${rec.id}`;
      const detailLink = rec.detailType === "player" ? `#player/${rec.detailId}` : `#fighter/${rec.detailId}`;

      tr.innerHTML = `
        <td class="rank-cell">#${rec.rank}</td>
        <td class="name-cell text-glow-cyan" onclick="window.location.hash = '${mainLink}'">${rec.name}</td>
        <td class="numeric-cell text-glow-yellow">${rec.adjustedWins} <span style="font-size: 13px; opacity: 0.6; font-family: var(--font-stats);">(${rec.wins}/${rec.totalGames})</span></td>
        <td class="numeric-cell">${rec.KOs}</td>
        <td class="numeric-cell">${rec.winRate}%</td>
        <td class="numeric-cell text-glow-magenta">${rec.kd}</td>
        <td class="name-cell text-glow-yellow" onclick="window.location.hash = '${detailLink}'">${rec.detailLabel}</td>
      `;

      rowsBody.appendChild(tr);
    });
  }


  // ==========================================
  // 7. Autocomplete Search Bar Implementation
  // ==========================================
  searchBox.addEventListener("input", async (e) => {
    const query = e.target.value;
    activeSearchHighlightIndex = -1;

    if (!query || query.trim() === "") {
      closeSearch();
      return;
    }

    searchResults = await api.search(query);
    renderSearchResults(searchResults);
  });

  function renderSearchResults(results) {
    searchDropdown.innerHTML = "";

    if (results.length === 0) {
      searchDropdown.innerHTML = `<div style="padding: 12px 20px; font-family: var(--font-header); font-size: 14px; color: #777;">NO ENCOUNTERS FOUND</div>`;
      searchDropdown.style.display = "block";
      return;
    }

    results.forEach((res, index) => {
      const row = document.createElement("div");
      row.className = "search-result-item";
      if (index === activeSearchHighlightIndex) {
        row.classList.add("highlighted");
      }

      // Add a distinct colored suffix depending on the type
      const badgeColor = res.type === "player" ? "var(--color-neon-magenta)" : "var(--color-neon-cyan)";
      row.innerHTML = `
        <span>${res.name}</span>
        <span class="result-type" style="color: ${badgeColor}; border-color: ${badgeColor};">${res.type}</span>
      `;

      row.onclick = () => {
        selectSearchResult(res);
      };

      searchDropdown.appendChild(row);
    });

    searchDropdown.style.display = "block";
  }

  function selectSearchResult(res) {
    searchBox.value = "";
    closeSearch();
    if (res.type === "player") {
      window.location.hash = `#player/${res.id}`;
    } else {
      window.location.hash = `#fighter/${res.id}`;
    }
  }

  function closeSearch() {
    searchDropdown.style.display = "none";
    activeSearchHighlightIndex = -1;
  }

  // Handle keyboard navigation within search bar
  searchBox.addEventListener("keydown", (e) => {
    const items = searchDropdown.getElementsByClassName("search-result-item");
    if (!items || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSearchHighlightIndex = (activeSearchHighlightIndex + 1) % searchResults.length;
      updateHighlight(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSearchHighlightIndex = (activeSearchHighlightIndex - 1 + searchResults.length) % searchResults.length;
      updateHighlight(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSearchHighlightIndex >= 0 && activeSearchHighlightIndex < searchResults.length) {
        selectSearchResult(searchResults[activeSearchHighlightIndex]);
      }
    } else if (e.key === "Escape") {
      closeSearch();
    }
  });

  function updateHighlight(items) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.remove("highlighted");
    }
    if (activeSearchHighlightIndex >= 0 && activeSearchHighlightIndex < items.length) {
      items[activeSearchHighlightIndex].classList.add("highlighted");
      items[activeSearchHighlightIndex].scrollIntoView({ block: "nearest" });
    }
  }

  // Click outside search closing logic
  document.addEventListener("click", (e) => {
    if (!searchBox.contains(e.target) && !searchDropdown.contains(e.target)) {
      closeSearch();
    }
  });


  // ==========================================
  // 8. Event Listeners for UI Layout Actions
  // ==========================================

  // Logo home button clicks
  document.getElementById("nav-logo-home").onclick = () => {
    window.location.hash = "#home";
  };

  // Nav Leaderboard button click
  document.getElementById("nav-btn-leaderboard").onclick = () => {
    window.location.hash = "#leaderboard";
  };

  // "Back to Select Select" / Home clicks
  const backButtons = document.getElementsByClassName("btn-back-home");
  for (let i = 0; i < backButtons.length; i++) {
    backButtons[i].onclick = () => {
      window.location.hash = "#home";
    };
  }

  // Leaderboard togglers
  const togglePlayers = document.getElementById("toggle-btn-players");
  const toggleFighters = document.getElementById("toggle-btn-fighters");

  togglePlayers.onclick = () => {
    togglePlayers.classList.add("active");
    toggleFighters.classList.remove("active");
    currentLeaderboardMode = "players";
    currentSortBy = "wins"; // Reset sort default
    renderLeaderboard();
  };

  toggleFighters.onclick = () => {
    toggleFighters.classList.add("active");
    togglePlayers.classList.remove("active");
    currentLeaderboardMode = "fighters";
    currentSortBy = "wins"; // Reset sort default
    renderLeaderboard();
  };
});
