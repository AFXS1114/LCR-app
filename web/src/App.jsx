import { useCallback, useEffect, useState } from 'react';

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
  lcr_number: '', date_of_registration: '', page_no: '', book_no: '',
  name_of_child: '', sex: '', date_of_birth: '', place_of_birth: '', type_of_birth: '', order: '',
  mother_name: '', mother_age: '', mother_nationality: '', mother_religion: '',
  father_name: '', father_age: '', father_nationality: '', father_religion: '',
  date_of_marriage_of_parents: '', place_of_marriage_of_parents: '',
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

function toProperCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function deduplicateEmployees(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  for (const emp of list) {
    if (!emp || !emp.name) continue;
    const nameKey = emp.name.trim().toUpperCase();
    if (nameKey) {
      map.set(nameKey, emp);
    }
  }
  return Array.from(map.values());
}

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

// ─── Edit Record Form Modal ───────────────────────────────────────────────────
function EditRecordModal({ serverUrl, token, record, recordType, onSuccess, onClose }) {
  const [form, setForm] = useState(() => ({ ...record }));
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
    setSaving(true);
    try {
      let endpoint = recordType === 'birth' ? 'birth-records' : recordType === 'death' ? 'death-records' : 'records';
      const res = await fetch(`${serverUrl}/api/${endpoint}/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update record');
      onSuccess('Record updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = recordType === 'birth'
    ? [{ id: 'lcr', label: 'LCR' }, { id: 'child', label: 'Child' }, { id: 'parents', label: 'Parents' }, { id: 'location', label: 'Location' }]
    : null;

  return (
    <Modal title={`Edit ${recordType === 'birth' ? 'Birth' : recordType === 'death' ? 'Death' : 'General'} Record #${record.id}`} icon="✏️" onClose={onClose}>
      {tabs && (
        <div className="modal-form-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`modal-tab-item ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>
      )}
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <div className="modal-body">
          {error && <div className="error-banner">⚠️ {error}</div>}

          {recordType === 'birth' && (
            <>
              {activeTab === 'lcr' && (
                <div className="form-grid">
                  <div className="form-field-group"><label className="form-label">LCR No.</label><input className="form-input-control" name="lcr_number" value={form.lcr_number || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Date of Registration</label><input className="form-input-control" type="date" name="date_of_registration" value={form.date_of_registration || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Page No.</label><input className="form-input-control" name="page_no" value={form.page_no || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Book No.</label><input className="form-input-control" name="book_no" value={form.book_no || ''} onChange={handle} /></div>
                </div>
              )}
              {activeTab === 'child' && (
                <div className="form-grid">
                  <div className="form-field-group full-width"><label className="form-label">Name of Child</label><input className="form-input-control" name="name_of_child" value={form.name_of_child || ''} onChange={handle} required /></div>
                  <div className="form-field-group"><label className="form-label">Sex</label><select className="form-input-control" name="sex" value={form.sex || ''} onChange={handle}><option value="">— Select —</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                  <div className="form-field-group"><label className="form-label">Date of Birth</label><input className="form-input-control" type="date" name="date_of_birth" value={form.date_of_birth || ''} onChange={handle} /></div>
                  <div className="form-field-group full-width"><label className="form-label">Place of Birth</label><input className="form-input-control" name="place_of_birth" value={form.place_of_birth || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Type of Birth</label><select className="form-input-control" name="type_of_birth" value={form.type_of_birth || ''} onChange={handle}><option value="">— Select —</option>{['Single', 'Twin', 'Triplet', 'Others'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div className="form-field-group"><label className="form-label">Birth Order</label><select className="form-input-control" name="order" value={form.order || ''} onChange={handle}><option value="">— Select —</option>{['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                </div>
              )}
              {activeTab === 'parents' && (
                <div className="form-grid">
                  <div className="form-field-group"><label className="form-label">Mother's Name</label><input className="form-input-control" name="mother_name" value={form.mother_name || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Mother's Age</label><input className="form-input-control" name="mother_age" value={form.mother_age || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Mother's Citizenship</label><input className="form-input-control" name="mother_nationality" value={form.mother_nationality || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Mother's Religion</label><input className="form-input-control" name="mother_religion" value={form.mother_religion || ''} onChange={handle} /></div>
                  <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
                  <div className="form-field-group"><label className="form-label">Father's Name</label><input className="form-input-control" name="father_name" value={form.father_name || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Father's Age</label><input className="form-input-control" name="father_age" value={form.father_age || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Father's Citizenship</label><input className="form-input-control" name="father_nationality" value={form.father_nationality || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Father's Religion</label><input className="form-input-control" name="father_religion" value={form.father_religion || ''} onChange={handle} /></div>
                  <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
                  <div className="form-field-group"><label className="form-label">Date of Marriage of Parents</label><input className="form-input-control" type="date" name="date_of_marriage_of_parents" value={form.date_of_marriage_of_parents || ''} onChange={handle} /></div>
                  <div className="form-field-group"><label className="form-label">Place of Marriage of Parents</label><input className="form-input-control" name="place_of_marriage_of_parents" value={form.place_of_marriage_of_parents || ''} onChange={handle} /></div>
                </div>
              )}
              {activeTab === 'location' && (
                <div className="form-grid">
                  <div className="form-field-group full-width"><label className="form-label">Municipality / Province</label><input className="form-input-control" name="municipality_province" value={form.municipality_province || ''} onChange={handle} /></div>
                  <div className="form-field-group full-width"><label className="form-label">Remarks</label><textarea className="form-input-control" name="remarks" value={form.remarks || ''} onChange={handle} rows={3} /></div>
                </div>
              )}
            </>
          )}

          {recordType === 'death' && (
            <div className="form-grid">
              <div className="form-field-group full-width">
                <label className="form-label">Name of Deceased</label>
                <input className="form-input-control" name="name_of_deceased" value={form.name_of_deceased || ''} onChange={handle} required />
              </div>
              <div className="form-field-group">
                <label className="form-label">Sex</label>
                <select className="form-input-control" name="sex" value={form.sex || ''} onChange={handle}>
                  <option value="">— Select Sex —</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-field-group">
                <label className="form-label">Age at Death</label>
                <input className="form-input-control" name="age_at_death" value={form.age_at_death || ''} onChange={handle} />
              </div>
              <div className="form-field-group">
                <label className="form-label">LCR Number</label>
                <input className="form-input-control" name="lcr_number" value={form.lcr_number || ''} onChange={handle} />
              </div>
              <div className="form-field-group">
                <label className="form-label">Date of Death</label>
                <input className="form-input-control" type="date" name="date_of_death" value={form.date_of_death || ''} onChange={handle} />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Cause of Death</label>
                <input className="form-input-control" name="cause_of_death" value={form.cause_of_death || ''} onChange={handle} />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Place of Death</label>
                <input className="form-input-control" name="place_of_death" value={form.place_of_death || ''} onChange={handle} />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Remarks</label>
                <textarea className="form-input-control" name="remarks" value={form.remarks || ''} onChange={handle} rows={3} />
              </div>
            </div>
          )}

          {recordType === 'general' && (
            <div className="form-grid">
              <div className="form-field-group full-width">
                <label className="form-label">Document Name</label>
                <input className="form-input-control" name="name" value={form.name || ''} onChange={handle} required />
              </div>
              <div className="form-field-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input-control" name="serial_number" value={form.serial_number || ''} onChange={handle} />
              </div>
              <div className="form-field-group">
                <label className="form-label">Category</label>
                <input className="form-input-control" name="category" value={form.category || ''} onChange={handle} />
              </div>
              <div className="form-field-group full-width">
                <label className="form-label">Description</label>
                <textarea className="form-input-control" name="description" value={form.description || ''} onChange={handle} rows={3} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving Changes…' : '💾 Save Changes'}</button>
        </div>
      </form>
    </Modal>
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
              <div className="form-field-group">
                <label className="form-label">Page No.</label>
                <input className="form-input-control" name="page_no" value={form.page_no} onChange={handle} placeholder="e.g. 42" />
              </div>
              <div className="form-field-group">
                <label className="form-label">Book No.</label>
                <input className="form-input-control" name="book_no" value={form.book_no} onChange={handle} placeholder="e.g. 7" />
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
              <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
              <div className="form-field-group">
                <label className="form-label">Date of Marriage of Parents</label>
                <input className="form-input-control" type="date" name="date_of_marriage_of_parents" value={form.date_of_marriage_of_parents} onChange={handle} />
              </div>
              <div className="form-field-group">
                <label className="form-label">Place of Marriage of Parents</label>
                <input className="form-input-control" name="place_of_marriage_of_parents" value={form.place_of_marriage_of_parents} onChange={handle} placeholder="City / Town" />
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

// ─── Generate Form 1A Modal ───────────────────────────────────────────────────
function Generate1AModal({ serverUrl, token, record, issuance, employees, mcr, mcrDesignation, municipality, province, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  const cleanEmployees = deduplicateEmployees(employees);
  const initialEmp = cleanEmployees && cleanEmployees.length > 0 ? cleanEmployees[0] : null;

  const [form, setForm] = useState({
    date: issuance?.generated_date || today,
    requestee: issuance?.requestee || '',
    purpose: issuance?.purpose || '',
    prn: issuance?.prn || '',
    verified_by: issuance?.verified_by ? String(issuance.verified_by) : (initialEmp ? String(initialEmp.id) : ''),
    verified_by_name: issuance?.verified_by_name || (initialEmp ? initialEmp.name : ''),
    verified_by_designation: issuance?.verified_by_designation || (initialEmp ? initialEmp.designation : ''),
    mcr_name: issuance?.mcr_name || mcr || '',
    amount_paid: issuance?.amount_paid || '175.00',
    or_number: issuance?.or_number || '',
    date_paid: issuance?.date_paid || today,
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const handle = e => {
    const { name, value, type } = e.target;
    const val = (type === 'text' || e.target.tagName === 'TEXTAREA') ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: val }));
  };

  const handleEmployeeChange = e => {
    const selectedId = e.target.value;
    const emp = employees.find(emp => String(emp.id) === String(selectedId) || emp.name === selectedId);
    setForm(prev => ({
      ...prev,
      verified_by: selectedId,
      verified_by_name: emp ? emp.name : selectedId,
      verified_by_designation: emp ? emp.designation : '',
    }));
  };

  const getDocData = () => {
    let rawName = '';
    let verifiedByDesig = '';

    const emp = employees.find(e => String(e.id) === String(form.verified_by) || e.name === form.verified_by);
    if (emp) {
      rawName = (emp.name || '').trim();
      verifiedByDesig = (emp.designation || '').trim();
    } else if (form.verified_by_name) {
      rawName = (form.verified_by_name || '').trim();
      verifiedByDesig = (form.verified_by_designation || '').trim();
    } else if (form.verified_by) {
      rawName = String(form.verified_by).trim();
    }

    let verifiedByName = rawName;
    if (rawName.includes('—') || rawName.includes(' - ')) {
      const parts = rawName.split(/—|\s-\s/);
      verifiedByName = parts[0].trim();
      if (!verifiedByDesig && parts[1]) {
        verifiedByDesig = parts[1].trim();
      }
    }
    verifiedByName = verifiedByName.toUpperCase();

    const childName = (record?.name_of_child || '').toUpperCase();
    const sex = record?.sex || '';
    const dateOfBirth = record?.date_of_birth
      ? new Date(record.date_of_birth).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const placeOfBirth = record?.place_of_birth || '';
    const motherName = (record?.mother_name || '').toUpperCase();
    const motherCitizenship = record?.mother_nationality || '';
    const fatherName = (record?.father_name || '').toUpperCase();
    const fatherCitizenship = record?.father_nationality || '';
    const marriageDate = record?.date_of_marriage_of_parents
      ? new Date(record.date_of_marriage_of_parents).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const marriagePlace = record?.place_of_marriage_of_parents || '';
    const lcrNumber = record?.lcr_number || '';
    const pageNo = record?.page_no || '___';
    const bookNo = record?.book_no || '___';
    const dateOfReg = record?.date_of_registration
      ? new Date(record.date_of_registration).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const formDate = form.date
      ? new Date(form.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';
    const datePaid = form.date_paid
      ? new Date(form.date_paid + 'T00:00:00').toLocaleDateString('en-PH', { month: 'numeric', day: 'numeric', year: '2-digit' })
      : '';
    const mun = (municipality || '').toUpperCase();
    const prov = province || '';
    const mcrName = (form.mcr_name || '').toUpperCase();
    const requestee = (form.requestee || '').toUpperCase();
    const purpose = form.purpose || '';

    return {
      verifiedByName, verifiedByDesig, childName, sex, dateOfBirth, placeOfBirth,
      motherName, motherCitizenship, fatherName, fatherCitizenship, marriageDate, marriagePlace,
      lcrNumber, pageNo, bookNo, dateOfReg, formDate, datePaid, mun, prov, mcrName, requestee, purpose
    };
  };

  const saveToDatabase = async () => {
    setSaving(true);
    setSaveStatus('');
    const newEntry = {
      id: Date.now(),
      birth_record_id: record?.id || null,
      name_of_child: record?.name_of_child || record?.name || '',
      requestee: form.requestee,
      purpose: form.purpose,
      prn: form.prn,
      verified_by: form.verified_by,
      mcr_name: form.mcr_name,
      amount_paid: form.amount_paid,
      or_number: form.or_number,
      date_paid: form.date_paid,
      generated_date: form.date,
      created_at: new Date().toISOString(),
    };

    // Deduplicate localStorage: remove by OR number first, then by birth_record_id
    try {
      const localSaved = JSON.parse(localStorage.getItem('lcr-form1a-saved-records') || '[]');
      let filtered = localSaved;
      if (form.or_number && form.or_number.trim() !== '') {
        filtered = filtered.filter(item =>
          !item.or_number || item.or_number.toLowerCase() !== form.or_number.trim().toLowerCase()
        );
      }
      if (record?.id) {
        filtered = filtered.filter(item => String(item.birth_record_id) !== String(record.id));
      }
      localStorage.setItem('lcr-form1a-saved-records', JSON.stringify([newEntry, ...filtered]));
    } catch { /* ignore storage error */ }

    try {
      const res = await fetch(`${serverUrl}/api/form1a-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          birth_record_id: record?.id || null,
          requestee: form.requestee,
          purpose: form.purpose,
          prn: form.prn,
          verified_by: form.verified_by,
          mcr_name: form.mcr_name,
          amount_paid: form.amount_paid,
          or_number: form.or_number,
          date_paid: form.date_paid,
          generated_date: form.date,
        }),
      });
      if (res.ok) {
        setSaveStatus('Form 1A saved to database & local archive!');
      } else {
        setSaveStatus('Form 1A saved to local archive!');
      }
    } catch (err) {
      setSaveStatus('Form 1A saved to local archive!');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 4000);
    }
    return true;
  };

  const buildHtmlDoc = () => {
    const d = getDocData();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>LCR Form 1A</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11.5pt;
    color: #000;
    background: #fff;
  }
  .page {
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto;
    padding: 0.65in 1in 0.65in 1in;
    position: relative;
  }
  .corner-label { font-size: 10pt; line-height: 1.5; margin-bottom: 6px; }
  .corner-label em { font-style: italic; }
  .doc-header { text-align: center; margin-bottom: 4px; }
  .doc-header p { font-size: 11.5pt; line-height: 1.6; }
  .doc-header .municipality { font-weight: bold; text-transform: uppercase; }
  .office-title { text-align: center; font-weight: bold; font-style: italic; font-size: 13pt; margin: 10px 0 16px; }
  .doc-date { text-align: right; margin-bottom: 20px; font-size: 11.5pt; }
  .salutation { font-weight: bold; margin-bottom: 14px; font-size: 11.5pt; }
  .cert-para { margin-left: 36pt; text-align: justify; margin-bottom: 16px; font-size: 11.5pt; line-height: 1.6; }
  .data-table { margin-left: 90pt; margin-bottom: 16px; }
  .data-row { display: flex; align-items: baseline; margin-bottom: 3px; font-size: 11pt; font-style: italic; }
  .data-label { min-width: 200pt; font-style: italic; padding-right: 6pt; }
  .data-colon { padding-right: 8pt; font-style: italic; }
  .data-value { font-style: italic; }
  .data-value.bold-caps { font-weight: bold; font-style: italic; text-transform: uppercase; }
  .closing-para { margin-left: 36pt; text-align: justify; margin-top: 18px; margin-bottom: 32px; font-size: 11.5pt; line-height: 1.7; }
  .closing-para .hl { font-weight: bold; text-decoration: underline; }
  .sig-section { margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { display: inline-block; min-width: 200pt; text-align: center; }
  .sig-label { font-size: 11pt; margin-bottom: 36pt; text-align: left; }
  .sig-name { font-weight: bold; text-transform: uppercase; font-size: 11pt; border-top: 1px solid #000; padding-top: 3px; width: 100%; display: block; text-align: center; }
  .sig-desig { font-size: 10pt; text-align: center; display: block; margin-top: 2px; }
  .payment-section { margin-top: 28px; font-size: 11pt; line-height: 1.8; }
  .note { margin-top: 18px; font-size: 10pt; font-style: italic; }
  .note span { font-weight: bold; }
  @media print {
    body { -webkit-print-color-adjust: exact; }
    @page { margin: 0; }
  }
</style>
</head>
<body>
<div class="page">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2px;">
    <div class="corner-label">
      LCR Form No. 1A<br/>
      <em>(Birth Available)</em>
    </div>
    <div></div>
  </div>

  <div class="doc-header">
    <p>Republic of the Philippines</p>
    <p class="municipality">Municipality of ${d.mun || '____________________'}</p>
    <p>${d.prov || '____________________'}</p>
  </div>

  <div class="office-title">Office of the Municipal Civil Registrar</div>
  <div class="doc-date">${d.formDate}</div>
  <div class="salutation">TO WHOM IT MAY CONCERN:</div>

  <div class="cert-para">
    We certify that, among others, the following facts of birth that appears in our
    Register of Births on page <strong>${d.pageNo}</strong> of book number <strong>${d.bookNo}</strong>.
  </div>

  <div class="data-table">
    <div class="data-row"><span class="data-label">Population Reference Number (PRN)</span><span class="data-colon">:</span><span class="data-value">${form.prn || ''}</span></div>
    <div class="data-row"><span class="data-label">Registry Number</span><span class="data-colon">:</span><span class="data-value">${d.lcrNumber}</span></div>
    <div class="data-row"><span class="data-label">Date of Registration</span><span class="data-colon">:</span><span class="data-value">${d.dateOfReg}</span></div>
    <div class="data-row"><span class="data-label">Name of Child</span><span class="data-colon">:</span><span class="data-value bold-caps">${d.childName}</span></div>
    <div class="data-row"><span class="data-label">Sex</span><span class="data-colon">:</span><span class="data-value">${d.sex}</span></div>
    <div class="data-row"><span class="data-label">Date of Birth</span><span class="data-colon">:</span><span class="data-value">${d.dateOfBirth}</span></div>
    <div class="data-row"><span class="data-label">Place of Birth</span><span class="data-colon">:</span><span class="data-value">${d.placeOfBirth}</span></div>
    <div class="data-row"><span class="data-label">Name of Mother</span><span class="data-colon">:</span><span class="data-value bold-caps">${d.motherName}</span></div>
    <div class="data-row"><span class="data-label">Citizenship of Mother</span><span class="data-colon">:</span><span class="data-value">${d.motherCitizenship}</span></div>
    <div class="data-row"><span class="data-label">Name of Father</span><span class="data-colon">:</span><span class="data-value bold-caps">${d.fatherName}</span></div>
    <div class="data-row"><span class="data-label">Citizenship of Father</span><span class="data-colon">:</span><span class="data-value">${d.fatherCitizenship}</span></div>
    <div class="data-row"><span class="data-label">Date of Marriage of Parents</span><span class="data-colon">:</span><span class="data-value">${d.marriageDate}</span></div>
    <div class="data-row"><span class="data-label">Place of Marriage of Parents</span><span class="data-colon">:</span><span class="data-value">${d.marriagePlace}</span></div>
  </div>

  <div class="closing-para">
    This certification is issued to <span class="hl">${d.requestee}</span> upon his/her request for
    <span class="hl">${d.purpose}</span> purpose(s).
  </div>

  <div class="sig-section">
    <div>
      <div class="sig-label">Verified by:</div>
      <div class="sig-block">
        <div class="sig-name">${d.verifiedByName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
        <div class="sig-desig">${d.verifiedByDesig || ''}</div>
      </div>
    </div>
    <div class="sig-block">
      <div class="sig-name">${d.mcrName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
      <div class="sig-desig">Municipal Civil Registrar</div>
    </div>
  </div>

  <div class="payment-section">
    Amount Paid: P${form.amount_paid || ''}<br/>
    O.R Number &nbsp;: ${form.or_number || ''}<br/>
    Date Paid &nbsp;&nbsp;&nbsp;: ${d.datePaid}
  </div>

  <div class="note">
    <span>NOTE:</span> <em>A mark, erasure or alteration of any entry invalidates this certification.</em>
  </div>
</div>
</body>
</html>`;
  };

  const handlePrint = async () => {
    await saveToDatabase();
    const html = buildHtmlDoc();
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleExportDocx = async () => {
    await saveToDatabase();
    const html = buildHtmlDoc();
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Form 1A</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + html + footer;

    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const childName = (record?.name_of_child || 'Record').replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `Form_1A_${childName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title="Generate Form 1A — Certified True Copy" icon="📋" onClose={onClose}>
      <div className="modal-body">
        {saveStatus && (
          <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', color: '#10b981', marginBottom: '16px', fontSize: '0.88rem' }}>
            ✨ {saveStatus}
          </div>
        )}

        <div className="form-grid">
          <div className="form-field-group">
            <label className="form-label">Date</label>
            <input className="form-input-control" type="date" name="date" value={form.date} onChange={handle} required />
          </div>
          <div className="form-field-group">
            <label className="form-label">Requestee (Requested By)</label>
            <input className="form-input-control" name="requestee" value={form.requestee} onChange={handle} placeholder="Full name of requester" required />
          </div>
          <div className="form-field-group">
            <label className="form-label">Purpose</label>
            <input className="form-input-control" name="purpose" value={form.purpose} onChange={handle} placeholder="e.g. TRAVEL ABROAD" required />
          </div>
          <div className="form-field-group">
            <label className="form-label">Population Reference No. (PRN)</label>
            <input className="form-input-control" name="prn" value={form.prn} onChange={handle} placeholder="PRN (optional)" />
          </div>
          <div className="form-field-group">
            <label className="form-label">Verified By (Employee)</label>
            <select className="form-input-control" name="verified_by" value={form.verified_by} onChange={handleEmployeeChange}>
              <option value="">— Custom / Select Employee —</option>
              {cleanEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.designation}</option>
              ))}
            </select>
          </div>
          <div className="form-field-group">
            <label className="form-label" hidden>Verifier Name</label>
            <input hidden className="form-input-control" name="verified_by_name" value={form.verified_by_name} onChange={handle} placeholder="Full name of verifier" />
          </div>
          <div className="form-field-group">
            <label className="form-label" hidden>Verifier Designation</label>
            <input hidden className="form-input-control" name="verified_by_designation" value={form.verified_by_designation} onChange={handle} placeholder="e.g. Registration Officer I" />
          </div>
          <div className="form-field-group">
            <label className="form-label" hidden>Municipal Civil Registrar (MCR)</label>
            <input hidden className="form-input-control" name="mcr_name" value={form.mcr_name} onChange={handle} placeholder="MCR full name" />
          </div>
        </div>

        <div style={{ padding: '8px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '10px', margin: '14px 0 6px', fontSize: '0.82rem', color: 'var(--text-subtle)' }}>
          💳 Payment Details
        </div>

        <div className="form-grid">
          <div className="form-field-group">
            <label className="form-label">Amount Paid (P)</label>
            <input className="form-input-control" type="number" name="amount_paid" value={form.amount_paid} onChange={(e) => setForm(prev => ({ ...prev, amount_paid: e.target.value }))} placeholder="175.00" step="0.01" />
          </div>
          <div className="form-field-group">
            <label className="form-label">O.R. Number</label>
            <input className="form-input-control" name="or_number" value={form.or_number} onChange={handle} placeholder="Official Receipt #" />
          </div>
          <div className="form-field-group">
            <label className="form-label">Date Paid</label>
            <input className="form-input-control" type="date" name="date_paid" value={form.date_paid} onChange={handle} />
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ color: 'var(--accent-primary)', borderColor: 'rgba(56,189,248,0.3)' }}
            disabled={saving}
            onClick={saveToDatabase}
          >
            {saving ? 'Saving...' : '💾 Save to DB'}
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            onClick={handleExportDocx}
          >
            📄 Export to DOCX
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
            onClick={handlePrint}
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Application Component ───────────────────────────────────────────────
export default function App() {
  // ─── Base Auth & Endpoint States ─────────────────────────────────────────────
  const [serverUrl, setServerUrl] = useState('https://search-lcr.vercel.app');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);

  // ─── Settings: Employees, MCR & Office Info ─────────────────────────────────
  const [employees, setEmployees] = useState(() => {
    try { return JSON.parse(localStorage.getItem('lcr-employees') || '[]'); } catch { return []; }
  });
  const [mcr, setMcr] = useState(() => localStorage.getItem('lcr-mcr') || '');
  const [municipality, setMunicipality] = useState(() => localStorage.getItem('lcr-municipality') || '');
  const [province, setProvince] = useState(() => localStorage.getItem('lcr-province') || '');
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpDesignation, setNewEmpDesignation] = useState('');
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpDesignation, setEditEmpDesignation] = useState('');
  const [mcrInput, setMcrInput] = useState(() => localStorage.getItem('lcr-mcr') || '');
  const [municipalityInput, setMunicipalityInput] = useState(() => localStorage.getItem('lcr-municipality') || '');
  const [provinceInput, setProvinceInput] = useState(() => localStorage.getItem('lcr-province') || '');
  const [mcrSaved, setMcrSaved] = useState(false);

  // Fetch office settings & employees from database
  const fetchOfficeAndEmployees = useCallback(async () => {
    if (!token) return;
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    try {
      const officeRes = await fetch(`${baseUrl}/api/settings/office`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (officeRes.ok) {
        const officeData = await readJsonResponse(officeRes);
        if (officeData.mcr_name) { setMcr(officeData.mcr_name); setMcrInput(officeData.mcr_name); }
        if (officeData.municipality) { setMunicipality(officeData.municipality); setMunicipalityInput(officeData.municipality); }
        if (officeData.province) { setProvince(officeData.province); setProvinceInput(officeData.province); }
      }
    } catch { /* fallback to local */ }

    try {
      const empRes = await fetch(`${baseUrl}/api/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (empRes.ok) {
        const empData = await readJsonResponse(empRes);
        if (Array.isArray(empData.employees)) {
          const clean = deduplicateEmployees(empData.employees);
          setEmployees(clean);
          localStorage.setItem('lcr-employees', JSON.stringify(clean));
        }
      }
    } catch { /* fallback to local */ }
  }, [token, serverUrl]);

  useEffect(() => {
    if (token) {
      fetchOfficeAndEmployees();
    }
  }, [token, fetchOfficeAndEmployees]);

  const addEmployee = async () => {
    if (!newEmpName.trim()) return;
    const name = newEmpName.trim().toUpperCase();
    const designation = newEmpDesignation.trim();
    const baseUrl = serverUrl.trim().replace(/\/$/, '');

    try {
      const res = await fetch(`${baseUrl}/api/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, designation }),
      });
      if (res.ok) {
        const data = await readJsonResponse(res);
        const updated = deduplicateEmployees([...employees, data]);
        setEmployees(updated);
        localStorage.setItem('lcr-employees', JSON.stringify(updated));
      } else {
        throw new Error('API save failed');
      }
    } catch {
      // Fallback local save
      const newEmp = { id: Date.now().toString(), name, designation };
      const updated = deduplicateEmployees([...employees, newEmp]);
      setEmployees(updated);
      localStorage.setItem('lcr-employees', JSON.stringify(updated));
    }
    setNewEmpName('');
    setNewEmpDesignation('');
  };

  const removeEmployee = async (id) => {
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    try {
      await fetch(`${baseUrl}/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore error */ }

    const updated = employees.filter(e => String(e.id) !== String(id));
    setEmployees(updated);
    localStorage.setItem('lcr-employees', JSON.stringify(updated));
  };

  const startEditEmployee = (emp) => {
    setEditingEmpId(emp.id);
    setEditEmpName(emp.name || '');
    setEditEmpDesignation(emp.designation || '');
  };

  const cancelEditEmployee = () => {
    setEditingEmpId(null);
    setEditEmpName('');
    setEditEmpDesignation('');
  };

  const updateEmployee = async (id) => {
    if (!editEmpName.trim()) return;
    const name = editEmpName.trim().toUpperCase();
    const designation = editEmpDesignation.trim();
    const baseUrl = serverUrl.trim().replace(/\/$/, '');

    try {
      const res = await fetch(`${baseUrl}/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, designation }),
      });
      if (res.ok) {
        const data = await readJsonResponse(res);
        const updated = employees.map(e => String(e.id) === String(id) ? data : e);
        setEmployees(updated);
        localStorage.setItem('lcr-employees', JSON.stringify(updated));
      } else {
        throw new Error('API update failed');
      }
    } catch {
      // Fallback local update
      const updated = employees.map(e => String(e.id) === String(id) ? { ...e, name, designation } : e);
      setEmployees(updated);
      localStorage.setItem('lcr-employees', JSON.stringify(updated));
    }

    cancelEditEmployee();
  };

  const saveMcr = async () => {
    setMcr(mcrInput);
    localStorage.setItem('lcr-mcr', mcrInput);
    setMunicipality(municipalityInput);
    localStorage.setItem('lcr-municipality', municipalityInput);
    setProvince(provinceInput);
    localStorage.setItem('lcr-province', provinceInput);

    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    try {
      await fetch(`${baseUrl}/api/settings/office`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mcr_name: mcrInput,
          municipality: municipalityInput,
          province: provinceInput,
        }),
      });
    } catch { /* ignore error */ }

    setMcrSaved(true);
    setTimeout(() => setMcrSaved(false), 3000);
  };

  // ─── Form 1A Modal State ─────────────────────────────────────────────────────
  const [show1AModal, setShow1AModal] = useState(false);
  const [form1ARecord, setForm1ARecord] = useState(null);
  const [form1AIssuance, setForm1AIssuance] = useState(null);
  const [rePrintLoading, setRePrintLoading] = useState(false);

  const handleRePrint = async (f1a) => {
    setRePrintLoading(true);
    let fullRecord = null;
    try {
      const base = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${base}/api/birth-records/${f1a.birth_record_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await readJsonResponse(res);
        fullRecord = data.record || data;
      }
    } catch { /* ignore, fallback to partial */ }

    setForm1ARecord(fullRecord || {
      id: f1a.birth_record_id,
      name_of_child: f1a.name_of_child,
      lcr_number: f1a.record_lcr_number,
    });
    setForm1AIssuance(f1a);
    setShow1AModal(true);
    setRePrintLoading(false);
  };


  // Active View: 'search' | 'issuance' | 'settings'
  const [activePage, setActivePage] = useState('search');

  // Passcode Security States
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [verifyingPasscode, setVerifyingPasscode] = useState(false);

  // Passcode Change States
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passChangeStatus, setPassChangeStatus] = useState('');
  const [passChangeError, setPassChangeError] = useState('');

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
  // Active detail sub-tab: 'overview' | 'family' | 'document'
  const [detailTab, setDetailTab] = useState('overview');

  // Modals state: null | 'birth' | 'death' | 'edit'
  const [modalMode, setModalMode] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
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
      params.set('limit', '500');

      let endpoint;
      if (tab === 'birth') endpoint = 'birth-records';
      else if (tab === 'death') endpoint = 'death-records';
      else endpoint = 'search'; // general tab uses unified search (birth + death)

      const response = await fetch(`${baseUrl}/api/${endpoint}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `Unable to fetch records (${response.status})`);

      const loaded = Array.isArray(data.records) ? data.records : [];
      setRecords(loaded);
      setSelectedRecord(null);
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

  // Form 1A Saved Records Archive State
  const [savedForm1As, setSavedForm1As] = useState([]);

  const fetchSavedForm1As = useCallback(async () => {
    let localList = [];
    try {
      localList = JSON.parse(localStorage.getItem('lcr-form1a-saved-records') || '[]');
    } catch { localList = []; }

    if (!token) {
      setSavedForm1As(localList);
      return;
    }

    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/form1a-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse(res);
      if (res.ok && Array.isArray(data.records)) {
        // Combine server records & local records, removing duplicates by id
        const serverRecords = data.records;
        const combined = [...serverRecords];
        for (const loc of localList) {
          if (!combined.some(s => s.id === loc.id || (s.or_number && s.or_number === loc.or_number))) {
            combined.push(loc);
          }
        }
        setSavedForm1As(combined);
      } else {
        setSavedForm1As(localList);
      }
    } catch (err) {
      setSavedForm1As(localList);
    }
  }, [token, serverUrl]);

  const deleteForm1ARecord = async (id, birthRecordId) => {
    if (!window.confirm('Are you sure you want to delete this issuance record?')) return;
    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      await fetch(`${baseUrl}/api/form1a-records/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }

    try {
      const localList = JSON.parse(localStorage.getItem('lcr-form1a-saved-records') || '[]');
      const filtered = localList.filter(r => r.id !== id && (birthRecordId ? String(r.birth_record_id) !== String(birthRecordId) : true));
      localStorage.setItem('lcr-form1a-saved-records', JSON.stringify(filtered));
    } catch { /* ignore */ }

    setSavedForm1As(prev => prev.filter(r => r.id !== id && (birthRecordId ? String(r.birth_record_id) !== String(birthRecordId) : true)));
    setToastMessage('Issuance record deleted!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const clearAllForm1ARecords = async () => {
    if (!window.confirm('Are you sure you want to empty/clear ALL Form 1A issuance records? This action cannot be undone.')) {
      return;
    }
    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      await fetch(`${baseUrl}/api/form1a-records`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* ignore */ }

    try {
      localStorage.removeItem('lcr-form1a-saved-records');
    } catch { /* ignore */ }

    setSavedForm1As([]);
    setToastMessage('All Form 1A issuance records cleared successfully!');
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    if (token && (activePage === 'issuance' || (activePage === 'settings' && isPasscodeUnlocked))) {
      fetchSavedForm1As();
    }
  }, [token, activePage, isPasscodeUnlocked, fetchSavedForm1As]);

  useEffect(() => {
    if (token && activePage === 'search') {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      fetchRecords(baseUrl, token, search.trim(), currentTab);
    }
  }, [currentTab, activePage]);

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
    setIsPasscodeUnlocked(false);
  };

  const handleFormSuccess = (msg) => {
    setModalMode(null);
    setEditingRecord(null);
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
    const baseUrl = serverUrl.trim().replace(/\/$/, '');
    fetchRecords(baseUrl, token, search.trim(), currentTab);
  };

  // ─── Settings Passcode Verification ──────────────────────────────────────────
  const verifyPasscode = async (e) => {
    e.preventDefault();
    setPasscodeError('');
    setVerifyingPasscode(true);
    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/settings/verify-passcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Incorrect passcode');
      setIsPasscodeUnlocked(true);
      setPasscodeInput('');
    } catch (err) {
      setPasscodeError(err.message);
    } finally {
      setVerifyingPasscode(false);
    }
  };

  // ─── Change Passcode Handler ──────────────────────────────────────────────────
  const handleChangePasscode = async (e) => {
    e.preventDefault();
    setPassChangeError('');
    setPassChangeStatus('');
    if (newPass !== confirmPass) {
      setPassChangeError('New passcode and confirmation do not match');
      return;
    }

    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${baseUrl}/api/settings/passcode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPasscode: currentPass, newPasscode: newPass }),
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to update passcode');
      setPassChangeStatus('Passcode updated successfully in database!');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      setPassChangeError(err.message);
    }
  };

  // ─── Record Deletion Handler ──────────────────────────────────────────────────
  const handleDeleteRecord = async (recordToDelete) => {
    if (!window.confirm(`Are you sure you want to delete this ${currentTab} record? This action cannot be undone.`)) {
      return;
    }

    try {
      const baseUrl = serverUrl.trim().replace(/\/$/, '');
      let endpoint = 'records';
      if (currentTab === 'birth') endpoint = 'birth-records';
      if (currentTab === 'death') endpoint = 'death-records';

      const res = await fetch(`${baseUrl}/api/${endpoint}/${recordToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || 'Failed to delete record');

      setSelectedRecord(null);
      setToastMessage('Record deleted successfully');
      setTimeout(() => setToastMessage(''), 4000);
      fetchRecords(baseUrl, token, search.trim(), currentTab);
    } catch (err) {
      alert(`Error deleting record: ${err.message}`);
    }
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

  // ─── MAIN PORTAL VIEW (Search Page + Settings + Modals) ────────────────────────
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
          <button
            className={`nav-link ${activePage === 'search' ? 'active' : ''}`}
            onClick={() => setActivePage('search')}
          >
            <span>🔍</span> Search Records
          </button>
          <button disabled
            className={`nav-link ${activePage === 'issuance' ? 'active' : ''}`}
            onClick={() => setActivePage('issuance')}
          >
            <span >📋</span> 1A Issuance Log
          </button>
          <button
            className={`nav-link ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => setActivePage('settings')}
          >
            <span>⚙️</span> Settings &amp; Management
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
        {activePage === 'search' ? (
          <>
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

            {/* Results Grid / Table Layout */}
            <section className="results-split-layout full-width">
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
                          onClick={() => {
                            setSelectedRecord(rec);
                            setDetailTab('overview');
                          }}
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
                            <span>View Complete Details ➔</span>
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
                              onClick={() => {
                                setSelectedRecord(rec);
                                setDetailTab('overview');
                              }}
                            >
                              <td style={{ fontWeight: 700 }}>{name || '—'}</td>
                              <td><code>{refNum || '—'}</code></td>
                              <td>
                                <span className={`type-pill ${currentTab}`}>
                                  {currentTab === 'general' ? (rec.category || 'General') : currentTab}
                                </span>
                              </td>
                              <td>{dateVal ? new Date(dateVal).toLocaleDateString() : '—'}</td>
                              <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Inspect Record ➔</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activePage === 'issuance' ? (
          /* ─── 1A FORM ISSUANCE REGISTRY PAGE ─────────────────────────────────── */
          <div style={{ display: 'grid', gap: '24px' }}>
            <section className="search-header-hero">
              <div className="search-hero-top">
                <div className="page-headline">
                  <h1>📋 Form 1A Issuance Registry &amp; History</h1>
                  <p>Complete real-time log of all issued LCR Form 1A birth certifications and official receipt payments.</p>
                </div>
                <button
                  className="btn-primary"
                  onClick={fetchSavedForm1As}
                  style={{ height: '40px', fontSize: '0.85rem' }}
                >
                  🔄 Refresh Log
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', paddingTop: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '14px 18px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Total Issued Forms</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }}>{savedForm1As.length}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', padding: '14px 18px', borderRadius: '14px' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>Total Fees Collected</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                    ₱{savedForm1As.reduce((acc, curr) => acc + (parseFloat(curr.amount_paid) || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </section>

            <section className="records-container-card" style={{ minHeight: '450px' }}>
              <div className="records-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3>📜 Recent 1A Form Issuance Records</h3>
                  <span className="results-count-badge">{savedForm1As.length} Records</span>
                </div>
                {savedForm1As.length > 0 && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                    onClick={clearAllForm1ARecords}
                  >
                    🗑️ Empty Issuance History
                  </button>
                )}
              </div>

              {savedForm1As.length === 0 ? (
                <div className="state-box">
                  <div className="state-icon">📋</div>
                  <p>No Form 1A issuances logged yet.</p>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-subtle)' }}>Generate a 1A Form from any birth record to record issuances automatically.</span>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Child Name</th>
                        <th>Requestee</th>
                        <th>Purpose</th>
                        <th>PRN</th>
                        <th>O.R. Number</th>
                        <th>Amount Paid</th>
                        <th>Date Issued</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedForm1As.map((f1a) => (
                        <tr key={f1a.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{f1a.name_of_child || '—'}</td>
                          <td>{f1a.requestee || '—'}</td>
                          <td>{f1a.purpose || '—'}</td>
                          <td><code>{f1a.prn || '—'}</code></td>
                          <td><code>{f1a.or_number || '—'}</code></td>
                          <td style={{ fontWeight: 700, color: '#34d399' }}>₱{parseFloat(f1a.amount_paid || 0).toFixed(2)}</td>
                          <td>{f1a.generated_date || (f1a.created_at ? new Date(f1a.created_at).toLocaleDateString() : '—')}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.8rem', height: '32px' }}
                                onClick={() => handleRePrint(f1a)}
                              >
                                {rePrintLoading ? '⏳ Loading…' : '🖨️ Re-Print'}
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.8rem', height: '32px', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                                onClick={() => deleteForm1ARecord(f1a.id, f1a.birth_record_id)}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* ─── SETTINGS & MANAGEMENT PAGE ──────────────────────────────────────── */
          <section style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'grid', gap: '24px' }}>
            <div className="search-header-hero">
              <div className="page-headline">
                <h1>⚙️ Settings & System Security</h1>
                <p>Modify passcode security saved in database, configure system settings, and manage record modifications.</p>
              </div>
            </div>

            {!isPasscodeUnlocked ? (
              <div className="auth-card-wrapper" style={{ margin: '0 auto', maxWidth: '460px', width: '100%' }}>
                <div className="auth-header">
                  <div className="brand-icon">🔒</div>
                  <h2>Passcode Protected</h2>
                  <p>Enter your 4-digit security passcode saved in database to unlock Settings</p>
                </div>

                <form onSubmit={verifyPasscode} style={{ display: 'grid', gap: '16px' }}>
                  <div className="form-field-group">
                    <label className="form-label">Database Passcode</label>
                    <input
                      className="form-input-control"
                      type="password"
                      value={passcodeInput}
                      onChange={(e) => setPasscodeInput(e.target.value)}
                      placeholder="Enter Passcode (Default: 1234)"
                      required
                      autoFocus
                    />
                  </div>

                  {passcodeError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#f43f5e', fontSize: '0.88rem' }}>
                      ⚠️ {passcodeError}
                    </div>
                  )}

                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={verifyingPasscode}>
                    {verifyingPasscode ? 'Verifying...' : 'Unlock Settings 🔓'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                <div style={{ padding: '12px 20px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', borderRadius: '14px', color: '#10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔓 Settings Unlocked via Database Security Passcode</span>
                  <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => setIsPasscodeUnlocked(false)}>Lock Settings</button>
                </div>

                {/* Change Passcode Card */}
                <div className="records-container-card">
                  <div className="records-card-header">
                    <h3>🔑 Change System Passcode in Database</h3>
                  </div>
                  <form onSubmit={handleChangePasscode} style={{ display: 'grid', gap: '16px', marginTop: '12px' }}>
                    <div className="form-field-group">
                      <label className="form-label">Current Passcode</label>
                      <input
                        className="form-input-control"
                        type="password"
                        value={currentPass}
                        onChange={(e) => setCurrentPass(e.target.value)}
                        placeholder="Enter current passcode"
                        required
                      />
                    </div>
                    <div className="form-grid">
                      <div className="form-field-group">
                        <label className="form-label">New Passcode</label>
                        <input
                          className="form-input-control"
                          type="password"
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="Enter new passcode"
                          required
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-label">Confirm New Passcode</label>
                        <input
                          className="form-input-control"
                          type="password"
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          placeholder="Confirm new passcode"
                          required
                        />
                      </div>
                    </div>

                    {passChangeError && (
                      <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '10px', color: '#f43f5e', fontSize: '0.88rem' }}>
                        ⚠️ {passChangeError}
                      </div>
                    )}

                    {passChangeStatus && (
                      <div style={{ padding: '10px 14px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', color: '#10b981', fontSize: '0.88rem' }}>
                        ✨ {passChangeStatus}
                      </div>
                    )}

                    <button type="submit" className="btn-primary" style={{ justifySelf: 'flex-start' }}>
                      Update Database Passcode
                    </button>
                  </form>
                </div>

                {/* Office Info & MCR Settings Card */}
                <div className="records-container-card">
                  <div className="records-card-header">
                    <h3>🏛️ Office Information &amp; MCR</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                    <div className="form-grid">
                      <div className="form-field-group">
                        <label className="form-label">Municipality Name</label>
                        <input
                          className="form-input-control"
                          value={municipalityInput}
                          onChange={(e) => setMunicipalityInput(e.target.value)}
                          placeholder="e.g. Bulan"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-label">Province</label>
                        <input
                          className="form-input-control"
                          value={provinceInput}
                          onChange={(e) => setProvinceInput(e.target.value)}
                          placeholder="e.g. Sorsogon"
                        />
                      </div>
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Municipal Civil Registrar (MCR) Full Name</label>
                      <input
                        className="form-input-control"
                        value={mcrInput}
                        onChange={(e) => setMcrInput(e.target.value.toUpperCase())}
                        placeholder="Full name of Municipal Civil Registrar"
                      />
                    </div>
                    {mcrSaved && (
                      <div style={{ padding: '8px 14px', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '10px', color: '#10b981', fontSize: '0.88rem' }}>
                        ✨ Office info &amp; MCR saved!
                      </div>
                    )}
                    <button className="btn-primary" style={{ justifySelf: 'flex-start' }} onClick={saveMcr}>
                      💾 Save Office Info &amp; MCR
                    </button>
                  </div>
                </div>

                {/* Employees Management Card */}
                <div className="records-container-card">
                  <div className="records-card-header">
                    <h3>👤 Employee Directory (for Form 1A)</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                    <div className="form-grid">
                      <div className="form-field-group">
                        <label className="form-label">Employee Name</label>
                        <input
                          className="form-input-control"
                          value={newEmpName}
                          onChange={(e) => setNewEmpName(e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="form-field-group">
                        <label className="form-label">Designation / Title</label>
                        <input
                          className="form-input-control"
                          value={newEmpDesignation}
                          onChange={(e) => setNewEmpDesignation(e.target.value)}
                          placeholder="e.g. Registration Officer I"
                        />
                      </div>
                    </div>
                    <button className="btn-primary" style={{ justifySelf: 'flex-start' }} onClick={addEmployee}>
                      ➕ Add Employee
                    </button>

                    {employees.length === 0 ? (
                      <div style={{ padding: '14px', background: 'var(--card-bg)', borderRadius: '10px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.88rem' }}>
                        No employees added yet. Add an employee above.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {employees.map(emp => (
                          <div key={emp.id} style={{ padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '10px' }}>
                            {editingEmpId === emp.id ? (
                              <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="form-grid">
                                  <div className="form-field-group">
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Name</label>
                                    <input
                                      className="form-input-control"
                                      value={editEmpName}
                                      onChange={(e) => setEditEmpName(e.target.value.toUpperCase())}
                                    />
                                  </div>
                                  <div className="form-field-group">
                                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Designation</label>
                                    <input
                                      className="form-input-control"
                                      value={editEmpDesignation}
                                      onChange={(e) => setEditEmpDesignation(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={cancelEditEmployee}>
                                    Cancel
                                  </button>
                                  <button className="btn-primary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => updateEmployee(emp.id)}>
                                    💾 Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{emp.name}</div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{emp.designation}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                    onClick={() => startEditEmployee(emp)}
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '4px 10px', fontSize: '0.8rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                                    onClick={() => removeEmployee(emp.id)}
                                  >
                                    🗑️ Remove
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Saved Form 1A Records Archive */}
                <div className="records-container-card">
                  <div className="records-card-header">
                    <h3>📋 Saved Form 1A Certifications Archive</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={fetchSavedForm1As}>
                        🔄 Refresh
                      </button>
                      {savedForm1As.length > 0 && (
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '0.8rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                          onClick={clearAllForm1ARecords}
                        >
                          🗑️ Empty Archive
                        </button>
                      )}
                    </div>
                  </div>
                  {savedForm1As.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '0.88rem' }}>
                      No Form 1A certifications saved yet. Form 1A records will automatically appear here when generated.
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ marginTop: '8px' }}>
                      <table className="records-table">
                        <thead>
                          <tr>
                            <th>Child Name</th>
                            <th>Requestee</th>
                            <th>Purpose</th>
                            <th>O.R. Number</th>
                            <th>Amount</th>
                            <th>Date Generated</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedForm1As.map((f1a) => (
                            <tr key={f1a.id}>
                              <td style={{ fontWeight: 700 }}>{f1a.name_of_child || '—'}</td>
                              <td>{f1a.requestee || '—'}</td>
                              <td>{f1a.purpose || '—'}</td>
                              <td><code>{f1a.or_number || '—'}</code></td>
                              <td>₱{f1a.amount_paid || '0.00'}</td>
                              <td>{f1a.generated_date || (f1a.created_at ? new Date(f1a.created_at).toLocaleDateString() : '—')}</td>
                              <td>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.78rem', color: '#f43f5e', borderColor: 'rgba(244,63,94,0.3)' }}
                                  onClick={() => deleteForm1ARecord(f1a.id, f1a.birth_record_id)}
                                >
                                  🗑️ Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Record Details Display Modal (with Edit & Delete Buttons) */}
      {selectedRecord && (
        <Modal
          title={currentTab === 'general' ? selectedRecord.name : currentTab === 'birth' ? selectedRecord.name_of_child : selectedRecord.name_of_deceased}
          icon={currentTab === 'birth' ? '🍼' : currentTab === 'death' ? '🕊️' : '📄'}
          onClose={() => setSelectedRecord(null)}
        >
          <div className="modal-form-tabs">
            <button
              className={`modal-tab-item ${detailTab === 'overview' ? 'active' : ''}`}
              onClick={() => setDetailTab('overview')}
            >
              1. Complete Record Details
            </button>
            {currentTab !== 'general' && (
              <button
                className={`modal-tab-item ${detailTab === 'family' ? 'active' : ''}`}
                onClick={() => setDetailTab('family')}
              >
                2. Family & Informant
              </button>
            )}
            {currentTab === 'general' && (
              <button
                className={`modal-tab-item ${detailTab === 'document' ? 'active' : ''}`}
                onClick={() => setDetailTab('document')}
              >
                2. Document Image
              </button>
            )}
          </div>

          <div className="modal-body">
            {detailTab === 'overview' && (
              <div>
                {currentTab === 'general' && (
                  <div className="form-grid">
                    <div className="form-field-group">
                      <label className="form-label">Document Name</label>
                      <input className="form-input-control" value={selectedRecord.name || ''} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Serial Number</label>
                      <input className="form-input-control" value={selectedRecord.serial_number || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Category</label>
                      <input className="form-input-control" value={selectedRecord.category || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Date</label>
                      <input className="form-input-control" value={selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Description</label>
                      <textarea className="form-input-control" value={selectedRecord.description || 'No description attached.'} readOnly rows={3} />
                    </div>
                  </div>
                )}

                {currentTab === 'birth' && (
                  <div className="form-grid">
                    <div className="form-field-group full-width">
                      <label className="form-label">Full Name of Child</label>
                      <input className="form-input-control" value={selectedRecord.name_of_child || ''} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Sex</label>
                      <input className="form-input-control" value={selectedRecord.sex || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">LCR Number</label>
                      <input className="form-input-control" value={selectedRecord.lcr_number || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Page No.</label>
                      <input className="form-input-control" value={selectedRecord.page_no || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Book No.</label>
                      <input className="form-input-control" value={selectedRecord.book_no || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Date of Registration</label>
                      <input className="form-input-control" value={selectedRecord.date_of_registration ? new Date(selectedRecord.date_of_registration).toLocaleDateString() : '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Date of Birth</label>
                      <input className="form-input-control" value={selectedRecord.date_of_birth ? new Date(selectedRecord.date_of_birth).toLocaleDateString() : '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Place of Birth</label>
                      <input className="form-input-control" value={selectedRecord.place_of_birth || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Type of Birth</label>
                      <input className="form-input-control" value={selectedRecord.type_of_birth || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Birth Order</label>
                      <input className="form-input-control" value={selectedRecord.order || '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Municipality / Province</label>
                      <input className="form-input-control" value={selectedRecord.municipality_province || '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Remarks</label>
                      <textarea className="form-input-control" value={selectedRecord.remarks || 'No remarks recorded.'} readOnly rows={3} />
                    </div>
                  </div>
                )}

                {currentTab === 'death' && (
                  <div className="form-grid">
                    <div className="form-field-group full-width">
                      <label className="form-label">Name of Deceased</label>
                      <input className="form-input-control" value={selectedRecord.name_of_deceased || ''} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Sex</label>
                      <input className="form-input-control" value={selectedRecord.sex || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Age at Death</label>
                      <input className="form-input-control" value={selectedRecord.age_at_death ? `${selectedRecord.age_at_death} yrs` : '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">LCR Number</label>
                      <input className="form-input-control" value={selectedRecord.lcr_number || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Date of Death</label>
                      <input className="form-input-control" value={selectedRecord.date_of_death ? new Date(selectedRecord.date_of_death).toLocaleDateString() : '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Cause of Death</label>
                      <input className="form-input-control" value={selectedRecord.cause_of_death || '—'} readOnly />
                    </div>
                    <div className="form-field-group full-width">
                      <label className="form-label">Place of Death</label>
                      <input className="form-input-control" value={selectedRecord.place_of_death || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Civil Status</label>
                      <input className="form-input-control" value={selectedRecord.civil_status || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Nationality</label>
                      <input className="form-input-control" value={selectedRecord.nationality || '—'} readOnly />
                    </div>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'family' && (
              <div className="form-grid">
                <div className="form-field-group">
                  <label className="form-label">Mother's Full Name</label>
                  <input className="form-input-control" value={selectedRecord.mother_name || '—'} readOnly />
                </div>
                {currentTab === 'birth' && (
                  <>
                    <div className="form-field-group">
                      <label className="form-label">Mother's Age</label>
                      <input className="form-input-control" value={selectedRecord.mother_age ? `${selectedRecord.mother_age} yrs` : '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Mother's Nationality</label>
                      <input className="form-input-control" value={selectedRecord.mother_nationality || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Mother's Religion</label>
                      <input className="form-input-control" value={selectedRecord.mother_religion || '—'} readOnly />
                    </div>
                  </>
                )}
                <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
                <div className="form-field-group">
                  <label className="form-label">Father's Full Name</label>
                  <input className="form-input-control" value={selectedRecord.father_name || '—'} readOnly />
                </div>
                {currentTab === 'birth' && (
                  <>
                    <div className="form-field-group">
                      <label className="form-label">Father's Age</label>
                      <input className="form-input-control" value={selectedRecord.father_age ? `${selectedRecord.father_age} yrs` : '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Father's Nationality</label>
                      <input className="form-input-control" value={selectedRecord.father_nationality || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Father's Religion</label>
                      <input className="form-input-control" value={selectedRecord.father_religion || '—'} readOnly />
                    </div>
                    <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
                    <div className="form-field-group">
                      <label className="form-label">Date of Marriage of Parents</label>
                      <input className="form-input-control" value={selectedRecord.date_of_marriage_of_parents ? new Date(selectedRecord.date_of_marriage_of_parents).toLocaleDateString() : '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Place of Marriage of Parents</label>
                      <input className="form-input-control" value={selectedRecord.place_of_marriage_of_parents || '—'} readOnly />
                    </div>
                  </>
                )}
                {currentTab === 'death' && (
                  <>
                    <div className="form-field-group" style={{ gridColumn: 'span 2', height: '1px', background: 'var(--card-border)', margin: '4px 0' }}></div>
                    <div className="form-field-group">
                      <label className="form-label">Informant Name</label>
                      <input className="form-input-control" value={selectedRecord.informant_name || '—'} readOnly />
                    </div>
                    <div className="form-field-group">
                      <label className="form-label">Informant Relationship</label>
                      <input className="form-input-control" value={selectedRecord.informant_relationship || '—'} readOnly />
                    </div>
                  </>
                )}
              </div>
            )}

            {detailTab === 'document' && (
              <div>
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
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
                onClick={() => setEditingRecord(selectedRecord)}
              >
                ✏️ Edit Record
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                onClick={() => handleDeleteRecord(selectedRecord)}
              >
                🗑️ Delete Record
              </button>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              onClick={() => {
                setForm1ARecord(selectedRecord);
                setShow1AModal(true);
              }}
            >
              📋 Generate 1A Form
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Record Modal Renderer */}
      {editingRecord && (
        <EditRecordModal
          serverUrl={baseUrl}
          token={token}
          record={editingRecord}
          recordType={currentTab}
          onSuccess={(msg) => {
            handleFormSuccess(msg);
            setSelectedRecord(null);
          }}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {/* Form 1A Generator Modal */}
      {show1AModal && (
        <Generate1AModal
          serverUrl={baseUrl}
          token={token}
          record={form1ARecord}
          issuance={form1AIssuance}
          employees={employees}
          mcr={mcr}
          municipality={municipality}
          province={province}
          onClose={() => { setShow1AModal(false); setForm1AIssuance(null); }}
        />
      )}

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
