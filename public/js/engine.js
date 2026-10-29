// Motor Raycaster 2.5D com Céu Claro (Skybox), Carpetes de Base, Pulo/Agachar, Scope e Arma 2.5D
class RaycasterEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Configurações Gráficas
    this.fov = Math.PI / 3;
    this.baseFov = Math.PI / 3;
    this.renderScale = 1;
    this.enableShadows = true;
    this.zBuffer = new Float64Array(this.width);

    // Animações de Armas
    this.weaponBob = 0;
    this.recoil = 0;
    this.hitMarkerTimer = 0;
  }

  setQuality(quality) {
    if (quality === 'low') this.renderScale = 4;
    else if (quality === 'medium') this.renderScale = 2;
    else this.renderScale = 1;
  }

  setFovDegrees(deg) {
    const clamped = Math.max(50, Math.min(100, deg));
    this.baseFov = (clamped * Math.PI) / 180;
    this.fov = this.baseFov;
  }

  triggerHitMarker() {
    this.hitMarkerTimer = 8;
  }

  render(player, map, gameState, setupPhase = false) {
    const { ctx, width, height, renderScale } = this;

    if (player.isScoped) {
      this.fov = (20 * Math.PI) / 180; // Zoom
    } else {
      this.fov = this.baseFov;
    }

    // Calcula altura dos olhos / câmera considerando Pulo e Agachar
    let eyeLevelRatio = 0.5;
    if (player.isCrouching) eyeLevelRatio = 0.35;
    if (player.jumpZ > 0) eyeLevelRatio = 0.5 + player.jumpZ * 0.4;
    
    const horizonY = Math.floor(height * eyeLevelRatio);

    // 1. Renderizar Céu Claro (Skybox) na parte superior
    if (textures.textures.sky) {
      const skyAngleOffset = (player.angle / (Math.PI * 2)) * 800;
      ctx.drawImage(textures.textures.sky, Math.floor(skyAngleOffset) % 800, 0, 800, 225, 0, 0, width, horizonY);
      if (Math.floor(skyAngleOffset) % 800 > 0) {
        ctx.drawImage(textures.textures.sky, (Math.floor(skyAngleOffset) % 800) - 800, 0, 800, 225, 0, 0, width, horizonY);
      }
    } else {
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(0, 0, width, horizonY);
    }

    // 2. Chão
    ctx.fillStyle = '#2d241c';
    ctx.fillRect(0, horizonY, width, height - horizonY);

    if (!map || !map.floors) return;
    const currentGrid = map.floors[player.floor || 0] || map.floors[0];
    const rayStep = renderScale;
    const numRays = Math.ceil(width / rayStep);
    const halfFov = this.fov / 2;

    for (let i = 0; i < numRays; i++) {
      const x = i * rayStep;
      const rayAngle = (player.angle - halfFov) + (x / width) * this.fov;
      
      let distance = 0;
      let hitWall = false;
      let wallType = 1;
      let wallX = 0;
      
      const cos = Math.cos(rayAngle);
      const sin = Math.sin(rayAngle);

      while (!hitWall && distance < 18) {
        distance += 0.03;
        const checkX = Math.floor(player.x + cos * distance);
        const checkY = Math.floor(player.y + sin * distance);

        if (checkX < 0 || checkX >= 16 || checkY < 0 || checkY >= 16) {
          hitWall = true;
          distance = 18;
        } else {
          const tile = currentGrid[checkY][checkX];
          // Paredes sólidas: 1=Parede, 2=Obstáculo, 3=Mesa Central, 6=Portão Setup (Se Ativo)
          if (tile === 1 || tile === 2 || tile === 3 || (setupPhase && tile === 6)) {
            hitWall = true;
            wallType = tile;

            const hitExactX = player.x + cos * distance;
            const hitExactY = player.y + sin * distance;
            const blockX = Math.floor(hitExactX);
            const blockY = Math.floor(hitExactY);
            if (Math.abs(hitExactX - blockX) < 0.05 || Math.abs(hitExactX - (blockX + 1)) < 0.05) {
              wallX = hitExactY - blockY;
            } else {
              wallX = hitExactX - blockX;
            }
          }
        }
      }

      const correctedDist = distance * Math.cos(rayAngle - player.angle);
      
      for (let w = 0; w < rayStep; w++) {
        if (x + w < width) this.zBuffer[x + w] = correctedDist;
      }

      const wallHeight = Math.min(height * 2, (height / correctedDist));
      const drawStart = Math.max(0, horizonY - (wallHeight * eyeLevelRatio));

      let texCanvas = textures.textures.brick;
      if (wallType === 6) {
        texCanvas = player.team === 'blue' ? textures.textures.gate_blue : textures.textures.gate_red;
      } else if (map.textureTheme && textures.textures[map.textureTheme]) {
        texCanvas = textures.textures[map.textureTheme];
      }

      const texX = Math.floor(wallX * 64) % 64;

      ctx.drawImage(
        texCanvas,
        texX, 0, 1, 64,
        x, drawStart, rayStep, wallHeight
      );

      // Sombreamento
      if (this.enableShadows) {
        const shadowOpacity = Math.min(0.8, Math.max(0, (correctedDist - 1) / 14));
        if (shadowOpacity > 0) {
          ctx.fillStyle = `rgba(0,0,0,${shadowOpacity})`;
          ctx.fillRect(x, drawStart, rayStep, wallHeight);
        }
      }
    }

    // Renderizar Sprites 2D Direcionais (Com Pulo e Agachar)
    this.renderSprites(player, gameState, horizonY);

    // Overlay da Mira Sniper ou Arma em Primeira Pessoa
    if (player.isScoped) {
      this.renderSniperScopeOverlay();
    } else {
      this.renderWeaponAndCrosshair(player);
    }
  }

  // --- RENDERIZAÇÃO DE SPRITES 2D DIRECIONAIS E CARPETES ---
  renderSprites(player, gameState, horizonY) {
    const { ctx, width, height } = this;
    const sprites = [];

    // Outros Jogadores no mesmo andar
    Object.values(gameState.players || {}).forEach(p => {
      if (p.id !== player.id && !p.isDead && (p.floor || 0) === (player.floor || 0)) {
        if (p.isInvis && p.team !== player.team) return;

        sprites.push({
          x: p.x,
          y: p.y,
          angle: p.angle,
          team: p.team,
          classKey: p.classKey,
          label: `${p.name}`,
          hp: p.hp,
          maxHp: p.maxHp,
          hasEgg: p.hasEgg,
          isMoving: p.isMoving,
          isShooting: p.isShooting,
          isCrouching: p.isCrouching,
          jumpZ: p.jumpZ || 0,
          characterSkin: p.characterSkin || 'default',
          emote: p.emote,
          isInvis: p.isInvis,
          disguiseTeam: p.disguiseTeam
        });
      }
    });

    // Coletáveis e Itens no chão do mesmo andar
    (gameState.items || []).forEach(item => {
      if ((item.floor || 0) !== (player.floor || 0)) return;
      let icon = 'sausage';
      if (item.type === 'pancake') icon = 'pancake';
      if (item.type === 'coffee') icon = 'coffee';
      if (item.type === 'bacon') icon = 'bacon';
      if (item.type === 'ammo_box') icon = 'ammo_box';
      if (item.type === 'scrambled_egg_blue') icon = 'egg_blue';
      if (item.type === 'scrambled_egg_red') icon = 'egg_red';
      if (item.type === 'hashbrown') icon = 'hashbrown';
      if (item.type === 'bomb') icon = 'bomb';

      sprites.push({ x: item.x, y: item.y, spriteKey: `item_${icon}`, label: item.type.toUpperCase(), isItem: true });
    });

    // Ordenar por distância
    sprites.sort((a, b) => Math.hypot(player.x - b.x, player.y - b.y) - Math.hypot(player.x - a.x, player.y - a.y));

    sprites.forEach(sprite => {
      const dx = sprite.x - player.x;
      const dy = sprite.y - player.y;
      
      let spriteAngle = Math.atan2(dy, dx) - player.angle;
      while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
      while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;

      const dist = Math.hypot(dx, dy);
      if (dist > 0.3 && dist < 16 && Math.abs(spriteAngle) < this.fov / 2 + 0.3) {
        const screenX = (width / 2) + Math.tan(spriteAngle) * (width / 2);
        const spriteSize = Math.min(height, height / dist);
        const stripeX = Math.floor(screenX);

        if (stripeX >= 0 && stripeX < width && this.zBuffer[stripeX] > dist) {
          ctx.save();
          
          let spriteCanvas = null;

          if (sprite.isItem) {
            spriteCanvas = textures.sprites[sprite.spriteKey];
          } else {
            const angleToPlayer = Math.atan2(sprite.y - player.y, sprite.x - player.x);
            let relAngle = sprite.angle - angleToPlayer;
            while (relAngle < -Math.PI) relAngle += Math.PI * 2;
            while (relAngle > Math.PI) relAngle -= Math.PI * 2;

            let dir = 'front';
            if (Math.abs(relAngle) < Math.PI / 4) dir = 'back';
            else if (Math.abs(relAngle) > 3 * Math.PI / 4) dir = 'front';
            else if (relAngle > 0) dir = 'side_right';
            else dir = 'side_left';

            const walkFrame = sprite.isMoving ? Math.floor(Date.now() / 180) % 2 : 0;
            const isShooting = sprite.isShooting ? 1 : 0;
            const displayTeam = sprite.disguiseTeam || sprite.team;
            const skin = sprite.characterSkin || 'default';

            const key = `player_${displayTeam}_${sprite.classKey}_${dir}_${walkFrame}_${isShooting}_${skin}`;
            spriteCanvas = textures.sprites[key] || textures.sprites[`player_${displayTeam}_${sprite.classKey}_${dir}_0_0_default`];

            if (sprite.isInvis) ctx.globalAlpha = 0.4;
          }

          if (spriteCanvas) {
            let drawW = spriteSize * 0.8;
            let drawH = spriteSize * 0.8;
            
            // Compressão de altura se estiver Agachado
            if (sprite.isCrouching) drawH *= 0.65;

            // Offset Y para Pulo
            const jumpYOffset = (sprite.jumpZ || 0) * (height / dist);
            const drawY = horizonY - (drawH / 2) - jumpYOffset + (spriteSize * 0.1);

            ctx.drawImage(
              spriteCanvas,
              screenX - drawW / 2, drawY,
              drawW, drawH
            );
          }

          // Nome e Barra de Vida
          if (!sprite.isItem) {
            const barW = Math.max(32, spriteSize * 0.5);
            const barY = horizonY - (spriteSize * 0.4) - ((sprite.jumpZ || 0) * (height / dist));
            
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(screenX - barW/2 - 2, barY - 2, barW + 4, 8);
            ctx.fillStyle = sprite.hp > sprite.maxHp * 0.3 ? '#00ff66' : '#ff3300';
            ctx.fillRect(screenX - barW/2, barY, barW * (sprite.hp / sprite.maxHp), 4);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(sprite.label, screenX, barY - 8);

            if (sprite.hasEgg) {
              ctx.fillText('🍳 OVO ROUBADO!', screenX, barY - 20);
            }
          }

          ctx.restore();
        }
      }
    });
  }

  renderSniperScopeOverlay() {
    const { ctx, width, height } = this;
    const cX = width / 2;
    const cY = height / 2;
    const scopeRadius = height * 0.42;

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(cX, cY, scopeRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cX, cY, scopeRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ff3300';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cX - scopeRadius, cY); ctx.lineTo(cX + scopeRadius, cY);
    ctx.moveTo(cX, cY - scopeRadius); ctx.lineTo(cX, cY + scopeRadius);
    ctx.stroke();

    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(cX, cY, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // --- RENDERIZAÇÃO DE ARMAS 2.5D EM 1ª PESSOA COM SKINS ---
  renderWeaponAndCrosshair(player) {
    const { ctx, width, height } = this;

    const bobScale = player.isRunning ? 1.8 : 1.0;
    const bobX = Math.cos(this.weaponBob) * 12 * bobScale;
    const bobY = Math.abs(Math.sin(this.weaponBob)) * 10 * bobScale;
    const recoilY = this.recoil > 0 ? -18 : 0;
    if (this.recoil > 0) this.recoil--;

    let weaponX = width / 2 + bobX;
    let weaponY = height - 110 + bobY + recoilY;

    if (player.isReloading) weaponY += 45;

    const weaponSkin = player.weaponSkin || 'default';
    let barrelColor = '#222222';
    if (weaponSkin === 'gold') barrelColor = '#ffd700';
    if (weaponSkin === 'lava') barrelColor = '#ff3300';
    if (weaponSkin === 'chrome') barrelColor = '#e0e0e0';

    ctx.save();
    
    const slot = player.activeSlot || 1;
    if (slot === 3) {
      // Slot 3: Melee
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(weaponX + 20, weaponY - 20, 12, 90);
      ctx.fillStyle = barrelColor;
      ctx.beginPath();
      ctx.moveTo(weaponX + 26, weaponY - 60);
      ctx.lineTo(weaponX + 38, weaponY - 10);
      ctx.lineTo(weaponX + 14, weaponY - 10);
      ctx.closePath();
      ctx.fill();
    } else if (slot === 2) {
      // Slot 2: Pistola
      ctx.fillStyle = barrelColor;
      ctx.fillRect(weaponX - 8, weaponY, 16, 80);
      ctx.fillRect(weaponX - 6, weaponY - 25, 12, 30);
    } else {
      // Slot 1: Principal
      ctx.fillStyle = barrelColor;
      ctx.fillRect(weaponX - 18, weaponY, 36, 120);
      ctx.fillStyle = '#444444';
      ctx.fillRect(weaponX - 10, weaponY - 35, 20, 45);

      if (this.recoil > 2) {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(weaponX, weaponY - 40, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Crosshair
    ctx.strokeStyle = this.hitMarkerTimer > 0 ? '#ff0000' : '#00ffcc';
    ctx.lineWidth = 2;
    const cX = width / 2;
    const cY = height / 2;
    
    ctx.beginPath();
    ctx.moveTo(cX - 8, cY); ctx.lineTo(cX + 8, cY);
    ctx.moveTo(cX, cY - 8); ctx.lineTo(cX, cY + 8);
    ctx.stroke();

    if (this.hitMarkerTimer > 0) {
      this.hitMarkerTimer--;
      ctx.strokeStyle = '#ff0000';
      ctx.beginPath();
      ctx.moveTo(cX - 6, cY - 6); ctx.lineTo(cX + 6, cY + 6);
      ctx.moveTo(cX + 6, cY - 6); ctx.lineTo(cX - 6, cY + 6);
      ctx.stroke();
    }
  }
}
