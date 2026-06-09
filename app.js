// Retro Super Smash Brothers Application Logic
// Orchestrates routing, VS transition animations, autocomplete, leaderboard sorting,
// OCR Scanning, Battle Records listing/filtering, Telemetry dashboards, and Cabinet specifications.

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
    leaderboard: document.getElementById("leaderboard-view"),
    scanner: document.getElementById("scanner-view"),
    history: document.getElementById("history-view"),
    telemetry: document.getElementById("telemetry-view"),
    settings: document.getElementById("settings-view")
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
    else if (route === "scanner") target = "scanner";
    else if (route === "history") target = "history";
    else if (route === "telemetry") target = "telemetry";
    else if (route === "settings") target = "settings";

    // Update active state in nav tabs
    const navTabs = ["home", "leaderboard", "scanner", "history", "telemetry", "settings"];
    navTabs.forEach(tab => {
      const el = document.getElementById(`nav-tab-${tab}`);
      if (el) {
        if (tab === route || (tab === "home" && !route)) {
          el.classList.add("active");
        } else {
          el.classList.remove("active");
        }
      }
    });

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
    } else if (target === "scanner") {
      await renderScanner();
    } else if (target === "history") {
      await renderHistory();
    } else if (target === "telemetry") {
      await renderTelemetry();
    } else if (target === "settings") {
      await renderSettings();
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
  // OCR Scanner View Controllers
  // ==========================================
  async function renderScanner() {
    const apiKey = window.Database.getApiKey();
    const warningPrompt = document.getElementById("api-key-warning");
    if (apiKey) {
      warningPrompt.style.display = "none";
    } else {
      warningPrompt.style.display = "block";
    }
    document.getElementById("scanner-status").style.display = "none";
    document.getElementById("scanner-laser").style.display = "none";
    document.getElementById("scanner-confirm-panel").style.display = "none";
  }

  // File processing and scanning
  async function processFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      alert("PLEASE ATTACH A VALID IMAGE SIGNAL.");
      return;
    }

    const confirmPanel = document.getElementById("scanner-confirm-panel");
    const statusElement = document.getElementById("scanner-status");
    const laserElement = document.getElementById("scanner-laser");
    const progressFill = document.getElementById("scanner-progress-fill");
    const statusText = document.getElementById("scanner-status-text");

    confirmPanel.style.display = "none";
    statusElement.style.display = "block";
    laserElement.style.display = "block";
    progressFill.style.width = "0%";
    statusText.textContent = "INITIALIZING DIGITAL DECRYPTER...";

    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 8) + 3;
        if (progress > 90) progress = 90;
        progressFill.style.width = `${progress}%`;
      }
    }, 150);

    try {
      const apiKey = window.Database.getApiKey();
      let result;

      if (!apiKey) {
        statusText.textContent = "API DECRYPT KEY MISSING. RUNNING MOCK INTERPRETER...";
        result = await mockOcrScan();
      } else {
        statusText.textContent = "DECRYPTING WITH GEMINI COGNITIVE SCANNER...";
        const base64Str = await readFileAsBase64(file);
        const characters = await api.getAllFighters();
        const stages = await api.getAllStages();
        result = await window.Gemini.interpretScreenshot(base64Str, file.type, apiKey, characters, stages);
      }

      clearInterval(progressInterval);
      progressFill.style.width = "100%";
      statusText.textContent = "MATRIX DECRYPTION COMPLETE!";

      setTimeout(() => {
        statusElement.style.display = "none";
        laserElement.style.display = "none";
        showConfirmEditor(result);
      }, 500);

    } catch (e) {
      clearInterval(progressInterval);
      statusElement.style.display = "none";
      laserElement.style.display = "none";
      alert("CABINET DIAGNOSTIC ERROR: " + e.message);
    }
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function mockOcrScan() {
    return new Promise(resolve => {
      setTimeout(() => {
        const mockStages = ["Small Battlefield", "Battlefield", "Final Destination", "Smashville", "Town and City"];
        const randomStage = mockStages[Math.floor(Math.random() * mockStages.length)];
        const mockCharacters = ["Donkey Kong", "Ness", "Pikachu", "Zero Suit Samus", "Terry", "Bayonetta", "Richter", "Mario", "Link", "Samus", "Fox"];
        const shuffledChars = [...mockCharacters].sort(() => 0.5 - Math.random());
        const mockPlayerNames = ["jack", "polo", "Matt", "sylv"];
        const shuffledNames = [...mockPlayerNames].sort(() => 0.5 - Math.random());

        resolve({
          screenType: "EndScreen",
          stage: randomStage,
          rules: "3 Stock, 5:00",
          gameMode: "4-Player",
          gameStyle: "Free-for-All",
          players: [
            { playerNumber: "P1", playerName: shuffledNames[0], character: shuffledChars[0], placement: 1, kos: 4, falls: 1, sds: 0, outAt: "---" },
            { playerNumber: "P2", playerName: shuffledNames[1], character: shuffledChars[1], placement: 2, kos: 2, falls: 3, sds: 0, outAt: "4:12" },
            { playerNumber: "P3", playerName: shuffledNames[2], character: shuffledChars[2], placement: 3, kos: 1, falls: 3, sds: 0, outAt: "3:04" },
            { playerNumber: "P4", playerName: shuffledNames[3], character: shuffledChars[3], placement: 4, kos: 1, falls: 3, sds: 0, outAt: "2:15" }
          ]
        });
      }, 1500);
    });
  }

  async function showConfirmEditor(data) {
    const confirmStage = document.getElementById("confirm-stage");
    const confirmMode = document.getElementById("confirm-mode");
    const confirmRules = document.getElementById("confirm-rules");
    const confirmStyle = document.getElementById("confirm-style");
    const tableBody = document.getElementById("confirm-players-list");

    // Populate stage options
    confirmStage.innerHTML = "";
    const stages = await api.getAllStages();
    stages.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      confirmStage.appendChild(opt);
    });

    confirmStage.value = data.stage || stages[0] || "Small Battlefield";
    confirmMode.value = data.gameMode || "4-Player";
    confirmRules.value = data.rules || "3 Stock, 5:00";
    confirmStyle.value = data.gameStyle || "Free-for-All";

    tableBody.innerHTML = "";
    const fighters = await api.getAllFighters();
    if (data.players && data.players.length > 0) {
      for (const p of data.players) {
        const row = await renderConfirmRow(p, fighters);
        tableBody.appendChild(row);
      }
    }

    document.getElementById("scanner-confirm-panel").style.display = "block";
    document.getElementById("scanner-confirm-panel").scrollIntoView({ behavior: "smooth" });
  }

  async function renderConfirmRow(p, fighters) {
    const tr = document.createElement("tr");
    tr.className = "confirm-player-row";
    tr.innerHTML = `
      <td>
        <input type="number" class="retro-input table-cell-input confirm-p-placement" value="${p.placement}" min="1" max="8" style="width: 50px;" required>
      </td>
      <td>
        <input type="text" class="retro-input table-cell-input confirm-p-name" value="${p.playerName || ''}" placeholder="Name" style="width: 90px;" required>
      </td>
      <td>
        <select class="retro-select table-cell-input confirm-p-character" style="width: 130px;" required>
          ${fighters.map(f => `<option value="${f}" ${f.toLowerCase() === (p.character || "").toLowerCase() ? 'selected' : ''}>${f}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="number" class="retro-input table-cell-input confirm-p-kos" value="${p.kos !== undefined ? p.kos : 0}" min="0" style="width: 50px;" required>
      </td>
      <td>
        <input type="number" class="retro-input table-cell-input confirm-p-falls" value="${p.falls !== undefined ? Math.abs(p.falls) : 0}" min="0" style="width: 50px;" required>
      </td>
      <td>
        <input type="number" class="retro-input table-cell-input confirm-p-sds" value="${p.sds !== undefined ? Math.abs(p.sds) : 0}" min="0" style="width: 50px;" required>
      </td>
      <td>
        <input type="text" class="retro-input table-cell-input confirm-p-outat" value="${p.outAt || (p.placement === 1 ? '---' : '5:00')}" placeholder="Min:Sec" style="width: 70px;" required>
      </td>
      <td>
        <button type="button" class="btn-arcade magenta btn-remove-row" style="padding: 2px 8px; font-size: 11px;">X</button>
      </td>
    `;

    tr.querySelector(".btn-remove-row").onclick = () => {
      tr.remove();
      updateConfirmMode();
    };

    return tr;
  }

  function updateConfirmMode() {
    const tableBody = document.getElementById("confirm-players-list");
    const count = tableBody.children.length;
    const modeSelect = document.getElementById("confirm-mode");
    if (count === 2) {
      modeSelect.value = "1v1";
    } else if (count >= 3 && count <= 8) {
      modeSelect.value = `${count}-Player`;
    }
  }


  // ==========================================
  // Battle Log (History) View Controllers
  // ==========================================
  async function renderHistory() {
    // Populate dropdown lists if empty
    const filterStage = document.getElementById("filter-stage");
    const filterChar = document.getElementById("filter-character");
    const filterPlayer = document.getElementById("filter-player");

    // Only populate if they only have the default 'All' option
    if (filterStage.children.length <= 1) {
      const stages = await api.getAllStages();
      stages.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s;
        opt.textContent = s;
        filterStage.appendChild(opt);
      });
    }

    if (filterChar.children.length <= 1) {
      const fighters = await api.getAllFighters();
      fighters.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        filterChar.appendChild(opt);
      });
    }

    // Always refresh players list as new players might have been scanned
    const currentVal = filterPlayer.value || "All";
    filterPlayer.innerHTML = '<option value="All">All Players</option>';
    const stats = window.Database.getStats();
    stats.players.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.name;
      opt.textContent = p.name;
      filterPlayer.appendChild(opt);
    });
    filterPlayer.value = currentVal;

    await renderHistoryList();
  }

  async function renderHistoryList() {
    const stage = document.getElementById("filter-stage").value;
    const mode = document.getElementById("filter-mode").value;
    const player = document.getElementById("filter-player").value;
    const character = document.getElementById("filter-character").value;

    let matches = window.Database.getMatches();

    if (stage && stage !== "All") {
      matches = matches.filter(m => m.stage === stage);
    }
    if (mode && mode !== "All") {
      matches = matches.filter(m => m.gameMode === mode);
    }
    if (player && player !== "All") {
      matches = matches.filter(m => m.players && m.players.some(p => p.playerName.toLowerCase() === player.toLowerCase()));
    }
    if (character && character !== "All") {
      matches = matches.filter(m => m.players && m.players.some(p => p.character.toLowerCase() === character.toLowerCase()));
    }

    const container = document.getElementById("history-matches-list");
    container.innerHTML = "";

    if (matches.length === 0) {
      container.innerHTML = `<div class="panel-beveled flex-center" style="padding: 40px; font-family: var(--font-arcade); color: #666; font-size: 13px;">NO COMPATIBLE BATTLE RECORD ENCOUNTERED</div>`;
      return;
    }

    matches.forEach(m => {
      const card = document.createElement("div");
      card.className = "match-history-card panel-beveled neon-cyan";
      card.style.marginBottom = "20px";

      card.innerHTML = `
        <div class="match-card-header">
          <div class="match-card-title">${m.gameMode.toUpperCase()} - ${m.stage.toUpperCase()}</div>
          <div class="match-card-meta">${new Date(m.timestamp).toLocaleDateString()} ${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
        <div class="match-card-players-grid">
          ${m.players.map(p => `
            <div class="history-player-row ${p.placement === 1 ? 'winner' : ''}">
              <div class="history-p-placement">${p.placement === 1 ? '1ST' : p.placement === 2 ? '2ND' : p.placement === 3 ? '3RD' : p.placement + 'TH'}</div>
              <div class="history-p-details">
                <div class="history-p-name text-glow-${p.placement === 1 ? 'yellow' : 'cyan'}" style="cursor: pointer;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'">${p.playerName}</div>
                <div class="history-p-char" style="cursor: pointer;" onclick="window.location.hash = '#fighter/${p.character.toLowerCase().replace(/\s+/g, '-')}'">${p.character}</div>
              </div>
              <div class="history-p-stats-badges">
                <span class="player-stat-badge ko">K: ${p.kos || 0}</span>
                <span class="player-stat-badge fall">F: ${Math.abs(p.falls || 0)}</span>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="match-card-actions">
          <button class="btn-arcade magenta delete-match-btn" data-id="${m.id}" style="font-size: 11px; padding: 4px 12px;">DELETE RECORD</button>
        </div>
      `;
      container.appendChild(card);
    });
  }


  // ==========================================
  // Telemetry Dashboard View Controllers
  // ==========================================
  async function renderTelemetry() {
    const stats = window.Database.getStats();

    // Populate KPI panels
    document.getElementById("tel-kpi-matches").textContent = stats.totalMatches;
    document.getElementById("tel-kpi-player").textContent = stats.topPlayer;
    document.getElementById("tel-kpi-character").textContent = stats.dominantCharacter;
    document.getElementById("tel-kpi-stage").textContent = stats.mostActiveStage;

    // Trigger SVG Renderings
    if (window.Charts) {
      window.Charts.renderWinRateGauge("win-rate-gauges-container", stats.players);
      window.Charts.renderCharacterDonut("popularity-donut-chart-container", stats.characters);
      window.Charts.renderPlayerPlacements("outcomes-stacked-bar-container", stats.players);
    }
  }


  // ==========================================
  // Spec Config (Settings) View Controllers
  // ==========================================
  async function renderSettings() {
    document.getElementById("settings-api-key").value = window.Database.getApiKey();
  }

  function applyTheme(themeName) {
    const themes = ["storm", "vapor", "cyber", "retro"];
    themes.forEach(t => document.body.classList.remove(`theme-${t}`));
    document.body.classList.add(`theme-${themeName}`);

    document.querySelectorAll(".theme-swatch").forEach(sw => {
      if (sw.getAttribute("data-theme") === themeName) {
        sw.classList.add("active");
      } else {
        sw.classList.remove("active");
      }
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


  // ==========================================
  // 9. Initializations and Core Event Bindings
  // ==========================================

  // Initialize Theme on startup
  const activeTheme = window.Database.getTheme() || "storm";
  applyTheme(activeTheme);

  // Wire up theme swatches
  document.querySelectorAll(".theme-swatch").forEach(sw => {
    sw.onclick = () => {
      const selectedTheme = sw.getAttribute("data-theme");
      window.Database.saveTheme(selectedTheme);
      applyTheme(selectedTheme);
    };
  });

  // Wire up API key save
  document.getElementById("btn-save-api-key").onclick = () => {
    const key = document.getElementById("settings-api-key").value;
    window.Database.saveApiKey(key);
    alert("API DECRYPT KEY MOUNTED SUCCESSFULLY TO LOCAL CABINET STORAGE.");
  };

  // Wire up scanner drop zone and inputs
  const dropZone = document.getElementById("scanner-drop-zone");
  const fileInput = document.getElementById("scanner-file-input");

  if (dropZone && fileInput) {
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add("dragover");
    };

    dropZone.ondragleave = () => {
      dropZone.classList.remove("dragover");
    };

    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0]);
      }
    };

    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        processFile(e.target.files[0]);
      }
    };
  }

  // Confirm Panel Abort/Submit action buttons
  const btnCancelScan = document.getElementById("btn-cancel-scan");
  if (btnCancelScan) {
    btnCancelScan.onclick = () => {
      if (confirm("DISCARD THIS CAPTURE SESSION?")) {
        document.getElementById("scanner-confirm-panel").style.display = "none";
      }
    };
  }

  const btnAddConfirmPlayer = document.getElementById("btn-add-confirm-player");
  if (btnAddConfirmPlayer) {
    btnAddConfirmPlayer.onclick = async () => {
      const tableBody = document.getElementById("confirm-players-list");
      const fighters = await api.getAllFighters();
      const nextPlacement = tableBody.children.length + 1;
      const newRow = await renderConfirmRow({
        placement: nextPlacement,
        playerName: `Player ${nextPlacement}`,
        character: fighters[0] || "Mario",
        kos: 0,
        falls: 3,
        sds: 0,
        outAt: "5:00"
      }, fighters);
      tableBody.appendChild(newRow);
      updateConfirmMode();
    };
  }

  const scannerConfirmForm = document.getElementById("scanner-confirm-form");
  if (scannerConfirmForm) {
    scannerConfirmForm.onsubmit = (e) => {
      e.preventDefault();

      const stage = document.getElementById("confirm-stage").value;
      const gameMode = document.getElementById("confirm-mode").value;
      const rules = document.getElementById("confirm-rules").value;
      const gameStyle = document.getElementById("confirm-style").value;

      const rows = document.querySelectorAll("#confirm-players-list tr");
      const players = [];

      rows.forEach((row, index) => {
        const placement = parseInt(row.querySelector(".confirm-p-placement").value);
        const playerName = row.querySelector(".confirm-p-name").value.trim();
        const character = row.querySelector(".confirm-p-character").value;
        const kos = parseInt(row.querySelector(".confirm-p-kos").value);
        const falls = -Math.abs(parseInt(row.querySelector(".confirm-p-falls").value));
        const sds = parseInt(row.querySelector(".confirm-p-sds").value);
        const outAt = row.querySelector(".confirm-p-outat").value.trim();

        players.push({
          playerNumber: `P${index + 1}`,
          playerName,
          character,
          placement,
          kos,
          falls,
          sds,
          outAt
        });
      });

      if (players.length === 0) {
        alert("AT LEAST ONE PLAYER SLOT MUST BE POPULATED.");
        return;
      }

      const newMatch = {
        timestamp: Date.now(),
        screenType: "EndScreen",
        stage,
        rules,
        gameMode,
        gameStyle,
        players
      };

      window.Database.addMatch(newMatch);
      document.getElementById("scanner-confirm-panel").style.display = "none";
      window.location.hash = "#history";
    };
  }

  // Wire up history deletion trigger via delegation
  const historyMatchesList = document.getElementById("history-matches-list");
  if (historyMatchesList) {
    historyMatchesList.onclick = async (e) => {
      const btn = e.target.closest(".delete-match-btn");
      if (!btn) return;
      const matchId = btn.getAttribute("data-id");
      if (confirm("ERASE THIS GAMEPLAY RECORD FROM CAB MEMORY?")) {
        window.Database.deleteMatch(matchId);
        await renderHistoryList();
      }
    };
  }

  // History filters
  ["filter-stage", "filter-mode", "filter-player", "filter-character"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderHistoryList);
  });

  // Database maintenance controls
  const btnExportDb = document.getElementById("btn-export-db");
  if (btnExportDb) {
    btnExportDb.onclick = () => {
      const data = {
        matches: window.Database.getMatches(),
        apiKey: window.Database.getApiKey(),
        theme: window.Database.getTheme()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smashalytics_backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  const btnTriggerImport = document.getElementById("btn-trigger-import");
  const importDbFile = document.getElementById("import-db-file");

  if (btnTriggerImport && importDbFile) {
    btnTriggerImport.onclick = () => importDbFile.click();

    importDbFile.onchange = (e) => {
      if (e.target.files.length === 0) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.matches) {
            window.Database.saveMatches(data.matches);
          }
          if (data.apiKey) {
            window.Database.saveApiKey(data.apiKey);
          }
          if (data.theme) {
            window.Database.saveTheme(data.theme);
            applyTheme(data.theme);
          }
          alert("ARCHIVE BACKUP RESTORED SUCCESSFULLY!");
          router(); // Trigger router reload
        } catch (err) {
          alert("CRITICAL CORRUPTED DATA DECODING ERROR: " + err.message);
        }
      };
      reader.readAsText(e.target.files[0]);
    };
  }

  const btnResetDb = document.getElementById("btn-reset-db");
  if (btnResetDb) {
    btnResetDb.onclick = () => {
      if (confirm("RESTORE FACTORY SEEDS AND ERASE UNBACKED LOGS?")) {
        window.Database.resetToSeeds();
        alert("DATABASE RE-INITIALIZED WITH DEFAULTS.");
        router();
      }
    };
  }

  const btnClearDb = document.getElementById("btn-clear-db");
  if (btnClearDb) {
    btnClearDb.onclick = () => {
      if (confirm("ERASE ALL BATTLE LOGS FROM STORAGE COMPLETELY?")) {
        window.Database.clearMatches();
        alert("ALL BATTLE LOGS PURGED FROM DRIVES.");
        router();
      }
    };
  }
});
