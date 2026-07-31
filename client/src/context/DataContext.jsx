// src/context/DataContext.jsx
// Central data store - fetches from REST API, provides real-time-like updates

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  clientsAPI, vendorsAPI, expensesAPI, pettyCashAPI, salariesAPI,
  bankRecordsAPI, invoicesAPI, quotationsAPI, vendorBillsAPI, usersAPI, settingsAPI,
  employeesAPI
} from '../utils/api';
import { useAuth } from './AuthContext';
import { useToast } from '../components/Toast';
import { updateCurrencyFormatter } from '../utils/helpers';

const DataContext = createContext(null);

const REFRESH_INTERVAL = 30000; // 30 seconds

/**
 * Replaces state only when the payload actually differs.
 *
 * The background refresh previously called every setter on every tick, so all
 * consumers re-rendered every 30 seconds even when nothing had changed —
 * wasted work, and it reset any component holding derived state.
 */
function applyIfChanged(setter, next, signatureRef, key) {
  const sig = JSON.stringify(next);
  if (signatureRef.current[key] === sig) return false;
  signatureRef.current[key] = sig;
  setter(next);
  return true;
}

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
  const [employees, setEmployees] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([
    'Marketing', 'Operations', 'Software & Tools', 'Travel', 'Office Supplies',
    'Utilities', 'Rent', 'Professional Services', 'Maintenance', 'Other'
  ]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const refreshTimerRef = useRef(null);
  const signaturesRef = useRef({});
  // While a form is open the background refresh must not overwrite what the
  // user is typing — Settings fields were resetting mid-edit every 30s.
  const pausedRef = useRef(0);

  // ── Fetch all collections ──────────────────────────────────────────────────
  const fetchAll = useCallback(async (silent = false) => {
    if (!isAuthenticated) return;
    // A silent (background) refresh yields to any open editor.
    if (silent && pausedRef.current > 0) return;
    if (!silent) setIsInitialLoading(true);

    try {
      const sources = [
        ['clients',     clientsAPI.getAll(),     setClients],
        ['vendors',     vendorsAPI.getAll(),     setVendors],
        ['expenses',    expensesAPI.getAll(),    setExpenses],
        ['pettyCash',   pettyCashAPI.getAll(),   setPettyCash],
        ['salaries',    salariesAPI.getAll(),    setSalaries],
        ['employees',   employeesAPI.getAll(),   setEmployees],
        ['bankRecords', bankRecordsAPI.getAll(), setBankRecords],
        ['invoices',    invoicesAPI.getAll(),    setInvoices],
        ['quotations',  quotationsAPI.getAll(),  setQuotations],
        ['vendorBills', vendorBillsAPI.getAll(), setVendorBills],
      ];

      const [results, settingsRes] = await Promise.all([
        Promise.allSettled(sources.map(([, p]) => p)),
        settingsAPI.get().catch(() => null),
      ]);

      results.forEach((res, i) => {
        const [key, , setter] = sources[i];
        // Payroll and employees 403 for non-Admin users by design; leave the
        // existing (empty) state alone rather than treating it as an error.
        if (res.status === 'fulfilled') {
          applyIfChanged(setter, res.value.data || [], signaturesRef, key);
        }
      });

      if (settingsRes) {
        const s = settingsRes.data || {};
        // Never clobber settings while the Settings screen is open.
        if (pausedRef.current === 0) {
          applyIfChanged(setAppSettingsState, s, signaturesRef, 'settings');
          updateCurrencyFormatter(s.locale, s.currency);
          if (s.expenseCategories) {
            applyIfChanged(setExpenseCategories, s.expenseCategories, signaturesRef, 'cats');
          }
        }
      }

      setLoadError(null);
    } catch (err) {
      console.error('Data fetch error:', err);
      setLoadError('Failed to load data. Please refresh.');
    } finally {
      setIsInitialLoading(false);
    }
  }, [isAuthenticated]);

  // Components call these around any editing session.
  const pauseRefresh  = useCallback(() => { pausedRef.current += 1; }, []);
  const resumeRefresh = useCallback(() => {
    pausedRef.current = Math.max(0, pausedRef.current - 1);
  }, []);

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
      setVendorBills([]); setUsers([]); setEmployees([]); setAppSettingsState({});
      signaturesRef.current = {};
      pausedRef.current = 0;
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
    // Keep the signature in step so the next refresh does not see our own
    // write as an incoming change and re-render everything.
    signaturesRef.current.settings = JSON.stringify(newSettings);
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
    invoices, quotations, vendorBills, users, appSettings, employees,
    expenseCategories, setExpenseCategories,

    // State
    isInitialLoading, loadError,

    // Refresh
    refresh: () => fetchAll(true),
    refreshUsers: fetchUsers,
    pauseRefresh, resumeRefresh,

    // Settings
    setAppSettings: updateAppSettings,

    // Setters (for optimistic updates)
    setClients, setVendors, setExpenses, setPettyCash, setSalaries,
    setBankRecords, setInvoices, setQuotations, setVendorBills, setUsers,
    setEmployees,

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
