// Loads every image and sound the game needs before it starts.

const IMAGE_PATHS = {
  backdrops: ['galaxy', 'arctic', 'mountain', 'nebula'].map(n => `assets/backdrops/${n}.png`),
  bat: range(1, 8).map(i => `assets/bat/bat${i}.svg`),
  ball: ['assets/items/ball.svg'],
  butterfly: ['assets/items/butterfly.svg'],
  broom: ['assets/traps/broom.svg'],
  lightning: range(1, 7).map(i => `assets/traps/lightning${i}.png`),
  saw: range(1, 10).map(i => `assets/traps/saw${i}.png`),
};

const SOUND_PATHS = {
  pop: 'assets/sounds/pop.wav',
  boing: 'assets/sounds/boing.wav',
};

function range(from, to) {
  const result = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${path}`));
    img.src = path;
  });
}

// Resolves to { images: { bat: [Image, ...], ... }, sounds: { pop: Audio, ... } }.
async function loadAssets() {
  const images = {};
  for (const [name, paths] of Object.entries(IMAGE_PATHS)) {
    images[name] = await Promise.all(paths.map(loadImage));
  }

  const sounds = {};
  for (const [name, path] of Object.entries(SOUND_PATHS)) {
    sounds[name] = new Audio(path);
  }

  return { images, sounds };
}
