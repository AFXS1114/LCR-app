import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEYS = {
  server: 'lcr-web-server',
  token: 'lcr-web-token',
};

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) throw new Error(`Server returned an empty response (${response.status}).`);
  try { return JSON.parse(text); }
  catch { throw new Error(`Server returned invalid JSON: ${text.slice(0, 180)}`); }
}

// ─── Initial Form State Helpers ───────────────────────────────────────────────
const emptyBirth = () => ({
  lcr_number: '', date_of_registration: '',
  name_of_child: '', sex: '', date_of_birth: '', place_of_birth: '', type_of_birth: '', order: '',
  mother_name: '', mother_age: '', mother_nationality: '', mother_religion: '',
  father_name: '', father_age: '', father_nationality: '', father_religion: '',
  municipality_province: '',
  remarks: '',
});

const emptyDeath = () => ({
  lcr_number: '', date_of_registration: '',
  name_of_deceased: '', sex: '', date_of_death: '', place_of_death: '',
  cause_of_death: '', age_at_death: '', civil_status: '', nationality: '',
  religion: '', occupation: '', mother_name: '', father_name: '',
  informant_name: '', informant_relationship: '', remarks: '',
});

// ─── Modal Overlay Wrapper Component ──────────────────────────────────────────
function Modal({ title, icon, onClose, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            {icon && <span style={{ fontSize: '1.3rem' }}>{icon}</span>}
            <h2>{title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Tabbed Birth Registration Form Modal ──────────────────────────────────────
function BirthFormModal({ serverUrl, token, onSuccess, onClose }) {
  const [form, setForm] = useState(emptyBirth());
  const [activeTab, setActiveTab] = useState('lcr');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = e => {
    const { name, value, type } = e.target;
    const val = type === 'text' || e.target.tagName === 'TEXTAREA' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: val }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name_of_child.trim()) {
      setActiveTab('child');
      setError('Name of Child is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/birth-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save birth record');
      onSuccess('Birth record added successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Birth Registration Record" icon="🍼" onClose={onClose}>
      <div className="modal-form-tabs">
        <button
          className={`modal-tab-item ${activeTab === 'lcr' ? 'active' : ''}`}
          onClick={() => setActiveTab('lcr')}
        >
          1. LCR Metadata
        </button>
        <button
          className={`modal-tab-item ${activeTab === 'child' ? 'active' : ''}`}
          onClick={() => setActiveTab('child')}
        >
          2. Child Details
        </button>
        <button
          className={`modal-tab-item ${activeTab === 'parents' ? 'active' : ''}`}
          onClick={() => setActiveTab('parents')}
        >
          3. Parents Info
        </button>
        <button
          className={`modal-tab-item ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          4. Location & Remarks
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'contents' }}>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#f43f5e', marginBottom: '16px', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'lcr' && (
            <div className="form-grid">
              <div className="form-field-group">
                <label className="form-label">LCR Number</label>
                <input className="form-input-control" name="lcr_number" value={form.lcr_number} onChange={handle} placeholder="e.g. 2026-00123" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Date of Registration</label>
                <input className="form-input-control" type="date" name="date_of_registration" value={form.date_of_registration} onChange={handle} />
              </div>
            </div>
          )}

          {activeTab === 'child' && (
            <div className="form-grid">
              <div className="form-field-group full-width">
                <label className="form-label">Name of Child (First, Middle, Last)</label>
                <input className="form-input-control" name="name_of_child" value={form.name_of_child} onChange={handle} placeholder="FULL NAME OF CHILD" required />
              </div>
              <div className="form-field-group">
                <label className="form-label">Sex</label>
                <select className="form-input-control" name="sex" value={form.sex} onChange={handle}>
                  <option value="">— Select Sex —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label">Date of Birth</label>
                <input className="form-input-control" type="date" name="date_of_birth" value={form.date_of_birth} onChange={handle} />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Place of Birth</label>
                <input className="form-input-control" name="place_of_birth" value={form.place_of_birth} onChange={handle} placeholder="Hospital / City / Address" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Type of Birth</label>
                <select className="form-input-control" name="type_of_birth" value={form.type_of_birth} onChange={handle}>
                  <option value="">— Select Type —</option>
                  {['Single', 'Twin', 'Triplet', 'Others'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label">Birth Order</label>
                <select className="form-input-control" name="order" value={form.order} onChange={handle}>
                  <option value="">— Select Order —</option>
                  {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'parents' && (
            <div className="form-grid">
              <div className="form-field-group">
                <label className="form-label">Mother's Name</label>
                <input className="form-input-control" name="mother_name" value={form.mother_name} onChange={handle} placeholder="Full maiden name" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Mother's Age</label>
                <input className="form-input-control" name="mother_age" value={form.mother_age} onChange={handle} placeholder="Age" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Mother's Citizenship</label>
                <input className="form-input-control" name="mother_nationality" value={form.mother_nationality} onChange={handle} placeholder="e.g. FILIPINO" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Mother's Religion</label>
                <input className="form-input-control" name="mother_religion" value={form.mother_religion} onChange={handle} placeholder="Religion" />
              </div>
              <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
              <div className="form-field-group">
                <label className="form-label">Father's Name</label>
                <input className="form-input-control" name="father_name" value={form.father_name} onChange={handle} placeholder="Full name" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Father's Age</label>
                <input className="form-input-control" name="father_age" value={form.father_age} onChange={handle} placeholder="Age" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Father's Citizenship</label>
                <input className="form-input-control" name="father_nationality" value={form.father_nationality} onChange={handle} placeholder="e.g. FILIPINO" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Father's Religion</label>
                <input className="form-input-control" name="father_religion" value={form.father_religion} onChange={handle} placeholder="Religion" />
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="form-grid">
              <div className="form-field-group full-width">
                <label className="form-label">Municipality / Province</label>
                <input className="form-input-control" name="municipality_province" value={form.municipality_province} onChange={handle} placeholder="City, Province" />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Remarks & Annotations</label>
                <textarea className="form-input-control" name="remarks" value={form.remarks} onChange={handle} placeholder="Enter any extra remarks or notes..." rows={3} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          {activeTab !== 'location' ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (activeTab === 'lcr') setActiveTab('child');
                else if (activeTab === 'child') setActiveTab('parents');
                else if (activeTab === 'parents') setActiveTab('location');
              }}
            >
              Next Step ➔
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving Record…' : '💾 Save Birth Record'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Tabbed Death Registration Form Modal ──────────────────────────────────────
function DeathFormModal({ serverUrl, token, onSuccess, onClose }) {
  const [form, setForm] = useState(emptyDeath());
  const [activeTab, setActiveTab] = useState('lcr');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handle = e => {
    const { name, value, type } = e.target;
    const val = type === 'text' || e.target.tagName === 'TEXTAREA' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: val }));
  };

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!form.name_of_deceased.trim()) {
      setActiveTab('deceased');
      setError('Name of Deceased is required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/death-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save death record');
      onSuccess('Death record added successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add Death Registration Record" icon="🕊️" onClose={onClose}>
      <div className="modal-form-tabs">
        <button
          className={`modal-tab-item ${activeTab === 'lcr' ? 'active' : ''}`}
          onClick={() => setActiveTab('lcr')}
        >
          1. LCR Metadata
        </button>
        <button
          className={`modal-tab-item ${activeTab === 'deceased' ? 'active' : ''}`}
          onClick={() => setActiveTab('deceased')}
        >
          2. Deceased Details
        </button>
        <button
          className={`modal-tab-item ${activeTab === 'informant' ? 'active' : ''}`}
          onClick={() => setActiveTab('informant')}
        >
          3. Family & Informant
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'contents' }}>
        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#f43f5e', marginBottom: '16px', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}

          {activeTab === 'lcr' && (
            <div className="form-grid">
              <div className="form-field-group">
                <label className="form-label">LCR Number</label>
                <input className="form-input-control" name="lcr_number" value={form.lcr_number} onChange={handle} placeholder="e.g. 2026-D-099" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Date of Registration</label>
                <input className="form-input-control" type="date" name="date_of_registration" value={form.date_of_registration} onChange={handle} />
              </div>
            </div>
          )}

          {activeTab === 'deceased' && (
            <div className="form-grid">
              <div className="form-field-group full-width">
                <label className="form-label">Name of Deceased</label>
                <input className="form-input-control" name="name_of_deceased" value={form.name_of_deceased} onChange={handle} placeholder="FULL NAME OF DECEASED" required />
              </div>
              <div className="form-field-group">
                <label className="form-label">Sex</label>
                <select className="form-input-control" name="sex" value={form.sex} onChange={handle}>
                  <option value="">— Select Sex —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label">Age at Death</label>
                <input className="form-input-control" name="age_at_death" value={form.age_at_death} onChange={handle} placeholder="Age" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Date of Death</label>
                <input className="form-input-control" type="date" name="date_of_death" value={form.date_of_death} onChange={handle} />
              </div>
              <div className="form-field-group">
                <label className="form-label">Civil Status</label>
                <select className="form-input-control" name="civil_status" value={form.civil_status} onChange={handle}>
                  <option value="">— Select Status —</option>
                  {['Single', 'Married', 'Widowed', 'Divorced', 'Separated'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Place of Death</label>
                <input className="form-input-control" name="place_of_death" value={form.place_of_death} onChange={handle} placeholder="Hospital / Residence / City" />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Cause of Death</label>
                <input className="form-input-control" name="cause_of_death" value={form.cause_of_death} onChange={handle} placeholder="Medical cause of death" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Nationality</label>
                <input className="form-input-control" name="nationality" value={form.nationality} onChange={handle} placeholder="FILIPINO" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Religion</label>
                <input className="form-input-control" name="religion" value={form.religion} onChange={handle} placeholder="Religion" />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Occupation</label>
                <input className="form-input-control" name="occupation" value={form.occupation} onChange={handle} placeholder="Occupation prior to death" />
              </div>
            </div>
          )}

          {activeTab === 'informant' && (
            <div className="form-grid">
              <div className="form-field-group">
                <label className="form-label">Mother's Name</label>
                <input className="form-input-control" name="mother_name" value={form.mother_name} onChange={handle} placeholder="Mother's full maiden name" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Father's Name</label>
                <input className="form-input-control" name="father_name" value={form.father_name} onChange={handle} placeholder="Father's full name" />
              </div>
              <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
              <div className="form-field-group">
                <label className="form-label">Informant Name</label>
                <input className="form-input-control" name="informant_name" value={form.informant_name} onChange={handle} placeholder="Name of person reporting" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Informant Relationship</label>
                <input className="form-input-control" name="informant_relationship" value={form.informant_relationship} onChange={handle} placeholder="e.g. SPOUSE, CHILD, SIBLING" />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Remarks</label>
                <textarea className="form-input-control" name="remarks" value={form.remarks} onChange={handle} placeholder="Additional notes..." rows={3} />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          {activeTab !== 'informant' ? (
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                if (activeTab === 'lcr') setActiveTab('deceased');
                else if (activeTab === 'deceased') setActiveTab('informant');
              }}
            >
              Next Step ➔
            </button>
          ) : (
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving Record…' : '💾 Save Death Record'}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Application Component ───────────────────────────────────────────────
export default function App() {
  const [serverUrl, setServerUrl] = useState('https://search-lcr.vercel.app');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  // Search & Navigation States
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Category filter: 'general' | 'birth' | 'death'
  const [currentTab, setCurrentTab] = useState('general');
  // View mode: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');
  // Active detail sub-tab: 'overview' | 'family' | 'document' | 'raw'
  const [detailTab, setDetailTab] = useState('overview');

  // Modals state: null | 'birth' | 'death' | image URL
  const [modalMode, setModalMode] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Theme Handling
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('lcr-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
    localStorage.setItem('lcr-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // Saved credentials check on load
  useEffect(() => {
    const savedServer = localStorage.getItem(STORAGE_KEYS.server);
    const savedToken = localStorage.getItem(STORAGE_KEYS.token);
    if (savedServer) setServerUrl(savedServer);
    if (savedToken) setToken(savedToken);
  }, []);

  // Fetch Records from API
  const fetchRecords = async (baseUrl, authToken, queryText = '', tab = 'general') => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (queryText) params.set('query', queryText);
      params.set('limit', '50');

      let endpoint = 'records';
      if (tab === 'birth') endpoint = 'birth-records';
      if (tab === 'death') endpoint = 'death-records';

      const response = await fetch(`${baseUrl}/api/${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `Unable to fetch records (${response.status})`);

      const loaded = Array.isArray(data.records) ? data.records : [];
      setRecords(loaded);
      if (loaded.length > 0) {
        setSelectedRecord(loaded[0]);
      } else {
        setSelectedRecord(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to fetch records';
      setError(
        message.includes('Failed to fetch') || message.includes('NetworkError')
          ? 'Unable to reach backend server. Please verify network connection.'
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      fetchRecords(baseUrl, token, search.trim(), currentTab);
    }
  }, [currentTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `Login failed (${response.status})`);
      
      localStorage.setItem(STORAGE_KEYS.server, baseUrl);
      localStorage.setItem(STORAGE_KEYS.token, data.token);
      setToken(data.token);
      setUser(data.user);
      setSelectedRecord(null);
      await fetchRecords(baseUrl, data.token, '', 'general');
    } catch (err) {
      setError(err.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!token) return;
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    fetchRecords(baseUrl, token, search.trim(), currentTab);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    setToken('');
    setUser(null);
    setRecords([]);
    setSelectedRecord(null);
  };

  const handleFormSuccess = (msg) => {
    setModalMode(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    fetchRecords(baseUrl, token, search.trim(), currentTab);
  };

  const baseUrl = serverUrl.trim().replace(/\/$/, '');

  // ─── LOGIN SCREEN VIEW ──────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="app-shell">
        <div className="auth-wrapper">
          <div className="auth-card-wrapper">
            <div className="auth-header">
              <div className="brand-icon">🏛️</div>
              <h2>LCR Portal Sign In</h2>
              <p>Enter your credentials to access civil registry records</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'grid', gap: '16px' }}>
              <div className="form-field-group">
                <label className="form-label">Server Endpoint</label>
                <input
                  className="form-input-control"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://search-lcr.vercel.app"
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-field-group">
                <label className="form-label">Password</label>
                <input
                  className="form-input-control"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#f43f5e', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={isLoading}>
                {isLoading ? 'Authenticating…' : 'Sign In to Portal ➔'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN PORTAL VIEW (Search Page + Modals + Tabbed Detail Divs) ───────────
  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <header className="top-navbar">
        <div className="nav-brand">
          <div className="brand-icon">🏛️</div>
          <div>
            <h1 className="brand-title">LCR Web Portal</h1>
            <p className="brand-subtitle">Civil Registry System</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button className="nav-link active">
            <span>🔍</span> Search Records
          </button>
        </nav>

        <div className="nav-actions">
          <button className="btn-add btn-add-birth" onClick={() => setModalMode('birth')}>
            <span>🍼</span> Add Birth Record
          </button>
          <button className="btn-add btn-add-death" onClick={() => setModalMode('death')}>
            <span>🕊️</span> Add Death Record
          </button>
          
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="user-profile-badge">
            <div className="avatar">{(user?.username || 'U')[0].toUpperCase()}</div>
            <span style={{ fontWeight: 600 }}>{user?.username || 'Officer'}</span>
            <button onClick={handleLogout} style={{ color: 'var(--text-subtle)', marginLeft: '6px', fontSize: '0.9rem' }} title="Log out">
              🚪
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-container">
        {/* Search Page Header */}
        <section className="search-header-hero">
          <div className="search-hero-top">
            <div className="page-headline">
              <h1>Search & Query Civil Records</h1>
              <p>Search through indexed birth registrations, death records, and archival documents.</p>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="search-bar-form">
            <div className="search-input-group">
              <span className="search-icon-inside">🔍</span>
              <input
                className="search-input-field"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  currentTab === 'general' ? 'Search by full name, serial number, tag, or category...' :
                  currentTab === 'birth' ? 'Search child name, LCR #, place of birth, or mother/father name...' :
                  'Search deceased name, LCR #, cause of death, or place of death...'
                }
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Searching…' : 'Search Database'}
            </button>
          </form>

          <div className="filter-tabs-row">
            <div className="category-tabs">
              <button
                className={`cat-tab ${currentTab === 'general' ? 'active' : ''}`}
                onClick={() => setCurrentTab('general')}
              >
                📁 General Uploads
              </button>
              <button
                className={`cat-tab ${currentTab === 'birth' ? 'active' : ''}`}
                onClick={() => setCurrentTab('birth')}
              >
                🍼 Birth Registrations
              </button>
              <button
                className={`cat-tab ${currentTab === 'death' ? 'active' : ''}`}
                onClick={() => setCurrentTab('death')}
              >
                🕊️ Death Registrations
              </button>
            </div>

            <div className="view-controls">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>VIEW:</span>
              <button
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ▦ Grid
              </button>
              <button
                className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                ☰ Table
              </button>
            </div>
          </div>
        </section>

        {/* Results & Tabbed Detail Split Panel */}
        <section className={`results-split-layout ${!selectedRecord ? 'full-width' : ''}`}>
          {/* Records List Container */}
          <div className="records-container-card">
            <div className="records-card-header">
              <h3>
                {currentTab === 'general' ? 'Archival Uploads' : currentTab === 'birth' ? 'Birth Register' : 'Death Register'}
              </h3>
              <span className="results-count-badge">{records.length} records found</span>
            </div>

            {isLoading ? (
              <div className="state-box">
                <div className="state-icon">⏳</div>
                <p>Querying registry database...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="state-box">
                <div className="state-icon">📂</div>
                <p>No matching records found.</p>
                <span style={{ fontSize: '0.85rem' }}>Try clearing or adjusting your search query.</span>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="records-grid-view">
                {records.map((rec) => {
                  const name = currentTab === 'general' ? rec.name : currentTab === 'birth' ? rec.name_of_child : rec.name_of_deceased;
                  const isSelected = selectedRecord?.id === rec.id;
                  const dateVal = currentTab === 'general' ? rec.date : currentTab === 'birth' ? rec.date_of_birth : rec.date_of_death;

                  return (
                    <button
                      key={rec.id}
                      className={`record-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedRecord(rec)}
                    >
                      <div className="record-item-top">
                        <span className="record-item-name">{name || 'Unnamed Record'}</span>
                        <span className={`type-pill ${currentTab}`}>
                          {currentTab === 'general' ? (rec.category || 'General') : currentTab.toUpperCase()}
                        </span>
                      </div>

                      <div className="record-meta-line">
                        <span>🆔</span>
                        <span>{currentTab === 'general' ? (rec.serial_number || `ID #${rec.id}`) : `LCR: ${rec.lcr_number || 'N/A'}`}</span>
                      </div>

                      <div className="record-card-footer">
                        <span>📅 {dateVal ? new Date(dateVal).toLocaleDateString() : 'No date'}</span>
                        <span>View Details ➔</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Name / Record Title</th>
                      <th>Reference #</th>
                      <th>Category / Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => {
                      const name = currentTab === 'general' ? rec.name : currentTab === 'birth' ? rec.name_of_child : rec.name_of_deceased;
                      const refNum = currentTab === 'general' ? rec.serial_number : rec.lcr_number;
                      const dateVal = currentTab === 'general' ? rec.date : currentTab === 'birth' ? rec.date_of_birth : rec.date_of_death;
                      const isSelected = selectedRecord?.id === rec.id;

                      return (
                        <tr
                          key={rec.id}
                          className={isSelected ? 'selected' : ''}
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <td style={{ fontWeight: 700 }}>{name || '—'}</td>
                          <td><code>{refNum || '—'}</code></td>
                          <td>
                            <span className={`type-pill ${currentTab}`}>
                              {currentTab === 'general' ? (rec.category || 'General') : currentTab}
                            </span>
                          </td>
                          <td>{dateVal ? new Date(dateVal).toLocaleDateString() : '—'}</td>
                          <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Inspect ➔</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabbed Record Detail Panel */}
          {selectedRecord && (
            <div className="detail-panel-card">
              <div className="detail-panel-header">
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: uppercase('Record Inspector') }}>
                    Record Inspector #{selectedRecord.id}
                  </span>
                  <h3>
                    {currentTab === 'general' ? selectedRecord.name : currentTab === 'birth' ? selectedRecord.name_of_child : selectedRecord.name_of_deceased}
                  </h3>
                </div>
                <button className="close-panel-btn" onClick={() => setSelectedRecord(null)} title="Close Panel">✕</button>
              </div>

              {/* Tabs for each <div> of information */}
              <div className="detail-tabs-bar">
                <button
                  className={`detail-tab-btn ${detailTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setDetailTab('overview')}
                >
                  Overview
                </button>
                {currentTab !== 'general' && (
                  <button
                    className={`detail-tab-btn ${detailTab === 'family' ? 'active' : ''}`}
                    onClick={() => setDetailTab('family')}
                  >
                    Family Info
                  </button>
                )}
                {currentTab === 'general' && (
                  <button
                    className={`detail-tab-btn ${detailTab === 'document' ? 'active' : ''}`}
                    onClick={() => setDetailTab('document')}
                  >
                    Document Image
                  </button>
                )}
                <button
                  className={`detail-tab-btn ${detailTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setDetailTab('raw')}
                >
                  Raw Metadata
                </button>
              </div>

              {/* Tab 1: Overview Div */}
              {detailTab === 'overview' && (
                <div className="detail-tab-content">
                  {currentTab === 'general' && (
                    <div className="detail-grid-pairs">
                      <div className="meta-field-box">
                        <div className="meta-field-label">Document Name</div>
                        <div className="meta-field-value">{selectedRecord.name}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Serial Number</div>
                        <div className="meta-field-value">{selectedRecord.serial_number || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Category</div>
                        <div className="meta-field-value">{selectedRecord.category || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Date</div>
                        <div className="meta-field-value">{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="meta-field-box full-width">
                        <div className="meta-field-label">Description</div>
                        <div className="meta-field-value">{selectedRecord.description || 'No description attached.'}</div>
                      </div>
                    </div>
                  )}

                  {currentTab === 'birth' && (
                    <div className="detail-grid-pairs">
                      <div className="meta-field-box">
                        <div className="meta-field-label">Child Name</div>
                        <div className="meta-field-value">{selectedRecord.name_of_child}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Sex</div>
                        <div className="meta-field-value">{selectedRecord.sex || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">LCR Number</div>
                        <div className="meta-field-value">{selectedRecord.lcr_number || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Registration Date</div>
                        <div className="meta-field-value">{selectedRecord.date_of_registration ? new Date(selectedRecord.date_of_registration).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Date of Birth</div>
                        <div className="meta-field-value">{selectedRecord.date_of_birth ? new Date(selectedRecord.date_of_birth).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Place of Birth</div>
                        <div className="meta-field-value">{selectedRecord.place_of_birth || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Type / Order</div>
                        <div className="meta-field-value">{selectedRecord.type_of_birth || 'Single'} ({selectedRecord.order || '1st'})</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Municipality</div>
                        <div className="meta-field-value">{selectedRecord.municipality_province || '—'}</div>
                      </div>
                      <div className="meta-field-box full-width">
                        <div className="meta-field-label">Remarks</div>
                        <div className="meta-field-value">{selectedRecord.remarks || 'No remarks recorded.'}</div>
                      </div>
                    </div>
                  )}

                  {currentTab === 'death' && (
                    <div className="detail-grid-pairs">
                      <div className="meta-field-box">
                        <div className="meta-field-label">Deceased Name</div>
                        <div className="meta-field-value">{selectedRecord.name_of_deceased}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Sex / Age</div>
                        <div className="meta-field-value">{selectedRecord.sex || '—'} ({selectedRecord.age_at_death ? `${selectedRecord.age_at_death} yrs` : 'N/A'})</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">LCR Number</div>
                        <div className="meta-field-value">{selectedRecord.lcr_number || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Date of Death</div>
                        <div className="meta-field-value">{selectedRecord.date_of_death ? new Date(selectedRecord.date_of_death).toLocaleDateString() : '—'}</div>
                      </div>
                      <div className="meta-field-box full-width">
                        <div className="meta-field-label">Cause of Death</div>
                        <div className="meta-field-value">{selectedRecord.cause_of_death || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Place of Death</div>
                        <div className="meta-field-value">{selectedRecord.place_of_death || '—'}</div>
                      </div>
                      <div className="meta-field-box">
                        <div className="meta-field-label">Civil Status</div>
                        <div className="meta-field-value">{selectedRecord.civil_status || '—'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Family Info Div */}
              {detailTab === 'family' && (
                <div className="detail-tab-content">
                  <div className="detail-grid-pairs">
                    <div className="meta-field-box">
                      <div className="meta-field-label">Mother's Name</div>
                      <div className="meta-field-value">{selectedRecord.mother_name || '—'}</div>
                    </div>
                    {currentTab === 'birth' && (
                      <div className="meta-field-box">
                        <div className="meta-field-label">Mother's Age / Citizenship</div>
                        <div className="meta-field-value">{selectedRecord.mother_nationality || '—'} {selectedRecord.mother_age ? `(${selectedRecord.mother_age} yrs)` : ''}</div>
                      </div>
                    )}
                    <div className="meta-field-box">
                      <div className="meta-field-label">Father's Name</div>
                      <div className="meta-field-value">{selectedRecord.father_name || '—'}</div>
                    </div>
                    {currentTab === 'birth' && (
                      <div className="meta-field-box">
                        <div className="meta-field-label">Father's Age / Citizenship</div>
                        <div className="meta-field-value">{selectedRecord.father_nationality || '—'} {selectedRecord.father_age ? `(${selectedRecord.father_age} yrs)` : ''}</div>
                      </div>
                    )}
                    {currentTab === 'death' && (
                      <>
                        <div className="meta-field-box">
                          <div className="meta-field-label">Informant Name</div>
                          <div className="meta-field-value">{selectedRecord.informant_name || '—'}</div>
                        </div>
                        <div className="meta-field-box">
                          <div className="meta-field-label">Informant Relationship</div>
                          <div className="meta-field-value">{selectedRecord.informant_relationship || '—'}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Document Image Div */}
              {detailTab === 'document' && (
                <div className="detail-tab-content">
                  {selectedRecord.imageUrl ? (
                    <div className="detail-doc-preview">
                      <img src={selectedRecord.imageUrl} alt={selectedRecord.name} />
                      <button className="doc-overlay-btn" onClick={() => setZoomedImage(selectedRecord.imageUrl)}>
                        🔍 Expand & Zoom
                      </button>
                    </div>
                  ) : (
                    <div className="state-box">
                      <div className="state-icon">🖼️</div>
                      <p>No document scan image attached to this record.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Raw Metadata JSON Div */}
              {detailTab === 'raw' && (
                <div className="detail-tab-content">
                  <pre style={{
                    background: 'rgba(0,0,0,0.4)',
                    padding: '14px',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent-primary)',
                    overflowX: 'auto'
                  }}>
                    {JSON.stringify(selectedRecord, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Modals Component Renderers */}
      {modalMode === 'birth' && (
        <BirthFormModal
          serverUrl={baseUrl}
          token={token}
          onSuccess={handleFormSuccess}
          onClose={() => setModalMode(null)}
        />
      )}

      {modalMode === 'death' && (
        <DeathFormModal
          serverUrl={baseUrl}
          token={token}
          onSuccess={handleFormSuccess}
          onClose={() => setModalMode(null)}
        />
      )}

      {/* Lightbox Image Preview Modal */}
      {zoomedImage && (
        <div className="modal-backdrop" onClick={() => setZoomedImage(null)}>
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-toolbar">
              <div style={{ fontWeight: 700 }}>Scanned Document Lightbox</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setImageRotation((r) => (r + 90) % 360)}>
                  ↻ Rotate 90°
                </button>
                <button className="btn-secondary" onClick={() => setZoomedImage(null)}>
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="lightbox-img-wrapper">
              <img
                src={zoomedImage}
                alt="Document Preview"
                style={{ transform: `rotate(${imageRotation}deg)` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          ✨ {toastMessage}
        </div>
      )}
    </div>
  );
}

function uppercase(str) {
  return str.toUpperCase();
}
