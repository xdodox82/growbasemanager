// WizardStep2 — náhrada za starý formulár v OrdersPage.tsx
// Vlož toto namiesto bloku: {wizardStep === 2 && ( ... )}

// IMPORT PRIDAJ na začiatok OrdersPage.tsx (ak ešte nie je):
// import { Minus } from 'lucide-react';

{wizardStep === 2 && (
  <div className="space-y-4">

    {/* Kategória chips */}
    <div>
      <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-2 block">Kategória plodiny</label>
      <div className="flex flex-wrap gap-1.5">
        {[
          { v: '', l: 'Všetky' },
          { v: 'microgreens', l: 'Mikrozelenia' },
          { v: 'microherbs', l: 'Mikrobylinky' },
          { v: 'edible_flowers', l: 'Jedlé kvety' },
          { v: 'mix', l: 'Mixy' },
        ].map(cat => (
          <button
            key={cat.v}
            type="button"
            onClick={() => setCategoryFilter(cat.v)}
            className={`px-3 py-1 rounded-md border-[1.5px] text-[11px] font-medium transition-colors ${
              categoryFilter === cat.v
                ? 'bg-[#16a34a] border-[#16a34a] text-white'
                : 'border-[#e2e8f0] text-[#374151] bg-white hover:border-[#bbf7d0] hover:text-[#16a34a] hover:bg-[#f0fdf4]'
            }`}
          >{cat.l}</button>
        ))}
      </div>
    </div>

    {/* Zoznam pridaných položiek */}
    {(orderItems || []).length > 0 && (
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-[#fafafa] border-b border-[#f1f5f9]">
          <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">
            Pridané položky ({orderItems.length})
          </span>
        </div>
        <div className="divide-y divide-[#f8fafc]">
          {orderItems.map((item, idx) => {
            if (!item) return null;
            const itemTotal = (item.quantity || 0) * (parseFloat(String(item.price_per_unit || '0').replace(',', '.')) || 0);
            return (
              <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#fafafa]">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#0f172a]">{item.crop_name}</div>
                  <div className="text-[11px] text-[#64748b] mt-0.5">
                    {item.quantity} × {item.packaging_size} · {item.packaging_volume_ml}ml {item.packaging_type}
                    {item.has_label ? ' · Etiketa' : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[13px] font-bold text-[#0f172a]">{itemTotal.toFixed(2)} €</div>
                  <div className="text-[11px] text-[#94a3b8]">{parseFloat(String(item.price_per_unit || '0')).toFixed(2)} € / ks</div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md border border-[#e2e8f0] bg-white flex items-center justify-center text-[#64748b] hover:bg-[#eff6ff] hover:border-[#bfdbfe] hover:text-[#2563eb] transition-colors"
                    onClick={() => {
                      let ps = String(item?.packaging_size || '');
                      if (ps && !ps.includes('g') && !ps.includes('kg') && !isNaN(Number(ps))) ps += 'g';
                      setCurrentItem({ ...item, packaging_size: ps, quantity: Number(item.quantity || 1), price_per_unit: item.price_per_unit?.toString() || '' });
                      removeItem(idx);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#dc2626] hover:text-white transition-colors"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Pridať novú položku */}
    <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-[#f0fdf4] border-b border-[#bbf7d0]">
        <span className="text-[10px] font-semibold text-[#16a34a] uppercase tracking-wider">
          {currentItem.crop_name ? `Pridávam: ${currentItem.crop_name}` : 'Pridať položku'}
        </span>
      </div>
      <div className="p-4 space-y-3">

        {/* Špeciálna položka toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="special-item-wiz"
            checked={currentItem?.is_special_item || false}
            onChange={(e) => {
              setCurrentItem(prev => ({ ...prev, is_special_item: e.target.checked }));
              if (e.target.checked) setIsPriceConfigured(true);
            }}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="special-item-wiz" className="text-[12px] text-[#374151] cursor-pointer">
            Špeciálna položka (manuálne zadanie)
          </label>
        </div>

        {/* Plodina + Gramáž v jednom riadku */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">
              Plodina / Mix *
            </label>
            <Select
              value={currentItem?.crop_id ? `crop:${currentItem.crop_id}` : currentItem?.blend_id ? `blend:${currentItem.blend_id}` : ''}
              onValueChange={async (value) => {
                const [type, id] = value.split(':');
                if (type === 'crop') {
                  const sel = crops?.find(c => c.id === id);
                  setCurrentItem(prev => ({ ...prev, crop_id: id, blend_id: undefined, crop_name: sel?.name || '' }));
                  if (currentItem?.packaging_size && customerType) {
                    const [price, pkg] = await Promise.all([
                      autoFetchPrice(currentItem.packaging_size, customerType, id, undefined),
                      autoFetchPackaging(currentItem.packaging_size, id, undefined)
                    ]);
                    setIsPriceConfigured(price > 0);
                    setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                  }
                } else {
                  const sel = blends?.find(b => b.id === id);
                  setCurrentItem(prev => ({ ...prev, blend_id: id, crop_id: undefined, crop_name: sel?.name || '' }));
                  if (currentItem?.packaging_size && customerType) {
                    const [price, pkg] = await Promise.all([
                      autoFetchPrice(currentItem.packaging_size, customerType, undefined, id),
                      autoFetchPackaging(currentItem.packaging_size, undefined, id)
                    ]);
                    setIsPriceConfigured(price > 0);
                    setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                  }
                }
              }}
            >
              <SelectTrigger className="h-9 bg-white border-[#e2e8f0] text-[13px]">
                <SelectValue placeholder="Vyber plodinu..." />
              </SelectTrigger>
              <SelectContent className="bg-white z-[9999]">
                {filteredCropsByCategory.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Plodiny</SelectLabel>
                    {filteredCropsByCategory.map(c => <SelectItem key={c.id} value={`crop:${c.id}`}>{c.name}</SelectItem>)}
                  </SelectGroup>
                )}
                {filteredBlendsByCategory.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Mixy</SelectLabel>
                    {filteredBlendsByCategory.map(b => <SelectItem key={b.id} value={`blend:${b.id}`}>{b.name}</SelectItem>)}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">
              Gramáž *
            </label>
            {currentItem?.is_special_item ? (
              <Input
                placeholder="napr. 30g"
                value={currentItem?.packaging_size || ''}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, packaging_size: e.target.value }))}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v && !v.endsWith('g') && !isNaN(Number(v)))
                    setCurrentItem(prev => ({ ...prev, packaging_size: v + 'g' }));
                }}
                className="h-9 bg-white border-[#e2e8f0] text-[13px]"
              />
            ) : (
              <Select
                value={currentItem?.packaging_size || ''}
                onValueChange={async (value) => {
                  setCurrentItem(prev => ({ ...prev, packaging_size: value }));
                  if ((currentItem?.crop_id || currentItem?.blend_id) && customerType) {
                    const [price, pkg] = await Promise.all([
                      autoFetchPrice(value, customerType, currentItem.crop_id, currentItem.blend_id),
                      autoFetchPackaging(value, currentItem.crop_id, currentItem.blend_id)
                    ]);
                    setIsPriceConfigured(price > 0);
                    setCurrentItem(prev => ({ ...prev, price_per_unit: price > 0 ? price.toString() : '', packaging_volume_ml: pkg?.packaging_volume_ml || prev.packaging_volume_ml, packaging_id: pkg?.packaging_id || prev.packaging_id }));
                  }
                }}
              >
                <SelectTrigger className="h-9 bg-white border-[#e2e8f0] text-[13px]">
                  <SelectValue placeholder="Gramáž" />
                </SelectTrigger>
                <SelectContent className="bg-white z-[9999]">
                  {['25g','50g','60g','70g','100g','120g','150g'].map(w => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Počet kusov + Obal (auto) + Cena */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">
              Počet ks *
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-9 h-9 rounded-md border border-[#e2e8f0] bg-white flex items-center justify-center text-[#374151] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors font-bold text-lg"
                onClick={() => setCurrentItem(prev => ({ ...prev, quantity: Math.max(1, (Number(prev.quantity) || 1) - 1) }))}
              >−</button>
              <input
                type="number"
                value={currentItem?.quantity || 1}
                onChange={(e) => {
                  const v = e.target.value;
                  setCurrentItem(prev => ({ ...prev, quantity: v === '' ? '' : (parseInt(v) || 1) }));
                }}
                onBlur={(e) => {
                  if (!e.target.value || parseInt(e.target.value) < 1)
                    setCurrentItem(prev => ({ ...prev, quantity: 1 }));
                }}
                className="w-12 h-9 text-center border border-[#e2e8f0] rounded-md text-[13px] font-semibold text-[#0f172a] bg-white"
              />
              <button
                type="button"
                className="w-9 h-9 rounded-md border border-[#e2e8f0] bg-white flex items-center justify-center text-[#374151] hover:border-[#16a34a] hover:text-[#16a34a] transition-colors font-bold text-lg"
                onClick={() => setCurrentItem(prev => ({ ...prev, quantity: (Number(prev.quantity) || 1) + 1 }))}
              >+</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">
              Obal (auto)
            </label>
            <div className="h-9 px-3 border border-[#e2e8f0] rounded-md bg-[#f8fafc] flex items-center text-[13px] text-[#64748b]">
              {currentItem?.packaging_volume_ml ? `${currentItem.packaging_volume_ml}ml ${currentItem?.packaging_type || 'rPET'}` : 'auto'}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">
              Cena / ks (€)
            </label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder={!isPriceConfigured && !currentItem.is_special_item ? 'Chýba cena' : '0.00'}
              value={currentItem.price_per_unit || ''}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, price_per_unit: e.target.value }))}
              disabled={!isPriceConfigured && !currentItem.is_special_item}
              className="h-9 border-[#e2e8f0] text-[13px] disabled:bg-[#f8fafc] disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Sekundárne polia v rozbaľovacom riadku */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Forma</label>
            <select
              value={currentItem?.delivery_form || 'rezana'}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, delivery_form: e.target.value }))}
              className="w-full h-9 px-3 border border-[#e2e8f0] rounded-md text-[13px] bg-white text-[#374151]"
            >
              <option value="rezana">Zrezaná</option>
              <option value="ziva">Živá</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-1.5 block">Typ obalu</label>
            <select
              value={currentItem?.packaging_type || 'rPET'}
              onChange={(e) => setCurrentItem(prev => ({ ...prev, packaging_type: e.target.value }))}
              className="w-full h-9 px-3 border border-[#e2e8f0] rounded-md text-[13px] bg-white text-[#374151]"
            >
              <option value="rPET">rPET</option>
              <option value="PET">PET</option>
              <option value="EKO">EKO</option>
              <option value="Vratný obal">Vratný obal</option>
            </select>
          </div>
          <div className="flex items-end pb-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has_label_wiz"
                checked={currentItem?.has_label || false}
                onChange={(e) => setCurrentItem(prev => ({ ...prev, has_label: e.target.checked }))}
                className="h-4 w-4 rounded border-[#cbd5e1]"
              />
              <label htmlFor="has_label_wiz" className="text-[12px] text-[#374151] cursor-pointer">Etiketa</label>
            </div>
          </div>
        </div>

        {/* Cena celkom preview */}
        {currentItem.crop_name && currentItem.packaging_size && currentItem.price_per_unit && (
          <div className="flex items-center justify-between px-3 py-2 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
            <span className="text-[12px] text-[#166534]">
              {currentItem.quantity || 1} × {currentItem.crop_name} {currentItem.packaging_size}
            </span>
            <span className="text-[13px] font-bold text-[#16a34a]">
              {((Number(currentItem.quantity) || 1) * (parseFloat(String(currentItem.price_per_unit || '0').replace(',', '.')) || 0)).toFixed(2)} €
            </span>
          </div>
        )}

        {/* Tlačidlo pridať */}
        <button
          type="button"
          onClick={addItemToList}
          className="w-full h-10 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Pridať do objednávky
        </button>
      </div>
    </div>

    {/* Medzisúčet */}
    {(orderItems || []).length > 0 && (
      <div className="flex items-center justify-between px-4 py-3 bg-white border border-[#e2e8f0] rounded-xl">
        <span className="text-[12px] font-semibold text-[#374151]">
          Medzisúčet · {orderItems.reduce((s, i) => s + (i?.quantity || 0), 0)} ks
        </span>
        <span className="text-[15px] font-bold text-[#0f172a]">
          {orderItems.reduce((s, i) => s + ((i?.quantity || 0) * (parseFloat(String(i?.price_per_unit || '0').replace(',', '.')) || 0)), 0).toFixed(2)} €
        </span>
      </div>
    )}
  </div>
)}
