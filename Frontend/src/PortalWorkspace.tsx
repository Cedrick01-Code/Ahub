import React, { createContext, useContext, useEffect, useRef, useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { Activity, Archive, ArrowRight, Bell, BookOpen, Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, Cloud, CloudRain, CloudSun, ClipboardCheck, Droplets, Edit, Eye, EyeOff, Globe, Heart, Home, MapPinned, Megaphone, MessageSquare, MoreHorizontal, Package, Paperclip, Plus, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Sprout, Stethoscope, Sun, ThermometerSun, ThumbsUp, Trash2, TrendingUp, Type, Users, Wind, X, AlertTriangle, Flag, Hash, Minimize2, Maximize2, Loader2, User, MapPin, Wheat, PawPrint, Target, Shield, Database, Link2, Check, Save, Sparkles, Menu } from 'lucide-react';
import { AccountApprovalsQueue } from './portals/AccountApprovalsQueue';
import { FarmerLearning } from './portals/FarmerLearning';
import { RabLearningReview } from './portals/RabLearningReview';
import { PlotRegistrationWizard, PlotListView, PlotCard, PlotEmptyState, type PlotData } from './portals/PlotRegistrationWizard';
import { GuideMe } from './portals/GuideMe';
import { operationsApi } from './lib/operationsApi';
import { AIChat } from './components/AIChat';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NotificationBell } from './components/NotificationBell';
import { CommercePanels } from './portals/CommercePanels';

interface Props { portal: string; onExit: () => void }
type Row = Record<string, any>;
const input = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100';
const card = 'portal-panel rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition duration-200 hover:border-emerald-200 hover:shadow-md sm:p-6';
const PortalPageContext = createContext('');
const roles: Record<string, string> = { farmer: 'Farmer Portal', customer: 'Customer Portal', sector: 'Sector Veterinary Portal', district: 'District Veterinary Office', province: 'Province Veterinary Office', rab: 'RAB Admin', nsg: 'NSG Security Portal' };

function useApiList(path: string, announce: (message: string) => void) {
  const [items, setItems] = useState<Row[]>([]); const [loading, setLoading] = useState(true);
  const refresh = async () => { try { const result = await operationsApi<{data: Row[]}>(path); setItems(result.data || []); } catch (error) { announce(error instanceof Error ? error.message : 'Could not load records.'); } finally { setLoading(false); } };
  useEffect(() => { void refresh(); }, [path]);
  return { items, setItems, refresh, loading };
}
function Panel({ title, children, sectionId }: { title: string; children: ReactNode; sectionId?: string }) { const id = sectionId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); const activePage = useContext(PortalPageContext); if (activePage && activePage !== id) return null; return <section id={id} className={`${card} ${activePage === id ? 'lg:col-span-2 w-full' : ''}`}><div className='mb-4 flex items-center justify-between gap-3'><h2 className='text-base font-bold tracking-tight text-slate-900 sm:text-lg'>{title}</h2><span className='size-2 rounded-full bg-emerald-500'/></div>{children}</section>; }
function TextField({ label, children }: { label: string; children: ReactNode }) { return <label className='block text-sm font-medium text-slate-700'>{label}<div className='mt-1'>{children}</div></label>; }
function SubmitButton({ children = 'Save' }: { children?: ReactNode }) { return <button className='rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition active:scale-95'>{children}</button>; }

function ActionModal({
  isOpen,
  title,
  description,
  placeholder = 'Enter details…',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: (text: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    try {
      await onConfirm(value);
      setValue('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const btnBg = variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X size={18} />
          </button>
        </div>
        {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            required
            rows={3}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${btnBg}`}
            >
              {loading ? 'Processing…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickActionHub({
  portal,
  onAction,
}: {
  portal: string;
  onAction: (actionId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const farmerActions = [
    { id: 'register-a-plot', label: 'Register Production Unit', icon: Sprout, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'upload-products', label: 'List Harvest / Produce', icon: Package, color: 'text-blue-600 bg-blue-50' },
    { id: 'report-a-farm-problem', label: 'Report Farm Issue', icon: CircleAlert, color: 'text-rose-600 bg-rose-50' },
    { id: 'request-veterinary-visit', label: 'Request Vet Visit', icon: Stethoscope, color: 'text-amber-600 bg-amber-50' },
  ];

  const staffActions = [
    { id: 'daily-field-tasks', label: 'Assign Field Task', icon: ClipboardCheck, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'publish-announcement', label: 'Publish Announcement', icon: Megaphone, color: 'text-purple-600 bg-purple-50' },
    { id: 'four-day-sector-forecast', label: 'Sector Weather Outlook', icon: CloudSun, color: 'text-sky-600 bg-sky-50' },
  ];

  const actions = portal === 'farmer' ? farmerActions : ['sector', 'district', 'province', 'rab'].includes(portal) ? staffActions : [];

  if (!actions.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open && (
        <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 min-w-56">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">Quick Actions</p>
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => {
                  setOpen(false);
                  onAction(act.id);
                }}
                className="flex items-center gap-3 rounded-xl p-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-900"
              >
                <span className={`grid size-8 place-items-center rounded-lg ${act.color}`}>
                  <Icon size={16} />
                </span>
                {act.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-full bg-emerald-700 px-5 py-3.5 font-bold text-white shadow-xl transition-all hover:bg-emerald-800 hover:scale-105 active:scale-95 ring-4 ring-emerald-700/20"
      >
        <Plus size={20} className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
        <span>Quick Action</span>
      </button>
    </div>
  );
}
function formValue(form: HTMLFormElement, name: string) { return (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value; }
function RecordList({ items, loading, empty = 'No records found.', render }: { items: Row[]; loading: boolean; empty?: string; render: (item: Row) => ReactNode }) { if (loading) return <p className='text-sm text-slate-500'>Loading…</p>; if (!items.length) return <p className='text-sm text-slate-500'>{empty}</p>; return <div className='space-y-3'>{items.map((item, index) => <div key={item._id || item.id || index} className='rounded-xl border border-slate-200 p-3'>{render(item)}</div>)}</div>; }

function WeatherPanel({ forecast, current, loading, error, onRefresh, location }: { forecast:Row[]; current?:Row; loading?:boolean; error?:string; onRefresh?:()=>void; location?:string }) {
  const [selected,setSelected]=useState(0); const [hourRange,setHourRange]=useState<'day'|'night'>('day');
  const day=forecast[selected]; const hourly:Row[]=current?.hourly||[];
  const dayHours=hourly.filter(h=>new Date(h.time).getDate()===new Date(day?.date).getDate());
  const visibleHours=dayHours.filter(h=>hourRange==='day'?new Date(h.time).getHours()>=6&&new Date(h.time).getHours()<19:new Date(h.time).getHours()<6||new Date(h.time).getHours()>=19).slice(0,12);
  const maxRain=Math.max(1,...visibleHours.map(h=>Number(h.precipitationProbability)||0));
  const condition=(code:number)=>code===0?'Clear sky':[1,2,3].includes(code)?'Partly cloudy':[45,48].includes(code)?'Foggy':[51,53,55,56,57].includes(code)?'Drizzle':[61,63,65,66,67,80,81,82].includes(code)?'Rain':[71,73,75,77,85,86].includes(code)?'Snow':[95,96,99].includes(code)?'Thunderstorm':'Weather update';
  const WeatherIcon=(code:number)=>[61,63,65,66,67,80,81,82,95,96,99].includes(code)?CloudRain:[1,2,3,45,48].includes(code)?Cloud:Sun;
  if(loading)return <Panel title='Sector weather' sectionId='four-day-sector-forecast'><p className='animate-pulse text-sm text-slate-500'>Loading the local four-day forecast…</p></Panel>;
  if(error)return <Panel title='Sector weather' sectionId='four-day-sector-forecast'><div className='rounded-xl bg-amber-50 p-4 text-sm text-amber-900'>{error}<button onClick={onRefresh} className='ml-3 inline-flex items-center gap-1 font-bold'><RefreshCw size={14}/> Retry</button></div></Panel>;
  if(!day)return <Panel title='Sector weather' sectionId='four-day-sector-forecast'><p className='text-sm text-slate-500'>Forecast is not available for this location.</p><p className='mt-2 text-xs text-slate-400'>Weather data by <a className='font-semibold underline' href='https://open-meteo.com/' target='_blank' rel='noreferrer'>Open-Meteo.com</a></p></Panel>;
  const Icon=WeatherIcon(Number(day.weatherCode));
  return <Panel title='Four day sector forecast' sectionId='four-day-sector-forecast'><div className='flex flex-wrap items-start justify-between gap-3'><div><p className='text-xs font-bold uppercase tracking-widest text-emerald-800'>{location||'Your area'} · Africa/Kigali</p><div className='mt-2 flex items-center gap-3'><span className='grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-700'><Icon size={26}/></span><div><p className='text-2xl font-extrabold text-slate-900'>{Math.round(current?.current?.temperature ?? day.temperatureMax)}°</p><p className='text-sm text-slate-600'>{condition(Number(current?.current?.weatherCode ?? day.weatherCode))}</p></div></div></div><button aria-label='Refresh weather' onClick={onRefresh} className='inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50'><RefreshCw size={14}/> Refresh</button></div>
    <div className='mt-5 grid grid-cols-4 gap-2'>{forecast.slice(0,4).map((item,index)=>{const DayIcon=WeatherIcon(Number(item.weatherCode));return <button key={item.date} aria-pressed={selected===index} onClick={()=>setSelected(index)} className={`rounded-xl border p-3 text-left transition ${selected===index?'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100':'border-slate-100 bg-slate-50 hover:border-slate-300'}`}><span className='text-xs font-bold text-slate-600'>{new Date(`${item.date}T12:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</span><DayIcon size={18} className='my-2 text-sky-700'/><span className='block text-sm font-bold'>{Math.round(item.temperatureMax)}°</span><span className='text-xs text-slate-500'>{Math.round(item.temperatureMin)}° low</span></button>;})}</div>
    <div className='mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4'><WeatherMetric icon={ThermometerSun} label='High / low' value={`${Math.round(day.temperatureMax)}° / ${Math.round(day.temperatureMin)}°`}/><WeatherMetric icon={Droplets} label='Rain chance' value={`${Math.round(day.precipitationProbability||0)}%`}/><WeatherMetric icon={Droplets} label='Rain total' value={`${Number(day.precipitation||0).toFixed(1)} mm`}/><WeatherMetric icon={Wind} label='Peak wind' value={`${Math.round(day.windSpeedMax||0)} km/h`}/></div>
    {visibleHours.length>0&&<div className='mt-5 rounded-xl bg-slate-50 p-4'><div className='mb-4 flex flex-wrap items-center justify-between gap-2'><div><h3 className='text-sm font-bold'>Hourly outlook</h3><p className='text-xs text-slate-500'>Temperature and rain probability</p></div><div className='rounded-lg bg-white p-1 shadow-sm'>{(['day','night'] as const).map(range=><button key={range} onClick={()=>setHourRange(range)} className={`rounded-md px-3 py-1 text-xs font-semibold capitalize ${range===hourRange?'bg-emerald-700 text-white':'text-slate-600'}`}>{range}</button>)}</div></div><div className='flex h-28 items-end gap-1.5'>{visibleHours.map((hour,index)=>{const rain=Number(hour.precipitationProbability)||0;const temp=Number(hour.temperature)||0;return <div key={hour.time} title={`${new Date(hour.time).toLocaleTimeString([],{hour:'numeric'})} · ${temp}° · ${rain}% rain`} className='flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1'><span className='text-[10px] font-semibold text-slate-600'>{Math.round(temp)}°</span><div className='flex h-14 w-full items-end rounded-t-md bg-sky-100'><div className='w-full rounded-t-md bg-sky-500 transition-all' style={{height:`${Math.max(4,(rain/maxRain)*100)}%`}}/></div><span className='truncate text-[9px] text-slate-500'>{new Date(hour.time).toLocaleTimeString([],{hour:'numeric'})}</span></div>;})}</div><div className='mt-3 flex items-center gap-2 text-xs text-slate-500'><span className='size-2 rounded-full bg-sky-500'/>Rain probability</div></div>}
    <div className='mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3'><CloudSun size={18} className='mt-0.5 shrink-0 text-emerald-700'/><div><p className='text-xs font-bold text-emerald-950'>Farm planning note</p><p className='text-xs leading-5 text-emerald-900'>{Number(day.precipitationProbability||0)>=60?'Rain is likely. Check drainage and postpone irrigation until you assess soil moisture.':Number(day.temperatureMax)>=30?'Warm conditions expected. Check soil moisture and provide animals with shade and clean water.':'Review soil moisture before irrigation and continue routine crop and livestock checks.'}</p></div></div>
    <p className='mt-3 text-right text-[10px] text-slate-400'>Weather data by <a className='underline hover:text-emerald-700' href='https://open-meteo.com/' target='_blank' rel='noreferrer'>Open-Meteo.com</a></p>
  </Panel>;
}
function WeatherMetric({icon:Icon,label,value}:{icon:typeof Sun;label:string;value:string}){return <div className='rounded-xl bg-slate-50 p-3'><div className='flex items-center gap-1.5 text-xs text-slate-500'><Icon size={14}/>{label}</div><p className='mt-1 text-sm font-bold text-slate-900'>{value}</p></div>;}

function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInMonths / 12)}y ago`;
}

function getLevelBadge(level: string) {
  const styles: Record<string, string> = {
    national: 'bg-purple-100 text-purple-800',
    province: 'bg-blue-100 text-blue-800',
    district: 'bg-amber-100 text-amber-800',
    local: 'bg-emerald-100 text-emerald-800',
  };
  const icons: Record<string, React.ReactNode> = {
    national: <ShieldCheck size={10} />,
    province: <Building2 size={10} />,
    district: <MapPinned size={10} />,
    local: <Home size={10} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${styles[level] || 'bg-slate-100 text-slate-800'}`}>
      {icons[level]}
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-slate-100 text-slate-700',
    archived: 'bg-rose-100 text-rose-800',
  };
  const icons: Record<string, React.ReactNode> = {
    published: <Eye size={10} />,
    draft: <Type size={10} />,
    archived: <Archive size={10} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function getPriorityBadge(priority: string) {
  const styles: Record<string, string> = {
    normal: 'bg-slate-100 text-slate-700',
    high: 'bg-amber-100 text-amber-800',
    urgent: 'bg-rose-100 text-rose-800 animate-pulse',
  };
  const icons: Record<string, React.ReactNode> = {
    normal: <Flag size={10} />,
    high: <AlertTriangle size={10} />,
    urgent: <AlertTriangle size={10} className="text-rose-600" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[priority] || 'bg-slate-100 text-slate-700'}`}>
      {icons[priority]}
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function AnnouncementCard({ announcement, canManage, onManage, showFull = false }: { 
  announcement: any; 
  canManage: boolean; 
  onManage: (action: string, id: string) => void;
  showFull?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const body = announcement.body || '';
  const isLong = body.length > 300;
  const displayBody = showFull || expanded || !isLong ? body : body.slice(0, 300) + '…';

  const handleAction = async (action: string) => {
    setLoading(true);
    try {
      await onManage(action, announcement._id);
    } finally {
      setLoading(false);
    }
  };

  const relTime = formatRelativeTime(announcement.publishedAt || announcement.createdAt);

  return (
    <div className={`rounded-2xl border transition-all ${announcement.priority === 'urgent' ? 'border-rose-300 bg-rose-50/30 ring-2 ring-rose-100' : 'border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-bold text-slate-900 text-lg pr-2">{announcement.title}</h3>
              {getLevelBadge(announcement.level)}
              {getStatusBadge(announcement.status)}
              {announcement.priority !== 'normal' && getPriorityBadge(announcement.priority)}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {announcement.authorId && (
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {announcement.authorId.fullName || 'Unknown'}
                  {announcement.authorId.portal && (
                    <span className="text-slate-300">·</span>
                  )}
                </span>
              )}
              {announcement.authorId?.portal && (
                <span className="text-xs font-medium uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  {announcement.authorId.portal}
                </span>
              )}
              {announcement.publishedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-950 border border-emerald-100">
                  <Calendar size={12} className="text-emerald-700" />
                  <span>Published {formatDate(announcement.publishedAt)}</span>
                  {relTime && <span className="font-bold text-emerald-800 bg-emerald-200/60 px-1.5 py-0.5 rounded text-[11px]">{relTime}</span>}
                </span>
              )}
              {announcement.createdAt && !announcement.publishedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <Calendar size={12} className="text-slate-400" />
                  <span>Created {formatDate(announcement.createdAt)}</span>
                  {relTime && <span className="font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">{relTime}</span>}
                </span>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="More actions"
                >
                  <MoreHorizontal size={18} />
                </button>
                <div className="absolute right-0 top-full mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg opacity-0 invisible group-data-[open=true]:opacity-100 group-data-[open=true]:visible transition-all z-20">
                  {announcement.status === 'draft' && (
                    <button
                      onClick={() => handleAction('publish')}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50 rounded-lg"
                    >
                      <Eye size={14} /> Publish
                    </button>
                  )}
                  {announcement.status === 'published' && (
                    <button
                      onClick={() => handleAction('archive')}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg"
                    >
                      <Archive size={14} /> Archive
                    </button>
                  )}
                  {announcement.status === 'archived' && (
                    <button
                      onClick={() => handleAction('restore')}
                      disabled={loading}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg"
                    >
                      <RotateCcw size={14} /> Restore
                    </button>
                  )}
                  <button
                    onClick={() => handleAction('edit')}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleAction('delete')}
                    disabled={loading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
          <p className="whitespace-pre-wrap">{displayBody}</p>
        </div>

        {/* Expand/collapse for long announcements */}
        {isLong && !showFull && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-900"
          >
            {expanded ? (
              <>Show less <ChevronUp size={14} /></>
            ) : (
              <>Read more <ChevronDown size={14} /></>
            )}
          </button>
        )}

        {/* Scope indicators */}
        {(announcement.province || announcement.district || announcement.sector) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">Applicable to:</p>
            <div className="flex flex-wrap gap-1">
              {announcement.province && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">
                  <Building2 size={10} />
                  {announcement.province} Province
                </span>
              )}
              {announcement.district && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-amber-50 text-amber-700 rounded-full">
                  <MapPinned size={10} />
                  {announcement.district} District
                </span>
              )}
              {announcement.sector && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-full">
                  <Home size={10} />
                  {announcement.sector} Sector
                </span>
              )}
              {!announcement.province && !announcement.district && !announcement.sector && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-full">
                  <Globe size={10} />
                  National
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const getLevelForPortal = (p: string) => {
  const map: Record<string, string> = { sector: 'local', district: 'district', province: 'province', rab: 'national' };
  return map[p] || 'local';
};

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = { local: 'Local (Sector)', district: 'District', province: 'Province', national: 'National' };
  return labels[level] || level;
};

