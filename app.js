// Retro Super Smash Brothers Application Logic
// Orchestrates routing, VS transition animations, autocomplete, leaderboard sorting,
// OCR Scanning, Battle Records listing/filtering, Telemetry dashboards, and Cabinet specifications.

document.addEventListener("DOMContentLoaded", () => {
  const api = window.apiService;

  // Self-healing fallback in case of browser script caching
  if (api && typeof api.getFullRoster !== "function") {
    api.getFullRoster = async function() {
      try {
        const res = await fetch('assets/roster_slots.json');
        return await res.json();
      } catch (e) {
        console.error("Self-healing getFullRoster fallback failed:", e);
        return [];
      }
    };
  }

  // --- Global State ---
  let currentLeaderboardMode = "players"; // "players" or "fighters"
  let currentSortBy = "wins";
  let activeSearchHighlightIndex = -1;
  let searchResults = [];
  let lastScannedMatch = null;
  let currentPodiumTimeframe = "7days";
  let currentLeaderboardTimeframe = "alltime";
  let currentPlayerTimeframe = "alltime";
  let currentPlayerMatchType = "all";
  let currentPlayerFighterFilters = [];
  let currentFighterTimeframe = "alltime";
  let currentInsightsTimeframe = "alltime";
  let currentInsightsMatchType = "all";
  let currentFighterId = null;
  let currentProfilePlayerId = null;
  let currentVariantIndex = 0;
  let currentFighterStats = null;
  let selectedSearchPlayers = [];
  let selectedSearchFighters = [];
  let selectedSearchWinnerPlayer = null;
  let selectedSearchWinnerFighter = null;
  let selectedSearchLoserPlayer = null;
  let selectedSearchLoserFighter = null;
  let isSearchDropdownsInitialized = false;
  let shouldScrollToMatchList = false;
  let skipClearFiltersOnHome = false;

  // --- Fighters Library State ---
  let fightersSearchQuery = "";
  let timelineSelectedPlayers = [];
  let timelineSelectedFighters = [];
  let fightersSelectedSeries = "all";
  let fightersSortBy = "alpha"; // "alpha" or "mostplayed"
  const cardVariantIndices = {}; // Track active variant index per fighter slug/ID
  let isFightersControlsInitialized = false;

  // --- DOM Elements ---
  const views = {
    home: document.getElementById("home-view"),
    player: document.getElementById("player-profile-view"),
    fighter: document.getElementById("fighter-profile-view"),
    fighters: document.getElementById("fighters-view"),
    leaderboard: document.getElementById("leaderboard-view"),
    scanner: document.getElementById("scanner-view"),
    insights: document.getElementById("insights-view"),
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

  // --- Section Loader Utilities ---
  function showSectionLoader(elementOrId, themeClass = "cyan") {
    const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;

    el.classList.add("section-loading-container");

    let overlay = el.querySelector(":scope > .section-loader-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "section-loader-overlay";
      overlay.innerHTML = `<div class="standard-spinner ${themeClass}"></div>`;
      el.appendChild(overlay);
    } else {
      const spinner = overlay.querySelector(".standard-spinner");
      if (spinner) {
        spinner.className = `standard-spinner ${themeClass}`;
      }
    }

    overlay.offsetHeight; // trigger reflow
    overlay.classList.add("active");
  }

  function hideSectionLoader(elementOrId) {
    const el = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
    if (!el) return;

    const overlay = el.querySelector(":scope > .section-loader-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  function clearAllHomeFilters() {
    // 1. Reset to 30 days
    currentPodiumTimeframe = "30days";

    // 2. Reset all games (style select)
    const podiumStyleSelect = document.getElementById("podium-style-select");
    if (podiumStyleSelect) {
      podiumStyleSelect.value = "all";
    }
    
    const styleContainer = document.getElementById("multi-select-style-container");
    if (styleContainer) {
      const btn = styleContainer.querySelector(".retro-multi-select-btn");
      const selectedTextEl = btn ? btn.querySelector(".selected-text") : null;
      if (selectedTextEl) selectedTextEl.textContent = "ALL GAMES";
      if (btn) btn.classList.remove("active-selection");

      const rows = styleContainer.querySelectorAll(".retro-multi-option-row");
      rows.forEach(r => {
        const val = r.getAttribute("data-value");
        if (val === "all") {
          r.classList.add("active-selection");
          const chk = r.querySelector(".style-checkbox");
          if (chk) chk.checked = true;
        } else {
          r.classList.remove("active-selection");
          const chk = r.querySelector(".style-checkbox");
          if (chk) chk.checked = false;
        }
      });
    }

    // 3. Reset all players & fighters
    selectedSearchPlayers.length = 0;
    selectedSearchFighters.length = 0;

    // 4. Wipe winner/loser filters ("wins only" / "losses only" sections)
    selectedSearchWinnerPlayer = null;
    selectedSearchWinnerFighter = null;
    selectedSearchLoserPlayer = null;
    selectedSearchLoserFighter = null;

    // 5. Force search multi-select dropdowns & sync state to re-initialize next time renderHomeMatchesList runs
    isSearchDropdownsInitialized = false;
  }


  // ==========================================
  // Client Router
  // ==========================================
  async function router() {
    const hash = window.location.hash || "#home";
    const [routeRaw, idRaw] = hash.slice(1).split("/");
    const route = routeRaw ? decodeURIComponent(routeRaw) : "";
    const id = idRaw ? decodeURIComponent(idRaw) : "";

    closeSearch();

    let target = "home";
    if (route === "player" && id) target = "player";
    else if (route === "fighter" && id) target = "fighter";
    else if (route === "fighters") target = "fighters";
    else if (route === "leaderboard") target = "leaderboard";
    else if (route === "scanner") target = "scanner";
    else if (route === "insights") target = "insights";
    else if (route === "settings") target = "settings";

    // Update active state in nav tabs
    const navTabs = ["home", "fighters", "leaderboard", "scanner", "insights", "settings"];
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

    // Reset scroll position to top of page
    window.scrollTo(0, 0);

    // Render corresponding view data
    if (target === "home") {
      if (!skipClearFiltersOnHome) {
        clearAllHomeFilters();
      }
      skipClearFiltersOnHome = false; // Reset flag for subsequent navigations
      isSearchDropdownsInitialized = false;
      await renderHome();
    } else if (target === "player") {
      currentPlayerTimeframe = "alltime";
      currentPlayerMatchType = "all";
      currentPlayerFighterFilters = [];
      await renderPlayerProfile(id);
    } else if (target === "fighter") {
      currentFighterTimeframe = "alltime";
      await renderFighterProfile(id);
    } else if (target === "fighters") {
      await renderFightersLibrary();
    } else if (target === "leaderboard") {
      await renderLeaderboard();
    } else if (target === "scanner") {
      await renderScanner();
    } else if (target === "insights") {
      await renderInsights();
    } else if (target === "settings") {
      await renderSettings();
    }

    await endVsTransition();
  }

  // Bind router and trigger initial routing
  window.addEventListener("hashchange", router);
  router();

  // Dynamic bidirectional hover highlighting between timeline and player rows
  const historyMatchesListEl = document.getElementById("history-matches-list");
  if (historyMatchesListEl) {
    historyMatchesListEl.addEventListener("mouseover", (e) => {
      // 1. Check if hovering a timeline item (timeline-marker or winner-sidebar-row)
      const timelineMarker = e.target.closest(".timeline-marker, .winner-sidebar-row");
      if (timelineMarker) {
        if (e.relatedTarget && timelineMarker.contains(e.relatedTarget)) {
          return;
        }
        const playerName = timelineMarker.getAttribute("data-player-name");
        if (playerName) {
          const matchCard = timelineMarker.closest(".match-history-card");
          if (matchCard) {
            // Find corresponding player row in the same match card
            const playerRow = matchCard.querySelector(`.history-player-row[data-player-name="${playerName}"]`);
            if (playerRow) {
              playerRow.classList.add("hover-highlighted");
            }
          }
        }
        return;
      }

      // 2. Check if hovering a history player row (the player card)
      const playerRow = e.target.closest(".history-player-row");
      if (playerRow) {
        if (e.relatedTarget && playerRow.contains(e.relatedTarget)) {
          return;
        }
        const playerName = playerRow.getAttribute("data-player-name");
        if (playerName) {
          const matchCard = playerRow.closest(".match-history-card");
          if (matchCard) {
            // Find corresponding timeline items and victory/sudden-death rows
            const timelineItems = matchCard.querySelectorAll(`[data-player-name="${playerName}"]`);
            timelineItems.forEach(item => {
              if (item !== playerRow) {
                item.classList.add("hover-highlighted");
              }
            });
          }
        }
      }
    });

    historyMatchesListEl.addEventListener("mouseout", (e) => {
      // 1. Remove highlight when leaving a timeline item
      const timelineMarker = e.target.closest(".timeline-marker, .winner-sidebar-row");
      if (timelineMarker) {
        if (e.relatedTarget && timelineMarker.contains(e.relatedTarget)) {
          return;
        }
        const playerName = timelineMarker.getAttribute("data-player-name");
        if (playerName) {
          const matchCard = timelineMarker.closest(".match-history-card");
          if (matchCard) {
            const playerRow = matchCard.querySelector(`.history-player-row[data-player-name="${playerName}"]`);
            if (playerRow) {
              playerRow.classList.remove("hover-highlighted");
            }
          }
        }
        return;
      }

      // 2. Remove highlight when leaving a history player row
      const playerRow = e.target.closest(".history-player-row");
      if (playerRow) {
        if (e.relatedTarget && playerRow.contains(e.relatedTarget)) {
          return;
        }
        const playerName = playerRow.getAttribute("data-player-name");
        if (playerName) {
          const matchCard = playerRow.closest(".match-history-card");
          if (matchCard) {
            const timelineItems = matchCard.querySelectorAll(`[data-player-name="${playerName}"]`);
            timelineItems.forEach(item => {
              item.classList.remove("hover-highlighted");
            });
          }
        }
      }
    });
  }

  function initQrCode() {
    const qrImg = document.getElementById("qr-code-img");
    if (!qrImg) return;

    const targetUrl = "https://smash-arcade-tracker-wine.vercel.app/#home";
    // Set the QR image source using the free, fast qrserver API
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=000000&bgcolor=ffffff&data=${encodeURIComponent(targetUrl)}`;
  }


  function updateClearFiltersButtonState() {
    const btn = document.getElementById("btn-clear-all-filters");
    if (!btn) return;

    const styleSelect = document.getElementById("podium-style-select");
    const isStyleCleared = !styleSelect || styleSelect.value === "all";
    const isTimeframeCleared = currentPodiumTimeframe === "30days";
    const isPlayersCleared = selectedSearchPlayers.length === 0;
    const isFightersCleared = selectedSearchFighters.length === 0;
    const isWinnerCleared = !selectedSearchWinnerPlayer && !selectedSearchWinnerFighter && !selectedSearchLoserPlayer && !selectedSearchLoserFighter;

    const isAlreadyCleared = isStyleCleared && isTimeframeCleared && isPlayersCleared && isFightersCleared && isWinnerCleared;

    if (isAlreadyCleared) {
      btn.disabled = true;
      btn.style.opacity = "0.3";
      btn.style.cursor = "not-allowed";
      btn.style.pointerEvents = "none";
      btn.style.textShadow = "none";
      btn.style.boxShadow = "none";
    } else {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.style.pointerEvents = "auto";
      btn.style.textShadow = "0 0 5px rgba(255, 0, 127, 0.5)";
      btn.style.boxShadow = "";
    }
  }


  // ==========================================
  // 3. Render Home (The Main Stage)
  // ==========================================
  async function renderHome() {
    // Update Clear Filters button active state
    updateClearFiltersButtonState();

    // Sync dynamic QR code link
    initQrCode();

    const podiumStage = document.querySelector(".podium-stage");
    const matchesList = document.getElementById("history-matches-list");
    showSectionLoader(podiumStage, "yellow");
    showSectionLoader(matchesList, "cyan");

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

    const podiumData = await api.getPodium(currentPodiumTimeframe, activeStyles, selectedSearchPlayers, selectedSearchFighters, selectedSearchWinnerPlayer, selectedSearchWinnerFighter);

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
      if (goldStat) goldStat.textContent = `${gold.wins}/${gold.total} WINS`;
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
    const silverCol = document.getElementById("podium-silver");
    if (silver) {
      if (silverCol) silverCol.style.display = "flex";
      if (silverImg) {
        silverImg.src = silver.fighter.img;
        silverImg.style.opacity = "1";
      }
      if (silverName) silverName.textContent = silver.player.name;
      if (silverStat) silverStat.textContent = `${silver.wins}/${silver.total} WINS`;
      if (silverInfo) {
        silverInfo.onclick = () => window.location.hash = `#player/${silver.player.id}`;
        silverInfo.style.cursor = "pointer";
      }
    } else {
      if (silverCol) silverCol.style.display = "none";
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
    const bronzeCol = document.getElementById("podium-bronze");
    if (bronze) {
      if (bronzeCol) bronzeCol.style.display = "flex";
      if (bronzeImg) {
        bronzeImg.src = bronze.fighter.img;
        bronzeImg.style.opacity = "1";
      }
      if (bronzeName) bronzeName.textContent = bronze.player.name;
      if (bronzeStat) bronzeStat.textContent = `${bronze.wins}/${bronze.total} WINS`;
      if (bronzeInfo) {
        bronzeInfo.onclick = () => window.location.hash = `#player/${bronze.player.id}`;
        bronzeInfo.style.cursor = "pointer";
      }
    } else {
      if (bronzeCol) bronzeCol.style.display = "none";
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
    // Winner/Loser Filter Badge UI
    const badgeContainer = document.getElementById("winner-filter-container");
    const badgeName = document.getElementById("winner-filter-name");
    const badgeLabel = document.getElementById("winner-filter-label");
    const badgeIcon = document.getElementById("winner-filter-icon");
    const badgeClearBtn = document.getElementById("btn-clear-winner-filter");

    if (badgeContainer && badgeName) {
      if (selectedSearchWinnerPlayer || selectedSearchWinnerFighter) {
        badgeName.textContent = (selectedSearchWinnerPlayer || selectedSearchWinnerFighter).toUpperCase();
        if (badgeLabel) badgeLabel.innerHTML = `ONLY SHOWING MATCHES WON BY: <span id="winner-filter-name" class="text-glow-yellow" style="font-weight: bold;">${(selectedSearchWinnerPlayer || selectedSearchWinnerFighter).toUpperCase()}</span>`;
        if (badgeIcon) {
          badgeIcon.textContent = "🏆";
          badgeIcon.style.color = "var(--color-neon-yellow)";
          badgeIcon.style.textShadow = "0 0 4px var(--color-neon-yellow)";
        }
        badgeContainer.style.display = "flex";
      } else if (selectedSearchLoserPlayer || selectedSearchLoserFighter) {
        const name = (selectedSearchLoserPlayer || selectedSearchLoserFighter).toUpperCase();
        badgeName.textContent = name;
        if (badgeLabel) badgeLabel.innerHTML = `ONLY SHOWING MATCHES LOST BY: <span id="winner-filter-name" class="text-glow-magenta" style="font-weight: bold;">${name}</span>`;
        if (badgeIcon) {
          badgeIcon.textContent = "💀";
          badgeIcon.style.color = "var(--color-neon-magenta)";
          badgeIcon.style.textShadow = "0 0 4px var(--color-neon-magenta)";
        }
        badgeContainer.style.display = "flex";
      } else {
        badgeContainer.style.display = "none";
      }

      if (badgeClearBtn) {
        badgeClearBtn.onclick = () => {
          selectedSearchWinnerPlayer = null;
          selectedSearchWinnerFighter = null;
          selectedSearchLoserPlayer = null;
          selectedSearchLoserFighter = null;
          badgeContainer.style.display = "none";
          isSearchDropdownsInitialized = false; // force dropdown re-initialization
          renderHome();
        };
      }
    }

    // Sync timeframe filter toggle buttons
    const timeframeFilters = document.getElementById("podium-timeframe-filters");
    if (timeframeFilters) {
      timeframeFilters.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-timeframe") === currentPodiumTimeframe) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    updateSearchBadge();
    await renderHomeMatchesList();

    if (shouldScrollToMatchList) {
      shouldScrollToMatchList = false;
      setTimeout(() => {
        const matchesList = document.getElementById("history-matches-list");
        if (matchesList) {
          const isWinnerBadgeActive = !!(selectedSearchWinnerPlayer || selectedSearchWinnerFighter);
          const filterHeader = document.querySelector(".podium-header-row");
          const filterHeaderHeight = filterHeader ? filterHeader.getBoundingClientRect().height : 62;
          const winnerFilterHeader = document.getElementById("winner-filter-container");
          const winnerFilterHeight = (isWinnerBadgeActive && winnerFilterHeader && winnerFilterHeader.style.display !== "none") ? winnerFilterHeader.getBoundingClientRect().height : 0;
          
          const stickyHeaderHeight = filterHeaderHeight + winnerFilterHeight;
          const targetY = matchesList.getBoundingClientRect().top + window.scrollY - stickyHeaderHeight - 15;
          window.scrollTo({ top: targetY, behavior: "smooth" });
        }
      }, 400);
    }

    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    
    hideSectionLoader(podiumStage);
    hideSectionLoader(matchesList);
  }


  // ==========================================
  // 4. Render Player Profile
  // ==========================================
  async function renderPlayerProfile(playerIdRaw) {
    const playerId = decodeURIComponent(playerIdRaw);
    const profileContent = document.querySelector("#player-profile-view .profile-content-area");
    showSectionLoader(profileContent, "magenta");
    const startTime = Date.now();

    // Sync timeframe filter toggle buttons
    const ptf = document.getElementById("player-timeframe-filters");
    if (ptf) {
      ptf.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-timeframe") === currentPlayerTimeframe) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Sync match type filter toggle buttons
    const pmf = document.getElementById("player-matchtype-filters");
    if (pmf) {
      pmf.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-matchtype") === currentPlayerMatchType) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Sync fighter filter multi-select dropdown
    const roster = await api.getAllFighters();
    setupRetroMultiSelect("player-profile-multi-select-fighters-container", roster, currentPlayerFighterFilters, () => {
      renderPlayerProfile(playerId);
    });

    // Fetch and filter matches dynamically
    let matches = await window.Database.getMatchesAsync();
    const now = Date.now();
    if (currentPlayerTimeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      matches = matches.filter(m => m.timestamp >= todayStart.getTime());
    } else if (currentPlayerTimeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (currentPlayerTimeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    // Filter matches by match type
    if (currentPlayerMatchType !== 'all') {
      matches = matches.filter(m => {
        const is1v1 = (m.gameMode && m.gameMode.toLowerCase() === '1v1') || 
                      (m.gameStyle && m.gameStyle.toLowerCase() === '1v1') || 
                      (m.players && m.players.length === 2);
        if (is1v1) {
          return currentPlayerMatchType === '1v1';
        }
        const isTeams = m.gameStyle && m.gameStyle.toLowerCase() === 'teams';
        if (isTeams) {
          return currentPlayerMatchType === 'teams';
        }
        // Otherwise Free-for-all
        return currentPlayerMatchType === 'free-for-all' || currentPlayerMatchType === 'ffa';
      });
    }

    // Determine the real player name from the playerId
    let playerName = playerId; // fallback
    const allMatchesForPlayerName = await window.Database.getMatchesAsync();
    for (const m of allMatchesForPlayerName) {
      if (m.players) {
        const p = m.players.find(p => p.playerName.toLowerCase() === playerId.toLowerCase() || p.playerName.toLowerCase().replace(/\s+/g, '-') === playerId.toLowerCase());
        if (p) {
          playerName = p.playerName;
          break;
        }
      }
    }

    // Filter matches by selected fighters (multi-select)
    if (currentPlayerFighterFilters && currentPlayerFighterFilters.length > 0) {
      const lowerFighters = currentPlayerFighterFilters.map(f => f.toLowerCase().trim());
      matches = matches.filter(m => {
        if (!m.players) return false;
        const pRec = m.players.find(p => p.playerName.toLowerCase() === playerName.toLowerCase());
        if (!pRec) return false;
        const fDetails = window.apiService.getFighterDetails(pRec.character);
        return lowerFighters.includes(pRec.character.toLowerCase().trim()) || lowerFighters.includes(fDetails.id.toLowerCase().trim());
      });
    }

    const stats = await api.getPlayerProfile(playerId, matches);
    if (!stats) {
      hideSectionLoader(profileContent);
      return;
    }

    // Sidebar Portrait and Info
    const fighterImgEl = document.getElementById("player-profile-fighter-img");
    if (stats.mostUsedFighter) {
      fighterImgEl.src = stats.mostUsedFighter.img;
      fighterImgEl.style.opacity = "1.0";
      fighterImgEl.style.filter = "none";
    } else {
      fighterImgEl.src = "assets/mario.png?v=5";
      if (stats.totalMatches === 0) {
        fighterImgEl.style.opacity = "0.35";
        fighterImgEl.style.filter = "grayscale(1)";
      } else {
        fighterImgEl.style.opacity = "1.0";
        fighterImgEl.style.filter = "none";
      }
    }
    document.getElementById("player-profile-name").textContent = stats.player.name;

    // Profile metadata panel initialization & Last Played calculation
    const isNewPlayer = (playerId.toLowerCase() !== (currentProfilePlayerId || "").toLowerCase());
    currentProfilePlayerId = playerId;

    if (isNewPlayer) {
      const profileNameInput = document.getElementById("profile-input-name");
      const profileSlackInput = document.getElementById("profile-input-slack");
      const profileTeamInput = document.getElementById("profile-input-team");
      if (profileNameInput) profileNameInput.value = stats.player.name;

      const playerKey = playerId.toLowerCase().replace(/\s+/g, '-');
      const savedSlack = localStorage.getItem(`profile_slack_${playerKey}`);
      const savedTeam = localStorage.getItem(`profile_team_${playerKey}`);

      if (profileSlackInput) {
        if (savedSlack !== null) {
          profileSlackInput.value = savedSlack;
        } else if (playerKey === "matt") {
          profileSlackInput.value = "@Matthew Long";
        } else {
          profileSlackInput.value = "";
        }

        if (!profileSlackInput.dataset.listenerAdded) {
          profileSlackInput.addEventListener("input", (e) => {
            const currentKey = currentProfilePlayerId.toLowerCase().replace(/\s+/g, '-');
            localStorage.setItem(`profile_slack_${currentKey}`, e.target.value);
          });
          profileSlackInput.dataset.listenerAdded = "true";
        }
      }

      if (profileTeamInput) {
        if (savedTeam !== null) {
          profileTeamInput.value = savedTeam;
        } else if (playerKey === "matt") {
          profileTeamInput.value = "Team Folk";
        } else {
          profileTeamInput.value = "";
        }

        if (!profileTeamInput.dataset.listenerAdded) {
          profileTeamInput.addEventListener("input", (e) => {
            const currentKey = currentProfilePlayerId.toLowerCase().replace(/\s+/g, '-');
            localStorage.setItem(`profile_team_${currentKey}`, e.target.value);
          });
          profileTeamInput.dataset.listenerAdded = "true";
        }
      }
    }

    const playerAllMatches = allMatchesForPlayerName.filter(m => m.players && m.players.some(p => p.playerName.toLowerCase() === playerName.toLowerCase()));
    let lastPlayedStr = "Never";
    if (playerAllMatches.length > 0) {
      playerAllMatches.sort((a, b) => b.timestamp - a.timestamp);
      const latestMatch = playerAllMatches[0];
      lastPlayedStr = `${new Date(latestMatch.timestamp).toLocaleDateString()} ${new Date(latestMatch.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    const lastPlayedEl = document.getElementById("profile-text-lastplayed");
    if (lastPlayedEl) {
      lastPlayedEl.textContent = lastPlayedStr;
    }
    document.getElementById("player-stat-games").textContent = stats.totalMatches;
    document.getElementById("player-stat-wins").textContent = stats.wins;
    document.getElementById("player-stat-wins-raw").textContent = `RATING: ${stats.adjustedWins}`;
    document.getElementById("player-stat-losses").textContent = stats.losses;
    document.getElementById("player-stat-winrate").textContent = `${stats.winRate}%`;
    document.getElementById("player-stat-kd").textContent = stats.kdRatio;
    
    // Physical metrics
    document.getElementById("player-stat-kos").textContent = stats.KOs;
    document.getElementById("player-stat-falls").textContent = stats.falls;
    document.getElementById("player-stat-sds").textContent = stats.sds !== undefined ? stats.sds : 0;

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

    // Helper to sync player matchtype selection with the home page style select dropdown
    function syncHomePageStyleWithPlayerFilter() {
      const hiddenInput = document.getElementById("podium-style-select");
      if (hiddenInput) {
        hiddenInput.value = currentPlayerMatchType;
      }
      const container = document.getElementById("multi-select-style-container");
      if (container) {
        const btn = container.querySelector(".retro-multi-select-btn");
        if (btn) {
          const selectedTextEl = btn.querySelector(".selected-text");
          const dropdown = container.querySelector(".retro-multi-select-dropdown");
          if (dropdown) {
            const rows = dropdown.querySelectorAll(".retro-multi-option-row");
            rows.forEach(r => {
              const val = r.getAttribute("data-value");
              if (val === currentPlayerMatchType) {
                r.classList.add("active-selection");
                const chk = r.querySelector(".style-checkbox");
                if (chk) chk.checked = true;
                
                if (val === "all") {
                  if (selectedTextEl) selectedTextEl.textContent = "ALL GAMES";
                  btn.classList.remove("active-selection");
                } else {
                  if (selectedTextEl) selectedTextEl.textContent = r.querySelector(".option-label").textContent;
                  btn.classList.add("active-selection");
                }
              } else {
                r.classList.remove("active-selection");
                const chk = r.querySelector(".style-checkbox");
                if (chk) chk.checked = false;
              }
            });
          }
        }
      }
    }



    // Games Played cell click-through integration
    const gamesCell = document.getElementById("player-games-cell");
    if (gamesCell) {
      gamesCell.onclick = () => {
        selectedSearchPlayers = [stats.player.name];
        selectedSearchFighters = currentPlayerFighterFilters ? [...currentPlayerFighterFilters] : [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentPlayerTimeframe === "alltime") ? "30days" : currentPlayerTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        syncHomePageStyleWithPlayerFilter();
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Wins cell click-through integration
    const winsCell = document.getElementById("player-wins-cell");
    if (winsCell) {
      winsCell.onclick = () => {
        selectedSearchPlayers = [stats.player.name];
        selectedSearchFighters = currentPlayerFighterFilters ? [...currentPlayerFighterFilters] : [];
        selectedSearchWinnerPlayer = stats.player.name;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentPlayerTimeframe === "alltime") ? "30days" : currentPlayerTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        syncHomePageStyleWithPlayerFilter();
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Losses cell click-through integration
    const lossesCell = document.getElementById("player-losses-cell");
    if (lossesCell) {
      lossesCell.onclick = () => {
        selectedSearchPlayers = [stats.player.name];
        selectedSearchFighters = currentPlayerFighterFilters ? [...currentPlayerFighterFilters] : [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = stats.player.name;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentPlayerTimeframe === "alltime") ? "30days" : currentPlayerTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        syncHomePageStyleWithPlayerFilter();
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }
    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    hideSectionLoader(profileContent);
  }  // Helper to update active variant display
  function updateVariantDisplayGlobal() {
    if (!currentFighterStats) return;
    const variants = currentFighterStats.fighter.variants || [];
    const currentVariant = variants[currentVariantIndex];
    if (!currentVariant) return;

    // Find and update image
    const matchingAlt = currentFighterStats.fighter.alts ? currentFighterStats.fighter.alts.find(alt => alt.variant === currentVariant.name) : null;
    const variantImg = matchingAlt ? matchingAlt.image : currentFighterStats.fighter.img;
    document.getElementById("fighter-profile-img").src = variantImg;
    
    // Update Variant Subtitle Badge
    const variantBadge = document.getElementById("fighter-profile-variant-badge");
    if (variantBadge) {
      variantBadge.textContent = `${currentVariant.name.toUpperCase()}${currentVariant.boxing_ring_title ? ' // ' + currentVariant.boxing_ring_title.toUpperCase() : ''}`;
      variantBadge.style.display = "inline-block";
    }
    
    // Filter and update Backstory tips
    let backstoryText = "";
    if (currentFighterStats.fighter.tips) {
      const relevantTips = currentFighterStats.fighter.tips.filter(t => 
        t.variant_name && t.variant_name.toLowerCase() === currentVariant.name.toLowerCase()
      );
      if (relevantTips.length > 0) {
        backstoryText = relevantTips.map(t => t.description).join("\n\n");
      } else {
        const originTips = currentFighterStats.fighter.tips.filter(t => t.type === "origin" && !t.variant_name);
        backstoryText = originTips.map(t => t.description).join("\n\n") || currentFighterStats.fighter.bio;
      }
    } else {
      backstoryText = currentFighterStats.fighter.bio;
    }
    document.getElementById("fighter-profile-bio").textContent = backstoryText;
  }

  // ==========================================
  // Helper to render Switch Button Combos
  // ==========================================
  function getSwitchButtonsHtml(moveText) {
    if (!moveText) return "";
    const move = moveText.trim().toLowerCase();

    // Helpers to build styled spans
    const btnDir = (dir) => {
      const lowerDir = dir.toLowerCase();
      const isAny = dir === "✥" || lowerDir.includes("any") || lowerDir.includes("direction");
      const title = isAny ? "Any Direction" : dir;
      const extraClass = isAny ? " btn-dir-any" : "";
      
      let svgHtml = "";
      if (isAny) {
        svgHtml = `
          <svg class="joypad-svg joypad-any" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="12" x2="12" y2="5" />
            <line x1="12" y1="12" x2="12" y2="19" />
            <line x1="12" y1="12" x2="4" y2="12" />
            <line x1="12" y1="12" x2="20" y2="12" />
            <path d="M 9,8 L 12,5 L 15,8" stroke-width="1.8" />
            <path d="M 9,16 L 12,19 L 15,16" stroke-width="1.8" />
            <path d="M 7,9 L 4,12 L 7,15" stroke-width="1.8" />
            <path d="M 17,9 L 20,12 L 17,15" stroke-width="1.8" />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        `;
      } else if (dir === "▲") {
        svgHtml = `
          <svg class="joypad-svg joypad-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="15" x2="12" y2="7" />
            <circle cx="12" cy="7" r="3" fill="currentColor" />
            <path d="M 9,10 L 12,7 L 15,10" stroke-width="1.8" />
          </svg>
        `;
      } else if (dir === "▼") {
        svgHtml = `
          <svg class="joypad-svg joypad-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="9" x2="12" y2="17" />
            <circle cx="12" cy="17" r="3" fill="currentColor" />
            <path d="M 9,14 L 12,17 L 15,14" stroke-width="1.8" />
          </svg>
        `;
      } else if (dir === "◀") {
        svgHtml = `
          <svg class="joypad-svg joypad-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="15" y1="12" x2="7" y2="12" />
            <circle cx="7" cy="12" r="3" fill="currentColor" />
            <path d="M 10,9 L 7,12 L 10,15" stroke-width="1.8" />
          </svg>
        `;
      } else if (dir === "▶") {
        svgHtml = `
          <svg class="joypad-svg joypad-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="9" y1="12" x2="17" y2="12" />
            <circle cx="17" cy="12" r="3" fill="currentColor" />
            <path d="M 14,9 L 17,12 L 14,15" stroke-width="1.8" />
          </svg>
        `;
      } else if (dir === "◀/▶") {
        svgHtml = `
          <svg class="joypad-svg joypad-side" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="12" x2="17" y2="12" />
            <circle cx="7" cy="12" r="2.2" fill="currentColor" />
            <circle cx="17" cy="12" r="2.2" fill="currentColor" />
            <path d="M 10,9 L 7,12 L 10,15" stroke-width="1.8" />
            <path d="M 14,9 L 17,12 L 14,15" stroke-width="1.8" />
          </svg>
        `;
      } else {
        svgHtml = dir;
      }
      
      return `<span class="switch-btn btn-dir${extraClass}" title="${title}">${svgHtml}</span>`;
    };
    const btnAction = (char, cls, title) => `<span class="switch-btn ${cls}" title="${title || char}">${char}</span>`;
    const plus = `<span class="switch-plus">+</span>`;
    const arrow = `<span class="switch-arrow">→</span>`;

    // Grabs, Throws & Pummels
    if (move.includes("grab") || move.includes("throw") || move.includes("pummel")) {
      if (move === "grab") {
        return btnAction("ZR", "btn-trigger", "Grab Button");
      }
      if (move.includes("grab attack") || move.includes("pummel")) {
        return btnAction("ZR", "btn-trigger", "Grab") + arrow + btnAction("A", "btn-a", "Attack");
      }
      // Directional Throws
      let dir = "";
      if (move.includes("forward") || move.includes("front")) dir = "▶";
      else if (move.includes("back") || move.includes("backward")) dir = "◀";
      else if (move.includes("up") || move.includes("upward")) dir = "▲";
      else if (move.includes("down") || move.includes("downward")) dir = "▼";
      else if (move.includes("direction") || move.includes("any") || move.includes("choice") || move.includes("throw")) dir = "✥";

      if (dir) {
        return btnAction("ZR", "btn-trigger", "Grab") + arrow + btnDir(dir);
      }
      return btnAction("ZR", "btn-trigger", "Grab");
    }

    // Special Attacks (B Button)
    if (move.includes("special")) {
      let dir = "";
      if (move.includes("up")) dir = "▲";
      else if (move.includes("down")) dir = "▼";
      else if (move.includes("side") || move.includes("forward") || move.includes("backward") || move.includes("back") || move.includes("tilt")) dir = "◀/▶";
      else if (move.includes("direction") || move.includes("any") || move.includes("choice") || move.includes("stick") || move.includes("joypad") || move.includes("joystick")) dir = "✥";

      let heavy = move.includes("heavy") ? " (HEAVY)" : "";

      let finalHtml = "";
      if (dir) {
        finalHtml = btnDir(dir) + plus + btnAction("B", "btn-b", "Special Button");
      } else {
        finalHtml = btnAction("B", "btn-b", "Special Button");
      }
      if (heavy) {
        finalHtml += `<span class="btn-modifier">${heavy}</span>`;
      }
      return finalHtml;
    }

    // Smash Attacks (A Button Hard or C-Stick)
    if (move.includes("smash")) {
      let dir = "";
      if (move.includes("up")) dir = "▲";
      else if (move.includes("down")) dir = "▼";
      else if (move.includes("side") || move.includes("forward")) dir = "◀/▶";
      else if (move.includes("direction") || move.includes("any") || move.includes("choice") || move.includes("stick") || move.includes("joypad") || move.includes("joystick")) dir = "✥";

      if (dir) {
        return btnDir(dir) + plus + btnAction("A", "btn-a", "Attack Button") + `<span class="btn-modifier"> (HARD)</span>`;
      }
      return btnAction("A", "btn-a", "Attack Button") + `<span class="btn-modifier"> (HARD)</span>`;
    }

    // Aerial Attacks (Air + A Button)
    if (move.includes("air")) {
      let dir = "";
      if (move.includes("up")) dir = "▲";
      else if (move.includes("down")) dir = "▼";
      else if (move.includes("forward") || move.includes("front")) dir = "▶";
      else if (move.includes("back")) dir = "◀";
      else if (move.includes("direction") || move.includes("any") || move.includes("choice") || move.includes("stick") || move.includes("joypad") || move.includes("joystick")) dir = "✥";

      let airBadge = `<span class="btn-modifier btn-air-badge">MIDAIR</span> `;
      if (dir) {
        return airBadge + btnDir(dir) + plus + btnAction("A", "btn-a", "Attack Button");
      }
      return airBadge + btnAction("A", "btn-a", "Attack Button");
    }

    // Tilts, Jabs & Ground Attacks
    if (move.includes("tilt") || move.includes("attack") || move.includes("ground") || move.includes("jab") || move.includes("neutral")) {
      let dir = "";
      if (move.includes("up")) dir = "▲";
      else if (move.includes("down")) dir = "▼";
      else if (move.includes("side") || move.includes("forward") || move.includes("back") || move.includes("tilt")) dir = "◀/▶";
      else if (move.includes("direction") || move.includes("any") || move.includes("choice") || move.includes("stick") || move.includes("joypad") || move.includes("joystick")) dir = "✥";

      let isDash = move.includes("dash");
      let isHeavy = move.includes("heavy") ? " (HEAVY)" : "";
      let isLight = move.includes("light") ? " (LIGHT)" : "";

      let finalHtml = "";
      if (isDash) {
        finalHtml = `<span class="btn-modifier">DASH</span>` + plus + btnAction("A", "btn-a", "Attack Button");
      } else if (dir) {
        finalHtml = btnDir(dir) + plus + btnAction("A", "btn-a", "Attack Button");
      } else {
        finalHtml = btnAction("A", "btn-a", "Attack Button");
      }

      if (isHeavy) finalHtml += `<span class="btn-modifier">${isHeavy}</span>`;
      if (isLight) finalHtml += `<span class="btn-modifier">${isLight}</span>`;
      return finalHtml;
    }

    // Final Smash
    if (move.includes("final smash")) {
      return btnAction("B", "btn-b", "Special Button") + `<span class="btn-modifier"> (FS METER / BALL)</span>`;
    }

    // Command-Input Special Mechanics
    if (move.includes("command")) {
      return `<span class="btn-modifier">COMMAND INPUT</span>`;
    }

    // General Directional or Joystick fallbacks
    if (move.includes("direction") || move.includes("stick") || move.includes("joypad") || move.includes("joystick")) {
      return btnDir("✥");
    }

    // Fallback default
    return `<span class="btn-modifier">${moveText.toUpperCase()}</span>`;
  }


  // ==========================================
  // 5. Render Fighter Profile
  // ==========================================
  async function renderFighterProfile(fighterIdRaw) {
    const fighterId = decodeURIComponent(fighterIdRaw);
    const profileSidebar = document.querySelector("#fighter-profile-view .profile-sidebar");
    showSectionLoader(profileSidebar, "cyan");
    const startTime = Date.now();

    // Sync timeframe filter toggle buttons
    const ftf = document.getElementById("fighter-timeframe-filters");
    if (ftf) {
      ftf.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-timeframe") === currentFighterTimeframe) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Fetch and filter matches dynamically
    let matches = await window.Database.getMatchesAsync();
    const now = Date.now();
    if (currentFighterTimeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      matches = matches.filter(m => m.timestamp >= todayStart.getTime());
    } else if (currentFighterTimeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (currentFighterTimeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    const stats = await api.getFighterProfile(fighterId, matches);
    if (!stats) {
      hideSectionLoader(profileSidebar);
      return;
    }

    // Track active IDs and assign global stats for variants
    if (currentFighterId !== fighterId) {
      currentVariantIndex = 0;
      currentFighterId = fighterId;
    }
    currentFighterStats = stats;

    // Set dynamic series background watermark for entire view
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

    // Set dynamic series image backdrop specifically behind the character
    const seriesImgBackdrop = document.getElementById("fighter-series-image-backdrop");
    if (seriesImgBackdrop) {
      const seriesIcon = stats.fighter.series && stats.fighter.series.icon ? stats.fighter.series.icon : "";
      if (seriesIcon) {
        seriesImgBackdrop.style.backgroundImage = `url('${seriesIcon}')`;
        seriesImgBackdrop.style.display = "block";
      } else {
        seriesImgBackdrop.style.backgroundImage = "none";
        seriesImgBackdrop.style.display = "none";
      }
    }

    // Update Backstory Series Pill
    const seriesPill = document.getElementById("fighter-backstory-series-pill");
    if (seriesPill) {
      if (stats.fighter.series) {
        seriesPill.textContent = stats.fighter.series.name.toUpperCase();
        seriesPill.style.display = "inline-block";
      } else {
        seriesPill.style.display = "none";
      }
    }

    // Sidebar Portrait and Backstory
    document.getElementById("fighter-profile-name").textContent = stats.fighter.name;

    // Handle variant arrow button visibility and initial state
    const variants = stats.fighter.variants || [];
    const btnPrev = document.getElementById("btn-variant-prev");
    const btnNext = document.getElementById("btn-variant-next");
    const variantBadge = document.getElementById("fighter-profile-variant-badge");

    if (variants.length > 1) {
      if (btnPrev) btnPrev.style.display = "block";
      if (btnNext) btnNext.style.display = "block";
      updateVariantDisplayGlobal();
    } else {
      if (btnPrev) btnPrev.style.display = "none";
      if (btnNext) btnNext.style.display = "none";
      if (variantBadge) variantBadge.style.display = "none";
      document.getElementById("fighter-profile-img").src = stats.fighter.img;
      const originTips = stats.fighter.tips ? stats.fighter.tips.filter(t => t.type === "origin" && !t.variant_name) : [];
      document.getElementById("fighter-profile-bio").textContent = originTips.map(t => t.description).join("\n\n") || stats.fighter.bio;
    }

    // Stat grids
    document.getElementById("fighter-stat-games").textContent = stats.totalMatches;
    document.getElementById("fighter-stat-wins").textContent = stats.wins;
    document.getElementById("fighter-stat-wins-raw").textContent = `RATING: ${stats.adjustedWins}`;
    document.getElementById("fighter-stat-losses").textContent = stats.losses;
    document.getElementById("fighter-stat-winrate").textContent = `${stats.winRate}%`;
    document.getElementById("fighter-stat-kd").textContent = stats.kdRatio;
    document.getElementById("fighter-stat-kos").textContent = stats.KOs;
    document.getElementById("fighter-stat-falls").textContent = stats.falls;
    document.getElementById("fighter-stat-sds").textContent = stats.sds;

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
      stats.topPlayers.slice(0, 5).forEach((tp, i) => {
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
      topPlayersContainer.innerHTML = `<div style="font-family: var(--font-stats); opacity: 0.6; font-size: var(--font-size-sm);">NO BATTLE RECORD</div>`;
    }

    // Render Moves Library List
    const movesContainer = document.getElementById("fighter-moves-list");
    movesContainer.innerHTML = "";

    const tips = stats.fighter.tips || [];
    const categories = {};
    
    tips.forEach(t => {
      if (!t.move) return; 
      const cat = t.type || "Other Moves";
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push(t);
    });

    const sortedCategories = [
      "Standard Ground Attacks",
      "Aerial Attacks",
      "Standard Special Moves",
      "Smash Attacks",
      "Special Variant Combinations",
      "Throws & Grabs"
    ];

    // Find any other categories not in sortedCategories
    const allCategoriesInTips = Object.keys(categories);
    const extraCategories = allCategoriesInTips.filter(cat => !sortedCategories.includes(cat));
    const finalCategoryOrder = [...sortedCategories, ...extraCategories];

    let hasAnyMoves = false;

    // Create the unified retro table
    const table = document.createElement("table");
    table.className = "moves-table-retro";
    table.innerHTML = `
      <thead>
        <tr>
          <th style="width: 25%; text-align: left;">INPUT COMMAND</th>
          <th style="width: 25%; text-align: left;">MOVE NAME</th>
          <th style="width: 50%; text-align: left;">EFFECT & TACTICAL ADVICE</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    finalCategoryOrder.forEach(catName => {
      const moves = categories[catName];
      if (!moves || moves.length === 0) return;
      hasAnyMoves = true;

      // Add Category Row Header
      const headerRow = document.createElement("tr");
      headerRow.className = "category-header-row";
      headerRow.innerHTML = `
        <td colspan="3">${catName.toUpperCase()}</td>
      `;
      tbody.appendChild(headerRow);

      // Add Move Rows
      moves.forEach(m => {
        const moveRow = document.createElement("tr");
        moveRow.className = "move-row";

        // Parse buttons HTML
        const buttonsHtml = getSwitchButtonsHtml(m.move);

        // Parse nested sub-tips
        let subtipsHtml = "";
        if (m.extra_info && m.extra_info.length > 0) {
          subtipsHtml += `<div class="move-subtips-container">`;
          m.extra_info.forEach(sub => {
            const lvlClass = (sub.level || "").toLowerCase();
            subtipsHtml += `
              <div class="move-subtip-item">
                <div class="subtip-header">
                  <span class="subtip-level-badge ${lvlClass}">${(sub.level || "TIPS").toUpperCase()}</span>
                  <span class="subtip-name">${sub.name}</span>
                </div>
                <p class="subtip-desc">${sub.description}</p>
              </div>
            `;
          });
          subtipsHtml += `</div>`;
        }

        moveRow.innerHTML = `
          <td data-label="INPUT COMMAND">
            <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
              ${buttonsHtml}
            </div>
          </td>
          <td data-label="MOVE NAME">
            <span class="move-name-text text-glow-cyan" style="font-family: var(--font-header); font-size: 13px; color: #fff; text-shadow: 0 0 5px rgba(0, 240, 255, 0.4); text-transform: uppercase;">${m.name}</span>
          </td>
          <td data-label="EFFECT & TACTICAL ADVICE">
            <div style="display: flex; flex-direction: column; text-align: left;">
              <p class="move-desc" style="font-family: monospace; font-size: 12px; color: #c4c6d0; opacity: 0.95; margin: 0; line-height: 1.5;">${m.description}</p>
              ${subtipsHtml}
            </div>
          </td>
        `;

        tbody.appendChild(moveRow);
      });
    });

    if (hasAnyMoves) {
      movesContainer.appendChild(table);
    } else {
      movesContainer.innerHTML = `<div style="font-family: var(--font-stats); opacity: 0.6; font-size: 13px; text-align: center; padding: 20px;">NO MOVES REGISTERED FOR THIS FIGHTER</div>`;
    }

    // Games Played cell click-through integration
    const gamesCell = document.getElementById("fighter-games-cell");
    if (gamesCell) {
      gamesCell.onclick = () => {
        selectedSearchFighters = [stats.fighter.name];
        selectedSearchPlayers = [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentFighterTimeframe === "alltime") ? "30days" : currentFighterTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Wins cell click-through integration
    const winsCell = document.getElementById("fighter-wins-cell");
    if (winsCell) {
      winsCell.onclick = () => {
        selectedSearchFighters = [stats.fighter.name];
        selectedSearchPlayers = [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = stats.fighter.name;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentFighterTimeframe === "alltime") ? "30days" : currentFighterTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Losses cell click-through integration
    const lossesCell = document.getElementById("fighter-losses-cell");
    if (lossesCell) {
      lossesCell.onclick = () => {
        selectedSearchFighters = [stats.fighter.name];
        selectedSearchPlayers = [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = stats.fighter.name;
        currentPodiumTimeframe = (currentFighterTimeframe === "alltime") ? "30days" : currentFighterTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Win rate cell click-through integration
    const winrateCell = document.getElementById("fighter-winrate-cell");
    if (winrateCell) {
      winrateCell.onclick = () => {
        selectedSearchFighters = [stats.fighter.name];
        selectedSearchPlayers = [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = stats.fighter.name;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentFighterTimeframe === "alltime") ? "30days" : currentFighterTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }

    // Knockout / Fall ratio cell click-through integration
    const kdCell = document.getElementById("fighter-kd-cell");
    if (kdCell) {
      kdCell.onclick = () => {
        selectedSearchFighters = [stats.fighter.name];
        selectedSearchPlayers = [];
        selectedSearchWinnerPlayer = null;
        selectedSearchWinnerFighter = null;
        selectedSearchLoserPlayer = null;
        selectedSearchLoserFighter = null;
        currentPodiumTimeframe = (currentFighterTimeframe === "alltime") ? "30days" : currentFighterTimeframe;
        shouldScrollToMatchList = true;
        isSearchDropdownsInitialized = false; // force dropdown re-initialization
        skipClearFiltersOnHome = true;
        window.location.hash = "#home";
      };
    }
    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    hideSectionLoader(profileSidebar);
  }


  // ==========================================
  // 6. Render Global Leaderboard
  // ==========================================
  async function renderLeaderboard() {
    const leaderboardContainer = document.querySelector(".leaderboard-table-container");
    showSectionLoader(leaderboardContainer, "yellow");
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
      { key: "detailLabel", label: isFighterMode ? "Top Player" : "Signature fighter" },
      { key: "winRate", label: "Win rate" },
      { key: "totalGames", label: "Matches played" },
      { key: "pureWins", label: "Wins" },
      { key: "losses", label: "Losses" },
      { key: "kd", label: "Knockout / fall ratio" },
      { key: "KOs", label: "Knockouts" },
      { key: "falls", label: "Falls" },
      { key: "sds", label: "Self-Destructs" }
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

    // Gather selected styles from custom single-select dropdown
    let activeStyles = ["1v1", "free-for-all", "teams"];
    const styleSelectEl = document.getElementById("leaderboard-style-select");
    if (styleSelectEl && styleSelectEl.value !== "all") {
      activeStyles = [styleSelectEl.value];
    }

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
        <td class="numeric-cell text-glow-yellow">${rec.adjustedWins}</td>
        <td class="name-cell text-glow-yellow" onclick="window.location.hash = '${detailLink}'">
          ${detailContent}
        </td>
        <td class="numeric-cell">${rec.winRate}%</td>
        <td class="numeric-cell">${rec.totalGames}</td>
        <td class="numeric-cell">${rec.wins}</td>
        <td class="numeric-cell">${rec.losses}</td>
        <td class="numeric-cell text-glow-magenta">${rec.kd}</td>
        <td class="numeric-cell">${rec.KOs}</td>
        <td class="numeric-cell">${rec.falls}</td>
        <td class="numeric-cell">${rec.sds}</td>
      `;

      rowsBody.appendChild(tr);
    });

    // Enforce smooth minimum display delay of 250ms
    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    hideSectionLoader(leaderboardContainer);
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

    if (selectedSearchWinnerPlayer) {
      const wpLower = selectedSearchWinnerPlayer.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.playerName.toLowerCase().trim() === wpLower && p.placement === 1));
    }
    if (selectedSearchWinnerFighter) {
      const wfLower = selectedSearchWinnerFighter.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.character.toLowerCase().trim() === wfLower && p.placement === 1));
    }
    if (selectedSearchLoserPlayer) {
      const lpLower = selectedSearchLoserPlayer.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.playerName.toLowerCase().trim() === lpLower && p.placement !== 1));
    }
    if (selectedSearchLoserFighter) {
      const lfLower = selectedSearchLoserFighter.toLowerCase().trim();
      matches = matches.filter(m => m.players && m.players.some(p => p.character.toLowerCase().trim() === lfLower && p.placement !== 1));
    }

    const container = document.getElementById("history-matches-list");
    container.innerHTML = "";

    if (matches.length === 0) {
      container.innerHTML = `<div class="panel-beveled flex-center" style="padding: 40px; font-family: var(--font-arcade); color: #666; font-size: var(--font-size-sm);">NO COMPATIBLE BATTLE RECORD ENCOUNTERED</div>`;
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

      // Generate markers for the timeline with collision avoidance (separated by above/below direction to avoid double-height lines for simultaneous opposite knockouts)
      const staggerCounts = { above: {}, below: {} };
      let maxStaggerAbove = -1;
      let maxStaggerBelow = -1;
      let markersHtml = "";
      let winnersHtml = "";
      let markerIdx = 0;

      if (m.players) {
        m.players.forEach((p) => {
          const outAtSecs = parseOutAtToSeconds(p.outAt);
          const hasNoKnockoutTime = (outAtSecs === null);
          const isWinner = (p.placement === 1);
          const fighterObj = api.getFighterDetails(p.character) || {};
          const iconUrl = fighterObj.icon || 'assets/mario.png';

          const isPlayerFiltered = (selectedSearchPlayers && selectedSearchPlayers.some(sp => sp.toLowerCase() === p.playerName.toLowerCase())) || 
                                   (selectedSearchWinnerPlayer && selectedSearchWinnerPlayer.toLowerCase() === p.playerName.toLowerCase()) ||
                                   (selectedSearchLoserPlayer && selectedSearchLoserPlayer.toLowerCase() === p.playerName.toLowerCase());
          const isFighterFiltered = (selectedSearchFighters && selectedSearchFighters.some(sf => sf.toLowerCase() === p.character.toLowerCase())) || 
                                    (selectedSearchWinnerFighter && selectedSearchWinnerFighter.toLowerCase() === p.character.toLowerCase()) ||
                                    (selectedSearchLoserFighter && selectedSearchLoserFighter.toLowerCase() === p.character.toLowerCase());
          const isFilteredMatch = isPlayerFiltered || isFighterFiltered;
          const filterClass = isFilteredMatch ? 'filter-highlighted' : '';

          if (hasNoKnockoutTime) {
            if (isWinner) {
              winnersHtml += `
                <div class="winner-sidebar-row" data-player-name="${p.playerName.toLowerCase()}" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                  <!-- Dot marker (Character head-icon bubble in gold) -->
                  <div class="winner-icon-bubble" style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-dark); border: 2px solid var(--color-neon-yellow); box-shadow: 0 0 8px var(--color-neon-yellow); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 14px var(--color-neon-yellow)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" >
                    <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${p.character}" />
                  </div>
                  <!-- Name/Details in a panel-beveled gold border box -->
                  <div class="panel-beveled winner-name-box ${filterClass}" style="white-space: nowrap; background: var(--color-bg-dark); border: 1px solid var(--color-neon-yellow); padding: 3px 8px; font-size: 10px; font-family: var(--font-stats); box-shadow: 0 0 8px rgba(0,0,0,0.8); border-radius: 4px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.borderColor='#fff'; this.style.boxShadow='0 0 12px var(--color-neon-yellow)';" onmouseout="this.style.borderColor=''; this.style.boxShadow='';" >
                    <span style="font-weight: bold; color: #fff; text-shadow: 0 0 2px rgba(255,255,255,0.5);">${p.playerName} 🏆</span>
                  </div>
                </div>
              `;
            } else {
              winnersHtml += `
                <div class="winner-sidebar-row sudden-death-row" data-player-name="${p.playerName.toLowerCase()}" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; opacity: 0.65;">
                  <!-- Dot marker (Character head-icon bubble in grey) -->
                  <div class="winner-icon-bubble sudden-death-icon" style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-bg-dark); border: 2px solid #555; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; filter: grayscale(0.8); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 14px #aaa'; this.style.filter='grayscale(0)';" onmouseout="this.style.transform=''; this.style.boxShadow=''; this.style.filter='grayscale(0.8)';" >
                    <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${p.character}" />
                  </div>
                  <!-- Name/Details in a panel-beveled grey border box -->
                  <div class="panel-beveled winner-name-box sudden-death-name-box ${filterClass}" style="white-space: nowrap; background: var(--color-bg-dark); border: 1px solid #444; padding: 3px 8px; font-size: 10px; font-family: var(--font-stats); border-radius: 4px; display: flex; flex-direction: column; gap: 1px; box-shadow: 0 0 4px rgba(0,0,0,0.5); cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.borderColor='#fff'; this.style.boxShadow='0 0 12px #aaa';" onmouseout="this.style.borderColor=''; this.style.boxShadow='';" >
                    <span style="font-weight: bold; color: #aaa;">${p.playerName}</span>
                    <span style="font-size: 8px; color: #777; font-weight: bold; letter-spacing: 0.5px; line-height: 1;">SUDDEN DEATH</span>
                  </div>
                </div>
              `;
            }
          } else {
            const pct = (outAtSecs / 300) * 100;
            const safePct = Math.max(0, Math.min(100, pct));
            
            const isAbove = (markerIdx % 2 === 0);
            markerIdx++;

            const pctKey = safePct.toFixed(1);
            const sideKey = isAbove ? 'above' : 'below';
            if (!staggerCounts[sideKey][pctKey]) {
              staggerCounts[sideKey][pctKey] = 0;
            }
            const staggerIndex = staggerCounts[sideKey][pctKey]++;
            
            if (isAbove) {
              maxStaggerAbove = Math.max(maxStaggerAbove, staggerIndex);
            } else {
              maxStaggerBelow = Math.max(maxStaggerBelow, staggerIndex);
            }
            
            const markerColor = isWinner ? 'var(--color-neon-yellow)' : 'var(--color-neon-magenta)';
            const textColor = isWinner ? 'var(--color-neon-yellow)' : 'var(--color-neon-magenta)';
            
            const offsetSize = 15 + staggerIndex * 30;
            const displayTime = p.outAt || "5:00";
 
             markersHtml += `
               <div class="timeline-marker" data-player-name="${p.playerName.toLowerCase()}" style="position: absolute; left: ${safePct}%; top: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; z-index: 10;">
                 <!-- Dot marker (Character head-icon bubble centered on timeline) -->
                 <div class="timeline-dot" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: var(--color-bg-dark); border: 2px solid ${markerColor}; box-shadow: 0 0 8px ${markerColor}; z-index: 11; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 14px ${markerColor}';" onmouseout="this.style.transform=''; this.style.boxShadow='';" >
                   <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${p.character}" />
                 </div>
                 <!-- Connector line coming out of the bubble -->
                 <div class="timeline-connector" style="position: absolute; left: 11px; ${isAbove ? `bottom: 24px` : `top: 24px`}; width: 2px; height: ${offsetSize}px; background: ${markerColor}; opacity: 0.8; z-index: 9;"></div>
                 <!-- Player details box -->
                 <div class="timeline-player-info panel-beveled ${filterClass}" style="position: absolute; left: 12px; ${isAbove ? `bottom: ${24 + offsetSize}px` : `top: ${24 + offsetSize}px`}; transform: translateX(-50%); text-align: center; white-space: nowrap; background: var(--color-bg-dark); border: 1px solid ${markerColor}; padding: 3px 8px; font-size: 10px; font-family: var(--font-stats); box-shadow: 0 0 8px rgba(0,0,0,0.8); border-radius: 4px; pointer-events: auto; user-select: none; z-index: 10; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#player/${p.playerName.toLowerCase().replace(/\s+/g, '-')}'" onmouseover="this.style.borderColor='#fff'; this.style.boxShadow='0 0 12px ${markerColor}';" onmouseout="this.style.borderColor=''; this.style.boxShadow='';" >
                   <span style="font-weight: bold; color: #fff; text-shadow: 0 0 2px rgba(255,255,255,0.5);">${p.playerName}${isWinner ? ' 🏆' : ''}</span>
                   <span class="hover-time" style="color: ${textColor}; font-weight: bold; text-shadow: 0 0 4px ${textColor};">(${displayTime})</span>
                 </div>
               </div>
             `;
           }
        });
      }

      const pTop = maxStaggerAbove >= 0 ? Math.max(50, 75 + maxStaggerAbove * 30) : 50;
      const pBottom = maxStaggerBelow >= 0 ? Math.max(40, 75 + maxStaggerBelow * 30) : 40;

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
          ${[...m.players].sort((a, b) => (a.placement || Number.MAX_SAFE_INTEGER) - (b.placement || Number.MAX_SAFE_INTEGER)).map(p => {
            const hasTeamColor = m.gameStyle && m.gameStyle.toLowerCase() === 'teams' && p.teamColor && p.teamColor.toLowerCase() !== 'none';
            const teamClass = hasTeamColor ? `team-${p.teamColor.toLowerCase()}` : '';
            const fighterObj = api.getFighterDetails(p.character) || {};
            const iconUrl = fighterObj.icon || 'assets/mario.png';

            const isPlayerFiltered = (selectedSearchPlayers && selectedSearchPlayers.some(sp => sp.toLowerCase() === p.playerName.toLowerCase())) || 
                                     (selectedSearchWinnerPlayer && selectedSearchWinnerPlayer.toLowerCase() === p.playerName.toLowerCase()) ||
                                     (selectedSearchLoserPlayer && selectedSearchLoserPlayer.toLowerCase() === p.playerName.toLowerCase());
            const isFighterFiltered = (selectedSearchFighters && selectedSearchFighters.some(sf => sf.toLowerCase() === p.character.toLowerCase())) || 
                                      (selectedSearchWinnerFighter && selectedSearchWinnerFighter.toLowerCase() === p.character.toLowerCase()) ||
                                      (selectedSearchLoserFighter && selectedSearchLoserFighter.toLowerCase() === p.character.toLowerCase());
            const isFilteredMatch = isPlayerFiltered || isFighterFiltered;
            const filterClass = isFilteredMatch ? 'filter-highlighted' : '';

            return `
              <div class="history-player-row ${p.placement === 1 ? 'winner' : ''} ${teamClass} ${filterClass}" data-player-name="${p.playerName.toLowerCase()}">
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
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="delete-match-btn" data-id="${m.id}" title="Delete Record">🗑️</button>
        <div class="match-timeline-drawer" id="timeline-drawer-${m.id}">
          <!-- Timeline Track Column -->
          <div class="timeline-track-column" style="padding-top: ${pTop}px; padding-bottom: ${pBottom}px;">
            <div class="timeline-track-container">
              <div class="timeline-track-glow"></div>
              <div class="timeline-label start">0:00 (START)</div>
              <div class="timeline-label end">5:00 (END)</div>
              ${markersHtml}
            </div>
          </div>
          
          <!-- Victory Sidebar Column -->
          <div class="timeline-victory-column">
            <div class="timeline-victory-title">🏆 VICTORY</div>
            <div class="timeline-victory-list">
              ${winnersHtml || `<div style="font-family: var(--font-stats); font-size: 11px; color: #666;">NO SURVIVORS</div>`}
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }


  // --- Insights Filter Helper ---
  async function getInsightsFilteredMatches() {
    let matches = await window.Database.getMatchesAsync();
    const now = Date.now();
    if (currentInsightsTimeframe === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      matches = matches.filter(m => m.timestamp >= todayStart.getTime());
    } else if (currentInsightsTimeframe === '7days') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= sevenDaysAgo);
    } else if (currentInsightsTimeframe === '30days') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000;
      matches = matches.filter(m => m.timestamp >= thirtyDaysAgo);
    }

    if (currentInsightsMatchType !== 'all') {
      matches = matches.filter(m => {
        const style = (m.gameStyle || m.matchType || "").toLowerCase().trim();
        if (style === '1v1') {
          return currentInsightsMatchType === '1v1';
        }
        if (style === 'teams' || style === 'team') {
          return currentInsightsMatchType === 'teams';
        }
        return currentInsightsMatchType === 'free-for-all' || currentInsightsMatchType === 'ffa';
      });
    }
    return matches;
  }

  // ==========================================
  // Insights Dashboard View Controllers
  // ==========================================
  async function renderInsights() {
    const telemetryLayout = document.querySelector("#insights-view .telemetry-view-layout");
    showSectionLoader(telemetryLayout, "cyan");
    const startTime = Date.now();

    // Ensure roster slots data is fully initialized for synchronous details queries
    await api.getFullRoster();

    // Sync timeframe filter toggle buttons
    const timeframeFilters = document.getElementById("insights-timeframe-filters");
    if (timeframeFilters) {
      timeframeFilters.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-timeframe") === currentInsightsTimeframe) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Sync match type filter toggle buttons
    const matchtypeFilters = document.getElementById("insights-matchtype-filters");
    if (matchtypeFilters) {
      matchtypeFilters.querySelectorAll(".toggle-btn").forEach(btn => {
        if (btn.getAttribute("data-matchtype") === currentInsightsMatchType) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // Fetch and filter matches dynamically
    const matches = await getInsightsFilteredMatches();

    // Request stats based on pre-filtered matches
    const stats = await window.Database.getStatsAsync({ matches });

    // Populate KPI panels
    document.getElementById("tel-kpi-matches").textContent = stats.totalMatches;
    
    const kpiPlayerEl = document.getElementById("tel-kpi-player");
    if (kpiPlayerEl) {
      kpiPlayerEl.textContent = stats.topPlayer;
      if (stats.topPlayer && stats.topPlayer !== "N/A") {
        kpiPlayerEl.style.cursor = "pointer";
        kpiPlayerEl.style.transition = "color 0.2s, text-shadow 0.2s";
        kpiPlayerEl.onclick = () => {
          window.location.hash = `#player/${stats.topPlayer.toLowerCase().replace(/\s+/g, '-')}`;
        };
        kpiPlayerEl.onmouseover = () => {
          kpiPlayerEl.style.color = "var(--color-neon-yellow)";
          kpiPlayerEl.style.textShadow = "0 0 10px var(--color-neon-yellow)";
        };
        kpiPlayerEl.onmouseout = () => {
          kpiPlayerEl.style.color = "";
          kpiPlayerEl.style.textShadow = "";
        };
      } else {
        kpiPlayerEl.style.cursor = "";
        kpiPlayerEl.onclick = null;
        kpiPlayerEl.onmouseover = null;
        kpiPlayerEl.onmouseout = null;
      }
    }

    const kpiCharEl = document.getElementById("tel-kpi-character");
    kpiCharEl.textContent = stats.dominantCharacter;
    if (stats.dominantCharacter && stats.dominantCharacter !== "N/A") {
      kpiCharEl.style.cursor = "pointer";
      kpiCharEl.style.transition = "color 0.2s, text-shadow 0.2s";
      kpiCharEl.onclick = () => {
        window.location.hash = `#fighter/${stats.dominantCharacter.toLowerCase().replace(/\s+/g, '-')}`;
      };
      kpiCharEl.onmouseover = () => {
        kpiCharEl.style.color = "var(--color-neon-magenta)";
        kpiCharEl.style.textShadow = "0 0 10px var(--color-neon-magenta)";
      };
      kpiCharEl.onmouseout = () => {
        kpiCharEl.style.color = "";
        kpiCharEl.style.textShadow = "";
      };
    } else {
      kpiCharEl.style.cursor = "";
      kpiCharEl.onclick = null;
      kpiCharEl.onmouseover = null;
      kpiCharEl.onmouseout = null;
    }

    // Trigger SVG Renderings
    if (window.Charts) {
      window.Charts.renderWinRateGauge("win-rate-gauges-container", stats.players);
      window.Charts.renderPlayerPlacements("outcomes-stacked-bar-container", stats.players);
      window.Charts.renderDailyPeakTimeline("daily-peak-timeline-container", matches);
    }

    // Trigger custom html/css dynamic renderings
    renderMostPlayedFighters("most-played-fighters-container", stats.characters, matches);
    renderFightersByPlayers("most-popular-fighters-container", stats.characters, matches);
    renderDominantTeamBox(matches);
    // Initialize timeline multi-select filters dynamically
    const allStats = await window.Database.getStatsAsync();
    const playerNames = allStats.players.map(p => p.name).sort();
    const fightersList = await api.getAllFighters();

    setupRetroMultiSelect("timeline-multi-select-players-container", playerNames, timelineSelectedPlayers, () => {
      renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
      renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);
    });

    setupRetroMultiSelect("timeline-multi-select-fighters-container", fightersList, timelineSelectedFighters, () => {
      renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
      renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);
    });

    // Handle RESET button click
    const btnClearTimelineFilters = document.getElementById("btn-clear-timeline-filters");
    if (btnClearTimelineFilters) {
      btnClearTimelineFilters.onclick = () => {
        timelineSelectedPlayers.length = 0;
        timelineSelectedFighters.length = 0;
        
        setupRetroMultiSelect("timeline-multi-select-players-container", playerNames, timelineSelectedPlayers, () => {
          renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
          renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);
        });
        setupRetroMultiSelect("timeline-multi-select-fighters-container", fightersList, timelineSelectedFighters, () => {
          renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
          renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);
        });

        renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
        renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);
      };
    }

    renderAverageKOTimeline("player-average-timeline-markers", matches, "players", timelineSelectedPlayers, timelineSelectedFighters);
    renderAverageKOTimeline("character-average-timeline-markers", matches, "characters", timelineSelectedPlayers, timelineSelectedFighters);

    const elapsed = Date.now() - startTime;
    if (elapsed < 250) {
      await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
    }
    hideSectionLoader(telemetryLayout);
  }

  function renderDominantTeamBox(matches) {
    const box = document.getElementById("dominant-team-box");
    const container = document.getElementById("dominant-team-container");
    if (!box || !container) return;

    // Verify if we should display/calculate the team wins (Teams filter or All match types)
    const isTeamFilterSelected = (currentInsightsMatchType === "all" || currentInsightsMatchType === "teams");
    if (!isTeamFilterSelected) {
      container.innerHTML = `
        <div class="chart-empty" style="font-family: var(--font-arcade); font-size: 10px; opacity: 0.6; text-transform: uppercase; text-align: center; line-height: 1.4;">
          There are no matches found.
        </div>
      `;
      return;
    }

    // Track duo wins: Key is alphabetically sorted names e.g. "Jack & Polo", value is number of wins
    const winCounts = {};

    matches.forEach(m => {
      const style = (m.gameStyle || m.matchType || "").toLowerCase().trim();
      if (style === 'teams' || style === 'team') {
        // Group players with placement === 1 by their teamColor
        const winningPlayersByTeam = {};
        let hasTeamColors = false;

        if (m.players) {
          m.players.forEach(p => {
            if (p.placement === 1) {
              const color = (p.teamColor || "").trim();
              if (color && color.toLowerCase() !== 'none') {
                hasTeamColors = true;
                if (!winningPlayersByTeam[color]) {
                  winningPlayersByTeam[color] = [];
                }
                winningPlayersByTeam[color].push(p.playerName);
              }
            }
          });
        }

        if (!hasTeamColors) {
          // If no team colors are set (e.g. they are all "None"), treat all winning players as on the same team
          const winners = m.players ? m.players.filter(p => p.placement === 1).map(p => p.playerName) : [];
          if (winners.length >= 2) {
            winners.sort();
            for (let i = 0; i < winners.length; i++) {
              for (let j = i + 1; j < winners.length; j++) {
                const duoKey = `${winners[i]} & ${winners[j]}`;
                winCounts[duoKey] = (winCounts[duoKey] || 0) + 1;
              }
            }
          }
        } else {
          // Iterate over each winning team
          for (const color in winningPlayersByTeam) {
            const teamPlayers = winningPlayersByTeam[color];
            if (teamPlayers.length >= 2) {
              teamPlayers.sort();
              for (let i = 0; i < teamPlayers.length; i++) {
                for (let j = i + 1; j < teamPlayers.length; j++) {
                  const duoKey = `${teamPlayers[i]} & ${teamPlayers[j]}`;
                  winCounts[duoKey] = (winCounts[duoKey] || 0) + 1;
                }
              }
            }
          }
        }
      }
    });

    // Find the duo with the highest win count
    let bestDuo = null;
    let maxWins = 0;

    for (const duo in winCounts) {
      if (winCounts[duo] > maxWins) {
        maxWins = winCounts[duo];
        bestDuo = duo;
      }
    }

    if (!bestDuo || maxWins === 0) {
      container.innerHTML = `
        <div class="chart-empty" style="font-family: var(--font-arcade); font-size: 10px; opacity: 0.6; text-transform: uppercase; text-align: center; line-height: 1.4;">
          There are no matches found.
        </div>
      `;
      return;
    }

    // Split the duo back into individual player names for rendering and linking
    const players = bestDuo.split(" & ");
    const player1 = players[0];
    const player2 = players[1];

    // Build the redirect hashes
    const p1Hash = `#player/${player1.toLowerCase().replace(/\s+/g, '-')}`;
    const p2Hash = `#player/${player2.toLowerCase().replace(/\s+/g, '-')}`;

    // Render beautiful neon style co-victory content
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; width: 100%; text-align: center;">
        <div style="display: flex; align-items: center; gap: 8px; justify-content: center;">
          <span style="font-size: 20px; text-shadow: 0 0 10px var(--color-neon-cyan); animation: pulse 2s infinite; display: inline-block;">👥</span>
          <div style="font-family: var(--font-arcade); font-size: 13px; letter-spacing: 0.5px; white-space: nowrap;">
            <span class="player-link text-glow-cyan" style="color: var(--color-neon-cyan); cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" 
                  onclick="window.location.hash = '${p1Hash}'"
                  onmouseover="this.style.color='var(--color-neon-yellow)'; this.style.textShadow='0 0 8px var(--color-neon-yellow)';"
                  onmouseout="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 5px var(--color-neon-cyan)';">${player1.toUpperCase()}</span>
            <span style="color: #8a8d9a; font-size: 11px; margin: 0 3px;">&amp;</span>
            <span class="player-link text-glow-cyan" style="color: var(--color-neon-cyan); cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" 
                  onclick="window.location.hash = '${p2Hash}'"
                  onmouseover="this.style.color='var(--color-neon-yellow)'; this.style.textShadow='0 0 8px var(--color-neon-yellow)';"
                  onmouseout="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 5px var(--color-neon-cyan)';">${player2.toUpperCase()}</span>
          </div>
        </div>
        <div class="panel-beveled neon-yellow" style="padding: 4px 10px; font-family: var(--font-arcade); font-size: 9px; color: var(--color-neon-yellow); text-shadow: 0 0 5px var(--color-neon-yellow); border: 1px solid var(--color-neon-yellow); background: rgba(255, 230, 0, 0.05); min-height: auto; border-radius: 4px; box-shadow: 0 0 8px rgba(255, 230, 0, 0.2); white-space: nowrap; margin-top: 2px;">
          ${maxWins} ${maxWins === 1 ? 'VICTORY' : 'VICTORIES'}
        </div>
      </div>
    `;
  }

  function renderMostPlayedFighters(containerId, characters, matches) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter characters with count > 0 and sort desc
    const playedChars = characters.filter(c => c.games > 0);

    if (playedChars.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 13px; opacity: 0.6; width: 100%; text-align: center; line-height: 100px;">NO ENCOUNTERS RECORDED</div>`;
      return;
    }

    // Limit to top 10 most played characters
    const topChars = playedChars.slice(0, 10);
    const maxPlays = Math.max(...topChars.map(c => c.games), 1);

    let html = "";
    topChars.forEach(c => {
      // Compute player breakdowns
      const playerMap = {};
      matches.forEach(m => {
        if (m.players) {
          m.players.forEach(p => {
            if (p.character === c.name) {
              if (!playerMap[p.playerName]) {
                playerMap[p.playerName] = { games: 0, wins: 0, losses: 0 };
              }
              playerMap[p.playerName].games++;
              if (p.placement === 1) {
                playerMap[p.playerName].wins++;
              } else {
                playerMap[p.playerName].losses++;
              }
            }
          });
        }
      });

      const pct = (c.games / maxPlays) * 100;
      const details = api.getFighterDetails(c.name) || {};
      const iconUrl = details.icon || 'assets/mario.png';

      // Build tooltip list
      const tooltipRows = Object.entries(playerMap)
        .sort((a, b) => b[1].games - a[1].games)
        .map(([name, pStats]) => `
          <div class="tooltip-player-row" style="display: flex; justify-content: space-between; gap: 15px; font-size: 9px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding: 4px 0;">
            <span class="tooltip-p-name" style="color: #fff; font-weight: bold; cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#player/${name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 6px var(--color-neon-cyan)';" onmouseout="this.style.color='#fff'; this.style.textShadow='';">${name}</span>
            <span class="tooltip-p-stats" style="color: #ccc;">${pStats.games} plays <span style="color: var(--color-neon-yellow); font-weight: bold;">(${pStats.wins}W / ${pStats.losses}L)</span></span>
          </div>
        `).join('');

      html += `
        <div class="v-bar-col" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; position: relative; width: 45px; overflow: visible;">
          
          <!-- Custom Retro Beveled Tooltip (CSS Hover Driven) -->
          <div class="fighter-hover-tooltip panel-beveled neon-magenta" style="position: absolute; bottom: 65px; left: 50%; transform: translateX(-50%) translateY(10px); width: 200px; background: rgba(15, 17, 22, 0.95); border: 1px solid var(--color-neon-magenta); border-radius: 6px; box-shadow: 0 0 15px rgba(255,0,127,0.5); padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s ease; z-index: 100;">
            <div class="tooltip-header font-arcade text-glow-magenta" style="font-size: 11px; margin-bottom: 6px; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,0,127,0.3); padding-bottom: 6px;">${c.name.toUpperCase()}</div>
            <div class="tooltip-subheader font-stats" style="font-size: 10px; margin-bottom: 8px; color: #8a8d9a;">TOTAL PICKS: <strong style="color: #fff;">${c.games}</strong></div>
            <div class="tooltip-players-list" style="display: flex; flex-direction: column; gap: 2px;">
              ${tooltipRows}
            </div>
          </div>
          
          <!-- Value Label -->
          <span class="v-bar-value font-stats text-glow-cyan" style="font-size: 11px; margin-bottom: 6px; font-weight: bold; color: #fff; z-index: 2;">${c.games}</span>
          
          <!-- Animated vertical bar track -->
          <div class="v-bar-track" style="width: 18px; height: calc(${pct}% - 35px); min-height: 4px; background: linear-gradient(180deg, var(--color-neon-magenta) 0%, rgba(255,0,127,0.2) 100%); border: 1px solid var(--color-neon-magenta); box-shadow: 0 0 10px rgba(255,0,127,0.3); border-radius: 4px 4px 0 0; cursor: pointer; transition: height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.boxShadow='0 0 15px var(--color-neon-magenta)';" onmouseout="this.style.boxShadow='';" ></div>
          
          <!-- Head icon bubble centered underneath -->
          <div class="v-bar-icon-bubble" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-neon-magenta); background: var(--color-bg-dark); box-shadow: 0 0 8px rgba(255,0,127,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-top: 8px; flex-shrink: 0; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 12px var(--color-neon-magenta)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" >
            <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${c.name}">
          </div>
          
          <!-- Character name centered underneath -->
          <span class="v-bar-char-name font-stats" style="cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-magenta)'; this.style.textShadow='0 0 6px var(--color-neon-magenta)';" onmouseout="this.style.color=''; this.style.textShadow='';" >${c.name}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderFightersByPlayers(containerId, characters, matches) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Map each character to their unique player stats
    const charPlayersList = characters.map(c => {
      const playerMap = {};
      matches.forEach(m => {
        if (m.players) {
          m.players.forEach(p => {
            if (p.character === c.name) {
              if (!playerMap[p.playerName]) {
                playerMap[p.playerName] = { games: 0, wins: 0, losses: 0 };
              }
              playerMap[p.playerName].games++;
              if (p.placement === 1) {
                playerMap[p.playerName].wins++;
              } else {
                playerMap[p.playerName].losses++;
              }
            }
          });
        }
      });
      const uniquePlayersCount = Object.keys(playerMap).length;
      return {
        ...c,
        uniquePlayersCount,
        playerMap
      };
    }).filter(c => c.uniquePlayersCount > 0)
      .sort((a, b) => b.uniquePlayersCount - a.uniquePlayersCount || b.games - a.games);

    if (charPlayersList.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 13px; opacity: 0.6; width: 100%; text-align: center; line-height: 100px;">NO ENCOUNTERS RECORDED</div>`;
      return;
    }

    // Limit to top 10 characters played by the most unique people
    const topChars = charPlayersList.slice(0, 10);
    const maxPlayersCount = Math.max(...topChars.map(c => c.uniquePlayersCount), 1);

    let html = "";
    topChars.forEach(c => {
      const pct = (c.uniquePlayersCount / maxPlayersCount) * 100;
      const details = api.getFighterDetails(c.name) || {};
      const iconUrl = details.icon || 'assets/mario.png';

      // Build tooltip list sorted by playcount under this character
      const tooltipRows = Object.entries(c.playerMap)
        .sort((a, b) => b[1].games - a[1].games)
        .map(([name, pStats]) => `
          <div class="tooltip-player-row" style="display: flex; justify-content: space-between; gap: 15px; font-size: 9px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding: 4px 0;">
            <span class="tooltip-p-name" style="color: #fff; font-weight: bold; cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#player/${name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 6px var(--color-neon-cyan)';" onmouseout="this.style.color='#fff'; this.style.textShadow='';">${name}</span>
            <span class="tooltip-p-stats" style="color: #ccc;">${pStats.games} plays <span style="color: var(--color-neon-yellow); font-weight: bold;">(${pStats.wins}W / ${pStats.losses}L)</span></span>
          </div>
        `).join('');

      html += `
        <div class="v-bar-col" style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; position: relative; width: 45px; overflow: visible;">
          
          <!-- Custom Retro Beveled Tooltip (CSS Hover Driven) -->
          <div class="fighter-hover-tooltip panel-beveled neon-yellow" style="position: absolute; bottom: 65px; left: 50%; transform: translateX(-50%) translateY(10px); width: 200px; background: rgba(15, 17, 22, 0.95); border: 1px solid var(--color-neon-yellow); border-radius: 6px; box-shadow: 0 0 15px rgba(255,230,0,0.5); padding: 12px; box-sizing: border-box; display: flex; flex-direction: column; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.25s ease, transform 0.25s ease, visibility 0.25s ease; z-index: 100;">
            <div class="tooltip-header font-arcade text-glow-yellow" style="font-size: 11px; margin-bottom: 6px; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255,230,0,0.3); padding-bottom: 6px;">${c.name.toUpperCase()}</div>
            <div class="tooltip-subheader font-stats" style="font-size: 10px; margin-bottom: 8px; color: #8a8d9a;">UNIQUE PLAYERS: <strong style="color: #fff;">${c.uniquePlayersCount}</strong></div>
            <div class="tooltip-players-list" style="display: flex; flex-direction: column; gap: 2px;">
              ${tooltipRows}
            </div>
          </div>
          
          <!-- Value Label -->
          <span class="v-bar-value font-stats text-glow-yellow" style="font-size: 11px; margin-bottom: 6px; font-weight: bold; color: #fff; z-index: 2;">${c.uniquePlayersCount}</span>
          
          <!-- Animated vertical bar track -->
          <div class="v-bar-track" style="width: 18px; height: calc(${pct}% - 35px); min-height: 4px; background: linear-gradient(180deg, var(--color-neon-yellow) 0%, rgba(255,230,0,0.2) 100%); border: 1px solid var(--color-neon-yellow); box-shadow: 0 0 10px rgba(255,230,0,0.3); border-radius: 4px 4px 0 0; cursor: pointer; transition: height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.boxShadow='0 0 15px var(--color-neon-yellow)';" onmouseout="this.style.boxShadow='';" ></div>
          
          <!-- Head icon bubble centered underneath -->
          <div class="v-bar-icon-bubble" style="width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--color-neon-yellow); background: var(--color-bg-dark); box-shadow: 0 0 8px rgba(255,230,0,0.4); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-top: 8px; flex-shrink: 0; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 12px var(--color-neon-yellow)';" onmouseout="this.style.transform=''; this.style.boxShadow='';" >
            <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${c.name}">
          </div>
          
          <!-- Character name centered underneath -->
          <span class="v-bar-char-name font-stats" style="cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#fighter/${c.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-yellow)'; this.style.textShadow='0 0 6px var(--color-neon-yellow)';" onmouseout="this.style.color=''; this.style.textShadow='';" >${c.name}</span>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderPlayerCombatOutcomes(containerId, players) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!players || players.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 13px; opacity: 0.6; width: 100%; text-align: center; line-height: 100px;">NO ENCOUNTERS RECORDED</div>`;
      return;
    }

    // Sort by games descending (most active)
    const activePlayers = [...players].sort((a, b) => b.games - a.games).slice(0, 5);
    const maxVal = Math.max(...activePlayers.map(p => Math.max(p.kos || 0, p.falls || 0, p.sds || 0)), 1);

    let html = "";
    activePlayers.forEach(p => {
      const koPct = ((p.kos || 0) / maxVal) * 100;
      const fallPct = ((p.falls || 0) / maxVal) * 100;
      const sdPct = ((p.sds || 0) / maxVal) * 100;

      html += `
        <div class="player-combat-row" style="display: flex; flex-direction: column; gap: 6px; border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 4px; overflow: visible;">
          <div class="player-combat-name font-arcade text-glow-cyan" style="font-size: 11px; color: #fff; letter-spacing: 0.5px; text-shadow: 0 0 4px rgba(0,240,255,0.3); cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#player/${p.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 8px var(--color-neon-cyan)';" onmouseout="this.style.color=''; this.style.textShadow='';" >${p.name.toUpperCase()}</div>
          
          <div class="combat-bars-stack" style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
            <!-- KOs Bar (Cyan) -->
            <div class="combat-bar-item" style="display: flex; align-items: center; gap: 8px;">
              <span class="combat-bar-label font-stats" style="width: 45px; font-size: 9px; color: var(--color-neon-cyan); font-weight: bold; letter-spacing: 0.5px;">KOS</span>
              <div class="combat-progress-track" style="flex: 1; height: 6px; background: rgba(0, 240, 255, 0.05); border: 1px solid rgba(0, 240, 255, 0.15); border-radius: 3px; position: relative;">
                <div class="combat-progress-fill" style="width: ${koPct}%; height: 100%; background: linear-gradient(90deg, rgba(0,240,255,0.4) 0%, var(--color-neon-cyan) 100%); box-shadow: 0 0 6px var(--color-neon-cyan); border-radius: 2px;"></div>
              </div>
              <span class="combat-bar-value font-stats" style="width: 25px; text-align: right; font-size: 10px; font-weight: bold; color: #fff;">${p.kos || 0}</span>
            </div>
            
            <!-- Falls Bar (Magenta) -->
            <div class="combat-bar-item" style="display: flex; align-items: center; gap: 8px;">
              <span class="combat-bar-label font-stats" style="width: 45px; font-size: 9px; color: var(--color-neon-magenta); font-weight: bold; letter-spacing: 0.5px;">FALLS</span>
              <div class="combat-progress-track" style="flex: 1; height: 6px; background: rgba(255, 0, 127, 0.05); border: 1px solid rgba(255, 0, 127, 0.15); border-radius: 3px; position: relative;">
                <div class="combat-progress-fill" style="width: ${fallPct}%; height: 100%; background: linear-gradient(90deg, rgba(255,0,127,0.4) 0%, var(--color-neon-magenta) 100%); box-shadow: 0 0 6px var(--color-neon-magenta); border-radius: 2px;"></div>
              </div>
              <span class="combat-bar-value font-stats" style="width: 25px; text-align: right; font-size: 10px; font-weight: bold; color: #fff;">${p.falls || 0}</span>
            </div>
            
            <!-- SDs Bar (Yellow) -->
            <div class="combat-bar-item" style="display: flex; align-items: center; gap: 8px;">
              <span class="combat-bar-label font-stats" style="width: 45px; font-size: 9px; color: var(--color-neon-yellow); font-weight: bold; letter-spacing: 0.5px;">SDS</span>
              <div class="combat-progress-track" style="flex: 1; height: 6px; background: rgba(255, 230, 0, 0.05); border: 1px solid rgba(255, 230, 0, 0.15); border-radius: 3px; position: relative;">
                <div class="combat-progress-fill" style="width: ${sdPct}%; height: 100%; background: linear-gradient(90deg, rgba(255,230,0,0.4) 0%, var(--color-neon-yellow) 100%); box-shadow: 0 0 6px var(--color-neon-yellow); border-radius: 2px;"></div>
              </div>
              <span class="combat-bar-value font-stats" style="width: 25px; text-align: right; font-size: 10px; font-weight: bold; color: #fff;">${p.sds || 0}</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  function renderAverageKOTimeline(containerId, matches, mode, selectedPlayers = [], selectedFighters = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!matches || matches.length === 0) {
      container.innerHTML = "";
      const trackColumn = container.closest('.timeline-track-column');
      if (trackColumn) {
        trackColumn.style.paddingTop = '50px';
        trackColumn.style.paddingBottom = '40px';
        trackColumn.style.height = 'auto';
        trackColumn.style.marginTop = '0px';
        trackColumn.style.marginBottom = '0px';
      }
      return;
    }

    const parseOutAtToSeconds = (outAtStr) => {
      if (!outAtStr || outAtStr.trim() === '---') return null;
      const parts = outAtStr.trim().split(':');
      if (parts.length !== 2) return null;
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (isNaN(mins) || isNaN(secs)) return null;
      return mins * 60 + secs;
    };

    const formatSecondsToMMSS = (totalSeconds) => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = Math.round(totalSeconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter matches based on the selected players and fighters to affect the dataset being analyzed
    let timelineMatches = [...matches];
    if (Array.isArray(selectedPlayers) && selectedPlayers.length > 0) {
      const lowerPlayers = selectedPlayers.map(p => p.toLowerCase().trim());
      timelineMatches = timelineMatches.filter(m => 
        m.players && m.players.some(p => lowerPlayers.includes(p.playerName.toLowerCase().trim()))
      );
    }
    if (Array.isArray(selectedFighters) && selectedFighters.length > 0) {
      const lowerFighters = selectedFighters.map(f => f.toLowerCase().trim());
      timelineMatches = timelineMatches.filter(m => 
        m.players && m.players.some(p => lowerFighters.includes(p.character.toLowerCase().trim()))
      );
    }

    const lowerSelectedPlayers = (selectedPlayers || []).map(p => p.toLowerCase().trim());
    const lowerSelectedFighters = (selectedFighters || []).map(f => f.toLowerCase().trim());

    const entities = {};
    timelineMatches.forEach(m => {
      if (m.players) {
        m.players.forEach(p => {
          const pNameLower = p.playerName.toLowerCase().trim();
          const pCharLower = p.character.toLowerCase().trim();

          // If we are looking at players
          if (mode === "players") {
            // If a fighter is selected, the player must have played one of the selected fighters in this match to be included
            if (lowerSelectedFighters.length > 0 && !lowerSelectedFighters.includes(pCharLower)) {
              return;
            }
            const key = p.playerName;
            if (!entities[key]) {
              entities[key] = { name: key, totalSecs: 0, count: 0, characters: {} };
            }
            const secs = parseOutAtToSeconds(p.outAt) ?? 300; // survivors set to 5:00 mark
            entities[key].totalSecs += secs;
            entities[key].count++;
            entities[key].characters[p.character] = (entities[key].characters[p.character] || 0) + 1;
          } 
          // If we are looking at characters
          else {
            // If a player is selected, the character must have been played by one of the selected players in this match to be included
            if (lowerSelectedPlayers.length > 0 && !lowerSelectedPlayers.includes(pNameLower)) {
              return;
            }
            const key = p.character;
            if (!entities[key]) {
              entities[key] = { name: key, totalSecs: 0, count: 0 };
            }
            const secs = parseOutAtToSeconds(p.outAt) ?? 300; // survivors set to 5:00 mark
            entities[key].totalSecs += secs;
            entities[key].count++;
          }
        });
      }
    });

    let filteredEntities = Object.values(entities).map(ent => {
      const avgSecs = ent.totalSecs / ent.count;
      let iconUrl = 'assets/mario.png';
      if (mode === "players") {
        let favoriteChar = null;
        let maxCount = 0;
        Object.entries(ent.characters).forEach(([char, count]) => {
          if (count > maxCount) {
            maxCount = count;
            favoriteChar = char;
          }
        });
        if (favoriteChar) {
          const details = api.getFighterDetails(favoriteChar) || {};
          iconUrl = details.icon || 'assets/mario.png';
        }
      } else {
        const details = api.getFighterDetails(ent.name) || {};
        iconUrl = details.icon || 'assets/mario.png';
      }
      return {
        ...ent,
        avgSecs,
        displayTime: formatSecondsToMMSS(avgSecs),
        iconUrl
      };
    }).sort((a, b) => a.avgSecs - b.avgSecs);

    // If filter selection is specified, only show the selected ones on their respective timeline
    if (mode === "players" && lowerSelectedPlayers.length > 0) {
      filteredEntities = filteredEntities.filter(ent => lowerSelectedPlayers.includes(ent.name.toLowerCase().trim()));
    } else if (mode === "characters" && lowerSelectedFighters.length > 0) {
      filteredEntities = filteredEntities.filter(ent => lowerSelectedFighters.includes(ent.name.toLowerCase().trim()));
    }

    const placedMarkers = { above: [], below: [] };
    let maxStaggerAbove = -1;
    let maxStaggerBelow = -1;
    let markersHtml = "";
    let markerIdx = 0;

    filteredEntities.forEach(ent => {
      const pct = (ent.avgSecs / 300) * 100;
      const safePct = Math.max(0, Math.min(100, pct));
      
      const isAbove = (markerIdx % 2 === 0);
      markerIdx++;
      
      const sideKey = isAbove ? 'above' : 'below';
      let staggerIndex = 0;
      
      while (placedMarkers[sideKey].some(m => Math.abs(m.pct - safePct) < 8 && m.stagger === staggerIndex)) {
        staggerIndex++;
      }
      placedMarkers[sideKey].push({ pct: safePct, stagger: staggerIndex });
      
      if (isAbove) {
        maxStaggerAbove = Math.max(maxStaggerAbove, staggerIndex);
      } else {
        maxStaggerBelow = Math.max(maxStaggerBelow, staggerIndex);
      }
      
      // Use var(--color-neon-cyan) consistently across both timelines
      const markerColor = 'var(--color-neon-cyan)';
      const offsetSize = 15 + staggerIndex * 35; // staggers are spaced out vertically
      
      markersHtml += `
        <div class="timeline-marker" style="position: absolute; left: ${safePct}%; top: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; z-index: ${10 + staggerIndex};">
          <!-- Dot bubble (character icon) -->
          <div class="timeline-dot" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: var(--color-bg-dark); border: 2px solid ${markerColor}; box-shadow: 0 0 8px ${markerColor}; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#${mode === 'players' ? 'player' : 'fighter'}/${ent.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 0 14px ${markerColor}';" onmouseout="this.style.transform=''; this.style.boxShadow='';" >
            <img src="${ent.iconUrl}" style="width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated;" alt="${ent.name}">
          </div>
          <!-- Vertical connector line -->
          <div class="timeline-connector" style="position: absolute; left: 11px; ${isAbove ? `bottom: 24px` : `top: 24px`}; width: 2px; height: ${offsetSize}px; background: ${markerColor}; opacity: 0.8; z-index: 9;"></div>
          <!-- Label panel box -->
          <div class="timeline-player-info panel-beveled" style="position: absolute; left: 12px; ${isAbove ? `bottom: ${24 + offsetSize}px` : `top: ${24 + offsetSize}px`}; transform: translateX(-50%); text-align: center; white-space: nowrap; background: var(--color-bg-dark); border: 1px solid ${markerColor}; padding: 3px 8px; font-size: 9px; font-family: var(--font-stats); box-shadow: 0 0 8px rgba(0,0,0,0.8); border-radius: 4px; pointer-events: auto; user-select: none; z-index: 10; cursor: pointer; transition: color 0.2s, border-color 0.2s, box-shadow 0.2s;" onclick="window.location.hash = '#${mode === 'players' ? 'player' : 'fighter'}/${ent.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.borderColor='#fff'; this.style.boxShadow='0 0 12px ${markerColor}';" onmouseout="this.style.borderColor=''; this.style.boxShadow='';" >
            <span style="font-weight: bold; color: #fff; text-shadow: 0 0 2px rgba(255,255,255,0.5);">${ent.name}</span>
            <span style="color: ${markerColor}; font-weight: bold; text-shadow: 0 0 4px ${markerColor};">(${ent.displayTime})</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = markersHtml;

    // Dynamically adjust padding of the container's timeline-track-column to fit all markers
    const trackColumn = container.closest('.timeline-track-column');
    if (trackColumn) {
      const pTop = maxStaggerAbove >= 0 ? Math.max(50, 75 + maxStaggerAbove * 35) : 50;
      const pBottom = maxStaggerBelow >= 0 ? Math.max(40, 75 + maxStaggerBelow * 35) : 40;
      trackColumn.style.paddingTop = `${pTop}px`;
      trackColumn.style.paddingBottom = `${pBottom}px`;
      trackColumn.style.height = 'auto';
      trackColumn.style.marginTop = '0px';
      trackColumn.style.marginBottom = '0px';
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
      searchDropdown.innerHTML = `<div style="padding: 12px 20px; font-family: var(--font-header); font-size: var(--font-size-sm); color: #777;">NO ENCOUNTERS FOUND</div>`;
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
    if (window.location.hash === "#home" || window.location.hash === "") {
      clearAllHomeFilters();
      renderHome();
    } else {
      window.location.hash = "#home";
    }
  };

  // "Back to Select Select" / Home clicks
  const backButtons = document.getElementsByClassName("btn-back-home");
  for (let i = 0; i < backButtons.length; i++) {
    backButtons[i].onclick = () => {
      if (window.location.hash === "#home" || window.location.hash === "") {
        clearAllHomeFilters();
        renderHome();
      } else {
        window.location.hash = "#home";
      }
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

  // Player Profile Timeframe Toggles
  const playerTimeframeFilters = document.getElementById("player-timeframe-filters");
  if (playerTimeframeFilters) {
    playerTimeframeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      playerTimeframeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentPlayerTimeframe = btn.getAttribute("data-timeframe");
      const parts = window.location.hash.split("/");
      if (parts[0] === "#player" && parts[1]) {
        renderPlayerProfile(parts[1]);
      }
    });
  }

  // Player Profile Match Type Toggles
  const playerMatchtypeFilters = document.getElementById("player-matchtype-filters");
  if (playerMatchtypeFilters) {
    playerMatchtypeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      playerMatchtypeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentPlayerMatchType = btn.getAttribute("data-matchtype");
      const parts = window.location.hash.split("/");
      if (parts[0] === "#player" && parts[1]) {
        renderPlayerProfile(parts[1]);
      }
    });
  }



  // Fighter Profile Timeframe Toggles
  const fighterTimeframeFilters = document.getElementById("fighter-timeframe-filters");
  if (fighterTimeframeFilters) {
    fighterTimeframeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      fighterTimeframeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentFighterTimeframe = btn.getAttribute("data-timeframe");
      const parts = window.location.hash.split("/");
      if (parts[0] === "#fighter" && parts[1]) {
        renderFighterProfile(parts[1]);
      }
    });
  }

  // Insights Timeframe Toggles
  const insightsTimeframeFilters = document.getElementById("insights-timeframe-filters");
  if (insightsTimeframeFilters) {
    insightsTimeframeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      insightsTimeframeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentInsightsTimeframe = btn.getAttribute("data-timeframe");
      renderInsights();
    });
  }

  // Insights Match Type Toggles
  const insightsMatchtypeFilters = document.getElementById("insights-matchtype-filters");
  if (insightsMatchtypeFilters) {
    insightsMatchtypeFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      
      insightsMatchtypeFilters.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      currentInsightsMatchType = btn.getAttribute("data-matchtype");
      renderInsights();
    });
  }

  // Variant Navigation Click Listeners
  const btnPrev = document.getElementById("btn-variant-prev");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      if (!currentFighterStats) return;
      const variants = currentFighterStats.fighter.variants || [];
      if (variants.length <= 1) return;
      currentVariantIndex = (currentVariantIndex - 1 + variants.length) % variants.length;
      updateVariantDisplayGlobal();
    });
  }

  const btnNext = document.getElementById("btn-variant-next");
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (!currentFighterStats) return;
      const variants = currentFighterStats.fighter.variants || [];
      if (variants.length <= 1) return;
      currentVariantIndex = (currentVariantIndex + 1) % variants.length;
      updateVariantDisplayGlobal();
    });
  }

  // Podium Style Dropdown Filter
  const podiumStyleSelect = document.getElementById("podium-style-select");
  if (podiumStyleSelect) {
    podiumStyleSelect.addEventListener("change", () => {
      renderHome();
    });
  }

  // Leaderboard Style Dropdown Filter
  const leaderboardStyleSelect = document.getElementById("leaderboard-style-select");
  if (leaderboardStyleSelect) {
    leaderboardStyleSelect.addEventListener("change", () => {
      renderLeaderboard();
    });
  }

  function setupStyleDropdown() {
    const container = document.getElementById("multi-select-style-container");
    if (!container) return;

    const btn = container.querySelector(".retro-multi-select-btn");
    const dropdown = container.querySelector(".retro-multi-select-dropdown");
    const selectedTextEl = btn.querySelector(".selected-text");
    const hiddenInput = document.getElementById("podium-style-select");

    // Toggle dropdown visibility on button click
    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".retro-multi-select-dropdown").forEach(d => {
        if (d !== dropdown) d.classList.add("dropdown-hidden");
      });
      dropdown.classList.toggle("dropdown-hidden");
    };

    const rows = dropdown.querySelectorAll(".retro-multi-option-row");
    rows.forEach(row => {
      row.onclick = (e) => {
        e.stopPropagation();
        
        // Deactivate all rows
        rows.forEach(r => {
          r.classList.remove("active-selection");
          const chk = r.querySelector(".style-checkbox");
          if (chk) chk.checked = false;
        });

        // Activate clicked row
        row.classList.add("active-selection");
        const chk = row.querySelector(".style-checkbox");
        if (chk) chk.checked = true;

        // Set hidden input value
        const val = row.getAttribute("data-value");
        if (hiddenInput) {
          hiddenInput.value = val;
          // Dispatch change event to notify listeners
          hiddenInput.dispatchEvent(new Event("change"));
        }

        // Update button text & highlight
        if (val === "all") {
          selectedTextEl.textContent = "ALL GAMES";
          btn.classList.remove("active-selection");
        } else {
          selectedTextEl.textContent = row.querySelector(".option-label").textContent;
          btn.classList.add("active-selection");
        }

        // Hide dropdown
        dropdown.classList.add("dropdown-hidden");
      };
    });
  }

  function setupLeaderboardStyleDropdown() {
    const container = document.getElementById("leaderboard-multi-select-style-container");
    if (!container) return;

    const btn = container.querySelector(".retro-multi-select-btn");
    const dropdown = container.querySelector(".retro-multi-select-dropdown");
    const selectedTextEl = btn.querySelector(".selected-text");
    const hiddenInput = document.getElementById("leaderboard-style-select");

    // Toggle dropdown visibility on button click
    btn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll(".retro-multi-select-dropdown").forEach(d => {
        if (d !== dropdown) d.classList.add("dropdown-hidden");
      });
      dropdown.classList.toggle("dropdown-hidden");
    };

    const rows = dropdown.querySelectorAll(".retro-multi-option-row");
    rows.forEach(row => {
      row.onclick = (e) => {
        e.stopPropagation();
        
        // Deactivate all rows
        rows.forEach(r => {
          r.classList.remove("active-selection");
          const chk = r.querySelector(".leaderboard-style-checkbox");
          if (chk) chk.checked = false;
        });

        // Activate clicked row
        row.classList.add("active-selection");
        const chk = row.querySelector(".leaderboard-style-checkbox");
        if (chk) chk.checked = true;

        // Set hidden input value
        const val = row.getAttribute("data-value");
        if (hiddenInput) {
          hiddenInput.value = val;
          // Dispatch change event to notify listeners
          hiddenInput.dispatchEvent(new Event("change"));
        }

        // Update button text & highlight
        if (val === "all") {
          selectedTextEl.textContent = "ALL GAMES";
          btn.classList.remove("active-selection");
        } else {
          selectedTextEl.textContent = row.querySelector(".option-label").textContent;
          btn.classList.add("active-selection");
        }

        // Hide dropdown
        dropdown.classList.add("dropdown-hidden");
      };
    });
  }

  // Initialize custom style select dropdowns
  setupStyleDropdown();
  setupLeaderboardStyleDropdown();


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



  // Clear / Reset podium search filters (Clear Filters Button)
  const btnClearAllFilters = document.getElementById("btn-clear-all-filters");
  if (btnClearAllFilters) {
    btnClearAllFilters.onclick = () => {
      clearAllHomeFilters();
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

  // ==========================================
  // Render Fighters Library View
  // ==========================================
  async function renderFightersLibrary() {
    const gridWrapper = document.querySelector(".fighters-grid-wrapper");
    if (gridWrapper) {
      showSectionLoader(gridWrapper, "cyan");
    }
    const startTime = Date.now();

    const roster = await api.getFullRoster();
    if (!roster) {
      if (gridWrapper) hideSectionLoader(gridWrapper);
      return;
    }

    // 1. One-time Controls & Listeners Initialization
    if (!isFightersControlsInitialized) {
      // Extract unique series names
      const seriesSet = new Set();
      roster.forEach(r => {
        if (r.series && r.series.name) {
          seriesSet.add(r.series.name);
        }
      });
      const uniqueSeries = Array.from(seriesSet).sort();
      const selectEl = document.getElementById("fighters-series-filter");
      if (selectEl) {
        selectEl.innerHTML = '<option value="all">ALL SERIES</option>';
        uniqueSeries.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s;
          opt.textContent = s.toUpperCase();
          selectEl.appendChild(opt);
        });
        
        // Sync filter value on load
        selectEl.value = fightersSelectedSeries;
        selectEl.addEventListener("change", (e) => {
          fightersSelectedSeries = e.target.value;
          renderFightersLibrary();
        });
      }

      // Sync & bind search box input
      const searchBoxEl = document.getElementById("fighters-search-box");
      if (searchBoxEl) {
        searchBoxEl.value = fightersSearchQuery;
        searchBoxEl.addEventListener("input", (e) => {
          fightersSearchQuery = e.target.value;
          renderFightersLibrary();
        });
      }

      // Sync & bind sort toggle buttons
      const sortSwitchEl = document.getElementById("fighters-sort-switch");
      if (sortSwitchEl) {
        sortSwitchEl.querySelectorAll(".toggle-btn").forEach(btn => {
          const mode = btn.getAttribute("data-sort");
          if (mode === fightersSortBy) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
          btn.addEventListener("click", () => {
            sortSwitchEl.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            fightersSortBy = mode;
            renderFightersLibrary();
          });
        });
      }

      isFightersControlsInitialized = true;
    } else {
      // Sync DOM elements to match existing state in case of page routing back-and-forth
      const selectEl = document.getElementById("fighters-series-filter");
      if (selectEl) selectEl.value = fightersSelectedSeries;
      const searchBoxEl = document.getElementById("fighters-search-box");
      if (searchBoxEl) searchBoxEl.value = fightersSearchQuery;
      const sortSwitchEl = document.getElementById("fighters-sort-switch");
      if (sortSwitchEl) {
        sortSwitchEl.querySelectorAll(".toggle-btn").forEach(btn => {
          if (btn.getAttribute("data-sort") === fightersSortBy) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        });
      }
    }

    // 2. Compute dynamic play counts from match records
    const allMatches = await window.Database.getMatchesAsync();
    const playCounts = {};
    if (allMatches) {
      allMatches.forEach(m => {
        if (m.players) {
          m.players.forEach(p => {
            if (p.character) {
              const details = api.getFighterDetails(p.character);
              if (details && details.id) {
                playCounts[details.id] = (playCounts[details.id] || 0) + 1;
              }
            }
          });
        }
      });
    }

    // 3. Filter & Sort Roster
    let filteredRoster = [...roster];

    // Search query: filters by name and variant names
    const query = fightersSearchQuery.toLowerCase().trim();
    if (query) {
      filteredRoster = filteredRoster.filter(r => {
        const matchName = r.name.toLowerCase().includes(query);
        const matchVariants = r.variants && r.variants.some(v => v.name.toLowerCase().includes(query));
        return matchName || matchVariants;
      });
    }

    // Franchise / Series Filter
    if (fightersSelectedSeries !== "all") {
      filteredRoster = filteredRoster.filter(r => r.series && r.series.name === fightersSelectedSeries);
    }

    // Sort Roster
    if (fightersSortBy === "alpha") {
      filteredRoster.sort((a, b) => a.name.localeCompare(b.name));
    } else if (fightersSortBy === "mostplayed") {
      filteredRoster.sort((a, b) => {
        const countA = playCounts[a.slug] || 0;
        const countB = playCounts[b.slug] || 0;
        if (countB !== countA) {
          return countB - countA;
        }
        return a.name.localeCompare(b.name); // Secondary alpha sort
      });
    }

    // 4. Invalidate and Repopulate Grid
    const gridEl = document.getElementById("fighters-library-grid");
    if (gridEl) {
      gridEl.innerHTML = "";
      if (filteredRoster.length === 0) {
        gridEl.innerHTML = `
          <div class="no-results-panel font-stats text-glow-magenta" style="grid-column: 1 / -1; text-align: center; padding: 40px; font-size: var(--font-size-md); font-weight: bold; background: rgba(12, 13, 18, 0.6); border: 1px dashed var(--color-neon-magenta); border-radius: 8px;">
            NO FIGHTERS MATCHING THE CURRENT PROTOCOLS FOUND.
          </div>
        `;
        const elapsed = Date.now() - startTime;
        if (elapsed < 250) {
          await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
        }
        if (gridWrapper) hideSectionLoader(gridWrapper);
        return;
      }

      filteredRoster.forEach(r => {
        const cardNode = createLibraryCardNode(r);
        gridEl.appendChild(cardNode);
      });
    }

    if (gridWrapper) {
      const elapsed = Date.now() - startTime;
      if (elapsed < 250) {
        await new Promise(resolve => setTimeout(resolve, 250 - elapsed));
      }
      hideSectionLoader(gridWrapper);
    }
  }

  // --- Helper to build individual fighter library cards ---
  function createLibraryCardNode(r) {
    const card = document.createElement("div");
    card.className = "fighter-library-card";
    card.setAttribute("data-slug", r.slug);

    // Initialize variant state tracker for this slug if not present
    if (cardVariantIndices[r.slug] === undefined) {
      cardVariantIndices[r.slug] = 0;
    }

    const variants = r.variants || [];

    const renderCardState = () => {
      let activeVariantIdx = cardVariantIndices[r.slug];
      if (activeVariantIdx >= variants.length || activeVariantIdx < 0) {
        activeVariantIdx = 0;
        cardVariantIndices[r.slug] = 0;
      }
      const activeVariant = variants[activeVariantIdx] || { name: r.name, boxing_ring_title: "A legendary challenger." };

      // Select active portrait image (find matching alt skin variant)
      let activeImage = r.alts && r.alts[0] ? r.alts[0].image : "assets/mario.png?v=5";
      if (r.alts && r.alts.length > 0) {
        const matchedAlt = r.alts.find(alt => alt.variant && alt.variant.toLowerCase() === activeVariant.name.toLowerCase());
        if (matchedAlt) {
          activeImage = matchedAlt.image;
        } else {
          activeImage = r.alts[0].image;
        }
      }

      // Variant navigation controls (arrow btns shown on-hover only if multiple variants exist)
      let variantSelectorHtml = "";
      if (variants.length > 1) {
        variantSelectorHtml = `
          <div class="card-variant-selector">
            <button class="card-variant-arrow-btn prev-variant-btn">◀</button>
            <div class="card-variant-name-badge">${activeVariant.name.toUpperCase()}</div>
            <button class="card-variant-arrow-btn next-variant-btn">▶</button>
          </div>
        `;
      }

      const seriesIcon = r.series && r.series.icon ? r.series.icon : "";

      card.innerHTML = `
        <div class="card-series-backdrop" style="background-image: url('${seriesIcon}'); background-size: contain; background-repeat: no-repeat; background-position: center;"></div>
        <div class="card-portrait-wrapper">
          <img class="card-portrait-img" src="${activeImage}" alt="${r.name}" loading="lazy">
          ${variantSelectorHtml}
        </div>
        <div class="card-info-footer">
          <h3 class="card-fighter-name">${r.name.toUpperCase()}</h3>
          <div class="card-boxing-title" style="font-family: var(--font-stats); font-size: 10px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; margin-bottom: 4px;">
            ${activeVariant.boxing_ring_title || "A LEGENDARY FIGHTER"}
          </div>
          <span class="card-series-badge">${(r.series && r.series.name ? r.series.name : 'Unknown Series').toUpperCase()}</span>
        </div>
      `;

      // Bind events inside the newly set innerHTML
      if (variants.length > 1) {
        const prevBtn = card.querySelector(".prev-variant-btn");
        const nextBtn = card.querySelector(".next-variant-btn");

        if (prevBtn) {
          prevBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering card navigation click
            cardVariantIndices[r.slug] = (cardVariantIndices[r.slug] - 1 + variants.length) % variants.length;
            renderCardState();
          });
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Avoid triggering card navigation click
            cardVariantIndices[r.slug] = (cardVariantIndices[r.slug] + 1) % variants.length;
            renderCardState();
          });
        }
      }
    };

    // Trigger initial render
    renderCardState();

    // Card navigation trigger (clicks on the card take the user to `#fighter/slug`)
    card.addEventListener("click", (e) => {
      if (e.target.closest(".card-variant-arrow-btn")) {
        return; // Handled by inline listeners
      }
      window.location.hash = `#fighter/${r.slug}`;
    });

    return card;
  }

  // --- New Player Training Session Modal Coordinator ---
  const btnLearnToPlay = document.getElementById("btn-learn-to-play");
  const customLearnModal = document.getElementById("custom-learn-modal");
  const btnTrainingCancel = document.getElementById("btn-training-cancel");
  const btnTrainingConfirm = document.getElementById("btn-training-confirm");
  const btnTrainingOk = document.getElementById("btn-training-ok");
  const trainingPlayerNameInput = document.getElementById("training-player-name");
  const modalStepInput = document.getElementById("modal-step-input");
  const modalStepSuccess = document.getElementById("modal-step-success");

  if (btnLearnToPlay && customLearnModal) {
    btnLearnToPlay.addEventListener("click", () => {
      // Reset state and open modal
      if (trainingPlayerNameInput) trainingPlayerNameInput.value = "";
      if (modalStepInput) modalStepInput.style.display = "block";
      if (modalStepSuccess) modalStepSuccess.style.display = "none";
      customLearnModal.classList.add("active");
      if (trainingPlayerNameInput) {
        setTimeout(() => trainingPlayerNameInput.focus(), 100);
      }
    });
  }

  if (btnTrainingCancel && customLearnModal) {
    btnTrainingCancel.addEventListener("click", () => {
      customLearnModal.classList.remove("active");
    });
  }

  if (btnTrainingConfirm && customLearnModal) {
    btnTrainingConfirm.addEventListener("click", () => {
      const name = trainingPlayerNameInput ? trainingPlayerNameInput.value.trim() : "";
      if (!name) {
        alert("PLEASE ENTER YOUR NAME TO REQUEST A TUTORIAL.");
        return;
      }
      if (modalStepInput) modalStepInput.style.display = "none";
      if (modalStepSuccess) modalStepSuccess.style.display = "block";
    });

    // Support hitting Enter in the input field
    if (trainingPlayerNameInput) {
      trainingPlayerNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          btnTrainingConfirm.click();
        }
      });
    }
  }

  if (btnTrainingOk && customLearnModal) {
    btnTrainingOk.addEventListener("click", () => {
      customLearnModal.classList.remove("active");
    });
  }

  // Close modal when clicking on the overlay background
  if (customLearnModal) {
    customLearnModal.addEventListener("click", (e) => {
      if (e.target === customLearnModal) {
        customLearnModal.classList.remove("active");
      }
    });
  }

  // --- New Player Collapsible (Accordion) Toggle Coordinator ---
  const welcomePanelToggle = document.getElementById("welcome-panel-toggle");
  const welcomePanelContent = document.getElementById("welcome-panel-content");
  const welcomeCaret = document.getElementById("welcome-caret");

  if (welcomePanelToggle && welcomePanelContent) {
    welcomePanelToggle.addEventListener("click", () => {
      const isExpanded = welcomePanelContent.style.maxHeight && welcomePanelContent.style.maxHeight !== "0px";
      if (isExpanded) {
        // Collapse
        welcomePanelContent.style.maxHeight = "0px";
        welcomePanelContent.style.padding = "0 25px";
        if (welcomeCaret) welcomeCaret.style.transform = "rotate(0deg)";
        welcomePanelToggle.style.backgroundColor = "transparent";
        welcomePanelToggle.style.borderBottomColor = "rgba(255, 230, 0, 0)";
      } else {
        // Expand
        welcomePanelContent.style.maxHeight = welcomePanelContent.scrollHeight + "px";
        welcomePanelContent.style.padding = "0 25px 0 25px";
        if (welcomeCaret) welcomeCaret.style.transform = "rotate(180deg)";
        welcomePanelToggle.style.backgroundColor = "rgba(255, 230, 0, 0.05)";
        welcomePanelToggle.style.borderBottomColor = "rgba(255, 230, 0, 0.2)";
      }
    });
  }

  // --- Mobile Sync Collapsible (Accordion) Toggle Coordinator ---
  const qrPanelToggle = document.getElementById("qr-panel-toggle");
  const qrPanelContent = document.getElementById("qr-panel-content");
  const qrCaret = document.getElementById("qr-caret");

  if (qrPanelToggle && qrPanelContent) {
    qrPanelToggle.addEventListener("click", () => {
      const isExpanded = qrPanelContent.style.maxHeight && qrPanelContent.style.maxHeight !== "0px";
      if (isExpanded) {
        // Collapse
        qrPanelContent.style.maxHeight = "0px";
        qrPanelContent.style.padding = "0 25px";
        if (qrCaret) qrCaret.style.transform = "rotate(0deg)";
        qrPanelToggle.style.backgroundColor = "transparent";
        qrPanelToggle.style.borderBottomColor = "rgba(0, 240, 255, 0)";
      } else {
        // Expand
        qrPanelContent.style.maxHeight = qrPanelContent.scrollHeight + "px";
        qrPanelContent.style.padding = "0 25px 0 25px";
        if (qrCaret) qrCaret.style.transform = "rotate(180deg)";
        qrPanelToggle.style.backgroundColor = "rgba(0, 240, 255, 0.05)";
        qrPanelToggle.style.borderBottomColor = "rgba(0, 240, 255, 0.2)";
      }
    });
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
