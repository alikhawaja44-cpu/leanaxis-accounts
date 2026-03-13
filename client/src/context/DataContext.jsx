// src/context/DataContext.jsx
// Central data store - fetches from REST API, provides real-time-like updates

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  clientsAPI, vendorsAPI, expensesAPI, pettyCashAPI, salariesAPI,
  bankRecordsAPI, invoicesAPI, quotationsAPI, vendorBillsAPI, usersAPI, settingsAPI
} from '../utils/api';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';
import { updateCurrencyFormatter } from '../utils/helpers';

const DataContext = createContext(null);

const REFRESH_INTERVAL = 30000; // 30 seconds

export function DataProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();

  // ── Data State ──────────────────────────────────────────────────────────────
  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [pettyCash, setPettyCash] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [bankRecords, setBankRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [vendorBills, setVendorBills] = useState([]);
  const [users, setUsers] = useState([]);
  const [appSettings, setAppSettingsState] = useState({});
  const [expenseCategories, setExpenseCategories] = useState([
    'Marketing', 'Operations', 'Software & Tools', 'Travel', 'Office Supplies',
    'Utilities', 'Rent', 'Professional Services', 'Maintenance', 'Other'
  ]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const refreshTimerRef = useRef(null);

  // ── Fetch all collections ──────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    if (!silent) setIsInitialLoading(true);

    try {
      const [
        clientsRes, vendorsRes, expensesRes, pettyRes, salariesRes,
        bankRes, invoicesRes, quotesRes, billsRes, settingsRes
      ] = await Promise.allSettled([
        clientsAPI.getAll(),
        vendorsAPI.getAll(),
        expensesAPI.getAll(),
        pettyCashAPI.getAll(),
        salariesAPI.getAll(),
        bankRecordsAPI.getAll(),
        invoicesAPI.getAll(),
        quotationsAPI.getAll(),
        vendorBillsAPI.getAll(),
        settingsAPI.get(),
      ]);

      if (clientsRes.status === 'fulfilled')   setClients(clientsRes.value.data || []);
      if (vendorsRes.status === 'fulfilled')   setVendors(vendorsRes.value.data || []);
      if (expensesRes.status === 'fulfilled')  setExpenses(expensesRes.value.data || []);
      if (pettyRes.status === 'fulfilled')     setPettyCash(pettyRes.value.data || []);
      if (salariesRes.status === 'fulfilled')  setSalaries(salariesRes.value.data || []);
      if (bankRes.status === 'fulfilled')      setBankRecords(bankRes.value.data || []);
      if (invoicesRes.status === 'fulfilled')  setInvoices(invoicesRes.value.data || []);
      if (quotesRes.status === 'fulfilled')    setQuotations(quotesRes.value.data || []);
      if (billsRes.status === 'fulfilled')     setVendorBills(billsRes.value.data || []);

      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value.data || {};
        setAppSettingsState(s);
        updateCurrencyFormatter(s.locale, s.currency);
        if (s.expenseCategories) setExpenseCategories(s.expenseCategories);
      }

      setLoadError(null);
    } catch (err) {
      console.error('Data fetch error:', err);
      setLoadError('Failed to load data. Please refresh.');
    } finally {
      setIsInitialLoading(false);
    }
  }, [isAuthenticated]);

  // Fetch users separately (admin only)
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'Admin') return;
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data || []);
    } catch (e) {
      console.warn('Could not fetch users:', e.message);
    }
  }, [isAuthenticated, user?.role]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAll();
      fetchUsers();
    } else {
      // Reset on logout
      setClients([]); setVendors([]); setExpenses([]); setPettyCash([]);
      setSalaries([]); setBankRecords([]); setInvoices([]); setQuotations([]);
      setVendorBills([]); setUsers([]); setAppSettingsState({});
      setIsInitialLoading(false);
    }
  }, [isAuthenticated]);

  // Auto-refresh in background
  useEffect(() => {
    if (!isAuthenticated) return;
    refreshTimerRef.current = setInterval(() => fetchAll(true), REFRESH_INTERVAL);
    return () => clearInterval(refreshTimerRef.current);
  }, [isAuthenticated, fetchAll]);

  // ── Settings update ────────────────────────────────────────────────────────
  const updateAppSettings = useCallback(async (updater) => {
    const newSettings = typeof updater === 'function'
      ? updater(appSettings)
      : { ...appSettings, ...updater };
    
    setAppSettingsState(newSettings);
    updateCurrencyFormatter(newSettings.locale, newSettings.currency);
    
    try {
      await settingsAPI.update(newSettings);
    } catch (e) {
      console.warn('Settings sync failed:', e.message);
    }
  }, [appSettings]);

  // ── Generic mutation helpers ───────────────────────────────────────────────
  // These optimistically update local state + hit the API
  const mutations = {
    async create(api, setter, data, label = 'Record') {
      try {
        const res = await api.create(data);
        setter(prev => [res.data, ...prev]);
        toast(`${label} saved successfully!`, 'success');
        return res.data;
      } catch (e) {
        toast(e.response?.data?.error || `Failed to save ${label}`, 'error');
        throw e;
      }
    },

    async update(api, setter, id, data, label = 'Record') {
      try {
        const res = await api.update(id, data);
        setter(prev => prev.map(item => item.id === id ? res.data : item));
        toast(`${label} updated successfully!`, 'success');
        return res.data;
      } catch (e) {
        toast(e.response?.data?.error || `Failed to update ${label}`, 'error');
        throw e;
      }
    },

    async delete(api, setter, id, label = 'Record') {
      try {
        await api.delete(id);
        setter(prev => prev.filter(item => item.id !== id));
        toast(`${label} deleted.`, 'info');
      } catch (e) {
        toast(e.response?.data?.error || `Failed to delete ${label}`, 'error');
        throw e;
      }
    },
  };

  const value = {
    // Data
    clients, vendors, expenses, pettyCash, salaries, bankRecords,
    invoices, quotations, vendorBills, users, appSettings,
    expenseCategories, setExpenseCategories,

    // State
    isInitialLoading, loadError,

    // Refresh
    refresh: () => fetchAll(true),
    refreshUsers: fetchUsers,

    // Settings
    setAppSettings: updateAppSettings,

    // Setters (for optimistic updates)
    setClients, setVendors, setExpenses, setPettyCash, setSalaries,
    setBankRecords, setInvoices, setQuotations, setVendorBills, setUsers,

    // Generic mutations
    mutations,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
