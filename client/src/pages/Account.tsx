import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, Compass, ExternalLink, Fingerprint, LayoutDashboard, LogOut, ShieldCheck, WalletCards } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { trpc } from "@/lib/trpc";

type AccountView = "dashboard" | "my-territories" | "wallet" | "identity" | "profile" | "notifications" | "settings";
const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "My territories", href: "/my-territories", icon: Compass },
  { label: "Wallet", href: "/wallet", icon: WalletCards },
  { label: "Identity", href: "/identity", icon: Fingerprint },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: ShieldCheck },
];

function ProtectedMessage({ loading }: { loading: boolean }) {
  return <div className="catalog-empty auth-message">{loading ? <><span className="signal-dot" /> Checking your secure session…</> : <><span className="eyebrow">ACCOUNT ACCESS</span><strong>Sign in to continue.</strong><p>Your profile, wallet and territory records are private to your account.</p><button className="button-primary" onClick={() => startLogin()}>Continue to sign in <ArrowRight size={17} /></button></>}</div>;
}

function WalletTopupPanel({ identityId }: { identityId?: string }) {
  const utils = trpc.useUtils();
  const history = trpc.account.wallet.topups.list.useQuery();
  const [amount, setAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const submit = trpc.account.wallet.topups.submit.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.account.wallet.topups.list.invalidate(), utils.account.wallet.summary.invalidate()]);
      setAmount("");
      setPaymentReference("");
      setReceiptUrl("");
    },
  });
  const note = identityId ? `EARTH616 wallet top-up · ${identityId}` : "EARTH616 wallet top-up";

  return <section className="wallet-topup-panel" aria-labelledby="wallet-topup-heading">
    <div className="account-section-head"><div><span className="eyebrow">MANUAL PAYMENT</span><h3 id="wallet-topup-heading">Add E616 credit</h3></div><span>RAZORPAY</span></div>
    <p>Pay securely to <strong>BUKKA CHARAN</strong> through Razorpay. Enter the amount there and add this note if prompted: <code>{note}</code>. After payment, return here and submit the official Razorpay payment ID or UTR plus the receipt URL provided after payment.</p>
    <a className="button-outline wallet-pay-link" href="https://razorpay.me/@bukkacharan" target="_blank" rel="noopener noreferrer">Open Razorpay payment page <ExternalLink size={15} /></a>
    <p className="wallet-verification-note">Submitting a reference and receipt URL does not credit your wallet. An administrator must independently verify the payment, amount and payee in Razorpay first; the URL is supporting evidence, not proof by itself.</p>
    <form className="wallet-topup-form" onSubmit={event => { event.preventDefault(); submit.mutate({ amount: Number(amount), paymentReference: paymentReference.trim(), receiptUrl: receiptUrl.trim() }); }}>
      <label>Amount paid (INR)<input type="number" min="1" max="9999999.99" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>Razorpay payment ID or UTR<input type="text" minLength={3} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9._/-]{2,99}" placeholder="pay_… or bank reference" required value={paymentReference} onChange={event => setPaymentReference(event.target.value)} /></label>
      <label className="wallet-receipt-field">Payment receipt URL<input type="url" maxLength={500} required placeholder="https://…" value={receiptUrl} onChange={event => setReceiptUrl(event.target.value)} /><small>Required after payment. HTTPS only. The review team checks payment details in Razorpay; this link alone does not verify a payment.</small></label>
      {submit.error && <p className="form-error" role="alert">{submit.error.message}</p>}
      {submit.isSuccess && <p className="wallet-pending-message" role="status">Request submitted. Your E616 balance remains unchanged until manual verification.</p>}
      <button className="button-primary" type="submit" disabled={submit.isPending}>{submit.isPending ? "Submitting request…" : "Submit for verification"}<ArrowRight size={16} /></button>
    </form>
    <div className="account-section-head wallet-topup-history-heading"><h3>Top-up requests</h3><span>MAX 25 · YOUR ACCOUNT</span></div>
    {history.isLoading ? <div className="quiet-state">Loading top-up requests…</div> : history.error ? <div className="catalog-empty catalog-empty--error">{history.error.message}</div> : history.data?.length ? <div className="wallet-topup-history">{history.data.map(item => <article className="wallet-topup-history-row" key={item.id}><div><strong>{money(item.amount)}</strong><small>{item.paymentReference} · {new Date(item.createdAt).toLocaleString()}</small>{item.reviewNote && <small>{item.reviewNote}</small>}</div><span className={`topup-status topup-status--${item.status.toLowerCase()}`}>{item.status}</span></article>)}</div> : <div className="account-empty"><strong>No top-up requests yet.</strong><p>Verified requests are added to the immutable E616 ledger.</p></div>}
  </section>;
}

