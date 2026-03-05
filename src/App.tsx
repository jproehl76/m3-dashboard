import { useState, useEffect } from 'react';
import {
  LogOut,
  LayoutDashboard,
  Map as MapIcon,
  Activity,
  BarChart2,
  Heart,
  Timer,
  TrendingUp,
  Table2,
  Thermometer,
  Target,
} from 'lucide-react';
import { LoginScreen } from '@/components/LoginScreen';
import { Toaster, toast } from 'sonner';
import { DropZone } from '@/components/DropZone';
import { SessionList } from '@/components/SessionList';
import { SessionStats } from '@/components/SessionStats';
import { LapTimesChart } from '@/components/charts/LapTimesChart';
import { CornerSpeedChart } from '@/components/charts/CornerSpeedChart';
import { ThermalChart } from '@/components/charts/ThermalChart';
import { FrictionCircleChart } from '@/components/charts/FrictionCircleChart';
import { CornerDetailTable } from '@/components/charts/CornerDetailTable';
import { TrackMapChart } from '@/components/charts/TrackMapChart';
import { TraceChart } from '@/components/charts/TraceChart';
import { LapDeltaChart } from '@/components/charts/LapDeltaChart';
import { FrictionScatterChart } from '@/components/charts/FrictionScatterChart';
import { DebriefNotes } from '@/components/DebriefNotes';
import { CoachingInsights } from '@/components/CoachingInsights';
import { DrivePickerButton } from '@/components/DrivePickerButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WhoopPanel } from '@/components/WhoopPanel';
import { ReadinessTab } from '@/components/ReadinessTab';
import { InstallPrompt } from '@/components/InstallPrompt';
import { handleWhoopCallback } from '@/lib/services/whoopAuth';
import { usePersistedSessions } from '@/lib/usePersistedSessions';
import { sessionLabel, formatLapTime } from '@/lib/utils';
import { useMemory } from '@/hooks/useMemory';
import React from 'react';
import trackPhoto from '@/assets/m3-track.jpg';
import bmwMLogo from '@/assets/bmw-m-logo.jpg';

const AUTH_KEY = 'm3-auth-user';

interface AuthUser {
  email: string;
  name: string;
  picture: string;
}

