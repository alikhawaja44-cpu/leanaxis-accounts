                                    {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                                </select>
                                <input placeholder="Bill # / Invoice Ref" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.billNumber || ''} onChange={e => setFormData({ ...formData, billNumber: e.target.value })} />
                                <input placeholder="Description" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="number" placeholder="Total Bill Amount" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                                    <input type="number" placeholder="Amount Paid" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.paidAmount || ''} onChange={e => setFormData({ ...formData, paidAmount: e.target.value })} />
                                </div>
                            </>
                        )}

                        {view === 'expenses' && (
                            <select className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.category || 'General'} onChange={e => setFormData({...formData, category: e.target.value})}>
                                {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        )}

                        {(view === 'salaries' || view === 'petty-cash') && (
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div className="col-span-2 text-xs font-bold text-slate-500 uppercase">Payment Details (Optional)</div>
                                <input placeholder="Bank Name" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.bankName || ''} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                                <input placeholder="Cheque Number" className="w-full border border-slate-200 p-3 rounded-xl text-sm" value={formData.chequeNumber || ''} onChange={e => setFormData({...formData, chequeNumber: e.target.value})} />
                            </div>
                        )}

                        <div className="border-t border-slate-100 pt-4">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"><Upload size={18} className="text-slate-400"/><span className="text-sm font-medium text-slate-600">{fileToUpload?fileToUpload.name:"Attach Proof (Image/PDF)"}</span><input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/></label>
                        </div>
                        <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2">{isSubmitting?<><RefreshCw className="animate-spin" size={20}/> Saving...</>:<><CheckCircle size={20}/> Save Record</>}</button>
                    </form>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);