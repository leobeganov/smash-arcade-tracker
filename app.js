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
  let lastScannedMatch = null;
  let currentPodiumTimeframe = "7days";
  let currentLeaderboardTimeframe = "alltime";
  let selectedSearchPlayers = [];
  let selectedSearchFighters = [];
  let isSearchDropdownsInitialized = false;

  // --- DOM Elements ---
  const views = {
    home: document.getElementById("home-view"),
    player: document.getElementById("player-profile-view"),
    fighter: document.getElementById("fighter-profile-view"),
    leaderboard: document.getElementById("leaderboard-view"),
    scanner: document.getElementById("scanner-view"),
    telemetry: document.getElementById("telemetry-view"),
    settings: document.getElementById("settings-view")
  };

  const searchBox = document.getElementById("search-box");
  const searchDropdown = document.getElementById("search-dropdown");
  const vsOverlay = document.getElementById("vs-overlay");

  // ==========================================
  // 2. VS Screen Loading Transition Controller (CRT Glitch Curtains)
  // ==========================================
  async function runVsTransition() {
    vsOverlay.classList.add("active");
    // Wait for curtains to fully close (350ms)
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  async function endVsTransition() {
    // Wait a brief moment to let the CPU settle after DOM rendering (150ms)
    await new Promise(resolve => setTimeout(resolve, 150));
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
    else if (route === "telemetry") target = "telemetry";
    else if (route === "settings") target = "settings";

    // Update active state in nav tabs
    const navTabs = ["home", "leaderboard", "scanner", "telemetry", "settings"];
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
      isSearchDropdownsInitialized = false;
      await renderHome();
    } else if (target === "player") {
      await renderPlayerProfile(id);
    } else if (target === "fighter") {
      await renderFighterProfile(id);
    } else if (target === "leaderboard") {
      await renderLeaderboard();
    } else if (target === "scanner") {
      await renderScanner();
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
    const loader = document.getElementById("podium-loader");
    if (loader) {
      loader.style.display = "inline-flex";
    }
    const startTime = Date.now();

    // Gather selected styles
    const activeStyles = [];
    const styleSelect = document.getElementById("podium-style-select");
    if (styleSelect) {
      const val = styleSelect.value;
      if (val === 'all') {
        activeStyles.push('1v1', 'free-for-all', 'teams');
      } else {
        activeStyles.push(val);
      }
    } else {
      activeStyles.push('1v1', 'free-for-all', 'teams');
    }

    const podiumData = await api.getPodium(currentPodiumTimeframe, activeStyles, selectedSearchPlayers, selectedSearchFighters);

    // Populate Gold (1st)
    const gold = podiumData.find(p => p.rank === 1);
    const goldImg = document.getElementById("podium-gold-img");
    const goldName = document.getElementById("podium-gold-name");
    const goldStat = document.getElementById("podium-gold-stat");
    const goldInfo = document.getElementById("podium-gold-info");
    if (gold) {
      if (goldImg) {
        goldImg.src = gold.fighter.img;
        goldImg.style.opacity = "1";
      }
      if (goldName) goldName.textContent = gold.player.name;
      if (goldStat) goldStat.textContent = `${gold.wins}/${gold.total} WINS (${gold.fighter.name})`;
      if (goldInfo) {
        goldInfo.onclick = () => window.location.hash = `#player/${gold.player.id}`;
        goldInfo.style.cursor = "pointer";
      }
    } else {
      if (goldImg) {
        goldImg.src = "assets/mario.png?v=5";
        goldImg.style.opacity = "0.1";
      }
      if (goldName) goldName.textContent = "VACANT";
      if (goldStat) goldStat.textContent = "0 WINS";
      if (goldInfo) {
        goldInfo.onclick = null;
        goldInfo.style.cursor = "default";
      }
    }

    // Populate Silver (2nd)
    const silver = podiumData.find(p => p.rank === 2);
    const silverImg = document.getElementById("podium-silver-img");
    const silverName = document.getElementById("podium-silver-name");
    const silverStat = document.getElementById("podium-silver-stat");
    const silverInfo = document.getElementById("podium-silver-info");
    if (silver) {
      if (silverImg) {
        silverImg.src = silver.fighter.img;
        silverImg.style.opacity = "1";
      }
      if (silverName) silverName.textContent = silver.player.name;
      if (silverStat) silverStat.textContent = `${silver.wins}/${silver.total} WINS (${silver.fighter.name})`;
      if (silverInfo) {
        silverInfo.onclick = () => window.location.hash = `#player/${silver.player.id}`;
        silverInfo.style.cursor = "pointer";
      }
    } else {
      if (silverImg) {
        silverImg.src = "assets/mario.png?v=5";
        silverImg.style.opacity = "0.1";
      }
      if (silverName) silverName.textContent = "VACANT";
      if (silverStat) silverStat.textContent = "0 WINS";
      if (silverInfo) {
        silverInfo.onclick = null;
        silverInfo.style.cursor = "default";
      }
    }

    // Populate Bronze (3rd)
    const bronze = podiumData.find(p => p.rank === 3);
    const bronzeImg = document.getElementById("podium-bronze-img");
    const bronzeName = document.getElementById("podium-bronze-name");
    const bronzeStat = document.getElementById("podium-bronze-stat");
    const bronzeInfo = document.getElementById("podium-bronze-info");
    if (bronze) {
      if (bronzeImg) {
        bronzeImg.src = bronze.fighter.img;
        bronzeImg.style.opacity = "1";
      }
      if (bronzeName) bronzeName.textContent = bronze.player.name;
      if (bronzeStat) bronzeStat.textContent = `${bronze.wins}/${bronze.total} WINS (${bronze.fighter.name})`;
      if (bronzeInfo) {
        bronzeInfo.onclick = () => window.location.hash = `#player/${bronze.player.id}`;
        bronzeInfo.style.cursor = "pointer";
      }
    } else {
      if (bronzeImg) {
        bronzeImg.src = "assets/mario.png?v=5";
        bronzeImg.style.opacity = "0.1";
      }
      if (bronzeName) bronzeName.textContent = "VACANT";
      if (bronzeStat) bronzeStat.textContent = "0 WINS";
      if (bronzeInfo) {
        bronzeInfo.onclick = null;
        bronzeInfo.style.cursor = "default";
      }
    }
    await renderHomeMatchesList();

    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    if (loader) {
      loader.style.display = "none";
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
    const nemesisImg = document.getElementById("player-nemesis-img");
    const nemesisName = document.getElementById("player-nemesis-name");
    const nemesisCount = document.getElementById("player-nemesis-count");

    if (stats.rival) {
      if (stats.rival.mostUsedFighter) {
        nemesisImg.src = stats.rival.mostUsedFighter.img;
        nemesisImg.style.display = "block";
      } else {
        nemesisImg.style.display = "none";
      }
      nemesisName.textContent = stats.rival.name;
      nemesisCount.textContent = `${stats.rival.count} encounters`;
      nemesisCard.onclick = () => {
        window.location.hash = `#player/${stats.rival.id}`;
      };
      nemesisCard.style.cursor = "pointer";
    } else {
      nemesisImg.style.display = "none";
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

    // Set dynamic series background watermark
    const backdropEl = document.getElementById("fighter-profile-backdrop");
    if (backdropEl) {
      const seriesIcon = stats.fighter.series && stats.fighter.series.icon ? stats.fighter.series.icon : "";
      if (seriesIcon) {
        backdropEl.style.backgroundImage = `url('${seriesIcon}')`;
        backdropEl.style.display = "block";
      } else {
        backdropEl.style.backgroundImage = "none";
        backdropEl.style.display = "none";
      }
    }

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
    const nemesisCard = document.getElementById("fighter-nemesis-card");
    const nemesisImg = document.getElementById("fighter-nemesis-img");
    const nemesisName = document.getElementById("fighter-nemesis-name");
    const nemesisCount = document.getElementById("fighter-nemesis-count");

    if (stats.nemesis) {
      nemesisImg.src = `${stats.nemesis.img}`;
      nemesisImg.style.display = "block";
      nemesisName.textContent = stats.nemesis.name;
      nemesisCount.textContent = `${stats.nemesis.count} matchups`;
      nemesisCard.style.cursor = "pointer";
      nemesisCard.onclick = () => {
        window.location.hash = `#fighter/${stats.nemesis.id}`;
      };
    } else {
      nemesisImg.style.display = "none";
      nemesisName.textContent = "None";
      nemesisCount.textContent = "0 matchups";
      nemesisCard.style.cursor = "default";
      nemesisCard.onclick = null;
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
    const loader = document.getElementById("leaderboard-loader");
    if (loader) {
      loader.style.display = "inline-flex";
    }
    const startTime = Date.now();

    const isFighterMode = currentLeaderboardMode === "fighters";
    const headerTitle = document.getElementById("leaderboard-header-title");
    headerTitle.textContent = isFighterMode ? "RANKINGS: FIGHTER MODE" : "RANKINGS: PLAYER MODE";

    // Dynamic Headers based on Mode
    const headersRow = document.getElementById("leaderboard-table-headers");
    headersRow.innerHTML = "";

    const headers = [
      { key: "rank", label: "Rank" },
      { key: "name", label: isFighterMode ? "Fighter" : "Player" },
      { key: "wins", label: "Rating" },
      { key: "KOs", label: "Knockouts" },
      { key: "winRate", label: "Win Percentage" },
      { key: "kd", label: "Knockout / Fall Ratio" },
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

    // Gather selected styles
    const activeStyles = [];
    const activeStyleBtns = document.querySelectorAll("#leaderboard-style-filters .toggle-btn.active");
    activeStyleBtns.forEach(btn => {
      activeStyles.push(btn.getAttribute("data-style"));
    });

    // Fetch and Sort Data
    const records = await api.getLeaderboard(currentSortBy, isFighterMode, activeStyles, currentLeaderboardTimeframe);

    // Populate rows
    const rowsBody = document.getElementById("leaderboard-rows");
    rowsBody.innerHTML = "";

    records.forEach(rec => {
      const tr = document.createElement("tr");

      // Custom link paths
      const mainLink = rec.type === "player" ? `#player/${rec.id}` : `#fighter/${rec.id}`;
      const detailLink = rec.detailType === "player" ? `#player/${rec.detailId}` : `#fighter/${rec.detailId}`;

      const detailContent = (rec.detailType === "fighter" && (rec.detailIcon || rec.detailImg))
        ? `<div class="leaderboard-avatar-container">
             <img src="${rec.detailIcon || rec.detailImg}" class="leaderboard-avatar-img" alt="${rec.detailLabel}">
             <span>${rec.detailLabel}</span>
           </div>`
        : rec.detailLabel;

      tr.innerHTML = `
        <td class="rank-cell">#${rec.rank}</td>
        <td class="name-cell text-glow-cyan" onclick="window.location.hash = '${mainLink}'">${rec.name}</td>
        <td class="numeric-cell text-glow-yellow">${rec.adjustedWins} <span style="font-size: 13px; opacity: 0.6; font-family: var(--font-stats);">(${rec.wins}/${rec.totalGames})</span></td>
        <td class="numeric-cell">${rec.KOs}</td>
        <td class="numeric-cell">${rec.winRate}%</td>
        <td class="numeric-cell text-glow-magenta">${rec.kd}</td>
        <td class="name-cell text-glow-yellow" onclick="window.location.hash = '${detailLink}'">
          ${detailContent}
        </td>
      `;

      rowsBody.appendChild(tr);
    });

    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    if (loader) {
      loader.style.display = "none";
    }
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
    lastScannedMatch = data;

    document.getElementById("confirm-mode-val").textContent = data.gameMode || "N/A";
    document.getElementById("confirm-rules-val").textContent = data.rules || "N/A";
    document.getElementById("confirm-style-val").textContent = data.gameStyle || "N/A";

    const tableBody = document.getElementById("confirm-players-list");
    tableBody.innerHTML = "";

    if (data.players && data.players.length > 0) {
      data.players.forEach(p => {
        const tr = document.createElement("tr");
        tr.className = "confirm-player-row-static";
        tr.innerHTML = `
          <td><span class="rank-badge rank-${p.placement}">${p.placement}</span></td>
          <td class="player-cell">${p.playerName || 'N/A'}</td>
          <td class="character-cell">${p.character || 'N/A'}</td>
          <td class="ko-cell">${p.kos !== undefined ? p.kos : 0}</td>
          <td class="fall-cell">${p.falls !== undefined ? Math.abs(p.falls) : 0}</td>
          <td class="sd-cell">${p.sds !== undefined ? Math.abs(p.sds) : 0}</td>
          <td class="time-cell">${p.outAt || (p.placement === 1 ? '---' : '5:00')}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

    document.getElementById("scanner-confirm-panel").style.display = "block";
    document.getElementById("scanner-confirm-panel").scrollIntoView({ behavior: "smooth" });
  }


  // ==========================================
  // Battle Log (History) View Controllers
  // ==========================================
  async function renderHomeMatchesList() {
    if (!isSearchDropdownsInitialized) {
      await initSearchDropdowns();
      isSearchDropdownsInitialized = true;
    }
    await renderHistoryList();
  }

  async function renderHistoryList() {
    const parseOutAtToSeconds = (outAtStr) => {
      if (!outAtStr || outAtStr.trim() === '---') return null;
      const parts = outAtStr.trim().split(':');
      if (parts.length !== 2) return null;
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (isNaN(mins) || isNaN(secs)) return null;
      return mins * 60 + secs;
    };

    let matches = await window.Database.getMatchesAsync();

    // 1. Timeframe Filter
    const now = Date.now();
    if (currentPodiumTimeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();
      matches = matches.filter(m => m.timestamp >= todayStartMs);
    } else if (currentPodiumTimeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (currentPodiumTimeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    // 2. Style Filter (Dropdown Select)
    const activeStyles = [];
    const styleSelect = document.getElementById("podium-style-select");
    if (styleSelect) {
      const val = styleSelect.value.toLowerCase();
      if (val === 'all') {
        activeStyles.push('1v1', 'free-for-all', 'teams');
      } else {
        activeStyles.push(val);
      }
    } else {
      activeStyles.push('1v1', 'free-for-all', 'teams');
    }

    matches = matches.filter(m => {
      const is1v1 = (m.gameMode && m.gameMode.toLowerCase() === '1v1') || 
                    (m.gameStyle && m.gameStyle.toLowerCase() === '1v1') || 
                    (m.players && m.players.length === 2);
      if (is1v1) {
        return activeStyles.includes('1v1');
      }
      const isTeams = m.gameStyle && m.gameStyle.toLowerCase() === 'teams';
      if (isTeams) {
        return activeStyles.includes('teams');
      }
      // Otherwise Free-for-all
      return activeStyles.includes('free-for-all');
    });

    // 3. Search Filters (Player and Character - Multi-select)
    if (selectedSearchPlayers && selectedSearchPlayers.length > 0) {
      const lowerPlayers = selectedSearchPlayers.map(p => p.toLowerCase().trim());
      matches = matches.filter(m => m.players && m.players.some(p => lowerPlayers.includes(p.playerName.toLowerCase().trim())));
    }
    if (selectedSearchFighters && selectedSearchFighters.length > 0) {
      const lowerFighters = selectedSearchFighters.map(f => f.toLowerCase().trim());
      matches = matches.filter(m => m.players && m.players.some(p => {
        const fighterObj = api.getFighterDetails(p.character);
        return lowerFighters.includes(p.character.toLowerCase().trim()) || lowerFighters.includes(fighterObj.id.toLowerCase().trim());
      }));
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

      // 1v1, Teams, or Free-for-all headline logic
      const is1v1 = (m.gameMode && m.gameMode.toLowerCase() === '1v1') || (m.gameStyle && m.gameStyle.toLowerCase() === '1v1') || (m.players && m.players.length === 2);
      const headline = is1v1 ? "1V1" : (m.gameStyle && m.gameStyle.toLowerCase() === 'teams' ? "TEAMS" : "FREE-FOR-ALL");
      const badgeClass = is1v1 ? "badge-1v1" : (m.gameStyle && m.gameStyle.toLowerCase() === 'teams' ? "badge-teams" : "badge-ffa");
      const playerCountText = is1v1 ? "2 players" : `${m.players ? m.players.length : 0} players`;

      // Generate markers for the timeline with collision avoidance
      const percentageCounts = {};
      let markersHtml = "";
      if (m.players) {
        m.players.forEach((p, idx) => {
          const outAtSecs = parseOutAtToSeconds(p.outAt || (p.placement === 1 ? '---' : '5:00'));
          const isSurvived = (outAtSecs === null);
          const secondsVal = isSurvived ? 0 : outAtSecs;
          
          const pct = isSurvived ? 100 : ((300 - secondsVal) / 300) * 100;
          const safePct = Math.max(0, Math.min(100, pct));
          
          const pctKey = safePct.toFixed(1);
          if (!percentageCounts[pctKey]) {
            percentageCounts[pctKey] = 0;
          }
          const staggerIndex = percentageCounts[pctKey]++;
          
          const markerColor = isSurvived ? 'var(--color-neon-yellow)' : 'var(--color-neon-magenta)';
          const textColor = isSurvived ? 'var(--color-neon-yellow)' : 'var(--color-neon-magenta)';
          const isAbove = (idx % 2 === 0);
          
          const offsetSize = 15 + staggerIndex * 30;
          const fighterObj = api.getFighterDetails(p.character) || {};
          const iconUrl = fighterObj.icon || 'assets/mario.png';
          
          markersHtml += `
            <div class="timeline-marker ${isSurvived ? 'survived' : ''}" style="position: absolute; left: ${safePct}%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: ${isAbove ? 'column-reverse' : 'column'}; align-items: center; z-index: 10;">
              <!-- Details -->
              <div class="timeline-player-info panel-beveled" style="text-align: center; white-space: nowrap; background: var(--color-bg-dark); border: 1px solid ${markerColor}; padding: 3px 8px; font-size: 10px; font-family: var(--font-stats); margin: ${isAbove ? `0 0 ${offsetSize}px 0` : `${offsetSize}px 0 0 0`}; box-shadow: 0 0 8px rgba(0,0,0,0.8); border-radius: 4px; pointer-events: none; user-select: none;">
                <span style="font-weight: bold; color: #fff; text-shadow: 0 0 2px rgba(255,255,255,0.5);">${p.playerName}${isSurvived ? ' 🏆' : ''}</span>
                <span class="hover-time" style="color: ${textColor}; font-weight: bold; text-shadow: 0 0 4px ${textColor};">(${isSurvived ? 'WINNER' : p.outAt || '5:00'})</span>
              </div>
              <!-- Connector line -->
              <div class="timeline-connector" style="width: 2px; height: ${offsetSize}px; background: ${markerColor}; opacity: 0.8; position: absolute; ${isAbove ? 'bottom: 15px' : 'top: 15px'};"></div>
              <!-- Dot marker (Character head-icon bubble) -->
              <div class="timeline-dot" style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-dark); border: 2px solid ${markerColor}; box-shadow: 0 0 8px ${markerColor}; z-index: 11; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${p.character}" />
              </div>
            </div>
          `;
        });
      }

      card.innerHTML = `
        <div class="match-card-header">
          <div class="match-card-title">
            <span class="match-style-badge ${badgeClass}">
              ${headline}
            </span>
            <span class="match-card-mode-text">${playerCountText.toUpperCase()}</span>
          </div>
          <div class="match-card-meta">${new Date(m.timestamp).toLocaleDateString()} ${new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
        <div class="match-card-players-grid ${m.players && m.players.length > 4 ? 'large-lobby' : ''}">
          ${m.players.map(p => {
            const hasTeamColor = m.gameStyle && m.gameStyle.toLowerCase() === 'teams' && p.teamColor && p.teamColor.toLowerCase() !== 'none';
            const teamClass = hasTeamColor ? `team-${p.teamColor.toLowerCase()}` : '';
            const fighterObj = api.getFighterDetails(p.character) || {};
            const iconUrl = fighterObj.icon || 'assets/mario.png';
            return `
              <div class="history-player-row ${p.placement === 1 ? 'winner' : ''} ${teamClass}">
                <div class="history-p-top-row">
                  <div class="history-p-placement">${p.placement === 1 ? '1ST' : p.placement === 2 ? '2ND' : p.placement === 3 ? '3RD' : p.placement + 'TH'}</div>
                  <img src="${iconUrl}" alt="${p.character}" style="width: 24px; height: 24px; margin-right: 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5); object-fit: contain; flex-shrink: 0;" />
                  <div class="history-p-details">
                    <div class="history-p-name text-glow-${p.placement === 1 ? 'yellow' : 'cyan'}" style="cursor: pointer;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'">${p.playerName}</div>
                    <div class="history-p-char" style="cursor: pointer;" onclick="window.location.hash = '#fighter/${p.character.toLowerCase().replace(/\s+/g, '-')}'">${p.character}</div>
                  </div>
                </div>
                <div class="history-p-stats-badges">
                  <span class="player-stat-badge ko">Kills: ${p.kos !== undefined ? p.kos : 0}</span>
                  <span class="player-stat-badge fall">Falls: ${p.falls !== undefined ? Math.abs(p.falls) : 0}</span>
                  <span class="player-stat-badge sd">SDs: ${p.sds !== undefined ? Math.abs(p.sds) : 0}</span>
                  <span class="player-stat-badge out">Out: ${p.outAt || (p.placement === 1 ? '---' : '5:00')}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="match-card-actions" style="display: flex; gap: 10px; justify-content: flex-start; align-items: center; flex-wrap: wrap;">
          <button class="btn-arcade cyan toggle-timeline-btn" data-id="${m.id}" style="font-size: 11px; padding: 4px 12px; height: 28px; line-height: 1;">VIEW TIMELINE</button>
          <button class="btn-arcade magenta delete-match-btn" data-id="${m.id}" style="font-size: 11px; padding: 4px 12px; height: 28px; line-height: 1;">DELETE RECORD</button>
        </div>
        <div class="match-timeline-drawer" id="timeline-drawer-${m.id}" style="display: none; padding: 50px 15px 50px 15px; margin-top: 20px; border-top: 1px solid var(--color-border-dark); overflow: visible;">
          <div class="timeline-track-container" style="position: relative; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; border: 1px solid rgba(255,255,255,0.2);">
            <div style="position: absolute; left: 0; top: 0; height: 100%; width: 100%; background: var(--color-neon-cyan); opacity: 0.3; border-radius: 3px; box-shadow: 0 0 10px var(--color-neon-cyan);"></div>
            <div style="position: absolute; left: 0; top: -25px; font-family: var(--font-arcade); font-size: 9px; color: var(--color-neon-cyan); text-shadow: 0 0 4px var(--color-neon-cyan); font-weight: bold; letter-spacing: 0.5px;">5:00 (START)</div>
            <div style="position: absolute; right: 0; top: -25px; font-family: var(--font-arcade); font-size: 9px; color: var(--color-neon-cyan); text-shadow: 0 0 4px var(--color-neon-cyan); font-weight: bold; letter-spacing: 0.5px;">END</div>
            ${markersHtml}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }


  // ==========================================
  // Telemetry Dashboard View Controllers
  // ==========================================
  async function renderTelemetry() {
    const stats = await window.Database.getStatsAsync();

    // Populate KPI panels
    document.getElementById("tel-kpi-matches").textContent = stats.totalMatches;
    document.getElementById("tel-kpi-player").textContent = stats.topPlayer;
    document.getElementById("tel-kpi-character").textContent = stats.dominantCharacter;

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

  // Podium Timeframe Toggles
  const timeframeFilters = document.getElementById("podium-timeframe-filters");
  if (timeframeFilters) {
    timeframeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      // Deactivate other timeframe buttons
      timeframeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      // Activate clicked button
      btn.classList.add("active");
      
      currentPodiumTimeframe = btn.getAttribute("data-timeframe");
      renderHome();
    });
  }

  // Leaderboard Timeframe Toggles
  const leaderboardTimeframeFilters = document.getElementById("leaderboard-timeframe-filters");
  if (leaderboardTimeframeFilters) {
    leaderboardTimeframeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      // Deactivate other timeframe buttons
      leaderboardTimeframeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      // Activate clicked button
      btn.classList.add("active");
      
      currentLeaderboardTimeframe = btn.getAttribute("data-timeframe");
      renderLeaderboard();
    });
  }

  // Podium Style Dropdown Filter
  const podiumStyleSelect = document.getElementById("podium-style-select");
  if (podiumStyleSelect) {
    podiumStyleSelect.addEventListener("change", () => {
      renderHome();
    });
  }

  // Leaderboard Style Isolation Filters
  const styleFilters = document.getElementById("leaderboard-style-filters");
  if (styleFilters) {
    styleFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      const allBtns = styleFilters.querySelectorAll(".toggle-btn");
      const activeBtns = styleFilters.querySelectorAll(".toggle-btn.active");
      const isClickedActive = btn.classList.contains("active");
      
      if (isClickedActive) {
        if (activeBtns.length === 1) {
          // Reset: activate all style buttons
          allBtns.forEach(b => b.classList.add("active"));
        } else {
          // Isolate clicked button
          allBtns.forEach(b => {
            if (b === btn) {
              b.classList.add("active");
            } else {
              b.classList.remove("active");
            }
          });
        }
      } else {
        // Isolate clicked button
        allBtns.forEach(b => {
          if (b === btn) {
            b.classList.add("active");
          } else {
            b.classList.remove("active");
          }
        });
      }
      
      renderLeaderboard();
    });
  }


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
        lastScannedMatch = null;
      }
    };
  }

  const btnSaveMatch = document.getElementById("btn-save-match");
  if (btnSaveMatch) {
    btnSaveMatch.onclick = async () => {
      if (!lastScannedMatch) {
        alert("NO CAPTURE ENCOUNTERED.");
        return;
      }

      const matchToSave = JSON.parse(JSON.stringify(lastScannedMatch));
      matchToSave.timestamp = Date.now();
      if (matchToSave.players) {
        matchToSave.players.forEach(p => {
          if (p.falls !== undefined) {
            p.falls = -Math.abs(p.falls);
          }
        });
      }

      await window.Database.addMatchAsync(matchToSave);
      document.getElementById("scanner-confirm-panel").style.display = "none";
      lastScannedMatch = null;
      window.location.hash = "#home";
    };
  }

  // Wire up history deletion trigger via delegation
  const historyMatchesList = document.getElementById("history-matches-list");
  if (historyMatchesList) {
    historyMatchesList.onclick = async (e) => {
      // Toggle Timeline Drawer
      const toggleBtn = e.target.closest(".toggle-timeline-btn");
      if (toggleBtn) {
        const matchId = toggleBtn.getAttribute("data-id");
        const drawer = document.getElementById(`timeline-drawer-${matchId}`);
        if (drawer) {
          const isHidden = drawer.style.display === "none" || !drawer.style.display;
          drawer.style.display = isHidden ? "block" : "none";
          toggleBtn.textContent = isHidden ? "HIDE TIMELINE" : "VIEW TIMELINE";
          if (isHidden) {
            toggleBtn.style.background = "var(--color-neon-magenta)";
            toggleBtn.style.borderColor = "var(--color-neon-magenta)";
            toggleBtn.style.boxShadow = "0 0 10px var(--color-neon-magenta)";
          } else {
            toggleBtn.style.background = "";
            toggleBtn.style.borderColor = "";
            toggleBtn.style.boxShadow = "";
          }
        }
        return;
      }

      // Delete Record
      const btn = e.target.closest(".delete-match-btn");
      if (!btn) return;
      const matchId = btn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this record?")) {
        await window.Database.deleteMatchAsync(matchId);
        await renderHistoryList();
      }
    };
  }

  // --- Retro Multi-Select Search Drawer Logic ---
  function updateSearchBadge() {
    const totalCount = selectedSearchPlayers.length + selectedSearchFighters.length;
    const badge = document.getElementById("search-active-badge");
    if (badge) {
      if (totalCount > 0) {
        badge.textContent = totalCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }
  }

  function setupRetroMultiSelect(containerId, options, selectedValues, onSelectionChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const btn = container.querySelector(".retro-multi-select-btn");
    const dropdown = container.querySelector(".retro-multi-select-dropdown");
    const selectedTextEl = btn.querySelector(".selected-text");

    dropdown.innerHTML = "";

    // "ALL" Option Row
    const allRow = document.createElement("div");
    allRow.className = "retro-multi-option-row all-option";
    allRow.innerHTML = `
      <label class="retro-checkbox-wrapper">
        <input type="checkbox" class="retro-checkbox-input all-checkbox" ${selectedValues.length === 0 ? "checked" : ""}>
        <span class="retro-checkbox-box"></span>
      </label>
      <span class="option-label">ALL</span>
    `;
    dropdown.appendChild(allRow);

    const allCheckbox = allRow.querySelector(".all-checkbox");

    // Other Options
    const itemCheckboxes = [];
    options.forEach(optVal => {
      const isChecked = selectedValues.includes(optVal);
      const row = document.createElement("div");
      row.className = "retro-multi-option-row";
      row.innerHTML = `
        <label class="retro-checkbox-wrapper">
          <input type="checkbox" class="retro-checkbox-input item-checkbox" value="${optVal}" ${isChecked ? "checked" : ""}>
          <span class="retro-checkbox-box"></span>
        </label>
        <span class="option-label">${optVal.toUpperCase()}</span>
      `;
      dropdown.appendChild(row);

      const checkbox = row.querySelector(".item-checkbox");
      itemCheckboxes.push(checkbox);
    });

    // Toggle dropdown visibility
    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".retro-multi-select-dropdown").forEach(d => {
        if (d !== dropdown) d.classList.add("dropdown-hidden");
      });
      dropdown.classList.toggle("dropdown-hidden");
    };

    dropdown.onclick = (e) => {
      e.stopPropagation();
    };

    // Event listener for "ALL" checkbox
    allCheckbox.onchange = () => {
      if (allCheckbox.checked) {
        itemCheckboxes.forEach(cb => cb.checked = false);
        selectedValues.length = 0;
      } else {
        const anyChecked = itemCheckboxes.some(cb => cb.checked);
        if (!anyChecked) {
          allCheckbox.checked = true;
        }
      }
      updateButtonText();
      onSelectionChange();
    };

    // Event listeners for item checkboxes
    itemCheckboxes.forEach(cb => {
      cb.onchange = () => {
        if (cb.checked) {
          allCheckbox.checked = false;
          if (!selectedValues.includes(cb.value)) {
            selectedValues.push(cb.value);
          }
        } else {
          const idx = selectedValues.indexOf(cb.value);
          if (idx > -1) {
            selectedValues.splice(idx, 1);
          }
          const anyChecked = itemCheckboxes.some(item => item.checked);
          if (!anyChecked) {
            allCheckbox.checked = true;
          }
        }
        updateButtonText();
        onSelectionChange();
      };
    });

    // Row clicks trigger checkbox toggle
    dropdown.querySelectorAll(".retro-multi-option-row").forEach(row => {
      row.onclick = (e) => {
        if (e.target.tagName !== "INPUT") {
          const input = row.querySelector("input");
          input.checked = !input.checked;
          input.dispatchEvent(new Event("change"));
        }
      };
    });

    function updateButtonText() {
      if (allCheckbox.checked || selectedValues.length === 0) {
        selectedTextEl.textContent = containerId.includes("players") ? "ALL PLAYERS" : "ALL FIGHTERS";
        btn.classList.remove("active-selection");
      } else {
        const display = selectedValues.map(v => v.toUpperCase()).join(", ");
        selectedTextEl.textContent = display.length > 20 ? `${selectedValues.length} SELECTED` : display;
        btn.classList.add("active-selection");
      }
    }

    updateButtonText();
  }

  async function initSearchDropdowns() {
    const stats = await window.Database.getStatsAsync();
    const playerNames = stats.players.map(p => p.name).sort();
    const fighters = await api.getAllFighters();

    setupRetroMultiSelect("multi-select-players-container", playerNames, selectedSearchPlayers, () => {
      updateSearchBadge();
      renderHome();
    });

    setupRetroMultiSelect("multi-select-fighters-container", fighters, selectedSearchFighters, () => {
      updateSearchBadge();
      renderHome();
    });
  }

  // Toggle search drawer visibility
  const btnToggleSearch = document.getElementById("btn-toggle-search");
  const searchDrawer = document.getElementById("podium-search-drawer");
  if (btnToggleSearch && searchDrawer) {
    btnToggleSearch.onclick = (e) => {
      e.stopPropagation();
      const isHidden = searchDrawer.style.display === "none" || !searchDrawer.style.display;
      if (isHidden) {
        searchDrawer.style.display = "flex";
        btnToggleSearch.classList.add("active");
      } else {
        searchDrawer.style.display = "none";
        btnToggleSearch.classList.remove("active");
        document.querySelectorAll(".retro-multi-select-dropdown").forEach(d => {
          d.classList.add("dropdown-hidden");
        });
      }
    };
  }

  // Click outside closes dropdowns
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".retro-multi-select-container")) {
      document.querySelectorAll(".retro-multi-select-dropdown").forEach(d => {
        d.classList.add("dropdown-hidden");
      });
    }
  });

  // Clear / Reset podium search filters
  const btnClearPodiumSearch = document.getElementById("btn-clear-podium-search");
  if (btnClearPodiumSearch) {
    btnClearPodiumSearch.onclick = () => {
      selectedSearchPlayers.length = 0;
      selectedSearchFighters.length = 0;
      initSearchDropdowns();
      updateSearchBadge();
      renderHome();
    };
  }

  // Database maintenance controls
  const btnExportDb = document.getElementById("btn-export-db");
  if (btnExportDb) {
    btnExportDb.onclick = async () => {
      const data = {
        matches: await window.Database.getMatchesAsync(),
        apiKey: window.Database.getApiKey(),
        theme: window.Database.getTheme()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smashmetrics_backup_${Date.now()}.json`;
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
      reader.onload = async () => {
        try {
          const data = JSON.parse(reader.result);
          if (data.matches) {
            await window.Database.saveMatchesAsync(data.matches);
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
    btnResetDb.onclick = async () => {
      if (confirm("RESTORE FACTORY SEEDS AND ERASE UNBACKED LOGS?")) {
        await window.Database.resetToSeedsAsync();
        alert("DATABASE RE-INITIALIZED WITH DEFAULTS.");
        router();
      }
    };
  }

  const btnClearDb = document.getElementById("btn-clear-db");
  if (btnClearDb) {
    btnClearDb.onclick = async () => {
      if (confirm("ERASE ALL BATTLE LOGS FROM STORAGE COMPLETELY?")) {
        await window.Database.clearMatchesAsync();
        alert("ALL BATTLE LOGS PURGED FROM DRIVES.");
        router();
      }
    };
  }
});
