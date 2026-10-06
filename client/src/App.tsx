import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Route, Switch } from "wouter";

const Home = lazy(() => import("@/pages/Home"));
const TerritoryExplorer = lazy(() => import("@/pages/Explore").then(module => ({ default: module.TerritoryExplorer })));
const TerritoryDetail = lazy(() => import("@/pages/Explore").then(module => ({ default: module.TerritoryDetail })));
const AccountPage = lazy(() => import("@/pages/Account").then(module => ({ default: module.AccountPage })));
const AdminPage = lazy(() => import("@/pages/Admin").then(module => ({ default: module.AdminPage })));
const AdminWalletTopups = lazy(() => import("@/components/AdminWalletTopups").then(module => ({ default: module.AdminWalletTopups })));
const InfoPage = lazy(() => import("@/pages/Info").then(module => ({ default: module.InfoPage })));
const RankingsPage = lazy(() => import("@/pages/Info").then(module => ({ default: module.RankingsPage })));
const NotFound = lazy(() => import("@/pages/NotFound"));

function ExploreRoute() { return <TerritoryExplorer mode="explore" />; }
function MapRoute() { return <TerritoryExplorer mode="explore" />; }
function MarketplaceRoute() { return <TerritoryExplorer mode="marketplace" />; }
function TerritoryDetailRoute({ params }: { params: { territoryId: string } }) { return <TerritoryDetail params={params} />; }
function AboutRoute() { return <InfoPage kind="about" />; }
function HowItWorksRoute() { return <InfoPage kind="how-it-works" />; }
function LegalRoute() { return <InfoPage kind="legal" />; }
function PrivacyRoute() { return <InfoPage kind="privacy" />; }
function TermsRoute() { return <InfoPage kind="terms" />; }
function RankingsRoute() { return <RankingsPage />; }
function DashboardRoute() { return <AccountPage view="dashboard" />; }
function MyTerritoriesRoute() { return <AccountPage view="my-territories" />; }
function WalletRoute() { return <AccountPage view="wallet" />; }
function IdentityRoute() { return <AccountPage view="identity" />; }
function ProfileRoute() { return <AccountPage view="profile" />; }
function NotificationsRoute() { return <AccountPage view="notifications" />; }
function SettingsRoute() { return <AccountPage view="settings" />; }
function AdminHomeRoute() { return <AdminPage initialTab="overview" />; }
function AdminSectionRoute({ params }: { params: { section: string } }) {
  const section = params.section;
  const initialTab = section === "users" ? "users" : section === "territories" ? "territories" : section === "orders" ? "orders" : section === "payments" ? "payments" : section === "transactions" ? "ledger" : section === "reports" ? "reports" : section === "settings" ? "announcements" : section === "audit" ? "audit" : "overview";
  return <AdminPage initialTab={initialTab} />;
}
function RouteLoading() { return <div className="route-loading" role="status"><span className="signal-dot" /> Loading EARTH616…</div>; }

function Router() {
  return <Suspense fallback={<RouteLoading />}><Switch>
    <Route path="/" component={Home} />
    <Route path="/explore" component={ExploreRoute} />
    <Route path="/map" component={MapRoute} />
    <Route path="/marketplace" component={MarketplaceRoute} />
    <Route path="/territory/:territoryId" component={TerritoryDetailRoute} />
    <Route path="/rankings" component={RankingsRoute} />
    <Route path="/about" component={AboutRoute} />
    <Route path="/how-it-works" component={HowItWorksRoute} />
    <Route path="/legal" component={LegalRoute} />
    <Route path="/privacy" component={PrivacyRoute} />
    <Route path="/terms" component={TermsRoute} />
    <Route path="/dashboard" component={DashboardRoute} />
    <Route path="/my-territories" component={MyTerritoriesRoute} />
    <Route path="/wallet" component={WalletRoute} />
    <Route path="/identity" component={IdentityRoute} />
    <Route path="/profile" component={ProfileRoute} />
    <Route path="/notifications" component={NotificationsRoute} />
    <Route path="/settings" component={SettingsRoute} />
    <Route path="/admin" component={AdminHomeRoute} />
    <Route path="/admin/topups" component={AdminWalletTopups} />
    <Route path="/admin/:section" component={AdminSectionRoute} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
