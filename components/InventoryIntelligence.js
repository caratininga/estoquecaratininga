const InventoryIntelligence = ({ dataSets, stockFlow, selectedLocation, categories, catalog }) => {
    const { useState, useEffect, useMemo } = window.React || window;
    const { Activity, AlertTriangle, CheckCircle, Package, TrendingUp, Clock, Filter, AlertCircle, X, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } = window;
    const [periodDays, setPeriodDays] = useState(30);
    const [hideZeros, setHideZeros] = useState(() => {
        const cached = localStorage.getItem('estoque_hideZeros_inteligencia');
        return cached === 'true';
    });
    const [showCols, setShowCols] = useState(() => {
        const cached = localStorage.getItem('estoque_cols_inteligencia');
        const defaultCols = { entradas: true, minimo: true, maximo: true, ideal: true, tempoReal: true, tempoIdeal: true, mediaSaida: true, duracao: true };
        return cached ? { ...defaultCols, ...JSON.parse(cached) } : defaultCols;
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        const cached = localStorage.getItem('estoque_status_filter_inteligencia');
        return cached ? JSON.parse(cached) : { 'Abaixo do Mínimo': true, 'Superestoque': true, 'Parado': true, 'Normal': true };
    });
    const [minDays, setMinDays] = useState(() => {
        const cached = localStorage.getItem('estoque_minDays_inteligencia');
        return cached ? parseInt(cached, 10) : 22;
    });
    const [maxDays, setMaxDays] = useState(() => {
        const cached = localStorage.getItem('estoque_maxDays_inteligencia');
        return cached ? parseInt(cached, 10) : 31;
    });
    const [abcMethod, setAbcMethod] = useState(() => {
        const cached = localStorage.getItem('estoque_abcMethod_inteligencia');
        return cached ? cached : 'value';
    });
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [showLegend, setShowLegend] = useState(false);

    useEffect(() => {
        localStorage.setItem('estoque_hideZeros_inteligencia', hideZeros);
    }, [hideZeros]);

    useEffect(() => {
        localStorage.setItem('estoque_cols_inteligencia', JSON.stringify(showCols));
    }, [showCols]);

    useEffect(() => {
        localStorage.setItem('estoque_status_filter_inteligencia', JSON.stringify(statusFilter));
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem('estoque_minDays_inteligencia', minDays.toString());
    }, [minDays]);

    useEffect(() => {
        localStorage.setItem('estoque_maxDays_inteligencia', maxDays.toString());
    }, [maxDays]);

    useEffect(() => {
        localStorage.setItem('estoque_abcMethod_inteligencia', abcMethod);
    }, [abcMethod]);

    const metrics = useMemo(() => {
        if (!dataSets || !stockFlow || !selectedLocation) return null;

        const locMap = { 'Matriz': 'matriz', 'Mucambo': 'mucambo', 'Tianguá': 'tiangua', 'Frecheirinha': 'frecheirinha' };
        const locKey = locMap[selectedLocation];
        if (!locKey) return null;

        const now = new Date();
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - periodDays);

        // Filter keys within the selected period
        const validKeys = Object.keys(dataSets).filter(k => k.startsWith(`${locKey}_`));
        const filteredKeys = validKeys.filter(k => {
            const parts = k.replace(`${locKey}_`, '').replace('_diaria', '').split('_');
            if (parts.length >= 2) {
                const dd = parseInt(parts[0], 10);
                const mm = parseInt(parts[1], 10);
                const dateObj = new Date(new Date().getFullYear(), mm - 1, dd);
                return dateObj >= pastDate && dateObj <= now;
            }
            return false;
        });

        // Group dates by product to calculate Average Days Between Entries
        const entryDatesByProduct = {};
        const salesByProduct = {};
        const latestStockByProduct = {};
        
        // Sort validKeys chronologically to get the ABSOLUTE LATEST count
        validKeys.sort((a, b) => {
            const getD = (k) => {
                const parts = k.replace(`${locKey}_`, '').replace('_diaria', '').split('_');
                return new Date(new Date().getFullYear(), parseInt(parts[1] || 0) - 1, parseInt(parts[0] || 0));
            };
            return getD(a) - getD(b);
        });
        // Ensure all products get their latest recorded stock
        validKeys.forEach(key => {
            if (!dataSets[key]) return;
            const isDaily = key.includes('_diaria');
            const parts = key.replace(`${locKey}_`, '').replace('_diaria', '').split('_');
            const dateStr = `${String(parts[0]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}`;
            
            categories.forEach(cat => {
                const itemList = dataSets[key][cat.id] || [];
                itemList.forEach(item => {
                    const isGrid = cat.type === 'grid';
                    const counted = isGrid
                        ? ((parseInt(item.l1)||0)+(parseInt(item.l2)||0)+(parseInt(item.l3)||0)+(parseInt(item.l4)||0))
                        : (parseInt(item.qtd)||0);
                    // Since validKeys are sorted chronologically, the latest value will overwrite older ones
                    latestStockByProduct[item.nome] = { qtd: counted, date: dateStr, isDaily: isDaily };
                });
            });
        });

        filteredKeys.forEach(key => {
            const parts = key.replace(`${locKey}_`, '').replace('_diaria', '').split('_');
            const dd = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10);
            const dateObj = new Date(new Date().getFullYear(), mm - 1, dd);
            
            const dateFlow = stockFlow[key] || {};
            
            Object.values(dateFlow).forEach(catFlow => {
                Object.entries(catFlow).forEach(([prodName, flow]) => {
                    const entry = parseInt(flow.entry || 0);
                    const exit = parseInt(flow.exit || 0);

                    if (!salesByProduct[prodName]) salesByProduct[prodName] = { volume: 0, entries: [], entryVolume: 0 };
                    if (exit > 0) salesByProduct[prodName].volume += exit;
                    
                    if (entry > 0) {
                        salesByProduct[prodName].entries.push(dateObj);
                        salesByProduct[prodName].entryVolume += entry;
                    }
                });
            });
        });

        const productAnalysis = [];
        let totalSalesValue = 0;

        // Populate base stats
        Object.entries(salesByProduct).forEach(([prodName, data]) => {
            const unitVal = catalog?.[prodName]?.unitValues?.[selectedLocation] || 0;
            const salesValue = data.volume * unitVal;
            
            // Calculate dynamic lead time
            let dynamicLeadTime = 7; // default 7 days
            if (data.entries.length >= 2) {
                // sort dates ascending
                data.entries.sort((a, b) => a - b);
                let totalDaysDiff = 0;
                for (let i = 1; i < data.entries.length; i++) {
                    const diffTime = Math.abs(data.entries[i] - data.entries[i - 1]);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    totalDaysDiff += diffDays;
                }
                dynamicLeadTime = Math.max(1, Math.round(totalDaysDiff / (data.entries.length - 1)));
            } else if (data.entries.length === 1) {
                // Not enough history, try to see how long ago the last entry was
                const diffTime = Math.abs(now - data.entries[0]);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                dynamicLeadTime = diffDays > 0 ? diffDays : 7;
            }

            // Fallback for VMD (min 1 to avoid zero div if there were sales)
            const daysConsidered = Math.max(1, periodDays);
            const vmd = data.volume / daysConsidered;
            
            totalSalesValue += salesValue;

            productAnalysis.push({
                nome: prodName,
                volumeEntrada: data.entryVolume || 0,
                volumeVendido: data.volume,
                valorVendido: salesValue,
                vmd: vmd,
                leadTimeAtual: dynamicLeadTime,
                estoqueAtual: latestStockByProduct[prodName]?.qtd || 0,
                estoqueDate: latestStockByProduct[prodName]?.date || '',
                estoqueIsDaily: latestStockByProduct[prodName]?.isDaily || false,
                unitVal: unitVal,
            });
        });

        // Add products that have stock but no sales in the period
        Object.keys(latestStockByProduct).forEach(prodName => {
            if (!salesByProduct[prodName]) {
                const unitVal = catalog?.[prodName]?.unitValues?.[selectedLocation] || 0;
                productAnalysis.push({
                    nome: prodName,
                    volumeEntrada: 0,
                    volumeVendido: 0,
                    valorVendido: 0,
                    vmd: 0,
                    leadTimeAtual: 7, // default
                    estoqueAtual: latestStockByProduct[prodName]?.qtd || 0,
                    estoqueDate: latestStockByProduct[prodName]?.date || '',
                    estoqueIsDaily: latestStockByProduct[prodName]?.isDaily || false,
                    unitVal: unitVal,
                });
            }
        });

        // Calculate total for ABC
        let totalAbcBasis = 0;
        productAnalysis.forEach(p => {
            totalAbcBasis += abcMethod === 'volume' ? p.volumeVendido : p.valorVendido;
        });

        // Calculate ABC Curve
        if (abcMethod === 'volume') {
            productAnalysis.sort((a, b) => b.volumeVendido - a.volumeVendido);
        } else {
            productAnalysis.sort((a, b) => b.valorVendido - a.valorVendido);
        }
        
        let accumulatedBasis = 0;
        productAnalysis.forEach(p => {
            const basisValue = abcMethod === 'volume' ? p.volumeVendido : p.valorVendido;
            if (totalAbcBasis > 0) {
                accumulatedBasis += basisValue;
                const perc = (accumulatedBasis / totalAbcBasis) * 100;
                
                if (perc <= 80) p.classeABC = 'A';
                else if (perc <= 95) p.classeABC = 'B';
                else p.classeABC = 'C';
            } else {
                p.classeABC = 'C';
            }

            // Ideal replenishment based on ABC
            p.frequenciaIdeal = p.classeABC === 'A' ? 7 : p.classeABC === 'B' ? 15 : 30;
            p.qtdeIdeal = Math.ceil(p.vmd * p.frequenciaIdeal);
            
            // Min/Max Calculation
            const vmdArredondado = Math.ceil(p.vmd);
            p.estoqueMinimo = vmdArredondado * minDays;
            p.estoqueMaximo = vmdArredondado * maxDays;

            // Status Check
            if (p.estoqueAtual <= p.estoqueMinimo && p.vmd > 0) p.status = 'Abaixo do Mínimo';
            else if (p.estoqueAtual >= p.estoqueMaximo && p.vmd > 0) p.status = 'Superestoque';
            else if (p.vmd === 0 && p.estoqueAtual > 0) p.status = 'Parado';
            else p.status = 'Normal';

            // Coverage calculation
            const md = Math.ceil(p.vmd);
            p.duracaoEstoque = md > 0 ? Math.floor(p.estoqueAtual / md) : Infinity;
        });

        return { products: productAnalysis, totalSalesValue };
    }, [dataSets, stockFlow, selectedLocation, periodDays, categories, catalog, minDays, maxDays, abcMethod]);

    if (!metrics) return null;

    const displayProducts = metrics.products.filter(p => {
        if (hideZeros && p.volumeEntrada === 0 && p.volumeVendido === 0 && p.estoqueAtual === 0 && p.qtdeIdeal === 0) return false;
        if (!statusFilter[p.status]) return false;
        return true;
    });
    
    const classStats = {
        A: displayProducts.filter(p => p.classeABC === 'A').length,
        B: displayProducts.filter(p => p.classeABC === 'B').length,
        C: displayProducts.filter(p => p.classeABC === 'C').length
    };
    const totalABC = classStats.A + classStats.B + classStats.C;
    const percA = totalABC ? (classStats.A / totalABC) * 100 : 0;
    const percB = totalABC ? (classStats.B / totalABC) * 100 : 0;
    const percC = totalABC ? (classStats.C / totalABC) * 100 : 0;
    
    const displayTotalSales = displayProducts.reduce((sum, p) => sum + p.valorVendido, 0);

    return (
        <div className="bg-slate-50 rounded-xl mb-8 p-4 md:p-8 border border-slate-200">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Activity className="text-blue-600" size={28} />
                            Inteligência de Estoque (Curva ABC)
                        </h2>
                        <p className="text-slate-500 mt-1 text-sm font-medium">Análise preditiva de reposição e saúde do inventário da unidade <span className="text-blue-600 font-bold">{selectedLocation}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setShowLegend(true)}
                            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm font-bold text-slate-600 bg-white hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                        >
                            <AlertCircle size={16} className="text-blue-500" />
                            Legendas
                        </button>
                        <div className="w-px h-6 bg-slate-300"></div>
                        <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                            <input 
                                type="checkbox" 
                                checked={hideZeros} 
                                onChange={(e) => setHideZeros(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Ocultar Zerados
                        </label>
                        <div className="w-px h-6 bg-slate-300"></div>
                        <Filter className="text-slate-400 ml-1" size={18} />
                        <select 
                            value={periodDays} 
                            onChange={(e) => setPeriodDays(parseInt(e.target.value))}
                            className="bg-white border-none rounded-lg text-sm font-bold text-slate-700 py-2 pl-3 pr-8 shadow-sm focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value={15}>Últimos 15 Dias</option>
                            <option value={30}>Últimos 30 Dias</option>
                            <option value={60}>Últimos 60 Dias</option>
                            <option value={90}>Últimos 90 Dias</option>
                        </select>
                    </div>
                </div>

                {/* KPI Cards and Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex flex-col justify-center">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Vendido (Período)</div>
                            <div className="text-2xl font-black text-slate-800">R$ {displayTotalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-red-200 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-red-50 rounded-full group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Classe A (80%)
                                </div>
                                <div className="text-2xl font-black text-red-700">{classStats.A} <span className="text-sm font-medium text-red-500">produtos</span></div>
                                <div className="text-xs font-medium text-red-400 mt-1">Alta rotatividade e valor</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-200 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-orange-50 rounded-full group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> Classe B (15%)
                                </div>
                                <div className="text-2xl font-black text-orange-700">{classStats.B} <span className="text-sm font-medium text-orange-500">produtos</span></div>
                                <div className="text-xs font-medium text-orange-400 mt-1">Média rotatividade</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-200 relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full group-hover:scale-150 transition-transform"></div>
                            <div className="relative z-10">
                                <div className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Classe C (5%)
                                </div>
                                <div className="text-2xl font-black text-blue-700">{classStats.C} <span className="text-sm font-medium text-blue-500">produtos</span></div>
                                <div className="text-xs font-medium text-blue-400 mt-1">Baixa rotatividade</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Chart Panel */}
                    <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center items-center relative overflow-hidden">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 w-full text-center relative z-10">
                            Distribuição ABC
                        </h3>
                        <div className="w-full flex flex-col justify-center flex-1">
                            {/* Stacked Progress Bar */}
                            <div className="w-full flex h-6 rounded-lg overflow-hidden mb-4 shadow-sm border border-slate-100">
                                <div style={{width: `${percA}%`}} className="bg-red-500 hover:opacity-80 transition-opacity relative group cursor-pointer" title={`Classe A: ${classStats.A} produtos`}>
                                    {percA > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">A</span>}
                                </div>
                                <div style={{width: `${percB}%`}} className="bg-orange-400 hover:opacity-80 transition-opacity relative group cursor-pointer" title={`Classe B: ${classStats.B} produtos`}>
                                    {percB > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">B</span>}
                                </div>
                                <div style={{width: `${percC}%`}} className="bg-blue-500 hover:opacity-80 transition-opacity relative group cursor-pointer" title={`Classe C: ${classStats.C} produtos`}>
                                    {percC > 15 && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">C</span>}
                                </div>
                            </div>
                            
                            {/* Legend */}
                            <div className="grid grid-cols-3 gap-2 w-full text-center">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-1 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span><span className="text-[10px] font-bold text-slate-600">Classe A</span></div>
                                    <span className="text-xs font-black text-slate-800">{classStats.A}</span>
                                </div>
                                <div className="flex flex-col items-center border-x border-slate-100">
                                    <div className="flex items-center gap-1 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span><span className="text-[10px] font-bold text-slate-600">Classe B</span></div>
                                    <span className="text-xs font-black text-slate-800">{classStats.B}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-1 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span className="text-[10px] font-bold text-slate-600">Classe C</span></div>
                                    <span className="text-xs font-black text-slate-800">{classStats.C}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table Panel (Full Width) */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <TrendingUp className="text-slate-400" size={18} />
                                Sugestão de Compras e Estoque Mín/Máx
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500">BASE ABC:</span>
                                    <select 
                                        value={abcMethod} 
                                        onChange={(e) => setAbcMethod(e.target.value)}
                                        className="h-6 text-xs text-slate-700 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none px-1"
                                    >
                                        <option value="value">Valor (R$)</option>
                                        <option value="volume">Volume (Unid.)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <span className="text-[11px] font-bold text-slate-500">MÍN:</span>
                                    <input 
                                        type="number" 
                                        value={minDays} 
                                        onChange={(e) => setMinDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                        className="w-10 h-6 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                    />
                                    <span className="text-[10px] font-medium text-slate-400">dias</span>
                                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                                    <span className="text-[11px] font-bold text-slate-500">MÁX:</span>
                                    <input 
                                        type="number" 
                                        value={maxDays} 
                                        onChange={(e) => setMaxDays(Math.max(0, parseInt(e.target.value) || 0))} 
                                        className="w-10 h-6 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                                    />
                                    <span className="text-[10px] font-medium text-slate-400">dias</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.entradas} onChange={(e) => setShowCols(p => ({...p, entradas: e.target.checked}))} className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-3.5 h-3.5"/>
                                    ENTRADAS
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.mediaSaida} onChange={(e) => setShowCols(p => ({...p, mediaSaida: e.target.checked}))} className="rounded border-slate-300 text-slate-500 focus:ring-slate-500 w-3.5 h-3.5"/>
                                    MÉDIA
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.valorUn} onChange={(e) => setShowCols(p => ({...p, valorUn: e.target.checked}))} className="rounded border-slate-300 text-slate-500 focus:ring-slate-500 w-3.5 h-3.5"/>
                                    VALOR UN.
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.tempoReal} onChange={(e) => setShowCols(p => ({...p, tempoReal: e.target.checked}))} className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-3.5 h-3.5"/>
                                    T. REAL
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.tempoIdeal} onChange={(e) => setShowCols(p => ({...p, tempoIdeal: e.target.checked}))} className="rounded border-slate-300 text-green-500 focus:ring-green-500 w-3.5 h-3.5"/>
                                    T. IDEAL
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.minimo} onChange={(e) => setShowCols(p => ({...p, minimo: e.target.checked}))} className="rounded border-slate-300 text-red-500 focus:ring-red-500 w-3.5 h-3.5"/>
                                    MÍNIMO
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.maximo} onChange={(e) => setShowCols(p => ({...p, maximo: e.target.checked}))} className="rounded border-slate-300 text-blue-500 focus:ring-blue-500 w-3.5 h-3.5"/>
                                    MÁXIMO
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.ideal} onChange={(e) => setShowCols(p => ({...p, ideal: e.target.checked}))} className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-3.5 h-3.5"/>
                                    IDEAL
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                                    <input type="checkbox" checked={showCols.duracao} onChange={(e) => setShowCols(p => ({...p, duracao: e.target.checked}))} className="rounded border-slate-300 text-purple-500 focus:ring-purple-500 w-3.5 h-3.5"/>
                                    DURAÇÃO
                                </label>
                            </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3">Produto</th>
                                        {showCols.valorUn && <th className="px-4 py-3 text-center">Valor<br/><span className="text-[9px] font-medium text-slate-400">Unitário</span></th>}
                                        {showCols.entradas && <th className="px-4 py-3 text-center">Entradas<br/><span className="text-[9px] font-medium text-slate-400">({periodDays}d)</span></th>}
                                        <th className="px-4 py-3 text-center">Saídas<br/><span className="text-[9px] font-medium text-slate-400">({periodDays}d)</span></th>
                                        {showCols.mediaSaida && <th className="px-4 py-3 text-center">Média<br/><span className="text-[9px] font-medium text-slate-400">Diária</span></th>}
                                        <th className="px-4 py-3 text-center">Estoque<br/>Atual</th>
                                        {showCols.duracao && <th className="px-4 py-3 text-center bg-purple-50/50">Duração<br/><span className="text-[9px] font-medium text-purple-600">Estimada</span></th>}
                                        <th className="px-4 py-3 text-center">Classe</th>
                                        {showCols.tempoReal && <th className="px-4 py-3 text-center bg-blue-50/50">Tempo Real<br/><span className="text-[9px] font-medium text-blue-400">Reposição</span></th>}
                                        {showCols.tempoIdeal && <th className="px-4 py-3 text-center bg-green-50/50">Tempo Ideal<br/><span className="text-[9px] font-medium text-green-500">Frequência</span></th>}
                                        {showCols.minimo && <th className="px-4 py-3 text-center text-red-500 bg-red-50/30">Mínimo</th>}
                                        {showCols.maximo && <th className="px-4 py-3 text-center text-blue-500 bg-blue-50/30">Máximo</th>}
                                        {showCols.ideal && <th className="px-4 py-3 text-center bg-green-50/30 text-green-700">Qtd Ideal<br/><span className="text-[9px] font-medium text-green-600">Comprar</span></th>}
                                        <th className="px-4 py-3 text-center relative">
                                            <button 
                                                onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
                                                className="flex items-center justify-center gap-1 mx-auto hover:text-slate-700 transition-colors"
                                            >
                                                Status <Filter size={12} className={Object.values(statusFilter).every(v => v) ? "text-slate-400" : "text-blue-500"} />
                                            </button>
                                            
                                            {isStatusMenuOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setIsStatusMenuOpen(false)}></div>
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-20 text-left font-normal text-sm">
                                                        <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                            <input type="checkbox" checked={statusFilter['Abaixo do Mínimo']} onChange={(e) => setStatusFilter(p => ({...p, 'Abaixo do Mínimo': e.target.checked}))} className="rounded border-slate-300 text-red-600 focus:ring-red-500"/>
                                                            <span className="text-red-600 font-bold text-xs flex items-center gap-1"><AlertTriangle size={12}/> Comprar</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                            <input type="checkbox" checked={statusFilter['Superestoque']} onChange={(e) => setStatusFilter(p => ({...p, 'Superestoque': e.target.checked}))} className="rounded border-slate-300 text-orange-500 focus:ring-orange-500"/>
                                                            <span className="text-orange-600 font-bold text-xs flex items-center gap-1"><AlertCircle size={12}/> Excesso</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                            <input type="checkbox" checked={statusFilter['Parado']} onChange={(e) => setStatusFilter(p => ({...p, 'Parado': e.target.checked}))} className="rounded border-slate-300 text-slate-500 focus:ring-slate-500"/>
                                                            <span className="text-slate-600 font-bold text-xs flex items-center gap-1"><Clock size={12}/> Parado</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                            <input type="checkbox" checked={statusFilter['Normal']} onChange={(e) => setStatusFilter(p => ({...p, 'Normal': e.target.checked}))} className="rounded border-slate-300 text-green-600 focus:ring-green-500"/>
                                                            <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12}/> Normal</span>
                                                        </label>
                                                    </div>
                                                </>
                                            )}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {displayProducts.map((p, idx) => {
                                        const classColor = p.classeABC === 'A' ? 'bg-red-100 text-red-700' : p.classeABC === 'B' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700';
                                        return (
                                            <tr key={p.nome} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-800 uppercase">{p.nome}</td>
                                                {showCols.valorUn && <td className="px-4 py-3 text-center font-semibold text-slate-600">{p.unitVal?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>}
                                                {showCols.entradas && <td className="px-4 py-3 text-center font-semibold text-green-600">+{p.volumeEntrada}</td>}
                                                <td className="px-4 py-3 text-center font-semibold text-slate-600">-{p.volumeVendido}</td>
                                                {showCols.mediaSaida && <td className="px-4 py-3 text-center font-semibold text-slate-500">{Math.ceil(p.vmd)}</td>}
                                                <td className="px-4 py-3 text-center">
                                                    <div className="font-black text-slate-800 text-base">{p.estoqueAtual}</div>
                                                    {p.estoqueDate && (
                                                        <div className={`text-[9px] font-bold mt-0.5 rounded px-1 w-max mx-auto ${p.estoqueIsDaily ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {p.estoqueIsDaily ? 'Diária' : 'Semanal'} {p.estoqueDate}
                                                        </div>
                                                    )}
                                                </td>
                                                {showCols.duracao && (
                                                    <td className={`px-4 py-3 text-center font-bold ${
                                                        p.duracaoEstoque === Infinity ? 'text-slate-400 bg-slate-50/50' :
                                                        p.duracaoEstoque <= 7 ? 'text-red-600 bg-red-50/50' : 
                                                        p.duracaoEstoque <= 14 ? 'text-orange-600 bg-orange-50/50' :
                                                        p.duracaoEstoque <= 21 ? 'text-yellow-600 bg-yellow-50/50' :
                                                        'text-green-600 bg-green-50/50'
                                                    }`}>
                                                        {p.duracaoEstoque === Infinity ? '∞' : `${p.duracaoEstoque}d`}
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-black ${classColor}`}>{p.classeABC}</span>
                                                </td>
                                                {showCols.tempoReal && <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/30">{p.leadTimeAtual}d</td>}
                                                {showCols.tempoIdeal && <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/30">{p.frequenciaIdeal}d</td>}
                                                {showCols.minimo && <td className="px-4 py-3 text-center font-bold text-red-500 bg-red-50/30">{p.estoqueMinimo}</td>}
                                                {showCols.maximo && <td className="px-4 py-3 text-center font-bold text-blue-500 bg-blue-50/30">{p.estoqueMaximo}</td>}
                                                {showCols.ideal && <td className="px-4 py-3 text-center font-black text-green-600 bg-green-50/30">+{p.qtdeIdeal}</td>}
                                                <td className="px-4 py-3 text-center">
                                                    {p.status === 'Abaixo do Mínimo' && <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md"><AlertTriangle size={12}/> Comprar</span>}
                                                    {p.status === 'Superestoque' && <span className="flex items-center justify-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-md"><AlertCircle size={12}/> Excesso</span>}
                                                    {p.status === 'Parado' && <span className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md"><Clock size={12}/> Parado</span>}
                                                    {p.status === 'Normal' && <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md"><CheckCircle size={12}/> Normal</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {metrics.products.length === 0 && (
                                <div className="text-center py-12 text-slate-400 font-medium">Nenhum dado encontrado para o período.</div>
                            )}
                            {hideZeros && metrics.products.filter(p => p.qtdeIdeal > 0).length === 0 && metrics.products.length > 0 && (
                                <div className="text-center py-12 text-slate-400 font-medium">Todos os produtos possuem quantidade ideal 0.</div>
                            )}
                        </div>
                    </div>
            </div>

            {/* Legend Modal */}
            {showLegend && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <AlertCircle className="text-blue-600" size={24} />
                                Status da Inteligência ABC
                            </h3>
                            <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex gap-4 items-start">
                                <span className="flex items-center justify-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-3 py-2 rounded-lg whitespace-nowrap min-w-[100px]"><AlertTriangle size={14}/> Comprar</span>
                                <div className="text-sm text-slate-600"><strong className="text-slate-800">Abaixo do Mínimo:</strong> O estoque atual atingiu ou está abaixo da margem de segurança (Estoque Mínimo). Uma reposição é sugerida.</div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <span className="flex items-center justify-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg whitespace-nowrap min-w-[100px]"><AlertCircle size={14}/> Excesso</span>
                                <div className="text-sm text-slate-600"><strong className="text-slate-800">Superestoque:</strong> O estoque atual está acima do limite máximo saudável (Estoque Máximo), indicando capital parado desnecessariamente.</div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <span className="flex items-center justify-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-lg whitespace-nowrap min-w-[100px]"><Clock size={14}/> Parado</span>
                                <div className="text-sm text-slate-600"><strong className="text-slate-800">Sem Vendas:</strong> O produto possui estoque na unidade, mas não obteve nenhuma venda/saída durante o período analisado.</div>
                            </div>
                            <div className="flex gap-4 items-start">
                                <span className="flex items-center justify-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg whitespace-nowrap min-w-[100px]"><CheckCircle size={14}/> Normal</span>
                                <div className="text-sm text-slate-600"><strong className="text-slate-800">Saudável:</strong> O estoque está dentro da margem ideal (entre o Mínimo e o Máximo). Nenhuma ação necessária.</div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={() => setShowLegend(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">Entendi</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

window.InventoryIntelligence = InventoryIntelligence;
