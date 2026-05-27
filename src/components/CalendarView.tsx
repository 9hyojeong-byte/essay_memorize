import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Essay } from "../types";

interface CalendarViewProps {
  essays: Essay[];
  onSelectEssay: (id: string) => void;
}

export default function CalendarView({ essays, onSelectEssay }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(
    new Date().toISOString().split("T")[0] // default to today
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-based

  // Names of months
  const months = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ];

  // Days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Create list of day cells
  const dayCells: (Date | null)[] = [];
  // Fill initial blanks
  for (let i = 0; i < firstDayOfMonth; i++) {
    dayCells.push(null);
  }
  // Fill calendar days
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push(new Date(year, month, d));
  }

  // Group essays by date string YYYY-MM-DD
  const essaysByDate: { [key: string]: Essay[] } = {};
  essays.forEach((essay) => {
    try {
      const datePart = essay.createdAt.split("T")[0];
      if (!essaysByDate[datePart]) {
        essaysByDate[datePart] = [];
      }
      essaysByDate[datePart].push(essay);
    } catch {
      // ignore
    }
  });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectedEssays = selectedDateStr ? (essaysByDate[selectedDateStr] || []) : [];

  return (
    <div className="space-y-6" id="calendar-view-container">
      {/* Calendar Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-sm mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg text-slate-800 uppercase font-display select-none">
            {year}년 {months[month]}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-100 rounded-lg transition duration-200"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-slate-100 rounded-lg transition duration-200"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-y-4 text-center text-xs font-black text-slate-400 mb-2 font-display uppercase tracking-widest">
          <span>SUN</span>
          <span>MON</span>
          <span>TUE</span>
          <span>WED</span>
          <span>THU</span>
          <span>FRI</span>
          <span>SAT</span>
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7 gap-y-2 gap-x-1.5 text-center">
          {dayCells.map((date, idx) => {
            if (!date) {
              return <div key={`empty-${idx}`} className="py-2" />;
            }

            const dateStr = date.toISOString().split("T")[0];
            const hasEssays = essaysByDate[dateStr] && essaysByDate[dateStr].length > 0;
            const isSelected = selectedDateStr === dateStr;

            // Highlight color based on quantity or confidence of essays
            let markerBg = "bg-indigo-600";
            if (hasEssays) {
              const avgConfidence = essaysByDate[dateStr].reduce((sum, e) => sum + e.confidence, 0) / essaysByDate[dateStr].length;
              if (avgConfidence < 0) markerBg = "bg-rose-500 rounded-full";
              else if (avgConfidence > 0) markerBg = "bg-emerald-500 rounded-full";
            }

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`py-2 text-xs font-bold rounded-lg relative transition-all duration-200 cursor-pointer font-display
                  ${isSelected 
                    ? "bg-indigo-600 text-white font-black" 
                    : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                  }
                `}
              >
                <span>{date.getDate()}</span>
                {/* Visual marker of essay(s) */}
                {hasEssays && (
                  <span 
                    className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : markerBg
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date-specific Essays List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-sm mx-auto">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between font-display">
          <span>SELECTED DATE</span>
          <span className="bg-slate-100 text-indigo-600 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold">
            {selectedDateStr}
          </span>
        </h4>

        {selectedEssays.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            이 날짜에 저장된 에세이가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedEssays.map((essay) => (
              <div
                key={essay.id}
                onClick={() => onSelectEssay(essay.id)}
                className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 cursor-pointer transition duration-300"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <h5 className="font-semibold text-gray-800 text-sm truncate group-hover:text-indigo-900 transition-colors">
                    {essay.title}
                  </h5>
                  <p className="text-xs text-gray-400 mt-1">
                    문장 수: {essay.sentences.length}개
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  {essay.isFavorite && (
                    <span className="text-amber-400 text-xs font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                      ★ 즐겨찾기
                    </span>
                  )}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-2xs ${
                    essay.confidence < 0 
                      ? "bg-rose-50 text-rose-600 border border-rose-100" 
                      : essay.confidence > 0
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-gray-100 text-gray-600 border border-gray-100"
                  }`}>
                    자신감 {essay.confidence > 0 ? `+${essay.confidence}` : essay.confidence}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
