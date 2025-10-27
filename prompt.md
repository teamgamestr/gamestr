Build a comprehensive social gaming score website called Gamestr based on Nostr.

Gamestr is a platform to display, browse, and interact with scores and leaderboards for games publishing kind 762 score events on Nostr. The site should integrate the latest Score NIP specification, processing events from popular, reliable, and user-configurable relays. Below are required features and guidelines:

### Core Features

- **Main Page:** Display a grid of game thumbnails for all games with score events, auto-updated from relays. Each thumbnail should show the game’s image, name, description, genre pills, and trending highlight. Clicking a thumbnail leads to a detail page for that game.
- **Genre and Game Filters:** Enable users to filter games by genre, trending, new releases, and recommended games. Genre pills must be visible on each thumbnail and usable for filtering.
- **Game Pages:** Each game detail page displays scores/leaderboards, player achievements, current and historical score charts, and game metadata. Support daily, weekly, monthly, and all-time leaderboard views.
- **Game Metadata Config:** Use a config object to store game details indexed by <pubkey><game-identifier>—includes friendly name, description, image, genre, and game URL. Offer a fallback config for unknown games and a user/admin interface to add/edit metadata.
- **Player Profiles:** Enable users to log in with Nostr. Show their grouped scores per game (by ‘p’ tag), badges/achievements, avatar, bio, and leaderboard positions. Let users view personal score histories and stats.
- **Social Features:** Let users follow other players, view friends’ scores, and create private or public friend leaderboards. Enable leaderboard/score sharing to Nostr and other social networks.
- **Score Interactions:** Allow users to zap, comment, and quote scores as kind 1 events. Display notifications for new zaps, comments, mentions, and when personal records are surpassed.
- **Developer Explainer:** Provide a dedicated, interactive explainer page showing how game developers can integrate the Score NIP into their games, appear on Gamestr, and access analytics.
- **API & Test Suite:** Include API documentation and an event playground for developers to send/test kind 762 events. Store test events in an editable directory; allow adding/removing via the frontend. Clearly distinguish test events from live ones.
- **Moderation & Security:** Support mute/report/abuse tools, relay selection and reliability metrics, basic admin dashboard for managing games, events, players, and comments. Support anti-cheat/event verification options for developers.
- **Event History:** Let users and games display historical leaderboards and progress charts, with downloadable data as needed.

### UI, Accessibility, and Engagement

- **Responsive and Accessible:** Site must be fully responsive (desktop/mobile), support dark and light modes, and meet WCAG accessibility guidelines.
- **Localization:** Support multiple languages and display international game communities, with option for translation and localized game metadata.
- **Open Source and Contributions:** Facilitate contributions from the gaming community for game configs, translations, genre tags, and localization. Include guidelines for adding new games, requesting features, and submitting translations.

### Extra Guidelines

- **Relay Configuration:** Popular relays must be default, with option for user/admin relay management and live status of relay reliability.
- **Score Visualization:** Visualize score histories, top player trends, and game/genre stats with dynamic charts.
- **Ratings & Reviews:** Feature star ratings and reviews for each game, linked to Nostr kind 1 events.
- **Notifications & Sharing:** Users receive timely notifications and can easily share scores/leaderboards.
- **Developer Analytics:** Offer authenticated developers per-game analytics dashboard for metrics like active users, zaps, and event volumes.

***

**Implementation must strictly follow the Score NIP, integrate Nostr login, and provide a test events directory and playground. All core, social, developer, and accessibility features listed above are required. Let the platform evolve in a modular fashion so new games, features, and interaction methods can be added later.**
