require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
    .then(() => console.log('✅ MongoDB Atlas conectado.'))
    .catch(err => console.error('⚠️ MongoDB Atlas indisponível:', err.message));
}

app.use(express.static(path.join(__dirname, 'public')));

// Helper de arredondamento para otimização do payload JSON
function round2(num) {
  return Math.round((num || 0) * 100) / 100;
}

// --- PERSISTÊNCIA DE CONTAS E BANCO DE DADOS EM ARQUIVO JSON ---
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({}), 'utf8');
}

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (e) {
    console.error("Erro ao ler users.json:", e);
    return {};
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.error("Erro ao salvar users.json:", e);
  }
}

// --- CATALOGO DE 100 ITENS POR CATEGORIA (TOTAL: 500 COSMÉTICOS) ---
const RARITIES = [
  { name: 'Comum', key: 'comum', color: '#b0c3d9', price: 100, weight: 50 },
  { name: 'Raro', key: 'raro', color: '#4b69ff', price: 300, weight: 30 },
  { name: 'Épico', key: 'epico', color: '#8847ff', price: 800, weight: 13 },
  { name: 'Lendário', key: 'lendario', color: '#d32ce6', price: 2000, weight: 6 },
  { name: 'Místico', key: 'mistico', color: '#eb4b4b', price: 5000, weight: 1 }
];

const CATEGORIES = ['hat', 'shirt', 'pants', 'weapon_skin', 'death_scream'];

const CATEGORY_NAMES = {
  hat: 'Chapéu',
  shirt: 'Camisa',
  pants: 'Calça',
  weapon_skin: 'Skin de Arma',
  death_scream: 'Grito de Morte'
};

const CATEGORY_PREFIXES = {
  hat: ['Boné', 'Capacete', 'Chapéu', 'Touca', 'Coroa', 'Mascara', 'Viseira', 'Turbante', 'Boina', 'Cartola'],
  shirt: ['Jaqueta', 'Camisa', 'Colete', 'Terno', 'Jaleco', 'Manto', 'Suéter', 'Regata', 'Armadura', 'Kimono'],
  pants: ['Calça', 'Shorts', 'Bermuda', 'Pijama', 'Legging', 'Jeans', 'Kilt', 'Calça Cargo', 'Calça Tática', 'Sunga'],
  weapon_skin: ['Skin', 'Pintura', 'Textura', 'Acabamento', 'Camuflagem', 'Aço', 'Revestimento', 'Aura', 'Brilho', 'Estampa'],
  death_scream: ['Grito', 'Som', 'Efeito', 'Grito Engraçado', 'Audio', 'Vocal', 'Ruído', 'Grito Dramático', 'Grito Retro', 'Sons']
};

const ITEM_THEMES = [
  'do Café', 'da Manhã', 'do Ovo', 'Tático', 'Cyberpunk', 'de Ouro', 'de Lava', 'de Neve',
  'de Halloween', 'de Natal', 'de Páscoa', 'de Valentine', 'Imperial', 'Espacial', 'Ninja',
  'de Pirata', 'de Mestre Cuca', 'Vulcânico', 'Neon', 'Mágico', 'Retrô 8-Bit', 'Anônimo',
  'Cromado', 'da Selva', 'do Deserto', 'Subaquático', 'Estelar', 'Místico', 'Radiante', 'Sombrio'
];

const ITEMS_CATALOG = {};

const SEASONAL_THEME_MAP = {
  'de Halloween': 'crate_halloween',
  'de Natal': 'crate_christmas',
  'de Páscoa': 'crate_easter',
  'de Valentine': 'crate_valentines',
  'de Ano Novo': 'crate_newyear'
};

CATEGORIES.forEach(cat => {
  ITEMS_CATALOG[cat] = [];
  let count = 0;
  CATEGORY_PREFIXES[cat].forEach(prefix => {
    ITEM_THEMES.forEach(theme => {
      if (count < 100) {
        count++;
        const rarityObj = RARITIES[count % RARITIES.length];
        const itemId = `${cat}_${count}`;
        const seasonalCrate = SEASONAL_THEME_MAP[theme] || null;
        const isSeasonal = !!seasonalCrate;

        ITEMS_CATALOG[cat].push({
          id: itemId,
          category: cat,
          categoryName: CATEGORY_NAMES[cat],
          name: `${prefix} ${theme} #${count}`,
          rarity: rarityObj.key,
          rarityName: rarityObj.name,
          rarityColor: rarityObj.color,
          price: rarityObj.price,
          seasonal: isSeasonal,
          seasonalCrate: seasonalCrate
        });
      }
    });
  });
});

// --- 20 CAIXAS DE UNBOXING (INCLUINDO CAIXAS SAZONAIS) ---
const CRATES = [
  { id: 'crate_starter', name: '📦 Caixa de Café Inicial', cost: 100, category: 'all' },
  { id: 'crate_hats', name: '🎩 Caixa do Chapeleiro', cost: 150, category: 'hat' },
  { id: 'crate_shirts', name: '👕 Caixa de Roupas & Estilo', cost: 150, category: 'shirt' },
  { id: 'crate_pants', name: '👖 Caixa de Calças Táticas', cost: 150, category: 'pants' },
  { id: 'crate_weapons', name: '🔫 Caixa do Armeiro', cost: 200, category: 'weapon_skin' },
  { id: 'crate_screams', name: '😱 Caixa de Gritos Engraçados', cost: 120, category: 'death_scream' },
  { id: 'crate_tactical', name: '🎖️ Caixa Militar Tática', cost: 250, category: 'all' },
  { id: 'crate_cyber', name: '🤖 Caixa Cyberpunk Neon', cost: 300, category: 'all' },
  { id: 'crate_gold', name: '👑 Caixa Midas de Ouro', cost: 500, category: 'all' },
  { id: 'crate_mystic', name: '🔮 Caixa Mística Suprema', cost: 750, category: 'all' },
  { id: 'crate_vintage', name: '📺 Caixa Retrô 8-Bit', cost: 180, category: 'all' },
  { id: 'crate_space', name: '🚀 Caixa Galáctica Espacial', cost: 350, category: 'all' },
  { id: 'crate_ninja', name: '🥷 Caixa das Sombras Ninja', cost: 280, category: 'all' },
  { id: 'crate_chef', name: '🍳 Caixa Gourmet do Mestre Cuca', cost: 220, category: 'all' },
  { id: 'crate_ocean', name: '🌊 Caixa das Profundezas Marinhas', cost: 260, category: 'all' },

  // --- 5 CAIXAS SAZONAIS (COM TIMER DEDICADO DE 10 DIAS) ---
  { id: 'crate_halloween', name: '🎃 Caixa de Halloween (Edição Limitada)', cost: 400, category: 'all', seasonal: true, daysLeft: 10 },
  { id: 'crate_christmas', name: '🎅 Caixa de Natal (Edição Limitada)', cost: 400, category: 'all', seasonal: true, daysLeft: 10 },
  { id: 'crate_easter', name: '🐰 Caixa de Páscoa (Edição Limitada)', cost: 400, category: 'all', seasonal: true, daysLeft: 10 },
  { id: 'crate_valentines', name: '💖 Caixa de Valentine\'s (Edição Limitada)', cost: 400, category: 'all', seasonal: true, daysLeft: 10 },
  { id: 'crate_newyear', name: '🎆 Caixa de Ano Novo (Edição Limitada)', cost: 400, category: 'all', seasonal: true, daysLeft: 10 }
];

