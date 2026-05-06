# OrdersPage — Presné JSX inštrukcie redesignu

**Súbor:** `src/pages/OrdersPage.tsx`  
**Princíp:** Meniť iba vizuálnu vrstvu. Zachovať VŠETKU logiku, filtre, handlery, query dáta.

---

## OUTER WRAPPER

```tsx
<MainLayout>
  <div className="p-6 space-y-4">
    {/* topbar, filtre, revenue karty, tabuľka/grid, dialógy */}
  </div>
</MainLayout>
```

---

## 1. TOPBAR

```tsx
{/* ─── Topbar ─── */}
<div className="flex items-center justify-between gap-3 flex-wrap">
  <div>
    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Objednávky</h1>
    <p className="text-xs text-gray-500">Spravujte objednávky od zákazníkov</p>
  </div>
  <div className="flex items-center gap-2 flex-wrap">
    <Button onClick={openNew} className="bg-[#10b981] hover:bg-[#059669] text-white h-9 text-sm">
      <Plus className="h-4 w-4 mr-1.5" />
      Nová objednávka
    </Button>
    <div className="hidden md:flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
        <List className="h-4 w-4" />
      </Button>
    </div>
    <Button onClick={() => setBulkDateChangeOpen(true)} variant="outline" className="h-9 text-xs px-3 gap-1.5">
      <CalendarIcon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Zmena termínu</span>
    </Button>
    <Button variant="outline" className="h-9 text-xs px-3 gap-1.5">
      <FileSpreadsheet className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Excel</span>
    </Button>
    <Button variant="outline" className="h-9 text-xs px-3 gap-1.5">
      <FileText className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">PDF</span>
    </Button>
  </div>
</div>
```

---

## 2. DESKTOP FILTRE

