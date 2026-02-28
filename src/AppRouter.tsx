import { BrowserRouter, Route, Routes, useParams, Navigate } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import { Home } from "./pages/Home";
import { GameDetail } from "./pages/GameDetail";
import { ScoreDetail } from "./pages/ScoreDetail";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Developers } from "./pages/Developers";
import Messages from "./pages/Messages";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

const NIP19_PREFIXES = ['npub1', 'note1', 'nevent1', 'nprofile1', 'naddr1'];

function DynamicRoute() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return <NotFound />;

  const isNip19 = NIP19_PREFIXES.some(prefix => slug.startsWith(prefix));
  if (isNip19) return <NIP19Page />;

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
          <Route path="/player/:pubkey" element={<PlayerProfile />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/:slug" element={<DynamicRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
export default AppRouter;