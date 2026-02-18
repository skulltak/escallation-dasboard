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
  Edit2
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
import { BRANCHES, HEADER_MAP, API_URL } from './Constants';
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

const ParticleBackground = () => {
  const canvasRef = React.useRef(null);
  const mouseRef = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const colors = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#6366F1', '#A855F7'];
    const particles = [];
    const particleCount = 400;
    const focalLength = 300;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX - window.innerWidth / 2) * 0.05;
      mouseRef.current.y = (e.clientY - window.innerHeight / 2) * 0.05;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    resize();

    class Particle3D {
      constructor() {
        this.init();
      }

      init() {
        this.x3d = (Math.random() - 0.5) * 2000;
        this.y3d = (Math.random() - 0.5) * 2000;
        this.z3d = Math.random() * 2000;
        this.vz = -2 - Math.random() * 5; // Speed towards viewer
        this.radius = Math.random() * 1.5 + 0.5;
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.z3d += this.vz;

        // Reset if passed viewer or distance
        if (this.z3d <= 0) {
          this.z3d = 2000;
          this.x3d = (Math.random() - 0.5) * 2000;
          this.y3d = (Math.random() - 0.5) * 2000;
        }
      }

      draw() {
        // Perspective Projection
        const scale = focalLength / (focalLength + this.z3d);
        const x2d = (this.x3d + mouseRef.current.x) * scale + canvas.width / 2;
        const y2d = (this.y3d + mouseRef.current.y) * scale + canvas.height / 2;
        const currentRadius = this.radius * scale * 5;

        if (x2d > 0 && x2d < canvas.width && y2d > 0 && y2d < canvas.height) {
          ctx.beginPath();
          ctx.arc(x2d, y2d, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = this.color;
          ctx.globalAlpha = Math.min(1, scale * 10); // Fade in as they get closer
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle3D());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sort particles by depth for basic z-indexing (further first)
      particles.sort((a, b) => b.z3d - a.z3d);

      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);
  const [view, setView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    branch: '',
    status: '',
    aging: ''
  });

  const deferredFilters = useDeferredValue(filters);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    id: '',
    branch: '',
    brand: '',
    reason: '',
    city: '',
    aging: 0,
    status: 'Open',
    remark: ''
  });

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
    } catch (err) {
      console.error('Data loading error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Error loading data';
      showToast(`Load Failed: ${errorMsg}`, 'error');
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
      result = result.filter(d => String(d.branch || "").trim().toLowerCase() === uRole);
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
        const searchStr = String(deferredFilters.date).trim().toLowerCase();

        // Check if the search string is present in the DB date (handles partial matches like "16" or "2026")
        if (dbDateStr.toLowerCase().includes(searchStr)) return true;

        // Also check converted format for matching YYYY-MM-DD input against DD-MM-YYYY DB
        if (dbDateStr.includes('-')) {
          const parts = dbDateStr.split('-');
          if (parts.length === 3) {
            if (parts[0].length !== 4) { // DD-MM-YYYY in DB
              const [day, month, year] = parts;
              const converted = `${year}-${month}-${day}`;
              if (converted.includes(searchStr)) return true;
            }
          }
        }
        return false;
      })();

      let matchesAging = true;
      if (deferredFilters.aging === "0-5") matchesAging = d.aging <= 5;
      else if (deferredFilters.aging === "6-10") matchesAging = d.aging >= 6 && d.aging <= 10;
      else if (deferredFilters.aging === "11+") matchesAging = d.aging > 10;

      return matchesSearch && matchesStatus && matchesBranch && matchesDate && matchesAging;
    });
  }, [data, deferredFilters, user]);

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    const u = e.target.loginUser.value.trim().toUpperCase();
    const p = e.target.loginPass.value;

    if (p === "VECARE") {
      const uUpper = u.toUpperCase();
      let branchRef = BRANCHES.find(b => b.toUpperCase() === uUpper);

      // Alias HYD to Hyderabad
      if (uUpper === "HYD" || uUpper === "HYDERABAD") {
        branchRef = "Hyderabad";
      }

      if (uUpper === "ADMIN" || branchRef) {
        const newUser = {
          role: uUpper === "ADMIN" ? "ADMIN" : branchRef,
          name: uUpper === "ADMIN" ? "Administrator" : `Branch Manager (${branchRef})`
        };
        setUser(newUser);
        sessionStorage.setItem('appUser', JSON.stringify(newUser));
        if (newUser.role !== 'ADMIN') {
          setFilters(prev => ({ ...prev, branch: newUser.role }));
          setFormData(prev => ({ ...prev, branch: newUser.role }));
        }
      } else {
        showToast('Invalid Username/Branch ID', 'error');
      }
    } else {
      showToast('Invalid Password', 'error');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('appUser');
    setUser(null);
    setData([]);
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
          if (user.role !== "ADMIN" && String(entry.branch).toLowerCase() !== String(user.role).toLowerCase()) continue;

          // Normalize branch name if it matches a known branch in any case
          let canonicalBranch = BRANCHES.find(b => b.toLowerCase() === String(entry.branch).toLowerCase());

          // Alias HYD to Hyderabad during import normalization
          if (String(entry.branch).toUpperCase() === "HYD" || String(entry.branch).toUpperCase() === "HYDERABAD") {
            canonicalBranch = "Hyderabad";
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
    const relevant = user?.role === "ADMIN" ? data : data.filter(d => String(d.branch || "").toLowerCase() === String(user?.role || "").toLowerCase());
    const filtered = deferredFilters.date ? relevant.filter(d => {
      if (!d.date) return false;
      const dbDateStr = String(d.date).trim();
      const searchStr = String(deferredFilters.date).trim().toLowerCase();

      if (dbDateStr.toLowerCase().includes(searchStr)) return true;

      if (dbDateStr.includes('-')) {
        const parts = dbDateStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length !== 4) { // DD-MM-YYYY
            const [day, month, year] = parts;
            const converted = `${year}-${month}-${day}`;
            if (converted.includes(searchStr)) return true;
          }
        }
      }
      return false;
    }) : relevant;

    const stats = {};
    BRANCHES.forEach(b => {
      if (user?.role !== "ADMIN" && b.toLowerCase() !== String(user?.role || "").toLowerCase()) return;
      stats[b] = { total: 0, open: 0, closed: 0, totalAging: 0 };
    });

    filtered.forEach(d => {
      // Find the canonical branch name for the stat bucket
      const canonicalBranch = BRANCHES.find(b => b.toLowerCase() === String(d.branch || "").toLowerCase());
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
    const branches = [...new Set(filteredData.map(d => d.branch))].slice(0, 10);
    return {
      labels: branches,
      datasets: [{
        label: 'Cases',
        data: branches.map(b => filteredData.filter(d => d.branch === b).length),
        backgroundColor: '#6366f1'
      }]
    };
  }, [filteredData]);

  const doughnutData = useMemo(() => {
    const stats = { open: 0, aging: 0, closed: 0 };
    filteredData.forEach(d => {
      const s = String(d.status || "").toLowerCase();
      if (s === 'closed') stats.closed++;
      else if (d.aging > 5) stats.aging++;
      else stats.open++;
    });
    return {
      labels: ['Open/New', 'Aging (>5 Days)', 'Closed'],
      datasets: [{
        data: [stats.open, stats.aging, stats.closed],
        backgroundColor: ['#fef08a', '#ef4444', '#10b981'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [filteredData]);

  const SkeletonStats = () => (
    <div className="stats-grid">
      {[...Array(4)].map((_, i) => (
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
          <p className="login-subtitle">Secure Access Management <span style={{ fontSize: '10px', opacity: 0.5 }}>(v4.1.2 - 3D PRO)</span></p>
          <div className="flex flex-col gap-1">
            <input name="loginUser" type="text" className="login-input" placeholder="Username / ID" required />
            <input name="loginPass" type="password" className="login-input" placeholder="Password" required />
          </div>
          <button type="submit" className="btn-login">Enter Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast" style={{ borderColor: t.type === 'error' ? 'var(--danger)' : t.type === 'success' ? 'var(--success)' : 'var(--primary)' }}>
            <span>{t.type === 'success' ? '✅' : 'ℹ️'}</span>
            <div>{t.msg}</div>
          </div>
        ))}
      </div>

      <aside className="sidebar">
        <div className="brand">
          <img src={logo} className="brand-logo" alt="Logo" />
          <div className="brand-text">VE CARE</div>
        </div>
        <nav className="flex-col gap-2">
          <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={18} /> Dashboard
          </div>
          <div className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => setView('reports')}>
            <TrendingUp size={18} /> Reports
          </div>
        </nav>
        <div className="user-profile">
          <div className="avatar">{user.role[0]}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="text-sm font-bold">Welcome</div>
            <div className="text-xs text-muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.role}</div>
          </div>
          <div className="cursor-pointer" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </div>
        </div>
      </aside>

      <main className={`main-content ${loading ? 'opacity-50' : ''}`}>
        <header className="top-bar">
          <h2 className="page-title">{view === 'dashboard' ? 'Overview' : 'Reports'}</h2>
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
                      <h4>Open / New</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'open' && d.aging <= 5).length}</div>
                    </div>
                    <div className="icon-box bg-red-100"><AlertTriangle size={24} /></div>
                  </div>
                  <div className="stat-card" style={{ border: '1px solid var(--warning)' }}>
                    <div className="stat-info">
                      <h4 style={{ color: 'var(--warning)' }}>Aging ({'>'} 5 Days)</h4>
                      <div className="value" style={{ WebkitTextFillColor: 'var(--warning)' }}>
                        {filteredData.filter(d => String(d.status || "").toLowerCase() !== 'closed' && d.aging > 5).length}
                      </div>
                    </div>
                    <div className="icon-box bg-yellow-100"><AlertTriangle size={24} /></div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-info">
                      <h4>Closed</h4>
                      <div className="value">{filteredData.filter(d => String(d.status || "").toLowerCase() === 'closed').length}</div>
                    </div>
                    <div className="icon-box bg-green-100"><CheckCircle2 size={24} /></div>
                  </div>
                </div>
              )}

              <div className={`charts-grid ${loading ? 'opacity-20' : ''}`}>
                <div className="chart-card">
                  <h3>Status Mix</h3>
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
                        }
                      }
                    }} />
                  </div>
                </div>
                <div className="chart-card">
                  <h3>Branch Escalation</h3>
                  <div className="chart-container">
                    <Bar data={chartData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
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
                      <button className="btn-sm btn-primary-sm" onClick={() => setModalOpen(true)}><Plus size={16} /> New Case</button>
                    </div>
                    <div className="action-group">
                      <input
                        type="date"
                        className="btn-sm"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      />
                      {user.role === 'ADMIN' && (
                        <select className="btn-sm" value={filters.branch} onChange={(e) => setFilters({ ...filters, branch: e.target.value })}>
                          <option value="">All Branches</option>
                          {BRANCHES.map(b => <option key={b}>{b}</option>)}
                        </select>
                      )}
                      <select className="btn-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All Status</option>
                        <option>Open</option>
                        <option>Closed</option>
                      </select>
                      <label className="btn-sm flex items-center gap-2">
                        <FileUp size={16} /> Import
                        <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleImport} />
                      </label>
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
                          <th>ID</th>
                          <th>Branch</th>
                          <th>Brand</th>
                          <th>Reason</th>
                          <th>Aging</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map(row => (
                          <tr key={row._id}>
                            <td>{row.date}</td>
                            <td>{row.id}</td>
                            <td>{row.branch}</td>
                            <td>{row.brand}</td>
                            <td>{row.reason}</td>
                            <td>{row.aging} Days</td>
                            <td><span className={`badge badge-${row.status.toLowerCase().replace(' ', '-')}`}>{row.status}</span></td>
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
      </main>

      {/* Modal */}
      {modalOpen && (
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
                  disabled={user.role !== 'ADMIN'}
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                >
                  <option value="">Select Branch</option>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Brand / Model</label>
                <input className="form-control" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option>Open</option>
                  <option>Closed</option>
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
      )}
    </div>
  );
};

export default App;
