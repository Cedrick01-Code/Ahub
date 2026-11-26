import React, { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, ClipboardList, MessageCircle, Plus, RefreshCw, Send, ShieldCheck, Stethoscope, Tag } from 'lucide-react';
import { workflowsApi } from '../lib/workflowsApi';

type Row = Record<string, any>;
type Envelope<T> = { data: T };
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50';
const panel = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';
const title = 'text-base font-bold text-slate-900';
const staffRoles = ['sector', 'district', 'province', 'rab'];

function Section({ heading, children, icon: Icon = Activity }: { heading: string; children: React.ReactNode; icon?: React.ElementType }) {
  return <section className={panel}><div className="mb-4 flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Icon size={18}/></span><h2 className={title}>{heading}</h2></div>{children}</section>;
}

function Status({ value }: { value: string }) {
  const tone = ['resolved', 'fulfilled', 'accepted', 'published'].includes(value) ? 'bg-emerald-50 text-emerald-700' : ['emergency', 'high', 'urgent'].includes(value) ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}>{String(value || 'open').replaceAll('_', ' ')}</span>;
}

export function WorkflowCenter({ portal, announce }: { portal: string; announce: (message: string) => void }) {
  const [demands, setDemands] = useState<Row[]>([]);
  const [cases, setCases] = useState<Row[]>([]);
  const [conversations, setConversations] = useState<Row[]>([]);
  const [messages, setMessages] = useState<Row[]>([]);
  const [selectedConversation, setSelectedConversation] = useState('');
  const [prices, setPrices] = useState<Row[]>([]);
  const [audit, setAudit] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [userProfile] = useState<Row>(() => { try { return JSON.parse(localStorage.getItem('ahub_user') || '{}'); } catch { return {}; } });
  const isStaff = staffRoles.includes(portal);
  const canViewDemand = ['farmer', 'customer', ...staffRoles].includes(portal);
  const canViewVet = ['farmer', ...staffRoles].includes(portal);
  const canViewMessages = portal !== 'nsg';
  const canViewPrices = portal !== 'nsg';
  const canViewAudit = ['nsg', 'rab'].includes(portal);

  const refresh = useCallback(async () => {
    setBusy(true);
    const jobs: Promise<void>[] = [];
    if (canViewDemand) jobs.push(workflowsApi<Envelope<any>>('/market/demand').then(r => setDemands(Array.isArray(r.data) ? r.data : r.data.items || [])));
    if (canViewVet) jobs.push(workflowsApi<Envelope<Row[]>>('/veterinary/cases').then(r => setCases(r.data || [])));
    if (canViewMessages) jobs.push(workflowsApi<Envelope<Row[]>>('/conversations').then(r => setConversations(r.data || [])));
    if (canViewPrices) jobs.push(workflowsApi<Envelope<Row[]>>('/prices').then(r => setPrices(r.data || [])));
    if (canViewAudit) jobs.push(workflowsApi<Envelope<any>>('/audit/events').then(r => setAudit(r.data.items || [])));
    const results = await Promise.allSettled(jobs);
    const rejected = results.find(x => x.status === 'rejected') as PromiseRejectedResult | undefined;
    if (rejected) announce(rejected.reason instanceof Error ? rejected.reason.message : 'Some workflow data could not be loaded.');
    setBusy(false);
  }, [canViewDemand, canViewVet, canViewMessages, canViewPrices, canViewAudit, announce]);

  useEffect(() => { void refresh(); }, [portal]);

  const openConversation = async (id: string) => {
    setSelectedConversation(id);
    try {
      const r = await workflowsApi<Envelope<Row[]>>(`/conversations/${id}/messages`);
      setMessages(r.data || []);
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not load messages.'); }
  };

  const submitDemand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const location = {
      province: String(form.get('province') || userProfile.province || ''),
      district: String(form.get('district') || userProfile.district || ''),
      sector: String(form.get('sector') || userProfile.sector || ''),
      cell: String(form.get('cell') || ''),
      village: String(form.get('village') || ''),
    };
    try {
      await workflowsApi('/market/demand', 'POST', {
        productName: form.get('productName'), category: form.get('category'),
        quantity: Number(form.get('quantity')), unit: form.get('unit'),
        budgetPerUnit: form.get('budgetPerUnit') ? Number(form.get('budgetPerUnit')) : undefined,
        requiredBy: form.get('requiredBy') || undefined, notes: form.get('notes'), location,
      });
      formElement.reset();
      announce('Your demand request has been published to farmers in the selected area.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not create demand request.'); }
  };

  const submitCase = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await workflowsApi('/veterinary/cases', 'POST', {
        issueTitle: form.get('issueTitle'), description: form.get('description'),
        category: form.get('category'), urgency: form.get('urgency'),
        productionUnitId: form.get('productionUnitId') || undefined,
      });
      event.currentTarget.reset();
      announce('Your veterinary case has been sent to the sector veterinary team.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not submit veterinary case.'); }
  };

  const startConversation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const r = await workflowsApi<Envelope<Row>>('/conversations', 'POST', {
        recipientId: form.get('recipientId'), subject: form.get('subject'),
        firstMessage: form.get('firstMessage'), contextType: 'general',
      });
      event.currentTarget.reset();
      announce('Conversation opened.');
      await refresh();
      await openConversation(r.data._id);
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not start conversation.'); }
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedConversation) return;
    const form = new FormData(event.currentTarget);
    try {
      await workflowsApi(`/conversations/${selectedConversation}/messages`, 'POST', { body: form.get('body') });
      event.currentTarget.reset();
      await openConversation(selectedConversation);
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Message could not be sent.'); }
  };

  const submitPrice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await workflowsApi('/prices', 'POST', {
        commodity: form.get('commodity'), grade: form.get('grade'), unit: form.get('unit'),
        priceRwf: Number(form.get('priceRwf')), effectiveFrom: form.get('effectiveFrom'),
        effectiveTo: form.get('effectiveTo') || undefined, status: 'published',
      });
      event.currentTarget.reset();
      announce('Official price published.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not publish price.'); }
  };

  const updateCase = async (id: string, status: string) => {
    try {
      await workflowsApi(`/veterinary/cases/${id}`, 'PATCH', { status });
      announce('Veterinary case updated.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not update case.'); }
  };

  const requestVisit = async (id: string) => {
    try {
      await workflowsApi(`/veterinary/cases/${id}/visits`, 'POST', { availabilityNote: 'Please contact me to arrange a suitable visit time.' });
      announce('Veterinary visit request sent.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not request a visit.'); }
  };

  const registerInterest = async (id: string) => {
    try {
      await workflowsApi(`/market/demand/${id}/interest`, 'POST', {});
      announce('Your interest has been shared with the customer.');
      await refresh();
    } catch (error) { announce(error instanceof Error ? error.message : 'Could not register interest.'); }
  };

  const dashboardLabel = useMemo(() => ({
    farmer: 'Farmer services', customer: 'Buyer services', sector: 'Sector field operations',
    district: 'District oversight', province: 'Province oversight', rab: 'National agriculture administration',
    nsg: 'Security and audit operations',
  }[portal] || 'AHub workflows'), [portal]);

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-950 to-emerald-800 p-5 text-white">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-200">AHub workflow center</p><h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{dashboardLabel}</h1><p className="mt-1 text-sm text-emerald-100/80">Market demand, veterinary support, communication and official information.</p></div>
      <button className="rounded-xl border border-white/20 bg-white/10 p-3 hover:bg-white/20" onClick={() => void refresh()} aria-label="Refresh workflows"><RefreshCw size={18} className={busy ? 'animate-spin' : ''}/></button>
    </div>

    {portal === 'customer' && <Section heading="Publish a customer demand request" icon={Tag}>
      <form onSubmit={submitDemand} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Product wanted<input name="productName" required className={field} placeholder="e.g. Fresh tomatoes"/></label>
        <label className="text-sm font-medium">Category<select name="category" className={field}><option value="other">Other</option><option value="crops">Crops</option><option value="livestock">Livestock</option><option value="dairy">Dairy</option><option value="eggs">Eggs</option><option value="meat">Meat</option><option value="seeds">Seeds</option></select></label>
        <label className="text-sm font-medium">Quantity<input name="quantity" type="number" min="0.01" step="0.01" required className={field}/></label>
        <label className="text-sm font-medium">Unit<input name="unit" required className={field} placeholder="kg, crates, animals…"/></label>
        <label className="text-sm font-medium">Budget per unit (RWF)<input name="budgetPerUnit" type="number" min="0" className={field}/></label>
        <label className="text-sm font-medium">Required by<input name="requiredBy" type="date" className={field}/></label>
        {(['province','district','sector'] as const).map(k=><label key={k} className="text-sm font-medium capitalize">{k}<input name={k} defaultValue={userProfile[k] || ''} required className={field}/></label>)}
        <label className="text-sm font-medium sm:col-span-2">Additional details<textarea name="notes" rows={3} className={field} placeholder="Quality, delivery details, preferred variety…"/></label>
        <div className="sm:col-span-2"><button className={button}><Plus size={16}/> Publish demand</button></div>
      </form>
    </Section>}

    {portal === 'farmer' && <Section heading="Customer demand in your sector" icon={Tag}>
      <div className="space-y-3">{demands.length ? demands.map(item=><article key={item._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b>{item.productName}</b><Status value={item.status}/></div><p className="mt-1 text-sm text-slate-600">{item.quantity} {item.unit} · {item.location?.sector}, {item.location?.district}</p>{item.budgetPerUnit != null && <p className="text-xs text-slate-500">Budget: {Number(item.budgetPerUnit).toLocaleString()} RWF per {item.unit}</p>}<button className={button+' mt-3'} onClick={()=>void registerInterest(item._id)}>I can supply this</button></article>):<p className="text-sm text-slate-500">No open demand requests are available in your sector.</p>}</div>
    </Section>}

    {portal === 'farmer' && <Section heading="Report an animal or crop problem" icon={Stethoscope}>
      <form onSubmit={submitCase} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">Issue title<input name="issueTitle" required className={field} placeholder="Describe the main problem"/></label>
        <label className="text-sm font-medium">Issue type<select name="category" className={field}><option value="livestock">Livestock</option><option value="crop">Crop</option><option value="general">Other</option></select></label>
        <label className="text-sm font-medium">Urgency<select name="urgency" className={field}><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="emergency">Emergency</option></select></label>
        <label className="text-sm font-medium sm:col-span-2">Production unit ID (optional)<input name="productionUnitId" className={field} placeholder="Paste the production unit ID if relevant"/></label>
        <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" required rows={4} className={field} placeholder="Symptoms, when it started, number of animals/plants affected…"/></label>
        <div className="sm:col-span-2"><button className={button}><Plus size={16}/> Submit case</button></div>
      </form>
    </Section>}

    {canViewVet && <Section heading={portal === 'farmer' ? 'My veterinary cases' : 'Veterinary cases in your jurisdiction'} icon={Stethoscope}>
      <div className="space-y-3"><>{cases.length ? cases.map(item=><article key={item._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b>{item.issueTitle}</b><Status value={item.status}/></div><p className="mt-1 text-xs text-slate-500">{item.farmerId?.fullName || 'You'} · {item.location?.sector}, {item.location?.district} · <Status value={item.urgency}/></p><p className="mt-2 text-sm text-slate-700">{item.description}</p>{portal==='farmer' && !['resolved','closed'].includes(item.status) && <button className={button+' mt-3'} onClick={()=>void requestVisit(item._id)}>Request vet visit</button>}{isStaff && <div className="mt-3 flex flex-wrap items-center gap-2"><label className="text-xs font-semibold text-slate-600">Update status<select className={field+' mt-1 min-w-40'} value={item.status} onChange={e=>void updateCase(item._id,e.target.value)}><option value="open">Open</option><option value="assigned">Assigned</option><option value="visit_requested">Visit requested</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label></div>}</article>):<p className="text-sm text-slate-500">No veterinary cases found.</p>}</></div>
    </Section>}

    {canViewDemand && portal !== 'customer' && portal !== 'farmer' && <Section heading="Regional customer demand" icon={Tag}><div className="space-y-3">{demands.length?demands.map(item=><article key={item._id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><b>{item.productName}</b><Status value={item.status}/></div><p className="text-sm text-slate-600">{item.quantity} {item.unit} · {item.location?.sector}, {item.location?.district}</p></article>):<p className="text-sm text-slate-500">No open demand in your region.</p>}</div></Section>}

    {canViewDemand && portal === 'customer' && <Section heading="My demand requests" icon={ClipboardList}><div className="space-y-3">{demands.length?demands.map(item=><article key={item._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div><b>{item.productName}</b><p className="text-xs text-slate-500">{item.quantity} {item.unit} · {item.location?.sector}</p></div><Status value={item.status}/></article>):<p className="text-sm text-slate-500">You have not published a demand request yet.</p>}</div></Section>}

    {canViewMessages && <Section heading="Direct messages" icon={MessageCircle}>
      <form onSubmit={startConversation} className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Recipient account ID<input name="recipientId" required className={field} placeholder="Paste a farmer/officer account ID"/></label>
        <label className="text-xs font-semibold">Subject<input name="subject" className={field} placeholder="What is this about?"/></label>
        <label className="text-xs font-semibold sm:col-span-2">First message<textarea name="firstMessage" required rows={2} className={field} placeholder="Write your message…"/></label>
        <div className="sm:col-span-2"><button className={button}><Send size={15}/> Start conversation</button></div>
      </form>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">{conversations.length?conversations.map(item=><button key={item._id} onClick={()=>void openConversation(item._id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedConversation===item._id?'border-emerald-400 bg-emerald-50':'border-slate-200 hover:bg-slate-50'}`}><b className="block text-sm">{item.subject}</b><span className="mt-1 block truncate text-xs text-slate-500">{item.lastMessagePreview || 'No messages yet'}</span><span className="mt-1 block text-[10px] text-slate-400">{(item.participants||[]).filter((p:Row)=>p._id!==userProfile._id).map((p:Row)=>p.fullName).join(', ')}</span></button>):<p className="text-sm text-slate-500">No conversations yet.</p>}</div>
        <div className="rounded-xl border border-slate-200 p-3">
          {selectedConversation?<><div className="max-h-72 space-y-2 overflow-y-auto">{messages.map(m=><div key={m._id} className={`max-w-[90%] rounded-xl p-3 text-sm ${m.senderId?._id===userProfile._id?'ml-auto bg-emerald-50':'bg-slate-100'}`}><p>{m.body}</p><span className="mt-1 block text-[10px] text-slate-400">{m.senderId?.fullName || 'Member'} · {new Date(m.createdAt).toLocaleString()}</span></div>)}</div><form onSubmit={sendMessage} className="mt-3 flex gap-2"><input name="body" required className={field} placeholder="Write a reply…"/><button className={button} aria-label="Send message"><Send size={16}/></button></form></>:<p className="py-8 text-center text-sm text-slate-500">Select a conversation to read and reply.</p>}
        </div>
      </div>
    </Section>}

    {canViewPrices && <Section heading="Official commodity prices" icon={Tag}>
      {portal==='rab' && <form onSubmit={submitPrice} className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">Commodity<input name="commodity" required className={field} placeholder="Maize"/></label>
        <label className="text-xs font-semibold">Grade<input name="grade" className={field} defaultValue="standard"/></label>
        <label className="text-xs font-semibold">Unit<input name="unit" required className={field} placeholder="kg"/></label>
        <label className="text-xs font-semibold">Price (RWF)<input name="priceRwf" type="number" min="0" required className={field}/></label>
        <label className="text-xs font-semibold">Effective from<input name="effectiveFrom" type="date" required className={field}/></label>
        <label className="text-xs font-semibold">Effective to<input name="effectiveTo" type="date" className={field}/></label>
        <div className="sm:col-span-2"><button className={button}><Plus size={15}/> Publish official price</button></div>
      </form>}
      <div className="space-y-2">{prices.length?prices.map(item=><div key={item._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><b>{item.commodity}</b><p className="text-xs text-slate-500">{item.grade} · per {item.unit}</p></div><div className="text-right"><b className="text-emerald-800">{Number(item.priceRwf).toLocaleString()} RWF</b><p className="text-[10px] text-slate-400">From {new Date(item.effectiveFrom).toLocaleDateString()}</p></div></div>):<p className="text-sm text-slate-500">No published official prices available.</p>}</div>
    </Section>}

    {canViewAudit && <Section heading="Security and system audit trail" icon={ShieldCheck}><div className="space-y-2">{audit.length?audit.map(item=><article key={item._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm">{item.action}</b><span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span></div><p className="mt-1 text-xs text-slate-600">{item.actorId?.fullName || 'System'} · {item.actorPortal} · {item.targetType}</p></article>):<p className="text-sm text-slate-500">No audit events are recorded yet.</p>}</div></Section>}
  </div>;
}
