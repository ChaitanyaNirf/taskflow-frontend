import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, Trash2 } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 0 });

  // Filters
  const [selectedProject, setSelectedProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);

  // Confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
        if (res.data.length > 0 && !selectedProject) {
          setSelectedProject(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: selectedProject,
        page: String(page),
        limit: String(meta.limit),
        sort: sortField,
        order: sortOrder,
      });
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);

      const res = await api.get(`/tasks?${params.toString()}`);
      setTasks(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, page, searchQuery, statusFilter, priorityFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    // Load project members when project changes (for the detail modal)
    if (selectedProject) {
      api.get(`/projects/${selectedProject}`).then(res => {
        setProjectMembers(res.data.members || []);
      }).catch(() => {});
    }
  }, [selectedProject]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleDelete = async (taskId: string) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setDeleteConfirm(null);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string }> = {
      'OPEN': { bg: 'rgba(74, 74, 74, 0.25)', color: '#ccc' },
      'IN_PROGRESS': { bg: 'rgba(31, 111, 235, 0.2)', color: '#669cf0' },
      'RESOLVED': { bg: 'rgba(35, 134, 54, 0.2)', color: '#4bcc59' },
      'CLOSED': { bg: 'rgba(137, 87, 229, 0.2)', color: '#b185ff' },
    };
    const s = styles[status] || styles['OPEN'];
    return (
      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: s.bg, color: s.color }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityLabel = (priority: string) => {
    const cls = `priority-${priority.toLowerCase()}`;
    return <span className={cls}>{priority === 'HIGH' ? '↑' : priority === 'LOW' ? '↓' : '-'} {priority}</span>;
  };

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown size={12} style={{ opacity: sortField === field ? 1 : 0.3, marginLeft: '4px', transform: sortField === field && sortOrder === 'asc' ? 'scaleY(-1)' : undefined }} />
  );

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Tasks</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Search, filter, and manage all your tasks across projects.
      </p>

      {/* Filter Bar */}
      <form className="filter-bar" onSubmit={handleSearch}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search tasks by title or description..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', marginBottom: 0, width: '100%' }}
          />
        </div>

        <select className="input-field" value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '160px', marginBottom: 0 }}>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select className="input-field" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '130px', marginBottom: 0 }}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select className="input-field" value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: '130px', marginBottom: 0 }}>
          <option value="">All Priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <button type="submit" className="btn btn-secondary" style={{ marginBottom: 0 }}>
          <Filter size={14} /> Filter
        </button>
      </form>

      {/* Task Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="task-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('title')} style={{ width: '30%' }}>Title <SortIcon field="title" /></th>
              <th onClick={() => handleSort('status')}>Status <SortIcon field="status" /></th>
              <th onClick={() => handleSort('priority')}>Priority <SortIcon field="priority" /></th>
              <th>Assignee</th>
              <th onClick={() => handleSort('createdAt')}>Created <SortIcon field="createdAt" /></th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }}></div></td></tr>
            ) : tasks.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No tasks found matching your filters.</td></tr>
            ) : (
              tasks.map(task => (
                <tr key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{task.id.slice(0, 8).toUpperCase()}</div>
                  </td>
                  <td>{getStatusBadge(task.status)}</td>
                  <td>{getPriorityLabel(task.priority)}</td>
                  <td>
                    {task.assignee ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--accent-secondary)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600 }}>
                          {task.assignee.name.charAt(0)}
                        </span>
                        {task.assignee.name}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(task.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(task.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                      title="Delete task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={14} /> Prev
          </button>
          {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
            let pageNum: number;
            if (meta.totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= meta.totalPages - 3) {
              pageNum = meta.totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button key={pageNum} onClick={() => setPage(pageNum)} className={page === pageNum ? 'active' : ''}>
                {pageNum}
              </button>
            );
          })}
          <span className="page-info">{meta.total} tasks</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Delete Task?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              This will soft-delete the task. It can be recovered later if needed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)} style={{ borderColor: 'var(--danger)' }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectMembers={projectMembers}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={fetchTasks}
        />
      )}
    </div>
  );
};

export default Tasks;
