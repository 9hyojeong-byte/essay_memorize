import React from "react";
import { ChevronLeft, Database, Sparkles, BookOpen } from "lucide-react";

interface HeaderProps {
  currentView: "home" | "write" | "detail" | "memorize";
  onBack: () => void;
  onOpenSettings: () => void;
  isCloudActive: boolean;
}

export default function Header({ currentView, onBack, onOpenSettings, isCloudActive }: HeaderProps) {
  const getTitle = () => {
    switch (currentView) {
      case "home":
        return "스마트 에세이 기억기";
      case "write":
        return "새 에세이 쓰기";
      case "detail":
        return "에세이 상세 정보";
      case "memorize":
        return "외워보기 카드 학습";
      default:
        return "기억기";
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/96 backdrop-blur-md border-b border-slate-200 px-6 py-5 flex-shrink-0" id="app-global-header">
      <div className="max-w-md mx-auto flex items-center justify-between">
        
        {/* Left Side: Back Button or App Logo */}
        <div className="flex items-center space-x-3">
          {currentView !== "home" ? (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 rounded-full cursor-pointer transition-all duration-200 flex items-center justify-center space-x-1 font-semibold text-xs shrink-0 shadow-2xs"
              aria-label="뒤로 가기"
            >
              <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="leading-none pr-0.5">BACK</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg font-display shadow-xs shadow-indigo-200">
                E
              </div>
              <span className="font-bold text-sm text-slate-800 tracking-tight font-display uppercase">
                ESSAY MEMO
              </span>
            </div>
          )}
        </div>

        {/* Center: Page Title */}
        <h1 className="font-black text-slate-850 text-xs tracking-wider text-center flex-1 truncate px-2 select-none uppercase font-display">
          {getTitle()}
        </h1>

        {/* Right Side: Spacer/Empty Container to keep visual layout balanced */}
        <div className="flex items-center space-x-2.5 w-10 justify-end">
        </div>

      </div>
    </header>
  );
}
