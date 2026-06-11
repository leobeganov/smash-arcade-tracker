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
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 14px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
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
      const isOthers = char.name === 'Others';

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
              ${!isOthers ? `onclick="window.location.hash = '#fighter/${char.name.toLowerCase().replace(/\\s+/g, '-')}'"` : ''}
        />
      `;
    });

    // Add hole in the center with stats summary
    svgHtml += `
      <circle cx="${center}" cy="${center}" r="${radius - strokeWidth / 2 - 2}" fill="var(--bg-iron)" stroke="var(--color-border-dark)" stroke-width="2" />
      <text x="${center}" y="${center + 5}" text-anchor="middle" font-weight="900" fill="var(--color-neon-yellow)" font-size="24px" font-family="var(--font-header)" style="text-shadow: 0 0 10px rgba(255,230,0,0.5);">${totalGames}</text>
      <text x="${center}" y="${center + 26}" text-anchor="middle" fill="#888" font-size="14px" letter-spacing="1px" text-transform="uppercase" font-family="var(--font-arcade)">TOTAL PICKS</text>
    </svg>`;

    // Build legendary list container
    let legendHtml = '<div class="chart-legend-grid">';
    topChars.forEach((char, i) => {
      const pct = Math.round((char.games / totalGames) * 100);
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const isOthers = char.name === 'Others';
      legendHtml += `
        <div class="legend-item" style="--legend-color: ${color}; ${isOthers ? '' : 'cursor: pointer;'}" ${isOthers ? '' : `onclick="window.location.hash = '#fighter/${char.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.querySelector('.legend-name').style.color='var(--legend-color)'; this.querySelector('.legend-name').style.textShadow='0 0 6px var(--legend-color)';" onmouseout="this.querySelector('.legend-name').style.color=''; this.querySelector('.legend-name').style.textShadow='';"`}>
          <span class="legend-badge"></span>
          <span class="legend-name" style="${isOthers ? '' : 'transition: color 0.2s, text-shadow 0.2s;'}">${char.name}</span>
          <span class="legend-count">${char.games} <small class="pct-label">(${pct}%)</small></span>
        </div>
      `;
    });
    legendHtml += '</div>';

    container.innerHTML = `
      <div class="donut-chart-wrapper">
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
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 14px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
      return;
    }

    // Sort by win rate (descending) and games (descending), limit to top 5 players
    const topPlayers = [...playersData]
      .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
      .slice(0, 5);

    let html = '<div class="bar-chart-container">';

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
        <div class="bar-chart-row">
          <div class="bar-row-label" style="cursor: pointer; transition: color 0.2s, text-shadow 0.2s;" onclick="window.location.hash = '#player/${player.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.color='var(--color-neon-cyan)'; this.style.textShadow='0 0 6px var(--color-neon-cyan)';" onmouseout="this.style.color=''; this.style.textShadow='';">
            ${player.name}
          </div>
          <div class="bar-track-wrapper">
            <div class="bar-stacked-track">
              ${p1Pct > 0 ? `<div class="bar-segment placement-1" style="width: ${p1Pct}%;" title="1st Place: ${counts[1]} times"></div>` : ''}
              ${p2Pct > 0 ? `<div class="bar-segment placement-2" style="width: ${p2Pct}%;" title="2nd Place: ${counts[2]} times"></div>` : ''}
              ${p3Pct > 0 ? `<div class="bar-segment placement-3" style="width: ${p3Pct}%;" title="3rd Place: ${counts[3]} times"></div>` : ''}
              ${remainingPct > 0 ? `<div class="bar-segment placement-4" style="width: ${remainingPct}%;" title="Other Placements: ${remainingCount} times"></div>` : ''}
            </div>
            <div class="bar-stats-summary">
              <span>1st: <strong class="text-placement-1">${counts[1]}</strong></span>
              <span>2nd: <strong class="text-placement-2">${counts[2]}</strong></span>
              <span>3rd: <strong class="text-placement-3">${counts[3]}</strong></span>
              ${remainingCount > 0 ? `<span>Other: <strong class="text-placement-4">${remainingCount}</strong></span>` : ''}
            </div>
          </div>
        </div>
      `;
    });

    // Add index guide legend
    html += `
      <div class="chart-guide-legend">
        <div class="guide-item"><span class="guide-dot placement-1"></span> 1ST</div>
        <div class="guide-item"><span class="guide-dot placement-2"></span> 2ND</div>
        <div class="guide-item"><span class="guide-dot placement-3"></span> 3RD</div>
        <div class="guide-item"><span class="guide-dot placement-4"></span> OTHER</div>
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
      container.innerHTML = `<div class="chart-empty" style="font-family: var(--font-arcade); font-size: 14px; opacity: 0.6;">NO DATA ENCOUNTERED</div>`;
      return;
    }

    // Sort by win rate, limit to top 3 players
    const sortedPlayers = [...playersData].sort((a, b) => b.winRate - a.winRate).slice(0, 3);

    const size = 95;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    let html = '<div class="gauges-grid" style="display: flex; justify-content: space-around; gap: 15px; width: 100%; flex-wrap: wrap;">';

    sortedPlayers.forEach((player, i) => {
      const wr = Math.round(player.winRate);
      const strokeOffset = circumference - (wr / 100) * circumference;
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const glowId = `gauge-glow-${i}`;

      html += `
        <div class="gauge-card" style="--gauge-color: ${color}; flex: 1; min-width: 100px; max-width: 140px; cursor: pointer; transition: transform 0.25s cubic-bezier(0.165, 0.84, 0.44, 1), background-color 0.25s ease, box-shadow 0.25s ease;" onclick="window.location.hash = '#player/${player.name.toLowerCase().replace(/\\s+/g, '-')}'" onmouseover="this.style.transform='translateY(-4px)'; this.style.backgroundColor='rgba(255, 255, 255, 0.03)'; this.querySelector('.gauge-name').style.color='var(--gauge-color)'; this.querySelector('.gauge-name').style.textShadow='0 0 6px var(--gauge-color)';" onmouseout="this.style.transform=''; this.style.backgroundColor=''; this.querySelector('.gauge-name').style.color=''; this.querySelector('.gauge-name').style.textShadow='';" >
          <div class="gauge-svg-wrapper" style="width: ${size}px; height: ${size}px; position: relative;">
            <svg viewBox="0 0 ${size} ${size}" class="gauge-svg">
              <defs>
                <filter id="${glowId}" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <!-- Base Circle Track -->
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" class="gauge-track-bg" />
              <!-- Animated Glowing Progress Circle -->
              <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" 
                      stroke-dasharray="${circumference}" 
                      stroke-dashoffset="${strokeOffset}" 
                      class="gauge-progress-circle" />
            </svg>
            <div class="gauge-text">
              <span class="gauge-number" style="font-size: 13px;">${wr}%</span>
              <span class="gauge-label" style="font-size: 7px; white-space: nowrap; letter-spacing: 0.2px; margin-top: 2px;">WIN RATE</span>
            </div>
          </div>
          <div class="gauge-details">
            <span class="gauge-name" style="font-size: 11px; transition: color 0.2s, text-shadow 0.2s;">${player.name}</span>
            <span class="gauge-gp">${player.wins} Wins / ${player.games} Games</span>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  /**
   * Renders an interactive line graph of daily match activity peaks in 10-minute intervals.
   */
  renderDailyPeakTimeline(containerId, matches) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter and bin matches between 8am and 6pm (480 to 1080 minutes)
    const bins = new Array(61).fill(0);
    let matchedInWindow = 0;

    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const date = new Date(match.timestamp);
        const hour = date.getHours();
        const minute = date.getMinutes();
        const minutesSinceMidnight = hour * 60 + minute;

        if (minutesSinceMidnight >= 480 && minutesSinceMidnight <= 1080) {
          const pointIndex = Math.round((minutesSinceMidnight - 480) / 10);
          if (pointIndex >= 0 && pointIndex <= 60) {
            bins[pointIndex]++;
            matchedInWindow++;
          }
        }
      });
    }

    const maxVal = Math.max(...bins);
    let step = 5;
    if (maxVal > 25) {
      const rawStep = maxVal / 4;
      step = Math.ceil(rawStep / 5) * 5;
    }
    const yMax = Math.ceil(maxVal / step) * step || 5;

    const width = 1000;
    const height = 250;
    const padding = { top: 30, right: 30, bottom: 40, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate path and area points
    const points = [];
    let pathD = "";
    for (let i = 0; i <= 60; i++) {
      const x = padding.left + (i / 60) * chartWidth;
      const y = padding.top + chartHeight - (bins[i] / yMax) * chartHeight;
      points.push({ x, y, val: bins[i], index: i });
      
      const cmd = i === 0 ? "M" : "L";
      pathD += `${cmd} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }

    const areaD = pathD + `L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    // Construct hours labels and grid lines (every hour: 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6)
    let gridLinesHtml = "";
    for (let h = 0; h <= 10; h++) {
      const idx = h * 6;
      const x = padding.left + (idx / 60) * chartWidth;
      const hour24 = 8 + h;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;
      const hourStr = `${hour12}:00 ${ampm}`;
      
      gridLinesHtml += `
        <line x1="${x}" y1="${padding.top}" x2="${x}" y2="${padding.top + chartHeight}" stroke="rgba(255, 255, 255, 0.08)" stroke-dasharray="3 3" />
        <text class="hour-label" x="${x}" y="${padding.top + chartHeight + 20}" text-anchor="middle" fill="#8a8d9a" font-size="8.5px" font-family="var(--font-arcade)">${hourStr}</text>
      `;
    }

    // Y Axis labels and grid lines (horizontal grid)
    let yGridHtml = "";
    for (let val = 0; val <= yMax; val += step) {
      const ratio = val / yMax;
      const y = padding.top + chartHeight - ratio * chartHeight;
      
      yGridHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="rgba(255, 255, 255, 0.08)" />
        <text x="${padding.left - 12}" y="${y + 3}" text-anchor="end" fill="#8a8d9a" font-size="10px" font-family="var(--font-stats)">${val}</text>
      `;
    }


    // Outer container wrapper HTML
    let containerHtml = `
      <div class="peak-timeline-svg-wrapper" style="width: 100%; height: 100%; position: relative; user-select: none;">
        <svg viewBox="0 0 ${width} ${height}" class="peak-timeline-svg" style="width: 100%; height: auto; display: block; overflow: visible;">
          <defs>
            <linearGradient id="peak-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-neon-yellow)" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="var(--color-neon-yellow)" stop-opacity="0.0"/>
            </linearGradient>
            <filter id="peak-line-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <!-- Grid Background lines -->
          <g class="grid-lines-group">
            ${gridLinesHtml}
            ${yGridHtml}
          </g>

          <!-- Y-axis Heading: Matches -->
          <text x="20" y="${padding.top + chartHeight / 2}" transform="rotate(-90, 20, ${padding.top + chartHeight / 2})" text-anchor="middle" fill="#8a8d9a" font-size="8.5px" font-family="var(--font-arcade)" letter-spacing="1.5px">MATCHES</text>

          <!-- Filled area under path -->
          ${matchedInWindow > 0 ? `<path d="${areaD}" fill="url(#peak-area-grad)" style="pointer-events: none;" />` : ''}

          <!-- Line path -->
          ${matchedInWindow > 0 ? `<path d="${pathD}" fill="none" stroke="var(--color-neon-yellow)" stroke-width="3" filter="url(#peak-line-glow-filter)" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;" />` : ''}

          <!-- Interactive Hover tracking elements -->
          <line id="peak-hover-line" x1="0" y1="${padding.top}" x2="0" y2="${padding.top + chartHeight}" stroke="var(--color-neon-yellow)" stroke-width="1.5" stroke-dasharray="4 4" style="opacity: 0; pointer-events: none; transition: opacity 0.15s ease;" />
          <circle id="peak-hover-dot" r="6" fill="var(--color-neon-yellow)" stroke="#fff" stroke-width="2" style="opacity: 0; pointer-events: none; filter: drop-shadow(0 0 5px var(--color-neon-yellow)); transition: opacity 0.15s ease;" />

          <!-- Boundary box lines -->
          <rect x="${padding.left}" y="${padding.top}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1" />
        </svg>

        <!-- Dynamic Tooltip Div -->
        <div id="peak-tooltip" style="position: absolute; display: none; pointer-events: none; background: rgba(10, 11, 16, 0.95); border: 1.5px solid var(--color-neon-yellow); padding: 8px 12px; border-radius: 4px; z-index: 1000; font-family: var(--font-stats); font-size: 11px; box-shadow: 0 0 15px rgba(255, 230, 0, 0.35); color: #fff; transition: left 0.1s ease, top 0.1s ease;">
          <div style="font-family: var(--font-arcade); font-size: 9px; color: var(--color-neon-yellow); margin-bottom: 4px;" class="tooltip-time">-</div>
          <div class="tooltip-matches" style="font-weight: bold;">-</div>
        </div>

        <!-- Empty state warning overlay if no matches -->
        ${matchedInWindow === 0 ? `
          <div class="chart-empty-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.2); pointer-events: none;">
            <div style="font-family: var(--font-arcade); font-size: 14px; color: var(--color-neon-yellow); opacity: 0.65; text-shadow: 0 0 8px rgba(255,230,0,0.3); text-align: center; line-height: 1.5;">
              NO MATCHES PLAYED<br>BETWEEN 8:00 AM & 6:00 PM
            </div>
          </div>
        ` : ''}
      </div>
    `;

    container.innerHTML = containerHtml;

    if (matchedInWindow === 0) return; // No hover tracking necessary for empty state

    // Wire up events
    const svg = container.querySelector('.peak-timeline-svg');
    const tooltip = container.querySelector('#peak-tooltip');
    const hoverLine = svg.querySelector('#peak-hover-line');
    const hoverDot = svg.querySelector('#peak-hover-dot');

    svg.addEventListener('mousemove', (e) => {
      handleMove(e.clientX);
    });

    svg.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    }, { passive: true });

    svg.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    }, { passive: true });

    const handleLeave = () => {
      hoverLine.style.opacity = '0';
      hoverDot.style.opacity = '0';
      tooltip.style.display = 'none';
    };

    svg.addEventListener('mouseleave', handleLeave);
    svg.addEventListener('touchend', handleLeave);
    svg.addEventListener('touchcancel', handleLeave);

    function handleMove(clientX) {
      const rect = svg.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      
      // Map back to SVG coordinate space
      const svgX = (mouseX / rect.width) * width;
      
      // Calculate index 0..60
      let i = Math.round(((svgX - padding.left) / chartWidth) * 60);
      if (i < 0) i = 0;
      if (i > 60) i = 60;
      
      const pt = points[i];
      
      // Update line and dot
      hoverLine.setAttribute('x1', pt.x.toFixed(1));
      hoverLine.setAttribute('x2', pt.x.toFixed(1));
      hoverLine.style.opacity = '1';
      
      hoverDot.setAttribute('cx', pt.x.toFixed(1));
      hoverDot.setAttribute('cy', pt.y.toFixed(1));
      hoverDot.style.opacity = '1';
      
      // Format 12-hour AM/PM time label
      const totalMins = 480 + i * 10;
      const hour24 = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      const ampm = hour24 >= 12 ? 'PM' : 'AM';
      let hour12 = hour24 % 12;
      if (hour12 === 0) hour12 = 12;
      const displayTime = `${String(hour12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
      
      tooltip.querySelector('.tooltip-time').textContent = displayTime;
      tooltip.querySelector('.tooltip-matches').textContent = `${pt.val} ${pt.val === 1 ? 'Match' : 'Matches'} Played`;
      
      // Position HTML absolute tooltip relative to the wrapper container
      const tooltipX = (pt.x / width) * rect.width;
      const tooltipY = (pt.y / height) * rect.height - 70; // 70px offset above point
      
      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.top = `${tooltipY}px`;
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.display = 'block';

      // Keep tooltip from overflowing left or right
      const tooltipRect = tooltip.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const halfWidth = tooltipRect.width / 2;
      let leftOffset = tooltipX;
      
      if (tooltipX - halfWidth < 0) {
        leftOffset = halfWidth + 4;
      } else if (tooltipX + halfWidth > containerRect.width) {
        leftOffset = containerRect.width - halfWidth - 4;
      }
      tooltip.style.left = `${leftOffset}px`;
    }
  }
};

// Bind to window to allow standard non-module script loading (fixes CORS over file://)
window.Charts = Charts;
