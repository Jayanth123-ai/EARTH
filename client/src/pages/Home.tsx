import { ArrowDown, ArrowRight, ArrowUpRight, Compass, Fingerprint, Globe2, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { trpc } from "@/lib/trpc";

const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));

export default function Home() {
  const featured = trpc.territories.list.useQuery({ status: "FEATURED", limit: 3, page: 1, sort: "newest" });
  const rankings = trpc.territories.rankings.useQuery({ category: "power", limit: 3 });
  return <div className="site-page">
    <SiteHeader />
    <main>
      <section className="hero-section">
        <div className="hero-atmosphere" aria-hidden="true"><i /><i /><i /></div>
        <div className="hero-content">
          <div className="hero-kicker"><span className="signal-dot" /> A NEW KIND OF DIGITAL TERRITORY</div>
          <h1>Own a piece<br /><span>of Earth.</span></h1>
          <p className="hero-subtitle">Explore digital territories. Build your identity.<br className="desktop-break" /> Claim your place in EARTH616.</p>
          <div className="hero-actions">
            <Link href="/explore" className="button-primary">Explore Earth <ArrowRight size={20} /></Link>
            <Link href="/dashboard" className="button-outline">Open dashboard <ArrowUpRight size={18} /></Link>
          </div>
          <a href="#what-is-earth616" className="hero-scroll" aria-label="Scroll to learn about EARTH616"><span>SCROLL TO DISCOVER</span><ArrowDown size={14} /></a>
        </div>
        <div className="hero-index" aria-hidden="true"><span>001</span><span className="index-rule" /><span>EARTH / DIGITAL</span></div>
      </section>

      <section className="intro-section content-section" id="what-is-earth616">
        <div className="section-rail"><span>01</span><span>THE PLATFORM</span></div>
        <div className="intro-grid">
          <h2>A digital world.<br /><span>A place to make yours.</span></h2>
          <div className="intro-copy"><p>EARTH616 is a platform for discovering and claiming digital territories, shaping a personal identity, and building Territory Power through participation.</p><p className="quiet-copy">Every territory is a digital platform asset only. No claim of physical land, real estate, or sovereign ownership is made.</p><Link href="/how-it-works" className="text-link">Understand the system <ArrowRight size={16} /></Link></div>
        </div>
      </section>

      <section className="earth-section content-section" id="explore-earth">
        <div className="section-rail"><span>02</span><span>THE ATLAS</span></div>
        <div className="earth-feature">
          <div className="earth-image-wrap"><img src="/manus-storage/earth-at-night_0608212a.png" alt="Satellite image of Earth's night lights, used as an atmospheric illustration" loading="lazy" /><div className="earth-image-shade" /><div className="earth-coordinate">01° 17′ N &nbsp; 103° 51′ E</div><span className="earth-corner-label">A WORLD IN REACH</span></div>
          <div className="earth-copy"><div className="eyebrow">EXPLORE EARTH / 001</div><h2>Find your<br /><span>coordinates.</span></h2><p>Move through a catalog of digital territories. Search by region, rarity, availability, or price—then open a territory to see its real catalog details.</p><Link href="/explore" className="button-primary">Enter the atlas <ArrowRight size={18} /></Link><a className="image-credit" href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/" target="_blank" rel="noreferrer">Atmospheric image: NASA Earth at Night <ArrowUpRight size={12} /></a></div>
        </div>
      </section>

      <section className="system-section content-section" id="territory-system">
        <div className="section-rail"><span>03</span><span>TERRITORY SYSTEM</span></div>
        <div className="section-heading-row"><h2>Choose your<br /><span>kind of ground.</span></h2><p>Rarity describes a digital territory's place in the EARTH616 catalog—not a promise of value or return.</p></div>
        <div className="rarity-grid">
          {[["01", "COMMON", "A starting point for every explorer."], ["02", "RARE", "A distinct place in the atlas."], ["03", "EPIC", "A territory with notable presence."], ["04", "LEGENDARY", "A standout in the digital world."], ["05", "MYTHIC", "The rarest catalog classification."]].map(([no, name, text]) => <article className="rarity-row" key={name}><span className="rarity-no">{no}</span><h3>{name}</h3><p>{text}</p><span className={`rarity-mark rarity-mark--${name.toLowerCase()}`} /></article>)}
        </div>
      </section>

      <section className="steps-section content-section" id="how-it-works">
        <div className="section-rail"><span>04</span><span>HOW IT WORKS</span></div>
        <div className="section-heading-row"><h2>From discovery<br /><span>to identity.</span></h2><p>Four clear steps. No hidden mechanics, no physical-property claims.</p></div>
        <div className="steps-grid">
          <article><span className="step-number">01 / EXPLORE</span><Compass /><h3>Find a territory</h3><p>Search the live catalog and inspect region, classification, availability, and platform price.</p></article>
          <article><span className="step-number">02 / CLAIM</span><Globe2 /><h3>Claim digitally</h3><p>When checkout is enabled, verified server-side payment can create a digital ownership record.</p></article>
          <article><span className="step-number">03 / BUILD</span><Sparkles /><h3>Build your identity</h3><p>Earn achievements and shape an EARTH616 profile. Identity levels are participation labels, not financial tiers.</p></article>
          <article><span className="step-number">04 / RISE</span><ShieldCheck /><h3>Grow Territory Power</h3><p>Server-calculated power reflects territory attributes and recorded activity—not a client-set score.</p></article>
        </div>
      </section>

      <section className="power-section content-section" id="territory-power">
        <div className="power-ornament" aria-hidden="true">616</div>
        <div className="section-rail"><span>05</span><span>YOUR PRESENCE</span></div>
        <div className="power-content"><div className="eyebrow">A PLATFORM SCORE</div><h2>Territory<br /><span>Power.</span></h2><p>A server-calculated measure of your recorded presence in EARTH616. It can reflect the number and rarity of digital territories, their age, achievements, and platform activity.</p><div className="power-note"><ShieldCheck size={17} /><span>Calculated on the server. Not an investment metric, financial tier, or promised return.</span></div></div>
      </section>

      <section className="rankings-section content-section" id="rankings-preview">
        <div className="section-rail"><span>06</span><span>GLOBAL RANKINGS</span></div>
        <div className="section-heading-row"><h2>Make your<br /><span>mark.</span></h2><Link href="/rankings" className="text-link">View rankings <ArrowRight size={16} /></Link></div>
        {rankings.isLoading ? <div className="quiet-state">Loading live rankings…</div> : rankings.error ? <div className="quiet-state">Rankings are temporarily unavailable.</div> : rankings.data?.entries.length ? <div className="leader-list">{rankings.data.entries.map((entry, index) => <Link className="leader-row" href="/rankings" key={entry.identityId}><span className="leader-rank">{String(index + 1).padStart(2, "0")}</span><span className="leader-name">{entry.displayName}<small>@{entry.username}</small></span><span className="leader-power">{entry.territoryPower.toLocaleString()} <small>POWER</small></span><ArrowUpRight size={17} /></Link>)}</div> : <div className="empty-line"><span className="empty-orbit" /><div><strong>The first mark is still waiting.</strong><p>Rankings appear when real Territory Power is recorded.</p></div><Link href="/explore" className="text-link">Explore the atlas <ArrowRight size={15} /></Link></div>}
      </section>

      <section className="market-preview content-section" id="marketplace-preview">
        <div className="section-rail"><span>07</span><span>MARKETPLACE</span></div>
        <div className="section-heading-row"><h2>Places with<br /><span>possibility.</span></h2><Link href="/marketplace" className="text-link">Open marketplace <ArrowRight size={16} /></Link></div>
        {featured.isLoading ? <div className="quiet-state">Reading the live territory catalog…</div> : featured.error ? <div className="quiet-state">The territory catalog is temporarily unavailable.</div> : featured.data?.items.length ? <div className="market-grid">{featured.data.items.map(item => <Link className="market-row" href={`/territory/${item.territoryId}`} key={item.id}><div className="territory-code">{item.territoryId}<span>{item.rarity}</span></div><h3>{item.name}</h3><p>{item.region} / {item.country}</p><div className="territory-bottom"><span>{money(item.currentPrice)}</span><span>{item.status}</span><ArrowUpRight size={16} /></div></Link>)}</div> : <div className="empty-line"><div className="empty-orbit" /><div><strong>No featured territories are listed yet.</strong><p>This preview will populate from the live territory catalog.</p></div><Link href="/explore" className="text-link">Browse all territories <ArrowRight size={15} /></Link></div>}
      </section>

      <section className="identity-section content-section" id="identity-preview">
        <div className="section-rail"><span>08</span><span>EARTH616 IDENTITY</span></div>
        <div className="identity-card"><div className="identity-orbit" aria-hidden="true"><Fingerprint size={96} strokeWidth={0.8} /></div><div><div className="eyebrow">YOUR PLACE IN THE SYSTEM</div><h2>Identity is<br /><span>earned here.</span></h2><p>An EARTH616 ID brings your territories, activity, Territory Power, and achievements together in one profile.</p><Link href="/identity" className="button-outline">View identity <ArrowUpRight size={16} /></Link></div><div className="identity-levels"><span>INITIATE</span><i /><span>EXPLORER</span><i /><span>CLAIMER</span><i /><span>BUILDER</span><i /><span>COMMANDER</span><i /><span>LEGEND</span></div></div>
      </section>

      <section className="final-cta content-section"><div className="eyebrow">THE NEXT PLACE IS YOURS TO DISCOVER</div><h2>Find your<br /><span>place in Earth.</span></h2><p>Start with the atlas. Your account and any future purchase remain separate steps.</p><Link href="/explore" className="button-primary">Explore Earth <ArrowRight size={18} /></Link></section>
    </main>
    <SiteFooter />
  </div>;
}