const LevelIcon: React.FC<{ level: string }> = ({ level }) => {
  const icons: Record<string, any> = { local: Home, district: MapPinned, province: Building2, national: ShieldCheck };
  const Icon = icons[level] || Home;
  return <Icon size={16} className="text-emerald-700" />;
};

const getScopeDescription = (p: string) => {
  switch (p) {
    case 'sector': return `your sector only`;
    case 'district': return `your district (all sectors)`;
    case 'province': return `your province (all districts)`;
    case 'rab': return `entire Rwanda (national)`;
    default: return `your region`;
  }
};

function AnnouncementsPanel({ portal, announce }: { portal: string; announce: (message: string) => void }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', body: '', priority: 'normal', status: 'draft' });

  const canManage = ['sector', 'district', 'province', 'rab'].includes(portal);
  const isStaff = canManage;

  const userLevel = getLevelForPortal(portal);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      });
      const result = await operationsApi<{ items: any[]; total: number; pages: number }>(`/announcements?${params}`);
      setAnnouncements(result.items || []);
      setTotalPages(result.pages || 1);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnnouncements(); }, [page, filters]);

  const handleManage = async (action: string, id: string) => {
    try {
      let result;
      switch (action) {
        case 'publish':
          result = await operationsApi(`/announcements/${id}/publish`, 'POST');
          break;
        case 'archive':
          result = await operationsApi(`/announcements/${id}/archive`, 'POST');
          break;
        case 'restore':
          result = await operationsApi(`/announcements/${id}`, 'PATCH', { status: 'draft', archivedAt: null });
          break;
        case 'edit':
          setEditingId(id);
          const announce = announcements.find(a => a._id === id);
          if (announce) {
            setFormData({
              title: announce.title,
              body: announce.body,
              priority: announce.priority || 'normal',
              status: announce.status,
            });
          }
          return;
        case 'delete':
          if (!window.confirm('Are you sure you want to delete this announcement?')) return;
          result = await operationsApi(`/announcements/${id}`, 'DELETE');
          break;
      }
      announce('Announcement updated successfully');
      fetchAnnouncements();
      if (action === 'edit') setEditingId(null);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Action failed');
    }
  };

