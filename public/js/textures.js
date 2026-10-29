// Gerador de Texturas Procedurais e Sprites 2D Opacos Humano-Proporcionais com Rosto Único por Classe (Estilo DOOM 2.5D)
class TextureGenerator {
  constructor() {
    this.textures = {};
    this.sprites = {};
    this.init();
  }

  init() {
    // 1. Textura do Céu Claro (Skybox com Nuvens)
    this.textures.sky = this.createSkyTexture();

    // 2. Texturas de Parede e Carpetes de Base (64x64)
    this.textures.brick = this.createBrickTexture();
    this.textures.office = this.createOfficeTexture();
    this.textures.paintball = this.createPaintballTexture();
    this.textures.mansion = this.createMansionTexture();
    this.textures.airplane = this.createAirplaneTexture();
    this.textures.spawn_blue = this.createCarpetTexture('#0066ff', '#002266');
    this.textures.spawn_red = this.createCarpetTexture('#ff2200', '#660000');
    this.textures.gate_blue = this.createGateTexture('#00ccff');
    this.textures.gate_red = this.createGateTexture('#ff4400');

    // 3. Sprites de Jogadores com Proporções Humanas e Rostos Marcantes para cada Classe
    const classes = ['scout','soldier','pyro','demoman','heavy','engineer','medic','sniper','spy'];
    const teams = [{ key: 'blue', color: '#0077ff' }, { key: 'red', color: '#ff3300' }];
    const dirs = ['front', 'back', 'side_left', 'side_right'];
    const skins = ['default', 'gold', 'cyber', 'camo'];

    classes.forEach(cls => {
      teams.forEach(team => {
        dirs.forEach(dir => {
          [0, 1].forEach(walkFrame => {
            [0, 1].forEach(isShooting => {
              skins.forEach(skin => {
                const key = `player_${team.key}_${cls}_${dir}_${walkFrame}_${isShooting}_${skin}`;
                this.sprites[key] = this.createDirectionalPlayerSprite(cls, team.color, dir, walkFrame, isShooting, skin);
              });
            });
          });
        });
      });
    });

    // 4. Sprites de Construções do Engenheiro
    this.sprites.sentry_blue = this.createSentrySprite('#0077ff');
    this.sprites.sentry_red = this.createSentrySprite('#ff3300');
    this.sprites.dispenser_blue = this.createDispenserSprite('#0077ff');
    this.sprites.dispenser_red = this.createDispenserSprite('#ff3300');

    // 5. Sprites de Projétil
    this.sprites.proj_waffle = this.createProjectileSprite('waffle', '#ffaa00');
    this.sprites.proj_flame = this.createProjectileSprite('flame', '#ff6600');
    this.sprites.proj_milk = this.createProjectileSprite('milk', '#ffffff');
    this.sprites.proj_coffee = this.createProjectileSprite('coffee', '#663300');
    this.sprites.proj_sticky = this.createProjectileSprite('sticky', '#e67e22');
    this.sprites.proj_bullet = this.createProjectileSprite('bullet', '#ffcc00');

    // 6. Sprites de Itens de Chão e Caixas de Munição
    this.sprites.item_sausage = this.createItemSprite('sausage', '#cc3300');
    this.sprites.item_pancake = this.createItemSprite('pancake', '#ffaa00');
    this.sprites.item_coffee = this.createItemSprite('coffee', '#663300');
    this.sprites.item_bacon = this.createItemSprite('bacon', '#d92626');
    this.sprites.item_ammo_box = this.createItemSprite('ammo_box', '#2e7d32');
    this.sprites.item_egg_blue = this.createItemSprite('egg_blue', '#0088ff');
    this.sprites.item_egg_red = this.createItemSprite('egg_red', '#ff2200');
    this.sprites.item_hashbrown = this.createItemSprite('hashbrown', '#e68a00');
    this.sprites.item_bomb = this.createItemSprite('bomb', '#222222');
  }

