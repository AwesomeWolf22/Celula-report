import React, { useState, useEffect } from 'react';
import { Users, Home, FileText, Settings, Search, ArrowLeft, Image as ImageIcon, ChevronDown, Edit2, Plus, Calendar, CheckSquare, LogOut, User as UserIcon, AlertCircle, Globe, Trash2 } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ProfileEditor } from './components/ProfileEditor';
import { doc, setDoc, deleteDoc, collection, collectionGroup, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { AnimatePresence, motion } from 'motion/react';

export interface PastorNetwork {
  id: string;
  nome: string;
  pastor: string;
  createdAt: string;
}

export interface DisciplerNetwork {
  id: string;
  nome: string;
  discipulador: string;
  pastorNetworkId: string;
  createdAt: string;
}

export interface Cell {
  id: string;
  rede: string; // Will now store disciplerNetworkId or legacy text
  nome: string;

  dataMultiplicacao: string;
  lider: string;
  anfitriao: string;
  liderTreinamento: string;
  diaHorario: string;
  local: string;
  logo: string;
}

export interface Member {
  id: string;
  cellId: string;
  nome: string;
  dataNascimento: string;
  endereco: string;
  tipoMembro: string;
  funcao: string;
  batizado: boolean;
  ceifeiros: boolean;
  maturidade: boolean;
  ctl: boolean;
  encontro: boolean;
  observacao: string;
  foto: string;
  createdAt?: string; // ISO string
}

export type EventType = 'CELULA' | 'SABADO' | 'DOMINGO' | 'EVENTO';

export interface Meeting {
  id: string;
  cellId: string;
  type: EventType;
  name?: string; // For custom events
  date: string;
  time: string;
  photo: string;
  attendance: {
    memberId: string;
    status: 'P' | 'F';
    justification: string;
  }[];
}

// Helper for consistent date formatting
const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function MainApp() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [cells, setCells] = useState<Cell[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [pastorNetworks, setPastorNetworks] = useState<PastorNetwork[]>([]);
  const [disciplerNetworks, setDisciplerNetworks] = useState<DisciplerNetwork[]>([]);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);

  // Profile data for secondary registration (if Google user)
  const [onboardingData, setOnboardingData] = useState({
    name: '',
    birthday: '',
    role: '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) {
      setCells([]);
      setMembers([]);
      setMeetings([]);
      setPastorNetworks([]);
      setDisciplerNetworks([]);
      return;
    }

    const unsubCells = onSnapshot(collection(db, "cells"), (snap) => {
      setCells(snap.docs.map(doc => doc.data() as Cell));
    });

    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      setMembers(snap.docs.map(doc => doc.data() as Member));
    });

    const unsubMeetings = onSnapshot(collection(db, "meetings"), (snap) => {
      setMeetings(snap.docs.map(doc => doc.data() as Meeting));
    });

    const unsubPastors = onSnapshot(collection(db, "pastorNetworks"), (snap) => {
      setPastorNetworks(snap.docs.map(doc => doc.data() as PastorNetwork));
    });

    const unsubDisciplers = onSnapshot(collection(db, "disciplerNetworks"), (snap) => {
      setDisciplerNetworks(snap.docs.map(doc => doc.data() as DisciplerNetwork));
    });

    return () => {
      unsubCells();
      unsubMembers();
      unsubMeetings();
      unsubPastors();
      unsubDisciplers();
    };
  }, [user]);

  // If user exists but no profile, they need to complete it
  useEffect(() => {
    if (user && !profile && !loading) {
      setIsCompletingProfile(true);
      setOnboardingData({
        name: user.displayName || '',
        birthday: '',
        role: '',
        phoneNumber: ''
      });
    } else {
      setIsCompletingProfile(false);
    }
  }, [user, profile, loading]);

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: onboardingData.name,
        email: user.email,
        birthday: onboardingData.birthday,
        role: onboardingData.role,
        phoneNumber: onboardingData.phoneNumber,
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      await refreshProfile();
    } catch (error) {
      console.error("Error completing profile:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {authMode === 'login' ? (
            <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Login onRegisterClick={() => setAuthMode('register')} />
            </motion.div>
          ) : (
            <motion.div key="register" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <Register onLoginClick={() => setAuthMode('login')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (isCompletingProfile) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl border border-zinc-100 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Quase lá!</h2>
          <p className="text-zinc-500 mb-8">Complete seu perfil para continuar</p>
          
          <form onSubmit={handleCompleteProfile} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nome</label>
              <input 
                type="text" 
                value={onboardingData.name} 
                onChange={e => setOnboardingData({...onboardingData, name: e.target.value})}
                required
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nascimento</label>
              <input 
                type="date" 
                value={onboardingData.birthday} 
                onChange={e => setOnboardingData({...onboardingData, birthday: e.target.value})}
                required
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Função</label>
              <select 
                value={onboardingData.role} 
                onChange={e => setOnboardingData({...onboardingData, role: e.target.value})}
                required
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
              >
                <option value="">Selecione...</option>
                <option value="Lider">Líder</option>
                <option value="Treinador">Treinador</option>
                <option value="Discipulador">Discipulador</option>
                <option value="Membro">Membro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Celular</label>
              <input 
                type="tel" 
                value={onboardingData.phoneNumber} 
                onChange={e => setOnboardingData({...onboardingData, phoneNumber: e.target.value})}
                required
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl outline-none"
              />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg mt-4">
              Começar a usar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">CélulaReport</span>
            </div>

            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'home' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <Home className="w-4 h-4" /> Home
              </button>
              <button 
                onClick={() => setActiveTab('reports')} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <FileText className="w-4 h-4" /> Relatórios
              </button>
              <button 
                onClick={() => setActiveTab('settings')} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <Settings className="w-4 h-4" /> Configurações
              </button>
              <button 
                onClick={() => setActiveTab('directory')} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'directory' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
              >
                <Globe className="w-4 h-4" /> Diretório
              </button>
            </nav>

            <div className="flex items-center gap-3">
              {!user.emailVerified && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-100 dark:border-amber-900/30">
                  <AlertCircle className="w-3 h-3" />
                  E-mail não verificado
                </div>
              )}
              <button 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-3 text-left p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Meu Perfil"
              >
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold leading-none">{profile?.name || user.displayName || 'Usuário'}</span>
                  <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mt-1 tracking-wider">{profile?.role || 'Visitante'}</span>
                </div>
                {profile?.photoURL || user.photoURL ? (
                  <img
                    src={profile?.photoURL || user.photoURL || ''}
                    alt="Foto de perfil"
                    className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Menus de Navegação (Mobile - Bottom Bar) */}
      <div className="md:hidden fixed bottom-1 left-0 right-0 p-4 z-40">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-2xl flex justify-around overflow-hidden">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center py-3 px-4 flex-1 ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center py-3 px-2 sm:px-4 flex-1 ${activeTab === 'reports' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <FileText className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Relatórios</span>
          </button>
          <button onClick={() => setActiveTab('directory')} className={`flex flex-col items-center py-3 px-2 sm:px-4 flex-1 ${activeTab === 'directory' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <Globe className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Diretório</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center py-3 px-2 sm:px-4 flex-1 ${activeTab === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <Settings className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Ajustes</span>
          </button>
          <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center py-3 px-4 flex-1 ${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
            <UserIcon className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-bold">Perfil</span>
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-24 md:mb-0">
        {activeTab === 'home' && <HomeView cells={cells} />}
        {activeTab === 'reports' && <ReportsView 
          cells={cells} 
          members={members}
          meetings={meetings}
          pastorNetworks={pastorNetworks}
          disciplerNetworks={disciplerNetworks}
          onAddCell={(cell) => {
            if (!user) return;
            setDoc(doc(db, "cells", cell.id), cell);
            if (profile) {
              const leaderAsMember: Member = {
                id: `leader-${Date.now()}`,
                cellId: cell.id,
                nome: profile.name,
                dataNascimento: profile.birthday,
                endereco: '',
                tipoMembro: 'MEMBRO',
                funcao: profile.role,
                batizado: true,
                ceifeiros: false,
                maturidade: true,
                ctl: true,
                encontro: true,
                observacao: 'Líder da célula (adicionado automaticamente)',
                foto: profile.photoURL || '',
                createdAt: new Date().toISOString()
              };
              setDoc(doc(db, "members", leaderAsMember.id), leaderAsMember);
            }
          }} 
          onEditCell={(updatedCell) => { if(user) setDoc(doc(db, "cells", updatedCell.id), updatedCell); }}
          onAddMember={(member) => { if(user) setDoc(doc(db, "members", member.id), member); }}
          onEditMember={(member) => { if(user) setDoc(doc(db, "members", member.id), member); }}
          onDeleteMember={(memberId, deleteAll) => {
            if (!user) return;
            deleteDoc(doc(db, "members", memberId));
            if (deleteAll) {
              // Also remove from all meetings
              meetings.forEach(meeting => {
                const updatedAttendance = meeting.attendance.filter(a => a.memberId !== memberId);
                if (updatedAttendance.length !== meeting.attendance.length) {
                  setDoc(doc(db, "meetings", meeting.id), {
                    ...meeting,
                    attendance: updatedAttendance
                  });
                }
              });
            }
          }}
          onAddMeeting={(meeting) => { if(user) setDoc(doc(db, "meetings", meeting.id), meeting); }}
          onEditMeeting={(meeting) => { if(user) setDoc(doc(db, "meetings", meeting.id), meeting); }}
          onAddPastor={(n) => { if(user) setDoc(doc(db, "pastorNetworks", n.id), n); }}
          onAddDiscipler={(n) => { if(user) setDoc(doc(db, "disciplerNetworks", n.id), n); }}
        />}
        {activeTab === 'settings' && <SettingsView isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
        {activeTab === 'profile' && <ProfileEditor />}
        {activeTab === 'directory' && <DirectoryView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function HomeView({ cells }: { cells: Cell[] }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Membros</h3>
          <p className="text-3xl font-bold mt-2">142</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Células Ativas</h3>
          <p className="text-3xl font-bold mt-2">{cells.length > 0 ? cells.length : 12}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Presença Média (Mês)</h3>
          <p className="text-3xl font-bold mt-2">85%</p>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ 
  cells, 
  members,
  meetings,
  pastorNetworks,
  disciplerNetworks,
  onAddCell, 
  onEditCell,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onAddMeeting,
  onEditMeeting,
  onAddPastor,
  onAddDiscipler
}: { 
  cells: Cell[], 
  members: Member[],
  meetings: Meeting[],
  pastorNetworks: PastorNetwork[],
  disciplerNetworks: DisciplerNetwork[],
  onAddCell: (cell: Cell) => void, 
  onEditCell: (cell: Cell) => void,
  onAddMember: (member: Member) => void,
  onEditMember: (member: Member) => void,
  onDeleteMember: (memberId: string, deleteAll: boolean) => void,
  onAddMeeting: (meeting: Meeting) => void,
  onEditMeeting: (meeting: Meeting) => void,
  onAddPastor: (n: PastorNetwork) => void,
  onAddDiscipler: (n: DisciplerNetwork) => void
}) {
  const [isAddingCell, setIsAddingCell] = useState(false);
  const [isAddingPastor, setIsAddingPastor] = useState(false);
  const [isAddingDiscipler, setIsAddingDiscipler] = useState(false);
  const [editingCell, setEditingCell] = useState<Cell | null>(null);
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (selectedCell) {
    return <CellDetailsView 
      cell={selectedCell} 
      members={members.filter(m => m.cellId === selectedCell.id)}
      meetings={meetings.filter(m => m.cellId === selectedCell.id)}
      onBack={() => setSelectedCell(null)} 
      onAddMember={onAddMember}
      onEditMember={onEditMember}
      onDeleteMember={onDeleteMember}
      onAddMeeting={onAddMeeting}
      onEditMeeting={onEditMeeting}
    />;
  }

  if (isAddingPastor) {
    return <AddPastorNetworkForm
      onCancel={() => setIsAddingPastor(false)}
      onSave={(n) => { onAddPastor(n); setIsAddingPastor(false); }}
    />;
  }

  if (isAddingDiscipler) {
    return <AddDisciplerNetworkForm
      pastorNetworks={pastorNetworks}
      onCancel={() => setIsAddingDiscipler(false)}
      onSave={(n) => { onAddDiscipler(n); setIsAddingDiscipler(false); }}
    />;
  }

  if (isAddingCell || editingCell) {
    return <AddCellForm 
      initialData={editingCell}
      disciplerNetworks={disciplerNetworks}
      onCancel={() => { setIsAddingCell(false); setEditingCell(null); }} 
      onSave={(cell) => { 
        if (editingCell) onEditCell(cell);
        else onAddCell(cell); 
        setIsAddingCell(false); 
        setEditingCell(null);
      }} 
    />;
  }

  const groupedCells = cells.reduce((acc, cell) => {
    // Map cell.rede (disciplerNetworkId) to discipulador name
    const disc = disciplerNetworks.find(d => d.id === cell.rede);
    const redeKey = disc ? disc.nome : 'Sem Rede';
    if (!acc[redeKey]) acc[redeKey] = [];
    acc[redeKey].push(cell);
    return acc;
  }, {} as Record<string, Cell[]>);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Relatórios de Presença</h1>
        <div className="relative">
          <button 
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between gap-2"
          >
            Ações
            <ChevronDown className="w-4 h-4" />
          </button>
          {showAddMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-zinc-800 ring-1 ring-black ring-opacity-5 z-10 border dark:border-zinc-700">
              <div className="py-1">
                <button
                  onClick={() => { setShowAddMenu(false); setIsAddingPastor(true); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Nova Rede de Pastor/Obreiro
                </button>
                <button
                  onClick={() => { setShowAddMenu(false); setIsAddingDiscipler(true); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Nova Rede de Discipulador
                </button>
                <hr className="my-1 border-gray-100 dark:border-zinc-700" />
                <button
                  onClick={() => { setShowAddMenu(false); setIsAddingCell(true); }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Nova Célula
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {cells.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum relatório recente</p>
            <p className="text-sm mt-1">Clique em "Adicionar nova Célula" para registrar a presença da sua célula ou rede.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedCells).map(([rede, redeCells]) => (
            <div key={rede} className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-2">{rede}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {redeCells.map(cell => (
                  <div 
                    key={cell.id} 
                    className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-3 hover:border-blue-500 transition-colors cursor-pointer relative"
                    onClick={() => setSelectedCell(cell)}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingCell(cell); }}
                      className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                      title="Editar célula"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 pr-8">
                      {cell.logo ? (
                        <img src={cell.logo} alt={`Logo ${cell.nome}`} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                          {cell.nome.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{cell.nome}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{cell.diaHorario}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1 text-gray-600 dark:text-gray-300 mt-2">
                      <p><span className="font-medium">Líder:</span> {cell.lider}</p>
                      <p><span className="font-medium">Anfitrião:</span> {cell.anfitriao}</p>
                      <p className="truncate" title={cell.local}><span className="font-medium">Local:</span> {cell.local}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddPastorNetworkForm({ onCancel, onSave }: { onCancel: () => void, onSave: (n: PastorNetwork) => void }) {
  const [nome, setNome] = useState('');
  const [pastor, setPastor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !pastor) {
      alert("Preencha todos os campos.");
      return;
    }
    onSave({
      id: Date.now().toString(),
      nome,
      pastor,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button type="button" onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">Nova Rede de Pastor/Obreiro</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome da Rede</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white" 
            placeholder="Ex: Rede Jovem Principal"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Pastor / Obreiro</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white" 
            placeholder="Ex: Pr. João"
            value={pastor}
            onChange={(e) => setPastor(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-zinc-800">
          <button type="button" onClick={onCancel} className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
            Salvar Rede
          </button>
        </div>
      </form>
    </div>
  );
}

function AddDisciplerNetworkForm({ pastorNetworks, onCancel, onSave }: { pastorNetworks: PastorNetwork[], onCancel: () => void, onSave: (n: DisciplerNetwork) => void }) {
  const [nome, setNome] = useState('');
  const [discipulador, setDiscipulador] = useState('');
  const [pastorNetworkId, setPastorNetworkId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !discipulador || !pastorNetworkId) {
      alert("Preencha todos os campos e selecione uma rede de pastor superior.");
      return;
    }
    onSave({
      id: Date.now().toString(),
      nome,
      discipulador,
      pastorNetworkId,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button type="button" onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold">Nova Rede de Discipulador</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rede de Pastor/Obreiro (Superior)</label>
          <select 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
            value={pastorNetworkId}
            onChange={(e) => setPastorNetworkId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {pastorNetworks.map(pn => (
              <option key={pn.id} value={pn.id}>{pn.nome} ({pn.pastor})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome da Rede</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white" 
            placeholder="Ex: Discipulado Região Sul"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome do Discipulador</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white" 
            placeholder="Ex: Carlos"
            value={discipulador}
            onChange={(e) => setDiscipulador(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-zinc-800">
          <button type="button" onClick={onCancel} className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
            Salvar Rede
          </button>
        </div>
      </form>
    </div>
  );
}

function AddCellForm({ onCancel, onSave, initialData, disciplerNetworks }: { onCancel: () => void, onSave: (cell: Cell) => void, initialData?: Cell | null, disciplerNetworks: DisciplerNetwork[] }) {
  const [redeSearch, setRedeSearch] = useState('');
  const [isRedeOpen, setIsRedeOpen] = useState(false);
  
  const [selectedRede, setSelectedRede] = useState(initialData?.rede || '');
  const [nome, setNome] = useState(initialData?.nome || '');
  const [dataMultiplicacao, setDataMultiplicacao] = useState(initialData?.dataMultiplicacao || '');
  const [lider, setLider] = useState(initialData?.lider || '');
  const [anfitriao, setAnfitriao] = useState(initialData?.anfitriao || '');
  const [liderTreinamento, setLiderTreinamento] = useState(initialData?.liderTreinamento || '');
  const [diaHorario, setDiaHorario] = useState(initialData?.diaHorario || '');
  const [local, setLocal] = useState(initialData?.local || '');
  const [logo, setLogo] = useState(initialData?.logo || '');
  
  const filteredRedes = disciplerNetworks.filter(r => r.nome.toLowerCase().includes(redeSearch.toLowerCase()));

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRede || !nome || !lider) {
      alert("Por favor, preencha pelo menos a Rede, Nome da célula e Líder.");
      return;
    }
    onSave({
      id: initialData?.id || Date.now().toString(),
      rede: selectedRede,
      nome,
      dataMultiplicacao,
      lider,
      anfitriao,
      liderTreinamento,
      diaHorario,
      local,
      logo
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Adicionar nova Célula</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          
          {/* Rede - Searchable Select */}
          <div className="space-y-1 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rede</label>
            <div 
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 flex justify-between items-center cursor-pointer"
              onClick={() => setIsRedeOpen(!isRedeOpen)}
            >
              <span className={selectedRede ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
                {disciplerNetworks.find(d => d.id === selectedRede)?.nome || 'Selecione uma rede...'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
            
            {isRedeOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg">
                <div className="p-2 border-b border-gray-100 dark:border-zinc-700 flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    className="w-full bg-transparent outline-none text-sm dark:text-white" 
                    placeholder="Pesquisar rede..."
                    value={redeSearch}
                    onChange={(e) => setRedeSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <ul className="max-h-48 overflow-y-auto py-1">
                  {filteredRedes.length > 0 ? filteredRedes.map(rede => (
                    <li 
                      key={rede.id} 
                      className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer dark:text-gray-200"
                      onClick={() => {
                        setSelectedRede(rede.id);
                        setIsRedeOpen(false);
                        setRedeSearch('');
                      }}
                    >
                      {rede.nome}
                    </li>
                  )) : (
                    <li className="px-3 py-2 text-sm text-gray-500">Nenhuma rede encontrada</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Nome da célula */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da célula</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Ex: Célula Betel" />
          </div>

          {/* Data da multiplicação */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da multiplicação</label>
            <input type="date" value={dataMultiplicacao} onChange={e => setDataMultiplicacao(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
          </div>

          {/* Líder & Anfitrião */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Líder</label>
              <input type="text" value={lider} onChange={e => setLider(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Nome do líder" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Anfitrião</label>
              <input type="text" value={anfitriao} onChange={e => setAnfitriao(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Nome do anfitrião" />
            </div>
          </div>

          {/* Líder em treinamento */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Líder em treinamento</label>
            <input type="text" value={liderTreinamento} onChange={e => setLiderTreinamento(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Nome do líder em treinamento (opcional)" />
          </div>

          {/* Dia e horário & Local */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dia e horário da reunião</label>
              <input type="text" value={diaHorario} onChange={e => setDiaHorario(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Ex: Terças às 20:00" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Local da reunião</label>
              <input type="text" value={local} onChange={e => setLocal(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Endereço completo" />
            </div>
          </div>

          {/* Logo da célula */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo da célula</label>
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 dark:border-zinc-700 px-6 py-10 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer relative overflow-hidden">
              {logo ? (
                <div className="text-center">
                  <img src={logo} alt="Logo preview" className="mx-auto h-24 w-24 object-cover rounded-full border-2 border-blue-500" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <span>Trocar imagem</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-zinc-600" aria-hidden="true" />
                  <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-400 justify-center">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <span>Fazer upload de imagem</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs leading-5 text-gray-500 dark:text-gray-500">PNG, JPG, GIF até 5MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Salvar Célula
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function CellDetailsView({ 
  cell, members, meetings, onBack, onAddMember, onEditMember, onDeleteMember, onAddMeeting, onEditMeeting 
}: { 
  cell: Cell, 
  members: Member[], 
  meetings: Meeting[],
  onBack: () => void, 
  onAddMember: (m: Member) => void,
  onEditMember: (m: Member) => void,
  onDeleteMember: (memberId: string, deleteAll: boolean) => void,
  onAddMeeting: (m: Meeting) => void,
  onEditMeeting: (m: Meeting) => void
}) {
  const [activeTab, setActiveTab] = useState('membros');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [wizardConfig, setWizardConfig] = useState<{
    type: EventType, 
    date: string, 
    name?: string, 
    time?: string, 
    lockType?: boolean, 
    weekStart?: string, 
    weekEnd?: string
  } | null>(null);

  if (isAddingMember || editingMember) {
    return <AddMemberForm 
      cellId={cell.id} 
      initialData={editingMember}
      onCancel={() => { setIsAddingMember(false); setEditingMember(null); }} 
      onSave={(m) => { 
        if (editingMember) onEditMember(m);
        else onAddMember(m); 
        setIsAddingMember(false); 
        setEditingMember(null);
      }} 
    />;
  }

  if (editingMeeting) {
    return <AttendanceEditor 
      meeting={editingMeeting}
      members={members}
      onCancel={() => setEditingMeeting(null)}
      onSave={(updatedMeeting) => {
        onEditMeeting(updatedMeeting);
        setEditingMeeting(null);
      }}
    />;
  }

  if (wizardConfig) {
    return <MeetingWizard 
      cellId={cell.id}
      members={members}
      initialType={wizardConfig.type}
      initialDate={wizardConfig.date}
      initialTime={wizardConfig.time}
      initialName={wizardConfig.name}
      lockType={wizardConfig.lockType}
      weekStart={wizardConfig.weekStart}
      weekEnd={wizardConfig.weekEnd}
      onCancel={() => setWizardConfig(null)}
      onSave={(meeting, newMembers) => {
        newMembers.forEach(m => onAddMember(m));
        onAddMeeting(meeting);
        setWizardConfig(null);
      }}
    />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          {cell.logo ? (
            <img src={cell.logo} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              {cell.nome.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold leading-none">{cell.nome}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cell.rede}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('membros')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'membros' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Membros
        </button>
        <button 
          onClick={() => setActiveTab('frequencia')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'frequencia' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Frequência 2026
        </button>
        <button 
          onClick={() => setActiveTab('eventos')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'eventos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Eventos
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6">
        {activeTab === 'membros' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Membros da Célula</h2>
              <button onClick={() => setIsAddingMember(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
            {members.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum membro cadastrado</p>
                <p className="text-sm mt-1">Clique em "Adicionar" para registrar o primeiro membro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {members.map(m => (
                  <div key={m.id} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 flex items-center gap-4 hover:border-blue-500 transition-colors relative group">
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingMember(m)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                        title="Editar membro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingMember(m)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                        title="Deletar membro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {m.foto ? (
                      <img src={m.foto} alt={m.nome} className="w-12 h-12 rounded-full object-cover border border-gray-200 dark:border-zinc-700" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 font-bold border border-gray-200 dark:border-zinc-700">
                        {m.nome.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white leading-tight">{m.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.tipoMembro} • {m.funcao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'frequencia' && (
          <AttendanceCalendar 
            cellId={cell.id}
            members={members}
            meetings={meetings}
            onAddMeeting={onAddMeeting}
            onAddMember={onAddMember}
            onEditMeeting={setEditingMeeting}
          />
        )}
        {activeTab === 'eventos' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Eventos da Célula</h2>
              <button 
                onClick={() => setWizardConfig({ type: 'EVENTO', date: toISODate(new Date()) })} 
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Evento
              </button>
            </div>
            {meetings.filter(m => m.type === 'EVENTO').length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhum evento registrado</p>
                <p className="text-sm mt-1">Os eventos da célula aparecerão aqui.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {meetings.filter(m => m.type === 'EVENTO').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => (
                  <div key={event.id} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4 flex items-center justify-between hover:border-emerald-500 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{event.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(event.date).toLocaleDateString('pt-BR')} • {event.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {event.attendance.filter(a => a.status === 'P').length} Presentes
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {deletingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-2">Tem certeza?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Você está prestes a remover <span className="font-bold text-gray-900 dark:text-white">{deletingMember.nome}</span>.
            </p>
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  onDeleteMember(deletingMember.id, false);
                  setDeletingMember(null);
                }}
                className="w-full py-3 px-4 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-900 dark:text-white rounded-xl font-medium transition-colors text-left"
              >
                <div className="font-bold text-sm">Apenas deletar membro</div>
                <div className="text-[10px] text-gray-500 font-normal mt-0.5">Mantém as frequências registradas</div>
              </button>
              
              <button 
                onClick={() => {
                  onDeleteMember(deletingMember.id, true);
                  setDeletingMember(null);
                }}
                className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl transition-colors border border-red-100 dark:border-red-900/50 text-left"
              >
                <div className="font-bold text-sm">Deletar tudo</div>
                <div className="text-[10px] text-red-500/70 dark:text-red-400/50 font-normal mt-0.5">Remove todas as frequências deste membro</div>
              </button>
              
              <button 
                onClick={() => setDeletingMember(null)}
                className="w-full py-3 px-4 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendanceCalendar({ 
  cellId, 
  members, 
  meetings, 
  onAddMeeting,
  onAddMember,
  onEditMeeting
}: { 
  cellId: string, 
  members: Member[], 
  meetings: Meeting[],
  onAddMeeting: (m: Meeting) => void,
  onAddMember: (m: Member) => void,
  onEditMeeting: (m: Meeting) => void
}) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [wizardConfig, setWizardConfig] = useState<{type: EventType, date: string, weekStart?: string, weekEnd?: string} | null>(null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Helper to get weeks of a month in 2026
  const getWeeksInMonth = (month: number) => {
    const weeks: { start: Date, end: Date }[] = [];
    
    // Rule: A week belongs to the month where its Monday falls.
    // Find the first Monday that is >= 1st of the month
    let current = new Date(2026, month, 1);
    while (current.getDay() !== 1) {
      current.setDate(current.getDate() + 1);
    }
    
    // Continue as long as the week starts in the target month
    while (current.getMonth() === month) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      weeks.push({ start: weekStart, end: weekEnd });
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };

  const weeks = getWeeksInMonth(selectedMonth);

  if (wizardConfig) {
    return <MeetingWizard 
      cellId={cellId}
      members={members}
      initialType={wizardConfig.type}
      initialDate={wizardConfig.date}
      initialTime={wizardConfig.time}
      lockType={wizardConfig.lockType}
      weekStart={wizardConfig.weekStart}
      weekEnd={wizardConfig.weekEnd}
      onCancel={() => setWizardConfig(null)}
      onSave={(meeting, newMembers) => {
        newMembers.forEach(m => onAddMember(m));
        onAddMeeting(meeting);
        setWizardConfig(null);
      }}
    />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatório de Frequência 2026</h2>
            <p className="text-sm text-gray-500">Gerencie a presença da célula e dos cultos</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setWizardConfig({ type: 'CELULA', date: new Date().toISOString().split('T')[0] })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              Lançar Reunião
            </button>
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-x-auto hide-scrollbar max-w-full">
              {months.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(i)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${selectedMonth === i ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800'}`}
                >
                  {m.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Cards Semanais - Full Width */}
        <div className="space-y-4">
          {weeks.map((week, index) => {
            const wStartStr = toISODate(week.start);
            const wEndStr = toISODate(week.end);
            
            const weekMeetings = meetings.filter(m => {
              return m.date >= wStartStr && m.date <= wEndStr;
            });

            const celula = weekMeetings.find(m => m.type === 'CELULA');
            const sabado = weekMeetings.find(m => m.type === 'SABADO');
            const domingo = weekMeetings.find(m => m.type === 'DOMINGO');
            const customEvents = weekMeetings.filter(m => m.type === 'EVENTO');

            const formatDate = (date: Date) => {
              return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            };

            const getSaturday = () => {
              const d = new Date(week.start);
              d.setDate(d.getDate() + 5);
              return d;
            };

            const getSunday = () => {
              const d = new Date(week.start);
              d.setDate(d.getDate() + 6);
              return d;
            };

            const satDate = getSaturday();
            const sunDate = getSunday();

            return (
              <div key={index} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow w-full">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{index + 1}ª Semana</h3>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                        {formatDate(week.start)} até {formatDate(week.end)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      onClick={() => celula ? onEditMeeting(celula) : setWizardConfig({ 
                        type: 'CELULA', 
                        date: '', 
                        weekStart: toISODate(week.start),
                        weekEnd: toISODate(week.end),
                        lockType: true
                      })}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${celula ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-blue-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${celula ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'}`}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold block">Célula</span>
                          <span className="text-[10px] text-gray-500">
                            {celula ? `Realizado em ${formatDate(new Date(celula.date + 'T12:00:00'))}` : 'Clique para registrar'}
                          </span>
                        </div>
                      </div>
                      {celula ? <Edit2 className="w-4 h-4 text-blue-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
                    </button>

                    <button 
                      onClick={() => sabado ? onEditMeeting(sabado) : setWizardConfig({ 
                        type: 'SABADO', 
                        date: toISODate(satDate),
                        time: '18:00',
                        lockType: true
                      })}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${sabado ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800' : 'bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-purple-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${sabado ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'}`}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold block">Culto de Jovens — {formatDate(satDate)}</span>
                          <span className="text-[10px] text-gray-500">
                            {sabado ? `Realizado em ${formatDate(new Date(sabado.date + 'T12:00:00'))}` : 'Clique para registrar'}
                          </span>
                        </div>
                      </div>
                      {sabado ? <Edit2 className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
                    </button>

                    <button 
                      onClick={() => domingo ? onEditMeeting(domingo) : setWizardConfig({ 
                        type: 'DOMINGO', 
                        date: toISODate(sunDate),
                        lockType: true
                      })}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${domingo ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' : 'bg-gray-50 dark:bg-zinc-800/50 border-transparent hover:border-orange-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${domingo ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'}`}>
                          <Home className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-bold block">Culto da Família — {formatDate(sunDate)}</span>
                          <span className="text-[10px] text-gray-500">
                            {domingo ? `Realizado em ${formatDate(new Date(domingo.date + 'T12:00:00'))}` : 'Clique para registrar'}
                          </span>
                        </div>
                      </div>
                      {domingo ? <Edit2 className="w-4 h-4 text-orange-400" /> : <Plus className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>

                  {/* Eventos Customizados da Semana */}
                  {customEvents.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {customEvents.map(event => (
                        <button 
                          key={event.id} 
                          onClick={() => onEditMeeting(event)}
                          className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 hover:border-emerald-500 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-600 text-white">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-sm font-bold block">{event.name}</span>
                              <span className="text-[10px] text-gray-500">
                                Realizado em {formatDate(new Date(event.date + 'T12:00:00'))}
                              </span>
                            </div>
                          </div>
                          <Edit2 className="w-4 h-4 text-emerald-500" />
                        </button>
                      ))}
                    </div>
                  )}

                {/* Tabela de Presença da Semana */}
                {weekMeetings.length > 0 && (
                  <div className="mt-6 border-t border-gray-100 dark:border-zinc-800 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-zinc-800">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-zinc-800/50 text-[10px] uppercase tracking-wider font-bold text-gray-500">
                            <th className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">Nome</th>
                            <th className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">?</th>
                            <th className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 text-center">
                              <div className="flex items-center justify-center gap-1 text-blue-600">
                                <Users className="w-3 h-3" /> Célula
                              </div>
                            </th>
                            <th className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 text-center">
                              <div className="flex items-center justify-center gap-1 text-purple-600">
                                <Calendar className="w-3 h-3" /> Culto Jovens
                              </div>
                            </th>
                            <th className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 text-center">
                              <div className="flex items-center justify-center gap-1 text-orange-600">
                                <Home className="w-3 h-3" /> Culto Família
                              </div>
                            </th>
                            {customEvents.map(event => (
                              <th key={event.id} className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 text-center">
                                <div className="flex items-center justify-center gap-1 text-emerald-600">
                                  <Calendar className="w-3 h-3" /> {event.name}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-zinc-800">
                          {members.sort((a, b) => a.nome.localeCompare(b.nome)).map(member => {
                            const getAttendanceInfo = (meeting: Meeting | undefined) => {
                              if (!meeting) return null;
                              return meeting.attendance.find(a => a.memberId === member.id);
                            };

                            const celAtt = getAttendanceInfo(celula);
                            const sabAtt = getAttendanceInfo(sabado);
                            const domAtt = getAttendanceInfo(domingo);

                            const renderCell = (att: {status: 'P'|'F', justification: string} | null | undefined, meetingDate?: string) => {
                              if (!att) return <span className="text-gray-200 dark:text-zinc-800">-</span>;
                              return (
                                <div className="flex flex-col items-center">
                                  <span className={`text-sm font-black ${att.status === 'P' ? 'text-green-500' : 'text-red-500'}`}>
                                    {att.status}
                                  </span>
                                  {att.status === 'F' && att.justification && (
                                    <span className="text-[9px] text-gray-400 italic max-w-[80px] truncate" title={att.justification}>
                                      {att.justification}
                                    </span>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{member.nome}</td>
                                <td className="px-4 py-3 text-[10px] font-medium text-gray-500">{member.tipoMembro}</td>
                                <td className="px-4 py-3 text-center border-l border-gray-50 dark:border-zinc-800 bg-blue-50/10">
                                  {renderCell(celAtt, celula?.date)}
                                </td>
                                <td className="px-4 py-3 text-center border-l border-gray-50 dark:border-zinc-800 bg-purple-50/10">
                                  {renderCell(sabAtt, sabado?.date)}
                                </td>
                                <td className="px-4 py-3 text-center border-l border-gray-50 dark:border-zinc-800 bg-orange-50/10">
                                  {renderCell(domAtt, domingo?.date)}
                                </td>
                                {customEvents.map(event => (
                                  <td key={event.id} className="px-4 py-3 text-center border-l border-gray-50 dark:border-zinc-800 bg-emerald-50/10">
                                    {renderCell(getAttendanceInfo(event), event.date)}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddMemberForm({ cellId, onCancel, onSave, initialData }: { cellId: string, onCancel: () => void, onSave: (m: Member) => void, initialData?: Member | null }) {
  const [nome, setNome] = useState(initialData?.nome || '');
  const [dataNascimento, setDataNascimento] = useState(initialData?.dataNascimento || '');
  const [endereco, setEndereco] = useState(initialData?.endereco || '');
  const [tipoMembro, setTipoMembro] = useState(initialData?.tipoMembro || 'Visitante');
  const [funcao, setFuncao] = useState(initialData?.funcao || 'Nenhuma');
  const [batizado, setBatizado] = useState(initialData?.batizado || false);
  const [ceifeiros, setCeifeiros] = useState(initialData?.ceifeiros || false);
  const [maturidade, setMaturidade] = useState(initialData?.maturidade || false);
  const [ctl, setCtl] = useState(initialData?.ctl || false);
  const [encontro, setEncontro] = useState(initialData?.encontro || false);
  const [observacao, setObservacao] = useState(initialData?.observacao || '');
  const [foto, setFoto] = useState(initialData?.foto || '');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) {
      alert("O nome é obrigatório.");
      return;
    }
    onSave({
      id: initialData?.id || Date.now().toString(),
      cellId,
      nome,
      dataNascimento,
      endereco,
      tipoMembro,
      funcao,
      batizado,
      ceifeiros,
      maturidade,
      ctl,
      encontro,
      observacao,
      foto,
      createdAt: initialData?.createdAt || new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{initialData ? 'Editar Membro' : 'Adicionar Membro'}</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <form className="p-6 space-y-6" onSubmit={handleSubmit}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" required placeholder="Nome completo" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de nascimento</label>
              <input type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Endereço</label>
            <input type="text" value={endereco} onChange={e => setEndereco(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" placeholder="Endereço completo" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">É membro?</label>
              <select value={tipoMembro} onChange={e => setTipoMembro(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
                <option value="Visitante">Visitante</option>
                <option value="F.A">F.A</option>
                <option value="Membro">Membro</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Função</label>
              <select value={funcao} onChange={e => setFuncao(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-shadow">
                <option value="Nenhuma">Nenhuma</option>
                <option value="Líder">Líder</option>
                <option value="Líder em treinamento">Líder em treinamento</option>
                <option value="Anjo da guarda">Anjo da guarda</option>
                <option value="Anfitrião">Anfitrião</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-100 dark:border-zinc-800 pt-6">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Trilha de Crescimento</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={batizado} onChange={e => setBatizado(e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <CheckSquare className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">É batizado?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={ceifeiros} onChange={e => setCeifeiros(e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <CheckSquare className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Fez o ceifeiros?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={maturidade} onChange={e => setMaturidade(e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <CheckSquare className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Fez maturidade?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={ctl} onChange={e => setCtl(e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <CheckSquare className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Fez o CTL?</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={encontro} onChange={e => setEncontro(e.target.checked)} className="peer sr-only" />
                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                  <CheckSquare className="w-3.5 h-3.5 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Encontro com Deus?</span>
              </label>
            </div>
          </div>

          <div className="space-y-1 border-t border-gray-100 dark:border-zinc-800 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observação</label>
            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-shadow" placeholder="Observações sobre o membro..."></textarea>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foto (Opcional)</label>
            <div className="mt-2 flex items-center gap-4">
              {foto ? (
                <img src={foto} alt="Preview" className="w-16 h-16 rounded-full object-cover border-2 border-blue-500" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-zinc-700">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <label className="cursor-pointer bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-gray-200">
                Escolher foto
                <input type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Salvar Membro
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function MeetingWizard({ 
  cellId, 
  members, 
  onCancel, 
  onSave, 
  initialType, 
  initialDate,
  initialTime,
  initialName,
  lockType,
  weekStart,
  weekEnd
}: { 
  cellId: string, 
  members: Member[], 
  onCancel: () => void, 
  onSave: (meeting: Meeting, newMembers: Member[]) => void, 
  initialType?: EventType, 
  initialDate?: string,
  initialTime?: string,
  initialName?: string,
  lockType?: boolean,
  weekStart?: string,
  weekEnd?: string
}) {
  const [step, setStep] = useState<'setup' | 'attendance' | 'justification' | 'visitors' | 'add_visitor'>('setup');
  const [date, setDate] = useState(initialDate || '');
  const [time, setTime] = useState(initialTime || '');
  const [photo, setPhoto] = useState('');
  const [type, setType] = useState<EventType>(initialType || 'CELULA');
  const [name, setName] = useState(initialName || '');
  
  const [attendance, setAttendance] = useState<{memberId: string, status: 'P'|'F', justification: string}[]>([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  const [justification, setJustification] = useState('');
  
  const [newMembers, setNewMembers] = useState<Member[]>([]);
  const [visitorName, setVisitorName] = useState('');

  const allMembersToProcess = members.filter(m => {
    // Regular members from Members screen are always included
    if (m.tipoMembro !== 'Visitante') return true;
    
    // If they were already in the database before the wizard opened, 
    // we should probably include them unless we are 100% sure they are new.
    // However, if the user added them TODAY to record a meeting from SUNDAY, 
    // we MUST include them.
    if (!m.createdAt) return true;
    const cDateStr = m.createdAt.split('T')[0];
    
    // We only filter if the member was created STRICTLY AFTER the selected weekEnd (if provided)
    // or strictly after today's date if recording today.
    if (weekEnd) {
      // If added more than 7 days after the weekEnd, maybe they didn't belong to this week.
      // But let's be safe and allow some margin or just trust they were there.
      return true; 
    }
    
    return true; // Simplify for now: if they are in the cell's members list, they can be in the call.
  });

  const getDaysOfWeek = () => {
    if (!weekStart) return [];
    const days = [];
    const start = new Date(weekStart + 'T12:00:00');
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        name: dayNames[i],
        date: toISODate(d),
        label: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
      });
    }
    return days;
  };

  const days = getDaysOfWeek();

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      alert("Data e horário são obrigatórios.");
      return;
    }
    if (allMembersToProcess.length > 0) {
      setStep('attendance');
    } else {
      setStep('visitors');
    }
  };

  const handleAttendance = (status: 'P' | 'F') => {
    if (status === 'P') {
      setAttendance([...attendance, { memberId: allMembersToProcess[currentMemberIndex].id, status: 'P', justification: '' }]);
      nextMember();
    } else {
      setStep('justification');
    }
  };

  const handleJustificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttendance([...attendance, { memberId: allMembersToProcess[currentMemberIndex].id, status: 'F', justification }]);
    setJustification('');
    nextMember();
  };

  const nextMember = () => {
    if (currentMemberIndex + 1 < allMembersToProcess.length) {
      setCurrentMemberIndex(currentMemberIndex + 1);
      setStep('attendance');
    } else {
      setStep('visitors');
    }
  };

  const handleAddVisitorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName) return;
    
    const newVisitor: Member = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      cellId,
      nome: visitorName,
      dataNascimento: '',
      endereco: '',
      tipoMembro: 'Visitante',
      funcao: 'Nenhuma',
      batizado: false,
      ceifeiros: false,
      maturidade: false,
      ctl: false,
      encontro: false,
      observacao: '',
      foto: '',
      createdAt: date ? date + 'T12:00:00' : new Date().toISOString()
    };
    
    setNewMembers([...newMembers, newVisitor]);
    setAttendance([...attendance, { memberId: newVisitor.id, status: 'P', justification: '' }]);
    setVisitorName('');
    setStep('visitors');
  };

  const finishMeeting = () => {
    const meeting: Meeting = {
      id: Date.now().toString(),
      cellId,
      type,
      name: type === 'EVENTO' ? name : '',
      date,
      time,
      photo,
      attendance
    };
    onSave(meeting, newMembers);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Nova Reunião</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6">
        {step === 'setup' && (
          <form onSubmit={handleSetupSubmit} className="space-y-6">
            {!lockType && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Evento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button 
                    type="button"
                    onClick={() => setType('CELULA')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${type === 'CELULA' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    Célula
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('SABADO')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${type === 'SABADO' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    Culto Jovens
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('DOMINGO')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${type === 'DOMINGO' ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    Culto Família
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('EVENTO')}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${type === 'EVENTO' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400'}`}
                  >
                    Evento
                  </button>
                </div>
              </div>
            )}

            {type === 'EVENTO' && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Evento</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  placeholder="Ex: Batismo, Vigília..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            )}

            {date && allMembersToProcess.length === 0 && members.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Aviso: Os membros desta célula foram cadastrados após a data selecionada e não constarão nesta lista de presença.
                </p>
              </div>
            )}

            {date && allMembersToProcess.length === 0 && members.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  Aviso: Os membros desta célula foram cadastrados após a data selecionada e não constarão nesta lista de presença.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {(type === 'CELULA' || type === 'EVENTO') ? 'Escolha o dia da semana' : 'Data do Evento'}
              </label>
              
              {(type === 'CELULA' || type === 'EVENTO') && days.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setDate(d.date)}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${date === d.date ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 dark:bg-zinc-800/50 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'}`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-70">{d.name}</span>
                      <span className="text-sm font-bold">{d.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  required 
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Horário</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foto da Reunião (Opcional)</label>
              <div className="mt-2 flex items-center gap-4">
                {photo ? (
                  <img src={photo} alt="Preview" className="w-24 h-24 rounded-lg object-cover border-2 border-blue-500" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center border border-dashed border-gray-300 dark:border-zinc-700">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <label className="cursor-pointer bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors text-gray-700 dark:text-gray-200">
                  Escolher foto
                  <input type="file" className="sr-only" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setPhoto(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }} />
                </label>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Iniciar Chamada
              </button>
            </div>
          </form>
        )}

        {step === 'attendance' && (
          <div className="space-y-8 text-center py-8 animate-in fade-in duration-200">
            <h2 className="text-xl font-medium text-gray-500 dark:text-gray-400">Chamada ({currentMemberIndex + 1} de {allMembersToProcess.length})</h2>
            <div className="flex flex-col items-center gap-4">
              {allMembersToProcess[currentMemberIndex].foto ? (
                <img src={allMembersToProcess[currentMemberIndex].foto} alt="Foto" className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-zinc-800 shadow-lg" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-4xl shadow-lg">
                  {allMembersToProcess[currentMemberIndex].nome.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{allMembersToProcess[currentMemberIndex].nome}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{allMembersToProcess[currentMemberIndex].tipoMembro}</p>
              </div>
            </div>
            <div className="flex justify-center gap-4 pt-8">
              <button onClick={() => handleAttendance('F')} className="px-8 py-4 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-xl font-bold text-lg transition-colors">
                Faltou
              </button>
              <button onClick={() => handleAttendance('P')} className="px-8 py-4 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 rounded-xl font-bold text-lg transition-colors">
                Presente
              </button>
            </div>
          </div>
        )}

        {step === 'justification' && (
          <form onSubmit={handleJustificationSubmit} className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Justificativa de Falta</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Por que {allMembersToProcess[currentMemberIndex].nome} faltou?</p>
            </div>
            <textarea 
              value={justification} 
              onChange={e => setJustification(e.target.value)} 
              rows={4} 
              className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
              placeholder="Digite o motivo da falta (opcional)..."
            ></textarea>
            <div className="flex justify-end gap-3">
              <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Salvar e Continuar
              </button>
            </div>
          </form>
        )}

        {step === 'visitors' && (
          <div className="space-y-8 text-center py-12 animate-in fade-in duration-200">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Houve visitantes?</h2>
            <p className="text-gray-500 dark:text-gray-400">Deseja registrar algum visitante que participou desta reunião?</p>
            <div className="flex justify-center gap-4 pt-4">
              <button onClick={finishMeeting} className="px-8 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 rounded-xl font-bold transition-colors">
                Não, finalizar
              </button>
              <button onClick={() => setStep('add_visitor')} className="px-8 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors">
                Sim, adicionar
              </button>
            </div>
          </div>
        )}

        {step === 'add_visitor' && (
          <form onSubmit={handleAddVisitorSubmit} className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Novo Visitante</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Digite o nome do visitante para registrar presença.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Visitante</label>
              <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} required className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Nome completo" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setStep('visitors')} className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Salvar Visitante
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SettingsView({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (val: boolean) => void }) {
  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Aparência */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Aparência</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Modo Escuro</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Alternar entre tema claro e escuro</p>
              </div>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* Conta */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Conta</h2>
            <div className="flex items-center gap-4 mb-4">
              <img
                src="https://picsum.photos/seed/joao/100/100"
                alt="Foto de perfil"
                className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-zinc-700 object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">João Silva</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">joao.silva@exemplo.com</p>
              </div>
              <button className="ml-auto px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                Editar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceEditor({ 
  meeting, 
  members, 
  onCancel, 
  onSave 
}: { 
  meeting: Meeting, 
  members: Member[], 
  onCancel: () => void, 
  onSave: (m: Meeting) => void 
}) {
  const [attendance, setAttendance] = useState(meeting.attendance);
  const [justificationModal, setJustificationModal] = useState<{ memberId: string, name: string } | null>(null);
  const [justificationText, setJustificationText] = useState('');

  const toggleStatus = (memberId: string) => {
    const current = attendance.find(a => a.memberId === memberId);
    if (!current) {
      setAttendance([...attendance, { memberId, status: 'P', justification: '' }]);
    } else {
      if (current.status === 'P') {
        const member = members.find(m => m.id === memberId);
        setJustificationModal({ memberId, name: member?.nome || 'Membro' });
        setJustificationText(current.justification || '');
      } else {
        setAttendance(attendance.map(a => a.memberId === memberId ? { ...a, status: 'P', justification: '' } : a));
      }
    }
  };

  const handleSaveJustification = () => {
    if (!justificationModal) return;
    setAttendance(attendance.map(a => 
      a.memberId === justificationModal.memberId 
        ? { ...a, status: 'F', justification: justificationText } 
        : a
    ));
    setJustificationModal(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Editar Presença</h1>
            <p className="text-sm text-gray-500">
              {meeting.type === 'CELULA' ? 'Célula' : meeting.name || meeting.type} • {new Date(meeting.date + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <button 
          onClick={() => onSave({ ...meeting, attendance })}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
        >
          Salvar Alterações
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-zinc-800">
          {members.map(member => {
            const att = attendance.find(a => a.memberId === member.id);
            const status = att?.status || 'F';
            
            return (
              <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  {member.foto ? (
                    <img src={member.foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 font-bold">
                      {member.nome.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{member.nome}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">{member.tipoMembro}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {status === 'F' && att?.justification && (
                    <span className="text-[10px] text-red-500 italic max-w-[120px] truncate" title={att.justification}>
                      {att.justification}
                    </span>
                  )}
                  <button 
                    onClick={() => toggleStatus(member.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${status === 'P' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                  >
                    {status === 'P' ? 'PRESENTE' : 'FALTOU'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {justificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-zinc-800">
            <h3 className="text-xl font-bold mb-2">Justificativa de Falta</h3>
            <p className="text-sm text-gray-500 mb-6">Por que {justificationModal.name} faltou?</p>
            
            <textarea 
              value={justificationText}
              onChange={e => setJustificationText(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl dark:bg-zinc-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-6"
              placeholder="Digite o motivo (opcional)..."
            />

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setJustificationModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveJustification}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Salvar Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DirectoryView() {
  const [allCells, setAllCells] = useState<Cell[]>([]);
  const [allDisciplerNetworks, setAllDisciplerNetworks] = useState<DisciplerNetwork[]>([]);
  const [allPastorNetworks, setAllPastorNetworks] = useState<PastorNetwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubCells = onSnapshot(collection(db, 'cells'), (snap) => {
      setAllCells(snap.docs.map(doc => doc.data() as Cell));
      setLoading(false);
    });
    const unsubDisciplers = onSnapshot(collection(db, 'disciplerNetworks'), (snap) => {
      setAllDisciplerNetworks(snap.docs.map(doc => doc.data() as DisciplerNetwork));
    });
    const unsubPastors = onSnapshot(collection(db, 'pastorNetworks'), (snap) => {
      setAllPastorNetworks(snap.docs.map(doc => doc.data() as PastorNetwork));
    });

    return () => {
      unsubCells();
      unsubDisciplers();
      unsubPastors();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando diretório...</p>
      </div>
    );
  }

  // Instead of flat grouping, let's group by Pastor -> Discipler -> Cell
  const pastorMap = new Map<string, PastorNetwork>();
  allPastorNetworks.forEach(p => pastorMap.set(p.id, p));

  const disciplerMap = new Map<string, DisciplerNetwork>();
  allDisciplerNetworks.forEach(d => disciplerMap.set(d.id, d));

  const groupedNodes = allPastorNetworks.map(pastor => {
    const dNets = allDisciplerNetworks.filter(d => d.pastorNetworkId === pastor.id);
    const dNodes = dNets.map(disc => {
      const cNets = allCells.filter(c => c.rede === disc.id);
      return { disc, cells: cNets };
    });
    return { pastor, disciplers: dNodes };
  });

  // Collect cells without a discipler network or linked to unknown
  const linkedCellIds = new Set(groupedNodes.flatMap(p => p.disciplers.flatMap(d => d.cells.map(c => c.id))));
  const orphanCells = allCells.filter(c => !linkedCellIds.has(c.id));

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Diretório Geral</h1>
          <p className="text-sm text-gray-500 mt-1">Veja todas as células e redes registradas no sistema.</p>
        </div>
      </div>

      {allCells.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
          <Globe className="w-12 h-12 text-gray-300 dark:text-zinc-700 mx-auto mb-4" />
          <h2 className="text-lg font-bold">Nenhuma célula registrada</h2>
          <p className="text-sm text-gray-500">As células cadastradas aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedNodes.map(({ pastor, disciplers }) => (
            <div key={pastor.id} className="space-y-6">
              <div className="bg-blue-50 dark:bg-zinc-800 border-l-4 border-blue-600 p-4 rounded-r-xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  {pastor.nome}
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full uppercase tracking-wider">
                    Pastor {pastor.pastor}
                  </span>
                </h2>
              </div>

              {disciplers.length === 0 ? (
                <div className="pl-6 text-sm text-gray-500 italic">Sem redes de discipulador</div>
              ) : (
                <div className="pl-2 md:pl-6 space-y-8">
                  {disciplers.map(({ disc, cells }) => (
                    <div key={disc.id} className="space-y-4">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
                        {disc.nome}
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full border border-gray-200 dark:border-zinc-700">
                          Discipulador: {disc.discipulador}
                        </span>
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                          {cells.length} {cells.length === 1 ? 'célula' : 'células'}
                        </span>
                      </h3>
                      
                      {cells.length === 0 ? (
                        <div className="pl-4 text-sm text-gray-500 italic">Sem células vinculadas</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cells.map(cell => (
                            <div 
                              key={cell.id} 
                              className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-900/50 transition-all flex items-center gap-4"
                            >
                              {cell.logo ? (
                                <img src={cell.logo} alt={cell.nome} className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-zinc-800" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center font-bold text-lg">
                                  {cell.nome.charAt(0)}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{cell.nome}</h4>
                                <p className="text-xs mt-1 font-medium text-gray-500 flex items-center gap-1 line-clamp-1">
                                  <UserIcon className="w-3 h-3 flex-shrink-0" />
                                  Líder: {cell.lider || 'N/I'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Orphan cells */}
          {orphanCells.length > 0 && (
            <div className="space-y-4 pt-8 border-t border-gray-200 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <div className="w-2 h-6 bg-gray-400 rounded-full" />
                Células sem Rede Vinculada
                <span className="text-xs font-normal text-gray-500 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                  {orphanCells.length} {orphanCells.length === 1 ? 'célula' : 'células'}
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orphanCells.map(cell => (
                  <div 
                    key={cell.id} 
                    className="p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-600 transition-all flex items-center gap-4 opacity-75"
                  >
                    {cell.logo ? (
                      <img src={cell.logo} alt={cell.nome} className="w-12 h-12 rounded-lg object-cover border border-gray-100 dark:border-zinc-800" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 flex items-center justify-center font-bold text-lg">
                        {cell.nome.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{cell.nome}</h4>
                      <p className="text-xs mt-1 font-medium text-gray-500 flex items-center gap-1 line-clamp-1">
                        <UserIcon className="w-3 h-3 flex-shrink-0" />
                        Líder: {cell.lider || 'N/I'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