const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) return;
    
    try {
      if (editingId) {
        await operationsApi(`/announcements/${editingId}`, 'PATCH', formData);
        announce('Announcement updated');
      } else {
        await operationsApi('/announcements', 'POST', {
          ...formData,
          level: userLevel,
        });
        announce('Announcement created');
      }
      setShowCreate(false);
      setEditingId(null);
      setFormData({ title: '', body: '', priority: 'normal', status: 'draft' });
      fetchAnnouncements();
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' },
  ];

  const isFarmerOrCustomer = portal === 'farmer' || portal === 'customer';

  if (isFarmerOrCustomer) {
    // Read-only view for farmers and customers
    return (
      <Panel title="Announcements" sectionId="announcements">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5">
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <Megaphone className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-3 text-slate-500">No announcements for your region</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement._id}
                announcement={announcement}
                canManage={false}
                onManage={() => {}}
                showFull={true}
              />
            ))}
          </div>
        )}
      </Panel>
    );
  }

  // Staff view with management capabilities
  const publishedCount = announcements.filter(a => a.status === 'published').length;
  const draftCount = announcements.filter(a => a.status === 'draft').length;
  const urgentCount = announcements.filter(a => a.priority === 'urgent').length;

  return (
    <Panel title="Announcements & Regional Bulletins" sectionId="publish-announcement">
      {/* Analytics Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <Megaphone size={16} />
            </span>
            <div>
              <p className="text-xl font-black text-slate-900">{announcements.length}</p>
              <p className="text-[11px] font-medium text-slate-500">Total Bulletins</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Eye size={16} />
            </span>
            <div>
              <p className="text-xl font-black text-slate-900">{publishedCount}</p>
              <p className="text-[11px] font-medium text-slate-500">Published & Live</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-700">
              <Type size={16} />
            </span>
            <div>
              <p className="text-xl font-black text-slate-900">{draftCount}</p>
              <p className="text-[11px] font-medium text-slate-500">Drafts Pending</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <AlertTriangle size={16} />
            </span>
            <div>
              <p className="text-xl font-black text-slate-900">{urgentCount}</p>
              <p className="text-[11px] font-medium text-slate-500">Urgent Alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); setFormData({ title: '', body: '', priority: 'normal', status: 'draft', level: '' }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 transition shadow-xs"
          >
            <Plus size={16} /> New Announcement
          </button>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 ml-2 border-l border-slate-200 pl-3">
            <select
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
              className="input text-sm w-auto"
            >
              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <input
              type="search"
              placeholder="Search announcements…"
              value={filters.search}
              onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="input text-sm w-64"
            />
          </div>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="font-bold text-emerald-900">
                {editingId ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setEditingId(null); setFormData({ title: '', body: '', priority: 'normal', status: 'draft', level: '' }); }}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Title">
                <input
                  name="title"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className={input}
                  placeholder="Announcement title"
                />
              </TextField>
              <TextField label="Your Scope">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700">
                  <LevelIcon level={userLevel} />
                  <span className="font-medium">{getLevelLabel(userLevel)}</span>
                  <span className="text-slate-400">· Auto-assigned based on your role</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Announcements you create will reach: {getScopeDescription(portal)}</p>
              </TextField>
              <TextField label="Priority">
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className={input}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </TextField>
              <TextField label="Status">
                <select
                  name="status"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className={input}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </TextField>
            </div>
            
            <TextField label="Body (supports line breaks)">
              <textarea
                name="body"
                required
                rows={6}
                value={formData.body}
                onChange={e => setFormData({ ...formData, body: e.target.value })}
                className={input}
                placeholder="Write your announcement here…"
              />
            </TextField>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreate(false); setEditingId(null); setFormData({ title: '', body: '', priority: 'normal', status: 'draft', level: '' }); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <SubmitButton>{editingId ? 'Update' : 'Create'}</SubmitButton>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="h-5 bg-slate-200 rounded w-3/4" />
                <div className="h-5 bg-slate-200 rounded w-20" />
              </div>
              <div className="h-4 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-5/6" />
            </div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-3 text-slate-500">No announcements found</p>
          <p className="mt-1 text-sm text-slate-400">Create your first announcement to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement._id}
              announcement={announcement}
              canManage={true}
              onManage={handleManage}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function FarmerPortal({ announce }: { announce: (message: string) => void }) {
  const plots = useApiList('/plots', announce);
  const products = useApiList('/products', announce);
  const tasks = useApiList('/tasks', announce);
  const problems = useApiList('/problems', announce);
  const visits = useApiList('/visits', announce);
  const orders = useApiList('/orders', announce);

  const [guideMatches, setGuideMatches] = useState<Row[]>([]);
  const [weatherData, setWeatherData] = useState<Row | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [showPlotWizard, setShowPlotWizard] = useState(false);
  const [editingPlot, setEditingPlot] = useState<PlotData | null>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Row | null>(null);
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    confirmLabel?: string;
    variant?: 'primary' | 'danger' | 'warning';
    onConfirm: (text: string) => Promise<void> | void;
  } | null>(null);

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const result = await operationsApi<{ data: Row }>('/weather');
      setWeatherData(result.data);
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Weather forecast is unavailable.');
    } finally {
      setWeatherLoading(false);
    }
  };
  useEffect(() => { void loadWeather(); }, []);

  const handlePlotSubmit = async (plot: PlotData) => {
    try {
      const result = await operationsApi<{ data: PlotData }>('/plots', 'POST', plot);
      plots.refresh();
      setGuideMatches(result.data.guides || []);
      setShowPlotWizard(false);
      announce('Plot registered successfully');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Failed to register plot');
      throw error;
    }
  };

  const handlePlotUpdate = async (plot: PlotData) => {
    try {
      await operationsApi(`/plots/${plot.plotId}`, 'PUT', plot);
      plots.refresh();
      setShowPlotWizard(false);
      setEditingPlot(null);
      announce('Plot updated successfully');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Failed to update plot');
      throw error;
    }
  };

  const handlePlotDelete = async (plotId: string) => {
    if (!confirm('Are you sure you want to delete this plot?')) return;
    try {
      await operationsApi(`/plots/${plotId}`, 'DELETE');
      plots.refresh();
      announce('Plot deleted');
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Failed to delete plot');
    }
  };

  const approvedTasksCount = tasks.items.filter(t => t.status === 'approved').length;
  const taskProgressPercent = tasks.items.length ? Math.round((approvedTasksCount / tasks.items.length) * 100) : 0;

  const weather = (
    <WeatherPanel
      forecast={weatherData?.forecast || []}
      current={weatherData || undefined}
      loading={weatherLoading}
      error={weatherError}
      onRefresh={() => void loadWeather()}
      location={weatherData?.location?.resolvedName}
    />
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive KPI Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Sprout size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{plots.items.length}</p>
              <p className="text-xs font-medium text-slate-500">Registered Plots</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardCheck size={20} />
            </span>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{approvedTasksCount}</span>
                <span className="text-xs text-slate-400">/ {tasks.items.length}</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Tasks Completed ({taskProgressPercent}%)</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <Package size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{products.items.length}</p>
              <p className="text-xs font-medium text-slate-500">Market Listings</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Stethoscope size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{visits.items.length}</p>
              <p className="text-xs font-medium text-slate-500">Vet Visits</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {weather}

        <Panel title="Production Units" sectionId="register-a-plot">
          <div className="mb-4">
            <button
              onClick={() => { setEditingPlot(null); setShowPlotWizard(true); }}
              className="w-full px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md hover:shadow-emerald-200"
            >
              <Plus className="w-5 h-5" />
              Register Production Unit
            </button>
          </div>
          {guideMatches.length > 0 && (
            <div className="my-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <h3 className="font-bold text-emerald-950">
                Recommended learning for {guideMatches[0]?.enterpriseIds?.[0] || 'your new plot'}
              </h3>
              {guideMatches.map(g => (
                <article key={g._id} className="mt-2 border-t border-emerald-100 pt-2">
                  <b className="text-sm">{g.title}</b>
                  <p className="text-xs text-emerald-900">{g.description}</p>
                  {g.lessons?.slice(0, 2).map((lesson: Row, i: number) => (
                    <p key={lesson._id || i} className="mt-1 text-xs">
                      <b>{lesson.title}</b>
                      {lesson.content ? ` · ${lesson.content}` : ''}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          )}
          <PlotListView
            plots={plots.items as PlotData[]}
            loading={plots.loading}
            onRegister={() => { setEditingPlot(null); setShowPlotWizard(true); }}
            onEdit={setEditingPlot}
            onView={(plot) => { setEditingPlot(plot); setShowPlotWizard(true); }}
            onDelete={handlePlotDelete}
          />
        </Panel>

        <Panel title="Guide Me" sectionId="guide-me">
          <GuideMe onBack={() => { setActivePage('register-a-plot'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </Panel>

        <Panel title="Daily tasks · submit completed work" sectionId="daily-tasks-submit-completed-work">
          <div className="mb-4 rounded-xl bg-emerald-50 p-3.5 border border-emerald-100">
            <div className="flex justify-between text-xs font-bold text-emerald-900">
              <span>Approved task progress</span>
              <span>{approvedTasksCount}/{tasks.items.length} tasks</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-emerald-200/60">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>
          </div>
          <RecordList
            items={tasks.items}
            loading={tasks.loading}
            render={task => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-slate-900 font-bold">{task.title}</b>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    task.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    task.status === 'returned' ? 'bg-amber-100 text-amber-800' :
                    task.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{task.instructions} · <span className="font-semibold text-emerald-700">{task.enterprise}</span></p>
                {task.status === 'assigned' && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <form
                      className="flex flex-col sm:flex-row gap-2"
                      onSubmit={async e => {
                        e.preventDefault();
                        const note = new FormData(e.currentTarget).get('note');
                        try {
                          await operationsApi(`/tasks/${task._id}/complete`, 'PATCH', { note });
                          await tasks.refresh();
                          announce('Completed task sent to your sector officer for approval.');
                        } catch (error) {
                          announce(error instanceof Error ? error.message : 'Could not submit task.');
                        }
                      }}
                    >
                      <input name="note" className={input} placeholder="Describe completed work note…" required />
                      <SubmitButton>Submit for review</SubmitButton>
                    </form>
                    <button
                      className="mt-2 text-xs font-semibold text-slate-500 hover:text-emerald-700 underline"
                      onClick={async () => {
                        const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                        try {
                          await operationsApi(`/tasks/${task._id}/snooze`, 'PATCH', { until });
                          await tasks.refresh();
                          announce('Task reminder snoozed for one day.');
                        } catch (error) {
                          announce(error instanceof Error ? error.message : 'Could not snooze task.');
                        }
                      }}
                    >
                      Remind me tomorrow
                    </button>
                  </div>
                )}
                {task.status === 'returned' && (
                  <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs border border-amber-200 text-amber-900">
                    <b>Officer feedback:</b> {task.reviewNote}
                  </div>
                )}
              </div>
            )}
          />
        </Panel>

        <Panel title="Upload products" sectionId="upload-products">
          <div className="mb-4">
            <button
              onClick={() => { setEditingProduct(null); setShowProductForm(!showProductForm); }}
              className="w-full inline-flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100 transition"
            >
              <span className="flex items-center gap-2"><Package size={16} /> List New Produce for Sale</span>
              <Plus size={16} className={`transition-transform ${showProductForm || editingProduct ? 'rotate-45' : ''}`} />
            </button>
          </div>
          {(showProductForm || editingProduct) && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 animate-in fade-in duration-150">
              <form
                className="space-y-3"
                onSubmit={async e => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  const formData = new FormData();
                  formData.append('title', formValue(target, 'title'));
                  formData.append('enterprise', formValue(target, 'enterprise'));
                  formData.append('quantity', formValue(target, 'quantity'));
                  formData.append('unit', formValue(target, 'unit'));
                  formData.append('availableAt', formValue(target, 'availableAt'));
                  const imageFile = target.querySelector('input[name="image"]')?.files?.[0];
                  if (imageFile) formData.append('image', imageFile);

                  try {
                    const url = editingProduct ? `/products/${editingProduct._id}` : '/products';
                    const method = editingProduct ? 'PATCH' : 'POST';
                    await operationsApi(url, method, formData);
                    target.reset();
                    setShowProductForm(false);
                    setEditingProduct(null);
                    await products.refresh();
                    announce(editingProduct ? 'Product updated successfully.' : 'Product listed successfully.');
                  } catch (error) {
                    announce(error instanceof Error ? error.message : (editingProduct ? 'Product update failed.' : 'Product listing failed.'));
                  }
                }}
              >
                <h3 className="text-sm font-semibold text-emerald-900">{editingProduct ? 'Edit Product' : 'New Product Listing'}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Product title"><input name="title" required className={input} placeholder="e.g. Fresh Maize, Irish Potatoes" defaultValue={editingProduct?.title || ''} /></TextField>
                  <TextField label="Crop / livestock type"><input name="enterprise" required className={input} placeholder="e.g. Maize, Cattle" defaultValue={editingProduct?.enterprise || ''} /></TextField>
                  <TextField label="Quantity"><input name="quantity" required type="number" min="0.01" step="any" className={input} placeholder="e.g. 500" defaultValue={editingProduct?.quantity || ''} /></TextField>
                  <TextField label="Unit"><input name="unit" required className={input} placeholder="e.g. kg, crates, bags" defaultValue={editingProduct?.unit || ''} /></TextField>
                  <TextField label="Available from date"><input name="availableAt" type="date" className={input} defaultValue={editingProduct?.availableAt ? editingProduct.availableAt.split('T')[0] : ''} /></TextField>
                  <TextField label="Product Image">
                    <input name="image" type="file" accept="image/*" className={input} />
                    {editingProduct?.imageUrl && (
                      <div className="mt-1 flex items-center gap-2">
                        <img src={editingProduct.imageUrl} alt="Current" className="w-16 h-16 rounded-lg object-cover border" />
                        <span className="text-xs text-slate-500">Current image</span>
                      </div>
                    )}
                  </TextField>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => { setShowProductForm(false); setEditingProduct(null); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                  <SubmitButton>{editingProduct ? 'Update Listing' : 'Save Listing'}</SubmitButton>
                </div>
              </form>
            </div>
          )}
          <RecordList
            items={products.items}
            loading={products.loading}
            render={p => (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {p.imageUrl && (
                    <img src={p.imageUrl} alt={p.title} className="w-12 h-12 rounded-lg object-cover border" />
                  )}
                  <div>
                    <b className="text-slate-900 text-sm font-bold">{p.title}</b>
                    <p className="text-xs text-slate-500">{p.quantity} {p.unit} · {p.enterprise || 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                    p.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                    p.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                    p.status === 'soldout' ? 'bg-rose-100 text-rose-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {p.status || 'Active'}
                  </span>
                  <button
                    onClick={() => { setEditingProduct(p); setShowProductForm(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                  </button>
                  {p.status === 'available' && (
                    <button
                      onClick={async () => {
                        if (!confirm('Mark this product as sold out?')) return;
                        try {
                          await operationsApi(`/products/${p._id}/soldout`, 'PATCH');
                          await products.refresh();
                          announce('Product marked as sold out.');
                        } catch (error) {
                          announce(error instanceof Error ? error.message : 'Failed to mark sold out.');
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title="Mark Sold Out"
                    >
                      <Package className="w-4 h-4 text-rose-500" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('Delete this product permanently?')) return;
                      try {
                        await operationsApi(`/products/${p._id}`, 'DELETE');
                        await products.refresh();
                        announce('Product deleted.');
                      } catch (error) {
                        announce(error instanceof Error ? error.message : 'Failed to delete product.');
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>
            )}
          />
        </Panel>

        <Panel title="Orders and buyer messages" sectionId="orders-and-buyer-messages">
          <RecordList
            items={orders.items}
            loading={orders.loading}
            render={order => (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-slate-900 font-bold">{order.productId?.title || 'Product Order'}</b>
                    <p className="text-xs text-slate-500">Requested: {order.quantity} units · Status: <span className="font-semibold text-emerald-700 capitalize">{order.status}</span></p>
                  </div>
                  {order.status === 'requested' && (
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                        onClick={async () => {
                          await operationsApi(`/orders/${order._id}`, 'PATCH', { decision: 'approved' });
                          await orders.refresh();
                          announce('Order request approved!');
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: 'Decline Order Request',
                            description: 'Provide a reason to inform the buyer why you are declining.',
                            placeholder: 'Reason for declining order…',
                            confirmLabel: 'Decline Order',
                            variant: 'danger',
                            onConfirm: async (reason) => {
                              await operationsApi(`/orders/${order._id}`, 'PATCH', { decision: 'rejected', reason });
                              await orders.refresh();
                              announce('Order request declined.');
                            },
                          });
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                <OrderChat order={order} refresh={orders.refresh} />
              </div>
            )}
          />
        </Panel>

        <CommercePanels portal="farmer" announce={announce} />

        <Panel title="Report a farm problem" sectionId="report-a-farm-problem">
          <div className="mb-4">
            <button
              onClick={() => setShowProblemForm(!showProblemForm)}
              className="w-full inline-flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-100 transition"
            >
              <span className="flex items-center gap-2"><CircleAlert size={16} /> Report Pest, Disease, or Soil Issue</span>
              <Plus size={16} className={`transition-transform ${showProblemForm ? 'rotate-45' : ''}`} />
            </button>
          </div>
          {showProblemForm && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 animate-in fade-in duration-150">
              <form
                className="space-y-3"
                onSubmit={async e => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  try {
                    await operationsApi('/problems', 'POST', {
                      title: formValue(target, 'title'),
                      enterprise: formValue(target, 'enterprise'),
                      description: formValue(target, 'description'),
                    });
                    target.reset();
                    setShowProblemForm(false);
                    await problems.refresh();
                    announce('Problem reported to field officers.');
                  } catch (error) {
                    announce(error instanceof Error ? error.message : 'Report failed.');
                  }
                }}
              >
                <TextField label="Problem title"><input name="title" required className={input} placeholder="e.g. Yellow leaves on Maize plot" /></TextField>
                <TextField label="Crop / livestock"><input name="enterprise" required className={input} placeholder="e.g. Maize Plot #2" /></TextField>
                <TextField label="Detailed description"><textarea name="description" required rows={3} className={input} placeholder="Describe symptoms or damage seen..." /></TextField>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowProblemForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                  <SubmitButton>Send Report</SubmitButton>
                </div>
              </form>
            </div>
          )}
          <RecordList
            items={problems.items}
            loading={problems.loading}
            render={p => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <b className="text-slate-900 font-bold">{p.title}</b>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${p.status === 'solved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{p.description}</p>
                {p.resolution && (
                  <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900 border border-emerald-200">
                    <b>Resolution:</b> {p.resolution}
                  </p>
                )}
              </div>
            )}
          />
        </Panel>

        <Panel title="Request veterinary visit" sectionId="request-veterinary-visit">
          <div className="mb-4">
            <button
              onClick={() => setShowVisitForm(!showVisitForm)}
              className="w-full inline-flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 transition"
            >
              <span className="flex items-center gap-2"><Stethoscope size={16} /> Request Officer On-Site Vet Visit</span>
              <Plus size={16} className={`transition-transform ${showVisitForm ? 'rotate-45' : ''}`} />
            </button>
          </div>
          {showVisitForm && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 animate-in fade-in duration-150">
              <form
                className="space-y-3"
                onSubmit={async e => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  try {
                    await operationsApi('/visits', 'POST', {
                      enterprise: formValue(target, 'enterprise'),
                      concern: formValue(target, 'concern'),
                      preferredAt: formValue(target, 'preferredAt'),
                    });
                    target.reset();
                    setShowVisitForm(false);
                    await visits.refresh();
                    announce('Vet visit request submitted.');
                  } catch (error) {
                    announce(error instanceof Error ? error.message : 'Request failed.');
                  }
                }}
              >
                <TextField label="Crop / livestock concern"><input name="enterprise" required className={input} placeholder="e.g. Dairy Cow, Poultry Flock" /></TextField>
                <TextField label="Health concern details"><textarea name="concern" required rows={3} className={input} placeholder="Describe signs, illness, or vaccination needed..." /></TextField>
                <TextField label="Preferred visit date"><input name="preferredAt" type="date" className={input} /></TextField>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowVisitForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                  <SubmitButton>Submit Request</SubmitButton>
                </div>
              </form>
            </div>
          )}
          <RecordList
            items={visits.items}
            loading={visits.loading}
            render={v => (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <b className="text-slate-900 font-bold">{v.enterprise}</b>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : v.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {v.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">{v.concern}</p>
                {v.decisionReason && (
                  <p className="mt-2 rounded-lg bg-slate-100 p-2 text-xs text-slate-700">
                    <b>Officer note:</b> {v.decisionReason}
                  </p>
                )}
              </div>
            )}
          />
        </Panel>

        <AnnouncementsPanel portal="farmer" announce={announce} />
        <Panel title="Agriculture and loan assistant" sectionId="agriculture-and-loan-assistant"><Assistant announce={announce}/></Panel>
      </div>

      {showPlotWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => { setShowPlotWizard(false); setEditingPlot(null); }}>
          <div className="bg-white rounded-2xl border max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ borderColor: "#BBF7D0" }}>
            <PlotRegistrationWizard
              onSubmit={editingPlot ? handlePlotUpdate : handlePlotSubmit}
              onCancel={() => { setShowPlotWizard(false); setEditingPlot(null); }}
              initialData={editingPlot || undefined}
              isEditing={!!editingPlot}
            />
          </div>
        </div>
      )}

      {modalConfig && (
        <ActionModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          description={modalConfig.description}
          placeholder={modalConfig.placeholder}
          confirmLabel={modalConfig.confirmLabel}
          variant={modalConfig.variant}
          onConfirm={modalConfig.onConfirm}
          onClose={() => setModalConfig(null)}
        />
      )}

      <QuickActionHub portal="farmer" onAction={scrollToSection} />
    </div>
  );
}

function OrderChat({ order, refresh }: { order: Row; refresh: () => Promise<void> }) { const [text, setText] = useState(''); const [collectionAt,setCollectionAt]=useState(''); return <div className='mt-2 border-t pt-2'><div className='max-h-28 space-y-1 overflow-auto'>{(order.messages || []).map((m:Row, i:number) => <p key={i} className='rounded-lg bg-slate-50 p-2 text-xs text-slate-600'>{m.text}</p>)}</div>{order.collectionAt&&<p className='mt-2 text-xs font-semibold text-emerald-800'>Collection planned: {new Date(order.collectionAt).toLocaleString()}</p>}{order.status==='approved'&&<><form className='mt-2 flex gap-2' onSubmit={async e=>{e.preventDefault();try{await operationsApi(`/orders/${order._id}/messages`,'POST',{text});setText('');await refresh();}catch(error){console.error(error);}}}><input value={text} onChange={e=>setText(e.target.value)} required className={input} placeholder='Discuss payment or collection'/><button className='rounded bg-slate-800 px-3 text-white'>Send</button></form><form className='mt-2 flex flex-wrap gap-2' onSubmit={async e=>{e.preventDefault();try{await operationsApi(`/orders/${order._id}/arrangement`,'PATCH',{collectionAt});await refresh();}catch(error){console.error(error);}}}><input type='datetime-local' value={collectionAt} onChange={e=>setCollectionAt(e.target.value)} className={input}/><button className='rounded border border-slate-300 px-3 text-xs font-semibold'>Propose collection</button><button type='button' onClick={async()=>{try{await operationsApi(`/orders/${order._id}/arrangement`,'PATCH',{status:'completed'});await refresh();}catch(error){console.error(error);}}} className='rounded border border-emerald-200 px-3 text-xs font-semibold text-emerald-800'>Mark complete</button></form></>}</div>; }
function ChatbotWidget({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([
    { id: '1', role: 'assistant', content: '👋 Hi! How can we help?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user' as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const response = await operationsApi<{ data: { answer: string } }>('/assistant', 'POST', { question: text });
      const botMsg = { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: response.data?.answer || 'Thank you for reaching out! How else can I assist your farm today?' };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: 'Muraho! I am here to assist you with crops, livestock, market prices, and loans in Rwanda.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[min(94vw,380px)] h-[520px] bg-white rounded-2xl shadow-2xl border border-emerald-200 flex flex-col font-sans overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header bar - Project Emerald color */}
      <div className="bg-[#064E3B] text-white px-4 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-100 transition">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h3 className="font-bold text-sm tracking-wide text-white">Customer Support</h3>
            <p className="text-[10px] text-emerald-200 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online · AHub Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-1 hover:bg-emerald-800 rounded-lg text-emerald-100 transition">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {/* Support welcome card */}
        <div className="flex items-start gap-2.5">
          <div className="size-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 border border-emerald-300">
            🌾
          </div>
          <div className="space-y-1 max-w-[85%]">
            <span className="text-[11px] font-medium text-slate-500">Customer Support</span>
            <div className="bg-[#059669] text-white text-xs px-3.5 py-2.5 rounded-2xl rounded-tl-none shadow-sm leading-relaxed font-medium">
              👋 Hi! How can we help?
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 1 && (
          <div className="pl-10 space-y-2 pt-1">
            <button
              onClick={() => void handleSend('I have a question about agricultural loans')}
              className="w-full text-left text-xs font-semibold text-[#047857] border border-[#047857]/40 bg-emerald-50/60 hover:bg-emerald-100/80 px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              I have a question
            </button>
            <button
              onClick={() => void handleSend('Tell me more about crop disease management')}
              className="w-full text-left text-xs font-semibold text-[#047857] border border-[#047857]/40 bg-emerald-50/60 hover:bg-emerald-100/80 px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              Tell me more
            </button>
          </div>
        )}

        {/* Dynamic Messages */}
        {messages.slice(1).map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="size-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                AH
              </div>
            )}
            <div
              className={`max-w-[82%] text-xs px-3.5 py-2.5 rounded-2xl leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-800 text-white rounded-tr-none font-medium shadow-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium pl-9">
            <span className="size-2 rounded-full bg-emerald-600 animate-bounce" />
            <span>AHub is typing…</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input container */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type here and press enter.."
            className="flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button type="button" className="text-slate-400 hover:text-emerald-700 p-1 transition" title="Like">
            <ThumbsUp size={15} />
          </button>
          <button type="button" className="text-slate-400 hover:text-emerald-700 p-1 transition" title="Attach">
            <Paperclip size={15} />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="text-emerald-700 hover:text-emerald-900 disabled:opacity-40 p-1 transition"
          >
            <Send size={15} />
          </button>
        </form>
        <div className="mt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <span>🌱 Powered by AHub AI</span>
        </div>
      </div>
    </div>
  );
}

function Assistant({ announce }: { announce?: (message: string) => void }) {
  return (
    <div className="w-full h-[700px] rounded-2xl overflow-hidden border border-[#27875B]/30 shadow-2xl bg-[#0A1A12]">
      <AIChat />
    </div>
  );
}

function AssistantDock({ announce }: { announce?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-[#10B981] px-5 py-3 font-bold text-white shadow-xl hover:bg-[#0D9668] transition ring-4 ring-[#0A1A12]/20"
      >
        <BookOpen size={17} />
        {open ? 'Close AHub' : 'Ask AHub'}
      </button>
      {open && <ChatbotWidget onClose={() => setOpen(false)} />}
    </div>
  );
}

function PlotCard({plot,announce}:{plot:Row;announce:(message:string)=>void}) { const [open,setOpen]=useState(false); const [activities,setActivities]=useState<Row[]>([]); const [note,setNote]=useState(''); const [kind,setKind]=useState('inspection'); const load=async()=>{try{const r=await operationsApi<{data:Row[]}>(`/plots/${plot._id}/activities`);setActivities(r.data);}catch(e){announce(e instanceof Error?e.message:'Could not load plot history.');}}; return <div><button onClick={()=>{setOpen(v=>!v);if(!open)void load();}} aria-expanded={open} className='flex w-full items-center justify-between gap-3 text-left'><span><b>{plot.name}</b><span className='ml-2 text-sm text-slate-600'>· {plot.enterprise} · {plot.stage||'planning'}</span><span className='block text-xs text-slate-500'>{plot.area?`${plot.area} ${plot.unit||''} · `:''}{plot.nextAction||'Add a next action'}</span></span><span className='text-sm font-semibold text-emerald-800'>{open?'Close':'Farm log'}</span></button>{open&&<div className='mt-3 border-t pt-3'><p className='text-xs text-slate-500'>Last activity: {plot.lastActivityAt?new Date(plot.lastActivityAt).toLocaleDateString():'No activity logged'}</p><form className='mt-3 grid gap-2 sm:grid-cols-[1fr_2fr_auto]' onSubmit={async e=>{e.preventDefault();try{await operationsApi(`/plots/${plot._id}/activities`,'POST',{kind,note});setNote('');await load();announce('Plot activity saved.');}catch(error){announce(error instanceof Error?error.message:'Could not save activity.');}}}><select className={input} value={kind} onChange={e=>setKind(e.target.value)}>{['planting','watering','fertilizing','inspection','harvest','other'].map(k=><option key={k}>{k}</option>)}</select><input className={input} required value={note} onChange={e=>setNote(e.target.value)} placeholder='What happened on this plot?'/><button className='rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white'>Log</button></form><div className='mt-3 space-y-2'>{activities.slice(0,4).map(a=><p key={a._id} className='text-xs text-slate-600'><b className='capitalize'>{a.kind}</b> · {a.note} · {new Date(a.occurredAt).toLocaleDateString()}</p>)}{!activities.length&&<p className='text-xs text-slate-500'>No activities recorded yet.</p>}</div></div>}</div>; }
function ProductMap({rows}:{rows:Row[]}) { const located=rows.filter(p=>Number.isFinite(Number(p.latitude))&&Number.isFinite(Number(p.longitude))); const [selected,setSelected]=useState(''); const minLat=Math.min(...located.map(p=>Number(p.latitude)),-2.9); const maxLat=Math.max(...located.map(p=>Number(p.latitude)),-1); const minLon=Math.min(...located.map(p=>Number(p.longitude)),28.8); const maxLon=Math.max(...located.map(p=>Number(p.longitude)),30.9); const item=located.find(p=>p._id===selected); return <div className='mb-3'><div role='img' aria-label='Map of available products by farmer region' className='relative aspect-[2/1] overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50' style={{backgroundImage:'linear-gradient(rgba(16,185,129,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,.09) 1px,transparent 1px)',backgroundSize:'32px 32px'}}><span className='absolute left-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-emerald-900'>Rwanda · product areas</span>{located.map(p=>{const left=8+(Number(p.longitude)-minLon)/Math.max(.001,maxLon-minLon)*84;const top=12+(maxLat-Number(p.latitude))/Math.max(.001,maxLat-minLat)*76;return <button key={p._id} title={`${p.title} · ${p.farmerId?.sector||'local farmer'}`} onClick={()=>setSelected(p._id)} className={`absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg ${selected===p._id?'bg-rose-600':'bg-emerald-700'}`} style={{left:`${left}%`,top:`${top}%`}} aria-label={`${p.title} in ${p.farmerId?.sector||'farmer region'}`}>•</button>})}{!located.length&&<p className='absolute inset-0 grid place-items-center text-sm text-slate-500'>Location coordinates are not available for these listings.</p>}</div>{item&&<p className='mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700'><b>{item.title}</b> · {item.farmerId?.sector}, {item.farmerId?.district}{item.distanceKm!=null?` · ${item.distanceKm} km away`:''}</p>}</div>; }

function LeafletMap({ rows }: { rows: Row[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Effect 1: Initialize the map ONLY once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [-1.9441, 30.0619], // Kigali, Rwanda
      zoom: 8,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);

    // Fix for grey tiles inside flex/grid containers
    const timer = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Effect 2: Update markers whenever rows change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const located = rows.filter(
      (p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
    );

    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:#10b981;width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    located.forEach((p) => {
      L.marker([Number(p.latitude), Number(p.longitude)], { icon: customIcon })
        .addTo(layer)
        .bindPopup(
          `<strong>${p.title}</strong><br>${
            p.farmerId?.sector || 'Unknown sector'
          }, ${p.farmerId?.district || 'Unknown district'}<br>${
            p.quantity ?? ''
          } ${p.unit || 'units'} available`
        );
    });

    if (located.length > 0) {
      const bounds = L.latLngBounds(
        located.map((p) => [Number(p.latitude), Number(p.longitude)] as [number, number])
      );
      map.fitBounds(bounds.pad(0.1));
    } else {
      map.setView([-1.9441, 30.0619], 8);
    }
  }, [rows]);

  return (
    <div className="map-card">
      <div className="map-label">Rwanda · product areas</div>
      <div
        ref={mapRef}
        className="rwanda-map"
        style={{ width: '100%', height: '420px', borderRadius: '12px' }}
      />
      {rows.length === 0 && (
        <div className="map-placeholder">
          Location coordinates are not available for these listings.
        </div>
      )}
    </div>
  );
}

function CustomerPortal({ announce }: { announce:(message:string)=>void }) {
  const products = useApiList('/products', announce);
  const orders = useApiList('/orders', announce);
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('');
  const [district, setDistrict] = useState('');
  const [enterprise, setEnterprise] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [allProducts, setAllProducts] = useState<Row[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [activeTab, setActiveTab] = useState<'search' | 'all'>('search');
  const [quantity, setQuantity] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  // Load all products for the "All Products" tab
  useEffect(() => {
    if (!products.loading) {
      setAllProducts(products.items);
    }
  }, [products.items, products.loading]);

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    try {
      const params = new URLSearchParams({ q: query, sector, district, enterprise });
      const result = await operationsApi<{ data: Row[] }>('/products?' + params);
      setRows(result.data);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Search failed.');
    }
  };

  // Auto-search when sector/district changes (for map view)
  useEffect(() => {
    if (view === 'map' && (sector || district)) {
      search();
    }
  }, [sector, district, view]);

  useEffect(() => {
    if (activeTab === 'search') {
      setRows(products.items);
    } else {
      setRows(allProducts);
    }
  }, [activeTab, products.items, allProducts]);

  const toggleFavorite = async (p: Row) => {
    try {
      await operationsApi('/favorites/' + p._id, p.isFavorite ? 'DELETE' : 'PUT');
      setRows(current => current.map(row => row._id === p._id ? { ...row, isFavorite: !p.isFavorite } : row));
      setAllProducts(current => current.map(row => row._id === p._id ? { ...row, isFavorite: !p.isFavorite } : row));
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Could not save product.');
    }
  };

  const renderProductCard = (p: Row) => (
    <article key={p._id} className='rounded-xl border border-slate-200 p-4'>
      <div className='flex justify-between gap-2'>
        <div className='flex items-start gap-3'>
          {p.imageUrl && <img src={p.imageUrl} alt={p.title} className='w-20 h-20 rounded-lg object-cover border flex-shrink-0' />}
          <div>
            <h3 className='font-bold'>{p.title}</h3>
            <p className='text-sm text-slate-600'>{p.quantity} {p.unit} available</p>
          </div>
        </div>
        <button aria-label={p.isFavorite ? 'Remove saved listing' : 'Save listing'} onClick={() => void toggleFavorite(p)} className='text-rose-600'>
          <Heart size={19} fill={p.isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      <p className='mt-2 text-xs text-slate-500'>{p.farmerId?.fullName} · {p.farmerId?.sector}, {p.farmerId?.district}{p.distanceKm != null ? ' · ' + p.distanceKm + ' km away' : ''}</p>
      <form className='mt-3 flex gap-2' onSubmit={async e => {
        e.preventDefault();
        setBusy(p._id);
        try {
          await operationsApi('/orders', 'POST', { productId: p._id, quantity: Number(quantity[p._id]) });
          await orders.refresh();
          announce('Request sent. The farmer will notify you when it is reviewed.');
        } catch (error) {
          announce(error instanceof Error ? error.message : 'Order request failed.');
        } finally {
          setBusy('');
        }
      }}>
        <input required min='0.01' max={p.quantity} step='any' type='number' value={quantity[p._id] || ''} onChange={e => setQuantity(v => ({ ...v, [p._id]: e.target.value }))} className={input} placeholder={'Quantity (' + (p.unit || 'units') + ')'} />
        <button disabled={busy === p._id} className='shrink-0 rounded-lg bg-emerald-700 px-3 text-sm font-bold text-white disabled:opacity-50'>{busy === p._id ? 'Sending' : 'Request'}</button>
      </form>
    </article>
  );

  return (
    <div className='space-y-5'>
      {/* Tab Navigation */}
      <div className='flex rounded-lg bg-slate-100 p-1' role='tablist'>
        <button
          role='tab'
          aria-selected={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
          className={'flex-1 rounded-md px-4 py-2 text-sm font-bold capitalize transition ' + (activeTab === 'search' ? 'bg-white shadow' : '')}
        >
          Find Products
        </button>
        <button
          role='tab'
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={'flex-1 rounded-md px-4 py-2 text-sm font-bold capitalize transition ' + (activeTab === 'all' ? 'bg-white shadow' : '')}
        >
          All Products
        </button>
      </div>

      {activeTab === 'search' ? (
        <Panel title='Find products near you' sectionId='find-local-products'>
          <form className='grid gap-2 sm:grid-cols-2' onSubmit={search}>
            <input className={input} value={query} onChange={e => setQuery(e.target.value)} placeholder='Product name' />
            <input className={input} value={enterprise} onChange={e => setEnterprise(e.target.value)} placeholder='Crop / livestock' />
            <input className={input} value={sector} onChange={e => setSector(e.target.value)} placeholder='Sector' />
            <input className={input} value={district} onChange={e => setDistrict(e.target.value)} placeholder='District' />
            <button className='inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 font-bold text-white sm:col-span-2'>
              <Search size={16} /> Search local listings
            </button>
          </form>
          <div className='my-4 flex items-center justify-between'>
            <p className='text-xs text-slate-500'>{rows.length} matching listings · nearest first where location is available</p>
            <div className='flex rounded-lg bg-slate-100 p-1'>
              {(['list', 'map'] as const).map(v => (
                <button key={v} onClick={() => setView(v)} className={'rounded-md px-3 py-1 text-xs font-bold capitalize ' + (view === v ? 'bg-white shadow' : '')}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          {view === 'map' && <LeafletMap rows={rows} />}
          <div className='grid gap-3 md:grid-cols-2'>
            {rows.map(renderProductCard)}
          </div>
          {products.loading && <p className='text-sm text-slate-500'>Loading marketplace...</p>}
          {!products.loading && !rows.length && <p className='text-sm text-slate-500'>No listings match these filters.</p>}
        </Panel>
      ) : (
        <Panel title='All available products' sectionId='all-products'>
          <p className='mb-4 text-sm text-slate-500'>Browse all ' + '{allProducts.length}' + ' available products across Rwanda</p>
          <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-3'>
            {allProducts.map(renderProductCard)}
          </div>
          {!allProducts.length && <p className='text-sm text-slate-500 text-center py-8'>No products available at the moment.</p>}
        </Panel>
      )}

      <CommercePanels portal="customer" announce={announce} />

      <Panel title='Your order conversations' sectionId='my-requests-and-messages'>
        <RecordList items={orders.items} loading={orders.loading} render={(o) => (
          <>
            <div className='flex items-start justify-between gap-2'>
              <b>{o.productId?.title}</b>
              <span className='rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold capitalize'>{o.status}</span>
            </div>
            <div className='my-3 flex items-center gap-1 text-[10px]'>
              {['requested', 'approved', 'completed'].map((step, i) => {
                const isPassed =
                  o.status === step ||
                  (['approved', 'completed'].includes(o.status) && i === 0) ||
                  (o.status === 'completed' && i === 1);
                return (
                  <React.Fragment key={step}>
                    <span className={'rounded-full px-2 py-1 capitalize ' + (isPassed ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500')}>
                      {step}
                    </span>
                    {i < 2 && <span className='h-px flex-1 bg-slate-200' />}
                  </React.Fragment>
                );
              })}
            </div>
            {o.events?.map((event: Row, i: number) => (
              <p key={i} className='text-xs text-slate-500'>
                {new Date(event.createdAt).toLocaleString()} · {event.note}
              </p>
            ))}
            {o.rejectionReason && <p className='text-sm text-rose-700'>{o.rejectionReason}</p>}
            <OrderChat order={o} refresh={orders.refresh} />
          </>
        )} />
      </Panel>
    </div>
  );
}

function StaffPortal({ portal, announce }: { portal: string; announce: (message: string) => void }) {
  const [dashboard, setDashboard] = useState<Row | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [tasks, setTasks] = useState<Row[]>([]);
  const [farmers, setFarmers] = useState<Row[]>([]);
  const visits = useApiList('/visits', announce);
  const problems = useApiList('/problems', announce);

  const [weather, setWeather] = useState<Row | null>(null);
  const [weatherSector, setWeatherSector] = useState('');
  const [weatherError, setWeatherError] = useState('');
  const [farmerQuery, setFarmerQuery] = useState('');
  const [taskStatus, setTaskStatus] = useState('all');
  const [enterpriseFilter, setEnterpriseFilter] = useState('');

  const [showTaskForm, setShowTaskForm] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    placeholder?: string;
    confirmLabel?: string;
    variant?: 'primary' | 'danger' | 'warning';
    onConfirm: (text: string) => Promise<void> | void;
  } | null>(null);

  useEffect(() => {
    setDashboardLoading(true);
    void operationsApi<{ data: Row }>('/dashboard')
      .then(r => {
        setDashboard(r.data);
        setTasks(r.data.tasks || []);
        setFarmers(r.data.farmers || []);
      })
      .catch(e => announce(e.message))
      .finally(() => setDashboardLoading(false));
  }, [portal]);

  const loadWeather = async (region = '') => {
    setWeatherError('');
    try {
      const query = region ? `?sector=${encodeURIComponent(region)}` : '';
      const r = await operationsApi<{ data: Row }>(`/weather${query}`);
      setWeather(r.data);
    } catch (error) {
      setWeatherError(error instanceof Error ? error.message : 'Weather unavailable.');
    }
  };
  useEffect(() => { void loadWeather(); }, []);

  const regionName = portal === 'sector' ? 'Sector' : portal === 'district' ? 'District' : portal === 'province' ? 'Province' : 'National';
  const dash = dashboard;
  const visibleFarmers = farmers.filter(f => `${f.fullName} ${f.sector} ${f.district}`.toLowerCase().includes(farmerQuery.toLowerCase()));
  const visibleTasks = tasks.filter(t => (taskStatus === 'all' || t.status === taskStatus) && (!enterpriseFilter || String(t.enterprise || '').toLowerCase().includes(enterpriseFilter.toLowerCase())));

  const pendingVisitsCount = visits.items.filter(v => v.status === 'pending').length;
  const openProblemsCount = problems.items.filter(p => p.status !== 'solved').length;
  const submittedTasksCount = tasks.filter(t => t.status === 'submitted').length;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <CommercePanels portal={portal} announce={announce} />
      {/* Executive Stat Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{farmers.length}</p>
              <p className="text-xs font-medium text-slate-500">Farmers Monitored</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <ClipboardCheck size={20} />
            </span>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">{submittedTasksCount}</span>
                <span className="text-xs text-slate-400">/ {tasks.length}</span>
              </div>
              <p className="text-xs font-medium text-slate-500">Submitted Field Tasks</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Stethoscope size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{pendingVisitsCount}</p>
              <p className="text-xs font-medium text-slate-500">Pending Vet Requests</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-700">
              <CircleAlert size={20} />
            </span>
            <div>
              <p className="text-2xl font-black text-slate-900">{openProblemsCount}</p>
              <p className="text-xs font-medium text-slate-500">Open Field Issues</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`${regionName} overview`} sectionId={`${portal}-overview`}>
          <RecordList
            items={dashboard ? [dashboard] : []}
            loading={dashboardLoading}
            render={d => (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(d.metrics || {}).map(([k, v]) => (
                  <div key={k} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{k.replace(/[A-Z]/g, ' $&')}</p>
                    <b className="text-xl font-bold text-slate-900">{String(v)}</b>
                  </div>
                ))}
              </div>
            )}
          />
        </Panel>

        <Panel title="Farmers in your jurisdiction" sectionId="farmers-in-your-jurisdiction">
          <div className="mb-3 relative">
            <input
              className={input}
              value={farmerQuery}
              onChange={e => setFarmerQuery(e.target.value)}
              placeholder="Search farmer name, sector, or district…"
            />
          </div>
          <RecordList
            items={visibleFarmers}
            loading={dashboardLoading}
            render={f => (
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-slate-900 font-bold text-sm">{f.fullName}</b>
                  <p className="text-xs text-slate-500">{f.sector} · {f.district} · {(f.enterpriseIds || []).join(', ')}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Active
                </span>
              </div>
            )}
          />
        </Panel>

        <Panel title="Crops and livestock in your region" sectionId="crops-and-livestock-in-your-region">
          <RecordList
            items={dash?.enterprises || []}
            loading={dashboardLoading}
            empty="No farm enterprises registered yet."
            render={item => (
              <div className="flex items-center justify-between">
                <b className="text-slate-900 capitalize text-sm font-bold">{item._id}</b>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {item.count} registered plots
                </span>
              </div>
            )}
          />
        </Panel>

        <Panel title="Daily field tasks" sectionId="daily-field-tasks">
          {portal === 'sector' && (
            <div className="mb-4">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="w-full inline-flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100 transition"
              >
                <span className="flex items-center gap-2"><ClipboardCheck size={16} /> Assign New Field Task to Farmer</span>
                <Plus size={16} className={`transition-transform ${showTaskForm ? 'rotate-45' : ''}`} />
              </button>
            </div>
          )}
          {showTaskForm && portal === 'sector' && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 animate-in fade-in duration-150">
              <form
                className="space-y-3"
                onSubmit={async e => {
                  e.preventDefault();
                  const f = e.currentTarget;
                  try {
                    await operationsApi('/tasks', 'POST', {
                      farmerId: formValue(f, 'farmerId'),
                      title: formValue(f, 'title'),
                      enterprise: formValue(f, 'enterprise'),
                      instructions: formValue(f, 'instructions'),
                      dueAt: formValue(f, 'dueAt'),
                    });
                    f.reset();
                    setShowTaskForm(false);
                    const r = await operationsApi<{ data: Row }>('/dashboard');
                    setDashboard(r.data);
                    setTasks(r.data.tasks || []);
                    announce('Task assigned successfully.');
                  } catch (error) {
                    announce(error instanceof Error ? error.message : 'Could not assign task.');
                  }
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField label="Assign to Farmer">
                    <select name="farmerId" required className={input}>
                      <option value="">Choose farmer…</option>
                      {farmers.map(f => <option key={f._id} value={f._id}>{f.fullName} ({f.sector})</option>)}
                    </select>
                  </TextField>
                  <TextField label="Task title"><input name="title" required className={input} placeholder="e.g. Inspect Maize Plot #1" /></TextField>
                  <TextField label="Crop / livestock"><input name="enterprise" className={input} placeholder="e.g. Maize, Cattle" /></TextField>
                  <TextField label="Due date"><input name="dueAt" type="date" className={input} /></TextField>
                </div>
                <TextField label="Instructions"><input name="instructions" className={input} placeholder="Specific steps or guidelines for the farmer…" /></TextField>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowTaskForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                  <SubmitButton>Assign Task</SubmitButton>
                </div>
              </form>
            </div>
          )}

          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            <select className={input} value={taskStatus} onChange={e => setTaskStatus(e.target.value)}>
              <option value="all">All task statuses</option>
              {['assigned', 'submitted', 'approved', 'returned'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className={input} value={enterpriseFilter} onChange={e => setEnterpriseFilter(e.target.value)} placeholder="Filter crop or livestock…" />
          </div>

          <RecordList
            items={visibleTasks}
            loading={dashboardLoading}
            render={t => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-slate-900 font-bold text-sm">{t.title}</b>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    t.status === 'returned' ? 'bg-amber-100 text-amber-800' :
                    t.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Farmer: <span className="font-semibold text-slate-900">{t.farmerId?.fullName}</span> · Enterprise: <span className="font-semibold text-emerald-700">{t.enterprise}</span> · Due: {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : 'No date'}
                </p>
                {t.completionNote && (
                  <p className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700">
                    <b>Farmer submitted:</b> {t.completionNote}
                  </p>
                )}
                {t.status === 'submitted' && portal === 'sector' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                      onClick={async () => {
                        await operationsApi(`/tasks/${t._id}/review`, 'PATCH', { decision: 'approved' });
                        const r = await operationsApi<{ data: Row }>('/dashboard');
                        setDashboard(r.data);
                        setTasks(r.data.tasks || []);
                        announce('Task approved.');
                      }}
                    >
                      Approve Work
                    </button>
                    <button
                      className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: 'Return Task for Corrections',
                          description: 'Provide constructive feedback detailing what the farmer should update.',
                          placeholder: 'What should the farmer correct?',
                          confirmLabel: 'Return with Feedback',
                          variant: 'warning',
                          onConfirm: async (note) => {
                            await operationsApi(`/tasks/${t._id}/review`, 'PATCH', { decision: 'returned', note });
                            const r = await operationsApi<{ data: Row }>('/dashboard');
                            setDashboard(r.data);
                            setTasks(r.data.tasks || []);
                            announce('Task returned with feedback.');
                          },
                        });
                      }}
                    >
                      Return with Feedback
                    </button>
                  </div>
                )}
              </div>
            )}
          />
        </Panel>

        <Panel title="Vet visit requests" sectionId="vet-visit-requests">
          <RecordList
            items={visits.items}
            loading={visits.loading}
            render={v => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-slate-900 font-bold text-sm">{v.farmerId?.fullName}</b>
                    <span className="ml-2 text-xs text-slate-500">· {v.enterprise}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${v.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : v.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {v.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{v.concern}</p>
                {portal === 'sector' && v.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 transition"
                      onClick={async () => {
                        await operationsApi(`/visits/${v._id}`, 'PATCH', { decision: 'approved' });
                        await visits.refresh();
                        announce('Vet visit request approved.');
                      }}
                    >
                      Approve Visit
                    </button>
                    <button
                      className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
                      onClick={() => {
                        setModalConfig({
                          isOpen: true,
                          title: 'Reject Vet Visit Request',
                          description: 'Please specify the reason for rejecting this visit request.',
                          placeholder: 'Reason for rejection…',
                          confirmLabel: 'Reject Request',
                          variant: 'danger',
                          onConfirm: async (reason) => {
                            await operationsApi(`/visits/${v._id}`, 'PATCH', { decision: 'rejected', reason });
                            await visits.refresh();
                            announce('Vet visit request rejected.');
                          },
                        });
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          />
        </Panel>

        <Panel title="Reported problems" sectionId="reported-problems">
          <RecordList
            items={problems.items}
            loading={problems.loading}
            render={p => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-slate-900 font-bold text-sm">{p.title}</b>
                    <span className="ml-2 text-xs text-slate-500">· {p.farmerId?.fullName}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${p.status === 'solved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{p.description}</p>
                {p.status !== 'solved' && (
                  <form
                    className="mt-2 flex gap-2"
                    onSubmit={async e => {
                      e.preventDefault();
                      const resolution = new FormData(e.currentTarget).get('resolution');
                      await operationsApi(`/problems/${p._id}`, 'PATCH', { status: 'solved', resolution });
                      await problems.refresh();
                      announce('Problem marked as solved.');
                    }}
                  >
                    <input name="resolution" required className={input} placeholder="Resolution or advice provided…" />
                    <button className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800 transition">
                      Mark Solved
                    </button>
                  </form>
                )}
              </div>
            )}
          />
        </Panel>

        {['district', 'province', 'rab'].includes(portal) && (
          <Panel title="Forecast location" sectionId="four-day-sector-forecast">
            <form
              className="flex gap-2"
              onSubmit={e => {
                e.preventDefault();
                void loadWeather(weatherSector);
              }}
            >
              <input className={input} value={weatherSector} onChange={e => setWeatherSector(e.target.value)} placeholder="Choose a sector in your jurisdiction…" />
              <button className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition">
                View Sector
              </button>
            </form>
          </Panel>
        )}

        <WeatherPanel
          forecast={weather?.forecast || []}
          current={weather || undefined}
          error={weatherError}
          onRefresh={() => void loadWeather(weatherSector)}
          location={weather?.location?.resolvedName}
        />

        <Panel
          title={portal === 'district' ? 'Top performing sectors' : portal === 'province' ? 'Top performing districts' : portal === 'rab' ? 'Top performing districts nationwide' : 'Top farmers in your sector'}
          sectionId={portal === 'sector' ? 'top-farmers-in-your-sector' : portal === 'district' ? 'top-performing-sectors' : portal === 'province' ? 'top-performing-districts' : 'top-performing-districts-nationwide'}
        >
          <RecordList
            items={(dash?.ranking || []).map((r: Row, i: number) => ({ ...r, rank: i + 1 }))}
            loading={dashboardLoading}
            empty="No approved task completion data yet."
            render={r => (
              <div className="flex items-center justify-between">
                <div>
                  <b className="text-slate-900 font-bold text-sm">#{r.rank} {r.name || r.region}</b>
                  <p className="text-xs text-slate-500">{r.region} · {r.score} approved tasks</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  {r.completionRate}% completion
                </span>
              </div>
            )}
          />
        </Panel>

        <AnnouncementsPanel portal={portal} announce={announce} />
        <Panel title="Exam results" sectionId="exam-results"><LearningResults announce={announce}/></Panel>
      </div>

      {modalConfig && (
        <ActionModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          description={modalConfig.description}
          placeholder={modalConfig.placeholder}
          confirmLabel={modalConfig.confirmLabel}
          variant={modalConfig.variant}
          onConfirm={modalConfig.onConfirm}
          onClose={() => setModalConfig(null)}
        />
      )}

      <QuickActionHub portal={portal} onAction={scrollToSection} />
    </div>
  );
}
function LearningResults({announce}:{announce:(m:string)=>void}){const [items,setItems]=useState<Row[]>([]);useEffect(()=>{void operationsApi<{data:any}>('/dashboard').then(r=>setItems(r.data.examResults||[])).catch(e=>announce(e.message));},[]);return <RecordList items={items} loading={false} empty='Exam result reporting endpoint is not available.' render={r=><>{r.examTitle} · {r.farmerName} · {r.score}%</>}/>;}

function PortalNavigation({ portal, activePage, onNavigate }: { portal: string; activePage: string; onNavigate: (id: string) => void }) {
  const common = [{ label: 'Overview', id: portal === 'farmer' ? 'four-day-sector-forecast' : portal === 'customer' ? 'find-local-products' : `${portal}-overview`, icon: Home }];
  const entries: Record<string, {label:string;id:string;icon:typeof Home}[]> = {
    farmer: [{label:'Weather',id:'four-day-sector-forecast',icon:CloudSun},{label:'Plots',id:'register-a-plot',icon:MapPinned},{label:'Guide Me',id:'guide-me',icon:Sparkles},{label:'Tasks',id:'daily-tasks-submit-completed-work',icon:ClipboardCheck},{label:'Market',id:'upload-products',icon:Package},{label:'Orders',id:'orders-and-buyer-messages',icon:MessageSquare},{label:'Report issue',id:'report-a-farm-problem',icon:CircleAlert},{label:'Vet visit',id:'request-veterinary-visit',icon:Stethoscope},{label:'Updates',id:'announcements',icon:Megaphone},{label:'AI assistant',id:'agriculture-and-loan-assistant',icon:BookOpen}],
    customer: [{label:'Browse',id:'find-local-products',icon:Search},{label:'Orders',id:'my-requests-and-messages',icon:MessageSquare}],
    sector: [{label:'Overview',id:'sector-overview',icon:Activity},{label:'Farmers',id:'farmers-in-your-jurisdiction',icon:Users},{label:'Tasks',id:'daily-field-tasks',icon:ClipboardCheck},{label:'Vet requests',id:'vet-visit-requests',icon:Stethoscope},{label:'Problems',id:'reported-problems',icon:CircleAlert},{label:'Weather',id:'four-day-sector-forecast',icon:CloudSun},{label:'Rankings',id:'top-farmers-in-your-sector',icon:TrendingUp},{label:'Learning',id:'sector-learning',icon:BookOpen},{label:'Announcements',id:'publish-announcement',icon:Megaphone}],
    district: [{label:'Overview',id:'district-overview',icon:Activity},{label:'Farmers',id:'farmers-in-your-jurisdiction',icon:Users},{label:'Crops & livestock',id:'crops-and-livestock-in-your-region',icon:Sprout},{label:'Tasks',id:'daily-field-tasks',icon:ClipboardCheck},{label:'Problems',id:'reported-problems',icon:CircleAlert},{label:'Weather',id:'four-day-sector-forecast',icon:CloudSun},{label:'Rankings',id:'top-performing-sectors',icon:TrendingUp},{label:'Learning',id:'sector-learning',icon:BookOpen},{label:'Announcements',id:'publish-announcement',icon:Megaphone},{label:'Account requests',id:'account-requests',icon:Users}],
    province: [{label:'Overview',id:'province-overview',icon:Activity},{label:'Farmers',id:'farmers-in-your-jurisdiction',icon:Users},{label:'Crops & livestock',id:'crops-and-livestock-in-your-region',icon:Sprout},{label:'Problems',id:'reported-problems',icon:CircleAlert},{label:'Weather',id:'four-day-sector-forecast',icon:CloudSun},{label:'Rankings',id:'top-performing-districts',icon:TrendingUp},{label:'Learning',id:'sector-learning',icon:BookOpen},{label:'Exam results',id:'exam-results',icon:BookOpen},{label:'Announcements',id:'publish-announcement',icon:Megaphone},{label:'Account requests',id:'account-requests',icon:Users}],
    rab: [{label:'Overview',id:'national-overview',icon:Activity},{label:'Farmers',id:'farmers-in-your-jurisdiction',icon:Users},{label:'Crops & livestock',id:'crops-and-livestock-in-your-region',icon:Sprout},{label:'Problems',id:'reported-problems',icon:CircleAlert},{label:'Weather',id:'four-day-sector-forecast',icon:CloudSun},{label:'Rankings',id:'top-performing-districts-nationwide',icon:TrendingUp},{label:'Exam results',id:'exam-results',icon:BookOpen},{label:'Announcements',id:'publish-announcement',icon:Megaphone},{label:'Course review',id:'rab-course-review',icon:BookOpen},{label:'Learning desk',id:'sector-learning',icon:BookOpen},{label:'Account requests',id:'account-requests',icon:Users}],
    nsg: [{label:'Account requests',id:'account-requests',icon:Users}],
  };
  const links = entries[portal] || common;
  return <nav aria-label='Portal pages' className='portal-nav sticky top-2 z-40 mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/95 p-2 shadow-md backdrop-blur-md'>{links.map(({label,id,icon:Icon})=><button key={id} type='button' aria-current={activePage===id?'page':undefined} onClick={()=>onNavigate(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${activePage===id?'bg-emerald-700 text-white shadow-sm':'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800'}`}><Icon size={16}/>{label}</button>)}</nav>;
}

