        const EvolutionReport = ({ data, flowData, previousData, dataSets, stockFlow, selectedLocation, getPreviousStockValues, getLastWeeklyStockBase, categories, catalog, selectedDate }) => {
            const [isListModalOpen, setIsListModalOpen] = useState(false);
            const [historyMode, setHistoryMode] = useState('semanal'); // 'semanal' or 'diaria'
            const [selectedMonth, setSelectedMonth] = useState(() => {
                // Auto-init from selectedDate (format DD/MM)
                const parts = (selectedDate || '').split('/');
                return parts.length === 2 ? parseInt(parts[1], 10) || new Date().getMonth() + 1 : new Date().getMonth() + 1;
            });
            const [activeMetrics, setActiveMetrics] = useState(() => {
                const defaultMetrics = {
                    'Total de Produtos': false,
                    'Produtos Corretos': false,
                    'Itens Divergentes': false,
                    'Unidades Divergentes': true,
                    'Prod. Div. Leve (<=5)': true,
                    'Prod. Div. Alta (>5)': true,
                    'Acurácia (%)': false,
                    'Acurácia Unidades (%)': true
                };
                const saved = localStorage.getItem('estoque_activeMetrics');
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved);
                        return { ...defaultMetrics, ...parsed, 'Acurácia Unidades (%)': parsed['Acurácia Unidades (%)'] ?? true };
                    } catch (e) {
                        return defaultMetrics;
                    }
                }
                return defaultMetrics;
            });

            // Sync selectedMonth when selectedDate changes (but user can override independently)
            React.useEffect(() => {
                const parts = (selectedDate || '').split('/');
                if (parts.length === 2) {
                    const m = parseInt(parts[1], 10);
                    if (!isNaN(m) && m >= 1 && m <= 12) setSelectedMonth(m);
                }
            }, [selectedDate]);

            useEffect(() => {
                localStorage.setItem('estoque_activeMetrics', JSON.stringify(activeMetrics));
            }, [activeMetrics]);

            const toggleMetric = (metric) => {
                setActiveMetrics(prev => ({...prev, [metric]: !prev[metric]}));
            };

            const metricColors = {
                'Total de Produtos': '#3b82f6',
                'Produtos Corretos': '#22c55e',
                'Itens Divergentes': '#ef4444',
                'Unidades Divergentes': '#f97316',
                'Prod. Div. Leve (<=5)': '#fbbf24',
                'Prod. Div. Alta (>5)': '#b91c1c',
                'Acurácia (%)': '#8b5cf6',
                'Acurácia Unidades (%)': '#10b981'
            };

            if (!data) return null;

            let totalItems = 0;
            let divergentItems = 0;
            let totalUnitsDiverging = 0;
            let lightDivergenceItems = 0;
            let highDivergenceItems = 0;
            
            let totalValue = 0;
            let positiveValueDiv = 0;
            let negativeValueDiv = 0;
            let totalExpectedUnits = 0;

            let categoryStats = [];
            let currentAnalyzedProducts = [];

            categories.forEach(cat => {
                const itemList = data[cat.id];
                if (!itemList) return;
                
                let catDivergent = 0;
                let catTotal = 0;

                itemList.forEach(item => {
                    const isGrid = cat.type === 'grid';
                    const countedTotal = isGrid ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0)) : (parseInt(item.qtd)||0);
                    
                    const flow = flowData?.[cat.id]?.[item.nome] || { entry: 0, exit: 0 };
                    const prevStock = previousData?.[item.nome] || 0;
                    
                    const expected = (prevStock + (parseInt(flow.entry)||0)) - (parseInt(flow.exit)||0);
                    const divergence = countedTotal - expected;
                    
                    if (expected === 0 && countedTotal === 0) return;
                    
                    catTotal++;
                    totalExpectedUnits += expected;
                    const unitValue = catalog?.[item.nome]?.unitValues?.[selectedLocation] || 0;
                    totalValue += (countedTotal * unitValue);
                    
                    currentAnalyzedProducts.push({
                        nome: item.nome,
                        categoria: cat.name,
                        teorico: expected,
                        contado: countedTotal,
                        divergencia: divergence,
                        unitValue: unitValue
                    });

                    if (divergence !== 0) {
                        catDivergent++;
                        const absDiv = Math.abs(divergence);
                        totalUnitsDiverging += absDiv;
                        
                        if (divergence > 0) positiveValueDiv += divergence * unitValue;
                        else negativeValueDiv += absDiv * unitValue;

                        if (absDiv <= 5) lightDivergenceItems++;
                        else highDivergenceItems++;
                    }
                });

                totalItems += catTotal;
                divergentItems += catDivergent;
                
                if (catTotal > 0) {
                    categoryStats.push({
                        name: cat.name,
                        Divergentes: catDivergent,
                        Corretos: catTotal - catDivergent
                    });
                }
            });

            const correctItems = totalItems - divergentItems;
            const accuracy = totalItems > 0 ? ((correctItems / totalItems) * 100).toFixed(1) : 0;
            const unitAccuracy = totalExpectedUnits > 0 ? Math.max(0, ((totalExpectedUnits - totalUnitsDiverging) / totalExpectedUnits) * 100).toFixed(1) : 0;

            const pieData = [
                { name: 'Corretos', value: correctItems },
                { name: 'Com Divergência', value: divergentItems }
            ];
            const COLORS = ['#22c55e', '#ef4444'];

            // ── TOP 5 DIVERGÊNCIAS DO MÊS ──────────────────────────────────────────
            const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
            const top5Data = React.useMemo(() => {
                if (!dataSets || !stockFlow || !selectedLocation || !getPreviousStockValues) return { positive: [], negative: [] };
                const locMap = { 'Matriz': 'matriz', 'Mucambo': 'mucambo', 'Tianguá': 'tiangua', 'Frecheirinha': 'frecheirinha' };
                const locKey = locMap[selectedLocation];
                if (!locKey) return { positive: [], negative: [] };

                const mm = String(selectedMonth).padStart(2, '0');
                // Filter all keys that belong to selected location AND selected month
                const monthKeys = Object.keys(dataSets).filter(k => {
                    if (!k.startsWith(`${locKey}_`)) return false;
                    const parts = k.replace(`${locKey}_`, '').split('_');
                    // parts[0]=DD, parts[1]=MM, parts[2]=diaria (optional)
                    return parts[1] === mm;
                });

                // Accumulate divergences per product across all counted dates in the month
                const productDivMap = {};

                monthKeys.forEach(key => {
                    const isDailyKey = key.endsWith('_diaria');
                    const dateStrKey = key.replace(`${locKey}_`, '').replace('_diaria', '');
                    const [dd, mmStr] = dateStrKey.split('_');
                    const dateStr = `${dd}/${mmStr}`;

                    const dateData = dataSets[key] || {};
                    const dateFlow = stockFlow[key] || {};
                    const prevResult = getPreviousStockValues(selectedLocation, dateStr, dataSets, isDailyKey);
                    const prevMap = prevResult ? prevResult.stockMap : {};

                    categories.forEach(cat => {
                        const itemList = dateData[cat.id];
                        if (!itemList) return;
                        itemList.forEach(item => {
                            const isGrid = cat.type === 'grid';
                            const counted = isGrid
                                ? ((parseInt(item.l1)||0)+(parseInt(item.l2)||0)+(parseInt(item.l3)||0)+(parseInt(item.l4)||0))
                                : (parseInt(item.qtd)||0);
                            const flow = dateFlow?.[cat.id]?.[item.nome] || { entry: 0, exit: 0 };
                            const prev = prevMap?.[item.nome] || 0;
                            const expected = (prev + (parseInt(flow.entry)||0)) - (parseInt(flow.exit)||0);
                            const div = counted - expected;
                            if (div === 0) return;
                            if (!productDivMap[item.nome]) productDivMap[item.nome] = { nome: item.nome, categoria: cat.name, positive: 0, negative: 0, occurrences: 0 };
                            if (div > 0) productDivMap[item.nome].positive += div;
                            else productDivMap[item.nome].negative += Math.abs(div);
                            productDivMap[item.nome].occurrences++;
                        });
                    });
                });

                const allProducts = Object.values(productDivMap);
                const top5Positive = [...allProducts].filter(p => p.positive > 0).sort((a,b) => b.positive - a.positive).slice(0, 5);
                const top5Negative = [...allProducts].filter(p => p.negative > 0).sort((a,b) => b.negative - a.negative).slice(0, 5);
                return { positive: top5Positive, negative: top5Negative };
            }, [dataSets, stockFlow, selectedLocation, selectedMonth, categories, getPreviousStockValues]);
            // ────────────────────────────────────────────────────────────────────────

            let historicalData = [];
            if (dataSets && stockFlow && selectedLocation && getPreviousStockValues) {
                const locMap = { 'Matriz': 'matriz', 'Mucambo': 'mucambo', 'Tianguá': 'tiangua', 'Frecheirinha': 'frecheirinha' };
                const locKey = locMap[selectedLocation];
                const isDailyMode = historyMode === 'diaria';
                
                const locationKeys = Object.keys(dataSets).filter(k => k.startsWith(`${locKey}_`) && (isDailyMode ? k.endsWith('_diaria') : !k.endsWith('_diaria')));
                const allDates = locationKeys.map(k => {
                    const parts = k.split('_');
                    return `${parts[1]}/${parts[2]}`; // Reconstruct DD/MM
                });
                
                // Remove duplicates in case something is weird
                const uniqueDates = [...new Set(allDates)];

                uniqueDates.sort((a, b) => {
                    const [d1, m1] = a.split('/').map(Number);
                    const [d2, m2] = b.split('/').map(Number);
                    return new Date(new Date().getFullYear(), m1-1, d1) - new Date(new Date().getFullYear(), m2-1, d2);
                });

                historicalData = uniqueDates.map(dateStr => {
                    const dateStrKey = dateStr.replace('/', '_');
                    const suffix = isDailyMode ? '_diaria' : '';
                    const key = `${locKey}_${dateStrKey}${suffix}`;
                    const dateData = dataSets[key] || {};
                    const dateFlow = stockFlow[key] || {};
                    const prevStockResult = getPreviousStockValues(selectedLocation, dateStr, dataSets, isDailyMode);
                    const prevStockMap = prevStockResult ? prevStockResult.stockMap : {};
                    
                    let dateDivUnits = 0;
                    let dateTotalItems = 0;
                    let dateDivergentItems = 0;
                    let dateLightDivergent = 0;
                    let dateHighDivergent = 0;
                    let dateExpectedUnits = 0;
                    
                    categories.forEach(cat => {
                        const itemList = dateData[cat.id];
                        if (!itemList) return;
                        itemList.forEach(item => {
                            const isGrid = cat.type === 'grid';
                            const countedTotal = isGrid ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0)) : (parseInt(item.qtd)||0);
                            
                            const flow = dateFlow?.[cat.id]?.[item.nome] || { entry: 0, exit: 0 };
                            const prevStockVal = prevStockMap?.[item.nome] || 0;
                            
                            const expected = (prevStockVal + parseInt(flow.entry || 0)) - parseInt(flow.exit || 0);
                            const divergence = countedTotal - expected;
                            
                            if (expected === 0 && countedTotal === 0) return;
                            
                            dateTotalItems++;
                            dateExpectedUnits += expected;
                            if (divergence !== 0) {
                                dateDivergentItems++;
                                const absDiv = Math.abs(divergence);
                                dateDivUnits += absDiv;
                                if (absDiv <= 5) dateLightDivergent++;
                                else dateHighDivergent++;
                            }
                        });
                    });

                    const dateCorrectItems = dateTotalItems - dateDivergentItems;
                    const dateAccuracy = dateTotalItems > 0 ? parseFloat(((dateCorrectItems / dateTotalItems) * 100).toFixed(1)) : 0;
                    const dateUnitAccuracy = dateExpectedUnits > 0 ? parseFloat(Math.max(0, ((dateExpectedUnits - dateDivUnits) / dateExpectedUnits) * 100).toFixed(1)) : 0;

                    return {
                        name: dateStr,
                        'Unidades Divergentes': dateDivUnits,
                        'Prod. Div. Leve (<=5)': dateLightDivergent,
                        'Prod. Div. Alta (>5)': dateHighDivergent,
                        'Itens Divergentes': dateDivergentItems,
                        'Total de Produtos': dateTotalItems,
                        'Produtos Corretos': dateCorrectItems,
                        'Acurácia (%)': dateAccuracy,
                        'Acurácia Unidades (%)': dateUnitAccuracy
                    };
                });
            }

            if (!TrendingUp) return <div className="p-4 text-red-500 bg-red-50">Erro: Ícone TrendingUp não carregou.</div>;
            if (!PieChart || !BarChart || !LineChart) return <div className="p-4 text-red-500 bg-red-50">Erro: Biblioteca Recharts não carregou corretamente.</div>;

            return (
                <div className="mb-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
                    <AnalyzedProductsModal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} products={currentAnalyzedProducts} />
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="text-blue-600" size={20} />
                            Relatório de Evolução e Precisão
                        </h3>
                        <button onClick={() => setIsListModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                            <List size={16} className="text-blue-600" /> Ver Listagem Analisada
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold uppercase text-blue-500 mb-1">Total de Itens</span>
                                <span className="text-2xl font-bold text-blue-900">{totalItems.toLocaleString('pt-BR')} <span className="text-sm font-medium">un</span></span>
                                <span className="text-xs font-bold text-blue-600 mt-1">R$ {totalValue.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                                <span className="text-xs font-bold uppercase text-green-500 mb-1">Acurácias</span>
                                <div className="flex gap-4 items-center w-full justify-center">
                                    <div className="text-center">
                                        <span className="text-2xl font-bold text-green-700">{accuracy}%</span>
                                        <span className="block text-[9px] font-bold text-green-600 mt-0.5 uppercase tracking-tighter">Produtos</span>
                                    </div>
                                    <div className="w-px h-8 bg-green-200"></div>
                                    <div className="text-center">
                                        <span className="text-2xl font-bold text-green-700">{unitAccuracy}%</span>
                                        <span className="block text-[9px] font-bold text-green-600 mt-0.5 uppercase tracking-tighter">Unidades</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold uppercase text-orange-500 mb-1">Sobras (+)</span>
                                <span className="text-2xl font-bold text-orange-700">{(lightDivergenceItems + highDivergenceItems).toLocaleString('pt-BR')} <span className="text-sm font-medium">un div</span></span>
                                <span className="text-xs font-bold text-orange-600 mt-1">+ R$ {positiveValueDiv.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold uppercase text-red-500 mb-1">Faltas (-)</span>
                                <span className="text-2xl font-bold text-red-700">{divergentItems.toLocaleString('pt-BR')} <span className="text-sm font-medium">itens</span></span>
                                <span className="text-xs font-bold text-red-600 mt-1">- R$ {negativeValueDiv.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="h-80 bg-white border border-slate-100 rounded-lg p-4 flex flex-col shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-600 mb-4 text-center">Proporção Geral</h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} fill="#8884d8" paddingAngle={5} dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} itens`, 'Quantidade']} />
                                            <Legend verticalAlign="bottom" height={36}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="h-80 bg-white border border-slate-100 rounded-lg p-4 flex flex-col shadow-sm">
                                <h4 className="text-sm font-semibold text-slate-600 mb-4 text-center">Divergências por Categoria</h4>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={categoryStats} margin={{ top: 20, right: 30, left: -20, bottom: 25 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-45} textAnchor="end" />
                                            <YAxis allowDecimals={false} tick={{fontSize: 11, fill: '#64748b'}} />
                                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                            <Bar dataKey="Divergentes" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]}>
                                                <LabelList dataKey="Divergentes" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                                            </Bar>
                                            <Bar dataKey="Corretos" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]}>
                                                <LabelList dataKey="Corretos" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" formatter={(val) => val > 0 ? val : ''} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {historicalData.length > 0 && (
                            <div className="mt-8 bg-white border border-slate-100 rounded-lg p-6 flex flex-col shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                                    <h4 className="text-sm font-semibold text-slate-800 text-center md:text-left">
                                        Evolução Histórica de Métricas
                                    </h4>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setHistoryMode('semanal')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${historyMode === 'semanal' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Semanais
                                        </button>
                                        <button 
                                            onClick={() => setHistoryMode('diaria')}
                                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${historyMode === 'diaria' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Diárias
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 justify-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {Object.keys(activeMetrics).map(metric => (
                                        <label key={metric} className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={activeMetrics[metric]} 
                                                onChange={() => toggleMetric(metric)} 
                                                className="w-4 h-4 rounded cursor-pointer border-slate-300 focus:ring-0" 
                                                style={{accentColor: metricColors[metric]}} 
                                            />
                                            {metric}
                                        </label>
                                    ))}
                                </div>

                                <div className="h-80 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={historicalData} margin={{ top: 20, right: 30, left: -20, bottom: 25 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
                                            <YAxis yAxisId="left" allowDecimals={false} tick={{fontSize: 11, fill: '#64748b'}} />
                                            {(activeMetrics['Acurácia (%)'] || activeMetrics['Acurácia Unidades (%)']) && (
                                                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tick={{fontSize: 11, fill: '#64748b'}} tickFormatter={(val) => `${val}%`} />
                                            )}
                                            <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value, name) => [name.includes('Acurácia') ? `${value}%` : value, name]} />
                                            <Legend verticalAlign="bottom" height={36}/>
                                            {Object.keys(activeMetrics).map(metric => activeMetrics[metric] && (
                                                <Line key={metric} yAxisId={metric.includes('Acurácia') ? 'right' : 'left'} type="monotone" dataKey={metric} name={metric} stroke={metricColors[metric]} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}}>
                                                    <LabelList dataKey={metric} position="top" fill={metricColors[metric]} fontSize={11} fontWeight="bold" offset={10} formatter={(val) => val > 0 ? (metric.includes('Acurácia') ? `${val}%` : val) : ''} />
                                                </Line>
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* TOP 5 DIVERGÊNCIAS DO MÊS */}
                        <div className="mt-8 bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <span className="w-2 h-5 bg-gradient-to-b from-blue-500 to-red-500 rounded-full inline-block"></span>
                                    Top 5 Divergências do Mês
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-medium">Mês:</span>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                        className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors shadow-sm"
                                    >
                                        {monthNames.map((name, i) => (
                                            <option key={i+1} value={i+1}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* TOP 5 POSITIVAS */}
                                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">+</div>
                                        <div>
                                            <h5 className="text-sm font-bold text-blue-900">Top 5 — Sobras (positivo)</h5>
                                            <p className="text-xs text-blue-600">Produtos contados acima do teórico</p>
                                        </div>
                                    </div>
                                    {top5Data.positive.length === 0 ? (
                                        <div className="text-center py-6 text-blue-400 text-sm font-medium">Nenhuma sobra encontrada em {monthNames[selectedMonth-1]}</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {top5Data.positive.map((product, idx) => {
                                                const maxVal = top5Data.positive[0]?.positive || 1;
                                                const pct = (product.positive / maxVal) * 100;
                                                return (
                                                    <div key={product.nome} className="bg-white rounded-lg p-3 border border-blue-100">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xs font-black text-blue-400 w-5 shrink-0">#{idx+1}</span>
                                                                <span className="text-xs font-bold text-slate-800 uppercase truncate">{product.nome}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                <span className="text-xs text-slate-500 font-medium">{product.occurrences}x</span>
                                                                <span className="text-sm font-black text-blue-600">+{product.positive.toLocaleString('pt-BR')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-blue-100 rounded-full h-1.5">
                                                            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{width: `${pct}%`}}></div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{product.categoria}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* TOP 5 NEGATIVAS */}
                                <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">-</div>
                                        <div>
                                            <h5 className="text-sm font-bold text-red-900">Top 5 — Faltas (negativo)</h5>
                                            <p className="text-xs text-red-600">Produtos contados abaixo do teórico</p>
                                        </div>
                                    </div>
                                    {top5Data.negative.length === 0 ? (
                                        <div className="text-center py-6 text-red-400 text-sm font-medium">Nenhuma falta encontrada em {monthNames[selectedMonth-1]}</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {top5Data.negative.map((product, idx) => {
                                                const maxVal = top5Data.negative[0]?.negative || 1;
                                                const pct = (product.negative / maxVal) * 100;
                                                return (
                                                    <div key={product.nome} className="bg-white rounded-lg p-3 border border-red-100">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-xs font-black text-red-400 w-5 shrink-0">#{idx+1}</span>
                                                                <span className="text-xs font-bold text-slate-800 uppercase truncate">{product.nome}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                                <span className="text-xs text-slate-500 font-medium">{product.occurrences}x</span>
                                                                <span className="text-sm font-black text-red-600">-{product.negative.toLocaleString('pt-BR')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-red-100 rounded-full h-1.5">
                                                            <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{width: `${pct}%`}}></div>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium">{product.categoria}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };
window.EvolutionReport = EvolutionReport;
