                        {view==='manage-users' && <><input required placeholder="Username" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.username||''} onChange={e=>setFormData({...formData,username:e.target.value})}/><input type="email" required placeholder="Email" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.email||''} onChange={e=>setFormData({...formData,email:e.target.value})}/><input type="password" placeholder="Password (leave blank to keep)" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.password||''} onChange={e=>setFormData({...formData,password:e.target.value})}/><select className="w-full border border-slate-200 p-4 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-600" value={formData.role||'Viewer'} onChange={e=>setFormData({...formData,role:e.target.value})}><option>Viewer</option><option>Editor</option><option>Admin</option></select></>}
                        {view==='clients' && <><input type="date" required className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-600" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input required placeholder="Client Name" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.name||''} onChange={e=>setFormData({...formData,name:e.target.value})}/><input type="number" placeholder="Project Total" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.projectTotal||''} onChange={e=>setFormData({...formData,projectTotal:e.target.value})}/><input type="number" placeholder="Advance" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.advanceReceived||''} onChange={e=>setFormData({...formData,advanceReceived:e.target.value})}/><select className="w-full border border-slate-200 p-4 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-600" value={formData.status||'Ongoing'} onChange={e=>setFormData({...formData,status:e.target.value})}><option>Ongoing</option><option>Completed</option></select><div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100"><input type="checkbox" className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" checked={Number(formData.retainerAmount) > 0} onChange={e => setFormData({...formData, retainerAmount: e.target.checked ? (formData.projectTotal || 0) : 0})} /><span className="text-sm font-bold text-slate-600">Monthly Retainer Client?</span></div>{Number(formData.retainerAmount) > 0 && <input type="number" placeholder="Monthly Retainer Amount" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700 animate-in slide-in-from-top-2" value={formData.retainerAmount||''} onChange={e=>setFormData({...formData,retainerAmount:e.target.value})}/>}</>}
                        {view==='vendor-bills' && <><input type="date" required className="w-full border border-slate-200 p-4 rounded-xl text-sm" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><select className="w-full border border-slate-200 p-4 rounded-xl text-sm bg-white font-medium text-slate-700" value={formData.vendor||''} onChange={e=>setFormData({...formData,vendor:e.target.value})}><option value="">Select Vendor</option>{vendors.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select><input placeholder="Bill # / Invoice Ref" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700" value={formData.billNumber||''} onChange={e=>setFormData({...formData,billNumber:e.target.value})}/><input placeholder="Description" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700" value={formData.description||''} onChange={e=>setFormData({...formData,description:e.target.value})}/><div className="grid grid-cols-2 gap-4"><input type="number" placeholder="Total Amount" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-bold text-slate-800" value={formData.amount||''} onChange={e=>setFormData({...formData,amount:e.target.value})}/><input type="number" placeholder="Paid So Far" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700" value={formData.paidAmount||''} onChange={e=>setFormData({...formData,paidAmount:e.target.value})}/></div></>}
                        
                        {view==='salaries' && (
                            <>
                                <input type="date" required className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/>
                                <input placeholder="Employee Name" className="w-full border border-slate-200 p-4 rounded-xl text-sm" value={formData.employeeName || ''} onChange={e => setFormData({ ...formData, employeeName: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Basic Salary</label>
                                        <input type="number" placeholder="0" className="w-full border border-slate-200 p-4 rounded-xl text-sm" value={formData.basicSalary || ''} onChange={e => {
                                            const basic = Number(e.target.value);
                                            const tax = Number(formData.taxDeduction || 0);
                                            setFormData({ ...formData, basicSalary: basic, totalPayable: basic - tax });
                                        }} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Tax Deducted</label>
                                        <input type="number" placeholder="0" className="w-full border border-slate-200 p-4 rounded-xl text-sm text-rose-600" value={formData.taxDeduction || ''} onChange={e => {
                                            const tax = Number(e.target.value);
                                            const basic = Number(formData.basicSalary || 0);
                                            setFormData({ ...formData, taxDeduction: tax, totalPayable: basic - tax });
                                        }} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200">
                                    <span className="text-sm font-bold text-slate-600">Net Payable:</span>
                                    <span className="text-xl font-bold text-indigo-600">{formatCurrency(formData.totalPayable || 0)}</span>
                                </div>
                            </>
                        )}

                        {!['manage-users','clients','vendor-bills','salaries'].includes(view) && <><input type="date" required className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-600" value={formData.date||''} onChange={e=>setFormData({...formData,date:e.target.value})}/><input placeholder="Description/Name" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.description||formData.name||''} onChange={e=>setFormData({...formData,[view==='vendors'?'name':'description']:e.target.value})}/><input type="number" placeholder="Amount" className="w-full border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all font-bold text-slate-800" value={formData.amount||formData.cashOut||formData.amountPayable||''} onChange={e=>setFormData({...formData,[view==='petty-cash'?'cashOut':view==='vendors'?'amountPayable':'amount']:e.target.value})}/></>}
                        {view==='expenses' && <select className="w-full border border-slate-200 p-4 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700" value={formData.category||'General'} onChange={e=>setFormData({...formData,category:e.target.value})}>{expenseCategories.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select>}
                        {(view==='salaries'||view==='petty-cash') && <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6"><div className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Details</div><input placeholder="Bank Name" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700" value={formData.bankName||''} onChange={e=>setFormData({...formData,bankName:e.target.value})}/><input placeholder="Cheque Number" className="w-full border border-slate-200 p-4 rounded-xl text-sm font-medium text-slate-700" value={formData.chequeNumber||''} onChange={e=>setFormData({...formData,chequeNumber:e.target.value})}/></div>}

                        <div className="border-t border-slate-100 pt-6">
                            <label className="flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 p-6 rounded-2xl hover:bg-violet-50 hover:border-violet-200 transition-all border-2 border-dashed border-slate-200 group">
                                <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Upload size={24} className="text-violet-500"/></div>
                                <span className="text-sm font-bold text-slate-600 group-hover:text-violet-600 transition-colors">{fileToUpload?fileToUpload.name:"Attach Receipt / Document"}</span>
                                <span className="text-xs text-slate-400">Supports JPG, PNG, PDF</span>
                                <input type="file" className="hidden" onChange={e=>setFileToUpload(e.target.files[0])}/>
                            </label>
                        </div>
                        <button disabled={isSubmitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-violet-200 hover:shadow-xl hover:shadow-violet-300 hover:scale-[1.02] active:scale-95 transition-all flex justify-center items-center gap-2 text-base">
                            {isSubmitting?<><RefreshCw className="animate-spin" size={20}/> Saving...</>:<><CheckCircle size={20}/> Save Record</>}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {showSalarySlip && <SalarySlip data={formData} onClose={() => setShowSalarySlip(false)} />}
      </main>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);