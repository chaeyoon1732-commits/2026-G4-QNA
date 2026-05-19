/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Lock, 
  PenSquare, 
  TrendingUp, 
  UserCircle, 
  Building2, 
  Settings2, 
  Lightbulb, 
  Handshake, 
  Rocket, 
  Coffee, 
  Send, 
  ShieldCheck, 
  RotateCcw,
  Search,
  Dice5,
  Trash2,
  Maximize2,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Info,
  Calendar,
  Building,
  Wrench,
  CheckCheck,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth, ensureAuth, handleFirestoreError, OperationType } from './lib/firebase';

// --- Types ---
interface Question {
  id: string | number;
  category: 'knowhow' | 'relation' | 'growth' | 'casual';
  mentor: 'branch' | 'center';
  text: string;
  date: string;
  serverCreated?: any;
}

type View = 'form' | 'dashboard';

// --- Constants ---
const CATEGORIES = {
  knowhow: { 
    label: "현업 핵심 노하우", 
    color: "orange", 
    accent: "bg-orange-50 text-orange-600 border-orange-100",
    barColor: "bg-orange-500",
    icon: Lightbulb, 
    guide: "실무 고도화 질문 가이드💡\n예: 'G4 3년차가 되면서 실무의 깊이가 한층 깊어졌는데, 지점이나 하이테크센터 관리 시 발생할 수 있는 복잡한 문제나 변수를 주도적으로 파악하고 리딩하는 선배님들만의 비법이 궁금합니다.'",
    desc: "현업의 리스크 및 이슈 해결 능력, 효율적인 비즈니스 성과 관리 팁"
  },
  relation: { 
    label: "조직 및 현장 커뮤니케이션", 
    color: "purple", 
    accent: "bg-purple-50 text-purple-600 border-purple-100",
    barColor: "bg-purple-500",
    icon: Handshake, 
    guide: "현장 커뮤니케이션 질문 가이드🤝\n예: '본사, 지역본부 담당자나 현장 카마스터분들과 소통 시, 3년차 실무자로서 비즈니스적 주도권을 잃지 않으면서도 상호 신뢰 가득하고 원활한 협업을 이끄는 조율 스킬을 알려주세요.'",
    desc: "본사/지점/현장 카마스터와 주도적으로 소통하는 법"
  },
  growth: { 
    label: "커리어 로드맵 설정", 
    color: "blue", 
    accent: "bg-blue-50 text-hyundai-blue border-blue-100",
    barColor: "bg-hyundai-blue",
    icon: Rocket, 
    guide: "차세대 리더 성장 가이드🚀\n예: 'G4 3년차 시기는 차세대 관리자로의 성장을 모색해야 하는 때인 것 같습니다. 선배님들이 그 당시에 스스로 역량을 다지기 위해 세운 커리어 단기 목표가 궁금합니다.'",
    desc: "G4 3년차 시기 핵심 직무 전문성과 미래 리더 마인드셋"
  },
  casual: { 
    label: "슬럼프 & 워라밸", 
    color: "teal", 
    accent: "bg-teal-50 text-teal-600 border-teal-100",
    barColor: "bg-teal-500",
    icon: Coffee, 
    guide: "슬럼프 & 라이프 가이드☕\n예: '오랜 직장 생활 중에 찾아오는 슬럼프나 급격한 스트레스를 지혜롭게 마인드 컨트롤하셨던 선배님만의 비결이나 오프타임 활용 팁이 있으실까요?'",
    desc: "권태기 극복, 스트레스 관리 및 선배들의 취미 생활"
  }
};

const MENTORS = {
  branch: { 
    label: "지점장", 
    subLabel: "지점 리더",
    name: "김태영 책임매니저", 
    dept: "국내사업인재육성팀", 
    icon: Building, 
    accent: "bg-hyundai-ocean text-hyundai-navy",
    desc: "지점장 교육을 이끄는 지점장 출신 베테랑 선배로, 현장의 최전선 영업망 관리와 비즈니스 드라이브 노하우 공유" 
  },
  center: { 
    label: "하이테크센터 팀장", 
    subLabel: "서비스 리더",
    name: "김경목 팀장", 
    dept: "대전하이테크센터 비즈니스운영팀", 
    icon: Wrench, 
    accent: "bg-teal-50 text-teal-700",
    desc: "산업안전, 총무, 교육, 센터 현장 경험 등 다양한 직무를 경험한 올라운더 선배로 기술 서비스 조직 운영 팁 전수" 
  }
};

