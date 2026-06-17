const MovementsMatrix = ({ selectedLocation, productCatalog, categories, dynamicMasterList, stockFlow, onFlowUpdate, onBulkFlowUpdate }) => {
    const { useState, useMemo, useRef, useEffect } = window.React || window;
    const { ChevronLeft, ChevronRight, Activity, Download, Upload, X, FileText, Calendar, Check, AlertCircle } = window;
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysArray = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }, [daysInMonth]);

    const tableContainerRef = useRef(null);

    useEffect(() => {
        if (!tableContainerRef.current) return;
        
        const today = new Date();
        let targetDay = 1;
        
        if (currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
            targetDay = today.getDate() - 1; 
            if (targetDay < 1) targetDay = 1;
        } else if (currentYear < today.getFullYear() || (currentYear === today.getFullYear() && currentMonth < today.getMonth())) {
            targetDay = daysInMonth;
        }
        
        setTimeout(() => {
            if (!tableContainerRef.current) return;
            const th = tableContainerRef.current.querySelector(`th[data-day="${targetDay}"]`);
            if (th) {
                const containerRect = tableContainerRef.current.getBoundingClientRect();
                const thRect = th.getBoundingClientRect();
                const scrollPos = tableContainerRef.current.scrollLeft + (thRect.left - containerRect.left) - (containerRect.width / 2) + (thRect.width / 2);
                
                tableContainerRef.current.scrollTo({
                    left: scrollPos > 0 ? scrollPos : 0,
                    behavior: 'smooth'
                });
            }
        }, 150);
    }, [currentMonth, currentYear, daysInMonth]);

    const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));

    // Prepare active products grouped by category
    const activeProductsByCategory = useMemo(() => {
        const result = {};
        categories.forEach(cat => {
            const list = dynamicMasterList[cat.id] || [];
            // Filter only active ones, just in case
            result[cat.id] = list.filter(pName => productCatalog[pName]?.active !== false);
        });
        return result;
    }, [categories, dynamicMasterList, productCatalog]);

    const handleInputChange = (category, productName, type, value, day) => {
        const dd = day.toString().padStart(2, '0');
        const mm = (currentMonth + 1).toString().padStart(2, '0');
        const dateStr = `${dd}/${mm}`;
        onFlowUpdate(category, productName, type, value, dateStr);
    };

    const getFlowValue = (category, productName, type, day) => {
        const dd = day.toString().padStart(2, '0');
        const mm = (currentMonth + 1).toString().padStart(2, '0');
        const dateStr = `${dd}/${mm}`;
        const keyDaily = window.getDatasetKey(selectedLocation, dateStr, 'diaria');
        return stockFlow[keyDaily]?.[category]?.[productName]?.[type] || '';
    };

    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [uploadMode, setUploadMode] = useState('daily');
    const [selectedDay, setSelectedDay] = useState(1);
    const fileInputRef = useRef(null);

    const executeSync = () => {
        const mm = (currentMonth + 1).toString().padStart(2, '0');
        const updatesByKey = {};
        let hasData = false;
        
        daysArray.forEach(day => {
            const dd = day.toString().padStart(2, '0');
            const dateStr = `${dd}/${mm}`;
            const keyWeekly = window.getDatasetKey(selectedLocation, dateStr, 'semanal');
            const keyDaily = window.getDatasetKey(selectedLocation, dateStr, 'diaria');
            
            const weeklyData = stockFlow[keyWeekly];
            if (weeklyData) {
                Object.keys(weeklyData).forEach(cat => {
                    Object.keys(weeklyData[cat]).forEach(prod => {
                        const entry = weeklyData[cat][prod]?.entry || 0;
                        const exit = weeklyData[cat][prod]?.exit || 0;
                        
                        if (entry > 0 || exit > 0) {
                            if (!updatesByKey[keyDaily]) updatesByKey[keyDaily] = {};
                            if (!updatesByKey[keyDaily][cat]) updatesByKey[keyDaily][cat] = {};
                            updatesByKey[keyDaily][cat][prod] = { entry: entry, exit: exit };
                            hasData = true;
                        }
                    });
                });
            }
        });
        
        if (hasData && onBulkFlowUpdate) {
            onBulkFlowUpdate(updatesByKey);
            setSyncResult({ success: true, message: "Sincronização concluída com sucesso! Todos os dados de entrada e saída foram importados para a matriz diária." });
        } else {
            setSyncResult({ success: false, message: "Nenhuma entrada ou saída encontrada nas contagens do Controle de Estoque (semanal/mensal) para este mês." });
        }
    };

    const handleSyncFromControleEstoque = () => {
        setSyncResult(null);
        setShowSyncModal(true);
    };

    const handleDownloadDaily = () => {
        if (!window.XLSX) { alert("Biblioteca XLSX não carregada."); return; }
        const rows = [["CATEGORIA", "PRODUTO", "ENTRADA", "SAÍDA"]];
        categories.forEach(cat => {
            if(activeProductsByCategory[cat.id]) {
                activeProductsByCategory[cat.id].forEach(product => {
                    rows.push([cat.name, product, "", ""]);
                });
            }
        });
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }];
        window.XLSX.utils.book_append_sheet(wb, ws, "Modelo Entrada e Saída");
        const dd = selectedDay.toString().padStart(2, '0');
        const mm = (currentMonth + 1).toString().padStart(2, '0');
        window.XLSX.writeFile(wb, `Modelo_Movimentacao_Diaria_${dd}_${mm}.xlsx`);
        setShowDownloadModal(false);
    };

    const handleDownloadMonthly = () => {
        if (!window.XLSX) { alert("Biblioteca XLSX não carregada."); return; }
        const headers = ["CATEGORIA", "PRODUTO"];
        daysArray.forEach(day => {
            const dd = day.toString().padStart(2, '0');
            headers.push(`DIA ${dd} - ENTRADA`);
            headers.push(`DIA ${dd} - SAÍDA`);
        });
        const rows = [headers];
        categories.forEach(cat => {
            if(activeProductsByCategory[cat.id]) {
                activeProductsByCategory[cat.id].forEach(product => {
                    const row = [cat.name, product];
                    daysArray.forEach(day => {
                        const valIn = getFlowValue(cat.id, product, 'entry', day);
                        const valOut = getFlowValue(cat.id, product, 'exit', day);
                        row.push(valIn !== '' ? valIn : "");
                        row.push(valOut !== '' ? valOut : "");
                    });
                    rows.push(row);
                });
            }
        });
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet(rows);
        const cols = [{ wch: 20 }, { wch: 40 }];
        daysArray.forEach(() => { cols.push({ wch: 15 }); cols.push({ wch: 15 }); });
        ws['!cols'] = cols;
        window.XLSX.utils.book_append_sheet(wb, ws, "Movimentação Mensal");
        const mm = (currentMonth + 1).toString().padStart(2, '0');
        window.XLSX.writeFile(wb, `Movimentacao_Mensal_${mm}_${currentYear}.xlsx`);
        setShowDownloadModal(false);
    };

    const triggerUpload = (mode) => {
        setUploadMode(mode);
        fileInputRef.current.click();
    };

    const handleFileUpload = (e) => {
        if (!window.XLSX) return;
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target.result;
            const wb = window.XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = window.XLSX.utils.sheet_to_json(ws);
            
            const mm = (currentMonth + 1).toString().padStart(2, '0');
            const updatesByKey = {};
            
            if (uploadMode === 'daily') {
                const dd = selectedDay.toString().padStart(2, '0');
                const key = window.getDatasetKey(selectedLocation, `${dd}/${mm}`, 'diaria');
                updatesByKey[key] = {};
                
                data.forEach(row => {
                    const produto = row["PRODUTO"];
                    const entrada = row["ENTRADA"] !== undefined && row["ENTRADA"] !== "" ? parseInt(row["ENTRADA"]) : 0;
                    const saida = (row["SAÍDA"] !== undefined && row["SAÍDA"] !== "") ? parseInt(row["SAÍDA"]) : 
                                  (row["SAIDA"] !== undefined && row["SAIDA"] !== "") ? parseInt(row["SAIDA"]) : 0;
                    if (produto) {
                        let categoryKey = null;
                        for (const [catId, list] of Object.entries(dynamicMasterList)) {
                            if (list.includes(produto)) { categoryKey = catId; break; }
                        }
                        if (categoryKey) {
                            if (!updatesByKey[key][categoryKey]) updatesByKey[key][categoryKey] = {};
                            updatesByKey[key][categoryKey][produto] = { entry: entrada, exit: saida };
                        }
                    }
                });
            } else if (uploadMode === 'monthly') {
                data.forEach(row => {
                    const produto = row["PRODUTO"];
                    if (produto) {
                        let categoryKey = null;
                        for (const [catId, list] of Object.entries(dynamicMasterList)) {
                            if (list.includes(produto)) { categoryKey = catId; break; }
                        }
                        if (categoryKey) {
                            daysArray.forEach(day => {
                                const dd = day.toString().padStart(2, '0');
                                const colIn = `DIA ${dd} - ENTRADA`;
                                const colOut = `DIA ${dd} - SAÍDA`;
                                const colOutAlt = `DIA ${dd} - SAIDA`;
                                
                                const entrada = (row[colIn] !== undefined && row[colIn] !== "") ? parseInt(row[colIn]) : 0;
                                const saida = (row[colOut] !== undefined && row[colOut] !== "") ? parseInt(row[colOut]) : 
                                              (row[colOutAlt] !== undefined && row[colOutAlt] !== "") ? parseInt(row[colOutAlt]) : 0;
                                
                                const key = window.getDatasetKey(selectedLocation, `${dd}/${mm}`, 'diaria');
                                if (!updatesByKey[key]) updatesByKey[key] = {};
                                if (!updatesByKey[key][categoryKey]) updatesByKey[key][categoryKey] = {};
                                updatesByKey[key][categoryKey][produto] = { entry: entrada, exit: saida };
                            });
                        }
                    }
                });
            }
            
            if (onBulkFlowUpdate) {
                onBulkFlowUpdate(updatesByKey);
            }
        };
        reader.readAsBinaryString(file);
        
        e.target.value = null;
        setShowUploadModal(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            {/* Header / Month Selector */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Activity size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 leading-tight">Movimentação Diária</h2>
                        <p className="text-xs text-slate-500">Entradas e saídas de produtos no mês</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="font-bold text-slate-700 w-32 text-center uppercase tracking-wider text-sm">
                            {monthNames[currentMonth]} {currentYear}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    
                    <button onClick={handleSyncFromControleEstoque} className="flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border border-blue-200" title="Sincronizar Controle de Estoque">
                        <Activity size={16} /> <span className="hidden xl:inline">Sincronizar Contagens</span>
                    </button>

                    <button onClick={() => setShowDownloadModal(true)} className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border border-slate-200" title="Baixar Modelo">
                        <Download size={16} /> <span className="hidden xl:inline">Baixar Modelo</span>
                    </button>
                    <button onClick={() => setShowUploadModal(true)} className="flex items-center justify-center gap-1 bg-[#003d33] hover:bg-[#002922] text-white px-3 py-2 rounded-xl text-sm font-bold transition-all shadow-sm" title="Importar Planilha">
                        <Upload size={16} /> <span className="hidden xl:inline">Importar</span>
                    </button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />

            {/* Matrix Container */}
            <div ref={tableContainerRef} className="overflow-auto flex-1 bg-slate-50/30">
                <table className="w-full text-sm text-left border-collapse min-w-max">
                    <thead className="sticky top-0 z-20 bg-[#003d33] text-white text-xs uppercase shadow-sm">
                        <tr>
                            <th className="px-4 py-3 font-semibold sticky left-0 z-30 bg-[#003d33] shadow-[2px_0_5px_rgba(0,0,0,0.1)] min-w-[200px]">
                                Categoria / Produto
                            </th>
                            {daysArray.map(day => (
                                <th key={day} data-day={day} className="px-2 py-3 text-center border-l border-white/10 min-w-[90px]">
                                    Dia {day.toString().padStart(2, '0')}
                                    <div className="flex justify-between mt-2 text-[10px] text-white/70 px-1">
                                        <span className="w-1/2 text-center" title="Entrada">E</span>
                                        <span className="w-1/2 text-center border-l border-white/20" title="Saída">S</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {categories.map(cat => {
                            let products = activeProductsByCategory[cat.id];
                            if (!products || products.length === 0) return null;
                            products = [...products].sort((a, b) => a.localeCompare(b));

                            return (
                                <React.Fragment key={cat.id}>
                                    {/* Category Header Row */}
                                    <tr className="bg-slate-100/80">
                                        <td className="px-4 py-2 font-bold text-slate-700 text-xs sticky left-0 z-10 bg-slate-100/80 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                                            {cat.name}
                                        </td>
                                        {daysArray.map(day => (
                                            <td key={`cat-${day}`} className="border-l border-slate-200 bg-slate-50"></td>
                                        ))}
                                    </tr>

                                    {/* Product Rows */}
                                    {products.map(productName => {
                                        const displayCode = productCatalog?.[productName]?.code || '-';
                                        return (
                                            <tr key={productName} className="hover:bg-blue-50/50 transition-colors bg-white group">
                                                <td className="px-4 py-2 text-xs font-semibold text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 shadow-[2px_0_5px_rgba(0,0,0,0.02)] border-r border-slate-200 truncate max-w-[250px]" title={productName}>
                                                    <span className="text-slate-400 font-bold mr-2">{displayCode}</span>
                                                    {productName}
                                                </td>
                                                {daysArray.map(day => {
                                                    const valIn = getFlowValue(cat.id, productName, 'entry', day);
                                                    const valOut = getFlowValue(cat.id, productName, 'exit', day);
                                                    
                                                    return (
                                                        <td key={`${productName}-${day}`} className="border-l border-slate-200 px-1 py-1 align-middle">
                                                            <div className="flex gap-1 h-full">
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={valIn}
                                                                    onChange={(e) => handleInputChange(cat.id, productName, 'entry', e.target.value, day)}
                                                                    className={`w-full h-8 text-center text-xs rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors hide-arrows ${valIn > 0 ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-transparent text-slate-600'}`}
                                                                    placeholder="-"
                                                                />
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    value={valOut}
                                                                    onChange={(e) => handleInputChange(cat.id, productName, 'exit', e.target.value, day)}
                                                                    className={`w-full h-8 text-center text-xs rounded border border-transparent hover:border-slate-300 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors hide-arrows border-l border-slate-100 ${valOut > 0 ? 'bg-red-50 text-red-700 font-bold' : 'bg-transparent text-slate-600'}`}
                                                                    placeholder="-"
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .hide-arrows::-webkit-outer-spin-button,
                .hide-arrows::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .hide-arrows {
                    -moz-appearance: textfield;
                }
            `}} />

            {/* DOWNLOAD MODAL */}
            {showDownloadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Download className="text-slate-500" size={20} />
                                Baixar Modelo Excel
                            </h3>
                            <button onClick={() => setShowDownloadModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-6 text-sm">Selecione o formato de modelo que deseja baixar:</p>
                            <div className="flex flex-col gap-3">
                                <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-all flex flex-col gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Modelo Diário</p>
                                            <p className="text-xs text-slate-500">Duas colunas (Entrada e Saída) para um dia específico.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 pl-14">
                                        <span className="text-sm font-semibold text-slate-600">Dia:</span>
                                        <select 
                                            value={selectedDay} 
                                            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                                            className="border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500 w-20"
                                        >
                                            {daysArray.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <button onClick={handleDownloadDaily} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex-1">
                                            Baixar
                                        </button>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={handleDownloadMonthly}
                                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-[#00a86b] hover:bg-[#00a86b]/5 transition-all text-left"
                                >
                                    <div className="bg-[#00a86b]/10 p-2 rounded-lg text-[#00a86b]">
                                        <Calendar size={24} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">Modelo Mensal</p>
                                        <p className="text-xs text-slate-500">Planilha longa contendo colunas para todos os dias do mês.</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Upload className="text-slate-500" size={20} />
                                Importar Planilha
                            </h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-slate-600 mb-6 text-sm">Selecione o formato da planilha que deseja importar:</p>
                            <div className="flex flex-col gap-3">
                                <div className="border border-slate-200 rounded-xl p-4 hover:border-blue-500 transition-all flex flex-col gap-3">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">Formato Diário</p>
                                            <p className="text-xs text-slate-500">Selecione para qual dia esses dados serão importados.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 pl-14">
                                        <span className="text-sm font-semibold text-slate-600">Dia:</span>
                                        <select 
                                            value={selectedDay} 
                                            onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                                            className="border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-500 w-20"
                                        >
                                            {daysArray.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <button onClick={() => triggerUpload('daily')} className="bg-[#003d33] text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#002922] transition-colors flex-1 flex items-center justify-center gap-1">
                                            <Upload size={14}/> Importar
                                        </button>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => triggerUpload('monthly')}
                                    className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-[#00a86b] hover:bg-[#00a86b]/5 transition-all text-left"
                                >
                                    <div className="bg-[#00a86b]/10 p-2 rounded-lg text-[#00a86b]">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800">Formato Mensal</p>
                                        <p className="text-xs text-slate-500">O sistema lerá todos os dias e atualizará o mês inteiro.</p>
                                    </div>
                                    <div className="bg-[#003d33] p-1.5 rounded-lg text-white">
                                        <Upload size={16} />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SYNC MODAL */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Activity className="text-blue-500" size={20} />
                                Sincronizar Contagens
                            </h3>
                            <button onClick={() => setShowSyncModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {!syncResult ? (
                                <>
                                    <p className="text-slate-600 mb-6 text-sm">
                                        Deseja importar as entradas e saídas registradas no <strong>Controle de Estoque</strong> para este mês?
                                        <br/><br/>
                                        Isso irá escanear todas as contagens (semanais ou mensais) feitas neste mês e copiará as quantidades digitadas de entradas e saídas para esta matriz diária.
                                    </p>
                                    <div className="flex gap-3 justify-end mt-4">
                                        <button onClick={() => setShowSyncModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                            Cancelar
                                        </button>
                                        <button onClick={executeSync} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors flex items-center gap-2">
                                            <Activity size={16} /> Confirmar Sincronização
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${syncResult.success ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {syncResult.success ? <Check size={32} /> : <AlertCircle size={32} />}
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 mb-2">
                                        {syncResult.success ? 'Sincronização Concluída' : 'Aviso'}
                                    </h4>
                                    <p className="text-slate-600 text-sm mb-6">
                                        {syncResult.message}
                                    </p>
                                    <button onClick={() => setShowSyncModal(false)} className="w-full px-4 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm transition-colors">
                                        Fechar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

window.MovementsMatrix = MovementsMatrix;
