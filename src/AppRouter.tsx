import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { Layout } from "./components/Layout";

import { Home } from "./pages/Home";
import { GameDetail } from "./pages/GameDetail";
import { ScoreDetail } from "./pages/ScoreDetail";
import { PlayerProfile } from "./pages/PlayerProfile";
import { Developers } from "./pages/Developers";
import { Playground } from "./pages/Playground";
import Messages from "./pages/Messages";
import { NIP19Page } from "./pages/NIP19Page";
import NotFound from "./pages/NotFound";

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:pubkey/:gameIdentifier" element={<GameDetail />} />
          <Route path="/score/:eventId" element={<ScoreDetail />} />
          <Route path="/player/:pubkey" element={<PlayerProfile />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/messages" element={<Messages />} />
          {/* NIP-19 route for npub1, note1, naddr1, nevent1, nprofile1 */}
          <Route path="/:nip19" element={<NIP19Page />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
export default AppRouter;