export function AccountPage({ view }: { view: AccountView }) {
  const { user, loading, logout } = useAuth();
  const enabled = Boolean(user);
  const dashboard = trpc.account.dashboard.summary.useQuery(undefined, { enabled: enabled && view === "dashboard" });
  const profile = trpc.account.profile.me.useQuery(undefined, { enabled: enabled && (view === "identity" || view === "profile" || view === "settings" || view === "wallet") });
  const owned = trpc.account.territories.mine.useQuery(undefined, { enabled: enabled && view === "my-territories" });
  const wallet = trpc.account.wallet.summary.useQuery(undefined, { enabled: enabled && view === "wallet" });
  const achievements = trpc.account.achievements.useQuery(undefined, { enabled: enabled && view === "identity" });
  const notifications = trpc.account.notifications.list.useQuery(undefined, { enabled: enabled && view === "notifications" });
  const readMutation = trpc.account.notifications.markRead.useMutation({ onSuccess: () => void notifications.refetch() });
  const updateProfile = trpc.account.profile.update.useMutation({ onSuccess: () => void profile.refetch() });
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (!profile.data) return;
    setUsername(profile.data.username);
    setDisplayName(profile.data.displayName);
    setBio(profile.data.bio ?? "");
  }, [profile.data]);

  if (!enabled) return <div className="site-page"><SiteHeader /><main className="inner-page"><ProtectedMessage loading={loading} /></main><SiteFooter /></div>;
  const labels: Record<AccountView, { title: string; accent: string; note: string }> = {
    dashboard: { title: "Your", accent: "command center.", note: "A live view of your EARTH616 account." },
    "my-territories": { title: "Your", accent: "territories.", note: "Digital territory records linked to your account." },
    wallet: { title: "Your", accent: "E616 wallet.", note: "An internal platform-credit ledger—not cryptocurrency or legal tender." },
    identity: { title: "Your", accent: "identity.", note: "An EARTH616 profile built from your real platform record." },
    profile: { title: "Your", accent: "profile.", note: "Manage the public identity fields associated with your account." },
    notifications: { title: "Your", accent: "notifications.", note: "Account and territory activity notices." },
    settings: { title: "Account", accent: "settings.", note: "Update your EARTH616 profile details." },
  };
  const contentLoading = view === "dashboard" ? dashboard.isLoading : view === "my-territories" ? owned.isLoading : view === "wallet" ? wallet.isLoading : view === "notifications" ? notifications.isLoading : (view === "identity" || view === "profile" || view === "settings") ? profile.isLoading : false;
  const contentError = view === "dashboard" ? dashboard.error : view === "my-territories" ? owned.error : view === "wallet" ? wallet.error : view === "notifications" ? notifications.error : (view === "identity" || view === "profile" || view === "settings") ? profile.error : null;
  return <div className="site-page"><SiteHeader /><main className="inner-page account-page">
    <div className="account-heading"><div><div className="eyebrow"><span className="signal-dot" /> EARTH616 / ACCOUNT</div><h1>{labels[view].title}<br /><span>{labels[view].accent}</span></h1><p>{labels[view].note}</p></div><button className="signout-link" onClick={() => void logout()}>Sign out <LogOut size={15} /></button></div>
    <div className="account-layout"><aside className="account-nav"><span className="eyebrow">NAVIGATE</span>{navItems.map(item => <Link className="account-nav-link" href={item.href} key={item.href}><item.icon size={17} />{item.label}<ArrowUpRight size={13} /></Link>)}</aside>
      <section className="account-content">
        {contentLoading ? <div className="quiet-state">Loading your account record…</div> : contentError ? <div className="catalog-empty catalog-empty--error"><strong>Account data unavailable.</strong><p>{contentError.message}</p></div> : null}
        {!contentLoading && !contentError && view === "dashboard" && dashboard.data && <>
          <div className="dashboard-welcome"><span className="eyebrow">WELCOME BACK</span><h2>{user?.name || "Explorer"}</h2><p>Digital territory ownership is represented only in the EARTH616 platform.</p></div>
          <div className="stat-grid"><article><span>TERRITORIES OWNED</span><strong>{dashboard.data.territoriesOwned.toLocaleString()}</strong></article><article><span>TERRITORY POWER</span><strong>{dashboard.data.territoryPower.toLocaleString()}</strong></article><article><span>GLOBAL RANK</span><strong>{dashboard.data.globalRank ? `#${dashboard.data.globalRank}` : "—"}</strong></article><article><span>E616 BALANCE</span><strong>{money(dashboard.data.e616Balance)}</strong></article></div>
          <div className="account-section-head"><h3>Recent activity</h3><span>LIVE ACCOUNT RECORD</span></div>
          {dashboard.data.recentActivity.length ? <div className="activity-list">{dashboard.data.recentActivity.map(item => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><strong>{item.summary}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div> : <div className="account-empty"><span className="empty-orbit" /><strong>No activity recorded yet.</strong><p>When platform events occur, they will appear here.</p><Link href="/explore" className="text-link">Explore Earth <ArrowRight size={15} /></Link></div>}
        </>}
        {!contentLoading && !contentError && view === "my-territories" && <>
          <div className="account-section-head"><h2>Owned digital territories</h2><span>{owned.data?.length ?? 0} RECORDS</span></div>
          {owned.data?.length ? <div className="owned-list">{owned.data.map(item => <Link href={`/territory/${item.territoryId}`} className="owned-row" key={item.territoryId}><span className="owned-code">{item.territoryId}<small>{item.rarity}</small></span><strong>{item.name}<small>{item.region} / {item.country}</small></strong><span>{item.territoryPower.toLocaleString()}<small>POWER</small></span><span>{money(item.currentPrice)}<small>CATALOG PRICE</small></span><ArrowUpRight size={16} /></Link>)}</div> : <div className="account-empty"><span className="empty-orbit" /><strong>No territory records yet.</strong><p>When a verified claim is completed, its ownership record will appear here.</p><Link href="/explore" className="text-link">Explore the live catalog <ArrowRight size={15} /></Link></div>}
        </>}
        {!contentLoading && !contentError && view === "wallet" && wallet.data && <>
          <div className="wallet-balance-panel"><div><span>AVAILABLE E616</span><strong>{money(wallet.data.balance)}</strong><small>1 E616 = ₹1 · Internal platform credit only</small></div><div className="wallet-pending"><span>PENDING</span><strong>{money(wallet.data.pending)}</strong></div></div>
          <div className="wallet-summary"><div><span>SPENT</span><strong>{money(wallet.data.spent)}</strong></div><div><span>RECEIVED</span><strong>{money(wallet.data.received)}</strong><small>Verified ledger credits only; not available for cashout.</small></div></div>
          <div className="legal-callout">E616 is an internal platform-credit model for the MVP. It is not cryptocurrency, a security, an investment product, guaranteed-return asset, or legal tender. Manual Razorpay payment claims stay pending until an administrator verifies them; no credits are assigned automatically.</div>
          <WalletTopupPanel identityId={profile.data?.identityId} />
          <div className="account-section-head"><h3>Immutable transaction ledger</h3><span>{wallet.data.transactions.length} ENTRIES</span></div>
          {wallet.data.transactions.length ? <div className="ledger-list">{wallet.data.transactions.map(item => <div className="ledger-row" key={item.id}><div><strong>{item.memo || item.type}</strong><small>{new Date(item.createdAt).toLocaleString()} · {item.status}</small></div><span className={item.type === "PURCHASE" ? "ledger-negative" : ""}>{item.type === "PURCHASE" ? "−" : "+"}{money(item.amount)}</span></div>)}</div> : <div className="account-empty"><strong>No ledger entries.</strong><p>Wallet activity appears after a verified platform transaction. No balance changes can be made from this page.</p></div>}
        </>}
        {!contentLoading && !contentError && view === "identity" && profile.data && <>
          <div className="identity-profile"><div className="identity-avatar"><Fingerprint size={42} /></div><div><span className="eyebrow">EARTH616 ID</span><strong>{profile.data.identityId}</strong><p>@{profile.data.username} · {profile.data.identityLevel}</p></div></div>
          <div className="identity-data-grid"><div><span>DISPLAY NAME</span><strong>{profile.data.displayName}</strong></div><div><span>JOINED</span><strong>{new Date(profile.data.createdAt).toLocaleDateString()}</strong></div><div><span>TERRITORIES</span><strong>{profile.data.territoryCount.toLocaleString()}</strong></div><div><span>TERRITORY POWER</span><strong>{profile.data.territoryPower.toLocaleString()}</strong></div></div>
          <div className="account-section-head"><h3>Achievements</h3><span>{achievements.data?.length ?? 0} UNLOCKED</span></div>
          {achievements.isLoading ? <div className="quiet-state">Checking achievements…</div> : achievements.data?.length ? <div className="achievement-list">{achievements.data.map(item => <article key={item.slug}><ShieldCheck size={18} /><div><strong>{item.name}</strong><p>{item.description}</p></div><span>+{item.powerBonus} POWER</span></article>)}</div> : <div className="account-empty"><strong>No achievements unlocked yet.</strong><p>Unlock conditions are evaluated by the platform when corresponding activity is recorded.</p></div>}
        </>}
        {!contentLoading && !contentError && (view === "profile" || view === "settings") && profile.data && <>
          <form className="profile-form" onSubmit={event => { event.preventDefault(); updateProfile.mutate({ username, displayName, bio }); }}>
            <div className="account-section-head"><h2>Profile details</h2><span>PUBLIC IDENTITY</span></div>
            <label>Display name<input maxLength={80} value={displayName} onChange={e => setDisplayName(e.target.value)} required /></label>
            <label>Username<input maxLength={32} pattern="[A-Za-z0-9_-]{3,32}" value={username} onChange={e => setUsername(e.target.value)} required /><small>3–32 characters; letters, numbers, underscores or hyphens.</small></label>
            <label>Bio<textarea maxLength={280} rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="A short introduction (optional)" /></label>
            <div className="profile-form-foot"><button className="button-primary" type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? "Saving…" : "Save profile"}<ArrowRight size={16} /></button>{updateProfile.error && <span role="alert">{updateProfile.error.message}</span>}{updateProfile.isSuccess && <span role="status">Profile updated.</span>}</div>
          </form>
        </>}
        {!contentLoading && !contentError && view === "notifications" && <>
          <div className="account-section-head"><h2>Notifications</h2><span>{notifications.data?.length ?? 0} RECORDS</span></div>
          {notifications.data?.length ? <div className="notification-list">{notifications.data.map(item => <article className={item.readAt ? "notification-row is-read" : "notification-row"} key={item.id}><span className="notification-marker" /><div><strong>{item.title}</strong><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString()}</small></div>{!item.readAt && <button className="text-link" onClick={() => readMutation.mutate({ id: item.id })}>Mark read</button>}</article>)}</div> : <div className="account-empty"><strong>You’re all caught up.</strong><p>There are no notifications on this account.</p></div>}
        </>}
      </section>
    </div>
  </main><SiteFooter /></div>;
}