function getActiveCrates() {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 1 = Feb, 2 = Mar, 3 = Apr, 5 = Jun, 9 = Oct, 11 = Dec
  const day = now.getDate();     // 1..31

  return CRATES.filter(crate => {
    if (!crate.seasonal) return true; // As 15 caixas normais aparecem SEMPRE!

    if (crate.id === 'crate_halloween') {
      // Dia do Halloween: 31 de Outubro (Outubro = Mês 9)
      return (month === 9 && day === 31);
    }
    if (crate.id === 'crate_christmas') {
      // Dia do Natal: 24 ou 25 de Dezembro (Dezembro = Mês 11)
      return (month === 11 && (day === 24 || day === 25));
    }
    if (crate.id === 'crate_easter') {
      // Dia da Páscoa (ex: 31 de Março ou 20 de Abril)
      return (month === 2 && day === 31) || (month === 3 && day === 20);
    }
    if (crate.id === 'crate_valentines') {
      // Valentine's (14 de Fev) ou Dia dos Namorados (12 de Junho)
      return (month === 1 && day === 14) || (month === 5 && day === 12);
    }
    if (crate.id === 'crate_newyear') {
      // Réveillon / Ano Novo (31 de Dezembro ou 1 de Janeiro)
      return (month === 11 && day === 31) || (month === 0 && day === 1);
    }
    return false;
  });
}


