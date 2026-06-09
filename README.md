# 🎮 Retro Smash Match Results Tracker

A premium, N64-inspired arcade-style Match Results Tracker. Built with high-fidelity retro styling, dynamic CRT scanline filters, neon-glowing cabinet grids, and an Olympic-style 3D volumetric podium stage featuring isolated low-poly character sprites.

---

## 🌟 Key Features

### 1. 🏅 Olympic 3D Volumetric Podiums
- Features a **gorgeous 3D column setup** for the top 3 player-fighter combinations.
- Cylinder blocks are fully modeled in CSS using volumetric elliptical cap gradients, contact shadows, and realistic bottom depth blurs.
- **Isolated Low-Poly Fighter Sprites**: Seamless transparency allows fighters to stand together with interactive float/breathing animations.
- **Floating Gold Crown**: The #1 champion is celebrated with a dynamic golden crown that breathes in perfect sync above their head.
- **Engraved Metallic Plaques**: Center-aligned Gold, Silver, and Bronze trophy plates mounted on the front faces of the podium columns.

### 2. ⚖️ Frequency-Adjusted Win Ratings
To balance win-rate efficiency with game volume fairly, rankings are calculated using a non-linear scaling formula rather than raw win counts:
$$\text{Adjusted Wins} = \frac{\text{wins}^{2.5}}{\text{totalMatches}^{1.5}}$$
- Prevents penalizing active players who maintain high win ratios.
- Ranks a **`10/10` (10.00 pts)** record above a **`20/40` (7.07 pts)** record, while ensuring outliers (e.g., `1/1` game) are capped fairly (1.00 pts).
- Built dynamically across the **Olympic Podium**, the **Global Leaderboard**, and individual profile stats.

### 3. 📊 Double-Themed Premium Profile Views
- **Player Profiles (Neon Magenta Scoreboard)**:
  - High-readability scoreboard displaying wins, losses, Adjusted Win rating, K/D ratio, and win rate percentage.
  - **Interactive Signature Fighter Card**: Displays their most played fighter with magenta drop-shadow glows. Click to jump straight to that Fighter's specs page.
  - **Interactive Arch Nemesis Card**: Displays their most faced opponent. Click to open that player's profile instantly.
- **Fighter Profiles (Neon Cyan Cyber Tech)**:
  - Cybernetic spec database displaying combat records, average damage stats, and a matchup report.
  - **Interactive Top Players Spec Sheet**: Hover-animating monospace index displaying the top players using this character. Click any player to open their stats card.
  - **Nemesis Fighter Panel**: Displays the opponent character played against most with custom drop-shadow styling.

### 4. ⚡️ Instant Autocomplete Search & Transition Overlays
- Search for any player or fighter with rapid autocomplete dropdown menus showing distinctive categorized badge overlays.
- Seamless view changes utilize retro diagonal curtain-swipe transition screens mimicking a real fighting game stage select.

---

## 🛠️ Technology Stack
- **Frontend Core**: Semantic HTML5 & Vanilla ES6+ Javascript
- **Styling System**: Raw Vanilla CSS3 (Custom properties, CSS Grid, Flexbox, Keyframes, Drop-glow filters)
- **Mathematical Engine**: Frequency scaling volume weight algorithm
- **Server Utility**: Python Local Server

---

## 🚀 How to Run Locally

You can launch and preview the Match Tracker in seconds using any local HTTP web server:

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd smash-arcade-tracker
   ```

2. **Start a local HTTP server**:
   - using **Python 3**:
     ```bash
     python3 -m http.server 8000
     ```
   - using **NodeJS** (`npx`):
     ```bash
     npx serve
     ```

3. **Open your browser** and navigate to:
   👉 **`http://localhost:8000`**

---

## 🗂️ Project Directory Structure

```
├── index.html           # Main Application Frame and HTML layouts
├── index.css            # Styling Engine, Cabinets, Grid background & Themes
├── app.js               # Interactive State Coordinator, Autocomplete, & Router
├── apiService.js        # Latency-mocked Asynchronous Data aggregation Layer
├── mockData.js          # Tournament Match Database, Player and Fighter arrays
└── assets/              # Premium transparent low-poly character sprites
```

---

## 👑 Credits & Inspiration
Inspired by the timeless look and feel of 1990s tournament cabinets and classic arcade interface design.
