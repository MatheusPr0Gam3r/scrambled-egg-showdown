document.addEventListener('DOMContentLoaded', () => {
  let socket, engine, myPlayerId, roomCode, currentMap, gameState;
  let selectedTeam = 'blue', selectedClass = 'scout', localPlayerAngle = 0;
  let isSettingsOpen = false;
  let antiLagEnabled = true;
  let currentPing = 0;

  // Render Interpolation cache para movimentos suaves dos jogadores remotos
  const renderPlayersCache = {};

  // Estado de Conta e Inventário
  let userAccount = {
    email: null,
    name: 'GuerreiroDoOvo',
    coins: 0,
    inventory: [],
    equipped: { hat: 'none', shirt: 'none', pants: 'none', weapon_skin: 'default', death_scream: 'default' },
    friends: [],
    friendRequests: []
  };

  let globalCatalog = {};
  let globalCrates = [];
  let currentTradeId = null;
  let myTradeOffer = { items: [], coins: 0 };
  let activeSlotFilter = 'hat';
  let vestiarioRotDeg = 0;

  const canvas = document.getElementById('gameCanvas');
  engine = new RaycasterEngine(canvas);

  const keys = { w: false, a: false, s: false, d: false, Shift: false, Control: false, c: false, ' ': false };

  // Inicializar WebSocket
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(`${protocol}//${window.location.host}`);

  socket.onopen = () => {
    fetchRooms();
    socket.send(JSON.stringify({ type: 'GET_INITIAL_DATA' }));
    setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'PING', ts: Date.now() }));
      }
    }, 2000);
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'PONG') {
      currentPing = Date.now() - data.ts;
      const pingEl = document.getElementById('hud-ping');
      if (pingEl) pingEl.innerText = `${currentPing} ms`;
      return;
    }

        if (data.type === 'INITIAL_DATA') {
      globalCatalog = data.catalog || {};
      globalCrates = data.crates || [];
      renderCratesGrid();
      renderVestiarioItems();
      return;
    }

    if (data.type === 'SESSION_LIST') renderRoomList(data.sessions);
    if (data.type === 'SESSION_CREATED') openClassSelect(data.code);

    if (data.type === 'JOINED') {
      myPlayerId = data.playerId;
      roomCode = data.code;
      currentMap = data.map;

      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('class-select-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');

      document.getElementById('hud-room-code').innerText = roomCode;
      document.getElementById('hud-team').innerText = data.team.toUpperCase();

      // Travar o ponteiro do mouse ao clicar na tela do jogo
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
      canvas.addEventListener('click', () => canvas.requestPointerLock());
    }

    if (data.type === 'TICK') {
      gameState = data;
      updateHUD();
    }

    // --- AUTENTICAÇÃO ---
    if (data.type === 'AUTH_SUCCESS') {
      userAccount.email = data.email;
      userAccount.name = data.name;
      userAccount.coins = data.coins;
      userAccount.inventory = data.inventory || [];
      userAccount.equipped = data.equipped || {};
      userAccount.friends = data.friends || [];
      userAccount.friendRequests = data.friendRequests || [];

      globalCatalog = data.catalog || {};
      globalCrates = data.crates || [];

      document.getElementById('player-name').value = data.name;
      document.getElementById('player-coins').innerText = data.coins;
      document.getElementById('user-email-display').innerText = `Logado: ${data.email}`;
      document.getElementById('btn-open-auth-modal').innerText = '🚪 SAIR DA CONTA';

      document.getElementById('auth-modal').classList.add('hidden');

      renderCratesGrid();
      renderVestiarioItems();
      renderFriendsList();
      renderFriendRequestsList();
      updateVestiarioPreview();
    }

    if (data.type === 'AUTH_ERROR') {
      alert(`⚠️ Erro de Autenticação: ${data.message}`);
    }

    if (data.type === 'PROFILE_UPDATED') {
      userAccount.coins = data.coins;
      userAccount.inventory = data.inventory || [];
      document.getElementById('player-coins').innerText = data.coins;
      renderVestiarioItems();
    }

    // --- AMIGOS E TROCAS ---
    if (data.type === 'FRIEND_REQUEST_RECEIVED') {
      userAccount.friendRequests = data.requests || [];
      renderFriendRequestsList();
      showAnnouncement(`📩 Nova solicitação de amizade de ${data.fromEmail}`);
    }

    if (data.type === 'FRIENDS_UPDATED') {
      userAccount.friends = data.friends || [];
      userAccount.friendRequests = data.friendRequests || [];
      renderFriendsList();
      renderFriendRequestsList();
    }

    if (data.type === 'TRADE_OFFER_RECEIVED') {
      currentTradeId = data.tradeId;
      document.getElementById('trade-partner-email').innerText = data.fromEmail;
      document.getElementById('trade-modal').classList.remove('hidden');
    }

    if (data.type === 'TRADE_STARTED') {
      currentTradeId = data.tradeId;
      document.getElementById('trade-partner-email').innerText = data.partnerEmail;
      document.getElementById('trade-modal').classList.remove('hidden');
    }

    // --- ROLETA DE CAIXAS ---
    if (data.type === 'CRATE_RESULT') {
      userAccount.coins = data.newCoins;
      document.getElementById('player-coins').innerText = data.newCoins;
      runRouletteAnimation(data.wonItem);
    }

    // --- PATAMAR DE FIM DE PARTIDA ---
    if (data.type === 'MATCH_FINISHED') {
      renderPodiumModal(data.podium, data.winningTeam);
    }

    if (data.type === 'HIT_CONFIRM') {
      engine.triggerHitMarker();
      soundSystem.playHitMarker();
    }

    if (data.type === 'AUDIO_EVENT') {
      if (data.sound === 'reload') soundSystem.playReload();
      if (data.sound === 'ammo') soundSystem.playAmmoPickup();
      if (data.sound === 'pickup') soundSystem.playPickup();
      if (data.sound === 'scope') soundSystem.playScope();
    }

    if (data.type === 'ANNOUNCEMENT') {
      showAnnouncement(data.text);
      soundSystem.playGateOpen();
    }

    if (data.type === 'ERROR') {
      alert(data.message);
    }
  };

  // --- LOBBY & ABAS ---
  function fetchRooms() {
    socket.send(JSON.stringify({ type: 'LIST_SESSIONS' }));
  }
  document.getElementById('btn-refresh-rooms').addEventListener('click', fetchRooms);

  // Navegação por Abas no Lobby
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      if (btn.id === 'tab-btn-rooms') document.getElementById('tab-content-rooms').classList.remove('hidden');
            if (btn.id === 'tab-btn-shop') {
        document.getElementById('tab-content-shop').classList.remove('hidden');
        renderCratesGrid();
      }
      if (btn.id === 'tab-btn-vestuario') {
        document.getElementById('tab-content-vestuario').classList.remove('hidden');
        updateVestiarioPreview();
      }
      if (btn.id === 'tab-btn-friends') document.getElementById('tab-content-friends').classList.remove('hidden');
    });
  });

  // Criar Sala
  document.getElementById('btn-create-room').addEventListener('click', () => {
    socket.send(JSON.stringify({
      type: 'CREATE_SESSION',
      name: document.getElementById('room-name').value,
      mapId: parseInt(document.getElementById('map-select').value),
      minigameId: parseInt(document.getElementById('minigame-select').value)
    }));
  });

  function renderRoomList(sessions) {
    const container = document.getElementById('room-list');
    container.innerHTML = sessions.map(s => `
      <div class="room-item">
        <div>
          <strong>${s.name}</strong> (${s.totalCount}/10 p)<br>
          <small>🟦 ${s.blueCount}/5 | 🟥 ${s.redCount}/5 • ${s.mapName}</small>
        </div>
        <button class="btn-join" onclick="openClassSelect('${s.code}', ${s.blueCount}, ${s.redCount})">ENTRAR</button>
      </div>
    `).join('');
  }

  window.openClassSelect = function(code, blueCount = 0, redCount = 0) {
    roomCode = code;
    document.getElementById('count-blue').innerText = blueCount;
    document.getElementById('count-red').innerText = redCount;

    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('class-select-screen').classList.remove('hidden');
  };

  // --- AUTENTICAÇÃO E MODAL ---
  document.getElementById('btn-open-auth-modal').addEventListener('click', () => {
    if (userAccount.email) {
      window.location.reload();
    } else {
      document.getElementById('auth-modal').classList.remove('hidden');
    }
  });

  document.getElementById('btn-close-auth').addEventListener('click', () => {
    document.getElementById('auth-modal').classList.add('hidden');
  });

  document.getElementById('btn-auth-tab-login').addEventListener('click', () => {
    document.getElementById('btn-auth-tab-login').classList.add('active');
    document.getElementById('btn-auth-tab-register').classList.remove('active');
    document.getElementById('auth-form-login').classList.remove('hidden');
    document.getElementById('auth-form-register').classList.add('hidden');
  });

  document.getElementById('btn-auth-tab-register').addEventListener('click', () => {
    document.getElementById('btn-auth-tab-register').classList.add('active');
    document.getElementById('btn-auth-tab-login').classList.remove('active');
    document.getElementById('auth-form-register').classList.remove('hidden');
    document.getElementById('auth-form-login').classList.add('hidden');
  });

  document.getElementById('btn-submit-login').addEventListener('click', () => {
    socket.send(JSON.stringify({
      type: 'LOGIN',
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    }));
  });

  document.getElementById('btn-submit-register').addEventListener('click', () => {
    socket.send(JSON.stringify({
      type: 'REGISTER',
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value
    }));
  });

  // --- RENDERIZAR LOJA DE CAIXAS (20 CAIXAS + SAZONAIS) ---
  function renderCratesGrid() {
    const grid = document.getElementById('boxes-grid');
    grid.innerHTML = globalCrates.map(crate => `
      <div class="box-card ${crate.seasonal ? 'seasonal' : ''}">
        ${crate.seasonal ? `<div class="seasonal-badge">⏳ 10 DIAS</div>` : ''}
        <div class="box-icon">🎁</div>
        <div class="box-title">${crate.name}</div>
        <div class="box-cost">💰 ${crate.cost} MOEDAS</div>
        <button class="btn primary" onclick="openCrate('${crate.id}')">ABRIR CAIXA</button>
      </div>
    `).join('');
  }

  window.openCrate = function(crateId) {
    socket.send(JSON.stringify({ type: 'OPEN_CRATE', crateId }));
  };

  // Animação de Roleta Horizontal (Unboxing CS:GO)
  function runRouletteAnimation(wonItem) {
    const modal = document.getElementById('unboxing-modal');
    const strip = document.getElementById('roulette-strip');
    const rewardBox = document.getElementById('unboxing-reward');

    modal.classList.remove('hidden');
    rewardBox.classList.add('hidden');
    strip.style.transform = 'translateX(0px)';
    strip.innerHTML = '';

    const dummyItems = [];
    const pool = globalCatalog[wonItem.category] || [];

    for (let i = 0; i < 25; i++) {
      const rand = pool[Math.floor(Math.random() * pool.length)] || wonItem;
      dummyItems.push(rand);
    }
    dummyItems.push(wonItem);
    for (let i = 0; i < 5; i++) {
      const rand = pool[Math.floor(Math.random() * pool.length)] || wonItem;
      dummyItems.push(rand);
    }

    strip.innerHTML = dummyItems.map(item => `
      <div class="roulette-item" style="border-bottom: 3px solid ${item.rarityColor || '#888'}">
        <div style="font-size: 20px;">🎁</div>
        <div style="font-size: 9px; margin-top:2px;">${item.name.substring(0, 10)}</div>
      </div>
    `).join('');

    const itemWidth = 86;
    const targetOffset = -(25 * itemWidth) + (260 / 2) - 43;

    setTimeout(() => {
      strip.style.transition = 'transform 4s cubic-bezier(0.15, 0.9, 0.25, 1)';
      strip.style.transform = `translateX(${targetOffset}px)`;
    }, 100);

    setTimeout(() => {
      rewardBox.classList.remove('hidden');
      document.getElementById('reward-name').innerText = wonItem.name;
      document.getElementById('reward-rarity').innerText = `Raridade: ${wonItem.rarityName}`;
      document.getElementById('reward-rarity').style.color = wonItem.rarityColor;
      soundSystem.playPickup();
    }, 4200);
  }

  document.getElementById('btn-claim-reward').addEventListener('click', () => {
    document.getElementById('unboxing-modal').classList.add('hidden');
    renderVestiarioItems();
  });

  // --- VESTIÁRIO 3D INTERATIVO & FILTROS DE CATEGORIA ---
  document.querySelectorAll('.vslot-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.vslot-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeSlotFilter = tab.dataset.slot;
      renderVestiarioItems();
    });
  });

  document.getElementById('vestuario-class-select').addEventListener('change', (e) => {
    selectedClass = e.target.value;
    updateVestiarioPreview();
  });

  document.getElementById('vestuario-rot-slider').addEventListener('input', (e) => {
    vestiarioRotDeg = parseInt(e.target.value);
    updateVestiarioPreview();
  });

  document.getElementById('btn-rot-left').addEventListener('click', () => {
    vestiarioRotDeg = (vestiarioRotDeg - 45 + 360) % 360;
    document.getElementById('vestuario-rot-slider').value = vestiarioRotDeg;
    updateVestiarioPreview();
  });

  document.getElementById('btn-rot-right').addEventListener('click', () => {
    vestiarioRotDeg = (vestiarioRotDeg + 45) % 360;
    document.getElementById('vestuario-rot-slider').value = vestiarioRotDeg;
    updateVestiarioPreview();
  });

  document.getElementById('vestuario-search').addEventListener('input', () => renderVestiarioItems());

  function updateVestiarioPreview() {
    const vCanvas = document.getElementById('vestuarioCanvas');
    if (vCanvas && textures) {
      const equippedSkin = userAccount.equipped.characterSkin || 'default';
      textures.renderCharacterPreview(vCanvas, selectedClass, vestiarioRotDeg, equippedSkin);
    }
  }

          function renderVestiarioItems() {
    const container = document.getElementById('vestuario-items-list');
    if (!container) return;
    const searchVal = (document.getElementById('vestuario-search')?.value || '').toLowerCase();

    // Filtra APENAS os itens que o jogador REALMENTE possui no seu inventario!
    const ownedItems = (userAccount.inventory || []).filter(item => item.category === activeSlotFilter);
    const filtered = ownedItems.filter(i => i.name.toLowerCase().includes(searchVal));

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-hint" style="grid-column: 1/-1;">Você não possui itens nesta categoria. Abra caixas na loja para conquistar novas skins!</p>';
      return;
    }

    container.innerHTML = filtered.map(item => {
      const isEquipped = userAccount.equipped[activeSlotFilter] === item.id;

      return `
        <div class="vitem-card ${isEquipped ? 'equipped' : ''}">
          <div>
            <strong>${item.name}</strong><br>
            <span class="vitem-rarity-tag" style="background:${item.rarityColor || '#888'}; color:#000;">${item.rarityName || 'Comum'}</span>
          </div>
          ${isEquipped ? `<span style="color:#00ff66; font-size:10px; font-weight:bold;">EQUIPADO</span>` :
            `<button class="btn primary inline-btn" onclick="equipItem('${activeSlotFilter}', '${item.id}')">EQUIPAR</button>`}
        </div>
      `;
    }).join('');
  }

  window.equipItem = function(slot, itemId) {
    userAccount.equipped[slot] = itemId;
    socket.send(JSON.stringify({ type: 'EQUIP_ITEM', slot, itemId }));
    renderVestiarioItems();
    updateVestiarioPreview();
  };

  // --- SOCIAL / AMIGOS & SISTEMA DE TROCAS (TRADING) ---
  document.getElementById('btn-send-friend-request').addEventListener('click', () => {
    const email = document.getElementById('friend-email-input').value;
    if (email) {
      socket.send(JSON.stringify({ type: 'SEND_FRIEND_REQUEST', targetEmail: email }));
    }
  });

  function renderFriendRequestsList() {
    const container = document.getElementById('friend-requests-list');
    if (!userAccount.friendRequests || userAccount.friendRequests.length === 0) {
      container.innerHTML = `<p class="empty-hint">Nenhuma solicitação pendente.</p>`;
      return;
    }

    container.innerHTML = userAccount.friendRequests.map(reqEmail => `
      <div class="friend-card">
        <span>${reqEmail}</span>
        <button class="btn primary inline-btn" onclick="acceptFriend('${reqEmail}')">ACEITAR</button>
      </div>
    `).join('');
  }

  window.acceptFriend = function(fromEmail) {
    socket.send(JSON.stringify({ type: 'ACCEPT_FRIEND_REQUEST', fromEmail }));
  };

  function renderFriendsList() {
    const container = document.getElementById('friends-list');
    if (!userAccount.friends || userAccount.friends.length === 0) {
      container.innerHTML = `<p class="empty-hint">Faça login e adicione amigos para negociar e jogar juntos!</p>`;
      return;
    }

    container.innerHTML = userAccount.friends.map(friendEmail => `
      <div class="friend-card">
        <div>
          <strong>${friendEmail}</strong><br>
          <span class="friend-status online">ONLINE</span>
        </div>
        <button class="btn primary inline-btn" onclick="proposeTrade('${friendEmail}')">🤝 TROCAR ITENS</button>
      </div>
    `).join('');
  }

  window.proposeTrade = function(targetEmail) {
    socket.send(JSON.stringify({ type: 'PROPOSE_TRADE', targetEmail }));
  };

  document.getElementById('btn-confirm-trade').addEventListener('click', () => {
    const offeredCoins = parseInt(document.getElementById('my-trade-coins').value) || 0;
    socket.send(JSON.stringify({
      type: 'CONFIRM_TRADE',
      tradeId: currentTradeId,
      offeredItems: myTradeOffer.items,
      offeredCoins
    }));
  });

  document.getElementById('btn-cancel-trade').addEventListener('click', () => {
    document.getElementById('trade-modal').classList.add('hidden');
  });

  // --- PODIUM / PATAMAR RESULTADOS ---
  function renderPodiumModal(podium, winningTeam) {
    const modal = document.getElementById('podium-modal');
    const stands = document.getElementById('podium-stands');
    modal.classList.remove('hidden');

    stands.innerHTML = podium.slice(0, 3).map((p, idx) => {
      const ranks = ['first', 'second', 'third'];
      const trophies = ['🥇 1º LUGAR', '🥈 2º LUGAR', '🥉 3º LUGAR'];
      return `
        <div class="podium-stand ${ranks[idx]}">
          <div style="font-size:24px;">${trophies[idx]}</div>
          <div style="font-size:14px; font-weight:bold; margin:6px 0;">${p.name}</div>
          <div style="font-size:11px;">Kills: ${p.kills} | Score: ${p.score}</div>
          <div style="color:#ffcc00; font-weight:bold; margin-top:4px;">+${p.coinsEarned} 💰</div>
        </div>
      `;
    }).join('');

    const myEntry = podium.find(p => p.id === myPlayerId);
    if (myEntry) {
      document.getElementById('my-coins-gained').innerText = `+${myEntry.coinsEarned} 💰`;
    }
  }

  document.getElementById('btn-close-podium').addEventListener('click', () => {
    document.getElementById('podium-modal').classList.add('hidden');
    window.location.reload();
  });

  // --- CONTROLES DO JOGO (TECLADO & MOUSE) ---
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      window.addEventListener('mousemove', handleMouseMove);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
    }
  });

  function handleMouseMove(e) {
    localPlayerAngle += e.movementX * 0.003;
  }

  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') toggleSettings();

    if (!isSettingsOpen) {
      if (['w','a','s','d','shift','control','c',' '].includes(k)) keys[k] = true;

      if (e.key === '1') socket.send(JSON.stringify({ type: 'SWITCH_WEAPON', slot: 1 }));
      if (e.key === '2') socket.send(JSON.stringify({ type: 'SWITCH_WEAPON', slot: 2 }));
      if (e.key === '3') socket.send(JSON.stringify({ type: 'SWITCH_WEAPON', slot: 3 }));
      if (k === 'r') socket.send(JSON.stringify({ type: 'RELOAD' }));
      if (k === 'b') socket.send(JSON.stringify({ type: 'DISGUISE' }));
      if (k === 'q') socket.send(JSON.stringify({ type: 'TOGGLE_SCOPE' }));
    }
  });

  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (['w','a','s','d','shift','control','c',' '].includes(k)) keys[k] = false;
  });

  window.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === canvas) {
      if (e.button === 0) {
        socket.send(JSON.stringify({ type: 'SHOOT' }));
        engine.recoil = 8;
        soundSystem.playShoot(selectedClass);
      }
      if (e.button === 2) {
        socket.send(JSON.stringify({ type: 'TOGGLE_SCOPE' }));
      }
    }
  });

  // OTIMIZAÇÃO ANTI-LAG DE ENVIO DE MOVIMENTO
  let lastMoveSentTime = 0;
  let lastSentData = null;

  setInterval(() => {
    if (!gameState || !myPlayerId || !gameState.players[myPlayerId] || isSettingsOpen) return;

    let dx = 0, dy = 0;
    if (keys.w) { dx += Math.cos(localPlayerAngle); dy += Math.sin(localPlayerAngle); engine.weaponBob += 0.2; }
    if (keys.s) { dx -= Math.cos(localPlayerAngle); dy -= Math.sin(localPlayerAngle); engine.weaponBob += 0.2; }
    if (keys.a) { dx += Math.cos(localPlayerAngle - Math.PI/2); dy += Math.sin(localPlayerAngle - Math.PI/2); engine.weaponBob += 0.2; }
    if (keys.d) { dx += Math.cos(localPlayerAngle + Math.PI/2); dy += Math.sin(localPlayerAngle + Math.PI/2); engine.weaponBob += 0.2; }

    const isRunning = keys.shift;
    const isCrouching = keys.control || keys.c;
    const isJumping = keys[' '];

    const now = Date.now();
    const hasMoved = (dx !== 0 || dy !== 0 || isJumping);
    const angleChanged = !lastSentData || Math.abs(lastSentData.angle - localPlayerAngle) > 0.005;

    // Só envia pacote se o jogador estiver se movendo, mudando de visão ou a cada 200ms de heartbeat
    if (hasMoved || angleChanged || (now - lastMoveSentTime > 200)) {
      lastMoveSentTime = now;
      lastSentData = { angle: localPlayerAngle, dx, dy };

      socket.send(JSON.stringify({
        type: 'PLAYER_MOVE',
        dx: Math.round(dx * 100) / 100,
        dy: Math.round(dy * 100) / 100,
        angle: Math.round(localPlayerAngle * 100) / 100,
        isRunning,
        isCrouching,
        isJumping
      }));
    }
  }, 33);

  // Loop de Renderização do Canvas com Interpolação Suave LERP
  function renderLoop() {
    if (gameState && myPlayerId && gameState.players[myPlayerId]) {
      const renderState = JSON.parse(JSON.stringify(gameState));

      // Suavização Anti-Lag (Interpolação LERP) para outros jogadores
      if (antiLagEnabled) {
        Object.values(renderState.players).forEach(p => {
          if (p.id !== myPlayerId) {
            if (!renderPlayersCache[p.id]) {
              renderPlayersCache[p.id] = { x: p.x, y: p.y, angle: p.angle, jumpZ: p.jumpZ || 0 };
            } else {
              const cache = renderPlayersCache[p.id];
              cache.x += (p.x - cache.x) * 0.35;
              cache.y += (p.y - cache.y) * 0.35;
              cache.angle += (p.angle - cache.angle) * 0.35;
              cache.jumpZ += ((p.jumpZ || 0) - cache.jumpZ) * 0.35;

              p.x = cache.x;
              p.y = cache.y;
              p.angle = cache.angle;
              p.jumpZ = cache.jumpZ;
            }
          }
        });
      }

      const myPlayer = renderState.players[myPlayerId];
      myPlayer.angle = localPlayerAngle;
      engine.render(myPlayer, currentMap, renderState, gameState.setupPhase);
    }
    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  function updateHUD() {
    if (!gameState || !myPlayerId || !gameState.players[myPlayerId]) return;
    const p = gameState.players[myPlayerId];

    document.getElementById('hud-hp').innerText = Math.max(0, Math.floor(p.hp));
    document.getElementById('hud-class').innerText = p.classKey.toUpperCase();
    document.getElementById('hud-weapon').innerText = p.activeWeaponName || 'FACA';
    document.getElementById('hud-ammo').innerText = `${p.ammoClip} / ${p.ammoReserve}`;

    if (gameState.setupPhase) {
      document.getElementById('match-timer').innerText = `🚪 FASE DE PREPARAÇÃO: ${gameState.setupTimer}s`;
    } else {
      const mins = Math.floor(gameState.matchTimer / 60);
      const secs = (gameState.matchTimer % 60).toString().padStart(2, '0');
      document.getElementById('match-timer').innerText = `⏱️ TEMPO: ${mins}:${secs}`;
    }

    document.getElementById('score-board').innerText = `AZUL ${gameState.scores.blue} - ${gameState.scores.red} VERMELHO`;

    const deathScreen = document.getElementById('death-screen');
    if (p.isDead) {
      deathScreen.classList.remove('hidden');
      document.getElementById('respawn-timer').innerText = p.respawnTimer;
    } else {
      deathScreen.classList.add('hidden');
    }
  }

  function toggleSettings() {
    isSettingsOpen = !isSettingsOpen;
    const modal = document.getElementById('settings-modal');
    if (isSettingsOpen) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }

  document.getElementById('btn-close-settings').addEventListener('click', toggleSettings);

  document.getElementById('setting-antilag').addEventListener('change', (e) => {
    antiLagEnabled = (e.target.value === 'on');
  });

  function showAnnouncement(text) {
    const el = document.getElementById('announcement-banner');
    el.innerText = text;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 3500);
  }
});
