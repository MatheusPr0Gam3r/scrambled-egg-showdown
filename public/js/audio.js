// Sintetizador de Efeitos Sonoros Retrô e Gritos Engraçados (Web Audio API sem dependências)
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.masterVolume = 0.5;
    this.sfxVolume = 0.8;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  setVolumes(master, sfx) {
    this.masterVolume = Math.max(0, Math.min(1, master));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
  }

  playTone(freq, type, duration, startVol = 1, endVol = 0) {
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const totalVol = this.masterVolume * this.sfxVolume * startVol;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(totalVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, endVol), this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { console.error(e); }
  }

  playShoot(classKey) {
    this.init();
    if (classKey === 'soldier' || classKey === 'demoman') {
      this.playTone(120, 'sawtooth', 0.3, 0.9, 0.01);
    } else if (classKey === 'pyro') {
      this.playTone(300, 'sine', 0.1, 0.4, 0.05);
    } else if (classKey === 'heavy') {
      this.playTone(180, 'square', 0.08, 0.6, 0.01);
    } else if (classKey === 'sniper') {
      this.playTone(800, 'square', 0.25, 1.0, 0.01);
    } else if (classKey === 'medic') {
      this.playTone(500, 'sine', 0.12, 0.5, 0.01);
    } else {
      this.playTone(350, 'triangle', 0.1, 0.7, 0.01);
    }
  }

  playHitMarker() {
    this.playTone(1200, 'sine', 0.05, 0.6, 0.01);
  }

  playHurt() {
    this.playTone(150, 'sawtooth', 0.2, 0.8, 0.01);
  }

  playDeath() {
    this.playTone(80, 'sawtooth', 0.6, 1.0, 0.01);
  }

  // --- GRITOS ENGRAÇADOS DE MORTE (DEATH SCREAMS) ---
  playDeathScream(type = 'default') {
    this.init();
    if (!this.ctx) return;

    if (type === 'scream_goat') {
      // Grito do Bode (Baa-aa-ah!)
      this.playTone(450, 'sawtooth', 0.15, 0.9, 0.5);
      setTimeout(() => this.playTone(320, 'sawtooth', 0.3, 0.8, 0.01), 120);
    } else if (type === 'scream_high') {
      // Grito Agudo Agonizante
      this.playTone(1200, 'sine', 0.4, 1.0, 0.01);
    } else if (type === 'scream_duck') {
      // Grito do Pato de Borracha (Quack/Squeak)
      this.playTone(850, 'square', 0.08, 0.8, 0.01);
      setTimeout(() => this.playTone(1100, 'square', 0.12, 0.8, 0.01), 60);
    } else if (type === 'scream_opera') {
      // Grito Dramático de Ópera
      this.playTone(650, 'triangle', 0.2, 0.8, 0.6);
      setTimeout(() => this.playTone(520, 'triangle', 0.2, 0.8, 0.4), 180);
      setTimeout(() => this.playTone(390, 'triangle', 0.4, 0.8, 0.01), 360);
    } else if (type === 'scream_retro') {
      // Explosão de Morte Retro 8-bit
      this.playTone(200, 'square', 0.1, 0.8, 0.01);
      setTimeout(() => this.playTone(100, 'square', 0.2, 0.8, 0.01), 80);
    } else if (type === 'scream_goofy') {
      // Grito Pateta (Wilhelm Slide)
      this.playTone(700, 'sawtooth', 0.15, 0.9, 0.7);
      setTimeout(() => this.playTone(300, 'sawtooth', 0.25, 0.7, 0.01), 140);
    } else {
      this.playDeath();
    }
  }

  // --- SONS DE ROLETA E UNBOXING DA LOJA ---
  playRouletteTick() {
    this.playTone(800, 'sine', 0.03, 0.4, 0.01);
  }

  playUnboxWin() {
    this.playTone(523, 'triangle', 0.12, 0.8, 0.4); // C5
    setTimeout(() => this.playTone(659, 'triangle', 0.12, 0.8, 0.4), 100); // E5
    setTimeout(() => this.playTone(783, 'triangle', 0.12, 0.8, 0.4), 200); // G5
    setTimeout(() => this.playTone(1046, 'triangle', 0.4, 1.0, 0.01), 300); // C6
  }

  playPodiumFanfare() {
    this.playTone(440, 'square', 0.15, 0.8, 0.4);
    setTimeout(() => this.playTone(554, 'square', 0.15, 0.8, 0.4), 150);
    setTimeout(() => this.playTone(659, 'square', 0.15, 0.8, 0.4), 300);
    setTimeout(() => this.playTone(880, 'square', 0.5, 1.0, 0.01), 450);
  }

  playPickup() {
    this.playTone(600, 'sine', 0.1, 0.5, 0.01);
    setTimeout(() => this.playTone(900, 'sine', 0.15, 0.5, 0.01), 60);
  }

  playAmmoPickup() {
    this.playTone(400, 'square', 0.08, 0.6, 0.01);
    setTimeout(() => this.playTone(800, 'square', 0.12, 0.6, 0.01), 80);
  }

  playReload() {
    this.playTone(250, 'sawtooth', 0.1, 0.5, 0.01);
    setTimeout(() => this.playTone(450, 'triangle', 0.15, 0.5, 0.01), 150);
  }

  playSwitchWeapon() {
    this.playTone(500, 'sine', 0.06, 0.4, 0.01);
  }

  playScope() {
    this.playTone(900, 'sine', 0.08, 0.5, 0.01);
  }

  playGateOpen() {
    this.playTone(220, 'square', 0.4, 0.8, 0.01);
    setTimeout(() => this.playTone(440, 'square', 0.5, 0.8, 0.01), 200);
  }

  playEmote() {
    this.playTone(700, 'triangle', 0.15, 0.7, 0.01);
    setTimeout(() => this.playTone(1000, 'triangle', 0.2, 0.7, 0.01), 100);
  }
}

const soundSystem = new SoundSystem();
