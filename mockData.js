// Retro Super Smash Brothers Mock Database
// Isolated data layer for easily swapping with a real API later.

const FIGHTERS = [
  { id: "mario", name: "Mario", img: "assets/mario.png?v=5", bio: "The versatile jumpman. An all-around fighting champion." },
  { id: "link", name: "Link", img: "assets/link.png?v=5", bio: "The hero of Hyrule. Lethal with master sword and bombs." },
  { id: "samus", name: "Samus", img: "assets/samus.png?v=5", bio: "Intergalactic bounty hunter armed with a devastating arm cannon." },
  { id: "fox", name: "Fox", img: "assets/fox.png?v=5", bio: "Leader of Star Fox. Blazing fast speed and laser reflector." },
  { id: "pikachu", name: "Pikachu", img: "assets/pikachu.png?v=5", bio: "The electric mouse. Shocks opponents with lightning speed." },
  { id: "donkey_kong", name: "Donkey Kong", img: "assets/donkey_kong.png?v=5", bio: "The powerhouse of Kong Island. Devastating giant punches." }
];

const PLAYERS = [
  { id: "1", name: "Bob", tagline: "The Combo King" },
  { id: "2", name: "Alice", tagline: "The Technical Prodigy" },
  { id: "3", name: "Charlie", tagline: "The Unpredictable Tactician" },
  { id: "4", name: "David", tagline: "The Wall of Defense" },
  { id: "5", name: "Eva", tagline: "The Aggressive Rusher" }
];

