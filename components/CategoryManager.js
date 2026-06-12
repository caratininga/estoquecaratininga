const { useState } = window.React;
const { Package, Plus, Trash2, Edit2, Check, X, AlertCircle, List, Grid, GripVertical } = window;

const CategoryManager = ({ categories, setCategories, dataSets, customAlert, user }) => {
    const [isEditing, setIsEditing] = useState(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState("grid");

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("grid");

    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const handleSaveEdit = async (id) => {
        if (!editName.trim()) { customAlert("O nome não pode estar vazio."); return; }
        const newCats = categories.map(c => c.id === id ? { ...c, name: editName, type: editType } : c);
        setCategories(newCats);
        await saveToFirebase(newCats);
        setIsEditing(null);
    };

    const handleAdd = async () => {
        if (!newName.trim()) { customAlert("O nome não pode estar vazio."); return; }
        const id = newName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (categories.some(c => c.id === id)) { customAlert("Já existe uma categoria com este nome/ID."); return; }

        const newCats = [...categories, { id, name: newName, type: newType }];
        setCategories(newCats);
        await saveToFirebase(newCats);
        
        setIsAdding(false);
        setNewName("");
        setNewType("grid");
    };

    const handleDelete = async (id) => {
        // Check if category has any products or data
        let hasData = false;
        Object.values(dataSets).forEach(ds => {
            if (ds[id] && ds[id].length > 0) hasData = true;
        });

        if (hasData) {
            customAlert("Não é possível excluir esta categoria pois ela já possui produtos vinculados ou dados de contagem.");
            return;
        }

        if (window.confirm("Tem certeza que deseja excluir esta categoria?")) {
            const newCats = categories.filter(c => c.id !== id);
            setCategories(newCats);
            await saveToFirebase(newCats);
        }
    };

    const saveToFirebase = async (cats) => {
        if (user) {
            try {
                await window.setDoc(window.doc(window.db, "estoque", "config"), {
                    categories: cats,
                    lastUpdated: new Date().toISOString()
                }, { merge: true });
            } catch (e) {
                console.error(e);
                customAlert("Erro ao salvar categorias na nuvem.");
            }
        }
    };

    const handleDragStart = (e, index) => {
        if (isEditing) {
            e.preventDefault();
            return;
        }
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (isEditing) return;
        setDragOverIndex(index);
    };

    const handleDrop = async (e, targetIndex) => {
        e.preventDefault();
        if (isEditing) return;
        if (draggedIndex === null) return;
        if (draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newCats = [...categories];
        const item = newCats[draggedIndex];
        newCats.splice(draggedIndex, 1);
        newCats.splice(targetIndex, 0, item);

        setCategories(newCats);
        await saveToFirebase(newCats);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="text-[#00a86b]" /> Gerenciar Categorias
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Crie, edite ou exclua categorias e defina o formato de contagem.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-[#00a86b] hover:bg-[#00905a] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
                    <Plus size={16} /> <span className="hidden sm:inline">Nova Categoria</span>
                </button>
            </div>

            {isAdding && (
                <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Nome da Categoria</label>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" placeholder="Ex: Bebidas Quentes" autoFocus />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Contagem</label>
                        <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm">
                            <option value="grid">Grid (Local 1 a 4)</option>
                            <option value="list">Lista (Qtd Única)</option>
                        </select>
                    </div>
                    <div className="flex gap-2 h-[38px]">
                        <button onClick={handleAdd} className="flex-1 bg-[#00a86b] text-white rounded-md flex items-center justify-center hover:bg-[#00905a] transition-colors"><Check size={18} /></button>
                        <button onClick={() => setIsAdding(false)} className="flex-1 bg-slate-200 text-slate-600 rounded-md flex items-center justify-center hover:bg-slate-300 transition-colors"><X size={18} /></button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 w-10"></th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Categoria</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo (Formato)</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {categories.map((cat, index) => (
                            <tr 
                                key={cat.id} 
                                draggable={!isEditing}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                                className={`transition-all ${draggedIndex === index ? 'opacity-50 bg-slate-100' : 'hover:bg-slate-50'} ${dragOverIndex === index ? 'border-t-2 border-t-[#00a86b]' : ''}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical size={18} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-400">{cat.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                    {isEditing === cat.id ? (
                                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-2 py-1 border border-[#00a86b] rounded outline-none" autoFocus />
                                    ) : (
                                        cat.name
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                    {isEditing === cat.id ? (
                                        <select value={editType} onChange={e => setEditType(e.target.value)} className="w-full px-2 py-1 border border-[#00a86b] rounded outline-none bg-white">
                                            <option value="grid">Grid (Local 1 a 4)</option>
                                            <option value="list">Lista (Qtd Única)</option>
                                        </select>
                                    ) : (
                                        <span className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 w-fit">
                                            {cat.type === 'grid' ? <Grid size={12} className="text-blue-500" /> : <List size={12} className="text-orange-500" />}
                                            {cat.type === 'grid' ? 'Grid (4 Locais)' : 'Lista Simples'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                    {isEditing === cat.id ? (
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => handleSaveEdit(cat.id)} className="text-[#00a86b] hover:text-[#00905a] p-1.5 hover:bg-emerald-50 rounded-lg" title="Salvar"><Check size={18} /></button>
                                            <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg" title="Cancelar"><X size={18} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => { setIsEditing(cat.id); setEditName(cat.name); setEditType(cat.type); }} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {categories.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        Nenhuma categoria cadastrada.
                    </div>
                )}
            </div>
        </div>
    );
};

window.CategoryManager = CategoryManager;
