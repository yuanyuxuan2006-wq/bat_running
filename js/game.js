// Bat Running: fly the bat with WASD or the arrow keys, collect balls and
// butterflies for points, and dodge the saw, lightning and broom traps.

const START_HP = 5;
const BAT_SPEED = 150;            // stage units per second
const HIT_INVINCIBLE_SECONDS = 3;
const ITEM_RESPAWN_SECONDS = 3;

// Score needed to reach level 2, 3 and 4, with the bonus and message for each.
const LEVELS = [
  { score: 100, bonus: 20, message: 'Excellent, level 2!' },
  { score: 300, bonus: 50, message: 'Perfect, level 3!' },
  { score: 600, bonus: 180, message: 'Unbelievable, level 4!' },
];

class Game {
  constructor(canvas, assets) {
    this.ctx = canvas.getContext('2d');
    this.ctx.setTransform(canvas.width / STAGE_WIDTH, 0, 0, canvas.height / STAGE_HEIGHT, 0, 0);
    this.assets = assets;
    this.keys = new Set();
    this.state = 'start';
    this.lastTime = null;

    this.bindInput(canvas);
    this.reset();
    requestAnimationFrame(time => this.loop(time));
  }

  bindInput(canvas) {
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      this.keys.add(key);
      if (key === ' ' || key === 'enter' || key === 'r') this.startIfWaiting();
      if (key.startsWith('arrow') || key === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    canvas.addEventListener('click', () => this.startIfWaiting());
  }

  startIfWaiting() {
    if (this.state === 'playing') return;
    if (this.state === 'over') this.reset();
    this.state = 'playing';
  }

  reset() {
    const img = this.assets.images;

    this.score = 0;
    this.distance = 0;
    this.hp = START_HP;
    this.level = 1;
    this.invincible = 0;
    this.speech = null;           // { text, timeLeft } shown above the bat
    this.banner = null;           // { text, timeLeft } shown mid-screen

    this.bat = new Sprite(img.bat, { x: -150, y: 0, size: 500, frameDelay: 0.19 });

    this.items = [
      { sprite: new Sprite(img.ball, { x: -38, y: 28, size: 50 }), points: 10 },
      { sprite: new Sprite(img.butterfly, { x: 60, y: -60, size: 25 }), points: 20 },
    ];

    this.lightningA = new Sprite(img.lightning, { x: 57, y: -43, size: 500, resolution: 2, frameDelay: 0.11 });
    this.lightningB = new Sprite(img.lightning, { x: -199, y: -28, size: 550, resolution: 2, frameDelay: 0.11, visible: false });
    this.saw = new Sprite(img.saw, { x: 54, y: 149, size: 800, resolution: 2, frameDelay: 0.2 });
    this.broom = new Sprite(img.broom, { x: 190, y: 0, size: 30, visible: false });
    this.traps = [this.lightningA, this.lightningB, this.saw, this.broom];

    this.scripts = [
      this.everySecondScript(),
      this.batDriftScript(),
      this.lightningAScript(),
      this.lightningBScript(),
      this.sawGrowScript(),
      this.sawMoveScript(),
      this.broomScript(),
    ];
  }

  // --- Scripts --------------------------------------------------------------

  *everySecondScript() {
    while (true) {
      yield* wait(1);
      this.score += 1;
      this.distance += 1;
    }
  }

  // The bat slowly sinks unless the player keeps it up.
  *batDriftScript() {
    yield* wait(2);
    while (true) {
      yield* wait(0.29);
      this.bat.y -= 1;
    }
  }

  // Wanders the stage; from score 120 it grows bigger, from 310 it moves faster.
  *lightningAScript() {
    while (true) {
      const p = randomStagePoint();
      if (this.score < 120) {
        yield* glide(this.lightningA, p.x, p.y, 6);
        yield* wait(3);
      } else if (this.score < 310) {
        yield* glide(this.lightningA, p.x, p.y, 5);
        yield* wait(2);
        this.lightningA.size = Math.max(this.lightningA.size, 600);
      } else {
        yield* glide(this.lightningA, p.x, p.y, 5);
        yield* wait(1);
      }
      yield;
    }
  }

  // A second lightning trap joins in from score 300.
  *lightningBScript() {
    while (this.score < 300) yield;
    this.lightningB.visible = true;
    while (true) {
      const p = randomStagePoint();
      yield* glide(this.lightningB, p.x, p.y, 5);
      if (this.score < 600 && this.lightningB.size < 690) {
        yield* wait(2);
        this.lightningB.size += 50;
      }
      yield;
    }
  }

  // The saw hangs from the ceiling and grows between score 200 and 400.
  *sawGrowScript() {
    while (true) {
      if (this.score > 200 && this.score < 400 && this.saw.size < 1100) {
        this.saw.size += 10;
        yield* wait(3);
      }
      yield;
    }
  }

  // From score 350 the saw slides along the ceiling.
  *sawMoveScript() {
    while (this.score <= 350) yield;
    while (true) {
      yield* glide(this.saw, randomBetween(-240, 240), 149, 8);
      yield;
    }
  }

  // Every ten seconds a broom appears on the right and sweeps across the stage.
  *broomScript() {
    while (true) {
      yield* wait(7);
      this.broom.x = 190;
      this.broom.y = randomBetween(-150, 150);
      this.broom.visible = true;
      yield* wait(3);
      while (this.broom.x > -STAGE_WIDTH / 2 - this.broom.width / 2) {
        const dt = yield;
        this.broom.x -= 240 * dt;
      }
      this.broom.visible = false;
    }
  }

  // --- Update ---------------------------------------------------------------

  loop(time) {
    const dt = this.lastTime === null ? 0 : Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.state === 'playing') this.update(dt);
    this.draw();

    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.moveBat(dt);
    // Run every script one step; drop the ones that have finished.
    this.scripts = this.scripts.filter(script => !script.next(dt).done);
    for (const sprite of [this.bat, ...this.traps, ...this.items.map(i => i.sprite)]) sprite.update(dt);

    this.collectItems();
    this.checkTraps(dt);
    this.checkLevelUp();
    this.tickMessages(dt);

    if (this.hp <= 0) {
      this.state = 'over';
      this.speech = { text: 'Game over', timeLeft: Infinity };
    }
  }

