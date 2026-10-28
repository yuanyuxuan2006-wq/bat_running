# Bat Running

A 2D arcade game written in plain JavaScript and HTML5 Canvas. Fly a bat around the stage, collect items for points, and dodge traps that get harder as your score rises.

Originally prototyped in Scratch, then rewritten in JavaScript.

## How to play

| Key | Action |
| --- | --- |
| W A S D / arrow keys | Fly |
| Space / Enter / click | Start |
| R | Play again after game over |

- Ball: +10 points. Butterfly: +20 points. Each item respawns somewhere new after 3 seconds.
- You gain 1 point and 1 distance every second.
- You have 5 HP. Touching a saw, lightning trap or broom costs 1 HP, followed by 3 seconds of invincibility.
- Levels 2, 3 and 4 unlock at 100, 300 and 600 points, each with a new backdrop and a score bonus.
- Traps scale with your score: the lightning trap grows, a second one appears at 300, the saw grows and starts sliding along the ceiling, and a broom sweeps across every ten seconds.

## Running it

Browsers block some features when a page is opened straight from disk, so serve the folder locally:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Code structure

```text
index.html       canvas and script tags
js/assets.js     loads images and sounds before the game starts
js/sprites.js    Sprite class (drawing, animation, hit boxes) and script helpers
js/game.js       Game class: input, game loop, scoring, levels, traps, HUD
assets/          backdrops, sprite frames and sounds
scratch-prototype/  the original Scratch version, exported to HTML
```

Each sprite's behaviour is a JavaScript generator function, for example "glide to a random point over 5 seconds, then wait 2 seconds". The game loop advances every generator once per frame with the elapsed time, so timed behaviours read as simple step-by-step code instead of nested timers.
