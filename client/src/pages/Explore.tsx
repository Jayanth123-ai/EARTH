import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, CircleUserRound, Compass,
  Crosshair, Gem, Globe2, Layers3, LocateFixed, LockKeyhole, MapPin, Minus,
  Plus, Search, ShoppingCart, SlidersHorizontal, WalletCards, X, Zap,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { SiteFooter, SiteHeader, Brand } from "@/components/SiteChrome";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type ExplorerProps = { mode?: "explore" | "marketplace" };
type ExplorerPanel = "territory" | "activity" | "power" | "rarity";
type ViewMode = "globe" | "map";
type TerritoryCardItem = {
  id: string; territoryId: string; name: string; region: string; country: string;
  rarity: string; status: string; areaUnits: string | number; territoryPower: number;
  currentPrice: string | number; latitude: string | number; longitude: string | number;
};

const earthImage = "/manus-storage/earth-at-night_0608212a.png";
const rarityValues = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"] as const;
const statusValues = ["AVAILABLE", "OWNED", "FEATURED", "LOCKED"] as const;
const money = (value: string | number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value));

function CatalogCard({ item }: { item: TerritoryCardItem }) {
  return <Link href={`/territory/${item.territoryId}`} className="catalog-card">
    <div className="catalog-card-top"><span>{item.territoryId}</span><span className={`rarity-pill rarity-pill--${item.rarity.toLowerCase()}`}>{item.rarity}</span></div>
    <h3>{item.name}</h3><p>{item.region} / {item.country}</p>
    <div className="catalog-coordinate">{Number(item.latitude).toFixed(2)}° &nbsp; {Number(item.longitude).toFixed(2)}°</div>
    <div className="catalog-card-bottom"><span>{money(item.currentPrice)}</span><span>{item.status}</span><ArrowUpRight size={16} /></div>
  </Link>;
}

function MarketplaceCatalog() {
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    region: region.trim() || undefined,
    rarity: rarity ? rarity as typeof rarityValues[number] : undefined,
    status: status ? status as typeof statusValues[number] : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page: 1, limit: 50, sort: "newest" as const,
  }), [search, region, rarity, status, maxPrice]);
  const { data, isLoading, error, refetch } = trpc.territories.list.useQuery(filters);
  const items = (data?.items ?? []) as TerritoryCardItem[];
  const clearFilters = () => { setSearch(""); setRegion(""); setRarity(""); setStatus(""); setMaxPrice(""); };

  return <div className="site-page"><SiteHeader /><main className="inner-page">
    <div className="page-intro"><div className="eyebrow"><span className="signal-dot" /> DIGITAL ATLAS / MARKETPLACE</div><h1>The territory<br /><span>marketplace.</span></h1><p>Browse real digital territory records. Availability, rarity, coordinates and prices are read from the live catalog.</p></div>
    <section className="atlas-toolbar" aria-label="Marketplace filters">
      <label className="search-field"><Search size={18} /><span className="sr-only">Search territories</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search territory, country or ID" /></label>
      <label className="select-field"><span className="sr-only">Filter by rarity</span><select value={rarity} onChange={event => setRarity(event.target.value)}><option value="">All rarity</option>{rarityValues.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="select-field"><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All status</option>{statusValues.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="search-field region-search"><MapPin size={17} /><span className="sr-only">Filter region</span><input value={region} onChange={event => setRegion(event.target.value)} placeholder="Region" /></label>
      <label className="search-field price-search"><span className="price-prefix">₹</span><span className="sr-only">Maximum price in rupees</span><input type="number" min="0" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder="Max price" /></label>
      <button className="filter-reset" onClick={clearFilters}><SlidersHorizontal size={16} /> Reset</button>
    </section>
    <section className="catalog-section"><div className="catalog-heading"><div><span className="eyebrow">LIVE CATALOG / {data?.total ?? "—"} RECORDS</span><h2>Territories</h2></div><div className="catalog-sort"><FilterIcon /> <span>Newest first</span></div></div>
      {isLoading ? <div className="catalog-empty">Fetching the live territory catalog…</div> : error ? <div className="catalog-empty catalog-empty--error"><strong>The catalog could not be loaded.</strong><button className="text-link" onClick={() => void refetch()}>Retry <ArrowRight size={15} /></button></div> : items.length ? <div className="catalog-grid">{items.map(item => <CatalogCard key={item.id} item={item} />)}</div> : <div className="catalog-empty"><div className="empty-orbit" /><strong>No territories listed yet.</strong><p>There are no database records matching this view. Reset filters or check back after an authorized administrator populates the catalog.</p><button className="button-outline" onClick={clearFilters}>Clear filters</button></div>}
    </section>
  </main><SiteFooter /></div>;
}

function FilterIcon() { return <SlidersHorizontal size={16} aria-hidden="true" />; }

function AtlasTopbar({
  search, setSearch, walletBalance, walletLoading, hasUser, onConnect, onProfile,
}: {
  search: string; setSearch: (value: string) => void; walletBalance: string;
  walletLoading: boolean; hasUser: boolean; onConnect: () => void; onProfile: () => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && target?.tagName !== "INPUT" && target?.tagName !== "TEXTAREA" && !target?.isContentEditable) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);
  return <header className="atlas-topbar">
    <Link href="/" className="atlas-brand" aria-label="EARTH616 home"><Brand compact /></Link>
    <nav className="atlas-main-nav" aria-label="Atlas navigation">
      <Link href="/explore" className="is-active">Explore</Link>
      <Link href="/marketplace">Marketplace</Link>
      <Link href="/rankings">Rankings</Link>
      <Link href="/my-territories">My Territories</Link>
      <button onClick={() => toast.info("Community is coming soon.")}>Community</button>
    </nav>
    <label className="atlas-search"><Search size={18} /><span className="sr-only">Search territories</span><input ref={searchRef} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search territory, country or ID…" /><kbd>/</kbd></label>
    <Link href={hasUser ? "/wallet" : "/dashboard"} className="atlas-balance" title="Open your EARTH616 wallet"><WalletCards size={17} /><span>E616 {walletLoading ? "…" : walletBalance}</span></Link>
    <button className="atlas-connect" onClick={onConnect}>{hasUser ? "Open account" : "Connect wallet"}<ArrowUpRight size={14} /></button>
    <button className="atlas-profile" aria-label={hasUser ? "Open profile" : "Sign in"} onClick={onProfile}><CircleUserRound size={19} /></button>
  </header>;
}

