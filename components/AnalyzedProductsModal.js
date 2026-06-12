        const AnalyzedProductsModal = ({ isOpen, onClose, products }) => {
            const [sortConfig, setSortConfig] = useState({ key: 'divergencia', direction: 'desc' });

            if (!isOpen) return null;

            const handleSort = (key) => {
                let direction = 'asc';
                if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
                setSortConfig({ key, direction });
            };

            const sortedProducts = [...products].sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });

            const getSortIcon = (key) => {
                if (sortConfig.key !== key) return null;
                return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
            };

            return (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden">
                        <div className="flex justify-between items-center p-5 border-b border-slate-200 bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <List size={20} className="text-blue-600" /> Produtos Analisados ({products.length})
                            </h2>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-auto flex-1 scrollbar-thin bg-white relative">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-[10px] xl:text-xs text-slate-600 font-semibold sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th onClick={() => handleSort('nome')} className="px-3 py-3 lg:px-5 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap">Produto{getSortIcon('nome')}</th>
                                        <th onClick={() => handleSort('categoria')} className="px-3 py-3 lg:px-5 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap">Categoria{getSortIcon('categoria')}</th>
                                        <th onClick={() => handleSort('teorico')} className="px-3 py-3 lg:px-5 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap">Teórico{getSortIcon('teorico')}</th>
                                        <th onClick={() => handleSort('contado')} className="px-3 py-3 lg:px-5 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap">Contado{getSortIcon('contado')}</th>
                                        <th onClick={() => handleSort('divergencia')} className="px-3 py-3 lg:px-5 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap">Divergência{getSortIcon('divergencia')}</th>
                                        <th className="px-3 py-3 lg:px-5 text-center whitespace-nowrap">Valor Unit.</th>
                                        <th className="px-3 py-3 lg:px-5 text-center bg-black/10 whitespace-nowrap">Valor Total (Contado)</th>
                                        <th className="px-3 py-3 lg:px-5 text-center bg-black/10 border-l border-white/20 whitespace-nowrap">Valor Total (Div.)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sortedProducts.map((item, i) => {
                                        const absDiv = Math.abs(item.divergencia);
                                        let divClass = "text-green-600 bg-green-50/50 font-medium";
                                        let bgClass = "hover:bg-slate-50";
                                        if (absDiv > 5) {
                                            divClass = "text-red-700 bg-red-100 font-bold";
                                            bgClass = "bg-red-50/30 hover:bg-red-50";
                                        } else if (absDiv > 0) {
                                            divClass = "text-amber-700 bg-amber-100 font-bold";
                                            bgClass = "bg-amber-50/30 hover:bg-amber-50";
                                        }

                                        return (
                                            <tr key={i} className={`transition-colors ${bgClass}`}>
                                                <td className="px-3 py-3 lg:px-5 font-medium text-slate-700 uppercase whitespace-nowrap">{item.nome}</td>
                                                <td className="px-3 py-3 lg:px-5 text-slate-500 whitespace-nowrap">{item.categoria}</td>
                                                <td className="px-3 py-3 lg:px-5 text-center text-slate-600">{item.teorico.toLocaleString('pt-BR')}</td>
                                                <td className="px-3 py-3 lg:px-5 text-center text-slate-600">{item.contado.toLocaleString('pt-BR')}</td>
                                                <td className="px-3 py-3 lg:px-5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-md inline-block min-w-[3rem] ${divClass}`}>
                                                        {item.divergencia > 0 ? `+${item.divergencia.toLocaleString('pt-BR')}` : item.divergencia.toLocaleString('pt-BR')}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 lg:px-5 text-center text-slate-500 font-medium whitespace-nowrap">R$ {(item.unitValue || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className={`px-3 py-3 lg:px-5 text-center font-bold bg-slate-50 whitespace-nowrap ${item.contado === 0 ? 'text-gray-400' : 'text-slate-700'}`}>R$ {(item.contado * (item.unitValue || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                <td className={`px-3 py-3 lg:px-5 text-center font-bold bg-slate-50 border-l border-slate-200 whitespace-nowrap ${item.divergencia !== 0 ? divClass.split(' ')[0] : 'text-gray-400'}`}>{item.divergencia !== 0 ? (item.divergencia > 0 ? '+ ' : '- ') : ''}R$ {Math.abs(item.divergencia * (item.unitValue || 0)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {products.length === 0 && (
                                <div className="text-center py-12 text-slate-500">Nenhum produto foi contabilizado nesta data.</div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };
window.AnalyzedProductsModal = AnalyzedProductsModal;
