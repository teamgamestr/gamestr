import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startScoreBot, stopScoreBot, getBotStatus } from './server/scoreBot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const distPath = join(__dirname, 'dist');

if (!existsSync(distPath)) {
  console.error('Error: dist folder not found. Please run "npm run build" first.');
  process.exit(1);
}

const configPath = join(distPath, 'game-config.json');
let GAME_CONFIG = {};
let FALLBACK_METADATA = {
  name: "Unknown Game",
  description: "No description available.",
  image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800",
};

let GAMES_BY_IDENTIFIER = {};

if (existsSync(configPath)) {
  const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
  GAME_CONFIG = configData.games || {};
  GAMES_BY_IDENTIFIER = configData.gamesByIdentifier || {};
  FALLBACK_METADATA = configData.fallback || FALLBACK_METADATA;
  console.log(`Loaded game config with ${Object.keys(GAME_CONFIG).length} games`);
} else {
  console.warn('Warning: game-config.json not found, using fallback metadata for all games');
}

function getGameMetadataByIdentifier(gameIdentifier) {
  return GAMES_BY_IDENTIFIER[gameIdentifier] || FALLBACK_METADATA;
}

function injectMetaTags(html, metadata, url) {
  const title = metadata.name === "Unknown Game" 
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

const indexHtml = readFileSync(join(distPath, 'index.html'), 'utf-8');

const STATIC_ROUTES = ['/score', '/player', '/developers', '/messages', '/api', '/assets'];
const NIP19_PREFIXES = ['npub1', 'note1', 'nevent1', 'nprofile1', 'naddr1'];

app.get('/game/:pubkey/:gameIdentifier', (req, res) => {
  res.redirect(301, `/${req.params.gameIdentifier}`);
});

app.get('/api/bot/status', (req, res) => {
  const status = getBotStatus();
  res.json(status);
});

app.use(express.static(distPath));

app.use((req, res) => {
  res.set('Cache-Control', 'no-cache');

  const path = req.path;
  if (path === '/') {
    return res.send(indexHtml);
  }

  const slug = path.slice(1).split('/')[0];
  const isStaticRoute = STATIC_ROUTES.some(r => path.startsWith(r));
  const isNip19 = NIP19_PREFIXES.some(p => slug.startsWith(p));

  if (!isStaticRoute && !isNip19 && slug && GAMES_BY_IDENTIFIER[slug]) {
    const metadata = getGameMetadataByIdentifier(slug);
    const url = `https://gamestr.io/${slug}`;
    const html = injectMetaTags(indexHtml, metadata, url);
    return res.send(html);
  }

  res.send(indexHtml);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  stopScoreBot();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  stopScoreBot();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  
  // Start the score bot
  try {
    await startScoreBot();
  } catch (error) {
    console.error('Failed to start score bot:', error.message);
  }
});