// Mapas (5 mapas com suporte a andares e carpetes)
const map1_f0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 4, 6, 0, 0, 1, 1, 0, 0, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 2, 0, 0, 0, 0, 2, 6, 5, 5, 5, 1],
  [1, 0, 0, 0, 2, 2, 0, 1, 1, 0, 2, 2, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 1, 1, 0, 2, 2, 0, 1, 1, 0, 2, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 0, 0, 0, 0, 2, 3, 3, 2, 0, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 0, 2, 3, 3, 2, 0, 0, 0, 0, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 2, 0, 1, 1, 0, 2, 2, 0, 1, 1, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 2, 2, 0, 1, 1, 0, 2, 2, 0, 0, 0, 1],
  [1, 4, 4, 4, 6, 2, 0, 0, 0, 0, 2, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 0, 0, 1, 1, 0, 0, 6, 5, 5, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map2_f0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 4, 6, 1, 0, 0, 0, 0, 1, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 1, 0, 2, 2, 0, 1, 6, 5, 5, 5, 1],
  [1, 0, 0, 2, 0, 0, 0, 7, 7, 0, 0, 0, 2, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 0, 2, 2, 0, 1, 0, 0, 1, 0, 2, 2, 0, 1, 1],
  [1, 0, 0, 2, 2, 0, 0, 3, 3, 0, 0, 2, 2, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 3, 3, 0, 0, 2, 2, 0, 0, 1],
  [1, 1, 0, 2, 2, 0, 1, 0, 0, 1, 0, 2, 2, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 2, 0, 0, 0, 7, 7, 0, 0, 0, 2, 0, 0, 1],
  [1, 4, 4, 4, 6, 1, 0, 2, 2, 0, 1, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 1, 0, 0, 0, 0, 1, 6, 5, 5, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map2_f1 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 7, 7, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 3, 3, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 3, 3, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 7, 7, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map3_f0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 6, 0, 0, 0, 1, 1, 0, 0, 0, 6, 5, 5, 1],
  [1, 4, 4, 6, 1, 0, 0, 0, 0, 0, 0, 1, 6, 5, 5, 1],
  [1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 0, 1, 2, 0, 0, 2, 1, 0, 2, 0, 0, 1],
  [1, 1, 0, 0, 0, 2, 0, 3, 3, 0, 2, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 2, 0, 3, 3, 0, 2, 0, 0, 0, 1, 1],
  [1, 0, 0, 2, 0, 1, 2, 0, 0, 2, 1, 0, 2, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 6, 1, 0, 0, 0, 0, 0, 0, 1, 6, 5, 5, 1],
  [1, 4, 4, 6, 0, 0, 0, 1, 1, 0, 0, 0, 6, 5, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map4_f0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 4, 6, 0, 0, 0, 0, 0, 0, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 0, 2, 2, 2, 2, 0, 6, 5, 5, 5, 1],
  [1, 0, 0, 0, 0, 0, 2, 7, 7, 2, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 1, 0, 3, 3, 0, 1, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 3, 3, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 3, 3, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 1, 0, 3, 3, 0, 1, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 2, 7, 7, 2, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 4, 6, 0, 2, 2, 2, 2, 0, 6, 5, 5, 5, 1],
  [1, 4, 4, 4, 6, 0, 0, 0, 0, 0, 0, 6, 5, 5, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map4_f1 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 7, 7, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 3, 3, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 2, 2, 0, 0, 0, 3, 3, 0, 0, 0, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 0, 0, 2, 0, 7, 7, 0, 2, 0, 0, 2, 0, 1],
  [1, 0, 2, 2, 2, 2, 0, 0, 0, 0, 2, 2, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const map5_f0 = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 6, 5, 5, 1],
  [1, 4, 4, 6, 2, 2, 2, 2, 2, 2, 2, 2, 6, 5, 5, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 2, 0, 1, 3, 3, 1, 0, 2, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 2, 2, 0, 1, 3, 3, 1, 0, 2, 2, 2, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 4, 4, 6, 2, 2, 2, 2, 2, 2, 2, 2, 6, 5, 5, 1],
  [1, 4, 4, 6, 0, 0, 0, 0, 0, 0, 0, 0, 6, 5, 5, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const MAPS = {
  1: { name: "🏙️ O Bairro (Neighborhood)", textureTheme: "brick", floors: [map1_f0], blueSpawn: { x: 2.5, y: 2.5 }, redSpawn: { x: 13.5, y: 13.5 } },
  2: { name: "🏢 A Empresa (Corporate Office - 2 Andares)", textureTheme: "office", floors: [map2_f0, map2_f1], blueSpawn: { x: 2.5, y: 2.5 }, redSpawn: { x: 13.5, y: 13.5 } },
  3: { name: "🎯 Arena Paintball", textureTheme: "paintball", floors: [map3_f0], blueSpawn: { x: 1.5, y: 1.5 }, redSpawn: { x: 14.5, y: 14.5 } },
  4: { name: "🏰 A Mansão (Mansion - 2 Andares)", textureTheme: "mansion", floors: [map4_f0, map4_f1], blueSpawn: { x: 2.5, y: 2.5 }, redSpawn: { x: 13.5, y: 13.5 } },
  5: { name: "✈️ O Super Avião (Huge Airplane)", textureTheme: "airplane", floors: [map5_f0], blueSpawn: { x: 1.5, y: 1.5 }, redSpawn: { x: 14.5, y: 14.5 } }
};

const CLASSES = {
  scout: {
    name: "Batedor", hp: 100, speed: 0.14,
    weapons: {
      1: { name: "Espingarda de Manteiga", clipSize: 6, maxReserve: 36, damage: 18, pellets: 5, rate: 600, reloadTime: 1800, projType: "shotgun", projSpeed: 0.5, icon: "🧈" },
      2: { name: "Pistola de Xarope", clipSize: 12, maxReserve: 48, damage: 22, rate: 220, reloadTime: 1200, projType: "bullet", projSpeed: 0.52, icon: "🔫" },
      3: { name: "Faca de Manteiga", clipSize: 0, maxReserve: 0, damage: 45, rate: 350, isMelee: true, icon: "🔪" }
    }
  },
  soldier: {
    name: "Soldado do Café", hp: 175, speed: 0.09,
    weapons: {
      1: { name: "Lança-Waffle", clipSize: 4, maxReserve: 20, damage: 85, rate: 800, reloadTime: 2200, projType: "waffle", projSpeed: 0.32, blastRadius: 1.6, icon: "🧇" },
      2: { name: "Escopeta Crocante", clipSize: 6, maxReserve: 32, damage: 16, pellets: 5, rate: 650, reloadTime: 1800, projType: "shotgun", projSpeed: 0.48, icon: "💥" },
      3: { name: "Pá de Panqueca", clipSize: 0, maxReserve: 0, damage: 65, rate: 500, isMelee: true, icon: "🥞" }
    }
  },
  pyro: {
    name: "Assador", hp: 150, speed: 0.10,
    weapons: {
      1: { name: "Lança-Xarope Fervente", clipSize: 100, maxReserve: 200, damage: 14, rate: 70, reloadTime: 2000, projType: "flame", projSpeed: 0.28, icon: "🔥" },
      2: { name: "Pistola Sinalizadora", clipSize: 1, maxReserve: 16, damage: 50, rate: 900, reloadTime: 1000, projType: "flare", projSpeed: 0.45, icon: "✨" },
      3: { name: "Machado de Torrada", clipSize: 0, maxReserve: 0, damage: 65, rate: 450, isMelee: true, icon: "🪓" }
    }
  },
  demoman: {
    name: "Demolidor de Panquecas", hp: 150, speed: 0.095,
    weapons: {
      1: { name: "Lança-Panqueca Sticky", clipSize: 4, maxReserve: 24, damage: 90, rate: 850, reloadTime: 2200, projType: "pancake_bomb", projSpeed: 0.3, blastRadius: 1.8, icon: "🥞" },
      2: { name: "Lança-Geleia Explosiva", clipSize: 6, maxReserve: 30, damage: 60, rate: 600, reloadTime: 1800, projType: "jelly_bomb", projSpeed: 0.35, blastRadius: 1.2, icon: "🍇" },
      3: { name: "Espada Baguete", clipSize: 0, maxReserve: 0, damage: 75, rate: 600, isMelee: true, icon: "🥖" }
    }
  },
  heavy: {
    name: "Padeiro Pesado", hp: 300, speed: 0.065,
    weapons: {
      1: { name: "Metralhadora de Milho", clipSize: 200, maxReserve: 300, damage: 22, rate: 90, reloadTime: 3000, projType: "corn", projSpeed: 0.45, icon: "🌽" },
      2: { name: "Sanduíche de Bacon", clipSize: 1, maxReserve: 3, damage: 0, rate: 2000, isHealSelf: true, healAmount: 100, icon: "🥪" },
      3: { name: "Punhos de Broa", clipSize: 0, maxReserve: 0, damage: 55, rate: 350, isMelee: true, icon: "👊" }
    }
  },
  engineer: {
    name: "Engenheiro do Grão", hp: 125, speed: 0.10,
    weapons: {
      1: { name: "Escopeta de Grão", clipSize: 6, maxReserve: 36, damage: 18, pellets: 5, rate: 550, reloadTime: 1800, projType: "shotgun", projSpeed: 0.45, icon: "☕" },
      2: { name: "Pistola de Leite", clipSize: 12, maxReserve: 48, damage: 22, rate: 220, reloadTime: 1200, projType: "bullet", projSpeed: 0.5, icon: "🥛" },
      3: { name: "Chave Inglesa de Biscoito", clipSize: 0, maxReserve: 0, damage: 50, rate: 400, isMelee: true, icon: "🔧" }
    }
  },
  medic: {
    name: "Barista Médico", hp: 125, speed: 0.11,
    weapons: {
      1: { name: "Arma de Leite Cura", clipSize: 40, maxReserve: 160, damage: 25, healAmount: 30, rate: 200, reloadTime: 1500, projType: "milk_heal", projSpeed: 0.42, isHeal: true, icon: "🥛" },
      2: { name: "Pistola de Seringa de Açúcar", clipSize: 30, maxReserve: 120, damage: 18, rate: 120, reloadTime: 1400, projType: "sugar", projSpeed: 0.48, icon: "💉" },
      3: { name: "Abridor de Garrafa", clipSize: 0, maxReserve: 0, damage: 45, rate: 400, isMelee: true, icon: "🍾" }
    }
  },
  sniper: {
    name: "Atirador Crocante", hp: 100, speed: 0.10,
    weapons: {
      1: { name: "Rifle Baguete (com Mira)", clipSize: 5, maxReserve: 25, damage: 120, rate: 1100, reloadTime: 2000, projType: "sniper_bullet", projSpeed: 0.7, hasScope: true, icon: "🥖" },
      2: { name: "SMG de Gergelim", clipSize: 25, maxReserve: 75, damage: 18, rate: 110, reloadTime: 1300, projType: "bullet", projSpeed: 0.5, icon: "🔫" },
      3: { name: "Faca de Pão", clipSize: 0, maxReserve: 0, damage: 50, rate: 350, isMelee: true, icon: "🔪" }
    }
  },
  spy: {
    name: "Espião de Geleia", hp: 125, speed: 0.11,
    weapons: {
      1: { name: "Revólver de Canela", clipSize: 6, maxReserve: 24, damage: 45, rate: 450, reloadTime: 1500, projType: "bullet", projSpeed: 0.55, icon: "🔫" },
      2: { name: "Relógio de Invisibilidade", clipSize: 1, maxReserve: 1, damage: 0, rate: 1000, isInvis: true, duration: 6000, icon: "🕰️" },
      3: { name: "Adaga de Geleia", clipSize: 0, maxReserve: 0, damage: 50, backstabDamage: 500, rate: 400, isMelee: true, icon: "🍇" }
    }
  }
};

const MINIGAMES = {
  1: "Roubo do Ovo Mexido (CTF)",
  2: "Batata Quente (Sizzling Hashbrown)",
  3: "Conquista de Áreas (Mesa de Café)",
  4: "Demolição da Base (Panqueca Bomba)"
};

const sessions = {};
const activeWsMap = new Map();
const activeEmailWsMap = new Map();
const activeTrades = {};

function createSession(name, mapId, minigameId) {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  sessions[code] = {
    code,
    name,
    mapId: mapId || 1,
    minigameId: minigameId || 1,
    map: MAPS[mapId || 1],
    players: {},
    projectiles: [],
    items: [
      { id: 'item_1', type: 'sausage', x: 4.5, y: 7.5, floor: 0, respawnTimer: 0 },
      { id: 'item_2', type: 'pancake', x: 11.5, y: 7.5, floor: 0, respawnTimer: 0 },
      { id: 'item_3', type: 'coffee', x: 8.5, y: 4.5, floor: 0, respawnTimer: 0 },
      { id: 'item_4', type: 'bacon', x: 8.5, y: 10.5, floor: 0, respawnTimer: 0 },
      { id: 'ammo_1', type: 'ammo_box', x: 6.5, y: 3.5, floor: 0, respawnTimer: 0 },
      { id: 'ammo_2', type: 'ammo_box', x: 9.5, y: 12.5, floor: 0, respawnTimer: 0 },
      { id: 'item_egg_blue', type: 'scrambled_egg_blue', x: 2.5, y: 2.5, floor: 0, homeX: 2.5, homeY: 2.5, carrierId: null },
      { id: 'item_egg_red', type: 'scrambled_egg_red', x: 13.5, y: 13.5, floor: 0, homeX: 13.5, homeY: 13.5, carrierId: null }
    ],
    scores: { blue: 0, red: 0 },
    setupTimer: 15,
    matchTimer: 300,
    setupPhase: true,
    hashbrownHolderId: null,
    hashbrownTimer: 15,
    controlOwner: null,
    bombState: { x: 8.5, y: 8.5, floor: 0, carrierId: null, planted: false, plantTeam: null, detonateTimer: 10 }
  };
  return sessions[code];
}

createSession("Sala Principal - Café Central", 1, 1);

function initAmmoForClass(classKey) {
  const c = CLASSES[classKey];
  if (!c) return { 1: { clip: 10, reserve: 30 }, 2: { clip: 10, reserve: 30 }, 3: { clip: 0, reserve: 0 } };
  return {
    1: { clip: c.weapons[1].clipSize, reserve: c.weapons[1].maxReserve },
    2: { clip: c.weapons[2].clipSize, reserve: c.weapons[2].maxReserve },
    3: { clip: 0, reserve: 0 }
  };
}

function broadcastToRoom(room, msgObj) {
  const jsonStr = JSON.stringify(msgObj);
  Object.values(room.players).forEach(p => {
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(jsonStr);
    }
  });
}

