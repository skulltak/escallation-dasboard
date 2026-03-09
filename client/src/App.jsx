// Build v4.9.1 - UI Polish (Clean Versioning)
import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Search,
  LogOut,
  PieChart,
  LayoutDashboard,
  Plus,
  FileUp,
  FileDown,
  Trash2,
  X,
  Edit2,
  ChevronRight,
  ChevronLeft,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { BRANCHES, BRANDS, HEADER_MAP, API_URL } from './Constants';
import logo from './assets/logo.png';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
const glowPlugin = {
  id: 'glowPlugin',
  beforeDatasetDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    meta.data.forEach((element, index) => {
      const color = dataset.backgroundColor && dataset.backgroundColor[index];
      if (!color) return;
      // Only apply glow to the Red segment (vibrant red)
      if (color === '#ff0000' || color === '#ef4444' || color === '#b91c1c') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
      } else {
        ctx.shadowBlur = 0;
      }
      if (element && typeof element.draw === 'function') {
        element.draw(ctx);
      }
    });
    ctx.restore();
  }
};

// Date Helpers
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      let y, m, d;
      // Handle both YYYY-MM-DD and DD-MM-YYYY in DB
      if (parts[0].length === 4) {
        [y, m, d] = parts;
      } else {
        [d, m, y] = parts;
      }
      // User specifically wants YYYY-DD-MM (Year-Day-Month)
      return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const normalizeDateForCompare = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return dateStr; // Already YYYY-MM-DD
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
};
// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444' }}>⚠️ Something went wrong</h1>
          <p style={{ color: '#64748b' }}>{this.state.error && this.state.error.toString()}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#6366f1', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ParticleBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: -1, pointerEvents: 'none' }}>
      <div className="floating-blob blob-1" />
      <div className="floating-blob blob-2" />
      <div className="floating-blob blob-3" />
    </div>
  );
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good Morning';
  if (h >= 12 && h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const AppleWelcome = ({ text }) => {
  return (
    <div className="apple-welcome-overlay">
      <div className="apple-welcome-text">{text}</div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState('Checking...');
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    branch: '',
    status: '',
    aging: '',
    brand: '',
    serviceType: ''
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedAging, setSelectedAging] = useState(null);
  const [agingDetailModalOpen, setAgingDetailModalOpen] = useState(false);
  const [hasShownAgingPopup, setHasShownAgingPopup] = useState(false);
  const [showAppleWelcome, setShowAppleWelcome] = useState(false);
  const [welcomeText, setWelcomeText] = useState('');
  const agingChartRef = React.useRef(null);

  const deferredFilters = useDeferredValue(filters);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    id: '',
    branch: '',
    brand: '',
    serviceType: '',
    reason: '',
    city: '',
    aging: 0,
    status: 'Open',
    remark: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Global Error Reporter
  useEffect(() => {
    const handleError = (event) => {
      const msg = event.error?.message || event.message || 'Unknown Javascript Error';
      console.error('Captured Global Error:', event.error);
      showToast(`⚠️ UI Error: ${msg}. Please refresh.`, 'error');
    };
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (e) => {
      showToast('⚠️ Async Error: ' + (e.reason?.message || 'Database connection lost'), 'error');
    });
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Auth Effects
  useEffect(() => {
    const savedUser = sessionStorage.getItem('appUser');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      if (parsed.role !== 'ADMIN') {
        setFilters(prev => ({ ...prev, branch: parsed.role }));
        setFormData(prev => ({ ...prev, branch: parsed.role }));
      }
    }
  }, []);

  // Data Fetching
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setData(res.data);

      // Also check DB status
      try {
        const info = await axios.get('/api/info');
        setDbStatus(info.data.db_status === 1 ? 'Connected' : 'Offline');
      } catch (e) {
        setDbStatus('Error');
      }
    } catch (err) {
      console.error('Data loading error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error loading data';
      showToast(`Load Failed: ${errorMsg}`, 'error');
      setDbStatus('Offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Toast System
  const [toasts, setToasts] = useState([]);
  const showToast = (msg, type = 'info') => {
    const fresh = { id: Date.now(), msg, type };
    setToasts(prev => [...prev, fresh]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== fresh.id));
    }, 3000);
  };

  // Helper: Filtered Data
  const filteredData = useMemo(() => {
    let result = data;
    if (user && user.role !== 'ADMIN') {
      const uRole = String(user.role).trim().toLowerCase();
      result = result.filter(d => {
        const dBranch = String(d.branch || "").trim().toLowerCase();
        if (uRole === 'bangalore') {
          return dBranch === 'bangalore' || dBranch === 'ro kar';
        }
        return dBranch === uRole;
      });
    }

    return result.filter(d => {
      const matchesSearch = deferredFilters.search === "" || Object.values(d).some(v => String(v || "").toLowerCase().includes(deferredFilters.search.toLowerCase()));
      const matchesStatus = deferredFilters.status === "" || String(d.status || "").toLowerCase() === String(deferredFilters.status).toLowerCase();

      const dBranch = String(d.branch || "").trim().toLowerCase();
      const fBranch = String(deferredFilters.branch || "").trim().toLowerCase();
      const matchesBranch = fBranch === "" || dBranch === fBranch;

      const matchesDate = deferredFilters.date === "" || (() => {
        if (!d.date) return false;
        const dbDateStr = String(d.date).trim();
        const searchDate = deferredFilters.date; // YYYY-MM-DD from picker

        // 1. Precise components
        const dbParts = dbDateStr.split('-');
        if (dbParts.length !== 3) return dbDateStr.includes(searchDate);

        let y, dPart, mPart;
        if (dbParts[0].length === 4) {
          [y, mPart, dPart] = dbParts;
        } else {
          [dPart, mPart, y] = dbParts;
        }

        const yS = String(y);
        const mS = String(mPart).padStart(2, '0');
        const dS = String(dPart).padStart(2, '0');

        // Check searchDate (YYYY-MM-DD from picker) against both interpretations
        if (`${yS}-${mS}-${dS}` === searchDate) return true; // Standard
        if (`${yS}-${dS}-${mS}` === searchDate) return true; // Swapped

        return false;
      })();

      const matchesAging = deferredFilters.aging === "" || String(d.aging || 0) === deferredFilters.aging;
      const matchesBrand = deferredFilters.brand === "" || String(d.brand || "").toLowerCase().includes(String(deferredFilters.brand).toLowerCase());
      const matchesServiceType = deferredFilters.serviceType === "" || String(d.serviceType || "").toLowerCase() === String(deferredFilters.serviceType).toLowerCase();

      return matchesSearch && matchesStatus && matchesBranch && matchesDate && matchesAging && matchesBrand && matchesServiceType;
    });
  }, [data, deferredFilters, user]);

  const selectedAgingCases = useMemo(() => {
    if (selectedAging === null) return [];
    return filteredData.filter(d =>
      String(d.status || '').toLowerCase() !== 'closed' &&
      String(d.status || '').toLowerCase() !== 'cancelled' &&
      Number(d.aging || 0) === selectedAging
    );
  }, [filteredData, selectedAging]);

  // Aging Reminder Popup
  useEffect(() => {
    if (user && !hasShownAgingPopup && filteredData.length > 0) {
      const agingCount = filteredData.filter(d =>
        String(d.status || '').toLowerCase() !== 'closed' &&
        String(d.status || '').toLowerCase() !== 'cancelled' &&
        Number(d.aging || 0) > 5
      ).length;

      if (agingCount > 0) {
        showToast(`Reminder: You have ${agingCount} cases with aging over 5 days!`, 'error');
        setHasShownAgingPopup(true);
      }
    }
  }, [user, filteredData, hasShownAgingPopup]);

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');
    const u = e.target.loginUser.value.trim().toUpperCase();
    const p = e.target.loginPass.value;

    if (p === "Vecare@2026") {
      const uUpper = u.toUpperCase();
      let branchRef = BRANCHES.find(b => b.toUpperCase() === uUpper);

      // Alias HYD to Hyderabad, MP to Madhya Pradesh
      if (uUpper === "HYD" || uUpper === "HYDERABAD") {
        branchRef = "Hyderabad";
      } else if (uUpper === "MP") {
        branchRef = "Madhya Pradesh";
      }

      if (uUpper === "ADMIN" || branchRef) {
        const newUser = {
          role: uUpper === "ADMIN" ? "ADMIN" : branchRef,
          name: uUpper === "ADMIN" ? "Administrator" : `Branch Manager (${branchRef})`
        };
        setUser(newUser);
        sessionStorage.setItem('appUser', JSON.stringify(newUser));
        // Compute greeting text
        const timeGreeting = getTimeGreeting();
        const greeting = newUser.role === 'ADMIN'
          ? timeGreeting
          : `${timeGreeting}, ${newUser.role}`;
        setWelcomeText(greeting);
        // Apple welcome effect for all users
        setShowAppleWelcome(true);
        setTimeout(() => setShowAppleWelcome(false), 3500);
        if (newUser.role !== 'ADMIN') {
          setFilters(prev => ({ ...prev, branch: newUser.role }));
          setFormData(prev => ({ ...prev, branch: newUser.role }));
        }
      } else {
        setLoginError('Invalid Username/Branch ID');
        showToast('Invalid Username/Branch ID', 'error');
      }
    } else {
      setLoginError('Warning: Incorrect Password');
      showToast('Warning: Incorrect Password', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('appUser');
    setUser(null);
    setData([]);
  };

  const handleAgingChartClick = (event) => {
    const { current: chart } = agingChartRef;
    if (!chart) return;

    const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    if (elements.length > 0) {
      const index = elements[0].index;
      const label = agingBarData.labels[index]; // e.g. "28 Days"
      const agingValue = parseInt(label);
      setSelectedAging(agingValue);
      setAgingDetailModalOpen(true);
    }
  };

  // CRUD Handlers
  const openEditModal = (row) => {
    setEditingId(row._id);
    setFormData({ ...row });
    setModalOpen(true);
  };

  const closeCaseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      id: '',
      branch: user?.role !== 'ADMIN' ? user.role : '',
      brand: '',
      serviceType: '',
      reason: '',
      city: '',
      aging: 0,
      status: 'Open',
      remark: ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData);
        showToast('Updated successfully', 'success');
      } else {
        await axios.post(API_URL, formData);
        showToast('Saved successfully', 'success');
      }
      closeCaseModal();
      loadData();
    } catch (err) {
      showToast('Save failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      showToast('Deleted');
      loadData();
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("CRITICAL: Delete ALL records?")) return;
    try {
      await axios.delete(`${API_URL}/all`);
      showToast('Cleared All Data');
      loadData();
    } catch (err) {
      showToast('Clear failed', 'error');
    }
  };

  // Import / Export
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        // Use readAsArrayBuffer for better binary/Excel support
        const wb = XLSX.read(data, {
          type: 'array',
          cellDates: true, // Automatically parse dates in Excel
          cellNF: false,
          cellText: false
        });

        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rows.length < 2) throw new Error("File empty or invalid format");

        const fileHeaders = rows[0].map(h => String(h || "").trim().toLowerCase());
        const colMap = {};
        fileHeaders.forEach((h, idx) => {
          if (HEADER_MAP[h]) colMap[HEADER_MAP[h]] = idx;
        });

        const entries = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const entry = {};
          let hasData = false;

          Object.keys(colMap).forEach(key => {
            const idx = colMap[key];
            let val = row[idx];

            if (key === 'date') {
              if (val instanceof Date) {
                entry[key] = val.toISOString().split('T')[0];
              } else if (typeof val === 'number') {
                // Handle Excel serial numeric dates if cellDates failed
                entry[key] = XLSX.utils.format_cell({ v: val, t: 'd' });
              } else {
                entry[key] = String(val || "").trim();
              }
            } else {
              entry[key] = val !== undefined && val !== null ? String(val).trim() : "";
            }

            if (entry[key]) hasData = true;
          });

          if (!hasData) continue;
          if (!entry.date || !entry.id || !entry.branch) continue;
          if (user.role !== "ADMIN") {
            const uRole = String(user.role).toLowerCase();
            const eBranch = String(entry.branch).toLowerCase();
            if (uRole === 'bangalore') {
              if (eBranch !== 'bangalore' && eBranch !== 'ro kar') continue;
            } else if (eBranch !== uRole) {
              continue;
            }
          }

          // Normalize branch name if it matches a known branch in any case
          let canonicalBranch = BRANCHES.find(b => b.toLowerCase() === String(entry.branch).toLowerCase());

          // Alias HYD to Hyderabad, MP to Madhya Pradesh during import normalization
          const branchUpper = String(entry.branch).toUpperCase();
          if (branchUpper === "HYD" || branchUpper === "HYDERABAD") {
            canonicalBranch = "Hyderabad";
          } else if (branchUpper === "MP") {
            canonicalBranch = "Madhya Pradesh";
          }

          if (canonicalBranch) entry.branch = canonicalBranch;

          entry.aging = parseInt(entry.aging) || 0;
          entries.push(entry);
        }

        if (entries.length) {
          setImporting(true);
          showToast(`Importing ${entries.length} cases...`, 'info');
          try {
            await axios.post(`${API_URL}/bulk`, entries);
            showToast(`Successfully imported ${entries.length} records`, 'success');
            loadData();
          } catch (err) {
            console.error("Bulk upload error:", err);
            const errMsg = err.response?.data?.message || err.message;
            showToast(`Import failed: ${errMsg}`, 'error');
          } finally {
            setImporting(false);
          }
        } else {
          showToast('No valid records found for import', 'info');
        }
      } catch (err) {
        showToast('Import error: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExport = () => {
    if (!filteredData.length) return showToast("No data to export");
    const columns = ["date", "id", "branch", "brand", "reason", "city", "aging", "status", "remark"];
    const headers = ["Date", "ID", "Branch", "Brand", "Reason", "City", "Aging", "Status", "Remark"];

    let csv = headers.join(",") + "\n";
    filteredData.forEach(row => {
      csv += columns.map(col => {
        let val = row[col] || "";
        if (String(val).includes(",") || String(val).includes('"')) {
          val = `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "escalations_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReportExport = () => {
    if (!reportData.length) return showToast("No data to export");
    const columns = ["branch", "total", "open", "closed", "avgAging", "compliance"];
    const headers = ["Branch", "Total", "Open", "Closed", "Avg Aging", "Compliance (%)"];

    let csv = headers.join(",") + "\n";
    reportData.forEach(row => {
      csv += columns.map(col => {
        let val = row[col] || "0";
        if (String(val).includes(",") || String(val).includes('"')) {
          val = `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Branch_Performance_Summary_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Report Logic
  const reportData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const relevant = user?.role === "ADMIN" ? data : data.filter(d => {
      const uRole = String(user?.role || "").toLowerCase();
      const dBranch = String(d.branch || "").toLowerCase();
      if (uRole === 'bangalore') {
        return dBranch === 'bangalore' || dBranch === 'ro kar';
      }
      return dBranch === uRole;
    });
    const filtered = deferredFilters.date ? relevant.filter(d => {
      if (!d || !d.date) return false;
      const dbDateStr = String(d.date).trim();
      const searchDate = deferredFilters.date;

      const dbParts = dbDateStr.split('-');
      if (dbParts.length !== 3) return dbDateStr.includes(searchDate);

      let y, dPart, mPart;
      if (dbParts[0].length === 4) {
        [y, mPart, dPart] = dbParts;
      } else {
        [dPart, mPart, y] = dbParts;
      }

      const yS = String(y);
      const mS = String(mPart).padStart(2, '0');
      const dS = String(dPart).padStart(2, '0');

      if (`${yS}-${mS}-${dS}` === searchDate) return true;
      if (`${yS}-${dS}-${mS}` === searchDate) return true;

      return false;
    }) : relevant;

    const stats = {};
    const branchList = Array.isArray(BRANCHES) ? BRANCHES : [];
    branchList.forEach(b => {
      if (user?.role && user.role !== "ADMIN") {
        const uRole = String(user.role).toLowerCase();
        const bLower = b.toLowerCase();
        if (uRole === 'bangalore') {
          if (bLower !== 'bangalore' && bLower !== 'ro kar') return;
        } else if (bLower !== uRole) {
          return;
        }
      }
      stats[b] = { total: 0, open: 0, closed: 0, totalAging: 0 };
    });

    filtered.forEach(d => {
      if (!d) return;
      // Find the canonical branch name for the stat bucket
      const canonicalBranch = branchList.find(b => b.toLowerCase() === String(d.branch || "").toLowerCase());
      if (!canonicalBranch || !stats[canonicalBranch]) return;

      stats[canonicalBranch].total++;
      stats[canonicalBranch].totalAging += (d.aging || 0);
      const s = String(d.status || "").toLowerCase();
      if (s === "open") stats[canonicalBranch].open++;
      else if (s === "closed") stats[canonicalBranch].closed++;
    });

    return Object.keys(stats).sort().map(branch => {
      const s = stats[branch];
      const avgAging = s.total > 0 ? (s.totalAging / s.total).toFixed(1) : "0.0";
      const compliance = s.total > 0 ? Math.round((s.closed / s.total) * 100) : 0;
      return { branch, ...s, avgAging, compliance };
    });
  }, [data, deferredFilters, user]);

  const chartData = useMemo(() => {
    if (!Array.isArray(filteredData)) return { labels: [], datasets: [] };
    const branches = [...new Set(filteredData.map(d => d.branch))].filter(Boolean).slice(0, 10);
    return {
      labels: branches,
      datasets: [{
        label: 'Open Cases',
        data: branches.map(b => filteredData.filter(d => d && d.branch === b && String(d.status || "").toLowerCase() === 'open').length),
        backgroundColor: '#6366f1'
      }]
    };
  }, [filteredData]);

  const agingBarData = useMemo(() => {
    if (!Array.isArray(filteredData)) return { labels: [], datasets: [] };
    const activeData = filteredData.filter(d =>
      d &&
      String(d.status || '').toLowerCase() !== 'closed' &&
      String(d.status || '').toLowerCase() !== 'cancelled'
    );

    const counts = {};
    activeData.forEach(d => {
      const aging = Number(d.aging || 0);
      counts[aging] = (counts[aging] || 0) + 1;
    });

    const range = Object.keys(counts).map(Number);
    range.sort((a, b) => {
      const aIsRed = a > 5;
      const bIsRed = b > 5;
      if (aIsRed && !bIsRed) return -1;
      if (!aIsRed && bIsRed) return 1;
      return a - b;
    });

    return {
      labels: range.map(a => `${a} Days`),
      datasets: [{
        label: 'Number of Cases',
        data: range.map(a => counts[a]),
        backgroundColor: range.map(a => a > 5 ? '#ef4444' : '#6366f1'),
        borderRadius: 4
      }]
    };
  }, [filteredData]);

  const brandBarData = useMemo(() => {
    const brands = Array.isArray(BRANDS) ? BRANDS : [];
    if (!Array.isArray(filteredData)) return { labels: brands, datasets: [] };
    return {
      labels: brands,
      datasets: [{
        label: 'Cases by Brand',
        data: brands.map(brand => filteredData.filter(d => d && String(d.brand || "").toLowerCase() === brand.toLowerCase()).length),
        backgroundColor: '#6366f1',
        borderRadius: 4
      }]
    };
  }, [filteredData]);

  const doughnutData = useMemo(() => {
    const stats = { open: 0, aging: 0, closed: 0, cancelled: 0 };
    if (Array.isArray(filteredData)) {
      filteredData.forEach(d => {
        if (!d) return;
        const s = String(d.status || "").toLowerCase();
        if (s === 'closed') stats.closed++;
        else if (s === 'cancelled') stats.cancelled++;
        else if (Number(d.aging || 0) > 5) stats.aging++;
        else stats.open++;
      });
    }
    return {
      labels: ['Open/New', 'Aging (>5 Days)', 'Closed', 'Cancelled'],
      datasets: [{
        data: [stats.open, stats.aging, stats.closed, stats.cancelled],
        backgroundColor: ['#fef08a', '#ff0000', '#10b981', '#94a3b8'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [filteredData]);

  const SkeletonStats = () => (
    <div className="stats-grid">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="stat-card skeleton" style={{ height: '110px' }}></div>
      ))}
    </div>
  );

  const SkeletonTable = () => (
    <div className="table-section">
      <div className="table-header skeleton" style={{ height: '60px', marginBottom: '1rem' }}></div>
      <div className="table-container">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '50px', margin: '0.5rem 1.5rem', borderRadius: '0.25rem' }}></div>
        ))}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div id="loginScreen">
        <ParticleBackground />
        <div className="login-bg"></div>
        <div className="login-blob blob-1"></div>
        <div className="login-blob blob-2"></div>
        <div className="login-blob blob-3"></div>
        <img src={logo} className="logo-watermark" alt="Watermark" />
        <form className="login-card" onSubmit={handleLogin}>
          <img src={logo} className="login-logo" alt="VE CARE Logo" />
          <h1 className="login-title">Escalation Dashboard</h1>
          <p className="login-subtitle">Secure Access Management</p>
          <div className="flex flex-col gap-1">
            <input name="loginUser" type="text" className="login-input" placeholder="Username / ID" required />
            <div style={{ position: 'relative' }}>
              <input
                name="loginPass"
                type={showPassword ? "text" : "password"}
                className="login-input"
                placeholder="Password"
                required
                style={{ paddingRight: '3.5rem' }}
              />
              <div
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1.25rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  marginTop: '-0.6rem',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>
          </div>
          {loginError && (
            <div style={{
              color: 'var(--danger)',
              fontSize: '0.85rem',
              textAlign: 'center',
              marginBottom: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600'
            }}>
              {loginError}
            </div>
          )}
          <button type="submit" className="btn-login">Enter Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Apple Welcome Overlay */}
      {showAppleWelcome && <AppleWelcome text={welcomeText} />}

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderColor: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--primary)' }}>
            <span>{t.type === 'success' ? '✅' : 'ℹ️'}</span>
            <div>{t.msg}</div>
          </div>
        ))}
      </div>

      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <img src={logo} className="brand-logo" alt="Logo" />
          {!isSidebarCollapsed && <div className="brand-text">VE CARE</div>}
        </div>
        <nav className="flex-col gap-2">
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={18} /> {!isSidebarCollapsed && "Dashboard"}
          </div>
          <div className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
            <TrendingUp size={18} /> {!isSidebarCollapsed && "Reports"}
          </div>
        </nav>

        <div className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </div>

        <div className="user-profile">
          <div className="avatar">{user.role[0]}</div>
          {!isSidebarCollapsed && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div className="text-sm font-bold">Welcome</div>
              <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
            </div>
          )}
          <div className="cursor-pointer" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </div>
        </div>
      </aside>

      <main className={`main-content ${loading ? 'opacity-50' : ''}`}>
        <header className="top-bar">
          <div className="flex flex-col">
            <h2 className="page-title">{view === 'dashboard' ? 'Overview' : 'Reports'}</h2>
            <div className="text-xs flex items-center gap-1" style={{ opacity: 0.7 }}>
              Status: <span style={{ color: dbStatus === 'Connected' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                {dbStatus === 'Connected' ? '🟢 Connected' : '🔴 Database Offline'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Quick Search..."
                className="btn-sm"
                style={{ paddingLeft: '2.5rem', borderRadius: '99px', width: '220px' }}
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            </div>
            <div className="text-sm font-bold">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </header>

        <div className="view-transition-active">
          {view === 'dashboard' ? (
            <div className="dashboard-scroll">
              {loading ? <SkeletonStats /> : (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Total Cases</h4>
                      <div className="value">{filteredData.length}</div>
                    </div>
                    <div className="icon-box bg-blue-100"><BarChart3 size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Total Open</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'open').length}</div>
                    </div>
                    <div className="icon-box bg-red-100"><AlertTriangle size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Closed</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'closed').length}</div>
                    </div>
                    <div className="icon-box bg-green-100"><CheckCircle2 size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Cancelled</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'cancelled').length}</div>
                    </div>
                    <div className="icon-box bg-gray-100" style={{ color: '#64748b' }}><XCircle size={24} /></div>
                  </div>
                  <div className="stat-card" style={{ border: '1px solid var(--warning)' }}>
                    <div className="stat-info">
                      <h4 style={{ color: 'var(--warning)' }}>Aging ({'>'} 5 Days)</h4>
                      <div className="value" style={{ WebkitTextFillColor: 'var(--warning)' }}>
                        {filteredData.filter(d => String(d.status || "").toLowerCase() !== 'closed' && String(d.status || "").toLowerCase() !== 'cancelled' && d.aging > 5).length}
                      </div>
                    </div>
                    <div className="icon-box bg-yellow-100"><AlertTriangle size={24} /></div>
                  </div>
                </div>
              )}

              <div className={`charts-grid ${loading ? 'opacity-20' : ''}`}>
                <div className="chart-card">
                  <h3>Status</h3>
                  <div className="chart-container">
                    <Doughnut data={doughnutData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '75%',
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { size: 12 }
                          }
                        },
                        glowPlugin: {}
                      }
                    }} plugins={[glowPlugin]} />
                  </div>
                </div>
                <div className="chart-card">
                  <h3>{user?.role === 'ADMIN' ? 'Branch Wise Escalation' : 'Case Aging'}</h3>
                  <div className="chart-container chart-scroll-container" style={{ overflowX: 'auto', overflowY: 'hidden', display: 'block', paddingBottom: '10px' }}>
                    <div style={{ width: `${Math.max(100, (user?.role === 'ADMIN' ? chartData.labels.length : agingBarData.labels.length) * 60)}px`, height: '300px', position: 'relative' }}>
                      <Bar
                        ref={user?.role !== 'ADMIN' ? agingChartRef : null}
                        onClick={user?.role !== 'ADMIN' ? handleAgingChartClick : undefined}
                        data={user?.role === 'ADMIN' ? chartData : agingBarData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `Cases: ${context.raw}`
                              }
                            },
                            glowPlugin: {}
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              grid: { color: 'rgba(0,0,0,0.05)' },
                              title: { display: true, text: user?.role === 'ADMIN' ? 'Cases' : 'Case Count', font: { size: 10, weight: 'bold' } }
                            },
                            x: {
                              grid: { display: false },
                              ticks: {
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 0,
                                font: { size: 10 }
                              }
                            }
                          }
                        }} plugins={[glowPlugin]} />
                    </div>
                  </div>
                </div>
                <div className="chart-card">
                  <h3>Brand Escalation</h3>
                  <div className="chart-container">
                    <Bar data={brandBarData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                      }
                    }} />
                  </div>
                </div>
              </div>

              {loading || importing ? <SkeletonTable /> : (
                <div className="table-section">
                  <div className="table-header">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold">Recent Escalations</h3>
                      {user?.role === 'ADMIN' && (
                        <button className="btn-sm btn-primary-sm" onClick={() => setModalOpen(true)}><Plus size={16} /> New Case</button>
                      )}
                    </div>
                    <div className="action-group">
                      <input
                        type="date"
                        className="btn-sm"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                      {(user.role === 'ADMIN' || (user.role && String(user.role).toLowerCase() === 'bangalore')) && (
                        <select className="btn-sm" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
                          <option value="">All Branches</option>
                          {BRANCHES.map(b => {
                            if (user.role !== 'ADMIN' && String(user.role).toLowerCase() === 'bangalore') {
                              const bLower = b.toLowerCase();
                              if (bLower !== 'bangalore' && bLower !== 'ro kar') return null;
                            }
                            return <option key={b}>{b}</option>;
                          })}
                        </select>
                      )}
                      <select className="btn-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        <option>Open</option>
                        <option>Closed</option>
                        <option>Cancelled</option>
                      </select>
                      <select className="btn-sm" value={filters.serviceType} onChange={(e) => setFilters({ ...filters, serviceType: e.target.value })}>
                        <option value="">All Services</option>
                        <option>Field Service</option>
                        <option>Installation & Demo</option>
                      </select>
                      <input
                        list="brand-list"
                        className="btn-sm"
                        placeholder="Search Brand..."
                        style={{ width: '130px' }}
                        value={filters.brand}
                        onChange={(e) => setFilters({ ...filters, brand: e.target.value })}
                      />
                      <datalist id="brand-list">
                        {BRANDS.map(b => <option key={b} value={b} />)}
                      </datalist>
                      <input
                        type="text"
                        className="btn-sm"
                        placeholder="Search Aging..."
                        style={{ width: '120px' }}
                        value={filters.aging}
                        onChange={(e) => setFilters({ ...filters, aging: e.target.value })}
                      />
                      {user?.role === 'ADMIN' && (
                        <label className="btn-sm flex items-center gap-2">
                          <FileUp size={16} /> Import
                          <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
                        </label>
                      )}
                      <button className="btn-sm flex items-center gap-2" onClick={handleExport}><FileDown size={16} /> Export</button>
                      {user.role === 'ADMIN' && (
                        <button className="btn-sm flex items-center gap-2" style={{ color: 'var(--danger)' }} onClick={handleClearAll}><Trash2 size={16} /> Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Branch</th>
                          <th>Aging</th>
                          <th>Brand</th>
                          <th>ID</th>
                          <th>Service Type</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map(row => (
                          <tr key={row._id}>
                            <td>{formatDisplayDate(row.date)}</td>
                            <td>{row.branch}</td>
                            <td>
                              <span className={`badge ${row.aging > 10 ? 'badge-danger' : row.aging > 5 ? 'badge-warning' : 'badge-success'}`}>
                                {row.aging} Days
                              </span>
                            </td>
                            <td>{row.brand}</td>
                            <td className="font-medium text-secondary">{row.id}</td>
                            <td>{row.serviceType}</td>
                            <td className="text-secondary" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.reason}</td>
                            <td>
                              <span className={`status-pill ${String(row.status || "").toLowerCase() === 'closed' ? 'closed' : String(row.status || "").toLowerCase() === 'cancelled' ? 'cancelled' : 'open'}`}>
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button onClick={() => openEditModal(row)} className="btn-sm" style={{ padding: '0.25rem' }}><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(row._id)} className="btn-sm" style={{ padding: '0.25rem', color: 'var(--danger)' }}><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-scroll">
              {loading ? <SkeletonTable /> : (
                <div className="table-section">
                  <div className="table-header">
                    <h3 className="font-bold">Branch Performance Summary</h3>
                    <div className="action-group">
                      <input
                        type="date"
                        className="btn-sm"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                      <button className="btn-sm flex items-center gap-2" onClick={handleReportExport}>
                        <FileDown size={16} /> Export
                      </button>
                    </div>
                  </div>
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Total</th>
                          <th>Open</th>
                          <th>Closed</th>
                          <th>Avg Aging</th>
                          <th>Compliance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map(r => (
                          <tr key={r.branch}>
                            <td><b>{r.branch}</b></td>
                            <td>{r.total}</td>
                            <td>{r.open}</td>
                            <td>{r.closed}</td>
                            <td>{r.avgAging}</td>
                            <td style={{ color: r.compliance > 80 ? 'var(--success)' : r.compliance > 50 ? 'var(--warning)' : 'var(--danger)', fontWeight: 700 }}>{r.compliance}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main >

      {/* Modal */}
      {
        modalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>{editingId ? 'Edit Case' : 'New Case'}</h3>
                <X className="cursor-pointer" onClick={closeCaseModal} />
              </div>
              <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                <div className="form-group">
                  <label>Reference ID</label>
                  <input required className="form-control" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Date Logged</label>
                  <input type="date" required className="form-control" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <select
                    className="form-control"
                    required
                    disabled={user.role !== 'ADMIN' && String(user.role || '').toLowerCase() !== 'bangalore'}
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  >
                    <option value="">Select Branch</option>
                    {BRANCHES.map(b => {
                      if (user.role !== 'ADMIN' && String(user.role || '').toLowerCase() === 'bangalore') {
                        const bLower = b.toLowerCase();
                        if (bLower !== 'bangalore' && bLower !== 'ro kar') return null;
                      }
                      return <option key={b}>{b}</option>;
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <select
                    className="form-control"
                    required
                    disabled={user?.role !== 'ADMIN'}
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  >
                    <option value="">Select Brand</option>
                    {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    className="form-control"
                    required
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  >
                    <option value="">Select Service Type</option>
                    <option>Field Service</option>
                    <option>Installation & Demo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option>Open</option>
                    <option>Closed</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Aging Days</label>
                  <input type="number" className="form-control" value={formData.aging} onChange={(e) => setFormData({ ...formData, aging: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input className="form-control" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea className="form-control" rows="3" value={formData.remark} onChange={(e) => setFormData({ ...formData, remark: e.target.value })} />
                </div>
                <div className="flex gap-2" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                  <button type="button" className="btn-sm" style={{ flex: 1 }} onClick={closeCaseModal}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ flex: 2 }}>{editingId ? 'Update' : 'Save'} Record</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Aging Detail Modal */}
      {agingDetailModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Cases with {selectedAging} Days Aging</h3>
              <X className="cursor-pointer" onClick={() => setAgingDetailModalOpen(false)} />
            </div>
            <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Brand</th>
                    <th>ID</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAgingCases.map(row => (
                    <tr key={row._id}>
                      <td>{formatDisplayDate(row.date)}</td>
                      <td>{row.brand}</td>
                      <td>{row.id}</td>
                      <td>
                        <button onClick={() => { setAgingDetailModalOpen(false); openEditModal(row); }} className="btn-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
