import React from "react";
import { Star, Eye, Calendar, Award } from "lucide-react";
import { Essay } from "../types";

interface EssayCardProps {
  essay: Essay;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void | Promise<void>;
}

export const EssayCard: React.FC<EssayCardProps> = ({ essay, onSelect, onToggleFavorite }) => {
  const formattedDate = () => {
    try {
      const date = new Date(essay.createdAt);
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
    } catch {
      return essay.createdAt;
    }
  };

  const getConfidenceStyle = (val: number) => {
    if (val < 0) {
      return {
        bg: "bg-rose-50 border-rose-100 text-rose-700",
        label: "낮음"
      };
    } else if (val > 0) {
      return {
        bg: "bg-emerald-50 border-emerald-100 text-emerald-700",
        label: "높음"
      };
    } else {
      return {
        bg: "bg-gray-50 border-gray-100 text-gray-500",
        label: "보통"
      };
    }
  };

  const confStyle = getConfidenceStyle(essay.confidence);

  return (
    <div
      onClick={() => onSelect(essay.id)}
      className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-500 hover:shadow-md cursor-pointer transition-all duration-300 transform active:scale-[0.99] select-none"
      id={`essay-card-${essay.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1 min-w-0 pr-3">
          <div className="flex items-center space-x-2.5">
            <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md font-display">
              ESSAY STUDY
            </span>
            <span className="text-[10.5px] text-slate-450 font-semibold flex items-center font-mono">
              <Calendar className="w-3 h-3 mr-1 text-slate-400" />
              {formattedDate()}
            </span>
          </div>

          <h4 className="font-bold text-slate-800 text-base tracking-tight leading-snug truncate group-hover:text-indigo-600 transition-colors uppercase font-display">
            {essay.title}
          </h4>

          <p className="text-xs text-slate-500 truncate line-clamp-1 italic font-medium">
            {essay.sentences.length > 0 ? essay.sentences[0].ko : "문장이 없습니다."}
          </p>
        </div>

        {/* Favorite Star action */}
        <button
          onClick={(e) => onToggleFavorite(essay.id, e)}
          className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
            essay.isFavorite 
              ? "bg-amber-50 border-amber-200 text-amber-500 shadow-3xs" 
              : "bg-slate-50 border-transparent text-slate-300 hover:text-amber-400 hover:bg-amber-50/50"
          }`}
          aria-label="즐겨찾기 토글"
        >
          <Star className={`w-4 h-4 ${essay.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
        <div className="flex items-center space-x-1.5">
          <Award className={`w-3.5 h-3.5 ${essay.confidence < 0 ? "text-rose-400 animate-pulse" : essay.confidence > 0 ? "text-emerald-400" : "text-slate-300"}`} />
          <span className="text-[11.5px] text-slate-450 font-bold uppercase tracking-wider font-display">
            CONFIDENCE: <strong className={`font-black font-mono text-sm ${essay.confidence < 0 ? "text-rose-600" : essay.confidence > 0 ? "text-emerald-600" : "text-slate-500"}`}>
              {essay.confidence > 0 ? `+${essay.confidence}` : essay.confidence}
            </strong>
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Badge indicator */}
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-md border tracking-wider font-display uppercase ${
            essay.confidence < 0 
              ? "bg-rose-50 border-rose-150 text-rose-700" 
              : essay.confidence > 0 
                ? "bg-emerald-50 border-emerald-150 text-emerald-700" 
                : "bg-slate-100 border-slate-200 text-slate-600"
          }`}>
            {essay.confidence < 0 ? "REVIEW" : essay.confidence > 0 ? "MASTERED" : "LEARNING"}
          </span>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 flex items-center transition font-display uppercase tracking-widest pl-1">
            STUDY
            <span className="ml-1 group-hover:translate-x-1.5 transition-transform">→</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default EssayCard;
