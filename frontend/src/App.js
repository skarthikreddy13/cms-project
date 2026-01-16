import React, { useState, useEffect } from 'react';
const API_BASE_URL = process.env.REACT_APP_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  // Data states
  const [programs, setPrograms] = useState([]);
  const [topics, setTopics] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);

  // Modal states
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [selectedTermForLesson, setSelectedTermForLesson] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Format date to IST
  function formatToIST(dateString, includeTime = false) {
    if (!dateString) return '';

    try {
      // Parse the UTC date string
      const utcDate = new Date(dateString);

      // Create formatter for IST
      const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      };

      if (includeTime) {
        options.hour = 'numeric';
        options.minute = '2-digit';
        options.hour12 = true;
      }

      const formatter = new Intl.DateTimeFormat('en-IN', options);

      return formatter.format(utcDate) + ' IST';
    } catch (err) {
      console.error('Date formatting error:', err);
      return dateString;
    }
  }


  // API call helper
  async function callAPI(url, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(API_BASE_URL + url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // Check auth on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      callAPI('/api/auth/me')
        .then(data => setUser(data))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        });
    }
  }, []);

  // Load data based on current page
  useEffect(() => {
    if (!user) return;

    if (currentPage === 'dashboard') {
      loadDashboard();
    } else if (currentPage === 'programs') {
      loadPrograms();
      loadTopics(); // Need topics for program creation
    } else if (currentPage === 'topics') {
      loadTopics();
    } else if (currentPage === 'users') {
      loadUsers();
    }
  }, [user, currentPage]);

  // Load functions
  async function loadDashboard() {
    setLoading(true);
    try {
      const stats = await callAPI('/api/dashboard/stats');
      setDashboardStats(stats);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPrograms() {
    setLoading(true);
    try {
      const data = await callAPI('/api/programs');
      setPrograms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading programs:', err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadTopics() {
    try {
      const data = await callAPI('/api/topics');
      setTopics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading topics:', err);
      setTopics([]);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await callAPI('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading users:', err);
      alert('Error loading users: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProgramDetails(programId) {
    setLoading(true);
    try {
      const program = await callAPI(`/api/programs/${programId}`);
      const terms = await callAPI(`/api/programs/${programId}/terms`);

      for (let term of terms) {
        const lessons = await callAPI(`/api/terms/${term.id}/lessons`);
        term.lessons = Array.isArray(lessons) ? lessons : [];
      }

      program.terms = Array.isArray(terms) ? terms : [];
      setSelectedProgram(program);
      setCurrentPage('program-detail');
    } catch (err) {
      console.error('Error loading program:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Auth functions
  function handleLogin(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    callAPI('/api/auth/login', 'POST', { email, password })
      .then(data => {
        localStorage.setItem('token', data.access_token);
        return callAPI('/api/auth/me');
      })
      .then(data => {
        setUser(data);
        setCurrentPage('dashboard');
        setError('');
      })
      .catch(err => {
        setError('Invalid email or password');
      });
  }

  function handleRegister(e) {
    e.preventDefault();
    const fullName = e.target.fullName.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    callAPI('/api/auth/register', 'POST', { full_name: fullName, email, password })
      .then(data => {
        localStorage.setItem('token', data.access_token);
        return callAPI('/api/auth/me');
      })
      .then(data => {
        setUser(data);
        setCurrentPage('dashboard');
        setError('');
      })
      .catch(err => {
        setError('Registration failed: ' + err.message);
      });
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('dashboard');
    setPrograms([]);
    setTopics([]);
    setUsers([]);
    setSelectedProgram(null);
  }

  // CRUD functions - Users
  async function handleCreateUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      full_name: formData.get('full_name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role')
    };

    try {
      await callAPI('/api/users', 'POST', data);
      setShowUserModal(false);
      e.target.reset();
      loadUsers();
      alert('✅ User created successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm('⚠️ Are you sure you want to delete this user?')) return;

    try {
      await callAPI(`/api/users/${userId}`, 'DELETE');
      loadUsers();
      alert('✅ User deleted successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  // CRUD functions - Programs
  async function handleCreateProgram(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const selectedTopicIds = [];
    topics.forEach(topic => {
      if (formData.get(`topic_${topic.id}`) === 'on') {
        selectedTopicIds.push(topic.id);
      }
    });

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      language_primary: formData.get('language_primary'),
      languages_available: [formData.get('language_primary')],
      topic_ids: selectedTopicIds
    };

    try {
      await callAPI('/api/programs', 'POST', data);
      setShowProgramModal(false);
      e.target.reset();
      loadPrograms();
      alert('✅ Program created successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function handleUpdateProgram(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const selectedTopicIds = [];
    topics.forEach(topic => {
      if (formData.get(`topic_${topic.id}`) === 'on') {
        selectedTopicIds.push(topic.id);
      }
    });

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      language_primary: formData.get('language_primary'),
      languages_available: [formData.get('language_primary')],
      topic_ids: selectedTopicIds
    };

    try {
      await callAPI(`/api/programs/${editingProgram.id}`, 'PUT', data);
      setShowProgramModal(false);
      setEditingProgram(null);
      loadPrograms();
      if (selectedProgram && selectedProgram.id === editingProgram.id) {
        loadProgramDetails(editingProgram.id);
      }
      alert('✅ Program updated successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function handleDeleteProgram(programId) {
    if (!window.confirm('⚠️ Are you sure you want to delete this program? This will delete all terms and lessons inside it!')) return;

    try {
      await callAPI(`/api/programs/${programId}`, 'DELETE');
      loadPrograms();
      if (selectedProgram && selectedProgram.id === programId) {
        setSelectedProgram(null);
        setCurrentPage('programs');
      }
      alert('✅ Program deleted successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  // CRUD functions - Topics
  async function handleCreateTopic(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = { name: formData.get('name') };

    try {
      await callAPI('/api/topics', 'POST', data);
      setShowTopicModal(false);
      e.target.reset();
      loadTopics();
      alert('✅ Topic created successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function handleUpdateTopic(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = { name: formData.get('name') };

    try {
      await callAPI(`/api/topics/${editingTopic.id}`, 'PUT', data);
      setShowTopicModal(false);
      setEditingTopic(null);
      loadTopics();
      alert('✅ Topic updated successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function handleDeleteTopic(topicId) {
    if (!window.confirm('⚠️ Are you sure you want to delete this topic?')) return;

    try {
      await callAPI(`/api/topics/${topicId}`, 'DELETE');
      loadTopics();
      alert('✅ Topic deleted successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  // CRUD functions - Terms
  async function handleCreateTerm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      term_number: parseInt(formData.get('term_number')),
      title: formData.get('title')
    };

    try {
      await callAPI(`/api/programs/${selectedProgram.id}/terms`, 'POST', data);
      setShowTermModal(false);
      e.target.reset();
      loadProgramDetails(selectedProgram.id);
      alert('✅ Term created successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  // CRUD functions - Lessons
  async function handleCreateLesson(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contentLanguagePrimary = formData.get('content_language_primary');
    const contentLanguagesAvailable = [contentLanguagePrimary];

    // Add other selected languages
    ['en', 'te', 'hi', 'ta'].forEach(lang => {
      if (formData.get(`lang_${lang}`) === 'on' && lang !== contentLanguagePrimary) {
        contentLanguagesAvailable.push(lang);
      }
    });

    const data = {
      lesson_number: parseInt(formData.get('lesson_number')),
      title: formData.get('title'),
      content_type: formData.get('content_type'),
      duration_ms: formData.get('duration_ms') ? parseInt(formData.get('duration_ms')) * 1000 : null,
      is_paid: formData.get('is_paid') === 'on',
      content_language_primary: contentLanguagePrimary,
      content_languages_available: contentLanguagesAvailable,
      content_urls_by_language: {
        [contentLanguagePrimary]: formData.get('content_url')
      }
    };

    try {
      await callAPI(`/api/terms/${selectedTermForLesson}/lessons`, 'POST', data);
      setShowLessonModal(false);
      setSelectedTermForLesson(null);
      e.target.reset();
      loadProgramDetails(selectedProgram.id);
      alert('✅ Lesson created successfully!');
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  }

  async function publishLesson(lessonId, action) {
    let publishAt = null;

    if (action === 'schedule') {
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      istNow.setMinutes(istNow.getMinutes() + 2);

      const year = istNow.getFullYear();
      const month = String(istNow.getMonth() + 1).padStart(2, '0');
      const day = String(istNow.getDate()).padStart(2, '0');
      const hours = String(istNow.getHours()).padStart(2, '0');
      const minutes = String(istNow.getMinutes()).padStart(2, '0');
      const defaultTime = `${year}-${month}-${day}T${hours}:${minutes}`;

      const dateStr = prompt(
        `Enter date/time in IST:\nFormat: YYYY-MM-DDTHH:MM\nExample: ${defaultTime}`
      );

      if (!dateStr) return;

      const [datePart, timePart] = dateStr.split('T');
      const [year2, month2, day2] = datePart.split('-');
      const [hour, minute] = timePart.split(':');

      const istDate = new Date(`${year2}-${month2}-${day2}T${hour}:${minute}:00+05:30`);
      publishAt = istDate.toISOString();
    }

    try {
      await callAPI(`/api/lessons/${lessonId}/publish`, 'POST', {
        action,
        publish_at: publishAt
      });
      alert('✅ Success!');
      loadProgramDetails(selectedProgram.id);
    } catch (err) {
      alert('❌ Failed: ' + err.message);
    }
  }

  // Helper functions
  const canEdit = user && (user.role === 'admin' || user.role === 'editor');
  const isAdmin = user && user.role === 'admin';

  function getStatusBadge(status) {
    const styles = {
      published: { background: '#d4edda', color: '#155724', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
      scheduled: { background: '#fff3cd', color: '#856404', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
      draft: { background: '#e2e3e5', color: '#383d41', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
      archived: { background: '#f8d7da', color: '#721c24', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }
    };
    return <span style={styles[status] || styles.draft}>{status}</span>;
  }

  function getRoleBadge(role) {
    const styles = {
      admin: { background: '#e7f3ff', color: '#0066cc', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
      editor: { background: '#fff4e6', color: '#cc7a00', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' },
      viewer: { background: '#f0f0f0', color: '#666', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }
    };
    return <span style={styles[role] || styles.viewer}>{role}</span>;
  }

  // LOGIN/REGISTER PAGE
  if (!user) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.brandTitle}>📚 CMS Platform</h1>
            <p style={styles.brandSubtitle}>Content Management System</p>
          </div>

          <div style={styles.tabContainer}>
            <button
              style={{ ...styles.tab, ...(showLogin ? styles.tabActive : {}) }}
              onClick={() => { setShowLogin(true); setError(''); }}
            >
              Login
            </button>
            <button
              style={{ ...styles.tab, ...(!showLogin ? styles.tabActive : {}) }}
              onClick={() => { setShowLogin(false); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          {showLogin ? (
            <form onSubmit={handleLogin} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <button type="submit" style={styles.primaryButton}>
                Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>

              {error && <div style={styles.errorBox}>{error}</div>}

              <button type="submit" style={styles.primaryButton}>
                Create Account
              </button>
            </form>
          )}

          <div style={styles.demoCredentials}>
            <p style={styles.demoTitle}>Demo Accounts:</p>
            <p style={styles.demoText}>👑 Admin: admin@example.com / admin123</p>
            <p style={styles.demoText}>✏️ Editor: editor@example.com / editor123</p>
            <p style={styles.demoText}>👁️ Viewer: viewer@example.com / viewer123</p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN APP LAYOUT
  return (
    <div style={styles.appContainer}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>📚 CMS</h2>
        </div>

        <nav style={styles.nav}>
          <button
            style={{ ...styles.navButton, ...(currentPage === 'dashboard' ? styles.navButtonActive : {}) }}
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            style={{ ...styles.navButton, ...(currentPage === 'programs' ? styles.navButtonActive : {}) }}
            onClick={() => setCurrentPage('programs')}
          >
            📚 Programs
          </button>
          <button
            style={{ ...styles.navButton, ...(currentPage === 'topics' ? styles.navButtonActive : {}) }}
            onClick={() => setCurrentPage('topics')}
          >
            🏷️ Topics
          </button>
          {isAdmin && (
            <button
              style={{ ...styles.navButton, ...(currentPage === 'users' ? styles.navButtonActive : {}) }}
              onClick={() => setCurrentPage('users')}
            >
              👥 Users
            </button>
          )}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userCard}>
            <div style={styles.userAvatar}>
              {user.full_name ? user.full_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div style={styles.userInfo2}>
              <div style={styles.userName2}>{user.full_name || user.email}</div>
              <div style={styles.userRole2}>{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* DASHBOARD PAGE */}
        {currentPage === 'dashboard' && dashboardStats && (
          <div style={styles.pageContent}>
            <h1 style={styles.pageTitle}>Welcome back, {user.full_name || user.email}!</h1>
            <p style={styles.pageSubtitle}>Here's what's happening with your content today.</p>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📚</div>
                <div>
                  <div style={styles.statValue}>{dashboardStats.total_programs}</div>
                  <div style={styles.statLabel}>Total Programs</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>📖</div>
                <div>
                  <div style={styles.statValue}>{dashboardStats.total_lessons}</div>
                  <div style={styles.statLabel}>Total Lessons</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👥</div>
                <div>
                  <div style={styles.statValue}>{dashboardStats.total_users}</div>
                  <div style={styles.statLabel}>Total Users</div>
                </div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>✅</div>
                <div>
                  <div style={styles.statValue}>{dashboardStats.published_lessons}</div>
                  <div style={styles.statLabel}>Published Lessons</div>
                </div>
              </div>
            </div>

            <div style={styles.activitySection}>
              <h2 style={styles.sectionTitle}>Recent Activity</h2>
              <div style={styles.activityList}>
                {dashboardStats.recent_activity.map(activity => (
                  <div key={activity.id} style={styles.activityItem}>
                    <div>
                      <div style={styles.activityTitle}>{activity.title}</div>
                      <div style={styles.activityTime}>
                        {activity.status === 'published' && `Published ${formatToIST(activity.published_at)}`}
                        {activity.status === 'scheduled' && `Scheduled for ${formatToIST(activity.publish_at)}`}
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROGRAMS PAGE */}
        {currentPage === 'programs' && (
          <div style={styles.pageContent}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>📚 Programs</h1>
                <p style={styles.pageSubtitle}>Manage your learning programs</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingProgram(null);
                    setShowProgramModal(true);
                  }}
                  style={styles.addButton}
                >
                  + Add Program
                </button>
              )}
            </div>

            {loading ? (
              <div style={styles.loadingBox}>Loading...</div>
            ) : (
              <div style={styles.programsGrid}>
                {programs.map(program => (
                  <div key={program.id} style={styles.programCard}>
                    <div onClick={() => loadProgramDetails(program.id)} style={{ cursor: 'pointer' }}>
                      <h3 style={styles.cardTitle}>{program.title}</h3>
                      <p style={styles.cardDescription}>{program.description}</p>
                      <div style={styles.cardFooter}>
                        {getStatusBadge(program.status)}
                        <span style={styles.badge}>🌐 {program.language_primary}</span>
                      </div>
                    </div>
                    {canEdit && (
                      <div style={styles.cardActions}>
                        <button
                          onClick={() => {
                            setEditingProgram(program);
                            setShowProgramModal(true);
                          }}
                          style={styles.editBtn}
                        >
                          ✏️ Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteProgram(program.id)}
                            style={styles.deleteBtn}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && programs.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>📭 No programs found</p>
                {canEdit && <p style={styles.emptySubtext}>Click "+ Add Program" to create your first program</p>}
              </div>
            )}
          </div>
        )}

        {/* TOPICS PAGE */}
        {currentPage === 'topics' && (
          <div style={styles.pageContent}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>🏷️ Topics</h1>
                <p style={styles.pageSubtitle}>Manage content topics and categories</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => {
                    setEditingTopic(null);
                    setShowTopicModal(true);
                  }}
                  style={styles.addButton}
                >
                  + Add Topic
                </button>
              )}
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Created At</th>
                    {canEdit && <th style={styles.th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {topics.map(topic => (
                    <tr key={topic.id} style={styles.tableRow}>
                      <td style={styles.td}>{topic.name}</td>
                      <td style={styles.td}>{formatToIST(topic.created_at)}</td>
                      {canEdit && (
                        <td style={styles.td}>
                          <button
                            onClick={() => {
                              setEditingTopic(topic);
                              setShowTopicModal(true);
                            }}
                            style={styles.tableEditBtn}
                          >
                            ✏️ Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteTopic(topic.id)}
                              style={styles.tableDeleteBtn}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {topics.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>📭 No topics found</p>
                {canEdit && <p style={styles.emptySubtext}>Click "+ Add Topic" to create your first topic</p>}
              </div>
            )}
          </div>
        )}

        {/* USERS PAGE */}
        {currentPage === 'users' && isAdmin && (
          <div style={styles.pageContent}>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.pageTitle}>👥 All Users</h1>
                <p style={styles.pageSubtitle}>View and manage registered users</p>
              </div>
              <button
                onClick={() => setShowUserModal(true)}
                style={styles.addButton}
              >
                + Add User
              </button>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={styles.th}>Full Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Joined</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={styles.tableRow}>
                      <td style={styles.td}>{u.full_name || '-'}</td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>{getRoleBadge(u.role)}</td>
                      <td style={styles.td}>
                        <span style={u.is_active ? styles.activeStatus : styles.inactiveStatus}>
                          {u.is_active ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </td>
                      <td style={styles.td}>{formatToIST(u.created_at)}</td>
                      <td style={styles.td}>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          style={{ ...styles.tableDeleteBtn, opacity: u.id === user.id ? 0.5 : 1 }}
                          disabled={u.id === user.id}
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROGRAM DETAIL PAGE */}
        {currentPage === 'program-detail' && selectedProgram && (
          <div style={styles.pageContent}>
            <button
              onClick={() => {
                setSelectedProgram(null);
                setCurrentPage('programs');
              }}
              style={styles.backButton}
            >
              ← Back to Programs
            </button>

            <div style={styles.programDetailHeader}>
              <div>
                <h1 style={styles.pageTitle}>{selectedProgram.title}</h1>
                <p style={styles.pageSubtitle}>{selectedProgram.description}</p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  {getStatusBadge(selectedProgram.status)}
                  <span style={styles.badge}>🌐 {selectedProgram.language_primary}</span>
                </div>
              </div>
              {canEdit && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setEditingProgram(selectedProgram);
                      setShowProgramModal(true);
                    }}
                    style={styles.editButtonLarge}
                  >
                    ✏️ Edit Program
                  </button>
                  <button
                    onClick={() => setShowTermModal(true)}
                    style={styles.addButton}
                  >
                    + Add Term
                  </button>
                </div>
              )}
            </div>

            {/* Terms and Lessons */}
            {selectedProgram.terms && selectedProgram.terms.length > 0 ? (
              selectedProgram.terms.map(term => (
                <div key={term.id} style={styles.termCard}>
                  <div style={styles.termHeader}>
                    <h2 style={styles.termTitle}>📖 Term {term.term_number}: {term.title || 'Untitled'}</h2>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setSelectedTermForLesson(term.id);
                          setShowLessonModal(true);
                        }}
                        style={styles.addSmallButton}
                      >
                        + Add Lesson
                      </button>
                    )}
                  </div>

                  {term.lessons && term.lessons.length > 0 ? (
                    <div style={styles.lessonsList}>
                      {term.lessons.map(lesson => {
                        const canPublish = canEdit && lesson.status !== 'published';

                        return (
                          <div key={lesson.id} style={styles.lessonCard}>
                            <div>
                              <h3 style={styles.lessonTitle}>
                                #{lesson.lesson_number} {lesson.title}
                              </h3>
                              <div style={styles.lessonMeta}>
                                {getStatusBadge(lesson.status)}
                                <span style={styles.badgeGray}>{lesson.content_type}</span>
                                {lesson.is_paid && <span style={styles.badgePaid}>💰 PAID</span>}
                              </div>

                              {lesson.publish_at && (
                                <p style={styles.infoText}>
                                  ⏰ Scheduled: <strong>{formatToIST(lesson.publish_at)}</strong>
                                </p>
                              )}

                              {lesson.published_at && (
                                <p style={styles.successText}>
                                  ✅ Published: <strong>{formatToIST(lesson.published_at)}</strong>
                                </p>
                              )}

                              {canPublish && (
                                <div style={styles.actionButtons}>
                                  <button
                                    onClick={() => publishLesson(lesson.id, 'publish_now')}
                                    style={styles.btnPublish}
                                  >
                                    ✅ Publish Now
                                  </button>
                                  <button
                                    onClick={() => publishLesson(lesson.id, 'schedule')}
                                    style={styles.btnSchedule}
                                  >
                                    ⏰ Schedule
                                  </button>
                                  <button
                                    onClick={() => publishLesson(lesson.id, 'archive')}
                                    style={styles.btnArchive}
                                  >
                                    📦 Archive
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={styles.emptyLessons}>
                      <p>No lessons yet. Click "+ Add Lesson" to create one.</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>📭 No terms found</p>
                {canEdit && <p style={styles.emptySubtext}>Click "+ Add Term" to create your first term</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS */}

      {/* Program Modal */}
      {showProgramModal && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowProgramModal(false);
          setEditingProgram(null);
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingProgram ? '✏️ Edit Program' : '➕ Create New Program'}</h2>

            <form onSubmit={editingProgram ? handleUpdateProgram : handleCreateProgram}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Program Title *</label>
                <input
                  name="title"
                  type="text"
                  placeholder="e.g., Introduction to Programming"
                  defaultValue={editingProgram?.title || ''}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  name="description"
                  placeholder="Brief description of the program..."
                  defaultValue={editingProgram?.description || ''}
                  rows="3"
                  style={styles.textarea}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Primary Language *</label>
                <select
                  name="language_primary"
                  defaultValue={editingProgram?.language_primary || 'en'}
                  required
                  style={styles.select}
                >
                  <option value="en">English (EN)</option>
                  <option value="te">Telugu (TE)</option>
                  <option value="hi">Hindi (HI)</option>
                  <option value="ta">Tamil (TA)</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Other Available Languages</label>
                <div style={styles.checkboxGroup}>
                  {['en', 'te', 'hi', 'ta'].map(lang => (
                    <label key={lang} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name={`lang_${lang}`}
                        defaultChecked={editingProgram?.languages_available?.includes(lang)}
                        style={styles.checkbox}
                      />
                      <span>{lang.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Topics</label>
                <div style={styles.checkboxGroup}>
                  {topics.length > 0 ? (
                    topics.map(topic => (
                      <label key={topic.id} style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name={`topic_${topic.id}`}
                          defaultChecked={editingProgram?.topics?.some(t => t.id === topic.id)}
                          style={styles.checkbox}
                        />
                        <span>{topic.name}</span>
                      </label>
                    ))
                  ) : (
                    <p style={styles.noTopicsText}>No topics available. Create topics first.</p>
                  )}
                </div>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowProgramModal(false);
                    setEditingProgram(null);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowTopicModal(false);
          setEditingTopic(null);
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>{editingTopic ? '✏️ Edit Topic' : '➕ Create New Topic'}</h2>

            <form onSubmit={editingTopic ? handleUpdateTopic : handleCreateTopic}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Topic Name *</label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g., Mathematics, Science, Programming"
                  defaultValue={editingTopic?.name || ''}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowTopicModal(false);
                    setEditingTopic(null);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingTopic ? 'Update Topic' : 'Create Topic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Term Modal */}
      {showTermModal && (
        <div style={styles.modalOverlay} onClick={() => setShowTermModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>➕ Create New Term</h2>

            <form onSubmit={handleCreateTerm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Term Number *</label>
                <input
                  name="term_number"
                  type="number"
                  min="1"
                  placeholder="e.g., 1, 2, 3..."
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Term Title</label>
                <input
                  name="title"
                  type="text"
                  placeholder="e.g., Introduction, Advanced Topics"
                  style={styles.input}
                />
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowTermModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Create Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowLessonModal(false);
          setSelectedTermForLesson(null);
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>➕ Create New Lesson</h2>

            <form onSubmit={handleCreateLesson}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Lesson Number *</label>
                <input
                  name="lesson_number"
                  type="number"
                  min="1"
                  placeholder="e.g., 1, 2, 3..."
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Lesson Title *</label>
                <input
                  name="title"
                  type="text"
                  placeholder="e.g., Introduction to Variables"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Content Type *</label>
                <select
                  name="content_type"
                  required
                  style={styles.select}
                >
                  <option value="video">Video</option>
                  <option value="article">Article</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Duration (seconds)</label>
                <input
                  name="duration_ms"
                  type="number"
                  min="0"
                  placeholder="e.g., 300 for 5 minutes"
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Content Language *</label>
                <select
                  name="content_language_primary"
                  required
                  style={styles.select}
                >
                  <option value="en">English (EN)</option>
                  <option value="te">Telugu (TE)</option>
                  <option value="hi">Hindi (HI)</option>
                  <option value="ta">Tamil (TA)</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Other Available Languages</label>
                <div style={styles.checkboxGroup}>
                  {['en', 'te', 'hi', 'ta'].map(lang => (
                    <label key={lang} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        name={`lang_${lang}`}
                        style={styles.checkbox}
                      />
                      <span>{lang.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Content URL *</label>
                <input
                  name="content_url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    name="is_paid"
                    style={styles.checkbox}
                  />
                  <span>💰 Paid Content</span>
                </label>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLessonModal(false);
                    setSelectedTermForLesson(null);
                  }}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Create Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div style={styles.modalOverlay} onClick={() => setShowUserModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalTitle}>➕ Add New User</h2>

            <form onSubmit={handleCreateUser}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input
                  name="full_name"
                  type="text"
                  placeholder="John Doe"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Password *</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Role *</label>
                <select name="role" required style={styles.select}>
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles object
const styles = {
  // Login styles
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  loginCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '440px',
    overflow: 'hidden'
  },
  loginHeader: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '40px',
    textAlign: 'center',
    color: 'white'
  },
  brandTitle: {
    margin: 0,
    fontSize: '32px',
    fontWeight: '700'
  },
  brandSubtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    opacity: 0.9
  },
  tabContainer: {
    display: 'flex',
    borderBottom: '1px solid #e0e0e0'
  },
  tab: {
    flex: 1,
    padding: '16px',
    border: 'none',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666'
  },
  tabActive: {
    color: '#667eea',
    borderBottom: '2px solid #667eea',
    fontWeight: '600'
  },
  form: {
    padding: '32px'
  },
  inputGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  errorBox: {
    padding: '12px',
    background: '#fee',
    border: '1px solid #fcc',
    borderRadius: '8px',
    color: '#c33',
    fontSize: '14px',
    marginBottom: '16px'
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  demoCredentials: {
    padding: '24px 32px',
    background: '#f8f9fa',
    borderTop: '1px solid #e0e0e0'
  },
  demoTitle: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase'
  },
  demoText: {
    margin: '6px 0',
    fontSize: '13px',
    color: '#666'
  },

  // Main app layout
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f5f5f5'
  },
  sidebar: {
    width: '260px',
    background: '#1a1a2e',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    height: '100vh',
    overflowY: 'auto'
  },
  sidebarHeader: {
    padding: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  },
  sidebarTitle: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700'
  },
  nav: {
    flex: 1,
    padding: '20px 12px'
  },
  navButton: {
    width: '100%',
    padding: '12px 16px',
    marginBottom: '8px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'left',
    fontSize: '15px',
    fontWeight: '500',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  navButtonActive: {
    background: 'rgba(102, 126, 234, 0.2)',
    color: 'white'
  },
  sidebarFooter: {
    padding: '20px',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },
  userCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#667eea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: '600'
  },
  userInfo2: {
    flex: 1
  },
  userName2: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px'
  },
  userRole2: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'capitalize'
  },
  logoutBtn: {
    width: '100%',
    padding: '10px',
    background: 'rgba(220, 53, 69, 0.2)',
    color: '#ff6b6b',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  mainContent: {
    marginLeft: '260px',
    flex: 1,
    minHeight: '100vh'
  },
  pageContent: {
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px'
  },
  pageSubtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px'
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px'
  },

  // Dashboard stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '40px'
  },
  statCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  statIcon: {
    fontSize: '36px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '4px'
  },
  statLabel: {
    fontSize: '14px',
    color: '#666'
  },

  // Activity
  activitySection: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px'
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  activityItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  activityTitle: {
    fontSize: '15px',
    fontWeight: '600',
    marginBottom: '4px'
  },
  activityTime: {
    fontSize: '13px',
    color: '#666'
  },

  // Programs grid
  programsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px'
  },
  programCard: {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    transition: 'transform 0.2s, boxShadow 0.2s'
  },
  cardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a'
  },
  cardDescription: {
    margin: '0 0 16px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.5'
  },
  cardFooter: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  badge: {
    padding: '4px 12px',
    background: '#e7eef8',
    color: '#667eea',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgeGray: {
    padding: '4px 12px',
    background: '#f5f5f5',
    color: '#666',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  badgePaid: {
    padding: '4px 12px',
    background: '#fff3cd',
    color: '#856404',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #f0f0f0'
  },
  editBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#f0f0ff',
    color: '#667eea',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  deleteBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#fee',
    color: '#c33',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Buttons
  addButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  addSmallButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  editButtonLarge: {
    padding: '12px 24px',
    background: '#f0f0ff',
    color: '#667eea',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  backButton: {
    padding: '10px 20px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginBottom: '24px',
    color: '#666'
  },

  // Table
  tableContainer: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #e0e0e0'
  },
  th: {
    padding: '16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase'
  },
  tableRow: {
    borderBottom: '1px solid #f0f0f0'
  },
  td: {
    padding: '16px',
    fontSize: '14px',
    color: '#333'
  },
  tableEditBtn: {
    padding: '6px 12px',
    background: '#f0f0ff',
    color: '#667eea',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '8px'
  },
  tableDeleteBtn: {
    padding: '6px 12px',
    background: '#fee',
    color: '#c33',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  activeStatus: {
    padding: '4px 12px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },
  inactiveStatus: {
    padding: '4px 12px',
    background: '#f8d7da',
    color: '#721c24',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600'
  },

  // Program detail
  programDetailHeader: {
    background: 'white',
    padding: '32px',
    borderRadius: '12px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  termCard: {
    background: '#f8f9fa',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px'
  },
  termHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  termTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600'
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  lessonCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #e0e0e0'
  },
  lessonTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600'
  },
  lessonMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '12px'
  },
  infoText: {
    margin: '8px 0',
    fontSize: '13px',
    color: '#666'
  },
  successText: {
    margin: '8px 0',
    fontSize: '13px',
    color: '#28a745'
  },
  actionButtons: {
    marginTop: '16px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  btnPublish: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  btnSchedule: {
    padding: '10px 20px',
    background: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  btnArchive: {
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },

  // Empty states
  emptyState: {
    padding: '80px 20px',
    textAlign: 'center'
  },
  emptyText: {
    fontSize: '18px',
    color: '#999',
    marginBottom: '8px'
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#bbb'
  },
  emptyLessons: {
    padding: '40px',
    textAlign: 'center',
    color: '#999',
    background: 'white',
    borderRadius: '8px'
  },

  // Loading
  loadingBox: {
    padding: '60px',
    textAlign: 'center',
    color: '#999',
    fontSize: '16px'
  },

  // Modals
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '600px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  modalTitle: {
    margin: '0 0 24px 0',
    fontSize: '24px',
    fontWeight: '600'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '12px 24px',
    background: '#f5f5f5',
    color: '#666',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px',
    maxHeight: '200px',
    overflowY: 'auto'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer'
  },
  noTopicsText: {
    margin: 0,
    color: '#999',
    fontSize: '14px',
    fontStyle: 'italic'
  }
};

export default App;