function finishMatchAndDistributeRewards(room) {
  const playersArr = Object.values(room.players);
  if (playersArr.length === 0) return;

  playersArr.forEach(p => {
    p.matchPerformanceScore = (p.kills * 15) + (p.assists * 8) + (p.captures * 50) + Math.floor(p.damageDealt / 20);
  });

  playersArr.sort((a, b) => b.matchPerformanceScore - a.matchPerformanceScore);

  const winningTeam = room.scores.blue > room.scores.red ? 'blue' : (room.scores.red > room.scores.blue ? 'red' : null);
  const users = loadUsers();

  const podiumResults = [];

  playersArr.forEach((p, idx) => {
    let earned = 0;
    const isWin = p.team === winningTeam;

    if (idx === 0) {
      earned = Math.min(200, 120 + (p.kills * 10) + (isWin ? 30 : 0));
    } else if (idx === 1) {
      earned = Math.min(150, 90 + (p.kills * 8) + (isWin ? 20 : 0));
    } else if (idx === 2) {
      earned = Math.min(120, 70 + (p.kills * 6) + (isWin ? 15 : 0));
    } else {
      earned = Math.min(75, 20 + (p.kills * 6) + (isWin ? 25 : 10));
    }

    podiumResults.push({
      rank: idx + 1,
      id: p.id,
      name: p.name,
      team: p.team,
      kills: p.kills,
      assists: p.assists,
      captures: p.captures,
      score: p.matchPerformanceScore,
      coinsEarned: earned
    });

    if (p.email && users[p.email]) {
      users[p.email].coins = (users[p.email].coins || 0) + earned;
      p.coinsEarned += earned;
    }
  });

  saveUsers(users);

  broadcastToRoom(room, {
    type: 'MATCH_FINISHED',
    podium: podiumResults,
    winningTeam
  });
}

// --- TICK GLOBAL DO SERVIDOR (1 segundo) ---
setInterval(() => {
  Object.values(sessions).forEach(room => {
    if (room.setupPhase) {
      if (room.setupTimer > 0) {
        room.setupTimer--;
      } else {
        room.setupPhase = false;
        broadcastToRoom(room, { type: 'ANNOUNCEMENT', text: '🚪 PORTÕES ABERTOS! AO ATAQUE!' });
      }
    } else {
      if (room.matchTimer > 0) {
        room.matchTimer--;
        if (room.matchTimer === 0) {
          finishMatchAndDistributeRewards(room);
        }
      }
    }

    room.items.forEach(item => {
      if (item.respawnTimer > 0) item.respawnTimer--;
    });

    Object.values(room.players).forEach(p => {
      if (p.isDead) {
        p.respawnTimer--;
        if (p.respawnTimer <= 0) {
          p.isDead = false;
          p.hp = p.maxHp;
          p.isReloading = false;
          p.isScoped = false;
          p.isInvis = false;
          p.disguiseTeam = null;
          p.floor = 0;
          p.ammo = initAmmoForClass(p.classKey);
          const spawn = p.team === 'blue' ? room.map.blueSpawn : room.map.redSpawn;
          p.x = spawn.x;
          p.y = spawn.y;
        }
      }
      if (p.lastHurtTimer > 0) p.lastHurtTimer--;
      if (p.emoteTimer > 0) p.emoteTimer--;
      if (p.stairCooldown > 0) p.stairCooldown--;
      if (p.invisTimer > 0) {
        p.invisTimer--;
        if (p.invisTimer <= 0) p.isInvis = false;
      }
      if (p.reloadTimer > 0) {
        p.reloadTimer--;
        if (p.reloadTimer <= 0) {
          p.isReloading = false;
          const w = CLASSES[p.classKey].weapons[p.activeSlot];
          if (w && w.clipSize > 0) {
            const currentClip = p.ammo[p.activeSlot].clip;
            const currentReserve = p.ammo[p.activeSlot].reserve;
            const needed = w.clipSize - currentClip;
            const taken = Math.min(needed, currentReserve);
            p.ammo[p.activeSlot].clip += taken;
            p.ammo[p.activeSlot].reserve -= taken;
          }
        }
      }

      if (p.jumpZ > 0 || p.jumpVel !== 0) {
        p.jumpZ += p.jumpVel;
        p.jumpVel -= 0.025;
        if (p.jumpZ <= 0) {
          p.jumpZ = 0;
          p.jumpVel = 0;
          p.isJumping = false;
        }
      }
    });

    // MINIGAME 2: Batata Quente
    if (room.minigameId === 2 && !room.setupPhase) {
      const livingPlayers = Object.values(room.players).filter(p => !p.isDead);
      if (livingPlayers.length > 0) {
        if (!room.hashbrownHolderId || !room.players[room.hashbrownHolderId] || room.players[room.hashbrownHolderId].isDead) {
          const randP = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
          room.hashbrownHolderId = randP.id;
          room.hashbrownTimer = 15;
          broadcastToRoom(room, { type: 'ANNOUNCEMENT', text: `🥔 BATATA QUENTE COM ${randP.name.toUpperCase()}!` });
        } else {
          room.hashbrownTimer--;
          if (room.hashbrownTimer <= 0) {
            const victim = room.players[room.hashbrownHolderId];
            if (victim) {
              victim.hp = 0;
              victim.isDead = true;
              victim.respawnTimer = 10;
              const enemyTeam = victim.team === 'blue' ? 'red' : 'blue';
              room.scores[enemyTeam] += 50;
              broadcastToRoom(room, { type: 'ANNOUNCEMENT', text: `💥 A BATATA QUENTE EXPLODIU EM ${victim.name.toUpperCase()}!` });
            }
            room.hashbrownHolderId = null;
          }
        }
      }
    }
  });
}, 1000);