function FarmerSidebar({ activePage, onNavigate }: { activePage: string; onNavigate: (id: string) => void }) {
  const farmerItems = [
    { label: 'Weather', id: 'four-day-sector-forecast', icon: CloudSun },
    { label: 'Plots', id: 'register-a-plot', icon: MapPinned },
    { label: 'Guide Me', id: 'guide-me', icon: Sparkles },
    { label: 'Tasks', id: 'daily-tasks-submit-completed-work', icon: ClipboardCheck },
    { label: 'Market', id: 'upload-products', icon: Package },
    { label: 'Orders', id: 'orders-and-buyer-messages', icon: MessageSquare },
    { label: 'Report issue', id: 'report-a-farm-problem', icon: CircleAlert },
    { label: 'Vet visit', id: 'request-veterinary-visit', icon: Stethoscope },
    { label: 'Updates', id: 'announcements', icon: Megaphone },
    { label: 'AI assistant', id: 'agriculture-and-loan-assistant', icon: BookOpen },
  ];

  return (
    <aside className="fixed lg:sticky top-0 left-0 z-40 h-[calc(100vh-4rem)] lg:h-auto w-64 flex flex-col bg-white border-r border-slate-100 shadow-sm transition-all duration-300" aria-label="Farmer portal navigation">
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {farmerItems.map(({ label, id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activePage === id ? 'page' : undefined}
            onClick={() => onNavigate(id)}
            className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              activePage === id
                ? 'bg-emerald-50 text-emerald-700 shadow-sm border-l-4 border-emerald-600'
                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 hover:shadow-sm'
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              activePage === id ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'
            }`}>
              <Icon size={18} />
            </div>
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center uppercase tracking-wider">
          AHub Farmer Portal
        </p>
      </div>
    </aside>
  );
}

function NotificationBell({announce}:{announce:(message:string)=>void}) { const [open,setOpen]=useState(false); const [items,setItems]=useState<Row[]>([]); const unread=items.filter(item=>!item.readAt).length; const load=async()=>{try{const result=await operationsApi<{data:Row[]}>('/notifications');setItems(result.data);}catch(error){announce(error instanceof Error?error.message:'Notifications are unavailable.');}}; return <div className='relative'><button aria-label={`Notifications${unread?`, ${unread} unread`:''}`} onClick={()=>{setOpen(v=>!v);if(!open)void load();}} className='relative grid size-10 place-items-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20'><Bell size={18}/>{unread>0&&<span className='absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white'>{unread}</span>}</button>{open&&<div className='absolute right-0 z-30 mt-2 w-[min(90vw,22rem)] rounded-2xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl'><div className='mb-2 flex items-center justify-between'><h2 className='font-bold'>Notifications</h2><button onClick={()=>void load()} className='text-xs font-semibold text-emerald-800'>Refresh</button></div><div className='max-h-80 space-y-2 overflow-auto'>{items.length?items.map(item=><button key={item._id} onClick={async()=>{if(!item.readAt){try{const result=await operationsApi<{data:Row}>(`/notifications/${item._id}/read`,'PATCH');setItems(current=>current.map(n=>n._id===item._id?result.data:n));}catch(error){announce(error instanceof Error?error.message:'Could not mark notification as read.');}}}} className={`w-full rounded-xl p-3 text-left ${item.readAt?'bg-slate-50':'bg-emerald-50'}`}><b className='block text-sm'>{item.title}</b><span className='mt-1 block text-xs text-slate-600'>{item.body}</span><span className='mt-1 block text-[10px] text-slate-400'>{new Date(item.createdAt).toLocaleString()}</span></button>):<p className='p-4 text-sm text-slate-500'>You are all caught up.</p>}</div></div>}</div>; }

function GlobalWorkspaceSearch({ portal, onNavigate }: { portal: string; onNavigate: (pageId: string) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const topics = useMemo(() => {
    return [
      { id: 'announcements', pageId: 'publish-announcement', title: 'Regional Announcements & Bulletins', keywords: 'announcement news update bulletin alert notice' },
      { id: 'sector-learning', pageId: 'sector-learning', title: 'Agricultural Courses & Learning Desk', keywords: 'course learning quiz exam lesson education rab' },
      { id: 'rab-course-review', pageId: 'rab-course-review', title: 'National Course Audit & Approval Desk', keywords: 'rab review audit approve reject quiz course' },
      { id: 'daily-field-tasks', pageId: 'daily-field-tasks', title: 'Daily Field Tasks & Farmer Submissions', keywords: 'task work daily field assignment grade' },
      { id: 'vet-visit-requests', pageId: 'vet-visit-requests', title: 'Veterinary Visit Requests', keywords: 'vet animal livestock disease doctor visit' },
      { id: 'four-day-sector-forecast', pageId: 'four-day-sector-forecast', title: 'Weather & Sector Forecast', keywords: 'weather rain temperature forecast climate' },
      { id: 'reported-problems', pageId: 'reported-problems', title: 'Reported Farm Issues & Outbreaks', keywords: 'problem issue pest disease report infestation' },
      { id: 'farmers-in-your-jurisdiction', pageId: 'farmers-in-your-jurisdiction', title: 'Farmers Directory & Jurisdiction', keywords: 'farmer list user sector district account' },
      { id: 'find-local-products', pageId: 'find-local-products', title: 'Marketplace & Product Listings', keywords: 'market product crop maize buy sell order' },
    ];
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return topics.filter(t => t.title.toLowerCase().includes(q) || t.keywords.includes(q));
  }, [query, topics]);

  return (
    <div className="relative mb-4 w-full">
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white shadow-xs focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 transition">
        <span className="pl-4 text-slate-400">
          <Search size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search workspace (courses, announcements, tasks, vet requests, weather, farmers)..."
          className="w-full bg-transparent px-3.5 py-3 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="pr-4 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && query.trim() !== '' && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl max-h-72 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pb-2 border-b border-slate-100">
            Workspace Search Results ({results.length})
          </p>
          {results.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-500">
              No matching pages or modules found for "{query}".
            </p>
          ) : (
            <div className="mt-1 space-y-1">
              {results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    onNavigate(res.pageId);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs text-slate-800 hover:bg-emerald-50 hover:text-emerald-950 transition"
                >
                  <span className="font-bold">{res.title}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase bg-emerald-100/60 px-2 py-0.5 rounded-full">Jump →</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const PortalWorkspace: React.FC<Props> = ({ portal, onExit }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [activePage, setActivePage] = useState(portal === 'farmer' ? 'four-day-sector-forecast' : portal === 'customer' ? 'find-local-products' : portal === 'nsg' ? 'account-requests' : `${portal}-overview`);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const announce = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000); };
  const signOut = () => { localStorage.removeItem('ahub_token'); localStorage.removeItem('ahub_user'); onExit(); };
  const handleNavigate = (id: string) => { setActivePage(id); window.scrollTo({ top: 0, behavior: 'smooth' }); if (portal === 'farmer') setSidebarOpen(false); };

  const isFarmer = portal === 'farmer';

  return (
    <main className="portal-shell min-h-screen px-3 py-5 text-slate-800 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="portal-hero mb-5 overflow-hidden rounded-[2rem] p-5 text-white shadow-xl sm:p-8">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {isFarmer && (
                <button
                  className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Toggle menu"
                >
                  <Menu size={22} />
                </button>
              )}
              <span className="grid size-14 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Sprout size={27} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-100">Agriculture Hub <span className="mx-1">/</span> Workspace</p>
                <h1 className="mt-1 font-[Manrope] text-2xl font-extrabold sm:text-3xl">{roles[portal] || 'AHub Portal'}</h1>
                <p className="mt-1 text-sm text-emerald-50/80">Your work, updates, and regional insights in one place.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell announce={announce} />
              <div className="relative">
                <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/20" aria-expanded={profileOpen} onClick={() => setProfileOpen(v => !v)}>
                  My account <ChevronDown size={15} />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 z-20 mt-2 min-w-40 rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-xl">
                    <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50" onClick={signOut}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
              <button className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/20" onClick={onExit}>
                Switch role
              </button>
            </div>
          </div>
          <div className="relative z-10 mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-emerald-50/85">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,.8)]" />
              Workspace active
            </span>
            <span>Secure role-based access</span>
            <span className="ml-auto inline-flex items-center gap-1.5">
              <ShieldCheck size={14} />
              AHub field service
            </span>
          </div>
        </header>

        {isFarmer && sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-black/50" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <div className={`flex ${isFarmer ? 'lg:pl-0' : ''}`}>
          {isFarmer && (
            <FarmerSidebar activePage={activePage} onNavigate={handleNavigate} />
          )}

          <div className={`flex-1 ${isFarmer ? 'lg:pl-6' : ''} min-w-0`}>
            <GlobalWorkspaceSearch portal={portal} onNavigate={handleNavigate} />
            {!isFarmer && (
              <PortalNavigation portal={portal} activePage={activePage} onNavigate={handleNavigate} />
            )}
            {toast && (
              <div role="status" className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-sm">
                <span className="mt-0.5 size-2 rounded-full bg-emerald-600" />
                {toast}
              </div>
            )}
            <PortalPageContext.Provider value={activePage}>
              {portal === 'farmer' && <FarmerPortal announce={announce} />}
              {portal === 'customer' && <CustomerPortal announce={announce} />}
              {['sector', 'district', 'province', 'rab'].includes(portal) && <StaffPortal portal={portal} announce={announce} />}
              {['sector', 'district', 'province', 'rab'].includes(portal) && activePage === 'sector-learning' && (
                <FarmerLearning role="sector" announce={announce} />
              )}
              {portal === 'rab' && activePage === 'rab-course-review' && (
                <div id="rab-course-review">
                  <RabLearningReview announce={announce} />
                </div>
              )}
              {['district', 'province', 'rab', 'nsg'].includes(portal) && activePage === 'account-requests' && (
                <AccountApprovalsQueue portal={portal} />
              )}
              {['farmer', 'customer'].includes(portal) && <AssistantDock announce={announce} />}
            </PortalPageContext.Provider>
            <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">AHub · Agriculture Hub</span>
              <span>Connecting farmers, buyers, and field fields</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
};