import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { BarChart3, TrendingUp, Users, Clock, Download } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

const Analytics: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get('/projects');
        setProjects(res.data);
        if (res.data.length > 0) {
          setSelectedProject(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [overviewRes, perfRes, trendsRes] = await Promise.all([
          api.get(`/analytics/${selectedProject}/overview`),
          api.get(`/analytics/${selectedProject}/performance`),
          api.get(`/analytics/${selectedProject}/trends`)
        ]);
        setOverview(overviewRes.data);
        setPerformance(perfRes.data);
        setTrends(trendsRes.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedProject]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/analytics/${selectedProject}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tasks-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const chartTextColor = isDark ? '#8b949e' : '#5a6270';
  const chartGridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Chart data
  const statusChartData = overview ? {
    labels: ['Open', 'In Progress', 'Resolved', 'Closed'],
    datasets: [{
      data: [
        overview.statusCounts.OPEN || 0,
        overview.statusCounts.IN_PROGRESS || 0,
        overview.statusCounts.RESOLVED || 0,
        overview.statusCounts.CLOSED || 0
      ],
      backgroundColor: ['#6e7781', '#1f6feb', '#238636', '#8957e5'],
      borderWidth: 0,
      borderRadius: 4,
    }]
  } : null;

  const priorityChartData = overview ? {
    labels: ['Low', 'Medium', 'High'],
    datasets: [{
      data: [
        overview.priorityCounts.LOW || 0,
        overview.priorityCounts.MEDIUM || 0,
        overview.priorityCounts.HIGH || 0
      ],
      backgroundColor: ['#8b949e', '#d29922', '#da3633'],
      borderWidth: 0,
    }]
  } : null;

  // Process trends data
  let trendChartData = null;
  if (trends) {
    const dates = Object.keys(trends).sort();
    trendChartData = {
      labels: dates.map(d => {
        const [, m, day] = d.split('-');
        return `${m}/${day}`;
      }),
      datasets: [
        {
          label: 'Created',
          data: dates.map(d => trends[d].created),
          borderColor: '#1f6feb',
          backgroundColor: 'rgba(31, 111, 235, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        },
        {
          label: 'Resolved',
          data: dates.map(d => trends[d].resolved),
          borderColor: '#238636',
          backgroundColor: 'rgba(35, 134, 54, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 3
        }
      ]
    };
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor },
        grid: { color: chartGridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: chartTextColor, stepSize: 1 },
        grid: { color: chartGridColor },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: chartTextColor, padding: 16 },
      },
    },
  };

  if (loading && !overview) {
    return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '100px' }}><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Project insights and performance metrics.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <select className="input-field" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width: 'auto', minWidth: '180px', marginBottom: 0 }}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="analytics-grid">
        <div className="stat-card">
          <span className="stat-label">Total Tasks</span>
          <span className="stat-value">{overview?.totalTasks || 0}</span>
          <span className="stat-sub">across all statuses</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={12} /> Open
          </span>
          <span className="stat-value" style={{ color: '#6e7781' }}>{overview?.statusCounts?.OPEN || 0}</span>
          <span className="stat-sub">tasks awaiting work</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TrendingUp size={12} /> In Progress
          </span>
          <span className="stat-value" style={{ color: '#1f6feb' }}>{overview?.statusCounts?.IN_PROGRESS || 0}</span>
          <span className="stat-sub">actively being worked on</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <BarChart3 size={12} /> Resolved
          </span>
          <span className="stat-value" style={{ color: '#238636' }}>{overview?.statusCounts?.RESOLVED || 0}</span>
          <span className="stat-sub">completed tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Closed</span>
          <span className="stat-value" style={{ color: '#8957e5' }}>{overview?.statusCounts?.CLOSED || 0}</span>
          <span className="stat-sub">archived tasks</span>
        </div>
        <div className="stat-card">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={12} /> Your Completion Rate
          </span>
          <span className="stat-value" style={{ color: 'var(--accent-primary)' }}>{performance?.completionRate || 0}%</span>
          <span className="stat-sub">{performance?.completedTasks || 0} of {performance?.assignedTasks || 0} assigned</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Delayed Tasks</span>
          <span className="stat-value" style={{ color: 'var(--danger)' }}>{performance?.delayedTasks || 0}</span>
          <span className="stat-sub">past due date</span>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Tasks by Status</h3>
          <div style={{ height: '300px' }}>
            {statusChartData && <Bar data={statusChartData} options={chartOptions} />}
          </div>
        </div>
        <div className="chart-card">
          <h3>Priority Distribution</h3>
          <div style={{ height: '300px' }}>
            {priorityChartData && <Doughnut data={priorityChartData} options={doughnutOptions} />}
          </div>
        </div>
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
          <h3>Task Trends (Last 30 Days)</h3>
          <div style={{ height: '300px' }}>
            {trendChartData && <Line data={trendChartData} options={{...chartOptions, plugins: { legend: { display: true, position: 'bottom', labels: { color: chartTextColor } } }}} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
