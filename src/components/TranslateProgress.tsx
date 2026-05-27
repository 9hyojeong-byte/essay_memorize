import React from "react";
import { Sparkles, Brain, Languages, Compass } from "lucide-react";

interface TranslateProgressProps {
  status: "idle" | "sending" | "parsing" | "completing" | "error";
  errorMessage?: string;
  onRetry?: () => void;
}

export default function TranslateProgress({ status, errorMessage, onRetry }: TranslateProgressProps) {
  if (status === "idle") return null;

  const getStatusContent = () => {
    switch (status) {
      case "sending":
        return {
          title: "Gemini AI 번역 의뢰 중",
          desc: "한국어 문장들을 분석하여 가장 자연스러운 맥락을 파악하고 있습니다.",
          percent: "30%",
          icon: <Brain className="w-8 h-8 text-indigo-500 animate-pulse" />
        };
      case "parsing":
        return {
          title: "영문장 매칭 및 교정 중",
          desc: "문맥상 가장 적합한 고유 영단어와 숙어 표현을 조율하고 있습니다.",
          percent: "65%",
          icon: <Languages className="w-8 h-8 text-indigo-500 animate-spin" />
        };
      case "completing":
        return {
          title: "에세이 맞춤형 제목 제안 중",
          desc: "작성하신 에세이 내용 전체를 관통하는 명료한 한국어/영어 제목을 생성하고 있습니다.",
          percent: "90%",
          icon: <Compass className="w-8 h-8 text-emerald-500 animate-bounce" />
        };
      case "error":
        return {
          title: "번역 생성 중 오류 발생",
          desc: errorMessage || "네트워크 통신 불안정 또는 API 인증값 확인 누락.",
          percent: "100%",
          icon: <Sparkles className="w-8 h-8 text-rose-500" />
        };
      default:
        return {
          title: "분석 중",
          desc: "잠시만 기자려 주세요.",
          percent: "20%",
          icon: <Sparkles className="w-8 h-8 text-indigo-500" />
        };
    }
  };

  const details = getStatusContent();

  return (
    <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-5 flex flex-col items-center justify-center text-center animate-fadeIn" id="translate-progress-panel">
      <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-inner">
        {details.icon}
      </div>

      <div className="space-y-2 max-w-sm">
        <h4 className="text-sm font-black text-slate-100 flex items-center justify-center space-x-1.5 uppercase font-display tracking-wider">
          <span>{details.title}</span>
          {status !== "error" && (
            <span className="text-[10px] bg-indigo-600 text-white font-black px-2 py-0.5 rounded-full font-mono">
              {details.percent}
            </span>
          )}
        </h4>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">
          {details.desc}
        </p>
      </div>

      {status !== "error" ? (
        <div className="w-full bg-slate-800 rounded-full h-1.5 max-w-xs overflow-hidden shadow-inner">
          <div 
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
            style={{ width: details.percent }}
          />
        </div>
      ) : (
        onRetry && (
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-widest rounded-full transition cursor-pointer font-display shadow-md"
          >
            RETRY TRANSLATION
          </button>
        )
      )}
    </div>
  );
}
