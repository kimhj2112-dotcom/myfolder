import { useEffect, useState } from 'react'
import './App.css'

const navItems = [
  { label: '홈', href: '#home' },
  { label: '캘린더', href: '#calendar' },
  { label: '블로그', href: '#journal' },
  { label: '노트', href: '#notes' },
  { label: '뉴스', href: '#news' },
]

const posts = [
  { date: '28', month: 'SEP', title: '파도 소리를 따라 걷던 오후', meta: '일상 · 3분 읽기' },
  { date: '21', month: 'SEP', title: '요즘의 작은 기쁨을 모아', meta: '기록 · 2분 읽기' },
]

const dots = ['일', '월', '화', '수', '목', '금', '토']

const defaultTasks = [
  { id: 'plan', label: '기획 정리', done: true },
  { id: 'schedule', label: '작업 일정 조율', done: true },
  { id: 'email', label: '이메일 답장', done: false },
  { id: 'review', label: '주간 회고 작성', done: false },
]

const defaultNotes = [
  {
    id: 'welcome-note',
    title: '나의 생각',
    content: '오늘의 작은 목표를 정리해 두면, 하루가 훨씬 정돈됩니다.',
    updatedAt: '2026-10-01T09:00:00.000Z',
  },
]

const defaultEvents = {
  '2026-10-01': [
    { id: 'brainstorm', time: '09:00', title: '브레인스토밍 회의', detail: '마케팅 전략 공유', accent: 'green' },
    { id: 'review', time: '13:30', title: '프로젝트 리뷰', detail: 'UI 개선 사항 정리', accent: 'coral' },
    { id: 'dinner', time: '18:45', title: '저녁 약속', detail: '연희와 스터디 카페', accent: 'green' },
  ],
}

function loadStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : JSON.parse(value)
  } catch (error) {
    console.error(`저장된 ${key} 데이터를 불러오지 못했습니다.`, error)
    return fallback
  }
}

function saveStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`${key} 데이터를 저장하지 못했습니다.`, error)
  }
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const todayKey = dateKey(new Date())
const newsFeedUrl = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko'
const newsApiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(newsFeedUrl)}`
const newsRefreshInterval = 15 * 60 * 1000
const newsPageInterval = 7000

function createCalendarDays(cursor) {
  const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  firstDay.setDate(firstDay.getDate() - firstDay.getDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDay)
    date.setDate(firstDay.getDate() + index)
    return date
  })
}

function createId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatNewsAge(value) {
  const published = new Date(value)
  if (Number.isNaN(published.getTime())) return '최근 기사'
  const minutes = Math.max(0, Math.floor((Date.now() - published.getTime()) / 60000))
  if (minutes < 60) return `${minutes}분 전`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`
  return new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(published)
}

function parseNewsItems(feed) {
  if (feed.status !== 'ok' || !Array.isArray(feed.items)) {
    throw new Error('뉴스 제공처에서 올바른 응답을 받지 못했습니다.')
  }

  const articles = feed.items.flatMap((entry) => {
    let title = String(entry.title ?? '').trim()
    let source = String(entry.author ?? '').trim()
    const separator = title.lastIndexOf(' - ')
    if (separator > 0) {
      if (!source) source = title.slice(separator + 3).trim()
      title = title.slice(0, separator).trim()
    }

    let url
    try {
      url = new URL(entry.link)
    } catch {
      return []
    }
    if (!title || (url.protocol !== 'https:' && url.protocol !== 'http:')) return []

    return [{
      title,
      source: source || 'Google 뉴스',
      published: formatNewsAge(entry.pubDate),
      href: url.href,
    }]
  })

  if (articles.length === 0) {
    throw new Error('표시할 수 있는 뉴스 기사가 없습니다.')
  }
  return articles
}

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

  switch (name) {
    case 'waves':
      return (
        <svg {...common}>
          <path d="M3 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
          <path d="M3 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
          <path d="M3 21c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
        </svg>
      )
    case 'calendar-days':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      )
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )
    case 'list-checks':
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
        </svg>
      )
    case 'book-open-text':
      return (
        <svg {...common}>
          <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H21v15H5.5A2.5 2.5 0 0 0 3 21.5v-15Z" />
          <path d="M7 8h7M7 12h10" />
        </svg>
      )
    case 'notebook-pen':
      return (
        <svg {...common}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
          <path d="M8 7h7M8 11h7M9 16l5-5 3 3-5 5H9v-3Z" />
        </svg>
      )
    case 'newspaper':
      return (
        <svg {...common}>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18a2 2 0 0 1 2 2v11.5A2.5 2.5 0 0 1 17.5 20H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )
    case 'square-pen':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
        </svg>
      )
    case 'trash-2':
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      )
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 2" />
        </svg>
      )
    case 'refresh-cw':
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.7 9A7 7 0 0 1 18.2 6L20 12M4 12l1.8 6A7 7 0 0 0 18.3 15" />
        </svg>
      )
    default:
      return null
  }
}

