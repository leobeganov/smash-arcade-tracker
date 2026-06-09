/**
 * Smashalytics - Custom SVG Charting Engine
 * Creates interactive, highly stylized, responsive, and animated SVG charts.
 */

// Retro neon palette
const PALETTE = {
  blue: '#00f0ff', // Neon Cyan
  blueGlow: 'rgba(0, 240, 255, 0.4)',
  red: '#ff007f', // Neon Magenta
  redGlow: 'rgba(255, 0, 127, 0.4)',
  gold: '#ffe600', // Neon Yellow
  goldGlow: 'rgba(255, 230, 0, 0.4)',
  purple: '#a855f7', // Cyber Purple
  purpleGlow: 'rgba(168, 85, 247, 0.4)',
  green: '#10b981', // Emerald Green
  greenGlow: 'rgba(16, 185, 129, 0.4)',
  orange: '#ff5d00', // Neon Orange
  orangeGlow: 'rgba(255, 93, 0, 0.4)',
  silver: '#cbd5e1',
  bronze: '#b45309',
  slate: '#475569'
};

const CHART_COLORS = [
  '#00f0ff', // Neon Cyan
  '#ff007f', // Neon Magenta
  '#ffe600', // Neon Yellow
  '#ff5d00', // Neon Orange
  '#a855f7', // Cyber Purple
  '#10b981', // Emerald Green
  '#ec4899', // Hot Pink
  '#06b6d4'  // Cyan
];

