import { BrowserRouter, Route, Routes, useParams, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import { Home } from "./pages/Home";
import { GameDetail } from "./pages/GameDetail";
import { LatestScores } from "./pages/LatestScores";
import { ScoreDetail } from "./pages/ScoreDetail";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Developers } from "./pages/Developers";
import { NIP05Store } from "./pages/NIP05Store";
import Messages from "./pages/Messages";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

const NIP19_PREFIXES = ['npub1', 'note1', 'nevent1', 'nprofile1', 'naddr1'];

/**
 * NIP-19 bech32 is case-insensitive and clients are expected to accept the
 * all-uppercase form, so match prefixes against a lowercased slug. The decoder
 * in NIP19Page handles the uppercase identifier itself.
 */
export function isNip19Identifier(value: string): boolean {
  const lower = value.toLowerCase();
  return NIP19_PREFIXES.some(prefix => lower.startsWith(prefix));
}

function DynamicRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <NotFound />;

  if (isNip19Identifier(slug)) return <NIP19Page />;

  return <GameDetail />;
}

function LegacyGameRedirect() {
  const { gameIdentifier } = useParams<{ pubkey: string; gameIdentifier: string }>();
  return <Navigate to={`/${gameIdentifier}`} replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:pubkey/:gameIdentifier" element={<LegacyGameRedirect />} />
          <Route path="/score/:eventId" element={<ScoreDetail />} />
          <Route path="/score/:pubkey/:gameIdentifier/:eventId" element={<ScoreDetail />} />
          <Route path="/scores" element={<LatestScores />} />
          <Route path="/:gameIdentifier/score/:eventId" element={<ScoreDetail />} />
          <Route path="/player/:pubkey" element={<PlayerProfile />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/me" element={<NIP05Store />} />
          <Route path="/messages" element={<Messages />} />
          {/* NIP-89 handler-style deep-link aliases: /e/<bech32>, /p/<bech32>, /a/<bech32>.
              NostrHub's listing form offers these alongside the bare /<bech32> form, so a
              client that deep-links that way still lands on the right view. */}
          <Route path="/e/:slug" element={<NIP19Page />} />
          <Route path="/p/:slug" element={<NIP19Page />} />
          <Route path="/a/:slug" element={<NIP19Page />} />
          <Route path="/:slug" element={<DynamicRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
export default AppRouter;
