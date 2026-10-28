// Sprites and the small "script" helpers that drive them.
//
// Positions use stage coordinates: (0, 0) is the centre of the 480x360 stage,
// x grows to the right and y grows upwards.

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;

class Sprite {
  /**
   * @param {HTMLImageElement[]} frames animation frames
   * @param {object} options x, y, size (percent), resolution (2 for hi-res PNGs),
   *                         frameDelay (seconds per frame)
   */
  constructor(frames, options = {}) {
    this.frames = frames;
    this.frame = 0;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.size = options.size ?? 100;
    this.resolution = options.resolution ?? 1;
    this.frameDelay = options.frameDelay ?? 0;
    this.visible = options.visible ?? true;
    this.frameTimer = 0;
  }

  get image() {
    return this.frames[this.frame];
  }

  get width() {
    return (this.image.naturalWidth / this.resolution) * (this.size / 100);
  }

  get height() {
    return (this.image.naturalHeight / this.resolution) * (this.size / 100);
  }

  update(dt) {
    if (this.frameDelay <= 0 || this.frames.length < 2) return;
    this.frameTimer += dt;
    while (this.frameTimer >= this.frameDelay) {
      this.frameTimer -= this.frameDelay;
      this.frame = (this.frame + 1) % this.frames.length;
    }
  }

  /** Axis-aligned box around the whole drawn image. */
  bounds() {
    const w = this.width;
    const h = this.height;
    return { left: this.x - w / 2, right: this.x + w / 2, bottom: this.y - h / 2, top: this.y + h / 2 };
  }

  /** True if the stage point (px, py) lands on a non-transparent pixel of this sprite. */
  isSolidAt(px, py) {
    const b = this.bounds();
    const u = (px - b.left) / (b.right - b.left);
    const v = (b.top - py) / (b.top - b.bottom);
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const mask = getAlphaMask(this.image);
    if (!mask) return true;
    return mask.data[Math.floor(v * mask.height) * mask.width + Math.floor(u * mask.width)] === 1;
  }

  /**
   * Pixel-perfect collision, like Scratch's "touching" block: first check that
   * the boxes overlap, then look for a stage point that is solid in both images.
   */
  touches(other) {
    if (!this.visible || !other.visible) return false;
    const a = this.bounds();
    const b = other.bounds();
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const bottom = Math.max(a.bottom, b.bottom);
    const top = Math.min(a.top, b.top);
    if (left >= right || bottom >= top) return false;

    for (let py = bottom + 0.5; py < top; py += 1) {
      for (let px = left + 0.5; px < right; px += 1) {
        if (this.isSolidAt(px, py) && other.isSolidAt(px, py)) return true;
      }
    }
    return false;
  }

  /** Keep the sprite's centre inside the stage. */
  keepOnStage() {
    const halfW = STAGE_WIDTH / 2;
    const halfH = STAGE_HEIGHT / 2;
    this.x = Math.max(-halfW, Math.min(halfW, this.x));
    this.y = Math.max(-halfH, Math.min(halfH, this.y));
  }

  draw(ctx) {
    if (!this.visible) return;
    const w = this.width;
    const h = this.height;
    const screenX = this.x + STAGE_WIDTH / 2;
    const screenY = STAGE_HEIGHT / 2 - this.y;
    ctx.drawImage(this.image, screenX - w / 2, screenY - h / 2, w, h);
  }
}

// ---------------------------------------------------------------------------
// Alpha masks
//
// Each image is drawn once onto an off-screen canvas and its transparency is
// stored as 1 (solid) or 0 (see-through). Tiny SVGs are drawn larger first so
// their outlines stay accurate.

const alphaMasks = new Map();

function getAlphaMask(image) {
  if (alphaMasks.has(image)) return alphaMasks.get(image);

  const scale = Math.max(1, Math.ceil(128 / Math.max(image.naturalWidth, image.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth * scale;
  canvas.height = image.naturalHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let mask = null;
  try {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const data = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i++) data[i] = pixels[i * 4 + 3] > 50 ? 1 : 0;
    mask = { width: canvas.width, height: canvas.height, data };
  } catch (err) {
    // Opened from file:// the browser hides pixel data; fall back to box collision.
    mask = null;
  }
  alphaMasks.set(image, mask);
  return mask;
}

// ---------------------------------------------------------------------------
// Scripts
//
// Each sprite behaviour is written as a generator function, so it reads like a
// sequence of steps ("wait 2 seconds, then glide..."). Every frame the game
// calls script.next(dt); a script pauses at each `yield` until the next frame.

function* wait(seconds) {
  let elapsed = 0;
  while (elapsed < seconds) {
    elapsed += yield;
  }
}

function* glide(sprite, toX, toY, seconds) {
  const fromX = sprite.x;
  const fromY = sprite.y;
  let elapsed = 0;
  while (elapsed < seconds) {
    elapsed += yield;
    const t = Math.min(1, elapsed / seconds);
    sprite.x = fromX + (toX - fromX) * t;
    sprite.y = fromY + (toY - fromY) * t;
  }
}

function randomBetween(from, to) {
  return from + Math.random() * (to - from);
}

function randomStagePoint() {
  return { x: randomBetween(-240, 240), y: randomBetween(-150, 150) };
}
