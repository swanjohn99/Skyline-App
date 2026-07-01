import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { parse } from 'date-fns';
import { listTasks, updateTask, deleteTask } from '../api/tasks';
import AddTaskForm from '../components/AddTaskForm';
import TablePagination from '../components/TablePagination';
import { taskTypeLabel } from '../constants';
import { formatDate, todayInputValue } from '../utils/format';
import { usePagination } from '../hooks/usePagination';
import { usePageTitle } from '../hooks/usePageTitle';

const TaskCalendar = lazy(() => import('../components/TaskCalendar'));

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

function parseDueDate(dateStr) {
  if (!dateStr) return new Date();
  const day = String(dateStr).split('T')[0];
  return parse(day, 'yyyy-MM-dd', new Date());
}

function taskToEvent(task) {
  const due = parseDueDate(task.due_date);
  const typeLabel = taskTypeLabel(task.task_type);
  const title = task.title?.trim() || typeLabel;
  return {
    id: task.id,
    title: task.is_completed ? `${title} ✓` : title,
    start: due,
    end: due,
    allDay: true,
    resource: task,
  };
}

export default function CalendarPage() {
  usePageTitle('Calendar');
  const [calendarTasks, setCalendarTasks] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [range, setRange] = useState({ from: '', to: '' });
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [error, setError] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const loadCalendar = useCallback((from, to) => {
    if (!from || !to) return Promise.resolve();
    setLoadingCalendar(true);
    return listTasks({ from, to })
      .then((data) => { setCalendarTasks(data); setError(''); })
      .catch((err) => setError(err.message || 'Failed to load calendar tasks.'))
      .finally(() => setLoadingCalendar(false));
  }, []);

  const loadUpcoming = useCallback(() => {
    setLoadingUpcoming(true);
    const today = todayInputValue();
    return listTasks({ from: today })
      .then((data) => {
        const sorted = [...data].sort((a, b) => {
          const da = a.due_date || '';
          const db = b.due_date || '';
          if (da !== db) return da.localeCompare(db);
          return (a.title || '').localeCompare(b.title || '');
        });
        setUpcomingTasks(sorted);
        setError('');
      })
      .catch((err) => setError(err.message || 'Failed to load upcoming tasks.'))
      .finally(() => setLoadingUpcoming(false));
  }, []);

  useEffect(() => {
    loadUpcoming();
  }, [loadUpcoming]);

  useEffect(() => {
    if (range.from && range.to) loadCalendar(range.from, range.to);
  }, [range.from, range.to, loadCalendar]);

  const events = useMemo(() => calendarTasks.map(taskToEvent), [calendarTasks]);

  const {
    page, setPage, pageItems, totalPages, totalCount, showPagination,
  } = usePagination(upcomingTasks, undefined, upcomingTasks.length);

  async function refreshAll() {
    await Promise.all([
      range.from && range.to ? loadCalendar(range.from, range.to) : Promise.resolve(),
      loadUpcoming(),
    ]);
  }

  async function handleDeleteTask(task) {
    if (!window.confirm(`Delete task "${task.title || 'Untitled'}"?`)) return;
    try {
      await deleteTask(task.id);
      if (editingTask?.id === task.id) {
        setEditingTask(null);
      }
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEditTask(task) {
    setShowTaskForm(false);
    setSelectedDate('');
    setEditingTask(task);
  }

  async function handleToggleComplete(task) {
    setTogglingId(task.id);
    try {
      await updateTask(task.id, { is_completed: !task.is_completed });
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSelectEvent(event) {
    const task = event.resource;
    if (!task) return;
    await handleToggleComplete(task);
  }

  function handleRangeChange({ start, end }) {
    setRange({ from: toDateStr(start), to: toDateStr(end) });
  }

  function handleSelectSlot(slotInfo) {
    setSelectedDate(toDateStr(slotInfo.start));
    setShowTaskForm(true);
  }

  function handleTaskSaved() {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedDate('');
    refreshAll();
  }

  function handleTaskCancel() {
    setShowTaskForm(false);
    setEditingTask(null);
    setSelectedDate('');
  }

  function entityLink(task) {
    if (!task.entity_type || !task.entity_id) return '—';
    const path = task.entity_type === 'lead'
      ? `/leads/${task.entity_id}`
      : `/projects/${task.entity_id}`;
    const label = task.entity_type === 'lead' ? 'Lead' : 'Project';
    return <Link to={path}>{label}</Link>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Tasks appear on their due dates. Click a date to add, or click an event to mark done.</p>
        </div>
      </header>

      {error && <p className="form-message form-message--error">{error}</p>}

      {(showTaskForm || editingTask) && (
        <AddTaskForm
          task={editingTask}
          defaultDueDate={selectedDate}
          onSaved={handleTaskSaved}
          onCancel={handleTaskCancel}
        />
      )}

      {loadingCalendar && !range.from ? (
        <div className="loading-state"><div className="loading-spinner" />Loading calendar…</div>
      ) : (
        <Suspense fallback={<div className="loading-state"><div className="loading-spinner" />Loading calendar…</div>}>
          <TaskCalendar
            events={events}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            onRangeChange={handleRangeChange}
          />
        </Suspense>
      )}

      <div className="project-table-container" style={{ marginTop: 24 }}>
        <div className="project-table-toolbar">
          <h3 className="project-table-section-title">Upcoming tasks</h3>
          <span className="data-table-muted">From today onward</span>
        </div>

        {loadingUpcoming ? (
          <div className="loading-state"><div className="loading-spinner" />Loading tasks…</div>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Due date</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Linked to</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="data-table-empty">No upcoming tasks.</td>
                    </tr>
                  ) : (
                    pageItems.map((task) => (
                      <tr key={task.id} className={task.is_completed ? 'task-row--completed' : ''}>
                        <td>{formatDate(task.due_date)}</td>
                        <td>{task.title || '—'}</td>
                        <td>{taskTypeLabel(task.task_type)}</td>
                        <td>{entityLink(task)}</td>
                        <td>{task.is_completed ? 'Done' : 'Open'}</td>
                        <td className="data-table-actions">
                          <div className="table-actions-stack">
                            <button type="button" className="btn-edit" onClick={() => handleEditTask(task)}>
                              Edit
                            </button>
                            <button type="button" className="btn-edit btn-edit--danger" onClick={() => handleDeleteTask(task)}>
                              Delete
                            </button>
                            <button
                              type="button"
                              className="btn-edit"
                              disabled={togglingId === task.id}
                              onClick={() => handleToggleComplete(task)}
                            >
                              {togglingId === task.id ? '…' : (task.is_completed ? 'Reopen' : 'Complete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={setPage}
              show={showPagination}
            />
          </>
        )}
      </div>
    </div>
  );
}
