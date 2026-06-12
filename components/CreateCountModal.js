        const CreateCountModal = ({ isOpen, onClose, onCreate, productCatalog = {}, categories = [], dynamicMasterList = {} }) => {
            const [date, setDate] = useState('');
            const [time, setTime] = useState('');
            const [responsible, setResponsible] = useState('');
            const [countType, setCountType] = useState('semanal'); // 'semanal' | 'diaria'
            const [searchQuery, setSearchQuery] = useState('');
            const [selectedProducts, setSelectedProducts] = useState([]);
            const [showConfirm, setShowConfirm] = useState(false);

            useEffect(() => {
                if(isOpen) {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, '0');
                    const d = String(now.getDate()).padStart(2, '0');
                    setDate(`${y}-${m}-${d}`);
                    setTime(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
                    setResponsible('');
                    setCountType('semanal');
                    setSearchQuery('');
                    setSelectedProducts([]);
                    setShowConfirm(false);
                }
            }, [isOpen]);

            if (!isOpen) return null;

            // Build full product list from master list
            const allProducts = [];
            categories.forEach(cat => {
                const list = dynamicMasterList[cat.id] || [];
                list.forEach(productName => {
                    allProducts.push({ name: productName, category: cat.name, catId: cat.id });
                });
            });

            const filteredProducts = searchQuery.trim()
                ? allProducts.filter(p =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    String(productCatalog[p.name]?.code ?? '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                : allProducts;

            const toggleProduct = (productName) => {
                setSelectedProducts(prev =>
                    prev.includes(productName)
                        ? prev.filter(p => p !== productName)
                        : [...prev, productName]
                );
            };

            const selectAll = () => {
                const visible = filteredProducts.map(p => p.name);
                setSelectedProducts(prev => {
                    const notYetSelected = visible.filter(n => !prev.includes(n));
                    return [...prev, ...notYetSelected];
                });
            };
            const clearAll = () => setSelectedProducts([]);

            const getFinalDate = () => {
                if (date && date.includes('-')) {
                    const parts = date.split('-');
                    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
                }
                return date;
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (countType === 'diaria' && selectedProducts.length === 0) {
                    alert('Selecione ao menos um produto para a contagem diária.');
                    return;
                }
                if (countType === 'diaria') {
                    setShowConfirm(true);
                    return;
                }
                onCreate(getFinalDate(), time, responsible, countType, selectedProducts);
                onClose();
            };

            const handleConfirm = () => {
                onCreate(getFinalDate(), time, responsible, countType, selectedProducts);
                onClose();
            };

            // Group selected products by category for confirmation screen
            const groupedSelected = {};
            categories.forEach(cat => {
                const catProducts = selectedProducts.filter(p => (dynamicMasterList[cat.id] || []).includes(p));
                if (catProducts.length > 0) {
                    groupedSelected[cat.id] = { name: cat.name, products: catProducts };
                }
            });

            // Group filtered products by category for display
            const groupedFiltered = {};
            filteredProducts.forEach(p => {
                if (!groupedFiltered[p.catId]) groupedFiltered[p.catId] = { name: p.category, products: [] };
                groupedFiltered[p.catId].products.push(p.name);
            });

            return (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">

                    {/* ── CONFIRMATION SCREEN ── */}
                    {showConfirm ? (
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <Calendar size={20} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">Confirmar Contagem Diária</h2>
                                        <p className="text-xs text-slate-500">Revise os detalhes antes de criar</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary info */}
                            <div className="px-6 pt-4 pb-2 shrink-0">
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Data</p>
                                        <p className="font-bold text-slate-800 text-sm">{getFinalDate()}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Responsável</p>
                                        <p className="font-bold text-slate-800 text-sm truncate">{responsible}</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-center">
                                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1">Produtos</p>
                                        <p className="font-bold text-blue-700 text-lg">{selectedProducts.length}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Product list by category */}
                            <div className="px-6 pb-2 overflow-y-auto flex-1">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Produtos selecionados</p>
                                <div className="space-y-3">
                                    {Object.entries(groupedSelected).map(([catId, catData]) => (
                                        <div key={catId} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{catData.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full">{catData.products.length}</span>
                                            </div>
                                            <div className="px-3 py-2 flex flex-wrap gap-1.5">
                                                {catData.products.map(p => {
                                                    const code = productCatalog[p]?.code;
                                                    return (
                                                        <span key={p} className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-xs font-medium px-2 py-1 rounded-lg border border-blue-100">
                                                            {code && <span className="text-blue-400 font-mono text-[10px]">{code}</span>}
                                                            {p}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 pt-4 border-t border-slate-100 shrink-0 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(false)}
                                    className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    ← Voltar e editar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    className="px-5 py-2.5 text-white rounded-xl font-bold shadow-sm bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 transition-all"
                                >
                                    ✓ Confirmar e Criar
                                </button>
                            </div>
                        </div>
                    ) : (

                    <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden ${countType === 'diaria' ? 'max-w-2xl' : 'max-w-md'}`}>
                        {/* Header */}
                        <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                                <Plus size={24} className="text-[#00a86b]"/> Nova Contagem
                            </h2>

                            {/* Type Selector */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCountType('semanal')}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${countType === 'semanal' ? 'border-[#00a86b] bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <ClipboardList size={18} className={countType === 'semanal' ? 'text-[#00a86b]' : 'text-slate-400'} />
                                        <span className={`font-bold text-sm ${countType === 'semanal' ? 'text-[#00a86b]' : 'text-slate-700'}`}>Contagem Semanal</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Todos os produtos do estoque</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCountType('diaria')}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${countType === 'diaria' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={18} className={countType === 'diaria' ? 'text-blue-600' : 'text-slate-400'} />
                                        <span className={`font-bold text-sm ${countType === 'diaria' ? 'text-blue-600' : 'text-slate-700'}`}>Contagem Diária</span>
                                    </div>
                                    <p className="text-xs text-slate-500">Produtos selecionados do dia</p>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="overflow-y-auto flex-1 p-6 pt-4">
                            <form id="create-count-form" onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data</label>
                                        <input type="date" required className="block w-full rounded-xl border border-gray-200 shadow-sm focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] p-2.5 text-sm bg-slate-50" value={date} onChange={(e) => setDate(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Horário</label>
                                        <input type="time" required className="block w-full rounded-xl border border-gray-200 shadow-sm focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] p-2.5 text-sm bg-slate-50" value={time} onChange={(e) => setTime(e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Responsável</label>
                                    <input type="text" required placeholder="Nome de quem vai contar" className="block w-full rounded-xl border border-gray-200 shadow-sm focus:border-[#00a86b] focus:ring-1 focus:ring-[#00a86b] p-2.5 text-sm bg-slate-50" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
                                </div>

                                {/* Product selector for daily count */}
                                {countType === 'diaria' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Produtos a Contar ({selectedProducts.length} selecionados)</label>

                                        {/* Search bar */}
                                        <div className="relative mb-2">
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome, categoria ou código..."
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            />
                                            <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 mb-2">
                                            <button type="button" onClick={selectAll} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">Selecionar visíveis</button>
                                            <button type="button" onClick={clearAll} className="text-xs font-bold text-slate-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Limpar seleção</button>
                                        </div>

                                        {/* Product list grouped by category */}
                                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                                            {Object.entries(groupedFiltered).map(([catId, catData]) => (
                                                <div key={catId}>
                                                    <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0">{catData.name}</div>
                                                    {catData.products.map(productName => {
                                                        const isSelected = selectedProducts.includes(productName);
                                                        const code = productCatalog[productName]?.code;
                                                        return (
                                                            <label key={productName} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleProduct(productName)}
                                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                                                />
                                                                <span className={`text-sm flex-1 ${isSelected ? 'font-semibold text-blue-900' : 'text-slate-700'}`}>{productName}</span>
                                                                {code && <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{code}</span>}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                            {filteredProducts.length === 0 && (
                                                <div className="text-center py-8 text-slate-400 text-sm">Nenhum produto encontrado</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-6 pt-4 border-t border-slate-100 shrink-0 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancelar</button>
                            <button
                                type="submit"
                                form="create-count-form"
                                className={`px-5 py-2.5 text-white rounded-xl font-bold shadow-sm transition-all ${countType === 'diaria' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-[#00a86b] hover:bg-[#00905a] shadow-green-500/20'}`}
                            >
                                {countType === 'diaria' ? 'Próximo →' : 'Criar Contagem Semanal'}
                            </button>
                        </div>
                    </div>
                    )}
                </div>
            );
        };
window.CreateCountModal = CreateCountModal;
