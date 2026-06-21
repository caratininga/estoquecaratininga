        const buildInitialCatalog = (masterList) => {
            const catalog = {};
            for (const [categoryKey, items] of Object.entries(masterList)) {
                items.forEach(itemName => {
                    catalog[itemName] = {
                        name: itemName,
                        code: "",
                        category: categoryKey,
                        unitValue: 0,
                        active: true
                    };
                });
            }
            return catalog;
        };

        
        const getDatasetKey = window.getDatasetKey;
        const getDatesForLocation = window.getDatesForLocation;
        const generateCompleteDataSet = window.generateCompleteDataSet;

        const CustomDatePicker = ({ selectedDate, availableDates, onSelectDate, dailyDates = [] }) => {
            const [isOpen, setIsOpen] = useState(false);
            const [currentMonth, setCurrentMonth] = useState(() => {
                const parts = selectedDate.split('/');
                return parts.length === 2 ? (parseInt(parts[1], 10) || 6) : 6;
            });

            const daysInMonth = new Date(new Date().getFullYear(), currentMonth, 0).getDate();
            const firstDay = new Date(new Date().getFullYear(), currentMonth - 1, 1).getDay(); 
            
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

            const handlePrevMonth = () => setCurrentMonth(prev => prev === 1 ? 12 : prev - 1);
            const handleNextMonth = () => setCurrentMonth(prev => prev === 12 ? 1 : prev + 1);

            const handleSelect = (dayNum) => {
                const dd = dayNum.toString().padStart(2, '0');
                const mm = currentMonth.toString().padStart(2, '0');
                onSelectDate(`${dd}/${mm}`);
                setIsOpen(false);
            };

            const generateDays = () => {
                const blanks = Array.from({ length: firstDay }).map((_, i) => <div key={`blank-${i}`} className="w-6 h-6"></div>);
                const days = Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dd = dayNum.toString().padStart(2, '0');
                    const mm = currentMonth.toString().padStart(2, '0');
                    const dateStr = `${dd}/${mm}`;
                    const isSelected = dateStr === selectedDate;
                    const hasData = availableDates.includes(dateStr);
                    const isDaily = dailyDates.includes(dateStr);
                    
                    let colorClass = "text-slate-500 hover:bg-slate-100 bg-slate-50";
                    if (isSelected) colorClass = "bg-[#00a86b] text-white font-bold shadow-sm z-10";
                    else if (isDaily) colorClass = "bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 border border-blue-200";
                    else if (hasData) colorClass = "bg-green-100 text-[#00a86b] font-bold hover:bg-green-200 border border-green-200";

                    return (
                        <button
                            key={dayNum}
                            onClick={() => handleSelect(dayNum)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-xs transition-all ${colorClass}`}
                            title={isDaily ? 'Contagem Diária' : (hasData ? 'Contagem Semanal' : '')}
                        >
                            {dayNum}
                        </button>
                    );
                });
                return [...blanks, ...days];
            };

            return (
                <div className="relative">
                    <div 
                        className="flex items-center justify-between bg-transparent text-sm font-bold text-slate-800 outline-none w-20 cursor-pointer hover:text-[#00a86b] transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {selectedDate} <Calendar size={14} className="ml-1 text-slate-400" />
                    </div>
                
                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xl z-40 w-56 select-none">
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">&lt;</button>
                                    <span className="font-bold text-slate-700 text-sm">{monthNames[currentMonth - 1]}</span>
                                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors">&gt;</button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                                    {['D','S','T','Q','Q','S','S'].map((d,i) => <div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1 place-items-center">
                                    {generateDays()}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            );
        };

        const App = () => {
            const fileInputRef = useRef(null);
            const countingFileInputRef = useRef(null); 
            
            const [selectedLocation, setSelectedLocation] = useState(() => localStorage.getItem('estoque_location') || 'Tianguá');
            const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
            const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('estoque_date') || '02/02');
            const [viewMode, setViewMode] = useState(() => localStorage.getItem('estoque_viewMode') || 'counting');
            const [selectedCountType, setSelectedCountType] = useState(() => localStorage.getItem('estoque_countType') || 'semanal');
            const [hideZeroProducts, setHideZeroProducts] = useState(false);
            
            const [user, setUser] = useState(null);
            const [isCheckingAuth, setIsCheckingAuth] = useState(true);
            const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
            const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
            const [printMode, setPrintMode] = useState('full');
            const [isLoading, setIsLoading] = useState(false);
            const [migrationProgress, setMigrationProgress] = useState(null);
            const [linkCopied, setLinkCopied] = useState(false);
            const [linkModalData, setLinkModalData] = useState(null);
            const [linkShowExpected, setLinkShowExpected] = useState(false);
            
            const [stockFlow, setStockFlow] = useState({});
            const [dataSets, setDataSets] = useState({}); 
            const [productCatalog, setProductCatalog] = useState({});
            
            const [categories, setCategories] = useState([
                { id: 'aguas', name: 'ÁGUAS', type: 'grid' },
                { id: 'cervejas', name: 'CERVEJAS', type: 'grid' },
                { id: 'zero_energeticos', name: 'ZERO & ENERGÉTICOS', type: 'grid' },
                { id: 'refrigerantes', name: 'REFRIGERANTES', type: 'grid' },
                { id: 'sucos', name: 'SUCOS', type: 'grid' },
                { id: 'sobremesas', name: 'SOBREMESAS', type: 'grid' },
                { id: 'destilados', name: 'DESTILADOS', type: 'list' },
                { id: 'picoles', name: 'PICOLÉS', type: 'list' },
                { id: 'jarras_tacas', name: 'JARRAS E TAÇAS', type: 'list' }
            ]);

            const dynamicMasterList = useMemo(() => {
                if (Object.keys(productCatalog).length === 0) return window.MASTER_LIST;
                const ml = {};
                categories.forEach(c => ml[c.id] = []);
                
                Object.values(productCatalog).forEach(p => {
                    if (p.active) {
                        if (!ml[p.category]) ml[p.category] = [];
                        ml[p.category].push(p.name);
                    }
                });
                return ml;
            }, [productCatalog, categories]);



            const [isPrintSheetMode, setIsPrintSheetMode] = useState(false);
            const [showPrintSheetModal, setShowPrintSheetModal] = useState(false);
            const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
            const [alertMessage, setAlertMessage] = useState(null);

            const customAlert = (msg) => setAlertMessage(msg);

            // Reset editing when date or location changes


            // Auto-select count type when navigating to a date:
            // prefer weekly; if only daily exists, switch to daily.
            // Uses a ref to track previous date/location so this only fires on navigation, not on every dataSets update.
            const prevNavRef = window.React.useRef({ date: selectedDate, location: selectedLocation });
            const initialDataLoadRef = window.React.useRef(false);
            
            useEffect(() => {
                const isDataLoaded = Object.keys(dataSets).length > 0;
                const navChanged = prevNavRef.current.date !== selectedDate || prevNavRef.current.location !== selectedLocation;
                prevNavRef.current = { date: selectedDate, location: selectedLocation };
                
                // Only run on navigation OR on the very first time data is loaded
                if (!navChanged && (initialDataLoadRef.current || !isDataLoaded)) return;
                if (isDataLoaded) initialDataLoadRef.current = true;

                const weeklyKey = getDatasetKey(selectedLocation, selectedDate, 'semanal');
                const dailyKey  = getDatasetKey(selectedLocation, selectedDate, 'diaria');
                const hasWeekly = !!dataSets[weeklyKey];
                const hasDaily  = !!dataSets[dailyKey];
                
                // If we are currently on a daily count and user refreshes, we want to stay on daily count if it exists.
                // Wait, if it's the initial load and the user was looking at daily, we should restore it.
                // But we don't save countType in localStorage. We just default to weekly unless only daily exists.
                if (!hasWeekly && hasDaily) setSelectedCountType('diaria');
                else if (navChanged) setSelectedCountType('semanal');
            }, [selectedDate, selectedLocation, dataSets]);

            useEffect(() => { localStorage.setItem('estoque_location', selectedLocation); }, [selectedLocation]);
            useEffect(() => { localStorage.setItem('estoque_date', selectedDate); }, [selectedDate]);
            useEffect(() => { localStorage.setItem('estoque_viewMode', viewMode); }, [viewMode]);
            useEffect(() => { localStorage.setItem('estoque_countType', selectedCountType); }, [selectedCountType]);

            const [authError, setAuthError] = useState('');

            useEffect(() => {
                let unsubscribeFn;
                let timeoutId;

                const initAuth = () => {
                    try {
                        unsubscribeFn = window.onAuthStateChanged(window.auth, (currentUser) => {
                            setUser(currentUser);
                            setIsCheckingAuth(false);
                            if (currentUser) handleLoadFromCloud();
                        });
                    } catch (err) {
                        setAuthError(err.toString());
                    }
                };

                if (window.auth && window.onAuthStateChanged) {
                    initAuth();
                } else {
                    const handleReady = () => initAuth();
                    window.addEventListener('firebase-ready', handleReady);
                    
                    timeoutId = setTimeout(() => {
                        if (isCheckingAuth) {
                            if (window.auth && window.onAuthStateChanged) initAuth();
                            else setAuthError("Timeout conectando ao banco de dados.");
                        }
                    }, 5000);

                    return () => {
                        window.removeEventListener('firebase-ready', handleReady);
                        if (timeoutId) clearTimeout(timeoutId);
                        if (unsubscribeFn) unsubscribeFn();
                    };
                }

                return () => {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (unsubscribeFn) unsubscribeFn();
                };
            }, []);

            const handleLogin = async (email, password) => { await window.signInWithEmailAndPassword(window.auth, email, password); };
            const handleLogout = async () => { await window.signOut(window.auth); setDataSets({}); setStockFlow({}); customAlert("Desconectado com sucesso."); };

            const handleLoadFromCloud = async () => {
                setIsLoading(true);
                try {
                    // Try to load from the NEW config
                    const configRef = window.doc(window.db, "estoque", "config");
                    const configSnap = await window.getDoc(configRef);
                    
                    if (configSnap.exists()) {
                        // NEW STRUCTURE IS ACTIVE
                        const configData = configSnap.data();
                        if (configData.categories) setCategories(configData.categories);
                        if (configData.productCatalog) setProductCatalog(configData.productCatalog);
                        else setProductCatalog(buildInitialCatalog(window.MASTER_LIST));
                        
                        // Load all counts from 'contagens' collection
                        const contagensSnap = await window.getDocs(window.collection(window.db, "contagens"));
                        const loadedDataSets = {};
                        const loadedStockFlow = {};
                        
                        contagensSnap.forEach((doc) => {
                            const countData = doc.data();
                            loadedDataSets[doc.id] = countData.dataSet || {};
                            loadedStockFlow[doc.id] = countData.stockFlow || {};
                        });
                        
                        setDataSets(loadedDataSets);
                        setStockFlow(loadedStockFlow);
                        console.log("Dados carregados da nuvem (nova estrutura).");
                    } else {
                        // NEW STRUCTURE DOES NOT EXIST. Load old 'geral' and MIGRATE.
                        console.log("Lendo documento antigo 'geral' para migração...");
                        const docRef = window.doc(window.db, "estoque", "geral");
                        const docSnap = await window.getDoc(docRef);
                        
                        let data = {};
                        let initialCat = buildInitialCatalog(window.MASTER_LIST);
                        let defaultCategories = [
                            { id: 'aguas', name: 'ÁGUAS', type: 'grid' },
                            { id: 'cervejas', name: 'CERVEJAS', type: 'grid' },
                            { id: 'zero_energeticos', name: 'ZERO & ENERGÉTICOS', type: 'grid' },
                            { id: 'refrigerantes', name: 'REFRIGERANTES', type: 'grid' },
                            { id: 'sucos', name: 'SUCOS', type: 'grid' },
                            { id: 'sobremesas', name: 'SOBREMESAS', type: 'grid' },
                            { id: 'destilados', name: 'DESTILADOS', type: 'list' },
                            { id: 'picoles', name: 'PICOLÉS', type: 'list' },
                            { id: 'jarras_tacas', name: 'JARRAS E TAÇAS', type: 'list' }
                        ];

                        if (docSnap.exists()) {
                            data = docSnap.data();
                            
                            // 1. Backup old document just in case
                            await window.setDoc(window.doc(window.db, "estoque", "geral_backup"), data);
                            console.log("Backup de 'geral' concluído.");
                        }

                        let dSets = data.dataSets || {};
                        let sFlow = data.stockFlow || {};
                        const catg = data.categories || defaultCategories;
                        const pCat = data.productCatalog || initialCat;

                        // SANITIZE KEYS to remove slashes (prevents Firebase subcollection permission errors)
                        const safeDSets = {};
                        for (const k of Object.keys(dSets)) { safeDSets[k.replace(/\//g, '_')] = dSets[k]; }
                        const safeSFlow = {};
                        for (const k of Object.keys(sFlow)) { safeSFlow[k.replace(/\//g, '_')] = sFlow[k]; }
                        dSets = safeDSets;
                        sFlow = safeSFlow;

                        // Set states
                        setDataSets(dSets);
                        setStockFlow(sFlow);
                        setCategories(catg);
                        setProductCatalog(pCat);

                        // MIGRATION PROCESS
                        // 1. Save config
                        await window.setDoc(configRef, { categories: catg, productCatalog: pCat });
                        
                        // 2. Save each count to a separate document
                        for (const key of Object.keys(dSets)) {
                            const countDocRef = window.doc(window.db, "contagens", key);
                            await window.setDoc(countDocRef, {
                                dataSet: dSets[key],
                                stockFlow: sFlow[key] || {}
                            });
                        }
                        
                        // 3. Clear heavy data from old doc (optional, to avoid keeping 1MB lying around, but we did backup)
                        if (docSnap.exists()) {
                            await window.updateDoc(docRef, {
                                dataSets: window.deleteField(),
                                stockFlow: window.deleteField()
                            });
                        }
                        
                        console.log("Migração concluída com sucesso!");
                    }
                } catch (error) { 
                    console.error("Error getting document: ", error); 
                } finally { 
                    setIsLoading(false); 
                }
            };

            const forceMigration = async () => {
                if (!window.confirm("Isso fará a migração forçada de 'estoque/geral' para a nova estrutura. Tem certeza?")) return;
                setMigrationProgress({ total: 0, current: 0, status: "Iniciando..." });
                try {
                    const docRef = window.doc(window.db, "estoque", "geral");
                    const docSnap = await window.getDoc(docRef);
                    if (!docSnap.exists()) {
                        setMigrationProgress({ status: "Documento 'geral' não encontrado!" });
                        setTimeout(() => setMigrationProgress(null), 3000);
                        return;
                    }
                    const data = docSnap.data();
                    const dSets = data.dataSets || {};
                    const sFlow = data.stockFlow || {};
                    
                    const keys = Object.keys(dSets);
                    setMigrationProgress({ total: keys.length, current: 0, status: "Migrando contagens..." });
                    
                    let count = 0;
                    for (const key of keys) {
                        const countDocRef = window.doc(window.db, "contagens", key);
                        await window.setDoc(countDocRef, {
                            dataSet: dSets[key],
                            stockFlow: sFlow[key] || {}
                        });
                        count++;
                        setMigrationProgress({ total: keys.length, current: count, status: `Migrando contagens... (${count}/${keys.length})` });
                    }
                    
                    setMigrationProgress({ total: keys.length, current: count, status: "Salvando catálogo e config..." });
                    const configRef = window.doc(window.db, "estoque", "config");
                    await window.setDoc(configRef, { 
                        categories: data.categories || categories, 
                        productCatalog: data.productCatalog || productCatalog 
                    }, { merge: true });
                    
                    setMigrationProgress({ total: keys.length, current: count, status: "Concluído! Limpando dados antigos..." });
                    
                    await window.updateDoc(docRef, {
                        dataSets: window.deleteField(),
                        stockFlow: window.deleteField()
                    });
                    
                    setMigrationProgress({ total: keys.length, current: count, status: "Limpeza concluída." });
                    customAlert("Migração concluída com sucesso! Recarregue a página.");
                    setTimeout(() => setMigrationProgress(null), 3000);
                } catch (e) {
                    console.error(e);
                    setMigrationProgress({ status: `Erro: ${e.message}` });
                    setTimeout(() => setMigrationProgress(null), 5000);
                }
            };


            const handleDeleteClick = () => setIsDeleteModalOpen(true);
            const confirmDeleteCount = async () => {
                try {
                    await window.deleteDoc(window.doc(window.db, "contagens", currentKey));
                    
                    const newDataSets = { ...dataSets };
                    delete newDataSets[currentKey];
                    const newStockFlow = { ...stockFlow };
                    delete newStockFlow[currentKey];
                    
                    setDataSets(newDataSets);
                    setStockFlow(newStockFlow);
                    setIsDeleteModalOpen(false);
                    customAlert("Contagem excluída com sucesso.");
                    const locDates = getDatesForLocation(selectedLocation, newDataSets);
                    if (locDates.length > 0) {
                        setSelectedDate(locDates[locDates.length - 1]);
                    } else {
                        setSelectedDate('02/02');
                    }
                } catch (e) {
                    console.error(e);
                    customAlert("Erro ao excluir contagem.");
                }
            };
            const handleUpdateCatalog = async (newCatalog) => {
                setProductCatalog(newCatalog);
                try {
                    await window.setDoc(window.doc(window.db, "estoque", "config"), { productCatalog: newCatalog }, { merge: true });
                } catch (e) {
                    console.error("Erro ao salvar catálogo", e);
                }
            };

            // ──────────────────────────────────────────────────
            // HELPER: para datas, ordena cronologicamente
            const sortDates = (dates) => [...dates].sort((a, b) => {
                const [d1, m1] = a.split('/').map(Number);
                const [d2, m2] = b.split('/').map(Number);
                return new Date(new Date().getFullYear(), m1-1, d1) - new Date(new Date().getFullYear(), m2-1, d2);
            });

            // Verifica se um dataset é contagem diária
            const isDatasetDaily = (ds) => ds?.countType === 'diaria';

            // Encontra a última contagem SEMANAL para um produto/localização antes de uma data
            const getLastWeeklyStockBase = (location, currentDate, allDataSets) => {
                const allDates = sortDates(getDatesForLocation(location, allDataSets));

                // currentDate may be a daily count not in allDates (daily adds _diaria suffix)
                // Ensure we can locate it
                let workDates = allDates;
                if (!workDates.includes(currentDate)) {
                    workDates = sortDates([...allDates, currentDate]);
                }
                const currentIndex = workDates.indexOf(currentDate);
                if (currentIndex <= 0) return { stockMap: {}, baseDate: null };

                // Walk backwards to find last WEEKLY count
                // Always check the semanal key explicitly (never the _diaria key)
                for (let i = currentIndex - 1; i >= 0; i--) {
                    const d = workDates[i];
                    const weeklyKey = getDatasetKey(location, d, 'semanal');
                    const ds = allDataSets[weeklyKey];
                    // Valid if dataset exists and is NOT marked as daily
                    if (ds && !isDatasetDaily(ds)) {
                        const stockMap = {};
                        const seen = new Set(); // prevent double-counting if product appears in multiple categories
                        categories.forEach(cat => {
                            if (ds[cat.id]) {
                                ds[cat.id].forEach(item => {
                                    if (seen.has(item.nome)) return;
                                    seen.add(item.nome);
                                    const total = cat.type === 'grid' 
                                        ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0))
                                        : (parseInt(item.qtd)||0);
                                    stockMap[item.nome] = total;
                                });
                            }
                        });
                        return { stockMap, baseDate: d };
                    }
                }
                return { stockMap: {}, baseDate: null };
            };

            // Acumula TODAS as movimentações entre baseDate (inclusive) e currentDate (exclusive)
            // Merges flow from both the semanal key and the _diaria key for each date
            const getAccumulatedFlow = (location, dateMap, currentDate, allDataSets, allStockFlow) => {
                const datesSet = new Set(getDatesForLocation(location, allDataSets));
                
                // Extrai também datas que só têm movimento e não têm ficha de contagem
                const locMap = { 'Matriz': 'matriz', 'Mucambo': 'mucambo', 'Tianguá': 'tiangua', 'Frecheirinha': 'frecheirinha' };
                const prefix = locMap[location] || location;
                Object.keys(allStockFlow || {}).forEach(k => {
                    if (k.startsWith(prefix + "_")) {
                        let datePart = k.replace(prefix + '_', '');
                        if (datePart.endsWith('_diaria')) datePart = datePart.slice(0, -7);
                        if (datePart.endsWith('_semanal')) datePart = datePart.slice(0, -8);
                        datesSet.add(datePart.replace('_', '/'));
                    }
                });
                
                const allDates = sortDates(Array.from(datesSet));
                const currentDateObj = (() => { const [d,m] = currentDate.split('/').map(Number); return new Date(new Date().getFullYear(), m-1, d); })();

                const isCurrentDaily = Object.keys(dateMap).some(k => k.endsWith('_diaria'));
                
                // Pega a data base de CADA produto chamando getPreviousStockValues diretamente!
                // Isso garante 100% de consistência com o que a UI está mostrando na coluna "Contagem Anterior"
                const { dateMap: prevDates } = getPreviousStockValues(location, currentDate, allDataSets, isCurrentDaily);
                
                const prevStockMap = {};
                Object.keys(prevDates).forEach(prod => {
                    // prevDates[prod] é tipo "15/06 (S)". Extraímos só os 5 primeiros caracteres "15/06"
                    prevStockMap[prod] = prevDates[prod].substring(0, 5);
                });

                // Encontra a data da última contagem SEMANAL (para usar como fallback)
                const weeklyDates = Object.keys(allDataSets)
                    .filter(k => k.startsWith(prefix + "_") && k.endsWith('_semanal'))
                    .map(k => {
                        const parts = k.replace(prefix + '_', '').slice(0, -8).split('_');
                        return `${parts[0]}/${parts[1]}`;
                    });
                
                const sortedWeeklyDates = sortDates(weeklyDates);
                const lastWeeklyDateStr = sortedWeeklyDates.reduce((found, d) => {
                    const [dd, mm] = d.split('/').map(Number);
                    const dObj = new Date(new Date().getFullYear(), mm-1, dd);
                    return dObj < currentDateObj ? d : found;
                }, null);
                const lastWeeklyDateObj = lastWeeklyDateStr ? (() => { 
                    const [d,m] = lastWeeklyDateStr.split('/').map(Number); 
                    return new Date(new Date().getFullYear(), m-1, d); 
                })() : null;

                const accumulated = {};

                const mergeFlow = (flow, dateObj, dStr) => {
                    if (!flow) return;
                    categories.forEach(cat => {
                        if (flow[cat.id]) {
                            Object.entries(flow[cat.id]).forEach(([productName, pFlow]) => {
                                const prodBaseDateStr = prevStockMap[productName];
                                const prodBaseDateObj = prodBaseDateStr ? (() => { 
                                    const [d,m] = prodBaseDateStr.split('/').map(Number); 
                                    return new Date(new Date().getFullYear(), m-1, d); 
                                })() : null;

                                const baseObj = prodBaseDateObj || lastWeeklyDateObj;
                                const isAfterBase = baseObj ? dateObj >= baseObj : true;
                                
                                const isBeforeCurrent = dateObj < currentDateObj;

                                if (!accumulated[productName]) {
                                    accumulated[productName] = { 
                                        entry: 0, exit: 0, formulaIn: [], formulaOut: [], 
                                        debugBase: prodBaseDateStr || (lastWeeklyDateStr ? `G:${lastWeeklyDateStr}` : 'ALL'),
                                        debugLogs: []
                                    };
                                }

                                if (isAfterBase && isBeforeCurrent) {
                                    const inVal = parseInt(pFlow.entry)||0;
                                    const outVal = parseInt(pFlow.exit)||0;
                                    accumulated[productName].entry += inVal;
                                    accumulated[productName].exit  += outVal;
                                    if (inVal > 0) accumulated[productName].formulaIn.push(`${dStr}:${inVal}`);
                                    if (outVal > 0) accumulated[productName].formulaOut.push(`${dStr}:${outVal}`);
                                    accumulated[productName].debugLogs.push(`Added ${dStr}`);
                                } else {
                                    accumulated[productName].debugLogs.push(`Skipped ${dStr} (A:${isAfterBase} B:${isBeforeCurrent})`);
                                }
                            });
                        }
                    });
                };

                allDates.forEach(d => {
                    const [dd, mm] = d.split('/').map(Number);
                    const dateObj = new Date(new Date().getFullYear(), mm-1, dd);
                    // Lê exclusivamente os fluxos salvos na Movimentação Mensal (_diaria)
                    mergeFlow(allStockFlow[getDatasetKey(location, d, 'diaria')], dateObj, d);
                });
                return accumulated;
            };

            function getPreviousStockValues(location, currentDate, allDataSets, isCurrentDaily = false) {
                const allDates = getDatesForLocation(location, allDataSets);
                if (!allDates.includes(currentDate)) allDates.push(currentDate);
                allDates.sort((a, b) => {
                    const [d1, m1] = a.split('/').map(Number);
                    const [d2, m2] = b.split('/').map(Number);
                    return new Date(new Date().getFullYear(), m1-1, d1) - new Date(new Date().getFullYear(), m2-1, d2);
                });

                const currentIndex = allDates.indexOf(currentDate);
                if (currentIndex <= 0) return { stockMap: {}, dateMap: {} };

                const stockMap = {};
                const dateMap = {};

                // Walk backwards to find the most recent count FOR EACH PRODUCT
                // Stop completely once we hit a weekly count (since it's a full inventory)
                for (let i = currentIndex - 1; i >= 0; i--) {
                    const prevDate = allDates[i];
                    
                    const dailyKey = getDatasetKey(location, prevDate, 'diaria');
                    const candidateDaily = allDataSets[dailyKey];
                    if (candidateDaily) {
                        categories.forEach(cat => {
                            if (candidateDaily[cat.id]) {
                                candidateDaily[cat.id].forEach(item => {
                                    const wasCounted = item.l1 !== 0 || item.l2 !== 0 || item.l3 !== 0 || item.l4 !== 0 || item.qtd !== 0;
                                    if (wasCounted && stockMap[item.nome] === undefined) {
                                        const total = cat.type === 'grid' 
                                            ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0))
                                            : (parseInt(item.qtd)||0);
                                        stockMap[item.nome] = total;
                                        dateMap[item.nome] = `${prevDate} (D)`;
                                    }
                                });
                            }
                        });
                    }

                    const weeklyKey = getDatasetKey(location, prevDate, 'semanal');
                    const candidate = allDataSets[weeklyKey];
                    if (candidate && !isDatasetDaily(candidate)) {
                        categories.forEach(cat => {
                            if (candidate[cat.id]) {
                                candidate[cat.id].forEach(item => {
                                    if (stockMap[item.nome] === undefined) {
                                        const total = cat.type === 'grid' 
                                            ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0))
                                            : (parseInt(item.qtd)||0);
                                        stockMap[item.nome] = total;
                                        dateMap[item.nome] = `${prevDate} (S)`;
                                    }
                                });
                            }
                        });
                        break; // Weekly count guarantees all products, stop walking back
                    }
                }
                return { stockMap, dateMap };
            };

            const getPreviousDateLabel = (current, location, allDataSets, isCurrentDaily = false) => {
                const allDates = getDatesForLocation(location, allDataSets);
                let tempDates = [...allDates];
                if (!tempDates.includes(current)) {
                    tempDates.push(current);
                    tempDates.sort((a, b) => {
                        const [d1, m1] = a.split('/').map(Number);
                        const [d2, m2] = b.split('/').map(Number);
                        return new Date(new Date().getFullYear(), m1-1, d1) - new Date(new Date().getFullYear(), m2-1, d2);
                    });
                }
                const idx = tempDates.indexOf(current);
                for (let i = idx - 1; i >= 0; i--) {
                    const d = tempDates[i];
                    
                    if (isCurrentDaily) {
                        const dailyKey = getDatasetKey(location, d, 'diaria');
                        if (allDataSets[dailyKey]) return `${d} (Diária)`;
                    }

                    const weeklyKey = getDatasetKey(location, d, 'semanal');
                    const candidate = allDataSets[weeklyKey];
                    if (candidate && !isDatasetDaily(candidate)) return d;
                }
                return null;
            };

            const currentKey = getDatasetKey(selectedLocation, selectedDate, selectedCountType);
            const isDailyCount = selectedCountType === 'diaria';

            // Detect which count types exist for the selected date
            const weeklyKeyForDate = getDatasetKey(selectedLocation, selectedDate, 'semanal');
            const dailyKeyForDate  = getDatasetKey(selectedLocation, selectedDate, 'diaria');
            const hasWeeklyForDate = !!dataSets[weeklyKeyForDate];
            const hasDailyForDate  = !!dataSets[dailyKeyForDate];
            const hasBothTypes = hasWeeklyForDate && hasDailyForDate;

            // For daily counts: find last weekly base
            const { stockMap: dailyBaseStockMap, baseDate: dailyBaseDate } = useMemo(() => {
                if (!isDailyCount) return { stockMap: {}, baseDate: null };
                return getLastWeeklyStockBase(selectedLocation, selectedDate, dataSets);
            }, [isDailyCount, selectedLocation, selectedDate, dataSets]);

            const currentData = useMemo(() => {
                const raw = dataSets[currentKey];
                const baseData = raw ? JSON.parse(JSON.stringify(raw)) : { responsavel: "", unidade: selectedLocation };

                // For daily count: only populate with selected products
                if (isDailyCount && raw?.selectedProducts) {
                    categories.forEach(cat => {
                        if (!baseData[cat.id]) baseData[cat.id] = [];
                        // Remove any products not in selectedProducts
                        baseData[cat.id] = baseData[cat.id].filter(p => raw.selectedProducts.includes(p.nome));
                        // Add missing selected products for this category
                        raw.selectedProducts.forEach(productName => {
                            const inThisCat = (dynamicMasterList[cat.id] || []).includes(productName);
                            if (inThisCat && !baseData[cat.id].find(p => p.nome === productName)) {
                                baseData[cat.id].push({
                                    nome: productName,
                                    l1: 0, l2: 0, l3: 0, l4: 0, qtd: 0,
                                    unitValue: productCatalog[productName]?.unitValues?.[selectedLocation] || 0,
                                    code: productCatalog[productName]?.code || ""
                                });
                            }
                        });
                    });
                    return baseData;
                }

                // Weekly count: populate all products as before
                categories.forEach(cat => {
                    if (!baseData[cat.id]) baseData[cat.id] = [];
                    if (dynamicMasterList[cat.id]) {
                        dynamicMasterList[cat.id].forEach(productName => {
                            if (!baseData[cat.id].find(p => p.nome === productName)) {
                                baseData[cat.id].push({
                                    nome: productName,
                                    l1: 0, l2: 0, l3: 0, l4: 0, qtd: 0,
                                    unitValue: productCatalog[productName]?.unitValues?.[selectedLocation] || productCatalog[productName]?.unitValue || 0,
                                    code: productCatalog[productName]?.code || ""
                                });
                            }
                        });
                    }
                });
                return baseData;
            }, [dataSets, currentKey, dynamicMasterList, selectedLocation, productCatalog, categories, isDailyCount]);

            const currentFlowData = stockFlow[currentKey] || {};

            // Both control and daily counts use the exact same calculation logic now
            // For daily count: the base is the absolute last count (weekly or daily)
            // For weekly count: the base is the absolute last WEEKLY count
            const prevStockResult = getPreviousStockValues(selectedLocation, selectedDate, dataSets, isDailyCount);
            const effectivePreviousStock = prevStockResult.stockMap;
            const previousDateMap = prevStockResult.dateMap;
            
            const accumulatedFlowData = getAccumulatedFlow(selectedLocation, previousDateMap, selectedDate, dataSets, stockFlow);
            const effectiveFlowData = accumulatedFlowData;

            const previousStockData = effectivePreviousStock;
            const previousDateLabel = getPreviousDateLabel(selectedDate, selectedLocation, dataSets, isDailyCount);

            // Calculate available dates for the buttons
            const availableDates = getDatesForLocation(selectedLocation, dataSets);
            // Always include the selected date even if it's new/empty
            if (!availableDates.includes(selectedDate)) availableDates.push(selectedDate);
            // Re-sort for display
            availableDates.sort((a, b) => {
                const [d1, m1] = a.split('/').map(Number);
                const [d2, m2] = b.split('/').map(Number);
                return new Date(new Date().getFullYear(), m1-1, d1) - new Date(new Date().getFullYear(), m2-1, d2);
            });

            const handleLocationChange = (newLoc) => {
                setSelectedLocation(newLoc);
                const locDates = getDatesForLocation(newLoc, dataSets);
                if (locDates.length > 0) {
                    if (!locDates.includes(selectedDate)) {
                        setSelectedDate(locDates[locDates.length - 1]);
                    }
                }
            };

            const pendingFirebaseUpdate = window.React.useRef({});
            const saveTimeoutRef = window.React.useRef(null);

            const scheduleSave = () => {
                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = setTimeout(() => {
                    if (Object.keys(pendingFirebaseUpdate.current).length > 0 && user) {
                        const updates = pendingFirebaseUpdate.current;
                        pendingFirebaseUpdate.current = {};
                        
                        Object.keys(updates).forEach(key => {
                            const countRef = window.doc(window.db, "contagens", key);
                            window.setDoc(countRef, {
                                ...updates[key],
                                lastUpdated: new Date().toISOString(),
                                updatedBy: user.email
                            }, { merge: true }).catch(e => console.error("Falha ao salvar dados", e));
                        });
                    }
                }, 1000);
            };

            const handleUpdate = (category, productName, field, value) => {
                const val = value === '' ? 0 : parseInt(value);
                setDataSets(prev => {
                    const baseData = JSON.parse(JSON.stringify(currentData));
                    const updatedCategory = baseData[category].map((item) => item.nome === productName ? { ...item, [field]: val } : item);
                    const newDataSets = { ...prev, [currentKey]: { ...baseData, [category]: updatedCategory } };
                    
                    if (user) {
                        if (!pendingFirebaseUpdate.current[currentKey]) pendingFirebaseUpdate.current[currentKey] = {};
                        pendingFirebaseUpdate.current[currentKey].dataSet = newDataSets[currentKey];
                        scheduleSave();
                    }
                    return newDataSets;
                });
            };

            const handleResponsibleChange = (newVal) => {

                setDataSets(prev => {
                    const baseData = JSON.parse(JSON.stringify(currentData));
                    const updatedData = { ...baseData, responsavel: newVal };
                    const newDataSets = { ...prev, [currentKey]: updatedData };
                    
                    if (user) {
                        if (!pendingFirebaseUpdate.current[currentKey]) pendingFirebaseUpdate.current[currentKey] = {};
                        pendingFirebaseUpdate.current[currentKey].dataSet = updatedData;
                        scheduleSave();
                    }
                    return newDataSets;
                });
            };

            const handleTimeChange = (newVal) => {

                setDataSets(prev => {
                    const baseData = JSON.parse(JSON.stringify(currentData));
                    const updatedData = { ...baseData, horario: newVal };
                    const newDataSets = { ...prev, [currentKey]: updatedData };
                    
                    if (user) {
                        if (!pendingFirebaseUpdate.current[currentKey]) pendingFirebaseUpdate.current[currentKey] = {};
                        pendingFirebaseUpdate.current[currentKey].dataSet = updatedData;
                        scheduleSave();
                    }
                    return newDataSets;
                });
            };

            const handleCreateCount = (date, time, responsible, countType = 'semanal', selectedProducts = []) => {
                const key = getDatasetKey(selectedLocation, date, countType);
                if (dataSets[key]) {
                    if (!window.confirm(`Já existe uma ficha ${countType === 'diaria' ? 'diária' : 'semanal'} para o dia ${date} na unidade ${selectedLocation}. Deseja sobrescrever?`)) return;
                }

                let newDataset;
                if (countType === 'diaria') {
                    // Daily: only create entries for selected products
                    newDataset = { responsavel: responsible, horario: time, unidade: selectedLocation, countType: 'diaria', selectedProducts };
                    categories.forEach(cat => {
                        const catProducts = (dynamicMasterList[cat.id] || []).filter(p => selectedProducts.includes(p));
                        newDataset[cat.id] = catProducts.map(productName => ({
                            nome: productName,
                            l1: 0, l2: 0, l3: 0, l4: 0, qtd: 0,
                            unitValue: productCatalog[productName]?.unitValues?.[selectedLocation] || 0,
                            code: productCatalog[productName]?.code || ""
                        }));
                    });
                } else {
                    newDataset = generateCompleteDataSet(dynamicMasterList, {}, responsible, selectedLocation, productCatalog);
                    newDataset.horario = time;
                    newDataset.countType = 'semanal';
                }
                
                const newDataSets = { ...dataSets, [key]: newDataset };
                setDataSets(newDataSets);
                setSelectedDate(date);
                setSelectedCountType(countType);


                if (user) {
                    window.setDoc(window.doc(window.db, "contagens", key), {
                        dataSet: newDataset,
                        lastUpdated: new Date().toISOString(),
                        updatedBy: user.email
                    }, { merge: true }).catch(e => console.error("Falha ao salvar nova contagem", e));
                }
            };

            const handleFlowUpdate = (category, productName, type, value, explicitDate = null) => {
                const targetKey = explicitDate ? getDatasetKey(selectedLocation, explicitDate, 'diaria') : currentKey;
                const val = value === '' ? 0 : parseInt(value);
                setStockFlow(prev => {
                    const newStockFlow = { ...prev, [targetKey]: { ...prev[targetKey], [category]: { ...prev[targetKey]?.[category], [productName]: { ...prev[targetKey]?.[category]?.[productName], [type]: val } } } };
                    
                    if (user) {
                        if (!pendingFirebaseUpdate.current[targetKey]) pendingFirebaseUpdate.current[targetKey] = {};
                        pendingFirebaseUpdate.current[targetKey].stockFlow = newStockFlow[targetKey];
                        scheduleSave();
                    }
                    return newStockFlow;
                });
            };

            const handleBulkFlowUpdate = (updatesByKey) => {
                setStockFlow(prev => {
                    const newStockFlow = { ...prev };
                    let hasChanges = false;
                    
                    Object.keys(updatesByKey).forEach(key => {
                        if (!newStockFlow[key]) newStockFlow[key] = {};
                        Object.keys(updatesByKey[key]).forEach(cat => {
                            if (!newStockFlow[key][cat]) newStockFlow[key][cat] = {};
                            Object.keys(updatesByKey[key][cat]).forEach(prod => {
                                if (!newStockFlow[key][cat][prod]) newStockFlow[key][cat][prod] = {};
                                const entryVal = updatesByKey[key][cat][prod].entry;
                                const exitVal = updatesByKey[key][cat][prod].exit;
                                if (entryVal !== undefined) newStockFlow[key][cat][prod].entry = entryVal;
                                if (exitVal !== undefined) newStockFlow[key][cat][prod].exit = exitVal;
                                hasChanges = true;
                            });
                        });
                        
                        if (user) {
                            if (!pendingFirebaseUpdate.current[key]) pendingFirebaseUpdate.current[key] = {};
                            pendingFirebaseUpdate.current[key].stockFlow = newStockFlow[key];
                        }
                    });
                    
                    if (hasChanges && user) scheduleSave();
                    
                    return hasChanges ? newStockFlow : prev;
                });
            };

            const handleDownloadTemplate = () => {
                if (!window.XLSX) { customAlert("Biblioteca XLSX não carregada."); return; }
                const rows = [["CATEGORIA", "PRODUTO", "ENTRADA", "SAÍDA"]];
                categories.forEach(cat => { if(dynamicMasterList[cat.id]) { dynamicMasterList[cat.id].forEach(product => { rows.push([cat.name, product, "", ""]); }); } });
                const wb = window.XLSX.utils.book_new();
                const ws = window.XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }];
                window.XLSX.utils.book_append_sheet(wb, ws, "Modelo Entrada e Saída");
                window.XLSX.writeFile(wb, "Modelo_Movimentacao_Estoque.xlsx");
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
                    const newFlowData = { ...stockFlow[currentKey] };
                    data.forEach(row => {
                        const produto = row["PRODUTO"];
                        const entrada = row["ENTRADA"] ? parseInt(row["ENTRADA"]) : 0;
                        const saida = (row["SAÍDA"] || row["SAIDA"]) ? parseInt(row["SAÍDA"] || row["SAIDA"]) : 0;
                        if (produto) {
                            let categoryKey = null;
                            for (const [key, list] of Object.entries(dynamicMasterList)) {
                                if (list.includes(produto)) { categoryKey = key; break; }
                            }
                            if (categoryKey) {
                                if (!newFlowData[categoryKey]) newFlowData[categoryKey] = {};
                                if (!newFlowData[categoryKey][produto]) newFlowData[categoryKey][produto] = {};
                                newFlowData[categoryKey][produto].entry = entrada;
                                newFlowData[categoryKey][produto].exit = saida;
                            }
                        }
                    });
                    const updatedStockFlow = { ...stockFlow, [currentKey]: newFlowData };
                    setStockFlow(updatedStockFlow);
                    if (user) {
                        window.setDoc(window.doc(window.db, "contagens", currentKey), {
                            stockFlow: newFlowData,
                            lastUpdated: new Date().toISOString(),
                            updatedBy: user.email
                        }, { merge: true })
                            .then(() => customAlert("Importação realizada e salva na nuvem com sucesso!"))
                            .catch(e => { console.error("Erro ao salvar upload", e); customAlert("Erro ao salvar na nuvem."); });
                    } else { customAlert("Importado apenas localmente. Faça login para salvar."); }
                    if(fileInputRef.current) fileInputRef.current.value = "";
                };
                reader.readAsBinaryString(file);
            };

            const handleDownloadCountingTemplate = () => {
                if (!window.XLSX) { customAlert("Biblioteca XLSX não carregada."); return; }
                const rows = [["CATEGORIA", "PRODUTO", "LOCAL 1", "LOCAL 2", "LOCAL 3", "LOCAL 4"]];
                categories.forEach(cat => { if(dynamicMasterList[cat.id]) { dynamicMasterList[cat.id].forEach(product => { rows.push([cat.name, product, "", "", "", ""]); }); } });
                const wb = window.XLSX.utils.book_new();
                const ws = window.XLSX.utils.aoa_to_sheet(rows);
                ws['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
                window.XLSX.utils.book_append_sheet(wb, ws, "Modelo Contagem");
                window.XLSX.writeFile(wb, "Modelo_Ficha_Contagem.xlsx");
            };

            const handleCountingFileUpload = (e) => {
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
                    
                    // Use fully patched currentData as the base structure
                    const newDataSet = JSON.parse(JSON.stringify(currentData));

                    data.forEach(row => {
                        const produto = row["PRODUTO"];
                        const l1 = row["LOCAL 1"] ? parseInt(row["LOCAL 1"]) : 0;
                        const l2 = row["LOCAL 2"] ? parseInt(row["LOCAL 2"]) : 0;
                        const l3 = row["LOCAL 3"] ? parseInt(row["LOCAL 3"]) : 0;
                        const l4 = row["LOCAL 4"] ? parseInt(row["LOCAL 4"]) : 0;
                        
                        const qtd = l1 + l2 + l3 + l4; 

                        if (produto) {
                            let categoryKey = null;
                            for (const [key, list] of Object.entries(dynamicMasterList)) {
                                if (list.includes(produto)) { categoryKey = key; break; }
                            }

                            if (categoryKey) {
                                // Find item in category array
                                const itemIndex = newDataSet[categoryKey].findIndex(i => i.nome === produto);
                                if (itemIndex !== -1) {
                                    newDataSet[categoryKey][itemIndex].l1 = l1;
                                    newDataSet[categoryKey][itemIndex].l2 = l2;
                                    newDataSet[categoryKey][itemIndex].l3 = l3;
                                    newDataSet[categoryKey][itemIndex].l4 = l4;
                                    newDataSet[categoryKey][itemIndex].qtd = qtd;
                                }
                            }
                        }
                    });

                    // Update State
                    const updatedDataSets = { ...dataSets, [currentKey]: newDataSet };
                    setDataSets(updatedDataSets);

                    // Upload to Firebase
                    if (user) {
                        window.setDoc(window.doc(window.db, "contagens", currentKey), {
                            dataSet: newDataSet,
                            lastUpdated: new Date().toISOString(),
                            updatedBy: user.email
                        }, { merge: true })
                            .then(() => customAlert("Contagem importada e salva na nuvem com sucesso!"))
                            .catch(e => { console.error("Erro ao salvar contagem", e); customAlert("Erro ao salvar na nuvem."); });
                    } else { customAlert("Importado apenas localmente. Faça login para salvar."); }
                    
                    if(countingFileInputRef.current) countingFileInputRef.current.value = "";
                };
                reader.readAsBinaryString(file);
            };

            const exportToExcel = () => {
                if (!window.XLSX) { customAlert("Biblioteca XLSX não carregada."); return; }
                const wb = window.XLSX.utils.book_new();
                const mainRows = [];
                mainRows.push([`RELATÓRIO DE ESTOQUE - ${selectedLocation.toUpperCase()}`, "", "", "", "", "", "", ""]);
                mainRows.push([`Data: ${selectedDate}/26`, "", `Responsável: ${currentData.responsavel || '-'}`, "", "", "", "", ""]);
                mainRows.push([""]);
                if (viewMode === 'control') mainRows.push(["CATEGORIA", "PRODUTO", "ANTERIOR", "ENTRADA", "SAÍDA", "TEÓRICO", "CONTADO", "DIVERGÊNCIA"]);
                else mainRows.push(["CATEGORIA", "PRODUTO", "LOCAL 1", "LOCAL 2", "LOCAL 3", "LOCAL 4", "TOTAL"]);
                categories.forEach(cat => {
                    const itemList = currentData[cat.id] && currentData[cat.id].length > 0 ? currentData[cat.id] : (dynamicMasterList[cat.id] || []).map(name => ({ nome: name, l1:0, l2:0, l3:0, l4:0, qtd:0 }));
                    if (!itemList) return;
                    itemList.forEach(item => {
                        const isGrid = cat.type === 'grid';
                        const countedTotal = isGrid ? (parseInt(item.l1 || 0) + parseInt(item.l2 || 0) + parseInt(item.l3 || 0) + parseInt(item.l4 || 0)) : parseInt(item.qtd || 0);
                        if (viewMode === 'control') {
                            const flow = currentFlowData?.[cat.id]?.[item.nome] || { entry: 0, exit: 0 };
                            const prevStock = previousStockData?.[item.nome] || 0;
                            const expected = (prevStock + parseInt(flow.entry || 0)) - parseInt(flow.exit || 0);
                            const divergence = countedTotal - expected;
                            mainRows.push([cat.name, item.nome, prevStock, flow.entry || 0, flow.exit || 0, expected, countedTotal, divergence]);
                        } else {
                            if (isGrid) mainRows.push([cat.name, item.nome, item.l1 || 0, item.l2 || 0, item.l3 || 0, item.l4 || 0, countedTotal]);
                            else mainRows.push([cat.name, item.nome, "-", "-", "-", "-", countedTotal]);
                        }
                    });
                });
                const wsMain = window.XLSX.utils.aoa_to_sheet(mainRows);
                wsMain['!cols'] = [{ wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
                window.XLSX.utils.book_append_sheet(wb, wsMain, "Relatório Geral");
                window.XLSX.writeFile(wb, `Estoque_${viewMode}_${selectedLocation}_${selectedDate.replace(/\//g, '-')}.xlsx`);
            };

            const handlePrint = () => {
                setIsPrintModalOpen(true);
            };

            const executePrint = (mode) => {
                setPrintMode(mode);
                setIsPrintModalOpen(false);
                setTimeout(() => {
                    window.print();
                    setTimeout(() => setPrintMode('full'), 1000);
                }, 500);
            };

            // Calculations for cards
            let totalItemsContados = 0;
            let totalDivergencias = 0;
            let totalPositivas = 0;
            let totalNegativas = 0;
            
            let valorTotalContado = 0;
            let valorDivergenciaPositiva = 0;
            let valorDivergenciaNegativa = 0;

            let totalUnidadesDivergenciaNet = 0;
            let totalValorDivergenciaNet = 0;

            categories.forEach(cat => {
                // For daily count, only iterate selected products
                const items = isDailyCount
                    ? (currentData[cat.id] || []).filter(item => (dataSets[currentKey]?.selectedProducts || []).includes(item.nome))
                    : (currentData[cat.id] || []);

                items.forEach(item => {
                    const isGrid = cat.type === 'grid';
                    const countedTotal = isGrid ? ((parseInt(item.l1)||0) + (parseInt(item.l2)||0) + (parseInt(item.l3)||0) + (parseInt(item.l4)||0)) : (parseInt(item.qtd)||0);
                    totalItemsContados += countedTotal;
                    
                    const unitValue = productCatalog[item.nome]?.unitValues?.[selectedLocation] || 0;
                    valorTotalContado += (countedTotal * unitValue);

                    if (viewMode === 'control') {
                        const catFlow = isDailyCount ? effectiveFlowData[cat.id] : currentFlowData[cat.id];
                        const flow = catFlow?.[item.nome] || { entry: 0, exit: 0 };
                        const prevStock = previousStockData?.[item.nome] || 0;
                        const expected = (prevStock + (parseInt(flow.entry)||0)) - (parseInt(flow.exit)||0);
                        const divergence = countedTotal - expected;
                        if (divergence !== 0) {
                                totalDivergencias++;
                                totalUnidadesDivergenciaNet += divergence;
                                totalValorDivergenciaNet += (divergence * unitValue);
                                if (divergence > 0) {
                                    totalPositivas++;
                                    valorDivergenciaPositiva += (divergence * unitValue);
                                } else {
                                    totalNegativas++;
                                    valorDivergenciaNegativa += (Math.abs(divergence) * unitValue);
                                }
                            }
                        }
                    });
                });

            const alertModalUI = alertMessage && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
                        <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-blue-50 border-4 border-blue-100 mb-4">
                            <AlertCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Aviso</h3>
                        <p className="text-sm text-slate-600 text-center mb-6">{alertMessage}</p>
                        <button onClick={() => setAlertMessage(null)} className="w-full bg-[#00a86b] hover:bg-[#00905a] text-white py-2.5 rounded-xl font-bold transition-colors">
                            Entendido
                        </button>
                    </div>
                </div>
            );

            if (isCheckingAuth) {
                return (
                    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc]">
                        {alertModalUI}
                        {!authError ? (
                            <div className="w-12 h-12 border-4 border-[#00a86b] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center max-w-sm">
                                <AlertCircle size={32} className="mx-auto mb-3 text-red-500" />
                                <h3 className="font-bold text-lg mb-2">Erro de Conexão</h3>
                                <p className="text-sm">{authError}</p>
                                <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Tentar Novamente</button>
                            </div>
                        )}
                    </div>
                );
            }

            if (!user) {
                return (
                    <>
                        {alertModalUI}
                        <LoginModal onLogin={handleLogin} />
                    </>
                );
            }

            const hasData = !!dataSets[currentKey];

            return (
                <div className="flex h-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden print:h-auto print:bg-white print:block">
                    <CreateCountModal 
                    isOpen={isCreateModalOpen} 
                    onClose={() => setIsCreateModalOpen(false)} 
                    onCreate={handleCreateCount}
                    productCatalog={productCatalog}
                    categories={categories}
                    dynamicMasterList={dynamicMasterList}
                    dataSets={dataSets}
                    stockFlow={stockFlow}
                    selectedLocation={selectedLocation}
                />
                    
                    {alertModalUI}
                    
                    {migrationProgress && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden p-6 text-center">
                                <h3 className="text-xl font-bold text-slate-800 mb-4">Migração em Progresso</h3>
                                <p className="text-slate-600 mb-4">{migrationProgress.status}</p>
                                {migrationProgress.total > 0 && (
                                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                                        <div className="bg-[#00a86b] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SIDEBAR */}
                    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 hidden md:flex print:hidden shadow-sm z-20 relative">
                        <div className="p-6 flex items-center gap-3 border-b border-slate-100 shrink-0">
                                <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                                    <img src="icon.png" alt="Icon" className="w-full h-full object-contain" />
                                </div>
                                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Estoque Caratininga</h1>
                            </div>
                            
                            <div className="p-5 flex-1 overflow-y-auto pb-8">
                                <button onClick={() => setIsCreateModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-[#00a86b] hover:bg-[#00905a] text-white px-4 py-3 rounded-lg font-semibold shadow-md shadow-blue-500/20 transition-all mb-4">
                                    <Plus size={18} /> Nova Contagem
                                </button>


                                <div className="mb-8 relative">
                                    <button 
                                        onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#00a86b] focus:border-transparent transition-all shadow-sm cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Utensils size={18} className="text-[#00a86b]" />
                                            <span>
                                                {selectedLocation === 'Matriz' && 'Matriz'}
                                                {selectedLocation === 'Mucambo' && 'Mucambo (Filial)'}
                                                {selectedLocation === 'Frecheirinha' && 'Frecheirinha'}
                                                {selectedLocation === 'Tianguá' && 'Tianguá'}
                                            </span>
                                        </div>
                                        <svg className={`w-4 h-4 text-slate-500 transition-transform ${isLocationDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </button>
                                    
                                    {isLocationDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setIsLocationDropdownOpen(false)}></div>
                                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden z-40">
                                                {[
                                                    { id: 'Matriz', label: 'Matriz' },
                                                    { id: 'Mucambo', label: 'Mucambo (Filial)' },
                                                    { id: 'Frecheirinha', label: 'Frecheirinha' },
                                                    { id: 'Tianguá', label: 'Tianguá' }
                                                ].map(loc => (
                                                    <button
                                                        key={loc.id}
                                                        onClick={() => {
                                                            handleLocationChange(loc.id);
                                                            setIsLocationDropdownOpen(false);
                                                        }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-slate-50 ${selectedLocation === loc.id ? 'bg-green-50/50 text-[#00a86b]' : 'text-slate-700'}`}
                                                    >
                                                        <Utensils size={16} className={selectedLocation === loc.id ? "text-[#00a86b]" : "text-slate-400"} />
                                                        {loc.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Visualizações</div>
                                <div className="space-y-1 mb-8">
                                    <button onClick={() => setViewMode('control')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'control' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><AlertCircle size={18} /> Controle de Estoque</button>
                                    <button onClick={() => setViewMode('evolution')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'evolution' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><TrendingUp size={18} /> Relatórios</button>
                                    <button onClick={() => setViewMode('intelligence')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'intelligence' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Activity size={18} /> Inteligência ABC</button>
                                </div>

                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Rotina</div>
                                <div className="space-y-1 mb-8">
                                    <button onClick={() => setViewMode('counting')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'counting' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><ClipboardList size={18} /> Inventário</button>
                                    <button onClick={() => setViewMode('movements')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'movements' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><ArrowRightLeft size={18} /> Movimentação Mensal</button>
                                </div>

                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Administração</div>
                                <div className="space-y-1 mb-8">
                                    <button onClick={() => setViewMode('products')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'products' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Package size={18} /> Produtos do Estoque</button>
                                    <button onClick={() => setViewMode('categories')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'categories' ? 'bg-green-50 text-[#00a86b]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><List size={18} /> Categorias</button>
                                </div>
                            </div>
                        
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                    <img src="icon.png" alt="Caratininga" className="w-8 h-8 rounded-full shadow-sm bg-white object-contain p-0.5 border border-slate-200" />
                                    <span className="font-bold text-slate-700 text-sm">Caratininga</span>
                                </div>
                                <button onClick={handleLogout} className="flex items-center gap-2 p-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-red-600 transition-colors" title="Sair"><LogOut size={18} /></button>
                            </div>
                        </div>
                    </aside>

                    {/* MAIN CONTENT */}
                    <main className="flex-1 flex flex-col h-screen overflow-y-auto relative print:h-auto print:overflow-visible">
                        {/* DARK HEADER */}
                        <div className="p-6 md:p-8 pb-4 print:hidden">
                            <div className="bg-[#003d33] rounded-2xl p-6 md:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden relative">
                                {/* Decorative circle */}
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                                
                                <div className="z-10">
                                    <h2 className="text-3xl font-bold mb-2 tracking-tight">Olá, Caratininga</h2>
                                    <p className="text-[#00a86b] font-medium tracking-wide text-sm">{user ? 'Administrador' : 'Acesso Restrito'}</p>
                                </div>
                                <div className="flex flex-wrap gap-4 md:gap-8 items-center z-10 border border-white/10 bg-white/5 p-4 rounded-xl">
                                    <div className="text-right border-r border-white/10 pr-4 md:pr-8">
                                        <p className="text-slate-300 text-[10px] uppercase tracking-wider mb-1">Loja Ativa</p>
                                        <p className="text-lg font-bold text-white">{selectedLocation}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-300 text-[10px] uppercase tracking-wider mb-1">Data do Inventário</p>
                                        <p className="text-xl font-bold text-white">{selectedDate}</p>
                                    </div>
                                    <div className="text-right border-l border-white/10 pl-4 md:pl-8">
                                        <p className="text-slate-300 text-[10px] uppercase tracking-wider mb-1">Status</p>
                                        <p className="text-xl font-bold text-[#00a86b]">
                                            {'Editando'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Count type toggle — shown when both weekly and daily exist for this date */}
                            {hasBothTypes && (viewMode === 'control' || viewMode === 'counting') && (
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide shrink-0">Visualizando:</span>
                                    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                                        <button
                                            onClick={() => { setSelectedCountType('semanal'); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedCountType === 'semanal' ? 'bg-white shadow text-[#003d33] border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <ClipboardList size={13} /> Semanal
                                        </button>
                                        <button
                                            onClick={() => { setSelectedCountType('diaria'); }}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedCountType === 'diaria' ? 'bg-blue-600 shadow text-white' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            <Calendar size={13} /> Diária
                                        </button>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-1">· ambas as contagens existem para {selectedDate}</span>
                                </div>
                            )}
                            {/* Daily Count Banner */}
                            {isDailyCount && (viewMode === 'control' || viewMode === 'counting') && (
                                <div className="mt-3 flex items-center gap-3 text-sm text-blue-800 bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <Calendar size={16} className="shrink-0 text-blue-600" />
                                    <div>
                                        <span className="font-bold">Contagem Diária</span>
                                        <span className="text-blue-600 ml-2">
                                            {dailyBaseDate
                                                ? `Base: contagem semanal de ${dailyBaseDate} · Movimentações acumuladas desde então`
                                                : 'Nenhuma contagem semanal anterior encontrada como base'}
                                        </span>
                                        <span className="ml-2 font-medium text-blue-700">· {dataSets[currentKey]?.selectedProducts?.length || 0} produto(s) selecionado(s)</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* CONTENT CONTAINER */}
                        <div className="px-6 md:px-8 flex-1 pb-12 print:px-0 print:pb-0">
                            
                            {/* PRINT ONLY HEADER */}
                            {(viewMode !== 'products' && viewMode !== 'categories') && (
                                <div className="hidden print:flex flex-col gap-2 mb-6 pb-4 border-b-2 border-slate-300">
                                    <h1 className="text-2xl font-bold text-[#003d33] uppercase">{isPrintSheetMode ? 'Folha de Contagem' : 'Relatório de ' + (viewMode === 'control' ? 'Controle de Estoque' : 'Inventário')}</h1>
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="font-bold text-slate-500 uppercase text-[10px]">Loja</p>
                                            <p className="font-bold text-slate-800">{selectedLocation}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-500 uppercase text-[10px]">Data</p>
                                            <p className="font-bold text-slate-800">{isPrintSheetMode ? '____/____/________' : selectedDate}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-500 uppercase text-[10px]">Responsável</p>
                                            <p className="font-bold text-slate-800">{isPrintSheetMode ? '________________________' : (currentData.responsavel || 'Não informado')}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-500 uppercase text-[10px]">Hora</p>
                                            <p className="font-bold text-slate-800">{isPrintSheetMode ? '____:____' : (currentData.horario || 'Não informada')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* FILTERS BAR */}
                            {(viewMode !== 'products' && viewMode !== 'categories' && viewMode !== 'intelligence') && (
                                <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 mb-6 bg-white p-1 sm:p-2 md:p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
                                <div className="hidden lg:flex items-center gap-2 font-bold text-slate-800 shrink-0">
                                    <List size={18} className="text-slate-400" /> 
                                    <span>Resumo</span>
                                </div>
                                
                                <div className="flex items-center justify-between gap-0.5 sm:gap-2 w-full">
                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 sm:px-2 py-1.5 focus-within:border-[#00a86b] transition-all shrink-0">
                                        <span className="hidden md:inline text-[10px] font-semibold text-slate-500 uppercase">Período:</span>
                                        <CustomDatePicker 
                                            selectedDate={selectedDate} 
                                            availableDates={availableDates} 
                                            onSelectDate={(d) => { setSelectedDate(d); }} 
                                            dailyDates={availableDates.filter(d => isDatasetDaily(dataSets[getDatasetKey(selectedLocation, d)]))}
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 sm:px-2 py-1.5 focus-within:border-[#00a86b] transition-all shrink-0">
                                        <span className="text-[10px] font-semibold text-slate-500 uppercase shrink-0">Resp.:</span>
                                        <input type="text" value={currentData.responsavel || ''} onChange={(e) => handleResponsibleChange(e.target.value)} placeholder="Nome" className="bg-transparent text-sm font-medium text-slate-800 outline-none w-14 sm:w-24 disabled:opacity-50 truncate" />
                                    </div>

                                    <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 sm:px-2 py-1.5 focus-within:border-[#00a86b] transition-all shrink-0">
                                        <span className="hidden md:inline text-[10px] font-semibold text-slate-500 uppercase">Hora:</span>
                                        <input type="time" value={currentData.horario || ''} onChange={(e) => handleTimeChange(e.target.value)} className="bg-transparent text-sm font-medium text-slate-800 outline-none w-[65px] disabled:opacity-50" />
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                                        <input type="file" accept=".xlsx, .xls" ref={countingFileInputRef} onChange={handleCountingFileUpload} style={{ display: 'none' }} />
                                        
                                        {viewMode === 'control' && (
                                            <>
                                                <button onClick={() => setHideZeroProducts(!hideZeroProducts)} className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm border ${hideZeroProducts ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'}`} title="Ocultar produtos com contagens zeradas">
                                                    <Filter size={16} /> <span className="hidden xl:inline">Ocultar Zerados</span>
                                                </button>
                                            </>
                                        )}

                                        {viewMode === 'counting' && (
                                            <>
                                                <button onClick={() => setShowPrintSheetModal(true)} className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm border border-slate-200" title="Imprimir Folha de Contagem">
                                                    <Printer size={16} /> <span className="hidden xl:inline">Folha Contagem</span>
                                                </button>
                                                <button onClick={handleDownloadCountingTemplate} className="flex items-center justify-center gap-1 bg-white hover:bg-slate-50 text-slate-700 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm border border-slate-200" title="Baixar Modelo de Contagem">
                                                    <FileDown size={16} /> <span className="hidden xl:inline">Modelo</span>
                                                </button>
                                                <button onClick={() => countingFileInputRef.current && countingFileInputRef.current.click()} className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm border border-slate-200" title="Importar Contagem">
                                                    <Upload size={16} /> <span className="hidden xl:inline">Importar Cont.</span>
                                                </button>
                                            </>
                                        )}

                                        <button onClick={exportToExcel} className="flex items-center justify-center w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-md transition-colors border border-slate-200 shadow-sm shrink-0" title="Baixar Excel"><Download size={16} /></button>
                                        <button onClick={handlePrint} className="flex items-center justify-center w-8 h-8 bg-white hover:bg-slate-50 text-slate-600 rounded-md transition-colors border border-slate-200 shadow-sm shrink-0" title="Imprimir Relatório"><Printer size={16} /></button>
                                        
                                        {viewMode === 'counting' && (
                                            <>

                                                <button onClick={handleDeleteClick} className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm bg-red-100 text-red-600 hover:bg-red-200 border border-transparent shrink-0" title="Excluir Contagem">
                                                    <Trash2 size={16} /> <span className="hidden xl:inline">Excluir</span>
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
                                                        const url = `${base}form.html?key=${currentKey}`;
                                                        
                                                        // Update Firebase to unlock the link and add 'previsto'
                                                        try {
                                                            const countDocRef = window.doc(window.db, "contagens", currentKey);
                                                            
                                                            const previstosMap = {};

                                                            categories.forEach(cat => {
                                                                if(currentData[cat.id]) {
                                                                    currentData[cat.id].forEach(item => {
                                                                        const flow = effectiveFlowData?.[item.nome] || { entry: 0, exit: 0 };
                                                                        const prevStock = previousStockData?.[item.nome] || 0;
                                                                        previstosMap[item.nome] = (prevStock + (parseInt(flow.entry)||0)) - (parseInt(flow.exit)||0);
                                                                    });
                                                                }
                                                            });

                                                            await window.setDoc(countDocRef, { linkStatus: 'aberto', previstos: previstosMap }, { merge: true });
                                                        } catch (err) {
                                                            console.error("Erro ao reabrir link:", err);
                                                        }
                                                        
                                                        setLinkShowExpected(false);
                                                        setLinkModalData(url);
                                                        
                                                        navigator.clipboard.writeText(url).then(() => {
                                                            setLinkCopied(true);
                                                            setTimeout(() => setLinkCopied(false), 2500);
                                                        }).catch(() => {});
                                                    }}
                                                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm border shrink-0 ${linkCopied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                                                    title="Gerar Link do Formulário"
                                                >
                                                    <Share2 size={16} /> <span className="hidden xl:inline">{linkCopied ? 'Link copiado!' : 'Gerar Link'}</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                </div>
                            )}

                            {/* METRICS CARDS */}
                            {viewMode === 'control' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
                                    {/* Card 1: Total Contado */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <ClipboardList size={22} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Contado</p>
                                            <h4 className="text-2xl font-bold text-slate-800">{totalItemsContados.toLocaleString('pt-BR')} <span className="text-sm font-medium text-slate-400">un</span></h4>
                                            <p className="text-xs font-bold text-[#00a86b] mt-0.5">R$ {valorTotalContado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                    </div>
                                    {/* Card 2: Categorias */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                                        <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <List size={22} className="text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Categorias</p>
                                            <h4 className="text-2xl font-bold text-slate-800">{categories.length} <span className="text-sm font-medium text-slate-400">seções</span></h4>
                                        </div>
                                    </div>
                                    {/* Card 3: Divergências Positivas (Sobras) */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                                        <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <ArrowRightLeft size={22} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sobras (Positivas)</p>
                                            <h4 className="text-2xl font-bold text-blue-700">{totalPositivas.toLocaleString('pt-BR')} <span className="text-sm font-medium text-blue-400">itens</span></h4>
                                            <p className="text-xs font-bold text-blue-600 mt-0.5">+ R$ {valorDivergenciaPositiva.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                    </div>
                                    {/* Card 4: Divergências Negativas (Faltas) */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow group">
                                        <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <AlertCircle size={22} className="text-red-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Faltas (Negativas)</p>
                                            <h4 className="text-2xl font-bold text-red-700">{totalNegativas.toLocaleString('pt-BR')} <span className="text-sm font-medium text-red-400">itens</span></h4>
                                            <p className="text-xs font-bold text-red-600 mt-0.5">- R$ {valorDivergenciaNegativa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* MAIN AREA */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 print:border-none print:shadow-none print:p-0">
                                {viewMode === 'categories' ? (
                                    <CategoryManager 
                                        categories={categories}
                                        setCategories={setCategories}
                                        dataSets={dataSets}
                                        customAlert={customAlert}
                                        user={user}
                                    />
                                ) : viewMode === 'products' ? (
                                    <ProductCatalog 
                                        catalog={productCatalog} 
                                        setCatalog={handleUpdateCatalog} 
                                        currentData={currentData}
                                        dataSets={dataSets}
                                        selectedLocation={selectedLocation}
                                        categories={categories}
                                        customAlert={customAlert}
                                    />
                                ) : viewMode === 'evolution' ? (
                                    <EvolutionReport 
                                        data={currentData} 
                                        flowData={effectiveFlowData} 
                                        previousData={previousStockData} 
                                        dataSets={dataSets} 
                                        stockFlow={stockFlow} 
                                        selectedLocation={selectedLocation} 
                                        getPreviousStockValues={getPreviousStockValues}
                                        getAccumulatedFlow={getAccumulatedFlow}
                                        getLastWeeklyStockBase={getLastWeeklyStockBase}
                                        isDailyCount={isDailyCount}
                                        categories={categories}
                                        catalog={productCatalog}
                                        selectedDate={selectedDate}
                                    />
                                ) : viewMode === 'intelligence' ? (
                                    <InventoryIntelligence 
                                        dataSets={dataSets}
                                        stockFlow={stockFlow}
                                        selectedLocation={selectedLocation}
                                        categories={categories}
                                        catalog={productCatalog}
                                    />
                                ) : viewMode === 'movements' ? (
                                    <window.MovementsMatrix 
                                        selectedLocation={selectedLocation}
                                        productCatalog={productCatalog}
                                        categories={categories}
                                        dynamicMasterList={dynamicMasterList}
                                        stockFlow={stockFlow}
                                        onFlowUpdate={handleFlowUpdate}
                                        onBulkFlowUpdate={handleBulkFlowUpdate}
                                    />
                                ) : viewMode === 'counting' ? (
                                    <>
                                        {categories.map(cat => (
                                            <Section 
                                                key={cat.id} 
                                                title={cat.name} 
                                                data={currentData[cat.id]} 
                                                category={cat.id} 
                                                onUpdate={handleUpdate} 
                                                type={cat.type} 
                                                isEditing={true} 
                                                catalog={productCatalog} 
                                                selectedLocation={selectedLocation}
                                                isPrintSheetMode={isPrintSheetMode}
                                                prevStockResult={prevStockResult}
                                                stockFlowData={effectiveFlowData}
                                                isPrintSheetMode={isPrintSheetMode}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        {/* GRAND TOTAL ROW */}
                                        <div className="mb-6 bg-white p-5 rounded-xl border-2 border-[#003d33]/20 shadow-sm print:mb-4 print:border-gray-300 break-inside-avoid">
                                            <h3 className="text-lg font-bold text-[#003d33] mb-4 uppercase tracking-wider text-center print:text-sm">Total Geral do Estoque</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center print:bg-transparent print:p-2">
                                                    <p className="text-xs font-bold text-slate-500 uppercase print:text-[10px]">Soma Contagem (Un)</p>
                                                    <p className="text-2xl font-bold text-blue-700 print:text-lg">{hasData ? totalItemsContados.toLocaleString('pt-BR') : '-'}</p>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center print:bg-transparent print:p-2">
                                                    <p className="text-xs font-bold text-slate-500 uppercase print:text-[10px]">Valor Total (Contagem)</p>
                                                    <p className="text-2xl font-bold text-slate-800 print:text-lg">{hasData ? `R$ ${valorTotalContado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</p>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center print:bg-transparent print:p-2">
                                                    <p className="text-xs font-bold text-slate-500 uppercase print:text-[10px]">Soma Divergência (Un)</p>
                                                    <p className={`text-2xl font-bold print:text-lg ${hasData ? (totalUnidadesDivergenciaNet > 0 ? 'text-blue-600' : totalUnidadesDivergenciaNet < 0 ? 'text-red-600' : 'text-slate-600') : 'text-slate-400'}`}>
                                                        {hasData ? (totalUnidadesDivergenciaNet > 0 ? `+${totalUnidadesDivergenciaNet.toLocaleString('pt-BR')}` : totalUnidadesDivergenciaNet.toLocaleString('pt-BR')) : '-'}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-center print:bg-transparent print:p-2">
                                                    <p className="text-xs font-bold text-slate-500 uppercase print:text-[10px]">Valor Total (Divergência)</p>
                                                    <p className={`text-2xl font-bold print:text-lg ${hasData ? (totalValorDivergenciaNet > 0 ? 'text-blue-600' : totalValorDivergenciaNet < 0 ? 'text-red-600' : 'text-slate-600') : 'text-slate-400'}`}>
                                                        {hasData ? (totalValorDivergenciaNet !== 0 ? (totalValorDivergenciaNet > 0 ? '+ ' : '- ') + `R$ ${Math.abs(totalValorDivergenciaNet).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'R$ 0,00') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {categories.map(cat => (
                                            <ControlSection 
                                                key={cat.id} 
                                                title={cat.name} 
                                                data={currentData[cat.id]} 
                                                category={cat.id} 
                                                stockFlowData={effectiveFlowData} 
                                                previousStockData={previousStockData} 
                                                previousDateMap={previousDateMap}
                                                onFlowUpdate={handleFlowUpdate} 
                                                previousDateLabel={previousDateLabel} 
                                                type={cat.type} 
                                                isEditing={true} 
                                                catalog={productCatalog} 
                                                selectedLocation={selectedLocation}
                                                currentDate={selectedDate}
                                                isDailyCount={isDailyCount}
                                                hideZeroProducts={hideZeroProducts}
                                                printMode={printMode}
                                                hasData={hasData}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </main>

                    {/* DELETE CONFIRMATION MODAL */}
                    {isPrintModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
                                <div className="bg-slate-50 p-6 border-b border-slate-100 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                        <Printer size={32} className="text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">Opções de Impressão</h3>
                                    <p className="text-sm text-slate-500 font-medium">Selecione o formato do relatório</p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3">
                                        <button 
                                            onClick={() => executePrint('full')}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <List size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">Relatório Completo</div>
                                                <div className="text-xs text-slate-500">Imprime todos os produtos da contagem</div>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => executePrint('divergences')}
                                            className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 transition-colors text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                <AlertCircle size={20} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">Apenas Divergências</div>
                                                <div className="text-xs text-slate-500">Filtra e imprime apenas produtos divergentes</div>
                                            </div>
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setIsPrintModalOpen(false)} 
                                        className="w-full mt-6 px-5 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {showPrintSheetModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 transform transition-all">
                                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Printer className="text-slate-500" size={20} />
                                        Folha de Contagem
                                    </h3>
                                    <button onClick={() => setShowPrintSheetModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="p-6">
                                    <p className="text-slate-600 mb-6 text-sm">Selecione o formato desejado para a impressão:</p>
                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={() => {
                                                setShowPrintSheetModal(false);
                                                setIsPrintSheetMode('without-expected');
                                                setTimeout(() => { window.print(); setIsPrintSheetMode(false); }, 500);
                                            }}
                                            className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                                        >
                                            <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">Folha em Branco</p>
                                                <p className="text-xs text-slate-500 mt-1">Imprime apenas os espaços para preenchimento manual.</p>
                                            </div>
                                        </button>
                                        
                                        <button 
                                            onClick={() => {
                                                setShowPrintSheetModal(false);
                                                setIsPrintSheetMode('with-expected');
                                                setTimeout(() => { window.print(); setIsPrintSheetMode(false); }, 500);
                                            }}
                                            className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-[#00a86b] hover:bg-[#00a86b]/10 transition-all text-left"
                                        >
                                            <div className="bg-[#00a86b]/20 p-2 rounded-lg text-[#00a86b]">
                                                <TrendingUp size={24} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">Com Estoque Teórico</p>
                                                <p className="text-xs text-slate-500 mt-1">Inclui a coluna com a previsão do sistema para orientar a contagem.</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                                    <button onClick={() => setShowPrintSheetModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all">
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isDeleteModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 transform transition-all">
                                <div className="p-6">
                                    <div className="flex items-center gap-3 text-red-600 mb-4">
                                        <AlertCircle size={28} />
                                        <h3 className="text-xl font-bold">Excluir Contagem?</h3>
                                    </div>
                                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                                        Você tem certeza que deseja <strong>APAGAR</strong> a contagem de <strong>{selectedLocation}</strong> do dia <strong>{selectedDate}</strong>?
                                        <br/><br/>
                                        <span className="text-red-500 font-bold">ATENÇÃO: Esta ação não poderá ser desfeita.</span>
                                    </p>
                                    <div className="flex justify-end gap-3">
                                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                                            Cancelar
                                        </button>
                                        <button onClick={confirmDeleteCount} className="px-5 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20">
                                            Sim, Excluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {linkModalData && (() => {
                        const finalUrl = linkShowExpected ? `${linkModalData}&showExpected=1` : linkModalData;
                        return (
                            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
                                    <button onClick={() => setLinkModalData(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
                                        <X size={20} />
                                    </button>
                                    <div className="text-center mb-6">
                                        <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 flex items-center justify-center rounded-full mb-3">
                                            <Share2 size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">Link Gerado com Sucesso!</h3>
                                        <p className="text-sm text-slate-500 mt-1">O link foi desbloqueado e está pronto para uso.</p>
                                    </div>

                                    <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setLinkShowExpected(!linkShowExpected)}>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-slate-700">Incluir Coluna de Estoque Teórico</span>
                                            <span className="text-xs text-slate-500">O contador verá a quantidade esperada (Teórico).</span>
                                        </div>
                                        <div className={`w-10 h-5 flex items-center bg-gray-300 rounded-full p-1 duration-300 ease-in-out ${linkShowExpected ? 'bg-green-500' : ''}`}>
                                            <div className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-300 ease-in-out ${linkShowExpected ? 'translate-x-4.5' : ''}`}></div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 break-all mb-4">
                                        <p className="text-sm text-slate-700 font-medium select-all">{finalUrl}</p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(finalUrl);
                                            setLinkCopied(true);
                                            setTimeout(() => setLinkCopied(false), 2000);
                                        }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white bg-[#00a86b] hover:bg-[#00905a] transition-colors">
                                            <Copy size={18} /> {linkCopied ? 'Copiado!' : 'Copiar Link'}
                                        </button>
                                        <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-slate-700 bg-white border-2 border-slate-200 hover:bg-slate-50 transition-colors">
                                            <ExternalLink size={18} /> Acessar Formulário
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        };
window.App = App;
