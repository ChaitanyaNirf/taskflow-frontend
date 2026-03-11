import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: any[];
  onTaskClick?: (taskId: string) => void;
}

const BoardColumn: React.FC<BoardColumnProps> = ({ id, title, tasks, onTaskClick }) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const getStatusColorClass = (status: string) => {
    switch(status) {
      case 'OPEN': return 'open';
      case 'IN_PROGRESS': return 'in_progress';
      case 'RESOLVED': return 'resolved';
      case 'CLOSED': return 'closed';
      default: return '';
    }
  };

  return (
    <div 
      className={`board-column ${getStatusColorClass(id)}`}
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? 'rgba(94, 106, 210, 0.05)' : 'var(--bg-secondary)',
        border: isOver ? '1px dashed var(--accent-primary)' : '1px solid var(--border-color)'
      }}
    >
      <div className="board-column-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{title}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="board-column-content">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick?.(task.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default BoardColumn;