const INITIAL_QUESTIONS: Question[] = [
  { id: 1, category: 'knowhow', mentor: 'branch', text: '지점 G4 3년차가 되며 추진하는 신사업 과제와 현장 영업망 관리 사이의 조율 노하우가 궁금합니다. 특히 지역본부와의 협의 과정에서 주도권을 잡는 법이 알고 싶습니다.', date: '2026-05-18' },
  { id: 2, category: 'relation', mentor: 'branch', text: '현장의 연배 높은 카마스터분들과 이견 조율 시 기죽지 않고 비즈니스 방향성을 확고하게 설득하고 우호적인 동의를 이끌어내는 화법이 있을까요?', date: '2026-05-19' },
  { id: 3, category: 'growth', mentor: 'branch', text: '매니저 시절 나만의 확실한 직무 커리어 패스를 설계하기 위해 어떤 준비를 하셨나요? 단순히 시키는 일을 넘어 리더로 성장하기 위한 마인드셋이 궁금합니다.', date: '2026-05-19' },
  { id: 4, category: 'casual', mentor: 'center', text: '현장 근무지의 특수한 환경이나 지방 근무 시 찾아오는 일종의 3년차 매너리즘을 극복하는 선배님만의 내적인 멘탈 회복 루틴이 있는지 알고 싶습니다.', date: '2026-05-17' }
];

const ADMIN_PASS = "6927376";

