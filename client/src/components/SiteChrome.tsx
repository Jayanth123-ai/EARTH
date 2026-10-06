import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const publicLinks = [
  ["Explore", "/explore"],
  ["Marketplace", "/marketplace"],
  ["Rankings", "/rankings"],
  ["How it works", "/how-it-works"],
] as const;

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="EARTH616">
    <span>EARTH</span><span className="brand-red">616</span>
  </span>;
}

export function SiteHeader() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const enter = () => user ? setLocation("/dashboard") : setOpen(true);
  return <>
    <header className="site-header">
      <Link href="/" className="brand-link" aria-label="EARTH616 home"><Brand /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {publicLinks.map(([label, href]) => <Link key={href} href={href} className="nav-link">{label}</Link>)}
      </nav>
      <button className="wallet-connect" onClick={enter}>
        <span>{user ? "Open dashboard" : "Connect wallet"}</span><ArrowUpRight size={16} aria-hidden="true" />
      </button>
      <button className="mobile-menu-button" aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu(v => !v)}>
        {menu ? <X size={21} /> : <Menu size={21} />}
      </button>
    </header>
    {menu && <div className="mobile-nav" aria-label="Mobile navigation">
      {publicLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setMenu(false)}>{label}<ArrowUpRight size={15} /></Link>)}
      <button onClick={() => { setMenu(false); enter(); }}>{user ? "Open dashboard" : "Connect wallet"}<ArrowUpRight size={15} /></button>
    </div>}
    {open && <div className="dialog-scrim" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <section className="connect-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-title">
        <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
        <div className="eyebrow">EARTH616 ACCESS</div>
        <h2 id="connect-title">Your place starts here.</h2>
        <p>EARTH616 uses an internal platform ledger for digital territories. No cryptocurrency wallet is connected or required.</p>
        <button className="button-primary button-wide" onClick={() => startLogin()}>Sign in with Manus <ArrowUpRight size={17} /></button>
        <p className="dialog-note">Signing in opens a secure account session. It does not purchase a territory or connect a crypto wallet.</p>
      </section>
    </div>}
  </>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="footer-top">
      <Link href="/" className="brand-link"><Brand compact /></Link>
      <p>Explore digital territories.<br />Build your place in the atlas.</p>
      <div className="footer-links">
        <Link href="/about">About</Link><Link href="/how-it-works">How it works</Link><Link href="/legal">Legal</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link>
      </div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} EARTH616</span><span>Digital territories only. No physical land or real estate ownership is conveyed.</span></div>
  </footer>;
}
