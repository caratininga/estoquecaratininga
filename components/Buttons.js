        const LocationButton = ({ name, onClick, isSelected }) => (
            <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all print:hidden ${isSelected ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-2' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'}`}>
                <Building2 size={18} /> {name}
            </button>
        );

        const DateButton = ({ date, onClick, isSelected, disabled }) => (
            <button onClick={() => !disabled && onClick(date)} disabled={disabled} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all print:hidden ${isSelected ? 'bg-blue-100 text-blue-700 border border-blue-200' : disabled ? 'opacity-40 cursor-not-allowed text-slate-400' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Calendar size={14} /> {date}
            </button>
        );
window.LocationButton = LocationButton;
window.DateButton = DateButton;
