import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const gameConfigPath = join(rootDir, 'src/lib/gameConfig.ts');
const outputPath = join(rootDir, 'dist/game-config.json');

const tsContent = readFileSync(gameConfigPath, 'utf-8');

const configMatch = tsContent.match(/export const INITIAL_GAME_CONFIG:\s*GameConfigMap\s*=\s*(\{[\s\S]*?\n\};)/);

if (!configMatch) {
  console.error('Could not find INITIAL_GAME_CONFIG in gameConfig.ts');
  process.exit(1);
}

let configStr = configMatch[1];

configStr = configStr.replace(/\/\/.*$/gm, '');
configStr = configStr.replace(/\/\*[\s\S]*?\*\//g, '');
configStr = configStr.replace(/,(\s*[}\]])/g, '$1');
configStr = configStr.replace(/(\w+):/g, '"$1":');
configStr = configStr.replace(/"(\w+)":/g, (match, key) => {
  if (key.includes('-') || key.length === 64) {
    return match;
  }
  return `"${key}":`;
});

const games = {};
const gameRegex = /"([^"]+)":\s*\{([^}]+)\}/g;
let match;

while ((match = gameRegex.exec(tsContent)) !== null) {
  const key = match[1];
  const content = match[2];
  
  if (!key.includes(':')) continue;
  
  const nameMatch = content.match(/name:\s*"([^"]+)"/);
  const descMatch = content.match(/description:\s*"([^"]+)"/);
  const imageMatch = content.match(/image:\s*"([^"]+)"/);
  
  if (nameMatch && imageMatch) {
    games[key] = {
      name: nameMatch[1],
      description: descMatch ? descMatch[1] : '',
      image: imageMatch[1],
    };
  }
}

const fallbackMatch = tsContent.match(/export const FALLBACK_GAME_METADATA[^{]*\{([^}]+)\}/);
let fallback = {
  name: "Unknown Game",
  description: "No description available.",
  image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800"
};

if (fallbackMatch) {
  const fallbackContent = fallbackMatch[1];
  const nameMatch = fallbackContent.match(/name:\s*"([^"]+)"/);
  const descMatch = fallbackContent.match(/description:\s*"([^"]+)"/);
  const imageMatch = fallbackContent.match(/image:\s*"([^"]+)"/);
  
  if (nameMatch) fallback.name = nameMatch[1];
  if (descMatch) fallback.description = descMatch[1];
  if (imageMatch) fallback.image = imageMatch[1];
}

const output = {
  games,
  fallback,
};

writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Generated game-config.json with ${Object.keys(games).length} games`);
