import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import BoardColumn from '../components/BoardColumn';
import TaskCard from '../components/TaskCard';
import { Plus, UserPlus } from 'lucide-react';
import TaskDetailModal from '../components/TaskDetailModal';

type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignee: { name: string, email: string } | null;
  version: number;
}

const ProjectBoard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Create Task Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskStatus, setTaskStatus] = useState('OPEN');
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState('');

  // Add Member Modal
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchProjectAndTasks = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?projectId=${id}&limit=100`)
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data.data);
    } catch (error) {
      console.error('Failed to load project board', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();
  }, [id]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const draggedTask = tasks.find(t => t.id === activeId);
    if (!draggedTask) return;

    let newStatus: TaskStatus = draggedTask.status;
    const isOverColumn = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(String(overId));

    if (isOverColumn) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    if (draggedTask.status === newStatus) return;

    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === draggedTask.id ? { ...t, status: newStatus } : t));

    try {
      await api.put(`/tasks/${draggedTask.id}`, {
        status: newStatus,
        version: draggedTask.version
      });
      fetchProjectAndTasks();
    } catch (error: any) {
      setTasks(originalTasks);
      alert(error.response?.data?.error || 'Failed to move task. Conflict detected.');
      fetchProjectAndTasks();
    }
  };

  // --- Create Task ---
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDesc) return;
    setTaskSubmitting(true);
    setTaskError('');

    try {
      await api.post('/tasks', {
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        status: taskStatus,
        projectId: id
      });
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('MEDIUM');
      setTaskStatus('OPEN');
      fetchProjectAndTasks();
    } catch (error: any) {
      setTaskError(error.response?.data?.error || 'Failed to create task');
    } finally {
      setTaskSubmitting(false);
    }
  };

  // --- Add Member ---
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail) return;
    setMemberSubmitting(true);
    setMemberError('');
    setMemberSuccess('');

    try {
      await api.post(`/projects/${id}/members`, {
        email: memberEmail,
        role: memberRole
      });
      setMemberSuccess(`Successfully added ${memberEmail} as ${memberRole}`);
      setMemberEmail('');
      fetchProjectAndTasks(); // Refresh members list
    } catch (error: any) {
      setMemberError(error.response?.data?.error || 'Failed to add member');
    } finally {
      setMemberSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><div className="spinner"></div></div>;

  const columns: { id: TaskStatus, title: string }[] = [
    { id: 'OPEN', title: 'Open' },
    { id: 'IN_PROGRESS', title: 'In Progress' },
    { id: 'RESOLVED', title: 'Resolved' },
    { id: 'CLOSED', title: 'Closed' }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{project?.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {project?.description}
            {project?.members && (
              <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                • {project.members.length} member{project.members.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowMemberModal(true)}>
            <UserPlus size={16} /> Add Member
          </button>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
            <Plus size={16} /> Create Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-container">
          {columns.map(col => (
            <BoardColumn 
              key={col.id} 
              id={col.id} 
              title={col.title} 
              tasks={tasks.filter(t => t.status === col.id)}
              onTaskClick={(taskId) => setSelectedTaskId(taskId)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {/* ============ TASK DETAIL MODAL ============ */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectMembers={project?.members || []}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={() => fetchProjectAndTasks()}
        />
      )}

      {/* ============ CREATE TASK MODAL ============ */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Task</h2>
            {taskError && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{taskError}</div>}
            <form onSubmit={handleCreateTask}>
              <div className="input-group">
                <label className="input-label">Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="e.g. Implement user authentication"
                  required 
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={taskDesc}
                  onChange={e => setTaskDesc(e.target.value)}
                  placeholder="Describe the task..."
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Priority</label>
                  <select 
                    className="input-field" 
                    value={taskPriority}
                    onChange={e => setTaskPriority(e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Status</label>
                  <select 
                    className="input-field" 
                    value={taskStatus}
                    onChange={e => setTaskStatus(e.target.value)}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={taskSubmitting}>
                  {taskSubmitting ? <div className="spinner"></div> : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ ADD MEMBER MODAL ============ */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '0.5rem' }}>Add Member</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Invite someone to this project by their email address.
            </p>
            {memberError && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{memberError}</div>}
            {memberSuccess && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem' }}>{memberSuccess}</div>}
            <form onSubmit={handleAddMember}>
              <div className="input-group">
                <label className="input-label">User Email</label>
                <input 
                  type="email" 
                  className="input-field" 
                  value={memberEmail}
                  onChange={e => setMemberEmail(e.target.value)}
                  placeholder="user@example.com"
                  required 
                  autoFocus
                />
              </div>
              <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="input-label">Role</label>
                <select 
                  className="input-field" 
                  value={memberRole}
                  onChange={e => setMemberRole(e.target.value)}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              {/* Show current members */}
              {project?.members && project.members.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Current Members</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {project.members.map((m: any) => (
                      <div key={m.userId} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem', 
                        backgroundColor: 'var(--bg-tertiary)', 
                        borderRadius: '6px',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ 
                            width: '24px', height: '24px', borderRadius: '50%', 
                            backgroundColor: 'var(--accent-primary)', color: '#fff', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '0.7rem', fontWeight: 600 
                          }}>
                            {m.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{m.user.name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>({m.user.email})</span>
                        </div>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 8px', 
                          borderRadius: '9999px',
                          backgroundColor: m.role === 'ADMIN' ? 'rgba(94, 106, 210, 0.2)' : 'rgba(139, 148, 158, 0.15)',
                          color: m.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          fontWeight: 600
                        }}>
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowMemberModal(false); setMemberError(''); setMemberSuccess(''); }}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={memberSubmitting}>
                  {memberSubmitting ? <div className="spinner"></div> : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
