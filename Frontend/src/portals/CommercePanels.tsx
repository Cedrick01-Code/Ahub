import { useEffect, useState, type FormEvent } from "react"
import { commerceApi, type OfficialPrice, type DemandRequest, type Conversation, type Message, type Delivery } from "../lib/commerceApi"

type Props = { portal: string; announce: (message: string) => void }
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
const panel = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"

export function CommercePanels({ portal, announce }: Props) {
  const [prices, setPrices] = useState<OfficialPrice[]>([])
  const [demands, setDemands] = useState<DemandRequest[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConversation, setActiveConversation] = useState("")
  const [messageText, setMessageText] = useState("")
  const [contactQuery, setContactQuery] = useState("")
  const [contacts, setContacts] = useState<Array<{_id:string;fullName:string;portal:string;sector?:string;district?:string}>>([])
  const [busy, setBusy] = useState(false)
  const [demand, setDemand] = useState({ commodity: "", quantity: "", unit: "kg", province: "", district: "", notes: "" })
  const [price, setPrice] = useState({ commodity: "", category: "crops", unit: "kg", priceRwf: "", effectiveFrom: new Date().toISOString().slice(0, 10), province: "", district: "", status: "published" as "draft" | "published" })
  const [deliveryOrderId, setDeliveryOrderId] = useState("")

  const refresh = async () => {
    try {
      const [p, d, c, v] = await Promise.all([
        commerceApi.prices(),
        commerceApi.demandRequests(),
        commerceApi.conversations(),
        commerceApi.deliveries(),
      ])
      setPrices(p.data || [])
      setDemands(d.data || [])
      setConversations(c.data || [])
      setDeliveries(v.data || [])
    } catch (error) {
      announce(error instanceof Error ? error.message : "Could not load marketplace services.")
    }
  }
  useEffect(() => { void refresh() }, [portal])

  const loadMessages = async (id: string) => {
    setActiveConversation(id)
    try {
      const result = await commerceApi.messages(id)
      setMessages(result.data || [])
    } catch (error) {
      announce(error instanceof Error ? error.message : "Could not load messages.")
    }
  }

  const createDemand = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await commerceApi.createDemandRequest({ ...demand, quantity: Number(demand.quantity) })
      setDemand({ commodity: "", quantity: "", unit: "kg", province: "", district: "", notes: "" })
      await refresh(); announce("Demand request published for nearby farmers.")
    } catch (error) { announce(error instanceof Error ? error.message : "Could not publish demand.") }
    finally { setBusy(false) }
  }

  const publishPrice = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await commerceApi.publishPrice({ ...price, priceRwf: Number(price.priceRwf), effectiveFrom: new Date(price.effectiveFrom).toISOString(), effectiveTo: null, notes: "" })
      await refresh(); announce("Official price saved.")
    } catch (error) { announce(error instanceof Error ? error.message : "Could not save official price.") }
    finally { setBusy(false) }
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault(); if (!activeConversation || !messageText.trim()) return
    setBusy(true)
    try {
      await commerceApi.sendMessage(activeConversation, messageText.trim())
      setMessageText(""); await loadMessages(activeConversation); await refresh()
    } catch (error) { announce(error instanceof Error ? error.message : "Message could not be sent.") }
    finally { setBusy(false) }
  }

  const searchContacts = async (event: FormEvent) => {
    event.preventDefault()
    if (contactQuery.trim().length < 2) return
    try {
      const result = await commerceApi.directory(contactQuery.trim())
      setContacts(result.data || [])
    } catch (error) {
      announce(error instanceof Error ? error.message : "Contact search failed.")
    }
  }

  const startConversation = async (id: string) => {
    setBusy(true)
    try {
      const result = await commerceApi.openConversation(id)
      setContacts([]); setContactQuery(""); await refresh(); await loadMessages(result.data._id)
    } catch (error) { announce(error instanceof Error ? error.message : "Could not start conversation.") }
    finally { setBusy(false) }
  }

  const createDelivery = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true)
    try {
      await commerceApi.createDelivery({ orderId: deliveryOrderId.trim(), method: "farmer_delivery" })
      setDeliveryOrderId(""); await refresh(); announce("Delivery tracking started.")
    } catch (error) { announce(error instanceof Error ? error.message : "Could not create delivery.") }
    finally { setBusy(false) }
  }

  return <div className="space-y-5">
    <section className={panel} id="official-market-prices">
      <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Official market prices</h2><p className="text-xs text-slate-500">Government-published reference prices in RWF</p></div><button onClick={() => void refresh()} className="text-xs font-semibold text-emerald-700">Refresh</button></div>
      {portal === "rab" && <form onSubmit={publishPrice} className="mb-4 grid gap-2 rounded-xl bg-emerald-50/60 p-3 sm:grid-cols-3">
        <input required className={field} placeholder="Commodity" value={price.commodity} onChange={e => setPrice(v => ({...v, commodity:e.target.value}))}/>
        <select className={field} value={price.category} onChange={e => setPrice(v => ({...v, category:e.target.value}))}><option value="crops">Crops</option><option value="livestock">Livestock</option><option value="dairy">Dairy</option><option value="poultry">Poultry</option><option value="fish">Fish</option><option value="processed">Processed</option><option value="other">Other</option></select>
        <input required className={field} placeholder="Unit (kg, litre, crate)" value={price.unit} onChange={e => setPrice(v => ({...v, unit:e.target.value}))}/>
        <input required min="0" type="number" className={field} placeholder="Price RWF" value={price.priceRwf} onChange={e => setPrice(v => ({...v, priceRwf:e.target.value}))}/>
        <input required type="date" className={field} value={price.effectiveFrom} onChange={e => setPrice(v => ({...v, effectiveFrom:e.target.value}))}/>
        <select className={field} value={price.status} onChange={e => setPrice(v => ({...v, status:e.target.value as "draft"|"published"}))}><option value="published">Publish now</option><option value="draft">Save draft</option></select>
        <input className={field} placeholder="Province (optional)" value={price.province} onChange={e => setPrice(v => ({...v, province:e.target.value}))}/>
        <input className={field} placeholder="District (optional)" value={price.district} onChange={e => setPrice(v => ({...v, district:e.target.value}))}/>
        <button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save official price</button>
      </form>}
      {prices.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2">Commodity</th><th>Official price</th><th>Area</th><th>Effective</th></tr></thead><tbody>{prices.map(p => <tr key={p._id} className="border-b last:border-0"><td className="py-2 font-semibold">{p.commodity}</td><td>{p.priceRwf.toLocaleString()} RWF / {p.unit}</td><td>{[p.district,p.province].filter(Boolean).join(", ") || "National"}</td><td>{new Date(p.effectiveFrom).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-500">No published prices are available yet.</p>}
    </section>

    {(portal === "customer" || portal === "farmer" || ["sector","district","province","rab"].includes(portal)) && <section className={panel} id="market-demand-requests">
      <h2 className="font-bold text-slate-900">Market demand requests</h2><p className="mb-3 text-xs text-slate-500">Customer demand is separate from a confirmed order.</p>
      {portal === "customer" && <form onSubmit={createDemand} className="mb-4 grid gap-2 sm:grid-cols-2">
        <input required className={field} placeholder="What do you need?" value={demand.commodity} onChange={e => setDemand(v => ({...v,commodity:e.target.value}))}/>
        <div className="flex gap-2"><input required min="0.01" type="number" className={field} placeholder="Quantity" value={demand.quantity} onChange={e => setDemand(v => ({...v,quantity:e.target.value}))}/><input className={field} value={demand.unit} onChange={e => setDemand(v => ({...v,unit:e.target.value}))} placeholder="Unit"/></div>
        <input className={field} placeholder="Preferred province" value={demand.province} onChange={e => setDemand(v => ({...v,province:e.target.value}))}/>
        <input className={field} placeholder="Preferred district" value={demand.district} onChange={e => setDemand(v => ({...v,district:e.target.value}))}/>
        <input className={field+" sm:col-span-2"} placeholder="Notes or quality requirements" value={demand.notes} onChange={e => setDemand(v => ({...v,notes:e.target.value}))}/>
        <button disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Publish demand request</button>
      </form>}
      <div className="space-y-2">{demands.map(d => <article key={d._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap justify-between gap-2"><b>{d.commodity} · {d.quantity} {d.unit}</b><span className="text-xs capitalize text-emerald-700">{d.status}</span></div><p className="text-xs text-slate-500">{[d.district,d.province].filter(Boolean).join(", ") || "Location flexible"} · {typeof d.customerId === "object" ? d.customerId.fullName : "Customer request"}</p>{d.notes && <p className="mt-1 text-sm">{d.notes}</p>}
        {portal === "farmer" && d.status === "open" && <button onClick={async () => { const message = window.prompt("Add a short offer message"); if (message === null) return; try { await commerceApi.respondToDemand(d._id,{message}); await refresh(); announce("Your offer was sent to the customer.") } catch(error) { announce(error instanceof Error ? error.message : "Offer failed.") } }} className="mt-2 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white">Respond with offer</button>}
        {portal === "customer" && d.status === "open" && <button onClick={async () => { try { await commerceApi.updateDemandStatus(d._id,"cancelled"); await refresh() } catch(error) { announce(error instanceof Error ? error.message : "Could not cancel request.") } }} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold">Cancel request</button>}
        {d.responses?.length > 0 && <p className="mt-2 text-xs text-slate-500">{d.responses.length} farmer offer(s) received</p>}
      </article>)}{!demands.length && <p className="text-sm text-slate-500">No demand requests yet.</p>}</div>
    </section>}

    <section className={panel} id="independent-messages">
      <div className="mb-3"><h2 className="font-bold text-slate-900">Messages inbox</h2><p className="text-xs text-slate-500">Conversations work independently of orders.</p></div>
      <form onSubmit={searchContacts} className="mb-3 flex gap-2"><input className={field} value={contactQuery} onChange={e => setContactQuery(e.target.value)} placeholder="Find a farmer or customer by name"/><button disabled={busy || contactQuery.trim().length < 2} className="shrink-0 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white">Find people</button></form>
      {contacts.length > 0 && <div className="mb-3 space-y-1 rounded-xl border border-slate-200 p-2">{contacts.map(contact => <button key={contact._id} onClick={() => void startConversation(contact._id)} className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-emerald-50"><span><b>{contact.fullName}</b><span className="ml-2 text-xs capitalize text-slate-500">{contact.portal}</span></span><span className="text-xs text-slate-500">{[contact.sector,contact.district].filter(Boolean).join(", ")}</span></button>)}</div>}
      <div className="grid gap-3 md:grid-cols-2"><div className="max-h-64 space-y-2 overflow-y-auto">{conversations.map(c => <button key={c._id} onClick={() => void loadMessages(c._id)} className={"w-full rounded-xl border p-3 text-left text-sm "+(activeConversation===c._id?"border-emerald-500 bg-emerald-50":"border-slate-200")}><b>{c.participantIds.map(p => typeof p==="object"?p.fullName:"Participant").join(", ")}</b><p className="truncate text-xs text-slate-500">{c.lastMessagePreview || "No messages yet"}</p></button>)}{!conversations.length && <p className="text-xs text-slate-500">No conversations yet.</p>}</div>
        <div className="flex min-h-48 flex-col rounded-xl border border-slate-200 p-3"><div className="mb-2 flex-1 space-y-2 overflow-y-auto">{messages.map(m => <p key={m._id} className="rounded-lg bg-slate-50 p-2 text-sm">{m.body}</p>)}{activeConversation && !messages.length && <p className="text-xs text-slate-500">No messages in this conversation yet.</p>}</div><form onSubmit={sendMessage} className="flex gap-2"><input className={field} value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Write a message..." disabled={!activeConversation}/><button disabled={busy || !activeConversation} className="rounded-xl bg-emerald-700 px-3 text-white"><span className="sr-only">Send</span>➤</button></form></div>
      </div>
    </section>

    {(portal === "farmer" || portal === "customer") && <section className={panel} id="delivery-tracking"><h2 className="mb-3 font-bold text-slate-900">Delivery tracking</h2>
      {portal === "farmer" && <form onSubmit={createDelivery} className="mb-3 flex gap-2"><input required className={field} value={deliveryOrderId} onChange={e => setDeliveryOrderId(e.target.value)} placeholder="Approved order ID"/><button disabled={busy} className="shrink-0 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white">Start tracking</button></form>}
      <div className="space-y-2">{deliveries.map(d => <article key={d._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div><b className="text-sm">Order {d.orderId.slice(-7)}</b><p className="text-xs capitalize text-slate-500">{d.method.replace("_"," ")} · {d.status.replace("_"," ")}</p></div>{d.status!=="delivered" && d.status!=="cancelled" && <button onClick={async () => { const next = portal==="customer" ? "delivered" : ({pending:"preparing",preparing:"ready",ready:"dispatched",dispatched:"in_transit",in_transit:"delivered",failed:"preparing"} as Record<string,Delivery["status"]>)[d.status]; if (!next) return; try { await commerceApi.updateDeliveryStatus(d._id,next); await refresh() } catch(error) { announce(error instanceof Error ? error.message : "Could not update delivery.") } }} className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">{portal==="customer"?"Confirm received":"Advance status"}</button>}</article>)}{!deliveries.length && <p className="text-sm text-slate-500">No deliveries to track.</p>}</div>
    </section>}
  </div>
}
