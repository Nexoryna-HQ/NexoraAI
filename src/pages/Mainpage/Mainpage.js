import React, { Suspense, lazy } from "react"
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom"
import "./Mainpage.css"

import NavBar from "../../components/NavBar/NavBar.js"
import Footer from "../../components/Footer/Footer.js"
import RequireWallet from "../../components/RequireWallet/RequireWallet"
import WalletEntry from "../WalletEntry/WalletEntry"
import { WalletProvider } from "../../context"

const Default = lazy(() => import("../Default/Default.js"))
const Listcoin = lazy(() => import("../Listcoin/Listcoin.js"))
const Tiers = lazy(() => import("../Tiers/Tiers.js"))
const Details = lazy(() => import("../../pages/Details/Details"))
const Treasury = lazy(() => import("../Treasury/Treasury.js"))
const PromotePage = lazy(() => import("../../pages/PromotePage/PromotePage.js"))
const Discover = lazy(() => import("../Discover/Discover.js"))
const Intelligence = lazy(() => import("../Intelligence/Intelligence.js"))
const SiteInsight = lazy(() => import("../../components/SiteInsight/SiteInsight"))

const PageFallback = () => <div className="routeFallback">Loading...</div>

function DeferredInsight() {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 300)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <SiteInsight />
    </Suspense>
  )
}

const MainShell = () => (
  <div className="mainPage">
    <NavBar />
    <div className="mainDiv">
      <Outlet />
      <DeferredInsight />
    </div>
    <Footer />
    <button
      type="button"
      className="nxTop"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      ↑
    </button>
  </div>
)

export const Mainpage = () => {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WalletEntry />} />
          <Route element={<MainShell />}>
            <Route
              path="/home"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Default />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/listcoin"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Listcoin data="" />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/tiers"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Tiers />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/details/:id"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Details />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/treasury"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Treasury />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/intelligence"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Intelligence />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route
              path="/discover"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <Discover />
                  </Suspense>
                </RequireWallet>
              }
            />
            <Route path="/levelup" element={<Navigate to="/home" replace />} />
            <Route
              path="/promote"
              element={
                <RequireWallet>
                  <Suspense fallback={<PageFallback />}>
                    <PromotePage />
                  </Suspense>
                </RequireWallet>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProvider>
  )
}

export default Mainpage