```tsx
{/* ─── DESKTOP filtre ─── */}
<div className="hidden md:block space-y-2">

  {/* Riadok 1: selects + prepínače */}
  <div className="flex flex-wrap gap-2 items-center">
    <CustomerTypeFilter value={filterCustomerType} onChange={setFilterCustomerType} showLabel={false} />

    <div className="w-[260px]">
      <SearchableCustomerSelect
        value={customerFilter}
        onValueChange={(value) => setCustomerFilter(value)}
        customers={customers?.filter(c => filterCustomerType === 'all' ? true : c.customer_type === filterCustomerType)}
        placeholder="Hľadať zákazníka..."
        allowAll={true}
      />
    </div>

    <Select value={orderCategoryFilter} onValueChange={(value) => setOrderCategoryFilter(value)}>
      <SelectTrigger className="w-[170px] h-9 text-sm">
        <SelectValue placeholder="Kategória" />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={5}>
        <SelectItem value="all">Všetky kategórie</SelectItem>
        <SelectItem value="microgreens"><Leaf className="h-4 w-4 text-green-600 mr-2 inline" />Mikrozelenina</SelectItem>
        <SelectItem value="microherbs"><Sprout className="h-4 w-4 text-green-600 mr-2 inline" />Mikrobylinky</SelectItem>
        <SelectItem value="edible_flowers"><Flower className="h-4 w-4 text-green-600 mr-2 inline" />Jedlé kvety</SelectItem>
        <SelectItem value="mix"><Palette className="h-4 w-4 text-green-600 mr-2 inline" />Mixy</SelectItem>
      </SelectContent>
    </Select>

    <Select value={filterCrop} onValueChange={(value) => setFilterCrop(value)}>
      <SelectTrigger className="w-[155px] h-9 text-sm">
        <SelectValue placeholder="Plodina" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
        <SelectItem value="all">Všetky plodiny</SelectItem>
        {orderCategoryFilter === 'mix'
          ? blends?.map(blend => <SelectItem key={blend.id} value={blend.name}>{blend.name}</SelectItem>)
          : crops?.filter(crop => !orderCategoryFilter || orderCategoryFilter === 'all' ? true : (crop as any).category === orderCategoryFilter)
              .map(crop => <SelectItem key={crop?.id} value={crop?.name || ''}>{crop?.name}</SelectItem>)
        }
      </SelectContent>
    </Select>

    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 text-sm font-normal gap-2">
          <CalendarIcon className="h-3.5 w-3.5" />
          {selectedDates.length === 0
            ? 'Dátum'
            : selectedDates.length === 1
            ? format(selectedDates[0], 'dd.MM.yyyy', { locale: sk })
            : `${selectedDates.length} dní`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {renderCalendar()}
      </PopoverContent>
    </Popover>

    {/* Archív + Zrušené — push doprava cez ml-auto */}
    <div className="flex items-center gap-3 ml-auto">
      <div className="flex items-center gap-1.5">
        <Switch id="archive-toggle" checked={showArchive} onCheckedChange={setShowArchive} />
        <Label htmlFor="archive-toggle" className="text-sm cursor-pointer whitespace-nowrap">Archív</Label>
      </div>
      <div className="flex items-center gap-1.5">
        <Switch id="cancelled-toggle" checked={showCancelled} onCheckedChange={setShowCancelled} />
        <Label htmlFor="cancelled-toggle" className="text-sm cursor-pointer whitespace-nowrap">Zrušené</Label>
      </div>
    </div>
  </div>

  {/* Riadok 2: period chipy */}
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs text-gray-400 font-medium">Obdobie:</span>
    {([
      { value: 'all',          label: 'Všetky' },
      { value: 'this_week',    label: 'Tento týždeň' },
      { value: 'next_week',    label: 'Budúci týždeň' },
      { value: 'last_week',    label: 'Minulý týždeň' },
      { value: 'last_2_weeks', label: 'Pred 2T' },
      { value: 'last_month',   label: 'Minulý mesiac' },
    ] as const).map(p => (
      <button
        key={p.value}
        onClick={() => setFilterPeriod(p.value)}
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
          filterPeriod === p.value
            ? 'bg-gray-800 text-white border-gray-800'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        {p.label}
      </button>
    ))}
  </div>

  {/* Riadok 3: status chipy */}
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-xs text-gray-400 font-medium">Stav:</span>
    {([
      { value: 'all',              label: 'Všetky',     on: 'bg-gray-700 text-white border-gray-700',        off: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50' },
      { value: 'cakajuca',         label: 'Čakajúca',   on: 'bg-yellow-500 text-white border-yellow-500',     off: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
      { value: 'pending_approval', label: 'Schválenie', on: 'bg-purple-500 text-white border-purple-500',     off: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
      { value: 'potvrdena',        label: 'Potvrdená',  on: 'bg-green-500 text-white border-green-500',       off: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
      { value: 'growing',          label: 'Rastie',     on: 'bg-[#10b981] text-white border-[#10b981]',       off: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
      { value: 'packed',           label: 'Zabalená',   on: 'bg-amber-500 text-white border-amber-500',       off: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
      { value: 'on_the_way',       label: 'Na ceste',   on: 'bg-sky-500 text-white border-sky-500',           off: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
      { value: 'pripravena',       label: 'Pripravená', on: 'bg-orange-500 text-white border-orange-500',     off: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
      { value: 'dorucena',         label: 'Doručená',   on: 'bg-blue-500 text-white border-blue-500',         off: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    ] as const).map(s => (
      <button
        key={s.value}
        onClick={() => setFilterStatus(s.value)}
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
          filterStatus === s.value ? s.on : s.off
        }`}
      >
        {s.label}
      </button>
    ))}
  </div>

