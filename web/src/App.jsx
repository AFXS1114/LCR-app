import { useEffect, useState } from 'react';

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

// ─── Initial form state helpers ────────────────────────────────────────────
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

// ─── Reusable field component ───────────────────────────────────────────────
function Field({ label, name, value, onChange, type = 'text', options }) {
  return (
    <label className="form-field">
      <span className="field-label">{label}</span>
      {options ? (
        <select name={name} value={value} onChange={onChange} className="form-input">
          <option value="">— select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          className="form-input"
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={label}
        />
      )}
    </label>
  );
}

// ─── Section divider ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="form-section">
      <div className="section-header"><span>{title}</span></div>
      <div className="section-fields">{children}</div>
    </div>
  );
}

// ─── Birth Form ─────────────────────────────────────────────────────────────
function BirthForm({ serverUrl, token, onSuccess, onCancel }) {
  const [form, setForm] = useState(emptyBirth());
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
    if (!form.name_of_child.trim()) { setError('Name of Child is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/birth-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSuccess('Birth record saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="record-form" onSubmit={submit}>
      <div className="form-top-bar">
        <div className="form-badge birth-badge">🍼 Birth Record</div>
        <button type="button" className="close-btn" onClick={onCancel}>✕</button>
      </div>

      {/* LCR Info */}
      <Section title="LCR Information">
        <div className="fields-row">
          <Field label="LCR Number" name="lcr_number" value={form.lcr_number} onChange={handle} />
          <Field label="Date of Registration" name="date_of_registration" value={form.date_of_registration} onChange={handle} type="date" />
        </div>
      </Section>

      {/* Child Info */}
      <Section title="Name of Child">
        <div className="fields-row">
          <Field label="Full Name of Child" name="name_of_child" value={form.name_of_child} onChange={handle} />
          <Field label="Sex" name="sex" value={form.sex} onChange={handle} options={['Male', 'Female']} />
        </div>
        <div className="fields-row">
          <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={handle} type="date" />
          <Field label="Place of Birth" name="place_of_birth" value={form.place_of_birth} onChange={handle} />
          <Field label="Type of Birth" name="type_of_birth" value={form.type_of_birth} onChange={handle} options={['Single', 'Twin', 'Triplet', 'Others']} />
          <Field label="Order" name="order" value={form.order} onChange={handle} options={['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']} />
        </div>
      </Section>

      {/* Mother Info */}
      <Section title="Mother Information">
        <div className="fields-row">
          <Field label="Name of Mother" name="mother_name" value={form.mother_name} onChange={handle} />
          <Field label="Age" name="mother_age" value={form.mother_age} onChange={handle} />
        </div>
        <div className="fields-row">
          <Field label="Nationality" name="mother_nationality" value={form.mother_nationality} onChange={handle} />
          <Field label="Religion" name="mother_religion" value={form.mother_religion} onChange={handle} />
        </div>
      </Section>

      {/* Father Info */}
      <Section title="Father Information">
        <div className="fields-row">
          <Field label="Name of Father" name="father_name" value={form.father_name} onChange={handle} />
          <Field label="Age" name="father_age" value={form.father_age} onChange={handle} />
        </div>
        <div className="fields-row">
          <Field label="Nationality" name="father_nationality" value={form.father_nationality} onChange={handle} />
          <Field label="Religion" name="father_religion" value={form.father_religion} onChange={handle} />
        </div>
      </Section>

      {/* Municipality / Province */}
      <Section title="Municipality / Province">
        <div className="fields-row">
          <Field label="Municipality / Province" name="municipality_province" value={form.municipality_province} onChange={handle} />
        </div>
      </Section>

      {/* Remarks */}
      <Section title="Remarks">
        <textarea
          className="form-input form-textarea"
          name="remarks"
          value={form.remarks}
          onChange={handle}
          placeholder="Enter any remarks…"
          rows={3}
        />
      </Section>

      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Birth Record'}
        </button>
      </div>
    </form>
  );
}

// ─── Death Form ──────────────────────────────────────────────────────────────
function DeathForm({ serverUrl, token, onSuccess, onCancel }) {
  const [form, setForm] = useState(emptyDeath());
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
    if (!form.name_of_deceased.trim()) { setError('Name of Deceased is required.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`${serverUrl}/api/death-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSuccess('Death record saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="record-form" onSubmit={submit}>
      <div className="form-top-bar">
        <div className="form-badge death-badge">🕊️ Death Record</div>
        <button type="button" className="close-btn" onClick={onCancel}>✕</button>
      </div>

      {/* LCR Info */}
      <Section title="LCR Information">
        <div className="fields-row">
          <Field label="LCR Number" name="lcr_number" value={form.lcr_number} onChange={handle} />
          <Field label="Date of Registration" name="date_of_registration" value={form.date_of_registration} onChange={handle} type="date" />
        </div>
      </Section>

      {/* Deceased Info */}
      <Section title="Deceased Information">
        <div className="fields-row">
          <Field label="Name of Deceased" name="name_of_deceased" value={form.name_of_deceased} onChange={handle} />
          <Field label="Sex" name="sex" value={form.sex} onChange={handle} options={['Male', 'Female']} />
          <Field label="Age at Death" name="age_at_death" value={form.age_at_death} onChange={handle} />
        </div>
        <div className="fields-row">
          <Field label="Date of Death" name="date_of_death" value={form.date_of_death} onChange={handle} type="date" />
          <Field label="Place of Death" name="place_of_death" value={form.place_of_death} onChange={handle} />
          <Field label="Cause of Death" name="cause_of_death" value={form.cause_of_death} onChange={handle} />
        </div>
        <div className="fields-row">
          <Field label="Civil Status" name="civil_status" value={form.civil_status} onChange={handle} options={['Single', 'Married', 'Widowed', 'Divorced', 'Separated']} />
          <Field label="Nationality" name="nationality" value={form.nationality} onChange={handle} />
          <Field label="Religion" name="religion" value={form.religion} onChange={handle} />
          <Field label="Occupation" name="occupation" value={form.occupation} onChange={handle} />
        </div>
      </Section>

      {/* Parents */}
      <Section title="Parents">
        <div className="fields-row">
          <Field label="Name of Mother" name="mother_name" value={form.mother_name} onChange={handle} />
          <Field label="Name of Father" name="father_name" value={form.father_name} onChange={handle} />
        </div>
      </Section>

      {/* Informant */}
      <Section title="Informant">
        <div className="fields-row">
          <Field label="Name of Informant" name="informant_name" value={form.informant_name} onChange={handle} />
          <Field label="Relationship to Deceased" name="informant_relationship" value={form.informant_relationship} onChange={handle} />
        </div>
      </Section>

      {/* Remarks */}
      <Section title="Remarks">
        <textarea
          className="form-input form-textarea"
          name="remarks"
          value={form.remarks}
          onChange={handle}
          placeholder="Enter any remarks…"
          rows={3}
        />
      </Section>

      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="submit-btn" disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Death Record'}
        </button>
      </div>
    </form>
  );
}

// ─── Main App ───────────────────────────────────────────────────────────────
function App() {
  const [serverUrl, setServerUrl] = useState('https://search-lcr.vercel.app');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [token, setToken] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [imageRotation, setImageRotation] = useState(0);

  // 'general' | 'birth' | 'death'
  const [currentTab, setCurrentTab] = useState('general');

  // 'none' | 'birth' | 'death'
  const [addMode, setAddMode] = useState('none');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const savedServer = localStorage.getItem(STORAGE_KEYS.server);
    const savedToken = localStorage.getItem(STORAGE_KEYS.token);
    if (savedServer) setServerUrl(savedServer);
    if (savedToken) setToken(savedToken);
  }, []);

  const login = async (event) => {
    event.preventDefault();
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
      const message = err instanceof Error ? err.message : 'Unable to connect to the server';
      setError(
        message.includes('Failed to fetch') || message.includes('NetworkError')
          ? 'Unable to reach the server. Make sure the backend is running and the URL is correct.'
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

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
          ? 'Unable to reach the server. Make sure the backend is running and the URL is correct.'
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch when tab changes
  useEffect(() => {
    if (token) {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      fetchRecords(baseUrl, token, search.trim(), currentTab);
    }
  }, [currentTab]);

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!token) return;
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    await fetchRecords(baseUrl, token, search.trim(), currentTab);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.token);
    setToken('');
    setUser(null);
    setRecords([]);
    setSelectedRecord(null);
    setError('');
    setAddMode('none');
  };

  const openImagePreview = (imageUrl) => {
    if (!imageUrl) return;
    setZoomedImage(imageUrl);
    setImageRotation(0);
  };

  const closeImagePreview = () => {
    setZoomedImage(null);
    setImageRotation(0);
  };

  const handleFormSuccess = (msg) => {
    setSuccessMsg(msg);
    setAddMode('none');
    // Refresh records
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    fetchRecords(baseUrl, token, search.trim(), currentTab);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const baseUrl = serverUrl.trim().replace(/\/$/, '');

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div>
          <p className="eyebrow">LCR Records Web Portal</p>
          <h1>Search and review records</h1>
          <p className="hero-description">
            Browse uploaded documents, filter by name or metadata, and inspect details instantly.
          </p>
        </div>
        <div className="hero-pill">LCR Records Portal</div>
      </header>

      {!token ? (
        <section className="card auth-card">
          <h2>Sign in to your server</h2>
          <form onSubmit={login} className="form-stack">
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
            </label>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Connecting…' : 'Sign in'}
            </button>
          </form>
        </section>
      ) : (
        <>
          <section className="card toolbar-card">
            <div className="toolbar-top">
              <div>
                <p className="eyebrow">Signed in as</p>
                <h3>{user?.username || 'User'}</h3>
              </div>
              <div className="toolbar-right">
                {/* Add Record Buttons */}
                <div className="add-buttons">
                  <button
                    className={`add-btn birth-btn ${addMode === 'birth' ? 'active-add' : ''}`}
                    onClick={() => setAddMode(prev => prev === 'birth' ? 'none' : 'birth')}
                  >
                    🍼 Add Birth Record
                  </button>
                  <button
                    className={`add-btn death-btn ${addMode === 'death' ? 'active-add' : ''}`}
                    onClick={() => setAddMode(prev => prev === 'death' ? 'none' : 'death')}
                  >
                    🕊️ Add Death Record
                  </button>
                </div>
                <button className="secondary-btn" onClick={logout}>Log out</button>
              </div>
            </div>

            <form onSubmit={handleSearch} className="search-box">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  currentTab === 'general' ? 'Search by name, serial, category, or tag' :
                  currentTab === 'birth' ? 'Search child name, LCR number, or place of birth' :
                  'Search deceased name, LCR number, or place of death'
                }
              />
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Searching…' : 'Search'}
              </button>
            </form>
          </section>

          {/* Success Toast */}
          {successMsg && (
            <div className="success-toast">{successMsg}</div>
          )}

          {/* Add Record Panels */}
          {addMode === 'birth' && (
            <section className="card form-card">
              <BirthForm
                serverUrl={baseUrl}
                token={token}
                onSuccess={handleFormSuccess}
                onCancel={() => setAddMode('none')}
              />
            </section>
          )}

          {addMode === 'death' && (
            <section className="card form-card">
              <DeathForm
                serverUrl={baseUrl}
                token={token}
                onSuccess={handleFormSuccess}
                onCancel={() => setAddMode('none')}
              />
            </section>
          )}

          {/* Records Search Tabs Switcher */}
          <div className="records-tabs">
            <button 
              className={`tab-btn ${currentTab === 'general' ? 'active' : ''}`}
              onClick={() => setCurrentTab('general')}
            >
              📁 General Uploads
            </button>
            <button 
              className={`tab-btn ${currentTab === 'birth' ? 'active' : ''}`}
              onClick={() => setCurrentTab('birth')}
            >
              🍼 Birth Registrations
            </button>
            <button 
              className={`tab-btn ${currentTab === 'death' ? 'active' : ''}`}
              onClick={() => setCurrentTab('death')}
            >
              🕊️ Death Registrations
            </button>
          </div>

          <section className="content-grid">
            <div className="card list-card">
              <div className="card-header">
                <h3>{currentTab === 'general' ? 'General Uploads' : currentTab === 'birth' ? 'Birth Registrations' : 'Death Registrations'}</h3>
                <span>{records.length} found</span>
              </div>

              {isLoading ? (
                <p className="empty-state">Loading records…</p>
              ) : records.length === 0 ? (
                <p className="empty-state">No results yet. Try a broader search.</p>
              ) : (
                <div className="record-list">
                  {records.map((record) => (
                    <button
                      key={record.id}
                      className={`record-item ${selectedRecord?.id === record.id ? 'active' : ''}`}
                      onClick={() => setSelectedRecord(record)}
                    >
                      <div>
                        <strong>
                          {currentTab === 'general' ? record.name :
                           currentTab === 'birth' ? record.name_of_child :
                           record.name_of_deceased}
                        </strong>
                        <p>
                          {currentTab === 'general' ? (record.category || 'Uncategorized') :
                           `LCR #: ${record.lcr_number || 'N/A'}`}
                        </p>
                      </div>
                      <span>
                        {currentTab === 'general' && record.date ? new Date(record.date).toLocaleDateString() :
                         currentTab === 'birth' && record.date_of_birth ? new Date(record.date_of_birth).toLocaleDateString() :
                         currentTab === 'death' && record.date_of_death ? new Date(record.date_of_death).toLocaleDateString() :
                         '—'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card detail-card">
              {selectedRecord ? (
                <>
                  <div className="card-header">
                    <h3>Record details</h3>
                    <span>#{selectedRecord.id}</span>
                  </div>

                  {currentTab === 'general' && (
                    <>
                      {selectedRecord.imageUrl ? (
                        <>
                          <div className="image-toolbar">
                            <button className="secondary-btn" type="button" onClick={() => openImagePreview(selectedRecord.imageUrl)}>
                              Zoom image
                            </button>
                            <button className="secondary-btn" type="button" onClick={() => setImageRotation((prev) => (prev + 90) % 360)}>
                              Rotate
                            </button>
                          </div>
                          <img
                            src={selectedRecord.imageUrl}
                            alt={selectedRecord.name}
                            className="detail-image"
                            onClick={() => openImagePreview(selectedRecord.imageUrl)}
                            style={{ transform: `rotate(${imageRotation}deg)` }}
                          />
                        </>
                      ) : (
                        <div className="detail-image placeholder">No image attached</div>
                      )}

                      <div className="detail-meta">
                        <div>
                          <p className="meta-label">Name</p>
                          <p>{selectedRecord.name}</p>
                        </div>
                        <div>
                          <p className="meta-label">Serial</p>
                          <p>{selectedRecord.serial_number || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Category</p>
                          <p>{selectedRecord.category || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Date</p>
                          <p>{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '—'}</p>
                        </div>
                      </div>

                      <div className="detail-text">
                        <p className="meta-label">Description</p>
                        <p>{selectedRecord.description || 'No description provided.'}</p>
                      </div>
                    </>
                  )}

                  {currentTab === 'birth' && (
                    <div className="detail-custom-grid">
                      <div className="detail-meta">
                        <div>
                          <p className="meta-label">Child Name</p>
                          <p>{selectedRecord.name_of_child}</p>
                        </div>
                        <div>
                          <p className="meta-label">Sex</p>
                          <p>{selectedRecord.sex || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">LCR Number</p>
                          <p>{selectedRecord.lcr_number || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Registration Date</p>
                          <p>{selectedRecord.date_of_registration ? new Date(selectedRecord.date_of_registration).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Date of Birth</p>
                          <p>{selectedRecord.date_of_birth ? new Date(selectedRecord.date_of_birth).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Place of Birth</p>
                          <p>{selectedRecord.place_of_birth || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Type of Birth</p>
                          <p>{selectedRecord.type_of_birth || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Order of Birth</p>
                          <p>{selectedRecord.order || '—'}</p>
                        </div>
                      </div>

                      <div className="detail-sub-section">
                        <h4>Parents Info</h4>
                        <div className="detail-meta">
                          <div>
                            <p className="meta-label">Mother Name</p>
                            <p>{selectedRecord.mother_name || '—'}</p>
                          </div>
                          <div>
                            <p className="meta-label">Mother Nationality/Age</p>
                            <p>{selectedRecord.mother_nationality || '—'} {selectedRecord.mother_age ? `(${selectedRecord.mother_age} yrs)` : ''}</p>
                          </div>
                          <div>
                            <p className="meta-label">Father Name</p>
                            <p>{selectedRecord.father_name || '—'}</p>
                          </div>
                          <div>
                            <p className="meta-label">Father Nationality/Age</p>
                            <p>{selectedRecord.father_nationality || '—'} {selectedRecord.father_age ? `(${selectedRecord.father_age} yrs)` : ''}</p>
                          </div>
                        </div>
                      </div>

                      <div className="detail-sub-section">
                        <h4>Location Details</h4>
                        <div className="detail-meta">
                          <div>
                            <p className="meta-label">Municipality / Province</p>
                            <p>{selectedRecord.municipality_province || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="detail-text">
                        <p className="meta-label">Remarks</p>
                        <p>{selectedRecord.remarks || 'No remarks.'}</p>
                      </div>
                    </div>
                  )}

                  {currentTab === 'death' && (
                    <div className="detail-custom-grid">
                      <div className="detail-meta">
                        <div>
                          <p className="meta-label">Deceased Name</p>
                          <p>{selectedRecord.name_of_deceased}</p>
                        </div>
                        <div>
                          <p className="meta-label">Sex</p>
                          <p>{selectedRecord.sex || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Age at Death</p>
                          <p>{selectedRecord.age_at_death || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">LCR Number</p>
                          <p>{selectedRecord.lcr_number || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Registration Date</p>
                          <p>{selectedRecord.date_of_registration ? new Date(selectedRecord.date_of_registration).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Date of Death</p>
                          <p>{selectedRecord.date_of_death ? new Date(selectedRecord.date_of_death).toLocaleDateString() : '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Place of Death</p>
                          <p>{selectedRecord.place_of_death || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Cause of Death</p>
                          <p>{selectedRecord.cause_of_death || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Civil Status</p>
                          <p>{selectedRecord.civil_status || '—'}</p>
                        </div>
                        <div>
                          <p className="meta-label">Nationality</p>
                          <p>{selectedRecord.nationality || '—'}</p>
                        </div>
                      </div>

                      <div className="detail-sub-section">
                        <h4>Family & Informant</h4>
                        <div className="detail-meta">
                          <div>
                            <p className="meta-label">Mother Name</p>
                            <p>{selectedRecord.mother_name || '—'}</p>
                          </div>
                          <div>
                            <p className="meta-label">Father Name</p>
                            <p>{selectedRecord.father_name || '—'}</p>
                          </div>
                          <div>
                            <p className="meta-label">Informant</p>
                            <p>{selectedRecord.informant_name || '—'}</p>
                          </div>
                          <div>
                            <p className="meta-label">Informant Relationship</p>
                            <p>{selectedRecord.informant_relationship || '—'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="detail-text">
                        <p className="meta-label">Remarks</p>
                        <p>{selectedRecord.remarks || 'No remarks.'}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">Select a record to view the full details.</div>
              )}
            </div>
          </section>
        </>
      )}

      {zoomedImage ? (
        <div className="image-modal" onClick={closeImagePreview}>
          <div className="image-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="image-modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setImageRotation((prev) => (prev + 90) % 360)}>
                Rotate 90°
              </button>
              <button className="secondary-btn" type="button" onClick={closeImagePreview}>
                Close
              </button>
            </div>
            <img
              src={zoomedImage}
              alt="Expanded record"
              className="image-modal-image"
              style={{ transform: `rotate(${imageRotation}deg)` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