// 4-stock standard tournament matches
const MATCHES = [
  // Bob (Mario) wins
  { id: 1, winnerId: "1", winnerFighter: "mario", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 310, winnerDamageTaken: 210, loserKOs: 2, loserFalls: 4, loserDamageDealt: 210, loserDamageTaken: 310 },
  { id: 2, winnerId: "1", winnerFighter: "mario", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 280, winnerDamageTaken: 140, loserKOs: 1, loserFalls: 4, loserDamageDealt: 140, loserDamageTaken: 280 },
  { id: 3, winnerId: "1", winnerFighter: "mario", loserId: "4", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 410, winnerDamageTaken: 360, loserKOs: 3, loserFalls: 4, loserDamageDealt: 360, loserDamageTaken: 410 },
  { id: 4, winnerId: "1", winnerFighter: "mario", loserId: "5", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 290, winnerDamageTaken: 220, loserKOs: 2, loserFalls: 4, loserDamageDealt: 220, loserDamageTaken: 290 },
  { id: 5, winnerId: "1", winnerFighter: "mario", loserId: "2", loserFighter: "samus", winnerKOs: 4, winnerFalls: 0, winnerDamageDealt: 240, winnerDamageTaken: 90, loserKOs: 0, loserFalls: 4, loserDamageDealt: 90, loserDamageTaken: 240 },
  { id: 6, winnerId: "1", winnerFighter: "mario", loserId: "3", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 320, winnerDamageTaken: 240, loserKOs: 2, loserFalls: 4, loserDamageDealt: 240, loserDamageTaken: 320 },
  { id: 7, winnerId: "1", winnerFighter: "mario", loserId: "4", loserFighter: "link", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 270, winnerDamageTaken: 150, loserKOs: 1, loserFalls: 4, loserDamageDealt: 150, loserDamageTaken: 270 },
  { id: 8, winnerId: "1", winnerFighter: "mario", loserId: "5", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 380, winnerDamageTaken: 320, loserKOs: 3, loserFalls: 4, loserDamageDealt: 320, loserDamageTaken: 380 },

  // Alice (Link) wins
  { id: 9, winnerId: "2", winnerFighter: "link", loserId: "1", loserFighter: "mario", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 350, winnerDamageTaken: 310, loserKOs: 3, loserFalls: 4, loserDamageDealt: 310, loserDamageTaken: 350 },
  { id: 10, winnerId: "2", winnerFighter: "link", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 300, winnerDamageTaken: 230, loserKOs: 2, loserFalls: 4, loserDamageDealt: 230, loserDamageTaken: 300 },
  { id: 11, winnerId: "2", winnerFighter: "link", loserId: "4", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 260, winnerDamageTaken: 130, loserKOs: 1, loserFalls: 4, loserDamageDealt: 130, loserDamageTaken: 260 },
  { id: 12, winnerId: "2", winnerFighter: "link", loserId: "5", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 330, winnerDamageTaken: 210, loserKOs: 2, loserFalls: 4, loserDamageDealt: 210, loserDamageTaken: 330 },
  { id: 13, winnerId: "2", winnerFighter: "link", loserId: "1", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 320, winnerDamageTaken: 240, loserKOs: 2, loserFalls: 4, loserDamageDealt: 240, loserDamageTaken: 320 },
  { id: 14, winnerId: "2", winnerFighter: "link", loserId: "3", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 0, winnerDamageDealt: 230, winnerDamageTaken: 80, loserKOs: 0, loserFalls: 4, loserDamageDealt: 80, loserDamageTaken: 230 },

  // Bob (Fox) wins - this creates Bob's second high performing combo for the podium!
  { id: 15, winnerId: "1", winnerFighter: "fox", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 340, winnerDamageTaken: 310, loserKOs: 3, loserFalls: 4, loserDamageDealt: 310, loserDamageTaken: 340 },
  { id: 16, winnerId: "1", winnerFighter: "fox", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 290, winnerDamageTaken: 160, loserKOs: 1, loserFalls: 4, loserDamageDealt: 160, loserDamageTaken: 290 },
  { id: 17, winnerId: "1", winnerFighter: "fox", loserId: "4", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 310, winnerDamageTaken: 220, loserKOs: 2, loserFalls: 4, loserDamageDealt: 220, loserDamageTaken: 310 },
  { id: 18, winnerId: "1", winnerFighter: "fox", loserId: "5", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 330, winnerDamageTaken: 250, loserKOs: 2, loserFalls: 4, loserDamageDealt: 250, loserDamageTaken: 330 },
  { id: 19, winnerId: "1", winnerFighter: "fox", loserId: "2", loserFighter: "samus", winnerKOs: 4, winnerFalls: 0, winnerDamageDealt: 220, winnerDamageTaken: 70, loserKOs: 0, loserFalls: 4, loserDamageDealt: 70, loserDamageTaken: 220 },

  // Charlie (Samus) wins
  { id: 20, winnerId: "3", winnerFighter: "samus", loserId: "1", loserFighter: "mario", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 310, winnerDamageTaken: 200, loserKOs: 2, loserFalls: 4, loserDamageDealt: 200, loserDamageTaken: 310 },
  { id: 21, winnerId: "3", winnerFighter: "samus", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 360, winnerDamageTaken: 290, loserKOs: 3, loserFalls: 4, loserDamageDealt: 290, loserDamageTaken: 360 },
  { id: 22, winnerId: "3", winnerFighter: "samus", loserId: "4", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 250, winnerDamageTaken: 150, loserKOs: 1, loserFalls: 4, loserDamageDealt: 150, loserDamageTaken: 250 },
  { id: 23, winnerId: "3", winnerFighter: "samus", loserId: "5", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 320, winnerDamageTaken: 230, loserKOs: 2, loserFalls: 4, loserDamageDealt: 230, loserDamageTaken: 320 },

  // David (Donkey Kong) wins
  { id: 24, winnerId: "4", winnerFighter: "donkey_kong", loserId: "1", loserFighter: "mario", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 390, winnerDamageTaken: 340, loserKOs: 3, loserFalls: 4, loserDamageDealt: 340, loserDamageTaken: 390 },
  { id: 25, winnerId: "4", winnerFighter: "donkey_kong", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 350, winnerDamageTaken: 270, loserKOs: 2, loserFalls: 4, loserDamageDealt: 270, loserDamageTaken: 350 },
  { id: 26, winnerId: "4", winnerFighter: "donkey_kong", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 380, winnerDamageTaken: 310, loserKOs: 3, loserFalls: 4, loserDamageDealt: 310, loserDamageTaken: 380 },

  // Eva (Pikachu) wins
  { id: 27, winnerId: "5", winnerFighter: "pikachu", loserId: "1", loserFighter: "mario", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 290, winnerDamageTaken: 210, loserKOs: 2, loserFalls: 4, loserDamageDealt: 210, loserDamageTaken: 290 },
  { id: 28, winnerId: "5", winnerFighter: "pikachu", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 270, winnerDamageTaken: 140, loserKOs: 1, loserFalls: 4, loserDamageDealt: 140, loserDamageTaken: 270 },
  { id: 29, winnerId: "5", winnerFighter: "pikachu", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 340, winnerDamageTaken: 280, loserKOs: 3, loserFalls: 4, loserDamageDealt: 280, loserDamageTaken: 340 },

  // Extra random matchups to flesh out fighter usage
  { id: 30, winnerId: "2", winnerFighter: "samus", loserId: "1", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 300, winnerDamageTaken: 220, loserKOs: 2, loserFalls: 4, loserDamageDealt: 220, loserDamageTaken: 300 },
  { id: 31, winnerId: "3", winnerFighter: "mario", loserId: "5", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 330, winnerDamageTaken: 290, loserKOs: 3, loserFalls: 4, loserDamageDealt: 290, loserDamageTaken: 330 },
  { id: 32, winnerId: "1", winnerFighter: "mario", loserId: "2", loserFighter: "link", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 280, winnerDamageTaken: 160, loserKOs: 1, loserFalls: 4, loserDamageDealt: 160, loserDamageTaken: 280 },
  { id: 33, winnerId: "2", winnerFighter: "link", loserId: "4", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 310, winnerDamageTaken: 240, loserKOs: 2, loserFalls: 4, loserDamageDealt: 240, loserDamageTaken: 310 },
  { id: 34, winnerId: "3", winnerFighter: "samus", loserId: "1", loserFighter: "fox", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 290, winnerDamageTaken: 230, loserKOs: 2, loserFalls: 4, loserDamageDealt: 230, loserDamageTaken: 290 },
  { id: 35, winnerId: "5", winnerFighter: "pikachu", loserId: "4", loserFighter: "donkey_kong", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 280, winnerDamageTaken: 200, loserKOs: 2, loserFalls: 4, loserDamageDealt: 200, loserDamageTaken: 280 },
  { id: 36, winnerId: "1", winnerFighter: "fox", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 1, winnerDamageDealt: 270, winnerDamageTaken: 150, loserKOs: 1, loserFalls: 4, loserDamageDealt: 150, loserDamageTaken: 270 },
  { id: 37, winnerId: "2", winnerFighter: "link", loserId: "5", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 3, winnerDamageDealt: 320, winnerDamageTaken: 260, loserKOs: 3, loserFalls: 4, loserDamageDealt: 260, loserDamageTaken: 320 },
  { id: 38, winnerId: "4", winnerFighter: "donkey_kong", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 340, winnerDamageTaken: 250, loserKOs: 2, loserFalls: 4, loserDamageDealt: 250, loserDamageTaken: 340 },
  { id: 39, winnerId: "1", winnerFighter: "mario", loserId: "5", loserFighter: "pikachu", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 290, winnerDamageTaken: 200, loserKOs: 2, loserFalls: 4, loserDamageDealt: 200, loserDamageTaken: 290 },
  { id: 40, winnerId: "2", winnerFighter: "link", loserId: "3", loserFighter: "samus", winnerKOs: 4, winnerFalls: 2, winnerDamageDealt: 300, winnerDamageTaken: 220, loserKOs: 2, loserFalls: 4, loserDamageDealt: 220, loserDamageTaken: 300 }
];

// Helper to make these variables available globally in browser module context
window.SMASH_MOCK_DATA = { FIGHTERS, PLAYERS, MATCHES };
