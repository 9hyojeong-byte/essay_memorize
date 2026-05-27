import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  Edit, 
  Check, 
  Eye, 
  EyeOff, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  Sparkles, 
  Compass, 
  HelpCircle, 
  Info, 
  X, 
  Award,
  ArrowUpDown,
  BookOpen,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import Header from "./components/Header";
import CalendarView from "./components/CalendarView";
import DatabaseSettings from "./components/DatabaseSettings";
import EssayCard from "./components/EssayCard";
import TranslateProgress from "./components/TranslateProgress";

import { Essay, EssaySentence, SyncConfig } from "./types";
import { 
  getEssays, 
  createEssay, 
  updateEssay, 
  deleteEssay, 
  getGasConfig, 
  saveGasConfig 
} from "./db";

type FilterType = "all" | "favorites" | "lowestConfidence";

export default function App() {
  // Navigation & State Management
  const [currentView, setCurrentView] = useState<"home" | "write" | "detail" | "memorize">("home");
  const [essays, setEssays] = useState<Essay[]>([]);
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null);
  const [isCloudActive, setIsCloudActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Home View Settings
  const [viewType, setViewType] = useState<"list" | "calendar">("list");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Write Screen State
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingEssayId, setEditingEssayId] = useState<string | null>(null);
  const [writeTitle, setWriteTitle] = useState("");
  const [writeMemo, setWriteMemo] = useState("");
  const [koreanInputs, setKoreanInputs] = useState<string[]>([""]); // starts with one sentence
  const [englishSentences, setEnglishSentences] = useState<string[]>([]);
  const [sentenceConfidenceList, setSentenceConfidenceList] = useState<number[]>([]);
  const [translateStatus, setTranslateStatus] = useState<"idle" | "sending" | "parsing" | "completing" | "error">("idle");
  const [translateError, setTranslateError] = useState("");

  // Detail Screen State
  const [showEnglishInDetail, setShowEnglishInDetail] = useState(false);

  // Memorize Screen State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardRevealEnglish, setCardRevealEnglish] = useState(false);
  const [cardConfidenceStates, setCardConfidenceStates] = useState<number[]>([]); // sentence level confidence states

  // Load essays on init
  const loadDatabase = async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      const config = getGasConfig();
      setIsCloudActive(config.useCloudDb && !!config.gasUrl);
      
      const res = await getEssays();
      setEssays(res.essays);
      if (res.error) {
        setGeneralError(res.error);
      }
    } catch (err: any) {
      setGeneralError("데이터베이스를 불라들이는데 실패했습니다. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Sync state helper
  const refreshDbStatus = () => {
    const config = getGasConfig();
    setIsCloudActive(config.useCloudDb && !!config.gasUrl);
  };

  // Memoized search / filter / sort
  const processedEssays = useMemo(() => {
    let result = [...essays];

    // Search Query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (essay) =>
          essay.title.toLowerCase().includes(query) ||
          essay.memo.toLowerCase().includes(query) ||
          essay.sentences.some(s => s.ko.toLowerCase().includes(query) || s.en.toLowerCase().includes(query))
      );
    }

    // Filter Type Actions
    if (filterType === "favorites") {
      result = result.filter((e) => e.isFavorite);
    } else if (filterType === "lowestConfidence") {
      result = result.sort((a, b) => a.confidence - b.confidence);
    } else {
      // default: newest creation date first
      result = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [essays, filterType, searchQuery]);

  // Handle Quick Toggle Favorite directly on Main Dashboard Card list
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // preserve navigate action
    const essay = essays.find((item) => item.id === id);
    if (!essay) return;

    const newValue = !essay.isFavorite;
    
    // Quick local state state-update for immediate UI responsiveness
    setEssays(prev => prev.map(item => item.id === id ? { ...item, isFavorite: newValue } : item));

    try {
      await updateEssay(id, { isFavorite: newValue });
    } catch (err: any) {
      setGeneralError("즐겨찾기 상태 변경에 실패하였습니다: " + err.message);
    }
  };

  // Navigation callbacks
  const navigateToHome = () => {
    setCurrentView("home");
    setSelectedEssayId(null);
    setEditingEssayId(null);
    setIsEditingExisting(false);
    loadDatabase(); // refresh dashboard
  };

  const navigateToWrite = () => {
    // Reset write states
    setIsEditingExisting(false);
    setEditingEssayId(null);
    setWriteTitle("");
    setWriteMemo("");
    setKoreanInputs([""]);
    setEnglishSentences([]);
    setSentenceConfidenceList([]);
    setTranslateStatus("idle");
    setTranslateError("");
    setCurrentView("write");
  };

  const navigateToEdit = (essay: Essay) => {
    setIsEditingExisting(true);
    setEditingEssayId(essay.id);
    setWriteTitle(essay.title);
    setWriteMemo(essay.memo);
    setKoreanInputs(essay.sentences.map(s => s.ko));
    setEnglishSentences(essay.sentences.map(s => s.en));
    setSentenceConfidenceList(essay.sentences.map(s => s.confidence));
    setTranslateStatus("idle");
    setTranslateError("");
    setCurrentView("write");
  };

  const navigateToDetail = (id: string) => {
    setSelectedEssayId(id);
    setShowEnglishInDetail(false);
    setCurrentView("detail");
  };

  // Start memorization session
  const startMemorizeSession = (essay: Essay) => {
    setSelectedEssayId(essay.id);
    setCurrentCardIndex(0);
    setCardRevealEnglish(false);
    setCardConfidenceStates(essay.sentences.map(s => s.confidence));
    setCurrentView("memorize");
  };

  // "외워보기" Clicked on Header Navigation - Lower Confidence Selected
  const triggerAutoMemorizeSession = () => {
    if (essays.length === 0) {
      alert("등록된 에세이가 없습니다. 우측의 '새 에세이 쓰기' 버튼을 클릭하여 첫 에세이를 먼저 생성하세요!");
      return;
    }
    // Sort logic: ascending confidence (lowest first)
    const sorted = [...essays].sort((a, b) => a.confidence - b.confidence);
    const lowestEssay = sorted[0];
    startMemorizeSession(lowestEssay);
  };

  // Manage individual sentence inputs
  const handleKoreanInputChange = (index: number, val: string) => {
    const updated = [...koreanInputs];
    updated[index] = val;
    setKoreanInputs(updated);
  };

  const addSentenceInputRow = () => {
    setKoreanInputs([...koreanInputs, ""]);
  };

  const removeSentenceInputRow = (index: number) => {
    if (koreanInputs.length === 1) return; // preserve at least one sentence
    const updatedKo = koreanInputs.filter((_, i) => i !== index);
    setKoreanInputs(updatedKo);

    if (englishSentences.length > index) {
      const updatedEn = englishSentences.filter((_, i) => i !== index);
      setEnglishSentences(updatedEn);
    }
  };

  // CALL SERVER GEMINI API to generate English translation & summary title suggestion
  const generateEnglishTranslation = async () => {
    const cleanKo = koreanInputs.map(item => item.trim()).filter(Boolean);
    if (cleanKo.length === 0) {
      alert("구문을 하나 이상 입력해 주셔야 영어 문장 변환이 가능합니다!");
      return;
    }

    setTranslateError("");
    setTranslateStatus("sending");

    try {
      const response = await fetch("/api/generate-essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences: cleanKo }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      setTranslateStatus("parsing");
      const data = await response.json();
      
      setTranslateStatus("completing");
      // Set results
      if (data.title && !writeTitle.trim()) {
        setWriteTitle(data.title);
      }
      if (data.translations && Array.isArray(data.translations)) {
        // align 1-to-1 with input size
        const alignedEnglish: string[] = [];
        const alignedConf: number[] = [];
        
        cleanKo.forEach((_, idx) => {
          alignedEnglish[idx] = data.translations[idx] || "";
          alignedConf[idx] = sentenceConfidenceList[idx] || 0;
        });

        setEnglishSentences(alignedEnglish);
        setSentenceConfidenceList(alignedConf);
      }
      setTranslateStatus("idle");
    } catch (err: any) {
      console.error(err);
      setTranslateStatus("error");
      setTranslateError(err.message || "Gemini 변환 연산 도중 오류가 발생했습니다.");
    }
  };

  // English input change handler
  const handleEnglishInputChange = (index: number, val: string) => {
    const updated = [...englishSentences];
    updated[index] = val;
    setEnglishSentences(updated);
  };

  // Save the Essay to custom storage
  const handleSaveEssay = async () => {
    const cleanKo = koreanInputs.map(item => item.trim()).filter(Boolean);
    if (!writeTitle.trim()) {
      alert("에세이의 제목을 성실하게 기재해 주세요!");
      return;
    }
    if (cleanKo.length === 0) {
      alert("최소 한 줄 이상의 한국어 문장을 기입해 주세요.");
      return;
    }

    // construct raw model structures
    const sentencesPayload: EssaySentence[] = cleanKo.map((koVal, idx) => ({
      ko: koVal,
      en: englishSentences[idx] || "",
      confidence: sentenceConfidenceList[idx] || 0
    }));

    const isFav = essays.find(e => e.id === editingEssayId)?.isFavorite || false;
    const existingConfidence = essays.find(e => e.id === editingEssayId)?.confidence || 0;

    const targetEssay: Essay = {
      id: isEditingExisting && editingEssayId ? editingEssayId : "essay_" + Date.now(),
      title: writeTitle,
      createdAt: isEditingExisting && editingEssayId 
        ? (essays.find(e => e.id === editingEssayId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentences: sentencesPayload,
      memo: writeMemo,
      isFavorite: isFav,
      confidence: existingConfidence
    };

    setLoading(true);
    try {
      if (isEditingExisting && editingEssayId) {
        await updateEssay(editingEssayId, targetEssay);
      } else {
        await createEssay(targetEssay);
      }
      navigateToHome();
    } catch (err: any) {
      alert("저장하는 도중 오류가 발생했습니다: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Detail view computations
  const activeEssay = useMemo(() => {
    if (!selectedEssayId) return null;
    return essays.find(e => e.id === selectedEssayId) || null;
  }, [essays, selectedEssayId]);

  // Essay level confidence adjuster
  const adjustEssayConfidence = async (amount: number) => {
    if (!activeEssay) return;
    const newConf = activeEssay.confidence + amount;
    
    // speed update local UI
    setEssays(prev => prev.map(e => e.id === activeEssay.id ? { ...e, confidence: newConf } : e));

    try {
      await updateEssay(activeEssay.id, { confidence: newConf });
    } catch (err: any) {
      setGeneralError("에세이 자신감 수치 동기화에 실패했습니다: " + err.message);
    }
  };

  // Sentence level confidence adjuster in Memorize Card view
  const adjustCardConfidence = async (sentenceIndex: number, amount: number) => {
    if (!activeEssay) return;

    const updatedSentences = [...activeEssay.sentences];
    const currentConf = updatedSentences[sentenceIndex].confidence || 0;
    const newConf = currentConf + amount;
    
    updatedSentences[sentenceIndex] = {
      ...updatedSentences[sentenceIndex],
      confidence: newConf
    };

    // calculate total confidence (the user wants to manage overall average confidence)
    const avgScore = Math.round(updatedSentences.reduce((sum, s) => sum + s.confidence, 0) / updatedSentences.length);

    // Sync locally
    setEssays(prev => prev.map(e => e.id === activeEssay.id ? { ...e, sentences: updatedSentences, confidence: avgScore } : e));
    setCardConfidenceStates(updatedSentences.map(s => s.confidence));

    try {
      await updateEssay(activeEssay.id, { 
        sentences: updatedSentences,
        confidence: avgScore 
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Delete essay
  const handleDeleteEssay = async (id: string) => {
    if (!window.confirm("정말로 이 에세이를 완전히 삭제하시겠습니까? 복구할 수 없습니다.")) return;
    
    setLoading(true);
    try {
      await deleteEssay(id);
      navigateToHome();
    } catch (err: any) {
      alert("삭제 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-905 flex flex-col pb-16">
      
      {/* Header Container */}
      <Header
        currentView={currentView}
        onBack={navigateToHome}
        onOpenSettings={() => setShowSettings(!showSettings)}
        isCloudActive={isCloudActive}
      />

      <main className="flex-1 w-full max-w-lg mx-auto px-6 py-6 space-y-6">
        
        {/* Sync or general alert notifications */}
        {generalError && (
          <div className="bg-rose-50 border border-rose-150 p-4 rounded-3xl flex items-start space-x-3 text-xs text-rose-700 animate-fadeIn">
            <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold font-display uppercase tracking-widest text-[9.5px] block mb-0.5">Notification</span> {generalError}
            </div>
            <button 
              onClick={() => setGeneralError(null)}
              className="p-1 hover:bg-rose-100 rounded-full text-rose-500 select-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Apps Script Settings Box */}
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <DatabaseSettings
              onClose={() => setShowSettings(false)}
              onSyncComplete={() => {
                setShowSettings(false);
                loadDatabase();
              }}
            />
          </motion.div>
        )}

        {/* -------------------- VIEW 1: HOME VIEW -------------------- */}
        {currentView === "home" && (
          <div className="space-y-6 animate-fadeIn" id="view-home">
            
            {/* Top Quick Action button rails */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={triggerAutoMemorizeSession}
                className="group relative overflow-hidden bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-3xl transition-all duration-300 shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center justify-center text-center space-y-2 transform active:scale-98 select-none font-display"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <span className="block font-bold text-[14px] uppercase tracking-wider">Smart Study</span>
                  <span className="block text-[10px] text-indigo-200">Confidence 취약순 자동 시작</span>
                </div>
              </button>

              <button
                onClick={navigateToWrite}
                className="group relative overflow-hidden bg-white border border-slate-200 hover:border-indigo-500 p-6 rounded-3xl transition-all duration-300 shadow-2xs hover:shadow-xs cursor-pointer flex flex-col items-center justify-center text-center space-y-2 transform active:scale-98 select-none font-display"
              >
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <span className="block font-bold text-[14px] text-slate-800 group-hover:text-indigo-600 transition uppercase tracking-wider">New Essay</span>
                  <span className="block text-[10px] text-slate-400 font-sans">문장 입력 후 영문 자동 생성</span>
                </div>
              </button>
            </div>

            {/* View transition bar */}
            <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex space-x-1 flex-1 max-w-[210px]">
                <button
                  onClick={() => setViewType("list")}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] tracking-widest uppercase font-black font-display flex items-center justify-center space-x-1 cursor-pointer transition ${
                    viewType === "list" 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50" 
                      : "text-slate-450 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>List View</span>
                </button>
                <button
                  onClick={() => setViewType("calendar")}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] tracking-widest uppercase font-black font-display flex items-center justify-center space-x-1 cursor-pointer transition ${
                    viewType === "calendar" 
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100/50" 
                      : "text-slate-450 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Calendar</span>
                </button>
              </div>

              {/* Minimal filter select bar */}
              {viewType === "list" && (
                <div className="flex items-center space-x-1">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className="text-[10px] font-black uppercase tracking-wider font-display bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 outline-hidden focus:border-indigo-505 cursor-pointer"
                  >
                    <option value="all">ALL ESSAYS</option>
                    <option value="favorites">FAVORITES ★</option>
                    <option value="lowestConfidence">NEEDS REVIEW ⚠️</option>
                  </select>
                </div>
              )}
            </div>

            {/* Quick search input */}
            {viewType === "list" && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4.5 top-4" />
                <input
                  type="text"
                  placeholder="제목, 내용, 키워드로 에세이 찾기..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-14 py-3.5 bg-white border border-slate-200 rounded-2xl text-xs placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 transition-all font-medium shadow-2xs"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-3.5 text-[10px] font-black font-display text-slate-400 hover:text-indigo-600 uppercase tracking-widest cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            )}

            {/* Content Lists rendering */}
            {viewType === "calendar" ? (
              <CalendarView 
                essays={essays} 
                onSelectEssay={navigateToDetail} 
              />
            ) : (
              <div className="space-y-4">
                {processedEssays.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl space-y-4">
                    <BookOpen className="w-10 h-10 text-slate-350 mx-auto" />
                    <div className="space-y-1.5 px-6">
                      <p className="text-sm font-bold text-slate-700 font-display uppercase tracking-wider">Empty Database</p>
                      <p className="text-xs text-slate-400 font-medium">새 에세이를 만들거나 구글 동기화 필터를 변경해 보세요.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {processedEssays.map((essay) => (
                      <EssayCard
                        key={essay.id}
                        essay={essay}
                        onSelect={navigateToDetail}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* -------------------- VIEW 2: WRITE / EDIT ESSAY VIEW -------------------- */}
        {currentView === "write" && (
          <div className="space-y-6 animate-fadeIn" id="view-write">
            
            {/* Main edit card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Title Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between font-display">
                  <span>에세이 제목 (제목은 영문 빌딩 시 자동 추천됩니다)</span>
                  <span className="text-[9px] text-slate-400 font-normal font-mono text-right normal-case">ESSAY TITLE</span>
                </label>
                <input
                  type="text"
                  placeholder="주제 또는 멋진 제목을 입력하세요 (미입력 시 문맥에 맞춰 자동 생성)"
                  value={writeTitle}
                  onChange={(e) => setWriteTitle(e.target.value)}
                  className="w-full text-xs p-4 bg-slate-50 hover:bg-slate-100/40 focus:bg-white focus:border-indigo-550 border border-slate-200 outline-hidden rounded-2xl text-slate-800 font-bold transition-all placeholder-slate-400 shadow-3xs"
                />
              </div>

              {/* Korean sentences manager (한 문장씩 작성) */}
              <div className="space-y-3.5 border-t border-b border-slate-100 py-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="block text-xs font-bold text-slate-800 font-display uppercase tracking-wider">들려줄 각 본문 문장</span>
                    <span className="block text-[10.5px] text-slate-450 font-medium">한 문장씩 개별 칸에 한글로 기재해 주세요.</span>
                  </div>
                  <button
                    onClick={addSentenceInputRow}
                    className="px-3.5 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/80 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all flex items-center space-x-1 font-display shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ADD BLOCK</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {koreanInputs.map((val, idx) => (
                    <div key={`ko-input-${idx}`} className="space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-[10px] font-black tracking-widest font-display text-slate-400 px-1">
                        <span>SENTENCE BLOCK {idx + 1}</span>
                        {koreanInputs.length > 1 && (
                          <button
                            onClick={() => removeSentenceInputRow(idx)}
                            className="text-rose-500 hover:text-rose-700 transition font-display font-bold uppercase text-[9px] tracking-wider cursor-pointer"
                          >
                            REMOVE
                          </button>
                        )}
                      </div>
                      
                      {/* Korean box */}
                      <input
                        type="text"
                        placeholder="이곳에 한국어 문장을 소신껏 작성하세요."
                        value={val}
                        onChange={(e) => handleKoreanInputChange(idx, e.target.value)}
                        className="w-full text-xs p-3.5 bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-200 outline-none focus:border-indigo-500 rounded-xl text-slate-800 transition-all font-medium"
                      />

                      {/* Aligned English box (Only visible after clicking Translate to English) */}
                      {englishSentences.length > idx && (
                        <div className="mt-1.5 flex items-center space-x-2 pl-3 border-l-2 border-indigo-500">
                          <input
                            type="text"
                            placeholder="생성된 영어 번역문 (직접 마이닝 수정 가능)"
                            value={englishSentences[idx]}
                            onChange={(e) => handleEnglishInputChange(idx, e.target.value)}
                            className="w-full text-xs p-2 bg-indigo-50/20 border border-indigo-100 text-indigo-700 font-bold rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Memo textbox */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-display">학습 메모 / 키워드 요약</label>
                <textarea
                  placeholder="기억해 두고 싶은 핵심 구문, 어휘 혹은 실수를 방지할 단어들을 적어 두세요."
                  rows={2}
                  value={writeMemo}
                  onChange={(e) => setWriteMemo(e.target.value)}
                  className="w-full text-xs p-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-505 outline-none rounded-2xl text-slate-800 leading-relaxed font-semibold transition-all shadow-3xs"
                />
              </div>

              {/* Gemini Translation Status loading widget */}
              <TranslateProgress status={translateStatus} errorMessage={translateError} onRetry={generateEnglishTranslation} />

              {/* Bottom actionable controls */}
              <div className="space-y-3.5 border-t border-slate-100 pt-5">
                <button
                  onClick={generateEnglishTranslation}
                  disabled={translateStatus !== "idle" && translateStatus !== "error"}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 font-display"
                >
                  <Sparkles className="w-4.5 h-4.5 text-indigo-200" />
                  <span>TRANSLATE & RECOMMEND TITLE</span>
                </button>

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    onClick={navigateToHome}
                    className="py-3.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition cursor-pointer text-center font-display shadow-2xs"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleSaveEssay}
                    className="py-3.5 bg-slate-900 hover:bg-black border border-transparent text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition cursor-pointer text-center font-display shadow-xs"
                  >
                    SAVE ESSAY
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* -------------------- VIEW 3: DETAIL ESSAY VIEW -------------------- */}
        {currentView === "detail" && activeEssay && (
          <div className="space-y-6 animate-fadeIn" id="view-detail">
            
            {/* Header control buttons */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-405 font-extrabold font-display uppercase tracking-wider">
                CREATED ON {new Date(activeEssay.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateToEdit(activeEssay)}
                  className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition cursor-pointer shadow-3xs"
                  title="에세이 수정"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteEssay(activeEssay.id)}
                  className="p-2.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer shadow-3xs"
                  title="에세이 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Giant Memorize Launch Card */}
            <div className="relative overflow-hidden bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-4">
              <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-600/20 rounded-full blur-xl" />
              
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                  <h2 className="text-xl font-extrabold tracking-tight text-white leading-snug">
                    {activeEssay.title}
                  </h2>
                </div>
                
                {/* Confidence Meter Badge inside detail */}
                <div className="flex flex-col items-end space-y-1 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-display">CONFIDENCE</span>
                  <div className="flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                    <span className="text-amber-400 text-xs">★</span>
                    <strong className="text-xs font-black font-mono text-slate-100">
                      {activeEssay.confidence > 0 ? `+${activeEssay.confidence}` : activeEssay.confidence}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Main Memorize Trigger */}
              <button
                onClick={() => startMemorizeSession(activeEssay)}
                className="w-full flex items-center justify-center space-x-2.5 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-indigo-900/40 text-xs cursor-pointer transform active:scale-98 font-display"
              >
                <Sparkles className="w-4.5 h-4.5 text-indigo-200 animate-pulse" />
                <span>START MEMORIZING</span>
              </button>
            </div>

            {/* Main content body card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* English Show/Hide toggler */}
              <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-3xs">
                <div className="space-y-0.5">
                  <span className="block text-xs font-bold text-slate-800 font-display uppercase tracking-wider">번역 영문장 일괄 보기</span>
                  <span className="block text-[10.5px] text-slate-450 font-medium">영어 훈련을 돕기 위해 해석본을 포함합니다.</span>
                </div>
                <button
                  onClick={() => setShowEnglishInDetail(!showEnglishInDetail)}
                  className={`px-3.5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center space-x-1 cursor-pointer transition font-display border ${
                    showEnglishInDetail 
                      ? "bg-indigo-50 border-indigo-150 text-indigo-700" 
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-150"
                  }`}
                >
                  {showEnglishInDetail ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>ON</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>OFF</span>
                    </>
                  )}
                </button>
              </div>

              {/* Confidence Tuning Area */}
              <div className="border border-indigo-50/50 bg-indigo-50/10 p-5 rounded-2xl space-y-3.5">
                <h3 className="text-xs font-bold text-slate-700 flex items-center font-display uppercase tracking-wider">
                  <Award className="w-4 h-4 text-indigo-500 mr-1.5" />
                  Confidence Score Tuning
                </h3>
                
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-3xs">
                  <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest font-display">CURRENT VALUE :</span>
                  <span className={`text-xs font-black font-mono px-3 py-1 rounded-lg ${
                    activeEssay.confidence < 0 
                      ? "text-rose-600 bg-rose-50 border border-rose-150" 
                      : activeEssay.confidence > 0
                        ? "text-emerald-600 bg-emerald-50 border border-emerald-150"
                        : "text-slate-500 bg-slate-50 border border-slate-200"
                  }`}>
                    {activeEssay.confidence > 0 ? `+${activeEssay.confidence}` : activeEssay.confidence}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => adjustEssayConfidence(-1)}
                    className="py-3 px-4 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-250 text-rose-600 text-[10.5px] font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer font-display shadow-2xs"
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>DOWN (-1)</span>
                  </button>
                  <button
                    onClick={() => adjustEssayConfidence(1)}
                    className="py-3 px-4 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-250 text-emerald-600 text-[10.5px] font-black uppercase tracking-widest rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer font-display shadow-2xs"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>UP (+1)</span>
                  </button>
                </div>
              </div>

              {/* Sentence list listing */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display block">문장 목록 ({activeEssay.sentences.length}개)</h3>
                
                <div className="space-y-5 divide-y divide-slate-100">
                  {activeEssay.sentences.map((sent, idx) => (
                    <div key={`detail-sent-${idx}`} className={`pt-4.5 ${idx === 0 ? "pt-0" : ""} space-y-1.5`}>
                      <div className="flex items-center justify-between text-[10px] font-black tracking-widest font-display text-slate-400">
                        <span>SENTENCE {idx + 1}</span>
                        {sent.confidence !== 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-display ${
                            sent.confidence > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100/60" : "bg-rose-50 text-rose-600 border border-rose-100/60"
                          }`}>
                            SCORE {sent.confidence > 0 ? `+${sent.confidence}` : sent.confidence}
                          </span>
                        )}
                      </div>
                      
                      {/* Korean version */}
                      <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                        {sent.ko}
                      </p>

                      {/* English version - depends on showEnglishInDetail toggler */}
                      {showEnglishInDetail && sent.en && (
                        <p className="text-xs text-indigo-600 font-semibold leading-relaxed bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/30">
                          {sent.en}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Memo display */}
              {activeEssay.memo && (
                <div className="border-t border-slate-100 pt-5 space-y-2">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-400 font-display uppercase">학습 메모</h4>
                  <p className="bg-slate-50 border border-slate-205 text-xs text-slate-600 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-medium">
                    {activeEssay.memo}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

        {/* -------------------- VIEW 4: MEMORIZE (카드 학습) VIEW -------------------- */}
        {currentView === "memorize" && activeEssay && (
          <div className="space-y-6 animate-fadeIn" id="view-memorize">
            
            {/* Active essay tracking banner */}
            <div className="bg-white border border-slate-200 rounded-3xl px-5 py-4 flex items-center justify-between shadow-3xs">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest font-display">ACTIVE STUDY</span>
                <h4 className="text-xs font-bold text-slate-800 truncate leading-none mt-1">{activeEssay.title}</h4>
              </div>
              <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-3.5 py-1.5 rounded-full font-mono shrink-0 uppercase tracking-wider">
                CARD {currentCardIndex + 1} / {activeEssay.sentences.length}
              </div>
            </div>

            {/* PROGRESS BAR BAR */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${((currentCardIndex + 1) / activeEssay.sentences.length) * 100}%` }}
              />
            </div>

            {/* MAIN FLASH CARD INTERACTION */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`card-slide-${currentCardIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[320px] justify-between relative"
              >
                
                {/* Sentence Number card graphic watermark */}
                <div className="absolute right-6 top-5 text-[64px] font-black text-slate-100 leading-none select-none font-mono">
                  {String(currentCardIndex + 1).padStart(2, "0")}
                </div>

                <div className="space-y-4 pt-4 relative z-10 flex-1 flex flex-col justify-center">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block text-center mb-2 font-display">
                    한국어 해석을 보고 연상되는 영어 구문을 생각해보세요
                  </span>
                  
                  {/* Central Korean Meaning typography */}
                  <h3 className="text-base font-bold text-slate-800 text-center leading-relaxed max-w-sm mx-auto select-all">
                    {activeEssay.sentences[currentCardIndex]?.ko}
                  </h3>
                </div>

                {/* English solution cards */}
                <div className="space-y-4 border-t border-slate-100 pt-6 mt-6 z-10">
                  {cardRevealEnglish ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-indigo-50/50 border border-indigo-100 text-indigo-805 p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1.5"
                    >
                      <span className="text-[9px] uppercase font-black text-indigo-400 tracking-wider font-display">정답 영문장 (ANSWER)</span>
                      <p className="text-xs font-black leading-relaxed select-all">
                        {activeEssay.sentences[currentCardIndex]?.en || "생성된 영어 문장이 없습니다."}
                      </p>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setCardRevealEnglish(true)}
                      className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 hover:text-indigo-700 border border-indigo-100 rounded-2xl transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs font-display"
                    >
                      <Eye className="w-4 h-4" />
                      <span>SHOW ENGLISH TRANSLATION</span>
                    </button>
                  )}

                  {/* Micro levels confidence updater at the card level */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between animate-fadeIn">
                    <span className="text-[10px] text-slate-405 font-black uppercase tracking-widest font-display leading-none">CONFIDENCE :</span>
                    
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => adjustCardConfidence(currentCardIndex, -1)}
                        className="p-1 px-3 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider font-display transition flex items-center space-x-0.5 cursor-pointer shadow-3xs"
                        title="자신감 다운"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>DOWN</span>
                      </button>

                      <span className={`text-xs font-black font-mono px-3 py-1 rounded-lg ${
                        (cardConfidenceStates[currentCardIndex] || 0) < 0
                          ? "text-rose-600 bg-rose-50 border border-rose-100"
                          : (cardConfidenceStates[currentCardIndex] || 0) > 0
                            ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
                            : "text-slate-500 bg-white border border-slate-200"
                      }`}>
                        {(cardConfidenceStates[currentCardIndex] || 0) > 0 ? `+${cardConfidenceStates[currentCardIndex]}` : cardConfidenceStates[currentCardIndex] || 0}
                      </span>

                      <button
                        onClick={() => adjustCardConfidence(currentCardIndex, 1)}
                        className="p-1 px-3 bg-white hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider font-display transition flex items-center space-x-0.5 cursor-pointer shadow-3xs"
                        title="자신감 업"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>UP</span>
                      </button>
                    </div>
                  </div>
                </div>

              </motion.div>
            </AnimatePresence>

            {/* Left / Right Card Slider Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (currentCardIndex > 0) {
                    setCurrentCardIndex(currentCardIndex - 1);
                    setCardRevealEnglish(false);
                    // Read the sentence audio if available
                    const speech = activeEssay.sentences[currentCardIndex - 1]?.ko;
                    if (speech && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }
                }}
                disabled={currentCardIndex === 0}
                className="py-3 px-5 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-650 transition flex items-center space-x-1 cursor-pointer disabled:opacity-40 font-display shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREV CARD</span>
              </button>

              {currentCardIndex < activeEssay.sentences.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentCardIndex(currentCardIndex + 1);
                    setCardRevealEnglish(false);
                  }}
                  className="py-3 px-5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-150 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-700 transition flex items-center space-x-1 cursor-pointer font-display shadow-2xs"
                >
                  <span>NEXT CARD</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={navigateToHome}
                  className="py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center space-x-1 cursor-pointer font-display shadow-sm"
                >
                  <Check className="w-4 h-4 text-indigo-100" />
                  <span>COMPLETE!</span>
                </button>
              )}
            </div>

            {/* Interactive instructions helper cards */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-slate-100 flex items-start space-x-4">
              <HelpCircle className="w-6 h-6 text-indigo-405 shrink-0 select-none animate-pulse" />
              <div className="space-y-1">
                <h5 className="font-extrabold text-xs text-slate-200 font-display uppercase tracking-wider">Self-Diagnostic Learning Tip</h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-medium">
                  한글 해석을 본 뒤 영문 구문 구조를 머릿속으로 소리 내어 말해보세요. 이후 <span className="text-indigo-300 font-bold">정답 영어</span>를 확인하여, 틀린 전치사나 수식어가 있었다면 <strong>DOWN</strong>을, 완벽하게 연상했다면 <strong>UP</strong>을 선택하여 취약점을 점검해 나가세요!
                </p>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
