import { useState } from "react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { trpc } from "@/lib/trpc";

const money = (value: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value));

export function AdminWalletTopups() {
  const { user, loading } = useAuth();
  const admin = user?.role === "admin";
  const utils = trpc.useUtils();
  const requests = trpc.admin.walletTopups.list.useQuery(undefined, { enabled: admin });
  const [verifiedIds, setVerifiedIds] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const review = trpc.admin.walletTopups.review.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.admin.walletTopups.list.invalidate(),
        utils.admin.ledger.invalidate(),
        utils.admin.audit.invalidate(),
        utils.admin.reports.invalidate(),
        utils.account.wallet.summary.invalidate(),
        utils.account.wallet.topups.list.invalidate(),
      ]);
      setNotice(result.status === "VERIFIED" ? `Verified ${money(result.amount)} and credited the E616 wallet.` : "Top-up request rejected; no E616 credit was issued.");
    },
  });

  if (loading) return <div className="site-page"><SiteHeader /><main className="inner-page"><div className="catalog-empty">Checking administrator session…</div></main><SiteFooter /></div>;
  if (!user) return <div className="site-page"><SiteHeader /><main className="inner-page"><div className="catalog-empty auth-message"><span className="eyebrow">ADMIN ACCESS</span><strong>Sign in to continue.</strong><button className="button-primary" onClick={() => startLogin()}>Sign in <ArrowRight size={16} /></button></div></main><SiteFooter /></div>;
  if (!admin) return <div className="site-page"><SiteHeader /><main className="inner-page"><div className="catalog-empty auth-message"><ShieldCheck size={22} /><strong>Administrator access required.</strong><p>This area is protected by server-side role authorization.</p><Link href="/dashboard" className="text-link">Return to dashboard <ArrowRight size={15} /></Link></div></main><SiteFooter /></div>;

  return <div className="site-page"><SiteHeader /><main className="inner-page admin-page">
    <section className="admin-content admin-topups-panel">
      <div className="admin-topups-topline"><Link href="/admin" className="text-link"><ArrowLeft size={15} /> Back to admin</Link><span className="eyebrow"><ShieldCheck size={14} /> FINANCIAL REVIEW / MANUAL</span></div>
      <div className="account-section-head"><div><span className="eyebrow">RAZORPAY ME · BUKKA CHARAN</span><h2>Wallet top-up requests</h2></div><span>MAX 100</span></div>
      <p className="admin-subcopy">Check each payment in the Razorpay merchant dashboard before approval. The submitted payment reference and receipt URL are untrusted user input; a receipt link or screenshot alone is not proof. Approving a request posts one immutable E616 credit and is audit logged. The unique official Razorpay payment ID prevents the same payment being credited twice.</p>
      <div className="admin-topup-warning">Only verify after confirming the successful amount and payment ID in Razorpay. Payment is not automatically verified by this app.</div>
      {notice && <p className="admin-notice" role="status">{notice}</p>}
      {requests.isLoading ? <div className="quiet-state">Loading top-up requests…</div> : requests.error ? <div className="catalog-empty catalog-empty--error">{requests.error.message}</div> : requests.data?.length ? <div className="admin-topup-list">{requests.data.map(item => <article className="admin-topup-card" key={item.id}>
        <div className="admin-topup-card-head"><div><span className={`topup-status topup-status--${item.status.toLowerCase()}`}>{item.status}</span><strong>{item.displayName || item.username || `User ${item.userId}`}</strong><small>@{item.username || `user-${item.userId}`} · User #{item.userId}</small></div><strong className="admin-topup-amount">{money(item.amount)}<small>REQUESTED INR</small></strong></div>
        <dl className="admin-topup-details"><div><dt>Submitted reference</dt><dd><code>{item.paymentReference}</code></dd></div><div><dt>Submitted</dt><dd>{new Date(item.createdAt).toLocaleString()}</dd></div>{item.receiptUrl && <div className="admin-topup-receipt"><dt>Receipt URL · unverified</dt><dd><code>{item.receiptUrl}</code></dd></div>}{item.verifiedPaymentId && <div><dt>Verified Razorpay payment ID</dt><dd><code>{item.verifiedPaymentId}</code></dd></div>}{item.reviewNote && <div className="admin-topup-receipt"><dt>Review note</dt><dd>{item.reviewNote}</dd></div>}</dl>
        {item.status === "PENDING" && <div className="admin-topup-review">
          <label>Official Razorpay payment ID verified in dashboard<input type="text" maxLength={100} pattern="pay_[A-Za-z0-9]+" placeholder="pay_…" value={verifiedIds[item.id] ?? ""} onChange={event => setVerifiedIds(current => ({ ...current, [item.id]: event.target.value }))} /></label>
          <label>Review note (optional)<textarea maxLength={500} rows={2} value={notes[item.id] ?? ""} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} placeholder="Reconciliation note" /></label>
          <div className="admin-topup-actions">
            <button className="button-primary" disabled={review.isPending} onClick={() => {
              const providerId = (verifiedIds[item.id] ?? "").trim();
              if (!/^pay_[A-Za-z0-9]+$/.test(providerId)) { setNotice("Enter the official Razorpay payment ID after checking the merchant dashboard."); return; }
              if (!window.confirm(`Confirm payment ${providerId} for ${money(item.amount)} from ${item.displayName || item.username || `user ${item.userId}`} is settled in Razorpay, and credit this amount in E616?`)) return;
              setNotice("");
              review.mutate({ requestId: item.id, decision: "VERIFY", verifiedPaymentId: providerId, reviewNote: notes[item.id]?.trim() || undefined });
            }}>{review.isPending ? "Reviewing…" : "Verify & credit E616"}<ArrowRight size={15} /></button>
            <button className="admin-small-action" disabled={review.isPending} onClick={() => {
              if (!window.confirm(`Reject this ${money(item.amount)} top-up request? No E616 will be credited.`)) return;
              setNotice("");
              review.mutate({ requestId: item.id, decision: "REJECT", reviewNote: notes[item.id]?.trim() || undefined });
            }}>Reject request</button>
          </div>
          {review.error && <p className="form-error" role="alert">{review.error.message}</p>}
        </div>}
      </article>)}</div> : <div className="account-empty"><strong>No manual top-up requests.</strong><p>User-submitted payment claims will appear here and remain pending until independently reviewed.</p></div>}
    </section>
  </main><SiteFooter /></div>;
}
