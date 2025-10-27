import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { LoginArea } from '@/components/auth/LoginArea';
import { Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GAME_GENRES } from '@/lib/gameConfig';

export function Playground() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { mutate: createEvent, isPending } = useNostrPublish();

  const [formData, setFormData] = useState({
    gameIdentifier: 'test-game',
    playerPubkey: '',
    score: '1000',
    level: '',
    difficulty: '',
    mode: '',
    duration: '',
    achievements: '',
    content: 'Test score from Gamestr playground!',
    genres: [] as string[],
  });

  const [publishedEventId, setPublishedEventId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to publish test events',
        variant: 'destructive',
      });
      return;
    }

    // Build tags
    const tags: string[][] = [
      ['d', `${formData.gameIdentifier}:${Date.now()}:${Math.random().toString(36).substring(7)}`],
      ['game', formData.gameIdentifier],
      ['score', formData.score],
      ['p', formData.playerPubkey || user.pubkey],
    ];

    if (formData.level) tags.push(['level', formData.level]);
    if (formData.difficulty) tags.push(['difficulty', formData.difficulty]);
    if (formData.mode) tags.push(['mode', formData.mode]);
    if (formData.duration) tags.push(['duration', formData.duration]);
    if (formData.achievements) tags.push(['achievements', formData.achievements]);
    
    formData.genres.forEach(genre => {
      tags.push(['t', genre]);
    });

    // Add test marker
    tags.push(['t', 'test']);

    createEvent(
      {
        kind: 762,
        content: formData.content,
        tags,
      },
      {
        onSuccess: (event) => {
          setPublishedEventId(event.id);
          toast({
            title: 'Score Published!',
            description: 'Your test score event has been published to Nostr',
          });
        },
        onError: (error) => {
          toast({
            title: 'Publish Failed',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const toggleGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre],
    }));
  };

  const exampleEvent = `{
  "kind": 762,
  "pubkey": "${user?.pubkey || 'your-pubkey'}",
  "created_at": ${Math.floor(Date.now() / 1000)},
  "content": "${formData.content}",
  "tags": [
    ["d", "${formData.gameIdentifier}:${Date.now()}:xxx"],
    ["game", "${formData.gameIdentifier}"],
    ["score", "${formData.score}"],
    ["p", "${formData.playerPubkey || user?.pubkey || 'player-pubkey'}"]${formData.level ? `,\n    ["level", "${formData.level}"]` : ''}${formData.difficulty ? `,\n    ["difficulty", "${formData.difficulty}"]` : ''}${formData.mode ? `,\n    ["mode", "${formData.mode}"]` : ''}${formData.duration ? `,\n    ["duration", "${formData.duration}"]` : ''}${formData.achievements ? `,\n    ["achievements", "${formData.achievements}"]` : ''}${formData.genres.map(g => `,\n    ["t", "${g}"]`).join('')},
    ["t", "test"]
  ]
}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="secondary">Developer Tool</Badge>
            <h1 className="text-4xl md:text-5xl font-bold">Event Playground</h1>
            <p className="text-lg text-muted-foreground">
              Test kind 762 score events in your browser. Perfect for developers integrating Gamestr.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create Test Score Event</CardTitle>
              <CardDescription>
                Fill in the fields below to generate and publish a test score event
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Login Required</p>
                      <p className="text-sm text-muted-foreground">
                        You need to log in with Nostr to publish test events
                      </p>
                    </div>
                  </div>
                  <LoginArea className="w-full" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Game Identifier */}
                  <div>
                    <Label htmlFor="gameIdentifier">Game Identifier *</Label>
                    <Input
                      id="gameIdentifier"
                      value={formData.gameIdentifier}
                      onChange={(e) => setFormData({ ...formData, gameIdentifier: e.target.value })}
                      placeholder="my-awesome-game"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Lowercase, hyphenated identifier for your game
                    </p>
                  </div>

                  {/* Score */}
                  <div>
                    <Label htmlFor="score">Score *</Label>
                    <Input
                      id="score"
                      type="number"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="1000"
                      required
                    />
                  </div>

                  {/* Player Pubkey */}
                  <div>
                    <Label htmlFor="playerPubkey">Player Pubkey</Label>
                    <Input
                      id="playerPubkey"
                      value={formData.playerPubkey}
                      onChange={(e) => setFormData({ ...formData, playerPubkey: e.target.value })}
                      placeholder={user.pubkey}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to use your own pubkey
                    </p>
                  </div>

                  {/* Optional Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="level">Level</Label>
                      <Input
                        id="level"
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                        placeholder="12"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Input
                        id="difficulty"
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                        placeholder="hard"
                      />
                    </div>

                    <div>
                      <Label htmlFor="mode">Mode</Label>
                      <Input
                        id="mode"
                        value={formData.mode}
                        onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                        placeholder="single-player"
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Duration (seconds)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        placeholder="180"
                      />
                    </div>
                  </div>

                  {/* Achievements */}
                  <div>
                    <Label htmlFor="achievements">Achievements</Label>
                    <Input
                      id="achievements"
                      value={formData.achievements}
                      onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                      placeholder="speed-demon,perfectionist"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Comma-separated achievement IDs
                    </p>
                  </div>

                  {/* Genres */}
                  <div>
                    <Label>Genres (select multiple)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {GAME_GENRES.filter(g => g !== 'uncategorized').slice(0, 12).map(genre => (
                        <Badge
                          key={genre}
                          variant={formData.genres.includes(genre) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleGenre(genre)}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Description of this score achievement"
                      rows={3}
                    />
                  </div>

                  {/* Submit */}
                  <Button type="submit" className="w-full" disabled={isPending}>
                    <Play className="mr-2 h-4 w-4" />
                    {isPending ? 'Publishing...' : 'Publish Test Event'}
                  </Button>

                  {/* Success Message */}
                  {publishedEventId && (
                    <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-green-500 mb-1">Event Published!</p>
                        <p className="text-sm text-muted-foreground break-all">
                          Event ID: {publishedEventId}
                        </p>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Event Preview</CardTitle>
              <CardDescription>
                This is what your score event will look like
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                <code>{exampleEvent}</code>
              </pre>

              <div className="mt-6 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">About Test Events</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Test events are tagged with "t": "test"</li>
                    <li>• They appear in the playground but can be filtered out</li>
                    <li>• Use this to validate your integration before going live</li>
                    <li>• Events are published to your configured relays</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Next Steps</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• View your published scores in the main feed</li>
                    <li>• Check the developer guide for integration code</li>
                    <li>• Submit your game metadata to appear on Gamestr</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
