const ProductCatalog = ({ catalog, setCatalog, currentData, dataSets, selectedLocation, categories, customAlert }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Form state
    const [form, setForm] = useState({ name: '', code: '', category: categories.length > 0 ? categories[0].id : '', unitValues: { Matriz: 0, Mucambo: 0, Frecheirinha: 0, Tianguá: 0 } });

    const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'asc' });

    // Helper to get current stock for selected location
    const currentStockMap = useMemo(() => {
        const allDates = window.getDatesForLocation(selectedLocation, dataSets);
        if (allDates.length === 0) return {};
        
        // Sort dates to get the most recent
        allDates.sort((a, b) => {
            const [d1, m1] = a.split('/').map(Number);
            const [d2, m2] = b.split('/').map(Number);
            return new Date(2026, m1-1, d1) - new Date(2026, m2-1, d2);
        });
        
        const latestDate = allDates[allDates.length - 1];
        const latestKey = window.getDatasetKey(selectedLocation, latestDate);
        const latestData = dataSets[latestKey];
        if (!latestData) return {};

        const stockMap = {};
        categories.forEach(cat => {
            if (latestData[cat.id]) {
                latestData[cat.id].forEach(item => {
                    const total = (item.l1 || 0) + (item.l2 || 0) + (item.l3 || 0) + (item.l4 || 0) + (item.qtd || 0);
                    stockMap[item.nome] = total;
                });
            }
        });
        return stockMap;
    }, [dataSets, selectedLocation, categories]);

    const handleSort = (key) => {
        if (sortConfig.key === key) {
            if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
            else setSortConfig({ key: 'nome', direction: 'asc' });
        } else {
            setSortConfig({ key, direction: 'asc' });
        }
    };

    const activeProducts = Object.values(catalog).filter(p => p.active);
    if (sortConfig.key) {
        activeProducts.sort((a, b) => {
            if (sortConfig.key === 'code') {
                const aVal = parseInt(a.code) || 0;
                const bVal = parseInt(b.code) || 0;
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            }
        });
    }

    const handleSave = () => {
        if (!form.name.trim()) return customAlert("Nome do produto é obrigatório.");
        
        const newCatalog = { ...catalog };
        
        // If editing and name changed, we need to handle it carefully to not break past links
        // Actually, renaming is dangerous, but we allow it if it's a new product or we delete the old
        if (editingItem && editingItem.name !== form.name) {
             // We keep the old item but deactivate it, then create new
             newCatalog[editingItem.name] = { ...editingItem, active: false };
             newCatalog[form.name] = { ...form, active: true };
        } else {
             newCatalog[form.name] = { ...form, active: true };
        }

        setCatalog(newCatalog);
        setIsAdding(false);
        setEditingItem(null);
        setForm({ name: '', code: '', category: 'aguas', unitValues: { Matriz: 0, Mucambo: 0, Frecheirinha: 0, Tianguá: 0 } });
    };

    const handleDelete = (name) => {
        if (confirm(`Você tem certeza que deseja excluir "${name}"? Ele será ocultado de novas contagens, mas permanecerá no histórico.`)) {
            const newCatalog = { ...catalog };
            newCatalog[name] = { ...newCatalog[name], active: false };
            setCatalog(newCatalog);
        }
    };

    const openEdit = (product) => {
        setEditingItem(product);
        setForm({ 
            ...product, 
            unitValues: product.unitValues || { 
                Matriz: product.unitValue || 0, 
                Mucambo: product.unitValue || 0, 
                Frecheirinha: product.unitValue || 0,
                Tianguá: product.unitValue || 0 
            } 
        });
        setIsAdding(true);
    };

    const handleExport = () => {
        const rows = activeProducts.map(p => {
            const cat = categories.find(c => c.id === p.category);
            return {
                Código: p.code,
                Produto: p.name.toUpperCase(),
                Categoria: cat ? cat.name.toUpperCase() : "DESCONHECIDA",
                Valor_Matriz: p.unitValues?.Matriz || p.unitValue || 0,
                Valor_Mucambo: p.unitValues?.Mucambo || p.unitValue || 0,
                Valor_Frecheirinha: p.unitValues?.Frecheirinha || p.unitValue || 0,
                Valor_Tianguá: p.unitValues?.Tianguá || p.unitValue || 0
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
        XLSX.writeFile(workbook, `Catalogo_Produtos_${selectedLocation}.xlsx`);
    };

    const fileInputRef = useRef(null);
    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const newCatalog = { ...catalog };
                let imported = 0;

                const importedNames = data.filter(r => r.Produto).map(r => r.Produto.toString().trim());
                const currentActive = Object.values(catalog).filter(p => p.active).map(p => p.name);
                
                const missing = currentActive.filter(name => !importedNames.some(imported => imported.toUpperCase() === name.toUpperCase()));
                
                if (missing.length > 0) {
                    const confirmed = window.confirm(`Atenção: A planilha importada NÃO contém ${missing.length} produto(s) que estão atualmente no site (ex: ${missing.slice(0, 3).join(', ')}...). \n\nDeseja desativá-los das novas contagens? (Continuarão no histórico antigo). \n\nClique em OK para desativá-los e continuar, ou CANCELAR para abortar a importação.`);
                    if (!confirmed) {
                        e.target.value = null;
                        return;
                    }
                    missing.forEach(name => {
                        newCatalog[name] = { ...newCatalog[name], active: false };
                    });
                }

                data.forEach(row => {
                    if (row.Produto) {
                        const excelName = row.Produto.toString().trim();
                        const existingKey = Object.keys(catalog).find(k => k.toUpperCase() === excelName.toUpperCase());
                        const finalName = existingKey || excelName;

                        let catKey = categories.length > 0 ? categories[0].id : "aguas";
                        if (row.Categoria) {
                            const catStr = row.Categoria.toString().trim().toUpperCase();
                            const matchedCat = categories.find(c => (c.name || '').toUpperCase() === catStr || (c.id || '').toUpperCase() === catStr);
                            catKey = matchedCat ? matchedCat.id : row.Categoria;
                        }

                        newCatalog[finalName] = {
                            name: finalName,
                            code: row.Código || "",
                            category: catKey,
                            unitValues: {
                                Matriz: parseFloat(row.Valor_Matriz) || parseFloat(row.ValorUnitario) || 0,
                                Mucambo: parseFloat(row.Valor_Mucambo) || parseFloat(row.ValorUnitario) || 0,
                                Frecheirinha: parseFloat(row.Valor_Frecheirinha) || parseFloat(row.ValorUnitario) || 0,
                                Tianguá: parseFloat(row.Valor_Tianguá) || parseFloat(row.ValorUnitario) || 0
                            },
                            active: true
                        };
                        imported++;
                    }
                });

                setCatalog(newCatalog);
                customAlert(`${imported} produtos importados/atualizados com sucesso!${missing.length > 0 ? ` E ${missing.length} produto(s) foram desativado(s).` : ''}`);
            } catch (error) {
                console.error(error);
                customAlert("Erro ao importar a planilha. Verifique o formato.");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null; // reset
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-[#00a86b]" /> Produtos do Estoque
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Gerencie códigos e valores para os produtos. O estoque atual baseia-se na última contagem da loja: <b>{selectedLocation}</b>.
                    </p>
                </div>
                
                <div className="flex items-center gap-2">
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleImport} style={{ display: 'none' }} />
                    <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-all shadow-sm border border-slate-200" title="Importar Catálogo">
                        <Upload size={16} /> <span className="hidden sm:inline">Importar</span>
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-all shadow-sm border border-slate-200" title="Baixar Catálogo">
                        <FileDown size={16} /> <span className="hidden sm:inline">Exportar</span>
                    </button>
                    <button onClick={() => { setIsAdding(true); setEditingItem(null); setForm({ name: '', code: '', category: 'aguas', unitValues: { Matriz: 0, Mucambo: 0, Frecheirinha: 0, Tianguá: 0 } }); }} className="flex items-center gap-2 bg-[#00a86b] hover:bg-[#00905a] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ml-2">
                        <Plus size={16} /> <span className="hidden sm:inline">Novo Produto</span>
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Package className="text-[#00a86b]" />
                                {editingItem ? "Editar Produto" : "Novo Produto"}
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Código</label>
                                    <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-[#00a86b] focus:border-[#00a86b] text-sm" placeholder="Ex: 1001" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Produto</label>
                                    <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-[#00a86b] focus:border-[#00a86b] text-sm" placeholder="Ex: ÁGUA COM GÁS 500ML" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Categoria</label>
                                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-[#00a86b] focus:border-[#00a86b] text-sm">
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 border-t border-slate-200 pt-4">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preços por Loja (R$)</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {['Matriz', 'Mucambo', 'Frecheirinha', 'Tianguá'].map(loc => (
                                        <div key={loc}>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">{loc}</label>
                                            <input type="number" step="0.01" value={form.unitValues?.[loc] || 0} onChange={e => setForm({...form, unitValues: {...form.unitValues, [loc]: parseFloat(e.target.value) || 0}})} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-[#00a86b] focus:border-[#00a86b] text-sm" placeholder="0.00" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setIsAdding(false)} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={handleSave} className="px-5 py-2.5 text-sm font-bold text-white bg-[#00a86b] hover:bg-[#00905a] rounded-lg shadow-sm transition-colors">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto p-4 md:p-6">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th onClick={() => handleSort('code')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors">Código {sortConfig.key === 'code' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th onClick={() => handleSort('nome')} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-colors">Produto {sortConfig.key === 'nome' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque Atual</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Unit.</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Total</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {categories.map((cat) => {
                            const catProducts = activeProducts.filter(p => p.category === cat.id);
                            if (catProducts.length === 0) return null;
                            return (
                                <React.Fragment key={cat.id}>
                                    <tr className="bg-slate-100/50">
                                        <td colSpan="6" className="px-4 py-3 text-sm font-bold text-slate-700 uppercase tracking-wider bg-slate-100 border-y border-slate-200">
                                            {cat.name}
                                        </td>
                                    </tr>
                                    {catProducts.map((p, idx) => {
                                        const estoque = currentStockMap[p.name] || 0;
                                        const currentPrice = p.unitValues?.[selectedLocation] || p.unitValue || 0;
                                        const totalVal = estoque * currentPrice;
                                        return (
                                            <tr key={`${cat.id}-${idx}`} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-sm font-medium text-slate-600">{p.code || '-'}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-slate-800">{p.name.toUpperCase()}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-[#00a86b] text-right">{estoque.toLocaleString('pt-BR')}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600 text-right">R$ {currentPrice.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">R$ {totalVal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className="px-4 py-3 text-sm text-center space-x-2">
                                                    <button onClick={() => openEdit(p)} className="text-[#00a86b] hover:text-[#00905a] text-xs font-semibold px-2 py-1 bg-green-50 rounded">Editar</button>
                                                    <button onClick={() => handleDelete(p.name)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 bg-red-50 rounded">Excluir</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                        {activeProducts.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-4 py-8 text-center text-slate-500 text-sm">Nenhum produto cadastrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

window.ProductCatalog = ProductCatalog;