const Charts = {
  /**
   * Helper: Polar to Cartesian Coordinates
   */
  polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  },

  /**
   * Helper: Generates SVG Arc string
   */
  describeArc(x, y, radius, startAngle, endAngle) {
    const start = this.polarToCartesian(x, y, radius, endAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(' ');
  },

  /**
   * Renders a custom SVG Donut Chart representing Character Pick Rates.
   */
  renderCharacterDonut(containerId, charactersData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!charactersData || charactersData.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 11px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
      return;
    }

    // Limit to top 5 characters, bundle the rest into 'Others'
    let topChars = [...charactersData].slice(0, 5);
    const totalGames = charactersData.reduce((sum, c) => sum + c.games, 0);

    if (charactersData.length > 5) {
      const restGames = charactersData.slice(5).reduce((sum, c) => sum + c.games, 0);
      topChars.push({ name: 'Others', games: restGames });
    }

    const size = 260;
    const center = size / 2;
    const radius = 80;
    const strokeWidth = 22;

    let svgHtml = `
      <svg viewBox="0 0 ${size} ${size}" class="donut-svg">
        <defs>
          <filter id="donut-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
    `;

    let currentAngle = 0;

    topChars.forEach((char, i) => {
      const percentage = char.games / totalGames;
      if (percentage === 0) return;

      const angleSweep = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle = endAngle;

      // Avoid floating errors closing circle
      const safeEndAngle = endAngle >= 359.9 ? 359.9 : endAngle;
      const arcPath = this.describeArc(center, center, radius, startAngle, safeEndAngle);
      const color = CHART_COLORS[i % CHART_COLORS.length];

      svgHtml += `
        <path d="${arcPath}" 
              fill="none" 
              stroke="${color}" 
              stroke-width="${strokeWidth}" 
              class="donut-segment" 
              data-name="${char.name}"
              data-games="${char.games}"
              data-pct="${Math.round(percentage * 100)}%"
              style="transition: stroke-width 0.3s; cursor: pointer;"
              onmouseover="this.setAttribute('stroke-width', '${strokeWidth + 4}'); this.style.filter = 'url(#donut-glow)';"
              onmouseout="this.setAttribute('stroke-width', '${strokeWidth}'); this.style.filter = 'none';"
        />
      `;
    });

    // Add hole in the center with stats summary
    svgHtml += `
      <circle cx="${center}" cy="${center}" r="${radius - strokeWidth / 2 - 2}" fill="var(--bg-iron)" stroke="var(--color-border-dark)" stroke-width="2" />
      <text x="${center}" y="${center + 5}" text-anchor="middle" font-weight="900" fill="var(--color-neon-yellow)" font-size="24px" font-family="var(--font-header)" style="text-shadow: 0 0 10px rgba(255,230,0,0.5);">${totalGames}</text>
      <text x="${center}" y="${center + 24}" text-anchor="middle" fill="#888" font-size="9px" letter-spacing="1px" text-transform="uppercase" font-family="var(--font-arcade)">TOTAL PICKS</text>
    </svg>`;

    // Build legendary list container
    let legendHtml = '<div class="chart-legend-grid">';
    topChars.forEach((char, i) => {
      const pct = Math.round((char.games / totalGames) * 100);
      const color = CHART_COLORS[i % CHART_COLORS.length];
      legendHtml += `
        <div class="legend-item" style="--legend-color: ${color}">
          <span class="legend-badge"></span>
          <span class="legend-name" style="font-family: var(--font-header); font-weight: 500; font-size: 13px; text-transform: uppercase;">${char.name}</span>
          <span class="legend-count" style="font-family: var(--font-stats); font-size: 15px; color: #fff;">${char.games} <small style="opacity: 0.6;">(${pct}%)</small></span>
        </div>
      `;
    });
    legendHtml += '</div>';

    container.innerHTML = `
      <div class="donut-chart-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%;">
        ${svgHtml}
        ${legendHtml}
      </div>
    `;
  },

  /**
   * Renders a Horizontal Grouped Stacked Bar Chart for Player Placements.
   * Compares gold/silver/bronze distribution across players.
   */
  renderPlayerPlacements(containerId, playersData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!playersData || playersData.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 11px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
      return;
    }

    // Limit to top 5 players
    const topPlayers = [...playersData].slice(0, 5);

    let html = '<div class="bar-chart-container" style="display: flex; flex-direction: column; gap: 1.25rem; width: 100%; padding: 0.5rem 0;">';

    topPlayers.forEach(player => {
      // Calculate placement counts
      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
      player.placements.forEach(p => {
        if (counts[p] !== undefined) counts[p]++;
      });

      const total = player.placements.length;
      const p1Pct = total > 0 ? (counts[1] / total) * 100 : 0;
      const p2Pct = total > 0 ? (counts[2] / total) * 100 : 0;
      const p3Pct = total > 0 ? (counts[3] / total) * 100 : 0;
      
      // Rest placements aggregated
      const remainingCount = Object.keys(counts).slice(3).reduce((sum, key) => sum + counts[key], 0);
      const remainingPct = total > 0 ? (remainingCount / total) * 100 : 0;

      html += `
        <div class="bar-chart-row" style="display: grid; grid-template-columns: 100px 1fr; align-items: center; gap: 1rem;">
          <div class="bar-row-label" style="font-weight: 700; font-family: var(--font-header); font-size: 13px; text-transform: uppercase; color: var(--color-text-white); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${player.name}
          </div>
          <div class="bar-track-wrapper" style="display: flex; flex-direction: column; gap: 0.25rem;">
            <div class="bar-stacked-track" style="height: 14px; background: rgba(0,0,0,0.4); border: 1px solid var(--color-border-dark); overflow: hidden; display: flex; box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);">
              ${p1Pct > 0 ? `<div class="bar-segment placement-1" style="width: ${p1Pct}%; background: ${PALETTE.gold}; box-shadow: 0 0 8px ${PALETTE.goldGlow}; transition: width 0.5s;" title="1st Place: ${counts[1]} times"></div>` : ''}
              ${p2Pct > 0 ? `<div class="bar-segment placement-2" style="width: ${p2Pct}%; background: ${PALETTE.silver}; transition: width 0.5s;" title="2nd Place: ${counts[2]} times"></div>` : ''}
              ${p3Pct > 0 ? `<div class="bar-segment placement-3" style="width: ${p3Pct}%; background: ${PALETTE.bronze}; transition: width 0.5s;" title="3rd Place: ${counts[3]} times"></div>` : ''}
              ${remainingPct > 0 ? `<div class="bar-segment placement-4" style="width: ${remainingPct}%; background: ${PALETTE.slate}; transition: width 0.5s;" title="Other Placements: ${remainingCount} times"></div>` : ''}
            </div>
            <div class="bar-stats-summary" style="display: flex; gap: 1rem; font-size: 11px; font-family: var(--font-stats); color: #888;">
              <span>GP: <strong style="color: #fff;">${total}</strong></span>
              <span>1st: <strong style="color: ${PALETTE.gold}">${counts[1]}</strong></span>
              <span>2nd: <strong style="color: #cbd5e1">${counts[2]}</strong></span>
              <span>3rd: <strong style="color: #fb923c">${counts[3]}</strong></span>
              ${remainingCount > 0 ? `<span>Other: <strong style="color: #64748b">${remainingCount}</strong></span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    // Add index guide legend
    html += `
      <div class="chart-guide-legend" style="display: flex; gap: 1.25rem; justify-content: flex-end; border-top: 2px dashed var(--color-border-dark); padding-top: 0.75rem; margin-top: 0.5rem; font-size: 11px; font-family: var(--font-header);">
        <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display: inline-block; width: 10px; height: 10px; background: ${PALETTE.gold}; border-radius: 2px;"></span> 1ST</div>
        <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display: inline-block; width: 10px; height: 10px; background: ${PALETTE.silver}; border-radius: 2px;"></span> 2ND</div>
        <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display: inline-block; width: 10px; height: 10px; background: ${PALETTE.bronze}; border-radius: 2px;"></span> 3RD</div>
        <div style="display: flex; align-items: center; gap: 0.35rem;"><span style="display: inline-block; width: 10px; height: 10px; background: ${PALETTE.slate}; border-radius: 2px;"></span> OTHER</div>
      </div>
    `;

    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Renders a series of High-Tech Glowing Activity Ring Gauges showing player win rates.
   */
  renderWinRateGauge(containerId, playersData) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!playersData || playersData.length === 0) {
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 11px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
      return;
    }

    // Sort by win rate, limit to 4 players
    const sortedPlayers = [...playersData].sort((a, b) => b.winRate - a.winRate).slice(0, 4);

    const size = 110;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    let html = '<div class="gauges-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 1rem; width: 100%; justify-items: center; align-items: center;">';

    sortedPlayers.forEach((player, i) => {
      const wr = Math.round(player.winRate);
      const strokeOffset = circumference - (wr / 100) * circumference;
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const glowId = `gauge-glow-${i}`;

      html += `
        <div class="gauge-card" style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; text-align: center; width: 100%;">
          <div class="gauge-svg-wrapper" style="position: relative; width: ${size}px; height: ${size}px;">
            <svg viewBox="0 0 ${size} ${size}" style="width: 100%; height: 100%; transform: rotate(-90deg);">
              <defs>
                <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <!-- Base Circle Track -->
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8" />
              <!-- Animated Glowing Progress Circle -->
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="8" 
                      stroke-dasharray="${circumference}" 
                      stroke-dashoffset="${strokeOffset}" 
                      stroke-linecap="round"
                      style="filter: drop-shadow(0 0 6px ${color}); transition: stroke-dashoffset 0.8s ease-in-out;" />
            </svg>
            <div class="gauge-text" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: var(--font-header);">
              <span class="gauge-number" style="font-size: 18px; font-weight: 700; color: #fff; line-height: 1;">${wr}%</span>
              <span class="gauge-label" style="font-size: 8px; color: var(--color-neon-cyan); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; font-family: var(--font-arcade);">W/R</span>
            </div>
          </div>
          <div class="gauge-details" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
            <span class="gauge-name" style="font-size: 14px; font-weight: 700; font-family: var(--font-header); text-transform: uppercase; color: var(--color-text-white); line-height: 1.2;">${player.name}</span>
            <span class="gauge-gp" style="font-size: 12px; color: #888; font-family: var(--font-stats);">${player.wins}W / ${player.games}G</span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};

// Bind to window to allow standard non-module script loading (fixes CORS over file://)
window.Charts = Charts;