function getMarkerPoint(item: TerritoryCardItem, rotation: number, view: ViewMode) {
  const latitude = Number(item.latitude);
  const longitude = Number(item.longitude);
  if (view === "map") return { left: ((longitude + 180) / 360) * 100, top: ((90 - latitude) / 180) * 100, visible: true, depth: 1 };
  const phi = latitude * Math.PI / 180;
  const lambda = (longitude - rotation) * Math.PI / 180;
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi);
  const depth = Math.cos(phi) * Math.cos(lambda);
  return { left: 50 + x * 48, top: 50 - y * 48, visible: depth > -0.04, depth: Math.max(0.2, depth) };
}

function GlobeExplorer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [rarity, setRarity] = useState("");
  const [status, setStatus] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<"newest" | "power">("newest");
  const [panel, setPanel] = useState<ExplorerPanel>("territory");
  const [view, setView] = useState<ViewMode>("globe");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const drag = useRef<{ x: number; rotation: number } | null>(null);
  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    region: region.trim() || undefined,
    rarity: rarity ? rarity as typeof rarityValues[number] : undefined,
    status: status ? status as typeof statusValues[number] : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    page: 1, limit: 50, sort,
  }), [search, region, rarity, status, maxPrice, sort]);
  const catalog = trpc.territories.list.useQuery(filters);
  const items = (catalog.data?.items ?? []) as TerritoryCardItem[];
  const selected = items.find(item => item.id === selectedId) ?? null;
  const wallet = trpc.account.wallet.summary.useQuery(undefined, { enabled: Boolean(user) });
  const activity = trpc.account.dashboard.summary.useQuery(undefined, { enabled: Boolean(user) && panel === "activity" });
  const walletBalance = wallet.data ? Number(wallet.data.balance).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—";

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button, a, input, label")) return;
    drag.current = { x: event.clientX, rotation };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (drag.current) setRotation(drag.current.rotation + (event.clientX - drag.current.x) * 0.22);
  };
  const endPointer = () => { drag.current = null; };
  const adjustZoom = (amount: number) => setZoom(value => Math.min(2.4, Math.max(0.72, Number((value + amount).toFixed(2)))));
  const resetGlobe = () => { setZoom(1); setRotation(0); };
  const chooseTool = (tool: ExplorerPanel | "marketplace") => {
    if (tool === "marketplace") { setLocation("/marketplace"); return; }
    setPanel(tool);
    if (tool === "power") setSort("power");
    if (tool === "territory") setSort("newest");
  };
  const toggleStatus = (value: string) => setStatus(current => current === value ? "" : value);
  const toggleRarity = (value: string) => setRarity(current => current === value ? "" : value);

  return <div className="atlas-app">
    <AtlasTopbar search={search} setSearch={setSearch} hasUser={Boolean(user)} walletBalance={walletBalance} walletLoading={wallet.isLoading && Boolean(user)} onConnect={() => user ? setLocation("/dashboard") : setSignInOpen(true)} onProfile={() => user ? setLocation("/profile") : setSignInOpen(true)} />
    <main className="atlas-workspace">
      <nav className="atlas-tool-rail" aria-label="Atlas tools">
        <button className={panel === "territory" ? "active" : ""} onClick={() => chooseTool("territory")}><Layers3 /><span>Territory</span></button>
        <button className={panel === "activity" ? "active" : ""} onClick={() => chooseTool("activity")}><Activity /><span>Activity</span></button>
        <button className={panel === "power" ? "active" : ""} onClick={() => chooseTool("power")}><Zap /><span>Power</span></button>
        <button className={panel === "rarity" ? "active" : ""} onClick={() => chooseTool("rarity")}><Gem /><span>Rarity</span></button>
        <button onClick={() => chooseTool("marketplace")}><ShoppingCart /><span>Market</span></button>
      </nav>

      <section
        className={`atlas-stage ${view === "map" ? "atlas-stage--flat" : ""}`}
        aria-label={view === "globe" ? "Interactive Earth616 globe" : "Interactive territory map"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={event => adjustZoom(event.deltaY < 0 ? 0.08 : -0.08)}
      >
        <div className="atlas-stage-glow" aria-hidden="true" />
        <div className="atlas-globe-wrap" style={{ transform: `scale(${zoom})` }}>
          <div className={`atlas-globe ${view === "map" ? "atlas-globe--flat" : ""}`}>
            <img className="atlas-globe-texture" src={earthImage} alt="" draggable={false} />
            <svg className="atlas-hex-grid" viewBox="0 0 600 600" aria-hidden="true">
              <defs><pattern id="e616-hex" width="42" height="48" patternUnits="userSpaceOnUse"><path d="M12 1h18l11 23-11 23H12L1 24z" fill="none" stroke="rgba(111,220,255,.56)" strokeWidth="1" /></pattern><radialGradient id="e616-grid-fade"><stop offset="45%" stopColor="white" /><stop offset="100%" stopColor="#777" /></radialGradient><mask id="e616-globe-mask"><circle cx="300" cy="300" r="298" fill="url(#e616-grid-fade)" /></mask></defs>
              <circle cx="300" cy="300" r="298" fill="url(#e616-hex)" mask="url(#e616-globe-mask)" />
              <ellipse cx="300" cy="300" rx="294" ry="104" fill="none" stroke="rgba(104,210,255,.28)" strokeWidth="1" />
              <ellipse cx="300" cy="300" rx="294" ry="208" fill="none" stroke="rgba(104,210,255,.19)" strokeWidth="1" />
              <ellipse cx="300" cy="300" rx="112" ry="294" fill="none" stroke="rgba(104,210,255,.2)" strokeWidth="1" />
              <ellipse cx="300" cy="300" rx="214" ry="294" fill="none" stroke="rgba(104,210,255,.14)" strokeWidth="1" />
            </svg>
            <div className="atlas-globe-shade" aria-hidden="true" />
            {items.map(item => {
              const point = getMarkerPoint(item, rotation, view);
              if (!point.visible) return null;
              return <button key={item.id} className={`atlas-globe-marker atlas-globe-marker--${item.status.toLowerCase()}`} style={{ left: `${point.left}%`, top: `${point.top}%`, opacity: point.depth }} onClick={() => { setSelectedId(item.id); setPanel("territory"); }} aria-label={`Select ${item.territoryId}, ${item.name}`} title={`${item.territoryId} · ${item.name}`}><span /></button>;
            })}
          </div>
        </div>

        <div className="atlas-coordinate-readout"><span><i /> LIVE DIGITAL ATLAS</span><strong>{catalog.data?.total ?? 0}</strong><small>catalog territories</small></div>
        <div className="atlas-compass" aria-label="Compass"><span>N</span><Compass size={38} /><small>W&nbsp;&nbsp;&nbsp; E</small></div>
        <div className="atlas-coordinate">EARTH616 / DIGITAL COORDINATES</div>
        <div className="atlas-empty-hint" aria-live="polite">
          {catalog.isLoading ? <><span className="eyebrow">SYNCING THE ATLAS</span><strong>Loading live territory records…</strong></> : catalog.error ? <><span className="eyebrow">ATLAS CONNECTION</span><strong>Catalog temporarily unavailable.</strong><button onClick={() => void catalog.refetch()}>Retry</button></> : items.length === 0 ? <><span className="eyebrow">NO TERRITORIES LISTED YET</span><strong>The atlas is waiting for its first coordinates.</strong><span>Only approved database records appear on this globe.</span></> : null}
        </div>
        <div className="atlas-minimap" aria-label="Globe overview"><div className="atlas-minimap-earth" style={{ backgroundImage: `url(${earthImage})` }} /><span className="atlas-minimap-window" /></div>
        <div className="atlas-bottom-console">
          <div className="atlas-console-count"><div className="atlas-console-orb"><Globe2 size={24} /></div><div><small>{view === "globe" ? "3D GLOBE / ROTATABLE" : "2D ATLAS / LONGITUDE VIEW"}</small><strong>{catalog.data?.total ?? 0} territories</strong></div></div>
          <div className="atlas-zoom-controls"><button aria-label="Zoom out" onClick={() => adjustZoom(-0.12)}><Minus size={16} /></button><input aria-label="Globe zoom" type="range" min="0.72" max="2.4" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} /><button aria-label="Zoom in" onClick={() => adjustZoom(0.12)}><Plus size={16} /></button></div>
          <div className="atlas-view-toggle" role="group" aria-label="Map view"><button className={view === "map" ? "active" : ""} onClick={() => setView("map")}>2D Map</button><button className={view === "globe" ? "active" : ""} onClick={() => setView("globe")}>3D Globe</button></div>
          <button className="atlas-locate" aria-label="Recenter globe" title="Recenter globe" onClick={resetGlobe}><LocateFixed size={18} /></button>
        </div>
        {catalog.isLoading && <div className="atlas-loading"><span className="signal-dot" /> Syncing catalog</div>}
      </section>

      <aside className="atlas-sidepanel" aria-label="Territory details and filters">
        {panel === "activity" ? <section className="atlas-panel-card atlas-activity-panel"><div className="atlas-panel-heading"><div><span className="eyebrow">YOUR SIGNAL</span><h2>Activity</h2></div><Activity size={18} /></div>{!user ? <div className="atlas-side-empty"><strong>Sign in to view your activity.</strong><button onClick={() => setSignInOpen(true)}>Sign in <ArrowUpRight size={14} /></button></div> : activity.isLoading ? <p className="atlas-panel-muted">Loading your activity…</p> : activity.error ? <p className="atlas-panel-muted">Activity is temporarily unavailable.</p> : activity.data?.recentActivity.length ? <div className="atlas-activity-list">{activity.data.recentActivity.map(entry => <article key={entry.id}><span>{entry.eventType.replaceAll("_", " ")}</span><strong>{entry.summary}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></article>)}</div> : <div className="atlas-side-empty"><strong>No recorded activity yet.</strong><span>Your verified platform events will appear here.</span></div>}</section>
          : panel === "power" ? <section className="atlas-panel-card"><div className="atlas-panel-heading"><div><span className="eyebrow">POWER VIEW</span><h2>Top territories</h2></div><Zap size={18} /></div><p className="atlas-panel-muted">Sorted by server-calculated Territory Power.</p>{items.length ? <div className="atlas-power-list">{items.slice(0, 5).map((item, index) => <button key={item.id} onClick={() => { setSelectedId(item.id); setPanel("territory"); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.name}<small>{item.territoryId}</small></strong><b>{item.territoryPower.toLocaleString()}</b></button>)}</div> : <div className="atlas-side-empty"><strong>No power records yet.</strong><span>Ranking data appears when approved territories are added.</span></div>}</section>
          : panel === "rarity" ? <section className="atlas-panel-card"><div className="atlas-panel-heading"><div><span className="eyebrow">CLASSIFICATION</span><h2>Filter rarity</h2></div><Gem size={18} /></div><div className="atlas-filter-list">{rarityValues.map(value => <button key={value} className={rarity === value ? "selected" : ""} onClick={() => toggleRarity(value)}><i className={`rarity-dot rarity-dot--${value.toLowerCase()}`} />{value}<span>{rarity === value ? "ON" : ""}</span></button>)}</div><button className="atlas-clear-filter" onClick={() => setRarity("")}>Clear rarity filter</button></section>
          : <section className="atlas-panel-card atlas-territory-panel">
            <div className="atlas-panel-heading"><div><span className="eyebrow">{selected ? "SELECTED TERRITORY" : "LIVE ATLAS / DETAILS"}</span><h2>{selected ? selected.name : "Territory"}</h2></div><Layers3 size={19} /></div>
            {selected ? <><div className="atlas-selected-card"><div className="atlas-selected-art"><Globe2 size={34} /></div><div><small>{selected.territoryId}</small><span className={`rarity-pill rarity-pill--${selected.rarity.toLowerCase()}`}>{selected.rarity}</span><p><MapPin size={12} /> {selected.region}, {selected.country}</p></div></div><dl className="atlas-territory-stats"><div><dt>Area</dt><dd>{Number(selected.areaUnits).toLocaleString()} units</dd></div><div><dt>Territory Power</dt><dd>{selected.territoryPower.toLocaleString()}</dd></div><div><dt>Current price</dt><dd>{money(selected.currentPrice)} <small>(E616)</small></dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl><Link className="atlas-claim-link" href={`/territory/${selected.territoryId}`}>View territory details <ArrowRight size={15} /></Link></> : <div className="atlas-side-empty"><div className="atlas-selected-art"><Crosshair size={26} /></div><strong>Select a live marker</strong><span>Territory details appear here only when a real catalog record is selected.</span></div>}
            <div className="atlas-panel-divider" />
            <div className="atlas-legend-block"><h3>Territory status</h3>{statusValues.map(value => <button key={value} className={status === value ? "active" : ""} onClick={() => toggleStatus(value)}><i className={`status-dot status-dot--${value.toLowerCase()}`} />{value.charAt(0) + value.slice(1).toLowerCase()}<span>{status === value ? "✓" : ""}</span></button>)}</div>
            <div className="atlas-legend-block"><h3>Rarity</h3>{rarityValues.map(value => <button key={value} className={rarity === value ? "active" : ""} onClick={() => toggleRarity(value)}><i className={`rarity-dot rarity-dot--${value.toLowerCase()}`} />{value.charAt(0) + value.slice(1).toLowerCase()}<span>{rarity === value ? "✓" : ""}</span></button>)}</div>
          </section>}
        <label className="atlas-region-filter"><span><MapPin size={13} /> Region filter</span><input value={region} onChange={event => setRegion(event.target.value)} placeholder="Enter region" /></label>
        <label className="atlas-region-filter"><span><SlidersHorizontal size={13} /> Maximum price (INR)</span><input type="number" min="0" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} placeholder="No price cap" /></label>
        {(status || rarity || region || maxPrice) && <button className="atlas-clear-filter" onClick={() => { setStatus(""); setRarity(""); setRegion(""); setMaxPrice(""); setSelectedId(null); }}>Clear all filters</button>}
      </aside>
    </main>
    {signInOpen && <div className="atlas-dialog-scrim" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSignInOpen(false); }}><section className="atlas-signin-dialog" role="dialog" aria-modal="true" aria-labelledby="atlas-signin-heading"><button className="atlas-dialog-close" aria-label="Close" onClick={() => setSignInOpen(false)}><X size={18} /></button><div className="eyebrow">EARTH616 ACCESS</div><h2 id="atlas-signin-heading">Connect to your place.</h2><p>EARTH616 uses Manus sign-in and an internal platform ledger. No cryptocurrency wallet is connected or required.</p><button className="button-primary button-wide" onClick={() => startLogin()}>Sign in with Manus <ArrowUpRight size={16} /></button><small>Sign-in does not purchase a territory or add credits.</small></section></div>}
  </div>;
}