interface TabDef {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const MOBILE_TABS: TabDef[] = [
  { id: 'overview',  label: 'Home',     Icon: LayoutDashboard },
  { id: 'trackmap',  label: 'Map',      Icon: MapIcon },
  { id: 'traces',    label: 'Traces',   Icon: Activity },
  { id: 'analysis',  label: 'Analysis', Icon: BarChart2 },
  { id: 'readiness', label: 'Body',     Icon: Heart },
];

const ALL_TABS: TabDef[] = [
  { id: 'overview',      label: 'Overview',    Icon: LayoutDashboard },
  { id: 'trackmap',      label: 'Track Map',   Icon: MapIcon },
  { id: 'laptimes',      label: 'Lap Times',   Icon: Timer },
  { id: 'corners',       label: 'Corners',     Icon: TrendingUp },
  { id: 'corner-detail', label: 'Detail',      Icon: Table2 },
  { id: 'traces',        label: 'Traces',      Icon: Activity },
  { id: 'lap-delta',     label: 'Delta',       Icon: BarChart2 },
  { id: 'thermals',      label: 'Thermals',    Icon: Thermometer },
  { id: 'development',   label: 'Development', Icon: Target },
  { id: 'readiness',     label: 'Readiness',   Icon: Heart },
];

export default function App() {
  const store = usePersistedSessions();
  const { memory, loaded, update } = useMemory();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [whoopConnected, setWhoopConnected] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  // Restore active tab from memory on mount
  useEffect(() => {
    if (loaded) {
      setActiveTab(memory.lastActiveTab || 'overview');
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist active tab to memory on change
  useEffect(() => {
    if (loaded) {
      update({ lastActiveTab: activeTab });
    }
  }, [activeTab, loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // When active sessions change, add to track history
  useEffect(() => {
    if (!loaded) return;
    const newEntries = store.activeSessions.map(s => ({
      sessionId: s.id,
      track: s.data.header.track,
      date: s.data.header.date,
      bestLap: formatLapTime(s.data.consistency.best_lap_s),
      lapCount: s.data.header.analyzed_laps,
    }));
    if (newEntries.length > 0) {
      update({
        trackHistory: [
          ...memory.trackHistory.filter(h => !newEntries.find(e => e.sessionId === h.sessionId)),
          ...newEntries,
        ].slice(-20),
      });
    }
  }, [store.activeSessions.map(s => s.id).join(','), loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle WHOOP OAuth callback — must run before the login check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code && state) {
      window.history.replaceState({}, '', window.location.pathname);
      handleWhoopCallback(code, state).then((ok) => {
        if (ok) {
          setWhoopConnected(true);
          toast.success('WHOOP connected successfully');
        } else {
          toast.error('WHOOP connection failed — check console for details');
        }
      }).catch(() => {
        toast.error('WHOOP connection failed');
      });
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  }, [user]);

  if (!user) {
    return <LoginScreen onAuth={setUser} />;
  }

  const signOut = () => setUser(null);

  // Derive best lap info for header center display
  const bestLapSession = store.activeSessions.length > 0
    ? store.activeSessions.reduce((best, s) =>
        s.data.consistency.best_lap_s < best.data.consistency.best_lap_s ? s : best
      )
    : null;
  const bestLapDisplay = bestLapSession ? formatLapTime(bestLapSession.data.consistency.best_lap_s) : null;
  const spreadDisplay = bestLapSession ? `${bestLapSession.data.consistency.spread_s.toFixed(1)}s spread` : null;

  return (
    <div className="relative z-10 flex flex-col h-screen overflow-hidden">
      <Toaster position="bottom-right" richColors />

      {/* Full-viewport atmospheric background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={trackPhoto}
          alt="" aria-hidden="true"
          className="w-full h-full object-cover object-center"
          style={{ opacity: 0.12 }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(15,15,20,0.75) 0%, rgba(15,15,20,0.55) 30%, rgba(15,15,20,0.85) 70%, rgba(15,15,20,0.97) 100%)'
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%)'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-20 h-14 flex items-center px-4 border-b border-[#2E2E3C] shrink-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(36,36,48,0.95), rgba(26,26,34,0.90))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>

        {/* Left: logo + title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img
            src={bmwMLogo}
            alt="BMW M"
            className="h-8 w-8 object-contain flex-shrink-0"
            style={{ mixBlendMode: 'screen', filter: 'brightness(1.2)' }}
          />
          <div className="min-w-0">
            <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '16px', fontWeight: 700, letterSpacing: '0.06em', color: '#E8E8F0', lineHeight: 1.1 }}>
              M3 Session Dashboard
            </h1>
            <p style={{ fontFamily: 'Rajdhani', fontSize: '11px', color: '#606070', lineHeight: 1 }}>
              2025 BMW G80 M3 Competition xDrive
            </p>
          </div>
        </div>

        {/* Center: best lap (lg+) */}
        {bestLapDisplay && (
          <div className="hidden lg:flex flex-col items-center flex-shrink-0 px-4">
            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '18px', fontWeight: 600, color: '#A855F7', lineHeight: 1 }}>
              {bestLapDisplay}
            </span>
            <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', color: '#606070', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {spreadDisplay}
            </span>
          </div>
        )}

        {/* Right: sidebar toggle + avatar + logout */}
        <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="hidden xl:block text-xs px-2 py-1 rounded border transition-colors"
            style={{
              fontFamily: 'Rajdhani',
              letterSpacing: '0.05em',
              color: '#606070',
              borderColor: '#2E2E3C',
              background: 'rgba(26,26,34,0.5)',
            }}
          >
            {sidebarOpen ? 'Hide' : 'Show'} sidebar
          </button>
          {user.picture && (
            <img src={user.picture} alt={user.name} className="h-7 w-7 rounded-full ring-1 ring-[#2E2E3C]" />
          )}
          <button onClick={signOut} style={{ color: '#606070' }} className="hover:text-red-400 transition-colors" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="relative z-10 flex flex-1 min-h-0">

        {/* Desktop sidebar */}
        {sidebarOpen && (
          <aside className="hidden xl:flex w-64 shrink-0 border-r border-[#2E2E3C] flex-col gap-3 p-3 overflow-y-auto scroll-touch relative"
            style={{ background: 'rgba(15,15,20,0.92)', backdropFilter: 'blur(8px)' }}>
            <DropZone onSessionLoaded={store.addSession} />
            <DrivePickerButton onSessionLoaded={store.addSession} />
            {store.sessions.length > 0 && (
              <button
                onClick={store.clearSavedSessions}
                className="text-xs self-start transition-colors"
                style={{ fontFamily: 'Rajdhani', color: '#606070' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = '#606070')}
              >
                Clear saved sessions
              </button>
            )}
            <SessionList
              sessions={store.sessions}
              activeIds={store.activeSessionIds}
              onToggle={store.toggleActive}
              onRemove={store.removeSession}
              onRename={store.renameSession}
              onClearAll={store.clearAll}
            />
            {store.sessions.length === 0 && (
              <div className="space-y-1" style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#606070' }}>
                <p className="font-medium" style={{ color: '#9898A8' }}>Getting started</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Export CSV from RaceChrono</li>
                  <li>Run preprocessor → <span style={{ fontFamily: 'JetBrains Mono', color: '#9898A8' }}>_summary.json</span></li>
                  <li>Drop the JSON file here</li>
                  <li>Load multiple sessions to compare</li>
                </ol>
              </div>
            )}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scroll-touch p-3 md:p-4 pb-[calc(80px+env(safe-area-inset-bottom))] xl:pb-4">
          {store.activeSessions.length === 0 ? (
            <EmptyDashboard />
          ) : (
            <div className="space-y-0">
              {/* Desktop tab strip */}
              <div className="hidden xl:flex items-center gap-1 px-1 py-2 border-b border-[#2E2E3C] overflow-x-auto mb-4">
                {ALL_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-all duration-150"
                    style={{
                      fontFamily: 'Rajdhani', letterSpacing: '0.05em',
                      background: activeTab === tab.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                      color: activeTab === tab.id ? '#3B82F6' : '#606070',
                      borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
                    }}>
                    <tab.Icon size={14} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <ErrorBoundary>
                    <Section title="Session Summary">
                      <SessionStats sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Section title="WHOOP Recovery">
                      <WhoopPanel sessionDates={store.activeSessions.map(s => s.data.header.date)} connectedOverride={whoopConnected} />
                    </Section>
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Section title="Lap Time Progression">
                      <LapTimesChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Section title="Coaching Insights">
                      <CoachingInsights sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Section title="Debrief Notes">
                      {store.activeSessions.map(session => (
                        <div key={session.id} className="space-y-1">
                          {store.activeSessions.length > 1 && (
                            <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#606070', fontWeight: 500 }}>{sessionLabel(session)}</p>
                          )}
                          <DebriefNotes sessionId={session.id} />
                        </div>
                      ))}
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'trackmap' && (
                <div>
                  <ErrorBoundary>
                    <Section title="GPS Track Map">
                      <TrackMapChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'laptimes' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Lap Time Progression">
                      <LapTimesChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'corners' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Corner Speed Comparison">
                      <CornerSpeedChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'corner-detail' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Corner Detail">
                      <CornerDetailTable sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'traces' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Throttle &amp; Brake Trace">
                      <TraceChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'analysis' && (
                <div className="space-y-4">
                  <ErrorBoundary>
                    <Section title="Lap Delta by Corner">
                      <LapDeltaChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'lap-delta' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Lap Delta by Corner">
                      <LapDeltaChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'thermals' && (
                <div>
                  <ErrorBoundary>
                    <Section title="Thermal Trends">
                      <ThermalChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'development' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ErrorBoundary>
                    <Section title="Friction Circle">
                      <FrictionScatterChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Section title="Driver Development Radar">
                      <FrictionCircleChart sessions={store.activeSessions} />
                    </Section>
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'readiness' && (
                <ErrorBoundary>
                  <Section title="Driver Readiness">
                    <ReadinessTab
                      sessionDates={store.activeSessions.map(s => s.data.header.date)}
                      connectedOverride={whoopConnected}
                    />
                  </Section>
                </ErrorBoundary>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 xl:hidden flex items-center justify-around h-16 border-t border-[#2E2E3C]"
        style={{
          background: 'rgba(26,26,34,0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
            style={{
              color: activeTab === tab.id ? '#3B82F6' : '#606070',
              borderTop: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent',
            }}
          >
            <tab.Icon size={20} strokeWidth={activeTab === tab.id ? 2 : 1.5} />
            <span style={{ fontFamily: 'Rajdhani', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <InstallPrompt />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2E2E3C]">
        <div className="w-1 h-4 rounded-full bg-[#3B82F6]" />
        <h2 style={{ fontFamily: 'Rajdhani', fontSize: '14px', fontWeight: 600, letterSpacing: '0.05em', color: '#E8E8F0' }}>{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div style={{ opacity: 0.15 }}>
        <img src={bmwMLogo} alt="" className="w-16 h-16" style={{ filter: 'brightness(10)', mixBlendMode: 'screen' }} />
      </div>
      <div>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '16px', fontWeight: 600, letterSpacing: '0.05em', color: '#606070' }}>No session loaded</p>
        <p style={{ fontFamily: 'Rajdhani', fontSize: '12px', color: '#38384A', marginTop: 4 }}>Drop a RaceChrono CSV file or load from Drive</p>
      </div>
    </div>
  );
}