</div>
```

---

## 3. MOBILE FILTRE

```tsx
{/* ─── MOBILE filtre ─── */}
<div className="md:hidden space-y-2">
  <CustomerTypeFilter value={filterCustomerType} onChange={setFilterCustomerType} showLabel={false} />

  <div className="w-full">
    <SearchableCustomerSelect
      value={customerFilter}
      onValueChange={(value) => setCustomerFilter(value)}
      customers={customers?.filter(c => filterCustomerType === 'all' ? true : c.customer_type === filterCustomerType)}
      placeholder="Hľadať zákazníka..."
      allowAll={true}
    />
  </div>

  <div className="grid grid-cols-2 gap-2">
    <Select value={orderCategoryFilter} onValueChange={(value) => setOrderCategoryFilter(value)}>
      <SelectTrigger><SelectValue placeholder="Kategória" /></SelectTrigger>
      <SelectContent position="popper" sideOffset={5}>
        <SelectItem value="all">Všetky</SelectItem>
        <SelectItem value="microgreens">Mikrozelenina</SelectItem>
        <SelectItem value="microherbs">Mikrobylinky</SelectItem>
        <SelectItem value="edible_flowers">Jedlé kvety</SelectItem>
        <SelectItem value="mix">Mixy</SelectItem>
      </SelectContent>
    </Select>
    <Select value={filterCrop} onValueChange={(value) => setFilterCrop(value)}>
      <SelectTrigger><SelectValue placeholder="Plodina" /></SelectTrigger>
      <SelectContent className="max-h-[300px] overflow-y-auto z-[100]">
        <SelectItem value="all">Všetky plodiny</SelectItem>
        {/* dynamic crop/blend list — zachovať logiku */}
      </SelectContent>
    </Select>
  </div>

  <div className="grid grid-cols-2 gap-2">
    <Popover open={calendarOpenMobile} onOpenChange={setCalendarOpenMobile}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start text-left font-normal h-10 w-full">
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{/* dátum label */}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {renderCalendar(() => setCalendarOpenMobile(false))}
      </PopoverContent>
    </Popover>
    <Select value={filterPeriod} onValueChange={setFilterPeriod}>
      <SelectTrigger><SelectValue placeholder="Obdobie" /></SelectTrigger>
      <SelectContent>{/* rovnaké položky ako desktop */}</SelectContent>
    </Select>
  </div>

  {/* Status chipy – horizontálne scrollovateľné */}
  <div className="overflow-x-auto pb-1 -mx-1 px-1">
    <div className="flex items-center gap-1.5 min-w-max">
      {/* rovnaké chip dáta ako desktop, bez hover tried */}
      {([
        { value: 'all',              label: 'Všetky',     on: 'bg-gray-700 text-white border-gray-700',    off: 'bg-white text-gray-600 border-gray-300' },
        { value: 'cakajuca',         label: 'Čakajúca',   on: 'bg-yellow-500 text-white border-yellow-500', off: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
        { value: 'pending_approval', label: 'Schválenie', on: 'bg-purple-500 text-white border-purple-500', off: 'bg-purple-50 text-purple-700 border-purple-200' },
        { value: 'potvrdena',        label: 'Potvrdená',  on: 'bg-green-500 text-white border-green-500',   off: 'bg-green-50 text-green-700 border-green-200' },
        { value: 'growing',          label: 'Rastie',     on: 'bg-[#10b981] text-white border-[#10b981]',   off: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        { value: 'packed',           label: 'Zabalená',   on: 'bg-amber-500 text-white border-amber-500',   off: 'bg-amber-50 text-amber-700 border-amber-200' },
        { value: 'on_the_way',       label: 'Na ceste',   on: 'bg-sky-500 text-white border-sky-500',       off: 'bg-sky-50 text-sky-700 border-sky-200' },
        { value: 'pripravena',       label: 'Pripravená', on: 'bg-orange-500 text-white border-orange-500', off: 'bg-orange-50 text-orange-700 border-orange-200' },
        { value: 'dorucena',         label: 'Doručená',   on: 'bg-blue-500 text-white border-blue-500',     off: 'bg-blue-50 text-blue-700 border-blue-200' },
      ] as const).map(s => (
        <button key={s.value} onClick={() => setFilterStatus(s.value)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
            filterStatus === s.value ? s.on : s.off
          }`}
        >{s.label}</button>
      ))}
    </div>
  </div>

  <div className="flex items-center gap-3">
    <div className="flex items-center gap-1.5">
      <Switch id="archive-toggle-mobile" checked={showArchive} onCheckedChange={setShowArchive} />
      <Label htmlFor="archive-toggle-mobile" className="text-sm cursor-pointer whitespace-nowrap">Archív</Label>
    </div>
    <div className="flex items-center gap-1.5">
      <Switch id="cancelled-toggle-mobile" checked={showCancelled} onCheckedChange={setShowCancelled} />
      <Label htmlFor="cancelled-toggle-mobile" className="text-sm cursor-pointer whitespace-nowrap">Zrušené</Label>
    </div>
  </div>
</div>
```

---

## 4. REVENUE KARTY

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
  {/* Domáci */}
  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-[#10b981]/20 hover:border-[#10b981]/40 transition-all">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#10b981] flex items-center justify-center">
          <House className="h-4 w-4 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-700 uppercase">Domáci</span>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-[#10b981]">{domaciRevenue.toFixed(2)} €</div>
        <p className="text-[10px] text-gray-500">{/* počet obj. */} obj.</p>
      </div>
    </div>
  </div>
  {/* Gastro: bg-gradient-to-br from-blue-50 to-sky-50, border-blue-500/20, bg-blue-500, text-blue-600 */}
  {/* Veľkoobchod: bg-gradient-to-br from-orange-50 to-amber-50, border-orange-500/20, bg-orange-500, text-orange-600 */}
</div>
```

---

## 5. TABUĽKA — LIST VIEW

```tsx
{effectiveViewMode === 'list' && (
  <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Zákazník</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dátum dodania</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trasa</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Celková cena</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Akcie</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredOrders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              style={{ borderLeft: `4px solid ${getStatusBorderColor(order.status)}` }}
              onClick={() => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-semibold text-sm text-gray-900">{order.customer_name || 'Bez názvu'}</div>
                      {(order as any).order_source === 'app' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <Smartphone className="w-3 h-3" />APP
                        </span>
                      )}
                      {order.customer_type === 'home' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <House className="w-3 h-3" />Domáci
                        </span>
                      )}
                      {order.customer_type === 'gastro' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          <Utensils className="w-3 h-3" />Gastro
                        </span>
                      )}
                      {order.customer_type === 'wholesale' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          <Store className="w-3 h-3" />VO
                        </span>
                      )}
                    </div>
                    {order.order_items && order.order_items.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)} položiek
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">{formatDeliveryDate(order.delivery_date)}</td>
              <td className="px-4 py-3 text-sm text-gray-700">{order.route || '-'}</td>
              <td className="px-4 py-3">
                <div className="flex items-center flex-wrap gap-2">
                  <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2 py-0.5`}>
                    {getStatusLabel(order.status)}
                  </Badge>
                  {/* RefreshCw ak recurring */}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-base font-bold text-[#10b981]">{(getOrderTotal(order) || 0).toFixed(2)} €</span>
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => duplicateOrder(order)}>
                    <Copy className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => openEdit(order)}>
                    <Pencil className="h-4 w-4 text-gray-500" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => openDeleteDialog(order.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
```

---

## 6. GRID — CARD VIEW

```tsx
{effectiveViewMode === 'grid' && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {filteredOrders.map((order) => (
      <Card
        key={order.id}
        className="p-5 hover:shadow-xl transition-all bg-white rounded-xl border border-gray-200 cursor-pointer"
        style={{ borderLeft: `4px solid ${getStatusBorderColor(order.status)}` }}
        onClick={() => { setSelectedOrderDetail(order); setDetailModalOpen(true); }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar s count badge */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#10b981] flex items-center justify-center text-white shadow-md">
                <ShoppingCart className="h-5 w-5" />
              </div>
              {order.order_items && order.order_items.length > 0 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-[#10b981] flex items-center justify-center shadow">
                  <span className="text-xs font-bold text-[#10b981]">
                    {order.order_items.reduce((sum, item) => sum + (item?.quantity || 0), 0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">{order.customer_name || 'Bez názvu'}</h3>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                <Badge className={`border ${getStatusBadgeClass(order.status)} text-xs font-semibold px-2.5 py-0.5`}>
                  {getStatusLabel(order.status)}
                </Badge>
                {(order as any).order_source === 'app' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                    <Smartphone className="w-3 h-3" />APP
                  </span>
                )}
                {order.customer_type === 'home' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <House className="w-3 h-3" />Domáci
                  </span>
                )}
                {order.customer_type === 'gastro' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <Utensils className="w-3 h-3" />Gastro
                  </span>
                )}
                {order.customer_type === 'wholesale' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                    <Store className="w-3 h-3" />VO
                  </span>
                )}
                {(order.parent_order_id || (order.is_recurring && (order.recurring_weeks || 0) > 1) || order.notes?.includes('freq:')) && (
                  <div className="flex items-center" title="Opakujúca sa objednávka">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Akcie — stopPropagation */}
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => duplicateOrder(order)}>
              <Copy className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100" onClick={() => openEdit(order)}>
              <Pencil className="h-4 w-4 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => openDeleteDialog(order.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Telo karty */}
        <div className="space-y-2.5 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span>Dodanie: {formatDeliveryDate(order.delivery_date)}</span>
          </div>
          {order.route && (
            order.route === 'Osobný odber' ? (
              <div className="flex items-center gap-2 text-green-600">
                <Store className="h-4 w-4" />
                <span className="text-sm font-medium">Osobný odber</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-600">
                <Truck className="h-4 w-4" />
                <span>Trasa: {order.route}</span>
              </div>
            )
          )}
        </div>

        {/* Cena */}
        <div className="border-t border-gray-200 pt-3">
          {/* doprava + celková cena — zachovať existujúcu logiku */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Celkom</span>
            <span className="text-xl font-bold text-[#10b981]">{(getOrderTotal(order) || 0).toFixed(2)} €</span>
          </div>
        </div>
      </Card>
    ))}
  </div>
)}
```

---

## 7. POMOCNÉ FUNKCIE (vnútri komponentu)

### getStatusBorderColor — border-left farba pre tr/Card

```typescript
const getStatusBorderColor = (status: string): string => {
  switch (status) {
    case 'growing':          return '#10b981';
    case 'packed':           return '#f59e0b';
    case 'on_the_way':       return '#0ea5e9';
    case 'pending_approval': return '#a855f7';
    case 'cakajuca':
    case 'pending':          return '#eab308';
    case 'potvrdena':
    case 'confirmed':        return '#22c55e';
    case 'pripravena':
    case 'ready':
    case 'packaging_ready':  return '#f97316';
    case 'dorucena':
    case 'delivered':        return '#3b82f6';
    case 'zrusena':
    case 'cancelled':        return '#ef4444';
    default:                 return '#e5e7eb';
  }
};
```

### STATUS_STEPS — pre stepper v detail dialógu

```typescript
const STATUS_STEPS = [
  { keys: ['cakajuca', 'pending', 'pending_approval'], label: 'Čakajúca' },
  { keys: ['potvrdena', 'confirmed'],                  label: 'Potvrdená' },
  { keys: ['growing'],                                 label: 'Rastie' },
  { keys: ['packed', 'pripravena', 'ready', 'packaging_ready'], label: 'Zabalená' },
  { keys: ['on_the_way'],                              label: 'Na ceste' },
  { keys: ['dorucena', 'delivered'],                   label: 'Doručená' },
];
```

### handleQuickStatusChange — quick action v detail dialógu

```typescript
const handleQuickStatusChange = async (orderId: string, newStatus: string) => {
  const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
  if (error) { toast({ title: 'Chyba', description: 'Nepodarilo sa zmeniť stav.', variant: 'destructive' }); return; }
  setSelectedOrderDetail(prev => prev ? { ...prev, status: newStatus } : null);
  setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  toast({ title: 'Stav zmenený', description: `Objednávka označená: ${getStatusLabel(newStatus)}.` });
};
```

---

## 8. DETAIL DIALOG — štruktúra

```tsx
<Dialog open={detailModalOpen} onOpenChange={(open) => { setDetailModalOpen(open); if (!open) setDetailActiveTab('detail'); }}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl font-bold">Detail objednávky</DialogTitle>
    </DialogHeader>
    {selectedOrderDetail && (
      <div className="space-y-4">

        {/* Tabs */}
        <div className="flex border-b border-gray-200 -mt-1">
          <button onClick={() => setDetailActiveTab('detail')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              detailActiveTab === 'detail' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>Detail</button>
          <button onClick={() => setDetailActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              detailActiveTab === 'history' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Clock className="h-3.5 w-3.5" />História
          </button>
        </div>

        {detailActiveTab === 'detail' && (
          <>
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              {/* zákazník, dátum, trasa, recurring badge */}
            </div>

            {/* Status Stepper — desktop: plný, mobile: kompaktný */}
            {/* Quick Action Buttons — primárne + Zrušiť */}
            {/* Recurring info, PWA recurring, poznámky */}
            {/* Položky objednávky */}
            {/* Cenový súhrn */}
            {/* Timestamps */}
          </>
        )}

        {detailActiveTab === 'history' && (
          <div className="py-2">
            <div className="relative pl-8">
              <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-gray-200" />
              {/* timeline udalostí: vytvorená / aktuálny stav / doručená / zrušená */}
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">
              Podrobná história zmien stavu nie je momentálne sledovaná.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Zatvoriť</Button>
          <Button className="bg-[#10b981] hover:bg-[#059669]" onClick={() => { setDetailModalOpen(false); openEdit(selectedOrderDetail); }}>
            <Pencil className="h-4 w-4 mr-2" />Upraviť
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Status Stepper JSX (v detail dialógu)

```tsx
{(() => {
  const s = selectedOrderDetail.status;
  const isCancelled = s === 'zrusena' || s === 'cancelled';
  const currentStepIdx = STATUS_STEPS.findIndex(step => step.keys.includes(s));
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      {isCancelled ? (
        <div className="flex items-center gap-2 text-red-600 justify-center py-1">
          <X className="h-5 w-5" /><span className="font-semibold">Zrušená objednávka</span>
        </div>
      ) : (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Postup objednávky</div>
          {isMobile ? (
            /* Kompaktný mobilný stepper */
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-400 w-14 text-right leading-tight">
                {currentStepIdx > 0 ? STATUS_STEPS[currentStepIdx - 1].label : ''}
              </span>
              <div className="flex flex-col items-center flex-1">
                <div className="w-10 h-10 rounded-full bg-[#10b981] border-2 border-[#10b981] shadow-md shadow-green-200 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 rounded-full bg-white" />
                </div>
                <span className="text-xs font-bold text-[#10b981] mt-1.5 text-center">{STATUS_STEPS[currentStepIdx]?.label}</span>
                <span className="text-[10px] text-gray-400">{currentStepIdx + 1} / {STATUS_STEPS.length}</span>
              </div>
              <span className="text-xs text-gray-400 w-14 leading-tight">
                {currentStepIdx < STATUS_STEPS.length - 1 ? STATUS_STEPS[currentStepIdx + 1].label : ''}
              </span>
            </div>
          ) : (
            /* Plný desktop stepper */
            <div className="flex items-start">
              {STATUS_STEPS.map((step, idx) => (
                <div key={idx} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      idx < currentStepIdx ? 'bg-[#10b981] border-[#10b981]'
                      : idx === currentStepIdx ? 'bg-[#10b981] border-[#10b981] shadow-md shadow-green-200'
                      : 'bg-white border-gray-300'
                    }`}>
                      {idx < currentStepIdx ? <Check className="h-4 w-4 text-white" />
                       : idx === currentStepIdx ? <div className="w-3 h-3 rounded-full bg-white" />
                       : null}
                    </div>
                    <span className={`text-[10px] font-medium text-center mt-1.5 leading-tight max-w-[52px] ${
                      idx === currentStepIdx ? 'text-[#10b981] font-bold'
                      : idx < currentStepIdx ? 'text-gray-500'
                      : 'text-gray-400'
                    }`}>{step.label}</span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`h-0.5 w-4 flex-shrink-0 mb-5 ${idx < currentStepIdx ? 'bg-[#10b981]' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
})()}
```

### Quick Action Buttons JSX

```tsx
{(() => {
  const s = selectedOrderDetail.status;
  if (s === 'zrusena' || s === 'cancelled' || s === 'dorucena' || s === 'delivered') return null;
  const nextMap: Record<string, { key: string; label: string; className: string }> = {
    'cakajuca':        { key: 'potvrdena',  label: 'Potvrdiť objednávku',    className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    'pending':         { key: 'potvrdena',  label: 'Potvrdiť objednávku',    className: 'bg-blue-500 hover:bg-blue-600 text-white' },
    'pending_approval':{ key: 'potvrdena',  label: 'Schváliť a potvrdiť',    className: 'bg-purple-500 hover:bg-purple-600 text-white' },
    'potvrdena':       { key: 'growing',    label: 'Označiť: Rastie',         className: 'bg-violet-500 hover:bg-violet-600 text-white' },
    'confirmed':       { key: 'growing',    label: 'Označiť: Rastie',         className: 'bg-violet-500 hover:bg-violet-600 text-white' },
    'growing':         { key: 'packed',     label: 'Označiť: Zabalená',       className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    'packed':          { key: 'on_the_way', label: 'Odoslať: Na ceste',       className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'pripravena':      { key: 'on_the_way', label: 'Odoslať: Na ceste',       className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'ready':           { key: 'on_the_way', label: 'Odoslať: Na ceste',       className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'packaging_ready': { key: 'on_the_way', label: 'Odoslať: Na ceste',       className: 'bg-sky-500 hover:bg-sky-600 text-white' },
    'on_the_way':      { key: 'dorucena',   label: '✓ Označiť ako Doručenú', className: 'bg-[#10b981] hover:bg-[#059669] text-white' },
  };
  const next = nextMap[s];
  if (!next) return null;
  return (
    <div className="flex gap-2">
      <button onClick={() => handleQuickStatusChange(selectedOrderDetail.id, next.key)}
        className={`flex-1 py-2.5 px-4 rounded-lg font-semibold text-sm transition-colors ${next.className}`}>
        {next.label}
      </button>
      <button onClick={() => handleQuickStatusChange(selectedOrderDetail.id, 'zrusena')}
        className="px-3 py-2.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors">
        Zrušiť
      </button>
    </div>
  );
})()}
```

---

## 9. KEYBOARD SHORTCUTS (useEffect)

```typescript
useEffect(() => {
  if (!detailModalOpen || !selectedOrderDetail) return;
  const handleKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'e' || e.key === 'E') { setDetailModalOpen(false); openEdit(selectedOrderDetail); }
    if ((e.key === 'd' || e.key === 'D') && selectedOrderDetail.status === 'on_the_way') {
      handleQuickStatusChange(selectedOrderDetail.id, 'dorucena');
    }
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, [detailModalOpen, selectedOrderDetail]);
```

---

## 10. STATE PREMENNÉ (pridané k existujúcim)

```typescript
const [detailActiveTab, setDetailActiveTab] = useState<'detail' | 'history'>('detail');
```

---

## E. FILTER BAR — AKTUÁLNY DIZAJN (nahrádza sekcie 2 a 3)

> Chip-based filter bar s collapse togglem. Archive/Cancelled sú v TopBar. Žiadny expandovateľný panel.

### Chip helper

```typescript
const chip = (active: boolean, activeClass: string) =>
  `inline-flex items-center gap-1.5 px-3 py-1 rounded-md border-[1.5px] text-[11px] font-medium cursor-pointer transition-colors ${
    active
      ? activeClass
      : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
  }`;
```

### State (v OrdersFilterBar — lokálne)

```typescript
const [collapsed, setCollapsed] = useState(false);
const [calendarOpen, setCalendarOpen] = useState(false);  // alebo prop z parenta
const [calendarMonth, setCalendarMonth] = useState(new Date());
```

### JSX

```tsx
{/* ─── FILTER BAR ─── */}
<div className="bg-white rounded-xl border border-[#e2e8f0] px-4 mb-4">

  {/* Collapse header */}
  <div className="flex items-center gap-2 py-2.5 cursor-pointer" onClick={() => setCollapsed(v => !v)}>
    <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
    <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Filtre</span>
    {/* active filter count badge — zobraziť len ak collapsed && niečo aktívne */}
    {collapsed && activeCount > 0 && (
      <span className="ml-1 bg-[#16a34a] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{activeCount}</span>
    )}
  </div>

  {!collapsed && (
    <div className="space-y-0 border-t border-[#f8fafc]">

      {/* Riadok 1: Typ zákazníka + zákazník selector */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider min-w-[80px] shrink-0">Zákazník</span>
        <button onClick={() => onFilterCustomerTypeChange('all')} className={chip(filterCustomerType === 'all', 'bg-[#16a34a] border-[#16a34a] text-white')}>Všetci</button>
        <button onClick={() => onFilterCustomerTypeChange('home')} className={chip(filterCustomerType === 'home', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <House className="w-3 h-3" />Domáci
        </button>
        <button onClick={() => onFilterCustomerTypeChange('gastro')} className={chip(filterCustomerType === 'gastro', 'bg-[#eff6ff] border-[#2563eb] text-[#2563eb]')}>
          <Utensils className="w-3 h-3" />Gastro
        </button>
        <button onClick={() => onFilterCustomerTypeChange('wholesale')} className={chip(filterCustomerType === 'wholesale', 'bg-[#fff7ed] border-[#d97706] text-[#d97706]')}>
          <Store className="w-3 h-3" />VO
        </button>
        <div className="ml-1 w-[220px]">
          <SearchableCustomerSelect
            value={customerFilter}
            onValueChange={onCustomerFilterChange}
            customers={filteredCustomers}
            placeholder="Hľadať zákazníka..."
            allowAll={true}
          />
        </div>
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 2: Kategória chips + plodina selector */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider min-w-[80px] shrink-0">Kategória</span>
        <button onClick={() => onOrderCategoryFilterChange('all')} className={chip(orderCategoryFilter === 'all', 'bg-[#16a34a] border-[#16a34a] text-white')}>Všetky</button>
        <button onClick={() => onOrderCategoryFilterChange('microgreens')} className={chip(orderCategoryFilter === 'microgreens', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Leaf className="w-3 h-3" />Mikrozelenina
        </button>
        <button onClick={() => onOrderCategoryFilterChange('microherbs')} className={chip(orderCategoryFilter === 'microherbs', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Sprout className="w-3 h-3" />Mikrobylinky
        </button>
        <button onClick={() => onOrderCategoryFilterChange('edible_flowers')} className={chip(orderCategoryFilter === 'edible_flowers', 'bg-[#fdf4ff] border-[#a855f7] text-[#a855f7]')}>
          <Flower className="w-3 h-3" />Jedlé kvety
        </button>
        <button onClick={() => onOrderCategoryFilterChange('mix')} className={chip(orderCategoryFilter === 'mix', 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]')}>
          <Palette className="w-3 h-3" />Mixy
        </button>
        <div className="ml-1">
          <Select value={filterCrop} onValueChange={onFilterCropChange}>
            <SelectTrigger className="h-7 text-xs w-[140px] border-[#e2e8f0]">
              <SelectValue placeholder="Plodina" />
            </SelectTrigger>
            <SelectContent className="max-h-[260px] overflow-y-auto z-[100]">
              <SelectItem value="all">Všetky plodiny</SelectItem>
              {/* dynamic crop/blend list */}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 3: Stav chips */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider min-w-[80px] shrink-0">Stav</span>
        {([
          { v: 'all',              l: 'Všetky',     a: 'bg-[#16a34a] border-[#16a34a] text-white' },
          { v: 'growing',          l: 'Rastie',      a: 'bg-[#dcfce7] border-[#16a34a] text-[#166534]' },
          { v: 'packed',           l: 'Zabalená',    a: 'bg-[#dbeafe] border-[#2563eb] text-[#1e40af]' },
          { v: 'on_the_way',       l: 'Na ceste',    a: 'bg-[#ede9fe] border-[#7c3aed] text-[#5b21b6]' },
          { v: 'cakajuca',         l: 'Čakajúca',    a: 'bg-[#fef3c7] border-[#d97706] text-[#92400e]' },
          { v: 'pending_approval', l: 'Čaká schv.',  a: 'bg-[#fef3c7] border-[#d97706] text-[#92400e]' },
          { v: 'potvrdena',        l: 'Potvrdená',   a: 'bg-[#f0fdf4] border-[#16a34a] text-[#16a34a]' },
          { v: 'dorucena',         l: 'Doručená',    a: 'bg-[#d1fae5] border-[#059669] text-[#064e3b]' },
          { v: 'zrusena',          l: 'Zrušená',     a: 'bg-[#f8fafc] border-[#94a3b8] text-[#64748b]' },
        ] as const).map(s => (
          <button key={s.v} onClick={() => onFilterStatusChange(s.v)} className={chip(filterStatus === s.v, s.a)}>{s.l}</button>
        ))}
      </div>

      <div className="border-t border-[#f8fafc]" />

      {/* Riadok 4: Dátum/Obdobie chips + calendar */}
      <div className="flex items-center gap-2 flex-wrap py-2">
        <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider min-w-[80px] shrink-0">Dátum</span>
        {([
          { v: 'all',          l: 'Všetky' },
          { v: 'this_week',    l: 'Tento týždeň' },
          { v: 'next_week',    l: 'Budúci týždeň' },
          { v: 'last_week',    l: 'Minulý týždeň' },
          { v: 'last_2_weeks', l: 'Posl. 2 týždne' },
          { v: 'last_month',   l: 'Tento mesiac' },
        ] as const).map(p => (
          <button key={p.v} onClick={() => onFilterPeriodChange(p.v)} className={chip(filterPeriod === p.v, 'bg-[#16a34a] border-[#16a34a] text-white')}>{p.l}</button>
        ))}
        <Popover open={calendarOpen} onOpenChange={onCalendarOpenChange}>
          <PopoverTrigger asChild>
            <button className={chip(selectedDates.length > 0, 'bg-[#16a34a] border-[#16a34a] text-white')}>
              <CalendarIcon className="w-3 h-3" />
              {selectedDates.length > 0 ? `${selectedDates.length} dní` : 'Vybrať...'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">{renderCalendar()}</PopoverContent>
        </Popover>
      </div>

    </div>
  )}
</div>
```

### TopBar — Archive + Cancelled (pridané do OrdersTopBar)

```tsx
{/* Archive + Cancelled — v OrdersTopBar napravo od iných tlačidiel */}
<div className="flex items-center gap-3 border-l border-[#e2e8f0] pl-3 ml-1">
  <div className="flex items-center gap-1.5">
    <Switch id="topbar-archive" checked={showArchive} onCheckedChange={onShowArchiveChange} />
    <Label htmlFor="topbar-archive" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Archív</Label>
  </div>
  <div className="flex items-center gap-1.5">
    <Switch id="topbar-cancelled" checked={showCancelled} onCheckedChange={onShowCancelledChange} />
    <Label htmlFor="topbar-cancelled" className="text-xs text-[#374151] cursor-pointer whitespace-nowrap">Zrušené</Label>
  </div>
</div>
```

### Props zmeny

| Komponent | Pridané | Odstránené |
|---|---|---|
| `OrdersTopBar` | `showArchive`, `onShowArchiveChange`, `showCancelled`, `onShowCancelledChange` | — |
| `OrdersFilterBar` | — | `showArchive`, `onShowArchiveChange`, `showCancelled`, `onShowCancelledChange`, expandovateľný panel |

---

## 11. COMMITY

| Hash | Obsah |
|---|---|
| `ec1f9f7` | Detail dialog: tabs, stepper, quick actions, história |
| `1a23656` | Karty + tabuľka: border-left, customer type chipy, keyboard shortcuts, mobilný stepper |
| `aaa5e09` | Topbar compact, filter chipy (status + period), mobile scrollable chips |