wss.on('connection', (ws) => {
  let playerId = Math.random().toString(36).substring(2, 9);
  let currentRoom = null;

  // Enviar catálogo e caixas ativas imediatamente na conexão
  ws.send(JSON.stringify({
    type: 'INITIAL_DATA',
    catalog: ITEMS_CATALOG,
    crates: getActiveCrates()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'GET_INITIAL_DATA') {
        ws.send(JSON.stringify({
          type: 'INITIAL_DATA',
          catalog: ITEMS_CATALOG,
          crates: getActiveCrates()
        }));
        return;
      }

      // --- TRATAMENTO DE PING / PONG (MEDIDA DE LATÊNCIA / PING) ---
      if (data.type === 'PING') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'PONG', ts: data.ts }));
        }
        return;
      }

      // --- AUTENTICAÇÃO: REGISTRO & LOGIN COM PERSISTÊNCIA ---
      if (data.type === 'REGISTER') {
        const email = (data.email || '').toLowerCase().trim();
        const password = data.password || '';
        const name = data.name || 'Guerreiro';

        if (!email || !password || email.length < 5) {
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Email e senha inválidos!' }));
          return;
        }

        const users = loadUsers();
        if (users[email]) {
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Este email já está cadastrado!' }));
          return;
        }

        users[email] = {
          email,
          password,
          name,
          coins: 0,
          inventory: [
            { id: 'hat_1', category: 'hat', name: 'Boné Padrão', rarity: 'comum' },
            { id: 'shirt_1', category: 'shirt', name: 'Camisa Padrão', rarity: 'comum' },
            { id: 'pants_1', category: 'pants', name: 'Calça Jeans', rarity: 'comum' },
            { id: 'weapon_skin_1', category: 'weapon_skin', name: 'Aço Padrão', rarity: 'comum' }
          ],
          equipped: { hat: 'none', shirt: 'none', pants: 'none', weapon_skin: 'default', death_scream: 'default' },
          friends: [],
          friendRequests: []
        };

        saveUsers(users);

        activeWsMap.set(ws, email);
        activeEmailWsMap.set(email, ws);

        ws.send(JSON.stringify({
          type: 'AUTH_SUCCESS',
          email,
          name,
          coins: 0,
          inventory: users[email].inventory,
          equipped: users[email].equipped,
          friends: users[email].friends,
          friendRequests: users[email].friendRequests,
          catalog: ITEMS_CATALOG,
          crates: getActiveCrates()
        }));
      }

      if (data.type === 'LOGIN') {
        const email = (data.email || '').toLowerCase().trim();
        const password = data.password || '';

        const users = loadUsers();
        if (!users[email] || users[email].password !== password) {
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Email ou senha incorretos!' }));
          return;
        }

        activeWsMap.set(ws, email);
        activeEmailWsMap.set(email, ws);

        const u = users[email];
        ws.send(JSON.stringify({
          type: 'AUTH_SUCCESS',
          email: u.email,
          name: u.name,
          coins: u.coins || 0,
          inventory: u.inventory || [],
          equipped: u.equipped || {},
          friends: u.friends || [],
          friendRequests: u.friendRequests || [],
          catalog: ITEMS_CATALOG,
          crates: getActiveCrates()
        }));
      }

      // --- AMIGOS E TROCAS ---
      if (data.type === 'SEND_FRIEND_REQUEST') {
        const senderEmail = activeWsMap.get(ws);
        const targetEmail = (data.targetEmail || '').toLowerCase().trim();

        if (!senderEmail) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Faça login para adicionar amigos!' }));
          return;
        }

        if (senderEmail === targetEmail) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Você não pode adicionar seu próprio email!' }));
          return;
        }

        const users = loadUsers();
        if (!users[targetEmail]) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Nenhum jogador encontrado com este email!' }));
          return;
        }

        const senderProfile = users[senderEmail];
        const targetProfile = users[targetEmail];

        if (senderProfile.friends && senderProfile.friends.includes(targetEmail)) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Vocês já são amigos!' }));
          return;
        }

        if (!targetProfile.friendRequests) targetProfile.friendRequests = [];
        if (!targetProfile.friendRequests.includes(senderEmail)) {
          targetProfile.friendRequests.push(senderEmail);
          saveUsers(users);
        }

        ws.send(JSON.stringify({ type: 'ANNOUNCEMENT', text: `📩 SOLICITAÇÃO ENVIADA PARA ${targetEmail}` }));

        const targetWs = activeEmailWsMap.get(targetEmail);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: 'FRIEND_REQUEST_RECEIVED',
            fromEmail: senderEmail,
            requests: targetProfile.friendRequests
          }));
        }
      }

      if (data.type === 'ACCEPT_FRIEND_REQUEST') {
        const userEmail = activeWsMap.get(ws);
        const fromEmail = (data.fromEmail || '').toLowerCase().trim();

        if (!userEmail) return;

        const users = loadUsers();
        const u = users[userEmail];
        const sender = users[fromEmail];

        if (u && sender) {
          if (!u.friends) u.friends = [];
          if (!sender.friends) sender.friends = [];

          if (!u.friends.includes(fromEmail)) u.friends.push(fromEmail);
          if (!sender.friends.includes(userEmail)) sender.friends.push(userEmail);

          u.friendRequests = (u.friendRequests || []).filter(e => e !== fromEmail);

          saveUsers(users);

          ws.send(JSON.stringify({ type: 'FRIENDS_UPDATED', friends: u.friends, friendRequests: u.friendRequests }));

          const senderWs = activeEmailWsMap.get(fromEmail);
          if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({ type: 'FRIENDS_UPDATED', friends: sender.friends, friendRequests: sender.friendRequests }));
          }
        }
      }

      if (data.type === 'PROPOSE_TRADE') {
        const senderEmail = activeWsMap.get(ws);
        const targetEmail = (data.targetEmail || '').toLowerCase().trim();

        if (!senderEmail) return;

        const targetWs = activeEmailWsMap.get(targetEmail);
        if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Este amigo não está online no momento!' }));
          return;
        }

        const tradeId = `trade_${Math.random().toString(36).substring(2, 8)}`;
        activeTrades[tradeId] = {
          tradeId,
          userA: senderEmail,
          userB: targetEmail,
          offerA: { items: [], coins: 0, accepted: false },
          offerB: { items: [], coins: 0, accepted: false }
        };

        targetWs.send(JSON.stringify({
          type: 'TRADE_OFFER_RECEIVED',
          tradeId,
          fromEmail: senderEmail
        }));

        ws.send(JSON.stringify({
          type: 'TRADE_STARTED',
          tradeId,
          partnerEmail: targetEmail
        }));
      }

      if (data.type === 'CONFIRM_TRADE') {
        const senderEmail = activeWsMap.get(ws);
        const { tradeId, offeredItems, offeredCoins } = data;

        const trade = activeTrades[tradeId];
        if (!trade) return;

        const users = loadUsers();
        const senderProfile = users[senderEmail];

        if (senderEmail === trade.userA) {
          trade.offerA.items = offeredItems || [];
          trade.offerA.coins = Math.min(senderProfile.coins || 0, Math.max(0, parseInt(offeredCoins) || 0));
          trade.offerA.accepted = true;
        } else if (senderEmail === trade.userB) {
          trade.offerB.items = offeredItems || [];
          trade.offerB.coins = Math.min(senderProfile.coins || 0, Math.max(0, parseInt(offeredCoins) || 0));
          trade.offerB.accepted = true;
        }

        if (trade.offerA.accepted && trade.offerB.accepted) {
          const userAProfile = users[trade.userA];
          const userBProfile = users[trade.userB];

          if (userAProfile && userBProfile) {
            userAProfile.coins = (userAProfile.coins - trade.offerA.coins) + trade.offerB.coins;
            userBProfile.coins = (userBProfile.coins - trade.offerB.coins) + trade.offerA.coins;

            trade.offerA.items.forEach(item => {
              const idx = userAProfile.inventory.findIndex(i => i.id === item.id);
              if (idx !== -1) {
                const [moved] = userAProfile.inventory.splice(idx, 1);
                userBProfile.inventory.push(moved);
              }
            });

            trade.offerB.items.forEach(item => {
              const idx = userBProfile.inventory.findIndex(i => i.id === item.id);
              if (idx !== -1) {
                const [moved] = userBProfile.inventory.splice(idx, 1);
                userAProfile.inventory.push(moved);
              }
            });

            saveUsers(users);

            const wsA = activeEmailWsMap.get(trade.userA);
            const wsB = activeEmailWsMap.get(trade.userB);

            if (wsA && wsA.readyState === WebSocket.OPEN) {
              wsA.send(JSON.stringify({ type: 'PROFILE_UPDATED', coins: userAProfile.coins, inventory: userAProfile.inventory }));
              wsA.send(JSON.stringify({ type: 'ANNOUNCEMENT', text: '🤝 TROCA REALIZADA COM SUCESSO!' }));
            }
            if (wsB && wsB.readyState === WebSocket.OPEN) {
              wsB.send(JSON.stringify({ type: 'PROFILE_UPDATED', coins: userBProfile.coins, inventory: userBProfile.inventory }));
              wsB.send(JSON.stringify({ type: 'ANNOUNCEMENT', text: '🤝 TROCA REALIZADA COM SUCESSO!' }));
            }

            delete activeTrades[tradeId];
          }
        }
      }

      if (data.type === 'BUY_ITEM') {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Os itens não podem ser comprados diretamente! Abra caixas na loja para obter novas skins.' }));
        return;
      }

      if (data.type === 'OPEN_CRATE') {
        const email = activeWsMap.get(ws);
        const crateId = data.crateId;
        const crate = CRATES.find(c => c.id === crateId);

        if (!crate) return;

        const users = loadUsers();
        let userCoins = email && users[email] ? users[email].coins : 0;

        if (userCoins < crate.cost) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Moedas insuficientes para abrir esta caixa!' }));
          return;
        }

        let pool = [];
        if (crate.category === 'all') {
          CATEGORIES.forEach(cat => pool.push(...ITEMS_CATALOG[cat]));
        } else {
          pool = ITEMS_CATALOG[crate.category] || [];
        }

        if (crate.seasonal) {
          const seasonalPool = pool.filter(i => i.seasonalCrate === crate.id);
          if (seasonalPool.length > 0) pool = seasonalPool;
        } else {
          const regularPool = pool.filter(i => !i.seasonal);
          if (regularPool.length > 0) pool = regularPool;
        }

        const randVal = Math.random() * 100;
        let selectedRarity = 'comum';
        if (randVal < 1) selectedRarity = 'mistico';
        else if (randVal < 7) selectedRarity = 'lendario';
        else if (randVal < 20) selectedRarity = 'epico';
        else if (randVal < 50) selectedRarity = 'raro';

        const rarityPool = pool.filter(i => i.rarity === selectedRarity);
        const finalPool = rarityPool.length > 0 ? rarityPool : pool;
        const wonItem = finalPool[Math.floor(Math.random() * finalPool.length)];

        if (email && users[email]) {
          users[email].coins -= crate.cost;
          users[email].inventory.push(wonItem);
          saveUsers(users);
        }

        ws.send(JSON.stringify({
          type: 'CRATE_RESULT',
          wonItem,
          newCoins: email && users[email] ? users[email].coins : Math.max(0, userCoins - crate.cost)
        }));
      }

      if (data.type === 'EQUIP_ITEM') {
        const email = activeWsMap.get(ws);
        if (email) {
          const users = loadUsers();
          if (users[email]) {
            if (!users[email].equipped) users[email].equipped = {};
            users[email].equipped[data.slot] = data.itemId;
            saveUsers(users);
          }
        }
      }

      if (data.type === 'JOIN_SESSION') {
        const room = sessions[data.code];
        if (!room) return;

        const blueCount = Object.values(room.players).filter(p => p.team === 'blue').length;
        const redCount = Object.values(room.players).filter(p => p.team === 'red').length;

        const chosenTeam = data.team === 'red' ? 'red' : 'blue';
        if (chosenTeam === 'blue' && blueCount >= 5) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'O Time Azul está cheio! (Máx. 5 jogadores)' }));
          return;
        }
        if (chosenTeam === 'red' && redCount >= 5) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'O Time Vermelho está cheio! (Máx. 5 jogadores)' }));
          return;
        }

        currentRoom = room;
        const classKey = data.classKey && CLASSES[data.classKey] ? data.classKey : 'scout';
        const classObj = CLASSES[classKey];
        const spawn = chosenTeam === 'blue' ? room.map.blueSpawn : room.map.redSpawn;

        const email = activeWsMap.get(ws);

        room.players[playerId] = {
          id: playerId,
          ws,
          email: email || null,
          name: data.playerName || `Guerreiro_${playerId.substring(0, 4)}`,
          team: chosenTeam,
          classKey,
          hp: classObj.hp,
          maxHp: classObj.hp,
          speed: classObj.speed,
          x: spawn.x,
          y: spawn.y,
          floor: 0,
          angle: 0,
          activeSlot: 1,
          ammo: initAmmoForClass(classKey),
          characterSkin: data.characterSkin || 'default',
          weaponSkin: data.weaponSkin || 'default',
          hat: data.hat || 'none',
          kills: 0,
          assists: 0,
          captures: 0,
          damageDealt: 0,
          coinsEarned: 0,
          isReloading: false,
          reloadTimer: 0,
          isScoped: false,
          isInvis: false,
          invisTimer: 0,
          disguiseTeam: null,
          lastShoot: 0,
          isMoving: false,
          isRunning: false,
          isCrouching: false,
          isJumping: false,
          jumpZ: 0,
          jumpVel: 0,
          hasEgg: false,
          isDead: false,
          respawnTimer: 0,
          lastHurtTimer: 0,
          stairCooldown: 0,
          emote: null,
          emoteTimer: 0
        };

        ws.send(JSON.stringify({
          type: 'JOINED',
          playerId,
          code: room.code,
          map: room.map,
          team: chosenTeam,
          minigameId: room.minigameId
        }));
      }

      if (data.type === 'PLAYER_MOVE' && currentRoom && currentRoom.players[playerId]) {
        const p = currentRoom.players[playerId];
        if (p.isDead) return;

        p.isRunning = !!data.isRunning;
        p.isCrouching = !!data.isCrouching;

        let moveSpeed = p.speed;
        if (p.isRunning) moveSpeed *= 1.45;
        if (p.isCrouching) moveSpeed *= 0.55;

        if (data.isJumping && p.jumpZ === 0) {
          p.isJumping = true;
          p.jumpZ = 0.1;
          p.jumpVel = 0.12;
        }

        const dx = data.dx * moveSpeed;
        const dy = data.dy * moveSpeed;

        const currentGrid = currentRoom.map.floors[p.floor] || currentRoom.map.floors[0];
        const pRadius = 0.35;

        p.isMoving = (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001);

        const checkWall = (nx, ny) => {
          const gx = Math.floor(nx);
          const gy = Math.floor(ny);
          if (gx < 0 || gx >= 16 || gy < 0 || gy >= 16) return true;
          const tile = currentGrid[gy][gx];
          if (tile === 1 || tile === 2) return true;
          if (currentRoom.setupPhase && tile === 6) return true;
          return false;
        };

        const steps = 8;
        const stepDx = dx / steps;
        const stepDy = dy / steps;

        for (let s = 0; s < steps; s++) {
          const nextX = p.x + stepDx;
          if (!checkWall(nextX + Math.sign(stepDx) * pRadius, p.y)) {
            p.x = nextX;
          }
          const nextY = p.y + stepDy;
          if (!checkWall(p.x, nextY + Math.sign(stepDy) * pRadius)) {
            p.y = nextY;
          }
        }

        p.angle = data.angle;

        const currentTile = currentGrid[Math.floor(p.y)] ? currentGrid[Math.floor(p.y)][Math.floor(p.x)] : 0;
        if (currentTile === 7 && p.stairCooldown <= 0 && currentRoom.map.floors.length > 1) {
          p.floor = p.floor === 0 ? 1 : 0;
          p.stairCooldown = 25;
          ws.send(JSON.stringify({ type: 'ANNOUNCEMENT', text: `📶 VOCÊ MUDOU PARA O ${p.floor + 1}º ANDAR!` }));
        }

        // Itens
        currentRoom.items.forEach(item => {
          if (item.floor !== p.floor) return;
          if (item.respawnTimer && item.respawnTimer > 0) return;

          if (item.type === 'ammo_box' && Math.hypot(p.x - item.x, p.y - item.y) < 0.65) {
            const c = CLASSES[p.classKey];
            if (c) {
              p.ammo[1].reserve = c.weapons[1].maxReserve;
              p.ammo[2].reserve = c.weapons[2].maxReserve;
              item.respawnTimer = 12;
              ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'ammo' }));
            }
          } else if (item.type.includes('egg')) {
            if (item.carrierId === p.id) {
              item.x = p.x;
              item.y = p.y;
              item.floor = p.floor;
            } else if (!item.carrierId && Math.hypot(p.x - item.x, p.y - item.y) < 0.65) {
              if (item.type === 'scrambled_egg_red' && p.team === 'blue') {
                item.carrierId = p.id;
                p.hasEgg = true;
                p.captures++;
                broadcastToRoom(currentRoom, { type: 'ANNOUNCEMENT', text: `🍳 ${p.name.toUpperCase()} ROUBOU O OVO VERMELHO!` });
              }
              if (item.type === 'scrambled_egg_blue' && p.team === 'red') {
                item.carrierId = p.id;
                p.hasEgg = true;
                p.captures++;
                broadcastToRoom(currentRoom, { type: 'ANNOUNCEMENT', text: `🍳 ${p.name.toUpperCase()} ROUBOU O OVO AZUL!` });
              }
            }
          } else {
            if (Math.hypot(p.x - item.x, p.y - item.y) < 0.65) {
              if (item.type === 'sausage') { p.hp = Math.min(p.maxHp, p.hp + 35); item.respawnTimer = 10; ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'pickup' })); }
              if (item.type === 'pancake') { p.hp = Math.min(p.maxHp + 50, p.hp + 50); item.respawnTimer = 10; ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'pickup' })); }
              if (item.type === 'coffee') { p.speed = CLASSES[p.classKey].speed * 1.3; item.respawnTimer = 10; ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'pickup' })); setTimeout(() => p.speed = CLASSES[p.classKey].speed, 8000); }
              if (item.type === 'bacon') { p.hp = Math.min(p.maxHp, p.hp + 25); item.respawnTimer = 10; ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'pickup' })); }
            }
          }
        });

        // Entregar Ovo
        if (p.hasEgg) {
          const eggItem = currentRoom.items.find(i => i.carrierId === p.id);
          if (p.team === 'blue' && Math.hypot(p.x - currentRoom.map.blueSpawn.x, p.y - currentRoom.map.blueSpawn.y) < 1.3) {
            currentRoom.scores.blue += 100;
            p.captures++;
            p.hasEgg = false;
            if (eggItem) { eggItem.carrierId = null; eggItem.x = eggItem.homeX; eggItem.y = eggItem.homeY; eggItem.floor = 0; }
            broadcastToRoom(currentRoom, { type: 'ANNOUNCEMENT', text: `🏆 TIME AZUL ENTREGOU O OVO MEXIDO! (+100 PTS)` });
          }
          if (p.team === 'red' && Math.hypot(p.x - currentRoom.map.redSpawn.x, p.y - currentRoom.map.redSpawn.y) < 1.3) {
            currentRoom.scores.red += 100;
            p.captures++;
            p.hasEgg = false;
            if (eggItem) { eggItem.carrierId = null; eggItem.x = eggItem.homeX; eggItem.y = eggItem.homeY; eggItem.floor = 0; }
            broadcastToRoom(currentRoom, { type: 'ANNOUNCEMENT', text: `🏆 TIME VERMELHO ENTREGOU O OVO MEXIDO! (+100 PTS)` });
          }
        }
      }

      // SHOOT
      if (data.type === 'SHOOT' && currentRoom && currentRoom.players[playerId]) {
        const p = currentRoom.players[playerId];
        if (p.isDead || p.isReloading) return;

        const now = Date.now();
        const w = CLASSES[p.classKey].weapons[p.activeSlot];
        if (!w) return;

        if (currentRoom.minigameId === 2 && !w.isMelee) {
          p.activeSlot = 3;
          return;
        }

        if (now - p.lastShoot >= w.rate) {
          p.lastShoot = now;

          if (w.isMelee) {
            Object.values(currentRoom.players).forEach(other => {
              if (!other.isDead && other.id !== p.id && other.floor === p.floor && other.team !== p.team) {
                const dist = Math.hypot(other.x - p.x, other.y - p.y);
                if (dist < 0.95) {
                  let finalDmg = w.damage;
                  if (p.classKey === 'spy' && w.backstabDamage) {
                    const angleDiff = Math.abs(p.angle - other.angle);
                    if (angleDiff < 0.8 || angleDiff > 5.4) {
                      finalDmg = w.backstabDamage;
                      broadcastToRoom(currentRoom, { type: 'ANNOUNCEMENT', text: `🔪 BACKSTAB CRÍTICO DE ${p.name.toUpperCase()}!` });
                    }
                  }

                  other.hp -= finalDmg;
                  p.damageDealt += finalDmg;
                  other.lastHurtTimer = 5;
                  ws.send(JSON.stringify({ type: 'HIT_CONFIRM' }));

                  if (other.hp <= 0) {
                    other.isDead = true;
                    other.respawnTimer = 10;
                    p.kills++;
                    currentRoom.scores[p.team] += 10;
                  }
                }
              }
            });
            return;
          }

          if (w.isHealSelf) {
            if (p.ammo[p.activeSlot].reserve > 0 || p.ammo[p.activeSlot].clip > 0) {
              p.hp = Math.min(p.maxHp, p.hp + w.healAmount);
              p.ammo[p.activeSlot].reserve = Math.max(0, p.ammo[p.activeSlot].reserve - 1);
              ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'pickup' }));
            }
            return;
          }

          if (w.isInvis) {
            p.isInvis = true;
            p.invisTimer = 6;
            ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'scope' }));
            return;
          }

          if (p.ammo[p.activeSlot].clip <= 0) {
            if (p.ammo[p.activeSlot].reserve > 0) {
              p.isReloading = true;
              p.reloadTimer = Math.ceil(w.reloadTime / 1000);
              ws.send(JSON.stringify({ type: 'AUDIO_EVENT', sound: 'reload' }));
            }
            return;
          }

          p.ammo[p.activeSlot].clip--;

          if (w.projType === 'shotgun') {
            const numPellets = w.pellets || 5;
            for (let i = 0; i < numPellets; i++) {
              const spreadAngle = p.angle + (Math.random() - 0.5) * 0.25;
              currentRoom.projectiles.push({
                id: Math.random().toString(36).substring(2, 7),
                ownerId: playerId,
                team: p.team,
                floor: p.floor,
                damage: w.damage,
                projType: w.projType,
                x: p.x,
                y: p.y,
                vx: Math.cos(spreadAngle) * w.projSpeed,
                vy: Math.sin(spreadAngle) * w.projSpeed,
                life: 30
              });
            }
          } else {
            currentRoom.projectiles.push({
              id: Math.random().toString(36).substring(2, 7),
              ownerId: playerId,
              team: p.team,
              floor: p.floor,
              damage: w.damage,
              projType: w.projType,
              x: p.x,
              y: p.y,
              vx: Math.cos(p.angle) * w.projSpeed,
              vy: Math.sin(p.angle) * w.projSpeed,
              life: 40
            });
          }
        }
      }
    } catch (e) { console.error(e); }
  });

  ws.on('close', () => {
    const email = activeWsMap.get(ws);
    if (email) {
      activeWsMap.delete(ws);
      activeEmailWsMap.delete(email);
    }
    if (currentRoom && currentRoom.players[playerId]) {
      delete currentRoom.players[playerId];
    }
  });
});