export default function App() {
  const [view, setView] = useState<View>('form');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<keyof typeof MENTORS | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof CATEGORIES | ''>('');
  const [questionText, setQuestionText] = useState('');
  
  // Modals & UI states
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [focusedQuestion, setFocusedQuestion] = useState<Question | null>(null);
  
  // Dash filters
  const [dashCatFilter, setDashCatFilter] = useState<'all' | keyof typeof CATEGORIES>('all');
  const [dashMentorFilter, setDashMentorFilter] = useState<'all' | keyof typeof MENTORS>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReady, setIsReady] = useState(false);

  // Initialize Auth and Real-time sync
  useEffect(() => {
    const init = async () => {
      try {
        await ensureAuth();
        setIsReady(true);
      } catch (error) {
        console.error("Auth failed", error);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const qList: Question[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Question));
      setQuestions(qList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'questions');
    });

    return () => unsubscribe();
  }, [isReady]);

  // Statistics
  const stats = useMemo(() => {
    const total = questions.length || 1;
    const catCounts = { knowhow: 0, relation: 0, growth: 0, casual: 0 };
    questions.forEach(q => catCounts[q.category]++);
    return {
      total: questions.length,
      knowhow: Math.round((catCounts.knowhow / total) * 100),
      relation: Math.round((catCounts.relation / total) * 100),
      growth: Math.round((catCounts.growth / total) * 100),
      casual: Math.round((catCounts.casual / total) * 100),
      raw: catCounts
    };
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchCat = dashCatFilter === 'all' || q.category === dashCatFilter;
      const matchMentor = dashMentorFilter === 'all' || q.mentor === dashMentorFilter;
      const matchSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchMentor && matchSearch;
    }).sort((a, b) => b.id - a.id);
  }, [questions, dashCatFilter, dashMentorFilter, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedMentor) return;
    if (!selectedCategory) return;
    if (questionText.length < 10) return;

    try {
      const user = await ensureAuth();
      const newQuestion = {
        authorId: user?.uid,
        category: selectedCategory,
        mentor: selectedMentor,
        text: questionText,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'questions'), newQuestion);
      
      setShowSuccess(true);
      setQuestionText('');
      setSelectedCategory('');
      setSelectedMentor('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'questions');
    }
  };

  const handleAdminLogin = () => {
    if (adminInput === ADMIN_PASS) {
      setShowAdminLogin(false);
      setView('dashboard');
      setAdminInput('');
      setLoginError(false);
    } else {
      setLoginError(true);
      setTimeout(() => setLoginError(false), 2000);
    }
  };

  const resetQuestions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'questions'));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      setShowResetConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'questions');
    }
  };

  const pickRandom = () => {
    if (questions.length === 0) return;
    const random = questions[Math.floor(Math.random() * questions.length)];
    setFocusedQuestion(random);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      {/* Top Decorative Line */}
      <div className="h-2 bg-gradient-to-r from-hyundai-navy via-hyundai-blue to-teal-400 w-full shrink-0" />

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-hyundai-navy text-white text-[10px] lg:text-xs font-black px-3 py-1.5 rounded-md tracking-wider">HYUNDAI</div>
            <span className="text-slate-300 hidden sm:inline ml-2 font-bold opacity-30">|</span>
            <span className="font-black text-hyundai-navy tracking-tight text-sm lg:text-base">G4 Emerging LEADER</span>
          </div>
          
          <div className="flex items-center gap-3">
            {view === 'dashboard' ? (
              <button 
                onClick={() => setView('form')}
                className="text-xs sm:text-sm font-bold text-hyundai-blue bg-hyundai-ocean px-5 py-2.5 rounded-xl border border-hyundai-blue/10 hover:bg-hyundai-blue hover:text-white transition-all duration-300"
              >
                <PenSquare className="w-4 h-4 inline mr-2" />질문 접수처로 이동
              </button>
            ) : (
              <button 
                onClick={() => setShowAdminLogin(true)}
                className="text-xs sm:text-sm font-bold text-white bg-hyundai-navy px-5 py-2.5 rounded-xl shadow-md hover:bg-hyundai-darkblue hover:shadow-lg transition-all duration-300"
              >
                <Lock className="w-4 h-4 inline mr-2" />실시간 대시보드 (교육용)
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {view === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-6xl mx-auto px-4 py-10 md:py-16"
            >
              {/* Header */}
              <header className="text-center mb-14">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="inline-flex items-center gap-2 bg-hyundai-ocean px-5 py-2 rounded-full mb-6 border border-hyundai-blue/20"
                >
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hyundai-blue opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-hyundai-blue"></span>
                  </span>
                  <span className="text-xs font-extrabold text-hyundai-blue tracking-wider uppercase">Hyundai Domestic Business G4</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="font-black leading-tight tracking-tight mb-8"
                >
                  <span className="block text-lg md:text-2xl font-extrabold text-hyundai-blue mb-4">G4 Emerging LEADER 과정</span>
                  <span className="block text-3xl md:text-5xl lg:text-6xl text-hyundai-navy mb-6 font-black tracking-tight">현장 리더 선배와의 대화</span>
                  <span className="inline-block text-lg md:text-2xl px-8 py-3 bg-gradient-to-r from-hyundai-navy to-hyundai-blue text-white rounded-2xl shadow-lg shadow-hyundai-navy/10 font-bold tracking-wide">사전 질문함</span>
                </motion.h1>
                
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-base md:text-lg text-slate-600 max-w-4xl mx-auto leading-relaxed font-medium break-keep space-y-4"
                >
                  <p>어느덧 본부의 핵심 기둥으로 자리 잡은 <strong className="text-hyundai-navy font-black">G4 3년차</strong> 여러분의 한 단계 더 높은 도약을 응원합니다.</p>
                  <p>현장을 이끄는 선배 멘토분들에게 실무 고민, 리더십, 미래 커리어에 대한 진솔한 질문을 남겨보세요.</p>
                  <p className="text-hyundai-blue font-bold">궁금한 주제가 많다면 여러 개의 질문을 제한 없이 자유롭게 남기실 수 있습니다.</p>
                </motion.div>

                <div className="mt-8 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-hyundai-blue/10 blur-xl rounded-full w-36 h-20 mx-auto animate-pulse-soft"></div>
                    <div className="relative bg-white shadow-xl rounded-2xl p-5 flex items-center gap-4 border border-slate-100 animate-float">
                      <div className="bg-hyundai-navy text-white rounded-xl p-3.5 flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-400 font-bold tracking-wider">누적 질문 현황</p>
                        <p className="text-xl md:text-2xl font-black text-hyundai-navy">{stats.total}건 돌파 ✨</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {/* Mentor Lineup Showcase */}
              <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 mb-10 transition-all duration-300 hover:shadow-md">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-5">
                    <div className="w-10 h-10 rounded-full bg-hyundai-blue text-white font-bold flex items-center justify-center text-lg shadow-sm">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-hyundai-navy">현장리더 멘토 라인업</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">질문을 던지기 전, 든든한 등대 역할을 해줄 선배 멘토 프로필을 확인해 보세요.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {(Object.entries(MENTORS) as [keyof typeof MENTORS, typeof MENTORS['branch']][]).map(([key, info]) => (
                    <div key={key} className="relative flex flex-col sm:flex-row items-start gap-5 p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-hyundai-blue hover:shadow-lg transition-all duration-300 group">
                      <div className={`absolute top-5 right-5 text-xs font-extrabold px-3 py-1.5 rounded-full ${info.accent}`}>
                        {info.label}
                      </div>
                      <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 group-hover:text-hyundai-blue flex items-center justify-center text-3xl shrink-0 shadow-sm border border-white transition-colors">
                        <info.icon size={32} />
                      </div>
                      <div className="space-y-3">
                        <div className="text-left">
                            <h3 className="text-lg font-black text-slate-800">{info.name} <span className="text-xs font-semibold text-slate-500">책임매니저</span></h3>
                            <p className="text-xs font-bold text-hyundai-blue">{info.dept}</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed bg-white p-4 rounded-xl border border-slate-100 font-medium">
                            "{info.desc}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Selection & Input Grid */}
                <div className="lg:col-span-8 space-y-8">
                  
                  {/* STEP 1 Select Mentor */}
                  <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="w-10 h-10 rounded-full bg-hyundai-navy text-white font-black flex items-center justify-center text-base shadow-sm">1</span>
                      <div>
                        <h2 className="text-xl font-black text-hyundai-navy tracking-tight">질문하고 싶은 멘토 선배를 골라주세요</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">답변을 매칭해 듣고 싶은 선배 리더를 지정해 주세요.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {(Object.entries(MENTORS) as [keyof typeof MENTORS, typeof MENTORS['branch']][]).map(([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedMentor(key)}
                          className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-300 group ${
                            selectedMentor === key ? 'border-hyundai-blue bg-white shadow-xl translate-y--1' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-hyundai-blue/30'
                          }`}
                        >
                          <div className={`absolute top-5 right-5 transition-all duration-300 ${selectedMentor === key ? 'text-hyundai-blue scale-110' : 'text-slate-200 opacity-40'}`}>
                            <CheckCircle2 size={28} />
                          </div>
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-5 transition-all duration-300 ${
                            selectedMentor === key ? 'bg-hyundai-navy text-white ring-8 ring-hyundai-navy/5' : 'bg-white text-slate-400 group-hover:text-hyundai-navy'
                          }`}>
                            <info.icon size={24} />
                          </div>
                          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-md mb-3 ${info.accent}`}>{info.subLabel}</span>
                          <h3 className="text-lg font-black text-slate-800 mb-1">{info.label}</h3>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium">{info.name}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* STEP 2 Category */}
                  <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="w-10 h-10 rounded-full bg-hyundai-navy text-white font-black flex items-center justify-center text-base shadow-sm">2</span>
                      <div>
                        <h2 className="text-xl font-black text-hyundai-navy tracking-tight">궁금한 고민의 영역을 골라주세요</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">카드를 선택하면 G4 3년차 눈높이에 맞춘 가이드 템플릿이 제공됩니다.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES['knowhow']][]).map(([key, cat]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedCategory(key)}
                          className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-300 group ${
                            selectedCategory === key ? 'border-hyundai-blue bg-white shadow-xl translate-y--1' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-hyundai-blue/30'
                          }`}
                        >
                          <div className={`absolute top-5 right-5 transition-all duration-300 ${selectedCategory === key ? 'text-hyundai-blue scale-110' : 'text-slate-200 opacity-40'}`}>
                            <CheckCircle2 size={24} />
                          </div>
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-5 transition-all duration-300 ${
                            selectedCategory === key ? 'bg-hyundai-ocean text-hyundai-blue' : 'bg-white text-slate-400 group-hover:bg-hyundai-ocean group-hover:text-hyundai-blue'
                          }`}>
                            <cat.icon size={24} />
                          </div>
                          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-md mb-3 ${cat.accent}`}>{cat.label}</span>
                          <h3 className="text-lg font-black text-slate-800 mb-2">
                             {key === 'knowhow' && "현업 핵심 노하우"}
                             {key === 'relation' && "조직 및 현장 커뮤니케이션"}
                             {key === 'growth' && "차세대 리더 성장"}
                             {key === 'casual' && "스트레스 해소 및 워라밸"}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">{cat.desc}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* STEP 3 Input */}
                  <section className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                      <span className="w-10 h-10 rounded-full bg-hyundai-navy text-white font-black flex items-center justify-center text-base shadow-sm">3</span>
                      <div>
                        <h2 className="text-xl font-black text-hyundai-navy tracking-tight">질문할 내용을 자유롭게 기재해 주세요</h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1 font-medium">선택하신 카테고리에 맞는 맞춤 예시 가이드라인이 표시됩니다.</p>
                      </div>
                    </div>

                    <div className="relative group">
                      <textarea
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        maxLength={300}
                        placeholder={selectedCategory ? CATEGORIES[selectedCategory].guide : "카테고리를 먼저 선택하면 G4 3년차 눈높이에 최적화된 예시 가이드가 표시됩니다."}
                        className="w-full h-52 p-6 rounded-2xl border-2 border-slate-200 focus:border-hyundai-blue focus:ring-4 focus:ring-hyundai-blue/10 outline-none text-slate-800 text-sm md:text-base transition-all duration-300 font-medium resize-none shadow-inner bg-slate-50/30"
                      />
                      <div className="absolute bottom-5 right-5 text-xs font-bold text-slate-400 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-1.5">
                        <span className={questionText.length > 0 ? "text-hyundai-navy" : "text-slate-300"}>{questionText.length}</span>
                        <span className="text-slate-200">/</span>
                        <span>300자</span>
                      </div>
                    </div>

                    <div className="mt-6 flex items-start gap-4 bg-hyundai-ocean/50 border border-hyundai-blue/20 p-5 rounded-2xl animate-pulse-soft">
                      <ShieldCheck className="w-7 h-7 text-hyundai-blue shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-hyundai-navy mb-1">안심하고 진솔한 대화를 전해 보세요</p>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">작성한 모든 내용은 완벽히 <span className="text-hyundai-blue font-black">비공개 익명</span>으로 취합되며, 실무에 영향을 주지 않는 순수한 소통 자료로만 재가공되어 전달됩니다.</p>
                      </div>
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedCategory || !selectedMentor || questionText.length < 10}
                            className={`w-full font-black py-5 rounded-2xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 text-base md:text-lg ${
                                selectedCategory && selectedMentor && questionText.length >= 10
                                ? 'bg-hyundai-navy text-white hover:bg-hyundai-darkblue hover:shadow-xl hover:-translate-y-0.5'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <span>현장 선배 멘토에게 전송하기</span>
                            <Send size={20} />
                        </button>
                        <p className="text-xs sm:text-sm text-center text-slate-400 mt-8 font-bold flex items-center justify-center gap-1.5 tracking-tight">
                            <RotateCcw size={14} className="text-hyundai-blue animate-spin-slow" /> 
                            <span>동일 카테고리 또는 다른 주제로 여러 번 질문을 반복 접수하실 수 있습니다.</span>
                        </p>
                    </div>
                  </section>
                </div>

                {/* Sidebar Stats & Info */}
                <div className="lg:col-span-4 space-y-8 sticky top-28">
                  {/* Interest Stats Card */}
                  <div className="bg-gradient-to-br from-hyundai-navy to-hyundai-darkblue text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-10">
                        <TrendingUp size={160} />
                    </div>

                    <h3 className="text-base md:text-lg font-black text-white flex items-center gap-2.5 mb-6">
                        <TrendingUp size={18} className="text-hyundai-blue" />
                        3년차 동기들이 주목하는 관심사
                    </h3>

                    <div className="space-y-6">
                        {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES['knowhow']][]).map(([key, cat]) => (
                          <div key={key}>
                            <div className="flex justify-between text-xs sm:text-sm font-bold mb-2">
                                <span className="opacity-80 break-keep">{cat.label}</span>
                                <span className="font-black text-hyundai-blue">{stats[key]}%</span>
                            </div>
                            <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${stats[key]}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`${cat.barColor} h-full rounded-full`} 
                                />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Education Info Card */}
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 space-y-5">
                    <h3 className="text-base md:text-lg font-black text-hyundai-navy flex items-center gap-2.5">
                        <Info size={20} className="text-hyundai-blue" />
                        교육 세션 안내
                    </h3>
                    <p className="text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed font-medium break-keep">
                        제출해주신 소중한 질문 데이터는 현장 선배 멘토진이 사전에 꼼꼼히 리뷰한 후, <strong className="text-hyundai-navy font-bold">선배와의 대화 세션</strong> 당일 현장에서 직접 깊이 있게 답변해 드립니다.
                    </p>
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                        <div className="bg-hyundai-ocean text-hyundai-blue p-3 rounded-xl shadow-sm">
                            <Calendar size={20} />
                        </div>
                        <div className="text-xs sm:text-sm md:text-base text-slate-700 font-extrabold leading-snug">
                            G4 Emerging LEADER 과정 1일차<br className="hidden md:block" /> (6/8 월) 오후
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-7xl mx-auto px-4 py-10 md:py-16"
            >
              {/* Dashboard Layout Header */}
              <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 pb-8 border-b border-slate-200/60">
                <div>
                  <div className="inline-flex items-center gap-2 bg-hyundai-navy text-white text-[10px] font-bold px-3.5 py-1.5 rounded-full mb-4 tracking-wider uppercase">
                    <Lock size={12} className="mr-1" /> Presentation Mode
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black text-hyundai-navy tracking-tighter">실시간 질문 대시보드</h1>
                  <p className="text-lg text-slate-500 mt-3 font-medium">G4 Emerging LEADER 과정 - 현장리더 선배들과의 실무 토크 세션</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button 
                    onClick={pickRandom}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-7 py-4 rounded-2xl shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 text-base"
                  >
                    <Dice5 size={20} /> 랜덤 질문 추첨기
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 font-bold px-5 py-4 rounded-2xl transition-all border border-slate-200 h-full flex items-center justify-center h-[60px]"
                    title="전체 리셋"
                  >
                    <Trash2 size={24} />
                  </button>
                </div>
              </header>

              {/* Real-time Category Stats */}
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
                <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-hyundai-navy to-hyundai-darkblue text-white p-7 rounded-3xl shadow-xl border border-white/5 flex flex-col justify-between">
                  <span className="text-xs font-bold opacity-70 tracking-widest uppercase">Total Questions</span>
                  <div className="flex items-baseline gap-2 mt-6">
                    <span className="text-5xl font-black tracking-tighter">{stats.total}</span>
                    <span className="text-base opacity-40 font-bold">건</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full mt-6 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-hyundai-blue shadow-[0_0_10px_#00AAD2]" />
                  </div>
                </div>
                
                {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES['knowhow']][]).map(([key, cat]) => (
                  <div key={key} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-tight">{cat.label.replace(' 설정', '')}</span>
                      <div className={`p-2 rounded-xl ${cat.accent}`}>
                         <cat.icon size={18} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-6">
                      <span className="text-4xl font-black text-slate-800 tracking-tighter">{stats.raw[key]}</span>
                      <span className="text-xs font-bold text-slate-300 uppercase">건</span>
                    </div>
                    <div className="w-full h-2 bg-slate-50 rounded-full mt-6 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.raw[key] / (stats.total || 1)) * 100}%` }}
                        className={`h-full ${cat.barColor}`} 
                      />
                    </div>
                  </div>
                ))}
              </section>

              {/* Master Filtering Board */}
              <section className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-100 mb-10 space-y-6">
                <div className="flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between border-b border-slate-50 pb-6">
                  <div className="space-y-6 flex-grow">
                    <div className="flex flex-wrap items-center gap-3">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest min-w-[120px] flex items-center gap-2">
                          <Info size={14} /> Category
                       </span>
                       <button onClick={() => setDashCatFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${dashCatFilter === 'all' ? 'bg-hyundai-navy text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>전체 보기</button>
                       {(Object.entries(CATEGORIES) as [keyof typeof CATEGORIES, typeof CATEGORIES['knowhow']][]).map(([key, cat]) => (
                         <button key={key} onClick={() => setDashCatFilter(key)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${dashCatFilter === key ? 'bg-hyundai-navy text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white'}`}>
                            {key === 'knowhow' && "🍊 "}
                            {key === 'relation' && "🤝 "}
                            {key === 'growth' && "🚀 "}
                            {key === 'casual' && "☕ "}
                            {cat.label}
                         </button>
                       ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest min-w-[120px] flex items-center gap-2">
                          <UserCheck size={14} /> Target Mentor
                       </span>
                       <button onClick={() => setDashMentorFilter('all')} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${dashMentorFilter === 'all' ? 'bg-hyundai-navy text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>전체 대상</button>
                       {(Object.entries(MENTORS) as [keyof typeof MENTORS, typeof MENTORS['branch']][]).map(([key, info]) => (
                         <button key={key} onClick={() => setDashMentorFilter(key)} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${dashMentorFilter === key ? 'bg-hyundai-navy text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:border-slate-300 hover:bg-white'}`}>
                            {key === 'branch' && "🏬 "}
                            {key === 'center' && "⚙️ "}
                            {info.label} 대상
                         </button>
                       ))}
                    </div>
                  </div>
                  
                  <div className="relative w-full xl:w-96">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="질문 키워드 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-13 pr-6 py-4.5 rounded-2xl border-2 border-slate-100 focus:border-hyundai-blue outline-none transition-all font-medium text-sm shadow-inner bg-slate-50/50" 
                    />
                  </div>
                </div>
              </section>

              {/* Dynamic Question Grid */}
              <section className="relative min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {filteredQuestions.length > 0 ? (
                    <motion.div 
                      layout
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                      {filteredQuestions.map(q => (
                        <motion.div
                          key={q.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="bg-white rounded-2xl p-7 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group ring-1 ring-slate-100"
                        >
                          <div className="space-y-5">
                            <div className="flex justify-between items-start">
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight flex items-center gap-1.5 ${CATEGORIES[q.category].accent}`}>
                                  {CATEGORIES[q.category].label}
                                </span>
                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight ${MENTORS[q.mentor].accent}`}>
                                  To. {MENTORS[q.mentor].label}
                                </span>
                              </div>
                              <button 
                                onClick={async () => {
                                  try {
                                    await deleteDoc(doc(db, 'questions', q.id as string));
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, `questions/${q.id}`);
                                  }
                                }}
                                className="text-slate-100 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg"
                                title="삭제"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <p className="text-slate-700 font-bold leading-relaxed text-base line-clamp-5 break-keep">
                              "{q.text}"
                            </p>
                          </div>
                          
                          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-300 tracking-widest uppercase">Anonymous Member</span>
                            <button 
                              onClick={() => setFocusedQuestion(q)}
                              className="bg-hyundai-navy hover:bg-hyundai-blue text-white font-black px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm hover:shadow-lg active:scale-95"
                            >
                              <Maximize2 size={14} /> 화면에 띄우기
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-32 text-center text-slate-300 flex flex-col items-center justify-center bg-white rounded-[40px] border-2 border-dashed border-slate-100"
                    >
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <MessageSquare size={32} className="opacity-20" />
                      </div>
                      <p className="text-xl font-black text-slate-400">등록된 질문이 없습니다.</p>
                      <p className="text-sm mt-2 text-slate-300 font-medium">검색어나 필터를 조정해보세요.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Corporate Footer */}
      <footer className="bg-white border-t border-slate-100 py-16 mt-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="bg-hyundai-navy inline-flex text-white font-black px-4 py-2 rounded text-sm mb-6 tracking-[0.2em]">HYUNDAI</div>
          <p className="text-slate-500 text-sm font-black mb-3">© 2026 HYUNDAI MOTOR COMPANY. All Rights Reserved.</p>
          <div className="max-w-2xl mx-auto h-[1px] bg-slate-100 mb-6" />
          <p className="text-slate-300 text-xs font-bold leading-relaxed max-w-lg mx-auto">
            본 플랫폼은 현대자동차 국내사업본부 G4 Emerging LEADER 과정의 원활한 소통을 위해 운영됩니다. 수집된 보이스는 데이터화되어 현장 리더십 세션 발전에 활용됩니다.
          </p>
        </div>
      </footer>

      {/* --- Reusable Modals --- */}

      {/* Transmission Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-hyundai-navy/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-10 md:p-14 max-w-md w-full text-center relative overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-hyundai-ocean rounded-full opacity-30 animate-pulse" />
              <div className="mx-auto w-24 h-24 rounded-full bg-hyundai-ocean text-hyundai-blue flex items-center justify-center mb-10 relative">
                <motion.div 
                   animate={{ scale: [1, 1.2, 1] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="absolute inset-0 rounded-full border-4 border-hyundai-blue opacity-10" 
                />
                <CheckCheck size={48} />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-hyundai-navy mb-4">전달이 완료되었습니다!</h3>
              <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed mb-10 break-keep">
                남겨주신 열정적인 질문은 안전하게 선배 리더님께 온전히 배달됩니다. 세션 당일 현장에서 깊이 있는 답변으로 만나요!
              </p>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full bg-hyundai-navy text-white font-black py-5 rounded-2xl shadow-xl shadow-hyundai-navy/20 hover:bg-hyundai-darkblue transition-all text-lg active:scale-95"
              >
                닫기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dash Admin Login */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-hyundai-darkblue/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-slate-100 text-hyundai-navy rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                <Lock size={32} />
              </div>
              <h3 className="text-2xl font-black text-hyundai-navy mb-3">대시보드 관리자 인증</h3>
              <p className="text-slate-400 text-xs font-bold mb-8 leading-relaxed">
                운영진 전용 화면입니다.<br/>보안 액세스 코드를 입력해 주세요.
              </p>
              
              <div className="space-y-5">
                <input 
                  type="password"
                  value={adminInput}
                  onChange={(e) => setAdminInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="••••••"
                  className={`w-full px-6 py-5 rounded-2xl border-2 text-center text-3xl font-black tracking-[0.4em] outline-none transition-all shadow-inner bg-slate-50/50 ${
                    loginError ? 'border-red-500 bg-red-50 animate-shake' : 'border-slate-100 focus:border-hyundai-blue'
                  }`}
                  autoFocus
                />
                
                <AnimatePresence>
                  {loginError && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 font-black text-xs">
                       <AlertTriangle size={14} className="inline mr-1" /> 인증 코드가 올바르지 않습니다.
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => { setShowAdminLogin(false); setAdminInput(''); setLoginError(false); }}
                    className="flex-grow bg-slate-100 text-slate-500 font-black py-4.5 rounded-2xl text-sm transition-all hover:bg-slate-200"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleAdminLogin}
                    className="flex-grow bg-hyundai-navy text-white font-black py-4.5 rounded-2xl text-sm hover:bg-hyundai-darkblue shadow-lg active:scale-95 transition-all"
                  >
                    인증하기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Dashboard Confirm */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-12 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertTriangle size={40} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4">질문 초기화</h3>
              <p className="text-slate-400 text-sm font-bold mb-10 leading-relaxed">
                대시보드 상의 모든 교육용 질문 데이터가<br/>완전히 삭제됩니다. 정말 진행하시겠습니까?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="bg-slate-100 text-slate-500 font-bold py-5 rounded-2xl text-base transition-all hover:bg-slate-200"
                >
                  취소
                </button>
                <button 
                  onClick={resetQuestions}
                  className="bg-red-500 text-white font-black py-5 rounded-2xl text-base hover:bg-red-600 shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                >
                  초기화 진행
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full-Screen Focus View (The Presentation Screen) */}
      <AnimatePresence>
        {focusedQuestion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 lg:p-12 bg-hyundai-darkblue/98 backdrop-blur-2xl overflow-hidden">
             <motion.button 
               whileHover={{ scale: 1.1, rotate: 90 }}
               whileTap={{ scale: 0.9 }}
               onClick={() => setFocusedQuestion(null)}
               className="absolute top-10 right-10 text-white bg-white/5 border border-white/10 p-5 rounded-full hover:bg-white/15 transition-all"
             >
               <X size={32} />
             </motion.button>

             <motion.div 
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                className="max-w-[1400px] w-full bg-white rounded-[60px] p-12 md:p-16 lg:p-24 shadow-[0_50px_100px_rgba(0,0,0,0.4)] relative"
             >
                {/* Visual Backdrop decoration */}
                <div className="absolute top-10 right-20 font-black text-[300px] text-slate-50 select-none pointer-events-none tracking-tighter opacity-10 leading-none">Q</div>
                
                <div className="relative space-y-16">
                  {/* Tags & Header Section */}
                  <div className="flex flex-col md:flex-row md:items-center gap-6">
                    <span className={`inline-flex px-8 py-3 rounded-2xl text-xs md:text-sm font-black text-white ${CATEGORIES[focusedQuestion.category].barColor} shadow-xl shadow-slate-100 uppercase tracking-widest`}>
                      {CATEGORIES[focusedQuestion.category].label}
                    </span>
                    <span className="inline-flex px-8 py-3 rounded-2xl text-xs md:text-sm font-black text-hyundai-navy bg-hyundai-ocean border border-hyundai-blue/20 shadow-sm uppercase tracking-widest">
                      To. {MENTORS[focusedQuestion.mentor].label} 대상 보이스
                    </span>
                    <div className="hidden md:block flex-grow h-[2px] bg-slate-50" />
                  </div>

                  {/* Main Question (Super Large Font for Projectors) */}
                  <div className="min-h-[300px] flex items-center">
                    <p className="text-3xl md:text-5xl lg:text-7xl font-black text-hyundai-navy leading-[1.3] md:leading-[1.1] tracking-tighter break-keep">
                        "{focusedQuestion.text}"
                    </p>
                  </div>

                  {/* Bottom Tooling */}
                  <div className="pt-16 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-8">
                    <div className="flex items-center gap-5">
                      <div className="relative flex">
                         <div className="w-5 h-5 bg-emerald-500 rounded-full animate-ping opacity-25" />
                         <div className="absolute inset-0 w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,1)]" />
                      </div>
                      <div className="text-left">
                        <span className="block text-slate-400 font-black uppercase tracking-widest text-xs md:text-sm">Real-time G4 Voice Insight</span>
                        <span className="text-slate-200 text-[10px] font-bold">LIVE STREAMING ACTIVE</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setFocusedQuestion(null)}
                      className="bg-hyundai-navy text-white px-12 py-5 rounded-[24px] font-black text-lg md:text-xl lg:text-2xl hover:bg-hyundai-blue transition-all duration-300 flex items-center gap-4 shadow-2xl shadow-hyundai-navy/30 group active:scale-95"
                    >
                      <ArrowLeft className="w-6 h-6 md:w-8 md:h-8 group-hover:-translate-x-2 transition-transform" /> 
                      <span>뒤로가기</span>
                    </button>
                  </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
