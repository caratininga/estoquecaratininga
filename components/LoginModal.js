        const LoginModal = ({ onLogin }) => {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [error, setError] = useState('');

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError('');
                try {
                    await onLogin(email.trim(), password);
                } catch (err) {
                    setError("Falha no login: E-mail ou senha incorretos.");
                    console.error(err);
                }
            };

            return (
                <div className="flex h-screen w-full bg-[#f8fafc] items-center justify-center font-sans">
                    <div className="bg-white rounded-2xl p-10 w-full max-w-md shadow-2xl border border-slate-100 mx-4">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
                                <img src="icon.png" alt="Icon" className="w-full h-full object-contain" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 text-center text-slate-800 tracking-tight">Estoque Caratininga</h2>
                        <p className="text-slate-500 text-center mb-8 text-sm">Acesso restrito ao sistema de inventário</p>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <input type="email" required className="block w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00a86b] focus:ring-2 focus:ring-[#00a86b]/20 pl-10 p-3 text-sm transition-all outline-none" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    </div>
                                    <input type="password" required className="block w-full rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#00a86b] focus:ring-2 focus:ring-[#00a86b]/20 pl-10 p-3 text-sm transition-all outline-none" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                            </div>
                            {error && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{error}</p>}
                            <div className="pt-2">
                                <button type="submit" className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-[#00a86b] hover:bg-[#00905a] text-white rounded-xl font-bold shadow-md shadow-green-500/20 transition-all text-sm">
                                    <LogIn size={18} /> Entrar no Sistema
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        };
window.LoginModal = LoginModal;