// Loop principal de projéteis e estado (20 FPS) - OTIMIZADO PARA SERVIDOR E REDE SEM LAG
setInterval(() => {
  Object.values(sessions).forEach(room => {
    room.projectiles.forEach(proj => {
      const steps = 6;
      const stepVx = proj.vx / steps;
      const stepVy = proj.vy / steps;
      const currentGrid = room.map.floors[proj.floor] || room.map.floors[0];

      for (let s = 0; s < steps; s++) {
        proj.x += stepVx;
        proj.y += stepVy;

        const gridX = Math.floor(proj.x);
        const gridY = Math.floor(proj.y);

        if (gridX < 0 || gridX >= 16 || gridY < 0 || gridY >= 16) {
          proj.life = 0;
          break;
        }

        const tile = currentGrid[gridY][gridX];
        if (tile === 1 || tile === 2 || (room.setupPhase && tile === 6)) {
          proj.life = 0;
          break;
        }
      }

      proj.life--;

      if (proj.life <= 0) return;

      Object.values(room.players).forEach(p => {
        if (!p.isDead && p.id !== proj.ownerId && p.floor === proj.floor) {
          const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
          if (dist < 0.55) {
            if (p.team !== proj.team) {
              p.hp -= proj.damage;
              p.lastHurtTimer = 5;
              p.isInvis = false;
              proj.life = 0;

              const shooter = room.players[proj.ownerId];
              if (shooter) {
                shooter.damageDealt += proj.damage;
                if (shooter.ws && shooter.ws.readyState === WebSocket.OPEN) {
                  shooter.ws.send(JSON.stringify({ type: 'HIT_CONFIRM' }));
                }
              }

              if (p.hp <= 0) {
                p.isDead = true;
                p.respawnTimer = 10;
                if (shooter) {
                  shooter.kills++;
                  currentRoom.scores[proj.team] += 10;
                }
              }
            } else if (proj.projType === 'milk_heal') {
              p.hp = Math.min(p.maxHp, p.hp + 30);
              proj.life = 0;
            }
          }
        }
      });
    });

    room.projectiles = room.projectiles.filter(p => p.life > 0);

    const sanitizedPlayers = {};
    Object.values(room.players).forEach(p => {
      const activeW = CLASSES[p.classKey].weapons[p.activeSlot] || {};
      sanitizedPlayers[p.id] = {
        id: p.id,
        name: p.name,
        team: p.team,
        classKey: p.classKey,
        hp: p.hp,
        maxHp: p.maxHp,
        x: round2(p.x),
        y: round2(p.y),
        floor: p.floor,
        angle: round2(p.angle),
        activeSlot: p.activeSlot,
        activeWeaponName: activeW.name || 'Arma',
        activeWeaponIcon: activeW.icon || '🔪',
        ammoClip: p.ammo && p.ammo[p.activeSlot] ? p.ammo[p.activeSlot].clip : 0,
        ammoReserve: p.ammo && p.ammo[p.activeSlot] ? p.ammo[p.activeSlot].reserve : 0,
        characterSkin: p.characterSkin,
        weaponSkin: p.weaponSkin,
        hat: p.hat,
        kills: p.kills,
        assists: p.assists,
        captures: p.captures,
        coinsEarned: p.coinsEarned,
        isReloading: p.isReloading,
        isScoped: p.isScoped,
        isInvis: p.isInvis,
        disguiseTeam: p.disguiseTeam,
        isShooting: (Date.now() - p.lastShoot < 250),
        isMoving: p.isMoving,
        isRunning: p.isRunning,
        isCrouching: p.isCrouching,
        isJumping: p.isJumping,
        jumpZ: round2(p.jumpZ),
        hasEgg: p.hasEgg,
        isDead: p.isDead,
        respawnTimer: p.respawnTimer,
        emote: p.emoteTimer > 0 ? p.emote : null
      };
    });

    const activeItems = room.items.filter(i => !i.respawnTimer || i.respawnTimer <= 0).map(i => ({
      ...i,
      x: round2(i.x),
      y: round2(i.y)
    }));

    const sanitizedProjectiles = room.projectiles.map(pr => ({
      id: pr.id,
      team: pr.team,
      floor: pr.floor,
      projType: pr.projType,
      x: round2(pr.x),
      y: round2(pr.y)
    }));

    const state = {
      type: 'TICK',
      players: sanitizedPlayers,
      projectiles: sanitizedProjectiles,
      items: activeItems,
      scores: room.scores,
      setupPhase: room.setupPhase,
      setupTimer: room.setupTimer,
      matchTimer: room.matchTimer,
      hashbrownHolderId: room.hashbrownHolderId,
      hashbrownTimer: room.hashbrownTimer,
      controlOwner: room.controlOwner,
      bombState: {
        ...room.bombState,
        x: round2(room.bombState.x),
        y: round2(room.bombState.y)
      }
    };

    // CRUCIAL ANTI-LAG: Transmitir apenas para jogadores que estão DENTRO desta sala específica!
    const stateStr = JSON.stringify(state);
    Object.values(room.players).forEach(p => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(stateStr);
      }
    });
  });
}, 50);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🍳 Servidor Scrambled Egg Showdown 3.5 (Sistemas Anti-Lag & Otimizado) rodando em http://localhost:${PORT}`);
});
