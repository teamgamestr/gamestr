import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const GAME_CONFIG = {
  "c70f635895bf0cade4f4c80863fe662a1d6e72153c9be357dc5fa5064c3624de:blockstr": {
    name: "blockstr",
    description: "Classic 8-bit Tetris with a timechain twist!",
    image: "https://i.nostr.build/rwl4S2TucTObXR3T.webp",
  },
  "6c95ab59b0ebf56296f45b8b52b9b0f2599029c173a8c5fd463ef0a474995fcc:space-zappers": {
    name: "Space Zappers",
    description: "A retro Space Invaders arcade game. Pay 21 sats to play. Publish your high scores to the decentralized Nostr leaderboard",
    image: "https://www.spacezappers.com/og-image.png",
  },
  "test-developer-pubkey-1234567890abcdef:snake-game": {
    name: "Classic Snake",
    description: "The timeless arcade classic! Eat apples, grow longer, and avoid hitting yourself.",
    image: "https://images.pexels.com/photos/163036/mario-luigi-yoschi-figures-163036.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "test-developer-pubkey-1234567890abcdef:tetris-clone": {
    name: "Block Puzzle Master",
    description: "Stack falling blocks to clear lines and rack up massive combos.",
    image: "https://images.pexels.com/photos/371924/pexels-photo-371924.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "test-developer-pubkey-1234567890abcdef:speed-racer": {
    name: "Speed Racer 3D",
    description: "Hit the track in this high-octane racing game.",
    image: "https://images.pexels.com/photos/1202723/pexels-photo-1202723.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "test-developer-pubkey-1234567890abcdef:match-three": {
    name: "Gem Crusher",
    description: "Match colorful gems in this addictive puzzle game.",
    image: "https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
  "test-developer-pubkey-1234567890abcdef:space-shooter": {
    name: "Galaxy Defender",
    description: "Defend the galaxy from alien invaders in this intense space shooter!",
    image: "https://images.pexels.com/photos/2156/sky-earth-space-working.jpg?auto=compress&cs=tinysrgb&w=800",
  },
  "test-developer-pubkey-1234567890abcdef:platformer": {
    name: "Jump Quest",
    description: "A classic platformer adventure. Jump, run, and collect coins!",
    image: "https://images.pexels.com/photos/163077/mario-yoschi-figures-funny-163077.jpeg?auto=compress&cs=tinysrgb&w=800",
  },
};

const FALLBACK_METADATA = {
  name: "Gamestr",
  description: "Compete, share, and celebrate your gaming achievements on the decentralized web.",
  image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800",
};

function getGameMetadata(pubkey, gameIdentifier) {
  const key = `${pubkey}:${gameIdentifier}`;
  return GAME_CONFIG[key] || FALLBACK_METADATA;
}

function injectMetaTags(html, metadata, url) {
  const title = metadata.name === "Gamestr" 
    ? "Gamestr - Decentralized Gaming Leaderboards on Nostr"
    : `${metadata.name} Leaderboard - Gamestr`;
  const description = metadata.description;
  const image = metadata.image;

  let modifiedHtml = html
    .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description}"`)
    .replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${image}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${description}"`)
    .replace(/<meta name="twitter:image" content="[^"]*"/, `<meta name="twitter:image" content="${image}"`);

  return modifiedHtml;
}

const distPath = join(__dirname, 'dist');

if (!existsSync(distPath)) {
  console.error('Error: dist folder not found. Please run "npm run build" first.');
  process.exit(1);
}

const indexHtml = readFileSync(join(distPath, 'index.html'), 'utf-8');

app.get('/game/:pubkey/:gameIdentifier', (req, res) => {
  const { pubkey, gameIdentifier } = req.params;
  const metadata = getGameMetadata(pubkey, gameIdentifier);
  const url = `https://gamestr.io/game/${pubkey}/${gameIdentifier}`;
  const html = injectMetaTags(indexHtml, metadata, url);
  res.set('Cache-Control', 'no-cache');
  res.send(html);
});

app.use(express.static(distPath));

app.use((req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.send(indexHtml);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
