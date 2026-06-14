import { useState } from 'react';
import AddProjectForm from '../components/AddProjectForm';
import ProjectTable from '../components/ProjectTable';
import UpdateProjectForm from '../components/UpdateProjectForm';

export default function ProjectPage() {
  const [refresh, setRefresh] = useState(0);
  const [editingProject, setEditingProject] = useState(null);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">Manage construction projects, track status, and monitor finances.</p>
      </header>

      <div className="page-stack">
        <AddProjectForm onProjectAdded={() => setRefresh(prev => prev + 1)} />
        <ProjectTable
          refreshKey={refresh}
          onEdit={(p) => setEditingProject(p)}
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
