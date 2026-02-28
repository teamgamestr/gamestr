import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Code2, Rocket, Shield, BarChart3, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Developers() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const exampleEvent = `{
  "kind": 30762,
  "pubkey": "your-game-developer-pubkey",
  "created_at": ${Math.floor(Date.now() / 1000)},
  "content": "New high score achieved!",
  "tags": [
    ["d", "my-awesome-game:player-pubkey:level-12"],
    ["game", "my-awesome-game"],
    ["score", "15000"],
    ["p", "player-pubkey"],
    ["state", "active"],
    ["level", "12"],
    ["difficulty", "hard"],
    ["mode", "single-player"],
    ["duration", "180"],
    ["t", "arcade"],
    ["t", "casual"]
  ]
}`;

  const jsExample = `import { SimplePool, getPublicKey, finalizeEvent } from 'nostr-tools';

// Initialize Nostr connection
const pool = new SimplePool();
const relays = ['wss://relay.nostr.band', 'wss://relay.damus.io'];

// Your game's private key (keep this secret!)
const gamePrivateKey = 'your-game-private-key-hex';
const gamePubkey = getPublicKey(gamePrivateKey);

// Function to publish a score
async function publishScore(playerPubkey, score, metadata = {}) {
  const event = {
    kind: 30762,
    created_at: Math.floor(Date.now() / 1000),
    content: metadata.message || 'New score achieved!',
    tags: [
      ['d', \`my-awesome-game:\${playerPubkey}:\${metadata.level || 'default'}\`],
      ['game', 'my-awesome-game'],
      ['score', score.toString()],
      ['p', playerPubkey],
      ['state', 'active'], // Score state
      ['t', 'arcade'], // Genre tag
    ],
  };

  // Add optional metadata
  if (metadata.level) event.tags.push(['level', metadata.level.toString()]);
  if (metadata.difficulty) event.tags.push(['difficulty', metadata.difficulty]);
  if (metadata.mode) event.tags.push(['mode', metadata.mode]);
  if (metadata.duration) event.tags.push(['duration', metadata.duration.toString()]);
  if (metadata.achievements) event.tags.push(['achievements', metadata.achievements.join(',')]);

  // Sign and publish
  const signedEvent = finalizeEvent(event, gamePrivateKey);
  await Promise.any(pool.publish(relays, signedEvent));
  
  console.log('Score published!', signedEvent.id);
  return signedEvent;
}

// Example usage
publishScore('player-pubkey-here', 15000, {
  level: 12,
  difficulty: 'hard',
  duration: 180,
  achievements: ['speed-demon', 'perfectionist']
});`;

  const pythonExample = `import time
import json
from nostr.key import PrivateKey
from nostr.event import Event, EventKind
from nostr.relay_manager import RelayManager

# Your game's private key
private_key = PrivateKey.from_nsec("your-nsec-here")

# Initialize relay manager
relay_manager = RelayManager()
relay_manager.add_relay("wss://relay.nostr.band")
relay_manager.add_relay("wss://relay.damus.io")

def publish_score(player_pubkey, score, **metadata):
    """Publish a game score to Nostr"""
    
    # Create base tags
    tags = [
        ["d", f"my-game:{int(time.time())}:{hash(time.time())}"],
        ["game", "my-awesome-game"],
        ["score", str(score)],
        ["p", player_pubkey],
        ["t", "arcade"],  # Genre tag
    ]
    
    # Add optional metadata
    if "level" in metadata:
        tags.append(["level", str(metadata["level"])])
    if "difficulty" in metadata:
        tags.append(["difficulty", metadata["difficulty"]])
    if "mode" in metadata:
        tags.append(["mode", metadata["mode"]])
    if "duration" in metadata:
        tags.append(["duration", str(metadata["duration"])])
    
    # Create and sign event
    event = Event(
        kind=30762,
        content=metadata.get("message", "New score achieved!"),
        tags=tags,
        public_key=private_key.public_key.hex()
    )
    private_key.sign_event(event)
    
    # Publish to relays
    relay_manager.publish_event(event)
    print(f"Score published! Event ID: {event.id}")
    return event

# Example usage
publish_score(
    "player-pubkey-here",
    15000,
    level=12,
    difficulty="hard",
    duration=180
)`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
              For Developers
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold">
              Integrate Gamestr Into Your Games
            </h1>
            <p className="text-xl text-white/90">
              Add decentralized leaderboards to your games with just a few lines of code.
              Reach players across the Nostr network.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <a href="#quick-start">Get Started</a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-yellow-500 mb-2" />
              <CardTitle>Easy Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Simple API with just a few lines of code. Works with any programming language.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Decentralized</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No central server required. Scores are published directly to the Nostr network.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Built-in Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track player engagement, top scores, and game activity automatically.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Start Section */}
        <Card id="quick-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Create a Nostr Identity</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate a Nostr keypair for your game. This will be used to sign score events.
                    Keep your private key (nsec) secret!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Choose Your Game Identifier</h3>
                  <p className="text-sm text-muted-foreground">
                    Pick a unique, lowercase, hyphenated identifier for your game (e.g., "super-puzzle-quest").
                    This will be used in the "game" tag of all score events.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Publish Score Events</h3>
                  <p className="text-sm text-muted-foreground">
                    When a player achieves a score, create and publish a kind 30762 addressable event to Nostr relays.
                    See code examples below.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Add Game Metadata</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit your game's metadata (name, description, image, genres) to appear on Gamestr.
                    Contact us to get your game listed.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Structure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Score Event Structure (Kind 30762)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Score events use kind 30762 (addressable replaceable) and follow this structure:
            </p>

            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{exampleEvent}</code>
              </pre>
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={() => copyCode(exampleEvent, 'example-event')}
              >
                {copiedCode === 'example-event' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  'Copy'
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">Required Tags:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 py-0.5 rounded">d</code> - Unique identifier (format: game:timestamp:random)</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">game</code> - Your game identifier</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">score</code> - The numeric score value</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">p</code> - Player's Nostr pubkey</li>
              </ul>

              <h4 className="font-semibold mt-4">Optional Tags:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><code className="bg-muted px-1 py-0.5 rounded">level</code> - Game level/stage</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">difficulty</code> - Difficulty level</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">mode</code> - Game mode</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">duration</code> - Time in seconds</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">achievements</code> - Comma-separated achievement IDs</li>
                <li><code className="bg-muted px-1 py-0.5 rounded">t</code> - Genre tags (can have multiple)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Code Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Code Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="javascript">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Using <code className="bg-muted px-1 py-0.5 rounded">nostr-tools</code> library:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{jsExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(jsExample, 'js-example')}
                  >
                    {copiedCode === 'js-example' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      'Copy'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="python" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Using <code className="bg-muted px-1 py-0.5 rounded">python-nostr</code> library:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{pythonExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyCode(pythonExample, 'python-example')}
                  >
                    {copiedCode === 'python-example' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      'Copy'
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle>Best Practices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Verify player identity:</strong> Ensure players authenticate with their Nostr key before publishing scores
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Use multiple relays:</strong> Publish to 3-5 popular relays for better discoverability
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Add genre tags:</strong> Use "t" tags to categorize your game for better filtering
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Include metadata:</strong> Add difficulty, mode, and level tags for richer leaderboards
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Keep keys secure:</strong> Never expose your game's private key in client-side code
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <a href="https://github.com/nostr-protocol/nips" target="_blank" rel="noopener noreferrer">
                  <div className="text-left">
                    <div className="font-semibold">Nostr NIPs</div>
                    <div className="text-sm text-muted-foreground">Official Nostr protocol specs</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <a href="https://nostr-resources.com" target="_blank" rel="noopener noreferrer">
                  <div className="text-left">
                    <div className="font-semibold">Nostr Resources</div>
                    <div className="text-sm text-muted-foreground">Libraries and tools</div>
                  </div>
                </a>
              </Button>

              <Button variant="outline" className="h-auto py-4 justify-start" asChild>
                <Link to="/">
                  <div className="text-left">
                    <div className="font-semibold">Browse Games</div>
                    <div className="text-sm text-muted-foreground">See games using Gamestr</div>
                  </div>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