export function TerritoryExplorer({ mode = "explore" }: ExplorerProps) {
  return mode === "marketplace" ? <MarketplaceCatalog /> : <GlobeExplorer />;
}

export function TerritoryDetail({ params }: { params: { territoryId: string } }) {
  const territoryId = decodeURIComponent(params.territoryId);
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const query = trpc.territories.get.useQuery({ territoryId });
  const item = query.data;
  const claim = () => {
    if (!user) { startLogin(); return; }
    setNotice("Checkout is not configured for this environment. No order, payment, or ownership change has been made.");
  };
  return <div className="site-page"><SiteHeader /><main className="inner-page detail-page"><Link href="/explore" className="back-link"><ArrowLeft size={16} /> Back to atlas</Link>
    {query.isLoading ? <div className="catalog-empty">Loading territory record…</div> : query.error ? <div className="catalog-empty catalog-empty--error"><strong>Territory unavailable.</strong><p>{query.error.message}</p><Link href="/explore" className="text-link">Return to atlas <ArrowRight size={15} /></Link></div> : item ? <>
      <div className="detail-topline"><span className="eyebrow">DIGITAL TERRITORY / {item.territoryId}</span><span className={`rarity-pill rarity-pill--${item.rarity.toLowerCase()}`}>{item.rarity}</span></div>
      <div className="detail-grid"><section className="detail-main"><h1>{item.name}</h1><p className="detail-place">{item.region} / {item.country}</p><div className="detail-coordinate-panel"><div className="coordinate-grid" aria-hidden="true" /><MapPin size={22} /><div><span>ATLAS COORDINATES</span><strong>{Number(item.latitude).toFixed(4)}° N/S &nbsp; {Number(item.longitude).toFixed(4)}° E/W</strong></div></div><div className="detail-note"><span className="eyebrow">CATALOG NOTE</span><p>{item.historicalNote || "No historical note has been added to this digital territory record."}</p></div><p className="legal-callout">This listing represents a digital territory within EARTH616 only. It does not convey legal ownership of physical land, real estate, or sovereign territory.</p></section>
        <aside className="detail-side"><div className="territory-code">TERRITORY ID <strong>{item.territoryId}</strong></div><div className="detail-stat"><span>STATUS</span><strong>{item.status}</strong></div><div className="detail-stat"><span>TERRITORY POWER</span><strong>{item.territoryPower.toLocaleString()}</strong></div><div className="detail-stat"><span>AREA / UNITS</span><strong>{Number(item.areaUnits).toLocaleString()}</strong></div><div className="detail-stat"><span>CURRENT PRICE</span><strong>{money(item.currentPrice)}</strong><small>Platform price · E616 is an internal credit unit, not legal tender.</small></div>{item.owner && <div className="detail-owner"><span>PUBLIC OWNER</span><strong>{item.owner.displayName}</strong><small>@{item.owner.username}</small></div>}<button className="button-primary button-wide" disabled={item.status === "LOCKED" || item.status === "OWNED"} onClick={claim}>{item.status === "AVAILABLE" || item.status === "FEATURED" ? user ? "Claim territory" : "Sign in to continue" : item.status === "OWNED" ? "Already claimed" : "Unavailable"}<ArrowRight size={17} /></button>{notice && <p className="inline-notice" role="status">{notice}</p>}<p className="detail-fineprint"><LockKeyhole size={13} /> Purchases require verified server-side payment. Checkout is currently unavailable.</p></aside>
      </div>
    </> : null}
  </main><SiteFooter /></div>;
}