  createCanvas(w = 64, h = 64) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return { c, ctx: c.getContext('2d') };
  }

  // --- CÉU CLARO (SKYBOX) ---
  createSkyTexture() {
    const { c, ctx } = this.createCanvas(800, 225);
    const grad = ctx.createLinearGradient(0, 0, 0, 225);
    grad.addColorStop(0, '#3a88e9');
    grad.addColorStop(0.7, '#7ec0ee');
    grad.addColorStop(1, '#cbe5f8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 225);

    // Nuvens Fofas
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    const clouds = [
      {x: 100, y: 60, r: 30}, {x: 130, y: 50, r: 40}, {x: 170, y: 60, r: 32},
      {x: 350, y: 80, r: 35}, {x: 390, y: 70, r: 45}, {x: 430, y: 80, r: 30},
      {x: 620, y: 50, r: 28}, {x: 650, y: 40, r: 38}, {x: 690, y: 50, r: 32}
    ];
    clouds.forEach(cl => {
      ctx.beginPath(); ctx.arc(cl.x, cl.y, cl.r, 0, Math.PI * 2); ctx.fill();
    });
    return c;
  }

  // --- CARPETES DE BASE ---
  createCarpetTexture(mainColor, darkColor) {
    const { c, ctx } = this.createCanvas(64, 64);
    ctx.fillStyle = mainColor; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = darkColor;
    for (let i = 0; i < 64; i += 8) {
      ctx.fillRect(i, 0, 2, 64);
      ctx.fillRect(0, i, 64, 2);
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = mainColor;
    ctx.beginPath(); ctx.arc(32, 32, 8, 0, Math.PI * 2); ctx.fill();
    return c;
  }

  // --- PAREDES ---
  createBrickTexture() {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#8b2600'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#d0d0d0';
    for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 64, 2);
    for (let y = 0; y < 64; y += 16) {
      const shift = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = shift; x < 64; x += 32) ctx.fillRect(x, y, 2, 16);
    }
    return c;
  }

  createOfficeTexture() {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#1e2838'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3a4e68'; ctx.fillRect(4, 4, 56, 56);
    ctx.fillStyle = '#6488b4'; ctx.fillRect(8, 8, 48, 24);
    ctx.fillStyle = '#00f0ff'; ctx.fillRect(10, 10, 44, 20);
    return c;
  }

  createPaintballTexture() {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#5c4033'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#3d281e';
    for (let i = 0; i < 64; i += 8) ctx.fillRect(0, i, 64, 1);
    const colors = ['#00ff00', '#ff00ff', '#ffff00', '#00ffff'];
    colors.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(16 + (idx * 12), 20 + (idx * 8), 6 + idx, 0, Math.PI * 2);
      ctx.fill();
    });
    return c;
  }

  createMansionTexture() {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#4a0e17'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffd700';
    for (let x = 8; x < 64; x += 16) {
      for (let y = 8; y < 64; y += 16) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    return c;
  }

  createAirplaneTexture() {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#7a8288'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#52585c'; ctx.fillRect(0, 0, 64, 2); ctx.fillRect(0, 62, 64, 2);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(32, 32, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#88ccff'; ctx.beginPath(); ctx.arc(32, 32, 12, 0, Math.PI * 2); ctx.fill();
    return c;
  }

  createGateTexture(color) {
    const { c, ctx } = this.createCanvas();
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = color;
    for (let x = 4; x < 64; x += 12) ctx.fillRect(x, 0, 4, 64);
    for (let y = 12; y < 64; y += 20) ctx.fillRect(0, y, 64, 4);
    return c;
  }

  // --- SPRITES DE PERSONAGENS COM PROPORÇÕES HUMANAS E ROSTOS ÚNICOS PARA CADA CLASSE ---
  createDirectionalPlayerSprite(classKey, teamColor, dir, walkFrame, isShooting, skin = 'default') {
    const { c, ctx } = this.createCanvas(96, 96);

    let mainColor = teamColor;
    if (skin === 'gold') mainColor = '#ffd700';
    if (skin === 'cyber') mainColor = '#ff00ff';
    if (skin === 'camo') mainColor = '#2e4600';

    // Sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const shadowWidth = classKey === 'heavy' ? 34 : 26;
    ctx.beginPath(); ctx.ellipse(48, 88, shadowWidth, 8, 0, 0, Math.PI * 2); ctx.fill();

    // Proporções Físicas Humanas Diferenciadas por Classe
    let bodyW = 32, bodyH = 36, headR = 13, legW = 10, legH = 16, skinTone = '#f2c9ac';

    if (classKey === 'heavy') {
      bodyW = 46; bodyH = 40; headR = 16; legW = 14; legH = 18; skinTone = '#e5b897';
    } else if (classKey === 'scout') {
      bodyW = 24; bodyH = 32; headR = 12; legW = 8; legH = 18; skinTone = '#fce5cd';
    } else if (classKey === 'soldier') {
      bodyW = 36; bodyH = 38; headR = 14; legW = 11; legH = 16; skinTone = '#dfb08c';
    } else if (classKey === 'engineer') {
      bodyW = 30; bodyH = 34; headR = 13; legW = 10; legH = 15; skinTone = '#f1c27d';
    } else if (classKey === 'medic') {
      bodyW = 28; bodyH = 36; headR = 13; legW = 9; legH = 17; skinTone = '#fff0db';
    } else if (classKey === 'pyro') {
      bodyW = 34; bodyH = 36; headR = 14; legW = 11; legH = 16;
    } else if (classKey === 'spy') {
      bodyW = 26; bodyH = 36; headR = 12; legW = 9; legH = 18; skinTone = '#333344';
    }

    const bodyX = 48 - bodyW / 2;
    const bodyY = 76 - bodyH;
    const headX = 48;
    const headY = bodyY - headR + 2;

    // Pernas (Passos de Caminhada)
    ctx.fillStyle = skin === 'cyber' ? '#00ffff' : '#111822';
    if (dir === 'front' || dir === 'back') {
      if (walkFrame === 0) {
        ctx.fillRect(48 - legW - 2, 74, legW, legH);
        ctx.fillRect(48 + 2, 74, legW, legH);
      } else {
        ctx.fillRect(48 - legW - 5, 72, legW, legH + 2);
        ctx.fillRect(48 + 4, 76, legW, legH - 2);
      }
    } else {
      if (walkFrame === 0) {
        ctx.fillRect(48 - legW / 2, 74, legW + 2, legH);
      } else {
        ctx.fillRect(48 - legW - 4, 74, legW + 2, legH);
        ctx.fillRect(48 + 2, 74, legW + 2, legH);
      }
    }

    // Corpo / Uniforme
    ctx.fillStyle = mainColor;
    if (classKey === 'medic') ctx.fillStyle = '#ffffff';
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    // Detalhes do Torso por Classe
    if (classKey === 'heavy') {
      ctx.fillStyle = '#4a2f13';
      ctx.fillRect(bodyX + 4, bodyY + 4, bodyW - 8, 8);
      ctx.fillStyle = '#ffaa00';
      for (let b = 0; b < 4; b++) ctx.fillRect(bodyX + 6 + (b * 8), bodyY + 5, 4, 6);
    } else if (classKey === 'soldier') {
      ctx.fillStyle = '#334422'; ctx.fillRect(bodyX + 6, bodyY + 12, 6, 10); ctx.fillRect(bodyX + bodyW - 12, bodyY + 12, 6, 10);
    } else if (classKey === 'engineer') {
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(bodyX, bodyY + bodyH - 8, bodyW, 8);
    } else if (classKey === 'medic') {
      ctx.fillStyle = teamColor; ctx.fillRect(bodyX, bodyY + 18, bodyW, 10);
      ctx.fillStyle = '#ff0000'; ctx.fillRect(45, bodyY + 8, 6, 12); ctx.fillRect(42, bodyY + 11, 12, 6);
    } else if (classKey === 'spy') {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(45, bodyY + 2, 6, 16);
      ctx.fillStyle = '#cc0000'; ctx.fillRect(46, bodyY + 4, 4, 12);
    } else if (classKey === 'demoman') {
      ctx.fillStyle = '#222222'; ctx.fillRect(bodyX + 2, bodyY + 4, bodyW - 4, bodyH - 8);
      ctx.fillStyle = '#ffaa00'; ctx.fillRect(bodyX + 6, bodyY + 10, 5, 8); ctx.fillRect(bodyX + 15, bodyY + 10, 5, 8);
    }

    // Cabeça e Rosto Único para Cada Classe
    ctx.fillStyle = (dir === 'back' && classKey !== 'spy' && classKey !== 'pyro') ? mainColor : skinTone;
    ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill();

    if (dir === 'front' || dir === 'side_left' || dir === 'side_right') {
      // HEAVY: Barba por fazer, chapéu de chef
      if (classKey === 'heavy') {
        ctx.fillStyle = 'rgba(60, 40, 30, 0.45)';
        ctx.fillRect(headX - 10, headY + 2, 20, 10);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(headX - 14, headY - 26, 28, 16);
        ctx.fillStyle = '#dddddd'; ctx.fillRect(headX - 16, headY - 10, 32, 4);
      }
      // ENGINEER: Capacete Amarelo de Construção & Goggles
      else if (classKey === 'engineer') {
        ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(headX, headY - 2, headR + 2, Math.PI, 0); ctx.fill();
        ctx.fillRect(headX - headR - 4, headY - 3, (headR * 2) + 8, 4);
        if (dir === 'front') {
          ctx.fillStyle = '#222222'; ctx.fillRect(headX - 11, headY - 4, 22, 8);
          ctx.fillStyle = '#ffcc00'; ctx.fillRect(headX - 9, headY - 2, 7, 4); ctx.fillRect(headX + 2, headY - 2, 7, 4);
        }
      }
      // SCOUT: Boné e Headset
      else if (classKey === 'scout') {
        ctx.fillStyle = mainColor;
        ctx.beginPath(); ctx.arc(headX, headY - 2, headR + 1, Math.PI, 0); ctx.fill();
        if (dir === 'front') ctx.fillRect(headX - 10, headY - 4, 20, 3);
        ctx.fillStyle = '#111111'; ctx.fillRect(headX - headR - 1, headY - 2, 4, 8); ctx.fillRect(headX + headR - 3, headY - 2, 4, 8);
      }
      // SOLDIER: Capacete verde militar
      else if (classKey === 'soldier') {
        ctx.fillStyle = '#4b5320'; ctx.beginPath(); ctx.arc(headX, headY - 2, headR + 3, Math.PI * 1.1, -Math.PI * 0.1); ctx.fill();
        ctx.fillRect(headX - headR - 3, headY - 2, (headR * 2) + 6, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(headX - 10, headY + 2, 20, 5);
      }
      // PYRO: Máscara de gás
      else if (classKey === 'pyro') {
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(headX, headY, headR + 1, 0, Math.PI * 2); ctx.fill();
        if (dir === 'front') {
          ctx.fillStyle = '#00ffff';
          ctx.beginPath(); ctx.arc(headX - 5, headY - 2, 4, 0, Math.PI * 2); ctx.arc(headX + 5, headY - 2, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
      // DEMOMAN: Tapa-olho
      else if (classKey === 'demoman') {
        ctx.fillStyle = '#1a1a24'; ctx.beginPath(); ctx.ellipse(headX, headY - 8, 15, 6, -0.2, 0, Math.PI * 2); ctx.fill();
        if (dir === 'front') {
          ctx.fillStyle = '#111'; ctx.fillRect(headX - 7, headY - 3, 5, 5);
        }
      }
      // MEDIC: Óculos
      else if (classKey === 'medic') {
        ctx.fillStyle = '#1a110b'; ctx.beginPath(); ctx.arc(headX, headY - 5, headR + 1, Math.PI * 0.9, -Math.PI * 0.1); ctx.fill();
        if (dir === 'front') {
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(headX - 5, headY - 1, 4, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(headX + 5, headY - 1, 4, 0, Math.PI * 2); ctx.stroke();
        }
      }
      // SNIPER: Chapéu australiano e óculos escuros
      else if (classKey === 'sniper') {
        ctx.fillStyle = '#4a3525'; ctx.fillRect(headX - 18, headY - 6, 36, 4); ctx.fillRect(headX - 12, headY - 14, 24, 9);
        if (dir === 'front') {
          ctx.fillStyle = '#111'; ctx.fillRect(headX - 9, headY - 2, 18, 5);
        }
      }
      // SPY: Balaclava preta
      else if (classKey === 'spy') {
        ctx.fillStyle = '#1a1a24'; ctx.beginPath(); ctx.arc(headX, headY, headR + 1, 0, Math.PI * 2); ctx.fill();
        if (dir === 'front') {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(headX - 8, headY - 3, 16, 5);
          ctx.fillStyle = skinTone; ctx.fillRect(headX - 7, headY - 2, 14, 3);
        }
      }
    }

    // Arma & Muzzle Flash de Disparo
    ctx.fillStyle = skin === 'gold' ? '#ffaa00' : '#111';
    if (dir === 'front') {
      ctx.fillRect(bodyX + bodyW, bodyY + 12, 20, 8);
      if (isShooting) {
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(bodyX + bodyW + 22, bodyY + 16, 10, 0, Math.PI * 2); ctx.fill();
      }
    } else if (dir === 'side_left') {
      ctx.fillRect(bodyX - 16, bodyY + 12, 20, 8);
      if (isShooting) {
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(bodyX - 18, bodyY + 16, 10, 0, Math.PI * 2); ctx.fill();
      }
    } else if (dir === 'side_right') {
      ctx.fillRect(bodyX + bodyW - 4, bodyY + 12, 20, 8);
      if (isShooting) {
        ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(bodyX + bodyW + 18, bodyY + 16, 10, 0, Math.PI * 2); ctx.fill();
      }
    }

    return c;
  }

  // --- SENTRY & DISPENSER ---
  createSentrySprite(color) {
    const { c, ctx } = this.createCanvas(64, 64);
    ctx.fillStyle = '#222'; ctx.fillRect(24, 40, 16, 20);
    ctx.fillStyle = color; ctx.fillRect(18, 24, 28, 18);
    ctx.fillStyle = '#111'; ctx.fillRect(12, 28, 12, 6);
    ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(32, 20, 4, 0, Math.PI * 2); ctx.fill();
    return c;
  }

  createDispenserSprite(color) {
    const { c, ctx } = this.createCanvas(64, 64);
    ctx.fillStyle = color; ctx.fillRect(18, 20, 28, 40);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(22, 24, 20, 12);
    ctx.fillStyle = '#00ff00'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('100%', 24, 33);
    return c;
  }

  // --- PROJÉTEIS ---
  createProjectileSprite(type, color) {
    const { c, ctx } = this.createCanvas(32, 32);
    ctx.fillStyle = color;
    if (type === 'waffle') {
      ctx.fillRect(6, 6, 20, 20);
      ctx.fillStyle = '#cc7700'; ctx.fillRect(10, 10, 12, 12);
    } else if (type === 'flame') {
      ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffff00'; ctx.beginPath(); ctx.arc(16, 16, 6, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'bullet') {
      ctx.fillRect(10, 14, 12, 4);
    } else if (type === 'milk') {
      ctx.beginPath(); ctx.arc(16, 16, 8, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'coffee') {
      ctx.beginPath(); ctx.arc(16, 16, 9, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'sticky') {
      ctx.beginPath(); ctx.arc(16, 16, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff0000'; ctx.fillRect(14, 14, 4, 4);
    }
    return c;
  }

  // --- ITENS DE CHÃO ---
  createItemSprite(type, color) {
    const { c, ctx } = this.createCanvas(64, 64);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.ellipse(32, 52, 22, 7, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = color;
    if (type === 'sausage') {
      ctx.beginPath(); ctx.ellipse(32, 32, 18, 8, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'pancake') {
      ctx.beginPath(); ctx.ellipse(32, 36, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffff00'; ctx.fillRect(28, 28, 8, 6);
    } else if (type === 'coffee') {
      ctx.fillRect(22, 20, 20, 24);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(42, 26, 6, 12);
    } else if (type === 'bacon') {
      ctx.fillRect(18, 26, 28, 6); ctx.fillRect(18, 36, 28, 6);
    } else if (type === 'ammo_box') {
      ctx.fillRect(20, 22, 24, 18);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(24, 26, 4, 10); ctx.fillRect(30, 26, 4, 10); ctx.fillRect(36, 26, 4, 10);
    } else if (type.includes('egg')) {
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(32, 34, 20, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.arc(32, 34, 8, 0, Math.PI * 2); ctx.fill();
    } else if (type === 'hashbrown') {
      ctx.fillStyle = '#e68a00'; ctx.fillRect(20, 22, 24, 20);
    } else if (type === 'bomb') {
      ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(32, 36, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff3300'; ctx.fillRect(30, 12, 4, 8);
    }
    return c;
  }

  // --- VISUALIZADOR 3D DE VESTIÁRIO (PROJEÇÃO 3D REAL COM ROTAÇÃO 360 GRAUS) ---
  renderCharacterPreview(canvas, classKey, rotDeg, skin = 'default') {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Fundo de Estúdio 3D com Degradê e Holofote Superior
    const bgGrad = ctx.createRadialGradient(width/2, height*0.4, 10, width/2, height*0.5, 200);
    bgGrad.addColorStop(0, '#222d42');
    bgGrad.addColorStop(0.5, '#0e121d');
    bgGrad.addColorStop(1, '#05060a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Cone de Luz 3D (Spotlight)
    ctx.fillStyle = 'rgba(0, 220, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(width/2, 0);
    ctx.lineTo(width * 0.15, height * 0.85);
    ctx.lineTo(width * 0.85, height * 0.85);
    ctx.closePath();
    ctx.fill();

    // 2. Pedestal 3D Metálico com Anel Neon Giratório
    const rad = (rotDeg * Math.PI) / 180;
    const pX = width / 2;
    const pY = height * 0.82;

    // Sombra do Pedestal
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(pX, pY + 14, 85, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Corpo do Pedestal
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(pX - 82, pY, 164, 12);

    // Anel Neon Dourado 3D
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(pX, pY, 82, 22, 0, 0, Math.PI * 2);
    ctx.stroke();

    // LEDs do Pedestal Giratório
    ctx.fillStyle = '#00f0ff';
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const mx = pX + Math.cos(a + rad) * 78;
      const my = pY + Math.sin(a + rad) * 20;
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sombra Projetada do Personagem
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.ellipse(pX, pY - 2, 42, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Projeção Geométrica 3D do Personagem (Nodais 3D)
    ctx.save();

    // Cores de Uniforme e Skin
    let teamColor = '#0077ff';
    if (skin === 'gold') teamColor = '#ffd700';
    if (skin === 'cyber') teamColor = '#ff00ff';
    if (skin === 'camo') teamColor = '#2e4600';

    const cosR = Math.cos(rad);
    const sinR = Math.sin(rad);

    // Função Helper de Projeção Perspectiva 3D: (x, y, z) -> (screenX, screenY, scale)
    const project3D = (x, y, z) => {
      // Rotação Y
      const rx = x * cosR - z * sinR;
      const rz = x * sinR + z * cosR;
      const focalLength = 300;
      const scale = focalLength / (focalLength + rz);
      const sx = pX + rx * scale;
      const sy = pY - 110 + y * scale;
      return { sx, sy, scale, rz };
    };

    // Dimensões do Modelo por Classe
    let bodyW = 28, bodyH = 44, headR = 16, legW = 10, legH = 32;
    let skinTone = '#f2c9ac';

    if (classKey === 'heavy') {
      bodyW = 42; bodyH = 50; headR = 19; legW = 14; legH = 34; skinTone = '#e5b897';
    } else if (classKey === 'scout') {
      bodyW = 22; bodyH = 38; headR = 14; legW = 8; legH = 34; skinTone = '#fce5cd';
    } else if (classKey === 'soldier') {
      bodyW = 32; bodyH = 44; headR = 16; legW = 11; legH = 32; skinTone = '#dfb08c';
    } else if (classKey === 'engineer') {
      bodyW = 28; bodyH = 40; headR = 15; legW = 10; legH = 30; skinTone = '#f1c27d';
    } else if (classKey === 'medic') {
      bodyW = 26; bodyH = 44; headR = 15; legW = 9; legH = 32; skinTone = '#fff0db';
    } else if (classKey === 'spy') {
      bodyW = 24; bodyH = 44; headR = 14; legW = 9; legH = 34; skinTone = '#333344';
    }

    // Pernas em 3D
    const leftLegPos = project3D(-bodyW * 0.25, 40, 0);
    const rightLegPos = project3D(bodyW * 0.25, 40, 0);

    ctx.fillStyle = skin === 'cyber' ? '#00ffff' : '#111822';
    ctx.fillRect(leftLegPos.sx - (legW*leftLegPos.scale)/2, leftLegPos.sy, legW * leftLegPos.scale, legH * leftLegPos.scale);
    ctx.fillRect(rightLegPos.sx - (legW*rightLegPos.scale)/2, rightLegPos.sy, legW * rightLegPos.scale, legH * rightLegPos.scale);

    // Torso 3D
    const torsoPos = project3D(0, 0, 0);
    const torsoW = bodyW * torsoPos.scale;
    const torsoH = bodyH * torsoPos.scale;

    // Gradiente de Iluminação 3D no Torso
    const torsoGrad = ctx.createLinearGradient(torsoPos.sx - torsoW/2, torsoPos.sy, torsoPos.sx + torsoW/2, torsoPos.sy);
    if (sinR > 0) {
      torsoGrad.addColorStop(0, teamColor);
      torsoGrad.addColorStop(1, '#002266');
    } else {
      torsoGrad.addColorStop(0, '#002266');
      torsoGrad.addColorStop(1, teamColor);
    }
    ctx.fillStyle = classKey === 'medic' ? '#ffffff' : torsoGrad;
    ctx.fillRect(torsoPos.sx - torsoW/2, torsoPos.sy - torsoH/2, torsoW, torsoH);

    // Detalhes no Torso (Cinto/Bandeira)
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(torsoPos.sx - torsoW/2, torsoPos.sy + torsoH/4, torsoW, 4 * torsoPos.scale);

    // Braços em 3D (Depth Sorting)
    const leftArmPos = project3D(-bodyW * 0.65, 0, 0);
    const rightArmPos = project3D(bodyW * 0.65, 0, 0);

    const drawArm = (armPos) => {
      ctx.fillStyle = teamColor;
      ctx.fillRect(armPos.sx - (8*armPos.scale)/2, armPos.sy - torsoH/2, 8 * armPos.scale, bodyH * 0.8 * armPos.scale);
    };

    if (leftArmPos.rz > rightArmPos.rz) {
      drawArm(rightArmPos);
      drawArm(leftArmPos);
    } else {
      drawArm(leftArmPos);
      drawArm(rightArmPos);
    }

    // Cabeça 3D
    const headPos = project3D(0, -bodyH * 0.6, 0);
    const headRadius = headR * headPos.scale;

    // Iluminação 3D na Cabeça
    const headGrad = ctx.createRadialGradient(
      headPos.sx - headRadius * 0.3 * cosR, headPos.sy - headRadius * 0.3, headRadius * 0.2,
      headPos.sx, headPos.sy, headRadius
    );
    headGrad.addColorStop(0, '#ffe5d0');
    headGrad.addColorStop(0.7, skinTone);
    headGrad.addColorStop(1, '#a67252');

    ctx.fillStyle = (classKey === 'spy') ? '#1a1a24' : headGrad;
    ctx.beginPath();
    ctx.arc(headPos.sx, headPos.sy, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Feições do Rosto e Chapéus Orbitando em 3D
    const faceFeatureX = headPos.sx + Math.sin(rad) * headRadius * 0.7;
    const faceVisible = Math.cos(rad) > -0.2;

    if (faceVisible) {
      // Olhos 3D
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(faceFeatureX - 4 * headPos.scale, headPos.sy - 2 * headPos.scale, 2.5 * headPos.scale, 0, Math.PI * 2);
      ctx.arc(faceFeatureX + 4 * headPos.scale, headPos.sy - 2 * headPos.scale, 2.5 * headPos.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chapéus 3D
    if (classKey === 'heavy') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(headPos.sx - 16 * headPos.scale, headPos.sy - headRadius - 16 * headPos.scale, 32 * headPos.scale, 16 * headPos.scale);
    } else if (classKey === 'engineer') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(headPos.sx, headPos.sy - 2, headRadius + 2, Math.PI, 0); ctx.fill();
    } else if (classKey === 'scout') {
      ctx.fillStyle = teamColor;
      ctx.fillRect(headPos.sx - 12 * headPos.scale, headPos.sy - headRadius - 4 * headPos.scale, 24 * headPos.scale, 6 * headPos.scale);
    } else if (classKey === 'soldier') {
      ctx.fillStyle = '#4b5320';
      ctx.beginPath(); ctx.arc(headPos.sx, headPos.sy - 2, headRadius + 3, Math.PI * 1.1, -Math.PI * 0.1); ctx.fill();
    } else if (classKey === 'sniper') {
      ctx.fillStyle = '#4a3525';
      ctx.fillRect(headPos.sx - 20 * headPos.scale, headPos.sy - headRadius, 40 * headPos.scale, 5 * headPos.scale);
    }

    ctx.restore();
  }
}

const textures = new TextureGenerator();
