import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Simple fetch wrapper
const api = {
  async call(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
    
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('login');
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Check if logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.call('/api/auth/me')
        .then(data => {
          setUser(data);
          setPage('programs');
        })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Login
  const login = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    
    try {
      const data = await api.call('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      localStorage.setItem('token', data.access_token);
      const userData = await api.call('/api/auth/me');
      setUser(userData);
      setPage('programs');
      loadPrograms();
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('login');
  };

  // Load programs
  const loadPrograms = async () => {
    try {
      const data = await api.call('/api/programs');
      setPrograms(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load program details
  const loadProgramDetails = async (programId) => {
    try {
      const program = await api.call(`/api/programs/${programId}`);
      const terms = await api.call(`/api/programs/${programId}/terms`);
      
      const lessonsPromises = terms.map(term => 
        api.call(`/api/terms/${term.id}/lessons`)
      );
      const lessonsArrays = await Promise.all(lessonsPromises);
      
      const termsWithLessons = terms.map((term, i) => ({
        ...term,
        lessons: lessonsArrays[i]
      }));
      
      setSelectedProgram({ ...program, terms: termsWithLessons });
      setPage('program-detail');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Load lesson details
  const loadLessonDetails = async (lessonId) => {
    try {
      const lesson = await api.call(`/api/lessons/${lessonId}`);
      setSelectedLesson(lesson);
      setPage('lesson-detail');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // Publish lesson
  const publishLesson = async (action, publishAt = null) => {
    try {
      const data = { action };
      if (action === 'schedule') {
        data.publish_at = publishAt;
      }
      
      await api.call(`/api/lessons/${selectedLesson.id}/publish`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      alert('Success!');
      loadLessonDetails(selectedLesson.id);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    if (user && page === 'programs') {
      loadPrograms();
    }
  }, [user, page]);

  if (loading) return <div style={styles.container}>Loading...</div>;

  // LOGIN PAGE
  if (page === 'login') {
    return (
      <div style={styles.container}>
        <div style={styles.loginBox}>
          <h1>CMS Login</h1>
          <form onSubmit={login}>
            <input name="email" type="email" placeholder="Email" required style={styles.input} />
            <input name="password" type="password" placeholder="Password" required style={styles.input} />
            <button type="submit" style={styles.button}>Login</button>
          </form>
          <div style={styles.demoBox}>
            <p><strong>Demo Credentials:</strong></p>
            <p>Admin: admin@example.com / admin123</p>
            <p>Editor: editor@example.com / editor123</p>
            <p>Viewer: viewer@example.com / viewer123</p>
          </div>
        </div>
      </div>
    );
  }

  // PROGRAMS LIST
  if (page === 'programs') {
    return (
      <div>
        <nav style={styles.nav}>
          <h2>CMS Admin</h2>
          <div>
            <span>{user.email} ({user.role})</span>
            <button onClick={logout} style={styles.navButton}>Logout</button>
          </div>
        </nav>
        <div style={styles.content}>
          <h1>Programs</h1>
          <div style={styles.grid}>
            {programs.map(program => (
              <div key={program.id} style={styles.card} onClick={() => loadProgramDetails(program.id)}>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
                <div style={styles.meta}>
                  <span style={styles.badge}>{program.status}</span>
                  <span style={styles.badge}>{program.language_primary}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // PROGRAM DETAIL
  if (page === 'program-detail' && selectedProgram) {
    return (
      <div>
        <nav style={styles.nav}>
          <h2>CMS Admin</h2>
          <div>
            <button onClick={() => setPage('programs')} style={styles.navButton}>Back</button>
            <button onClick={logout} style={styles.navButton}>Logout</button>
          </div>
        </nav>
        <div style={styles.content}>
          <h1>{selectedProgram.title}</h1>
          <p>{selectedProgram.description}</p>
          <div style={styles.meta}>
            <span style={styles.badge}>{selectedProgram.status}</span>
            <span style={styles.badge}>Primary: {selectedProgram.language_primary}</span>
          </div>

          {selectedProgram.terms.map(term => (
            <div key={term.id} style={styles.termBlock}>
              <h2>Term {term.term_number}: {term.title}</h2>
              <div style={styles.lessonsList}>
                {term.lessons.map(lesson => (
                  <div key={lesson.id} style={styles.lessonCard} onClick={() => loadLessonDetails(lesson.id)}>
                    <h4>#{lesson.lesson_number} - {lesson.title}</h4>
                    <div style={styles.meta}>
                      <span style={styles.badge}>{lesson.status}</span>
                      <span style={styles.badge}>{lesson.content_type}</span>
                      {lesson.is_paid && <span style={styles.badgePaid}>PAID</span>}
                    </div>
                    {lesson.publish_at && (
                      <p style={styles.small}>Scheduled: {new Date(lesson.publish_at).toLocaleString()}</p>
                    )}
                    {lesson.published_at && (
                      <p style={styles.small}>Published: {new Date(lesson.published_at).toLocaleString()}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // LESSON DETAIL
  if (page === 'lesson-detail' && selectedLesson) {
    const canEdit = user.role === 'admin' || user.role === 'editor';
    
    return (
      <div>
        <nav style={styles.nav}>
          <h2>CMS Admin</h2>
          <div>
            <button onClick={() => {
              setPage('program-detail');
              setSelectedLesson(null);
            }} style={styles.navButton}>Back</button>
            <button onClick={logout} style={styles.navButton}>Logout</button>
          </div>
        </nav>
        <div style={styles.content}>
          <h1>{selectedLesson.title}</h1>
          <div style={styles.meta}>
            <span style={styles.badge}>{selectedLesson.status}</span>
            <span style={styles.badge}>{selectedLesson.content_type}</span>
            {selectedLesson.duration_ms && (
              <span style={styles.badge}>{Math.floor(selectedLesson.duration_ms / 60000)} min</span>
            )}
            {selectedLesson.is_paid && <span style={styles.badgePaid}>PAID</span>}
          </div>

          {selectedLesson.publish_at && (
            <p><strong>Scheduled for:</strong> {new Date(selectedLesson.publish_at).toLocaleString()}</p>
          )}
          {selectedLesson.published_at && (
            <p><strong>Published at:</strong> {new Date(selectedLesson.published_at).toLocaleString()}</p>
          )}

          <div style={styles.section}>
            <h3>Content URLs</h3>
            {Object.entries(selectedLesson.content_urls_by_language).map(([lang, url]) => (
              <p key={lang}><strong>{lang}:</strong> <a href={url} target="_blank" rel="noopener noreferrer">{url}</a></p>
            ))}
          </div>

          {selectedLesson.subtitle_languages.length > 0 && (
            <div style={styles.section}>
              <h3>Subtitles</h3>
              <p>Languages: {selectedLesson.subtitle_languages.join(', ')}</p>
            </div>
          )}

          {canEdit && selectedLesson.status !== 'published' && (
            <div style={styles.section}>
              <h3>Publishing Actions</h3>
              <button onClick={() => publishLesson('publish_now')} style={styles.buttonGreen}>
                Publish Now
              </button>
              <button onClick={() => {
                const date = prompt('Enter date/time (YYYY-MM-DDTHH:MM):');
                if (date) publishLesson('schedule', new Date(date).toISOString());
              }} style={styles.buttonYellow}>
                Schedule
              </button>
              <button onClick={() => publishLesson('archive')} style={styles.buttonRed}>
                Archive
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// Inline styles
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
  },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  buttonGreen: {
    padding: '10px 20px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
    marginBottom: '10px',
  },
  buttonYellow: {
    padding: '10px 20px',
    background: '#ffc107',
    color: '#333',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
    marginBottom: '10px',
  },
  buttonRed: {
    padding: '10px 20px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginBottom: '10px',
  },
  demoBox: {
    marginTop: '30px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '5px',
    fontSize: '13px',
  },
  nav: {
    background: 'white',
    padding: '15px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  navButton: {
    padding: '8px 16px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginLeft: '10px',
  },
  content: {
    padding: '30px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '20px',
  },
  card: {
    background: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  meta: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
    flexWrap: 'wrap',
  },
  badge: {
    padding: '4px 12px',
    background: '#e7eef8',
    color: '#667eea',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  badgePaid: {
    padding: '4px 12px',
    background: '#ffd700',
    color: '#333',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  termBlock: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
  },
  lessonsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '15px',
  },
  lessonCard: {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '1px solid #e0e0e0',
  },
  section: {
    marginTop: '30px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  small: {
    fontSize: '13px',
    color: '#666',
    margin: '5px 0',
  },
};

export default App;
