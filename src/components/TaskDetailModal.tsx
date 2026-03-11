import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Send, Trash2, Edit3, Save, Paperclip, Download, Upload, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TaskDetailModalProps {
  taskId: string;
  projectMembers: any[];
  onClose: () => void;
  onUpdated: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, projectMembers, onClose, onUpdated }) => {
  const { user } = useAuth();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Files
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchTask = async () => {
    try {
      const res = await api.get(`/tasks/${taskId}`);
      const t = res.data;
      setTask(t);
      setTitle(t.title);
      setDescription(t.description);
      setStatus(t.status);
      setPriority(t.priority);
      setAssigneeId(t.assigneeId || '');
    } catch (err) {
      console.error('Failed to fetch task:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/comments/task/${taskId}`);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  useEffect(() => {
    fetchTask();
    fetchComments();
  }, [taskId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('taskId', taskId);
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }
      await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchTask(); // Refresh task to get updated files list
    } catch (err) {
      console.error('Failed to upload files:', err);
    } finally {
      setUploading(false);
      setIsDragging(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('taskId', taskId);
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          formData.append('files', e.dataTransfer.files[i]);
        }
        await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fetchTask();
      } catch (err) {
        console.error('Failed to upload files on drop:', err);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download file:', err);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await api.delete(`/files/${fileId}`);
      fetchTask();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/tasks/${taskId}`, {
        title,
        description,
        status,
        priority,
        assigneeId: assigneeId || null,
        version: task.version
      });
      setEditing(false);
      fetchTask();
      onUpdated();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Conflict: Someone else edited this task. Please close and reopen.');
      } else {
        setError(err.response?.data?.error || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommentSubmitting(true);
    try {
      await api.post('/comments', { taskId, content: newComment });
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const getStatusStyle = (s: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      'OPEN': { bg: 'rgba(74, 74, 74, 0.25)', color: '#ccc' },
      'IN_PROGRESS': { bg: 'rgba(31, 111, 235, 0.2)', color: '#669cf0' },
      'RESOLVED': { bg: 'rgba(35, 134, 54, 0.2)', color: '#4bcc59' },
      'CLOSED': { bg: 'rgba(137, 87, 229, 0.2)', color: '#b185ff' },
    };
    return map[s] || map['OPEN'];
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, fontFamily: 'monospace' }}>
              {task.id.slice(0, 8).toUpperCase()}
            </span>
            {editing ? (
              <input
                type="text"
                className="input-field"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 600 }}
              />
            ) : (
              <h2 style={{ marginTop: '0.25rem', fontSize: '1.25rem' }}>{task.title}</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
            {!editing ? (
              <button className="btn btn-secondary" onClick={() => setEditing(true)} style={{ padding: '0.4rem 0.7rem' }}>
                <Edit3 size={14} /> Edit
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '0.4rem 0.7rem' }}>
                <Save size={14} /> {saving ? '...' : 'Save'}
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.4rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        {/* Meta Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Status */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Status</label>
            {editing ? (
              <select className="input-field" value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '0.4rem 0.6rem' }}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            ) : (
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: getStatusStyle(task.status).bg,
                color: getStatusStyle(task.status).color
              }}>
                {task.status.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Priority */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
            {editing ? (
              <select className="input-field" value={priority} onChange={e => setPriority(e.target.value)} style={{ padding: '0.4rem 0.6rem' }}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            ) : (
              <span className={`priority-${task.priority.toLowerCase()}`} style={{ fontSize: '0.875rem' }}>
                {task.priority === 'HIGH' ? '↑' : task.priority === 'LOW' ? '↓' : '-'} {task.priority}
              </span>
            )}
          </div>

          {/* Assignee */}
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Assignee</label>
            {editing ? (
              <select className="input-field" value={assigneeId} onChange={e => setAssigneeId(e.target.value)} style={{ padding: '0.4rem 0.6rem' }}>
                <option value="">Unassigned</option>
                {projectMembers.map(m => (
                  <option key={m.userId} value={m.userId}>{m.user.name}</option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '0.875rem' }}>
                {task.assignee ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--accent-secondary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600 }}>
                      {task.assignee.name.charAt(0)}
                    </span>
                    {task.assignee.name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Description</label>
          {editing ? (
            <textarea
              className="input-field"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
          {task.creator && <span>By: {task.creator.name}</span>}
          <span>Version: {task.version}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }} />

        {/* Attachments Section */}
        <div 
          style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed transparent',
            borderRadius: '8px',
            backgroundColor: isDragging ? 'rgba(94, 106, 210, 0.05)' : 'transparent',
            transition: 'all 0.2s'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Paperclip size={16} /> Attachments ({task.files?.length || 0})
            </h3>
            <label className="btn btn-secondary" style={{ padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {isDragging && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 600 }}>
              Drop files here to upload
            </div>
          )}

          {!isDragging && task.files && task.files.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {task.files.map((f: any) => (
                <div key={f.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                    <FileText size={16} color="var(--accent-primary)" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.fileName}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {formatFileSize(f.fileSize)} • {f.fileType}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => handleDownloadFile(f.id, f.fileName)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', padding: '4px' }}
                      title="Download"
                    >
                      <Download size={15} />
                    </button>
                    {f.uploaderId === user?.id && (
                      <button
                        onClick={() => handleDeleteFile(f.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Delete file"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem 0' }}>
              No files attached. Upload files or drag and drop here.
            </p>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }} />

        {/* Comments Section */}
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            Comments ({comments.length})
          </h3>

          {/* New Comment Form */}
          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input 
              type="text"
              className="input-field"
              placeholder="Write a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="submit" className="btn btn-primary" disabled={commentSubmitting} style={{ padding: '0.5rem 0.75rem' }}>
              <Send size={14} />
            </button>
          </form>

          {/* Comment List */}
          {comments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              No comments yet. Be the first to comment.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {comments.map(c => (
                <div key={c.id} style={{ 
                  padding: '0.75rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  borderRadius: '8px',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ 
                        width: '22px', height: '22px', borderRadius: '50%', 
                        backgroundColor: 'var(--accent-primary)', color: '#fff',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 600
                      }}>
                        {c.user.name.charAt(0).toUpperCase()}
                      </span>
                      <span style={{ fontWeight: 600 }}>{c.user.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {c.userId === user?.id && (
                      <button 
                        onClick={() => handleDeleteComment(c.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
