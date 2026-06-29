import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddProjectForm from '../components/AddProjectForm';
import ProjectTable from '../components/ProjectTable';
import UpdateProjectForm from '../components/UpdateProjectForm';
import { usePageTitle } from '../hooks/usePageTitle';

export default function ProjectPage() {
  usePageTitle('Projects');
  const [refresh, setRefresh] = useState(0);
  const [editingProject, setEditingProject] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  function handleProjectAdded() {
    setRefresh(prev => prev + 1);
    setShowAddForm(false);
  }

  return (
    <div className="page">
      <header className="page-header page-header--actions">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Manage construction projects, track status, and monitor finances.</p>
        </div>
        {!showAddForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={17} />
            Add Project
          </button>
        )}
      </header>

      <div className="page-stack">
        {showAddForm && (
          <AddProjectForm
            onProjectAdded={handleProjectAdded}
            onCancel={() => setShowAddForm(false)}
          />
        )}
        <ProjectTable
          refreshKey={refresh}
          onEdit={(p) => setEditingProject(p)}
          onDeleted={() => setRefresh((prev) => prev + 1)}
        />
      </div>

      {editingProject && (
        <UpdateProjectForm
          project={editingProject}
          onUpdate={() => setRefresh(prev => prev + 1)}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
}