function App() {
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 9, 1))
  const [calendarView, setCalendarView] = useState('month')
  const [tasks, setTasks] = useState(() => loadStoredValue('pado-tasks', defaultTasks))
  const [taskInput, setTaskInput] = useState('')
  const [events, setEvents] = useState(() => loadStoredValue('pado-events', defaultEvents))
  const [notes, setNotes] = useState(() => loadStoredValue('pado-notes', defaultNotes))
  const [activeNoteId, setActiveNoteId] = useState(() => notes[0]?.id ?? null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [newsItems, setNewsItems] = useState([])
  const [newsPage, setNewsPage] = useState(0)
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsError, setNewsError] = useState('')
  const [newsUpdatedAt, setNewsUpdatedAt] = useState('')
  const [newsPaused, setNewsPaused] = useState(false)
  const [newsReloadKey, setNewsReloadKey] = useState(0)

  const calendarDays = createCalendarDays(selectedDate)
  const selectedWeekStart = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate() - selectedDate.getDay(),
  )
  const visibleDays = calendarView === 'month'
    ? calendarDays
    : calendarDays.filter((date) => date >= selectedWeekStart && date < new Date(
      selectedWeekStart.getFullYear(),
      selectedWeekStart.getMonth(),
      selectedWeekStart.getDate() + 7,
    ))
  const selectedKey = dateKey(selectedDate)
  const selectedEvents = [...(events[selectedKey] ?? [])].sort((first, second) => first.time.localeCompare(second.time))
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? null
  const monthLabel = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(selectedDate)
  const newsPageCount = Math.max(1, Math.ceil(newsItems.length / 5))
  const newsStart = newsPage * 5
  const visibleNews = newsItems.slice(newsStart, newsStart + 5)

  useEffect(() => saveStoredValue('pado-tasks', tasks), [tasks])
  useEffect(() => saveStoredValue('pado-events', events), [events])
  useEffect(() => saveStoredValue('pado-notes', notes), [notes])

  useEffect(() => {
    let isActive = true
    let controller

    async function refreshNews() {
      controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 12000)
      setNewsLoading(true)
      setNewsError('')
      try {
        const response = await fetch(newsApiUrl, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) {
          throw new Error(`뉴스 요청에 실패했습니다. (HTTP ${response.status})`)
        }
        const feed = await response.json()
        const articles = parseNewsItems(feed)
        if (isActive) {
          setNewsItems(articles)
          setNewsPage(0)
          setNewsUpdatedAt(new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date()))
        }
      } catch (error) {
        if (isActive) {
          setNewsError(error.name === 'AbortError'
            ? '뉴스 요청 시간이 초과됐습니다. 다시 시도해 주세요.'
            : error.message || '뉴스를 불러오지 못했습니다.')
        }
      } finally {
        window.clearTimeout(timeout)
        if (isActive) setNewsLoading(false)
      }
    }

    refreshNews()
    const refreshTimer = window.setInterval(refreshNews, newsRefreshInterval)
    return () => {
      isActive = false
      controller?.abort()
      window.clearInterval(refreshTimer)
    }
  }, [newsReloadKey])

  useEffect(() => {
    if (newsPaused || newsPageCount < 2) return undefined
    const timer = window.setInterval(() => {
      setNewsPage((page) => (page + 1) % newsPageCount)
    }, newsPageInterval)
    return () => window.clearInterval(timer)
  }, [newsPaused, newsPageCount])

  function changeCalendarPeriod(direction) {
    const nextDate = new Date(selectedDate)
    if (calendarView === 'month') {
      nextDate.setDate(1)
      nextDate.setMonth(nextDate.getMonth() + direction)
    } else {
      nextDate.setDate(nextDate.getDate() + direction * 7)
    }
    setSelectedDate(nextDate)
  }

  function addTask(event) {
    event.preventDefault()
    const label = taskInput.trim()
    if (!label) return
    setTasks((currentTasks) => [{ id: createId(), label, done: false }, ...currentTasks])
    setTaskInput('')
  }

  function toggleTask(id) {
    setTasks((currentTasks) => currentTasks.map((task) => (
      task.id === id ? { ...task, done: !task.done } : task
    )))
  }

  function addEvent(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const title = String(formData.get('title') ?? '').trim()
    const date = String(formData.get('date') ?? '')
    const time = String(formData.get('time') ?? '')
    const detail = String(formData.get('detail') ?? '').trim() || '나의 일정'
    if (!title || !date || !time) {
      setEventError('일정 이름, 날짜, 시간을 입력해 주세요.')
      return
    }
    const newEvent = { id: createId(), title, time, detail, accent: 'green' }
    setEvents((currentEvents) => ({
      ...currentEvents,
      [date]: [...(currentEvents[date] ?? []), newEvent],
    }))
    const [year, month, day] = date.split('-').map(Number)
    setSelectedDate(new Date(year, month - 1, day))
    setIsAddingEvent(false)
    setEventError('')
  }

  function deleteEvent(id) {
    setEvents((currentEvents) => ({
      ...currentEvents,
      [selectedKey]: currentEvents[selectedKey].filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="파도 홈">
          <span className="brand-mark"><Icon name="waves" /></span>
          <span className="brand-text">
            파도
            <small>MY LITTLE CURRENT</small>
          </span>
        </a>

        <nav className="nav" aria-label="주요 메뉴">
          {navItems.map((item, index) => (
            <a key={item.label} href={item.href} className={index === 0 ? 'active' : ''}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="profile">
          <span className="avatar">현</span>
          <span>김현진</span>
        </div>
      </header>

      <main id="home">
        <section className="hero" aria-label="오늘의 인사">
          <div className="hero-copy">
            <p className="eyebrow">
              {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit' })
                .format(selectedDate).toUpperCase()}
            </p>
            <h1>
              좋은 아침이에요,<br />
              <span>현진님.</span> 오늘은 어떤 하루를 만들까요?
            </h1>
            <p className="hero-sub">마음은 가볍게, 하루의 리듬은 나답게.</p>
          </div>

          <div className="hero-meta" aria-label="서울 날씨">
            <span className="weather-icon"><Icon name="sun" /></span>
            <div className="weather-meta">
              <strong>22°</strong>
              <span>서울 · 맑음</span>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="panel calendar-panel" id="calendar">
            <div className="section-heading">
              <div>
                <h2><Icon name="calendar-days" /> 캘린더 일정</h2>
                <p>날짜를 선택해 일정을 확인하세요</p>
              </div>
              <button className="text-button" type="button" onClick={() => setIsAddingEvent(true)}>
                <Icon name="plus" /> 일정 추가
              </button>
            </div>

            <div className="calendar-head">
              <span className="month-label">{monthLabel}</span>
              <div className="calendar-toolbar">
                <div className="calendar-mode" role="group" aria-label="캘린더 보기">
                  <button type="button" className={`mode-button ${calendarView === 'week' ? 'active' : ''}`} aria-pressed={calendarView === 'week'} onClick={() => setCalendarView('week')}>주</button>
                  <button type="button" className={`mode-button ${calendarView === 'month' ? 'active' : ''}`} aria-pressed={calendarView === 'month'} onClick={() => setCalendarView('month')}>월</button>
                </div>
                <div className="calendar-controls">
                  <button type="button" className="icon-button" aria-label="이전 기간" onClick={() => changeCalendarPeriod(-1)}><Icon name="chevron-left" /></button>
                  <button type="button" className="icon-button" aria-label="다음 기간" onClick={() => changeCalendarPeriod(1)}><Icon name="chevron-right" /></button>
                </div>
              </div>
            </div>

            {calendarView === 'month' && (
              <div className="calendar-weekdays" aria-hidden="true">
                {dots.map((day) => <span key={day}>{day}</span>)}
              </div>
            )}

            <div className={`week ${calendarView === 'month' ? 'month-grid' : ''}`}>
              {visibleDays.map((date) => {
                const key = dateKey(date)
                return (
                  <button
                    key={key}
                    type="button"
                    className={`day ${date.getMonth() !== selectedDate.getMonth() ? 'other-month' : ''} ${key === selectedKey ? 'selected' : ''} ${key === todayKey ? 'today' : ''}`}
                    aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일`}
                    aria-pressed={key === selectedKey}
                    onClick={() => setSelectedDate(date)}
                  >
                    {calendarView === 'week' && <span className="weekday-label">{dots[date.getDay()]}</span>}
                    <strong>{date.getDate()}</strong>
                    {events[key]?.length ? <span className="day-dot" /> : null}
                  </button>
                )
              })}
            </div>

            <div className="agenda">
              {selectedEvents.length ? selectedEvents.map((item) => (
                <div className="agenda-row" key={item.id}>
                  <div className="agenda-time">{item.time}</div>
                  <div className={`event ${item.accent === 'coral' ? 'coral' : ''}`}>
                    <div className="event-copy">
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <button type="button" className="event-delete" aria-label={`${item.title} 일정 삭제`} onClick={() => deleteEvent(item.id)}>
                      <Icon name="trash-2" />
                    </button>
                  </div>
                </div>
              )) : <p className="empty-agenda">선택한 날짜에 일정이 없어요.</p>}
            </div>
          </section>

          <section className="panel task-panel" id="tasks">
            <div className="section-heading">
              <div>
                <h2><Icon name="list-checks" /> 오늘의 할 일 <span className="task-count">{tasks.filter((task) => !task.done).length}</span></h2>
                <p>작은 완료가 하루를 바꿔요</p>
              </div>
            </div>

            <div className="task-list">
              {tasks.map((task) => (
                <label className={`task-item ${task.done ? 'done' : ''}`} key={task.id}>
                  <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
                  <span>{task.label}</span>
                  <em>할 일</em>
                </label>
              ))}
            </div>

            <form className="task-form" onSubmit={addTask}>
              <input type="text" aria-label="새 할 일" placeholder="새로운 할 일을 적어보세요" maxLength={90} value={taskInput} onChange={(event) => setTaskInput(event.target.value)} />
              <button type="submit" className="add-button" aria-label="할 일 추가">
                <Icon name="plus" />
              </button>
            </form>
          </section>
        </div>

        <div className="lower-grid">
          <section className="panel" id="journal">
            <div className="section-heading">
              <div>
                <h2><Icon name="book-open-text" /> 최근 블로그</h2>
                <p>기록해 둔 생각의 조각들</p>
              </div>
              <button className="text-button" type="button" onClick={() => document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth' })}>
                <Icon name="square-pen" /> 글쓰기
              </button>
            </div>

            <div className="post-list">
              {posts.map((post) => (
                <article className="post" key={post.title}>
                  <div className="post-date">
                    <strong>{post.date}</strong>
                    <span>{post.month}</span>
                  </div>
                  <button type="button" className="post-open" onClick={() => window.alert(`${post.title}\n\n블로그 상세 화면은 아직 준비 중입니다.`)}>
                    <p className="post-title">{post.title}</p>
                    <span className="post-meta">{post.meta}</span>
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" id="notes">
            <div className="section-heading">
              <div>
                <h2><Icon name="notebook-pen" /> 나의 노트</h2>
                <p>{notes.length}개의 노트</p>
              </div>
              <div className="note-actions">
                <button className="text-button note-delete" type="button" aria-label="선택한 노트 삭제" disabled={!activeNote} onClick={() => {
                  if (activeNote && window.confirm(`“${activeNote.title || '제목 없는 노트'}” 노트를 삭제할까요?`)) {
                    const remainingNotes = notes.filter((note) => note.id !== activeNote.id)
                    setNotes(remainingNotes)
                    setActiveNoteId(remainingNotes[0]?.id ?? null)
                  }
                }}>
                  <Icon name="trash-2" />
                </button>
                <button className="text-button" type="button" onClick={() => {
                  const note = { id: createId(), title: '새 노트', content: '', updatedAt: new Date().toISOString() }
                  setNotes((currentNotes) => [note, ...currentNotes])
                  setActiveNoteId(note.id)
                }}>
                  <Icon name="plus" /> 새 노트
                </button>
              </div>
            </div>

            <div className="notes-workspace">
              <div className="note-list">
                {notes.map((note) => (
                  <button type="button" className={`note-select ${note.id === activeNoteId ? 'active' : ''}`} key={note.id} onClick={() => setActiveNoteId(note.id)}>
                    <strong>{note.title || '제목 없는 노트'}</strong>
                    <span>{new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(new Date(note.updatedAt))}</span>
                  </button>
                ))}
              </div>

              {activeNote ? (
                <div className="note-content">
                  <input className="note-title" aria-label="노트 제목" maxLength={80} value={activeNote.title} onChange={(event) => {
                    const value = event.target.value
                    setNotes((currentNotes) => currentNotes.map((note) => note.id === activeNoteId ? { ...note, title: value, updatedAt: new Date().toISOString() } : note))
                  }} />
                  <textarea className="note-area" aria-label="노트 내용" value={activeNote.content} onChange={(event) => {
                    const value = event.target.value
                    setNotes((currentNotes) => currentNotes.map((note) => note.id === activeNoteId ? { ...note, content: value, updatedAt: new Date().toISOString() } : note))
                  }} />
                  <div className="note-footer">
                    <span>이 브라우저에 자동 저장돼요</span>
                    <span className="saved-status"><Icon name="check" /> 저장됨</span>
                  </div>
                </div>
              ) : <div className="note-empty">새 노트를 만들어 생각을 따로 기록해 보세요.</div>}
            </div>
          </section>

          <section className="panel" id="news">
            <div className="section-heading">
              <div>
                <h2><Icon name="newspaper" /> 오늘의 뉴스</h2>
                <p role="status" aria-live="polite">
                  {newsLoading
                    ? '한국어 실시간 뉴스를 불러오는 중'
                    : newsError
                      ? `뉴스 연결 실패 · ${newsError}`
                      : `Google 뉴스 · ${newsItems.length}건 · ${newsUpdatedAt} 업데이트`}
                </p>
              </div>
              <button className="text-button news-refresh" type="button" aria-label="뉴스 새로고침" disabled={newsLoading} onClick={() => setNewsReloadKey((key) => key + 1)}>
                <Icon name="refresh-cw" />
              </button>
            </div>

            <div className="news-list">
              {visibleNews.length ? visibleNews.map((item, index) => (
                  <article className="news-item" key={item.href}>
                    <span className="news-number">{String(newsStart + index + 1).padStart(2, '0')}</span>
                    <div className="news-copy">
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="news-headline">{item.title}</a>
                      <span className="news-meta">{item.source} · {item.published}</span>
                    </div>
                  </article>
              )) : (
                <div className="news-empty" role={newsError ? 'alert' : 'status'}>
                  {newsLoading ? 'Google 뉴스 피드를 가져오고 있습니다.' : '뉴스를 표시할 수 없습니다. 새로고침을 눌러 다시 시도해 주세요.'}
                </div>
              )}
            </div>

            <div className="news-controls">
              <div className="news-control-group">
                <button type="button" className="news-control" aria-label="이전 뉴스" disabled={newsPageCount < 2} onClick={() => setNewsPage((page) => (page - 1 + newsPageCount) % newsPageCount)}><Icon name="chevron-left" /></button>
                <button type="button" className="news-control" aria-label={newsPaused ? '자동 넘김 재개' : '자동 넘김 일시정지'} disabled={newsPageCount < 2} onClick={() => setNewsPaused((paused) => !paused)}>{newsPaused ? '▶' : 'Ⅱ'}</button>
                <button type="button" className="news-control" aria-label="다음 뉴스" disabled={newsPageCount < 2} onClick={() => setNewsPage((page) => (page + 1) % newsPageCount)}><Icon name="chevron-right" /></button>
              </div>
              <span className="news-counter">
                {newsItems.length ? `${String(newsStart + 1).padStart(2, '0')}-${String(newsStart + visibleNews.length).padStart(2, '0')} / ${String(newsItems.length).padStart(2, '0')}` : '00 / 00'}
                {newsPaused ? ' · 일시 정지' : ''}
              </span>
            </div>
          </section>
        </div>

        <section className="connect-row" aria-label="Google 서비스 연결">
          <span className="google-mark">G</span>
          <div className="connect-copy">
            <strong>Google 캘린더 일정 공유</strong>
            <span>연결하면 저장된 일정과 새 일정을 기본 캘린더로 보냅니다.</span>
          </div>
          <button type="button" className="connect-button" onClick={() => window.alert('Google 캘린더 연동은 OAuth 설정 후 사용할 수 있어요.')}>연결 설정</button>
        </section>
      </main>

      <footer className="footer">
        <span>나만의 속도로, 오늘의 파도를 타요.</span>
        <span>MADE FOR YOUR EVERYDAY</span>
      </footer>

      {isAddingEvent && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsAddingEvent(false)
        }}>
          <form className="event-form" role="dialog" aria-modal="true" aria-labelledby="event-title" onSubmit={addEvent}>
            <h2 id="event-title">새 일정</h2>
            <label>일정 이름<input name="title" maxLength={80} required autoFocus /></label>
            <div className="event-fields">
              <label>날짜<input name="date" type="date" defaultValue={selectedKey} required /></label>
              <label>시간<input name="time" type="time" defaultValue="15:00" required /></label>
            </div>
            <label>메모<input name="detail" maxLength={120} placeholder="일정에 대한 메모" /></label>
            {eventError && <p className="form-error" role="alert">{eventError}</p>}
            <div className="dialog-actions">
              <button type="button" className="cancel-button" onClick={() => setIsAddingEvent(false)}>취소</button>
              <button type="submit" className="connect-button">일정 저장</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
