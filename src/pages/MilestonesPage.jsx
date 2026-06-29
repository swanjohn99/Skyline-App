import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddMilestoneForm from '../components/AddMilestoneForm';
import MilestoneTable from '../components/MilestoneTable';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MilestonesPage() {
  usePageTitle('Milestones');
  const [refresh, setRefresh] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editing, setEditing] = useState(null);

  function handleSaved() {
    setRefresh((prev) => prev + 1);
    setShowAddForm(false);
    setEditing(null);
  }

  const isFormOpen = showAddForm || editing;

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Milestones</h1>
          <p className="page-subtitle">Track project milestones with dates and notes.</p>
        </div>
        {!isFormOpen && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Milestone
          </button>
        )}
      </header>

      <div className="page-stack">
        {isFormOpen && (
          <AddMilestoneForm
            milestone={editing}
            onMilestoneAdded={handleSaved}
            onCancel={() => { setShowAddForm(false); setEditing(null); }}
          />
        )}
        <MilestoneTable
          refreshKey={refresh}
          onEdit={setEditing}
          onDeleted={() => setRefresh((prev) => prev + 1)}
        />
      </div>
    </div>
  );
}