  moveBat(dt) {
    const k = this.keys;
    const step = BAT_SPEED * dt;
    if (k.has('a') || k.has('arrowleft')) this.bat.x -= step;
    if (k.has('d') || k.has('arrowright')) this.bat.x += step;
    if (k.has('s') || k.has('arrowdown')) this.bat.y -= step;
    if (k.has('w') || k.has('arrowup')) this.bat.y += step;
    this.bat.keepOnStage();
  }

  collectItems() {
    for (const item of this.items) {
      if (!this.bat.touches(item.sprite)) continue;
      this.score += item.points;
      this.playSound('pop');
      item.sprite.visible = false;
      // Bring the item back somewhere new after a short delay.
      this.scripts.push((function* () {
        yield* wait(ITEM_RESPAWN_SECONDS);
        const p = randomStagePoint();
        item.sprite.x = p.x;
        item.sprite.y = p.y;
        item.sprite.visible = true;
      })());
    }
  }

  checkTraps(dt) {
    if (this.invincible > 0) {
      this.invincible -= dt;
      return;
    }
    if (!this.traps.some(trap => this.bat.touches(trap))) return;

    this.hp -= 1;
    this.invincible = HIT_INVINCIBLE_SECONDS;
    this.speech = { text: 'Oh, no!', timeLeft: 2 };
    this.playSound('boing');
  }

  checkLevelUp() {
    const next = LEVELS[this.level - 1];
    if (!next || this.score < next.score) return;
    this.level += 1;
    this.score += next.bonus;
    this.banner = { text: next.message, timeLeft: 2 };
  }

  tickMessages(dt) {
    for (const key of ['speech', 'banner']) {
      if (!this[key]) continue;
      this[key].timeLeft -= dt;
      if (this[key].timeLeft <= 0) this[key] = null;
    }
  }

  playSound(name) {
    const sound = this.assets.sounds[name].cloneNode();
    sound.volume = 0.6;
    sound.play().catch(() => {});
  }

  // --- Drawing --------------------------------------------------------------

  draw() {
    const ctx = this.ctx;
    const backdrop = this.assets.images.backdrops[this.level - 1];
    ctx.drawImage(backdrop, 0, 0, STAGE_WIDTH, STAGE_HEIGHT);

    for (const item of this.items) item.sprite.draw(ctx);
    for (const trap of this.traps) trap.draw(ctx);

    // Blink while invincible after a hit.
    const blinking = this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0;
    if (!blinking) this.bat.draw(ctx);

    this.drawHud();
    if (this.speech) this.drawSpeech(this.speech.text);
    if (this.banner) this.drawCentreText(this.banner.text, 22, STAGE_HEIGHT / 2 - 40);

    if (this.state === 'start') {
      this.drawOverlay('Bat Running', 'WASD / arrow keys to fly · click or press Space to start');
    } else if (this.state === 'over') {
      this.drawOverlay('Game Over', `Score ${this.score} · Distance ${this.distance} · press R to play again`);
    }
  }

  drawHud() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(6, 6, 150, 58);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${this.score}`, 14, 12);
    ctx.fillText(`Distance: ${this.distance}   Level ${this.level}`, 14, 28);
    ctx.fillStyle = '#ff5b6e';
    ctx.fillText('♥'.repeat(Math.max(0, this.hp)) + '♡'.repeat(START_HP - Math.max(0, this.hp)), 14, 44);
  }

  drawSpeech(text) {
    const ctx = this.ctx;
    const x = this.bat.x + STAGE_WIDTH / 2;
    const y = STAGE_HEIGHT / 2 - this.bat.y - this.bat.height / 2 - 14;
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 12, w, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  drawCentreText(text, size, y) {
    const ctx = this.ctx;
    ctx.font = `bold ${size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, STAGE_WIDTH / 2, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(text, STAGE_WIDTH / 2, y);
  }

  drawOverlay(title, subtitle) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    this.drawCentreText(title, 36, STAGE_HEIGHT / 2 - 20);
    this.drawCentreText(subtitle, 12, STAGE_HEIGHT / 2 + 20);
  }
}

loadAssets()
  .then(assets => new Game(document.getElementById('stage'), assets))
  .catch(err => {
    document.body.style.color = '#fff';
    document.body.textContent = `Failed to load the game: ${err.message}`;
  });
