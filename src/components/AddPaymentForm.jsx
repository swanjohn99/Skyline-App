import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AddPaymentForm({ onPaymentAdded, defaultProjectId }) {
  const [projects, setProjects] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [payment, setPayment] = useState({
    project_id: defaultProjectId || '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    supabase.from('projects').select('id, project_title').then(({ data }) => setProjects(data || []));
  }, []);

  useEffect(() => {
    if (defaultProjectId) {
      setPayment(prev => ({ ...prev, project_id: defaultProjectId }));
    }
  }, [defaultProjectId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from('payments').insert([payment]);
    if (!error) {
      onPaymentAdded?.();
      if (!defaultProjectId) {
        setPayment({ project_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0] });
      } else {
        setPayment(prev => ({ ...prev, amount: '', payment_date: new Date().toISOString().split('T')[0] }));
      }
    }
    setSubmitting(false);
  }

  const isCompact = Boolean(defaultProjectId);

  return (
    <form onSubmit={handleSubmit} className={isCompact ? '' : 'form-card'}>
      {!isCompact && (
        <>
          <h3 className="form-card-title">Record Payment</h3>
          <p className="form-card-subtitle">Log a payment received from a client.</p>
        </>
      )}

      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        {!defaultProjectId && (
          <div className="form-field">
            <label>Project</label>
            <select
              required
              value={payment.project_id}
              onChange={(e) => setPayment({ ...payment, project_id: e.target.value })}
            >
              <option value="">Select a project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.project_title}</option>)}
            </select>
          </div>
        )}

        <div className="form-field">
          <label>Amount ($)</label>
          <input
            type="number"
            required
            placeholder="0.00"
            value={payment.amount}
            onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label>Payment Date</label>
          <input
            type="date"
            required
            value={payment.payment_date}
            onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? 'Saving…' : 'Add Payment'}
        </button>
      </div>
    </form>
  );
}
