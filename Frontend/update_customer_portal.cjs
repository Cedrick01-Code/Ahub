const fs = require('fs');
let content = fs.readFileSync('src/PortalWorkspace.tsx', 'utf8');

// Find the CustomerPortal function and replace it
const startMarker = 'function CustomerPortal({ announce }: { announce:(message:string)=>void }) {';
const endMarker = 'function StaffPortal({ portal, announce }: { portal: string; announce: (message: string) => void }) {';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx + 1);

if (startIdx === -1 || endIdx === -1) {
  console.log('Markers not found: startIdx=' + startIdx + ', endIdx=' + endIdx);
  process.exit(1);
}

const newCustomerPortal = `function CustomerPortal({ announce }: { announce:(message:string)=>void }) {
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

function StaffPortal({ portal, announce }: { portal: string; announce: (message: string) => void }) {`;

content = content.substring(0, startIdx) + newCustomerPortal + content.substring(endIdx);
fs.writeFileSync('src/PortalWorkspace.tsx', content);
console.log('CustomerPortal updated successfully');