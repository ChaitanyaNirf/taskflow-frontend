import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: any;
  onClick?: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.5)' : undefined,
  };

  const getPriorityClass = (priority: string) => {
    switch(priority) {
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const handleClick = () => {
    // Only fire click if user didn't drag
    if (!isDragging && onClick) {
      onClick();
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...listeners} 
      {...attributes}
      className="card task-card"
      onClick={handleClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {task.id.slice(0, 8).toUpperCase()}
        </span>
        <span className={getPriorityClass(task.priority)} style={{ fontSize: '0.75rem' }}>
          {task.priority === 'HIGH' ? '↑' : task.priority === 'LOW' ? '↓' : '-'} {task.priority}
        </span>
      </div>
      <h4 style={{ fontSize: '0.875rem', marginBottom: '4px', lineHeight: 1.4 }}>{task.title}</h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {task.description}
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        {task.assignee ? (
          <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--accent-secondary)', borderRadius: '50%', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 600 }} title={task.assignee.name}>
            {task.assignee.name.charAt(0)}
          </div>
        ) : (
          <div style={{ width: '20px', height: '20px', border: '1px dashed var(--text-muted)', borderRadius: '50%' }} title="Unassigned"></div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
