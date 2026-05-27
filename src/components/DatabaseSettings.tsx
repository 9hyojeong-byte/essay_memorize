import React, { useState, useEffect } from "react";
import { Link, Database, Cloud, Settings, Compass, RefreshCw, CheckCircle2, AlertTriangle, Key, ExternalLink } from "lucide-react";
import { SyncConfig } from "../types";
import { getGasConfig, saveGasConfig, syncAllLocalToCloud } from "../db";

interface DatabaseSettingsProps {
  onClose: () => void;
  onSyncComplete: () => void;
}

export default function DatabaseSettings({ onClose, onSyncComplete }: DatabaseSettingsProps) {
  const [config, setConfig] = useState<SyncConfig>({ gasUrl: "", useCloudDb: false });
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => {
    setConfig(getGasConfig());
  }, []);

  const handleToggle = (checked: boolean) => {
    const updated = { ...config, useCloudDb: checked };
    setConfig(updated);
    saveGasConfig(updated);
  };

  const handleUrlChange = (url: string) => {
    const updated = { ...config, gasUrl: url.trim() };
    setConfig(updated);
    saveGasConfig(updated);
  };

  const testConnection = async () => {
    if (!config.gasUrl) {
      setStatus("error");
      setMessage("먼저 구글 앱스크립트 웹 앱 URL을 입력해 주세요.");
      return;
    }

    setStatus("testing");
    setMessage("구글 스프레드시트 서버와 통신 중...");

    try {
      // Test via list action with short timeout
      const url = `${config.gasUrl}?action=list&t=${Date.now()}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP 상태코드: ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.status === "success") {
        setStatus("success");
        setMessage("스프레드시트 데이터베이스가 안전하게 연결되었습니다!");
      } else {
        throw new Error(resJson.message || "서버 응답 오류");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(
        err.name === "AbortError" 
          ? "연결 시간이 초과되었습니다 (8초). 웹앱 호스팅 및 가동 상태를 점검해주세요."
          : `서버 연결 실패할 수 있습니다. URL 확인 및 CORS 웹앱 권한 설정을 체크해 주세요. (${err.message})`
      );
    }
  };

  const handleSyncAll = async () => {
    if (!config.gasUrl) {
      alert("동기화를 진행하기 전에 웹 앱 URL이 수립되어야 합니다.");
      return;
    }

    setIsSyncingAll(true);
    setStatus("testing");
    setMessage("로컬에 저장된 에세이를 구글 스프레드시트로 전송 중...");

    try {
      const result = await syncAllLocalToCloud(config.gasUrl);
      if (result.success) {
        setStatus("success");
        setMessage(`전체 동기화 성공! 로컬 에세이 ${result.count}개가 스프레드시트에 정상 등록되었습니다.`);
        onSyncComplete();
      } else {
        setStatus("error");
        setMessage(`동기화 도중 지연 발생: ${result.error}`);
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(`통신 오류: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6" id="database-settings-panel">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2.5">
          <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wider">구글 스프레드시트 연동 (DB)</h3>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full cursor-pointer transition font-display"
        >
          CLOSE
        </button>
      </div>

      {/* Cloud DB activation toggle */}
      <div className="flex items-center justify-between bg-indigo-50/20 p-4 rounded-2xl border border-indigo-50/40">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-1.5">
            <Cloud className="w-4 h-4 text-indigo-500" />
            <h4 className="font-bold text-slate-800 text-xs font-display uppercase tracking-widest">스프레드시트 DB 활성화</h4>
          </div>
          <p className="text-[10px] text-slate-450 leading-relaxed font-medium">
            비활성화 시 앱 내부 브라우저 저장소(LocalStorage)를 사용하여 영구 저장됩니다.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={config.useCloudDb}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* GAS URL settings */}
      {config.useCloudDb && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-405 uppercase tracking-widest flex items-center justify-between font-display">
              <span>구글 앱스크립트 웹 앱 URL</span>
              <span className="text-[9px] text-slate-400 font-normal normal-case font-mono">deployment web app URL</span>
            </label>
            <input
              type="url"
              className="w-full text-xs p-3.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 outline-hidden rounded-2xl text-slate-700 font-mono transition-all"
              placeholder="https://script.google.com/macros/s/AKfycbz-sOYcsMIsCgD-wbOzauiKyVskkDwfmU15SxPMZs7RjGDiD3kySMNDnneSPtS_VAt9oQ/exec"
              value={config.gasUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={testConnection}
              disabled={status === "testing" || isSyncingAll}
              className="flex items-center justify-center space-x-1 py-3 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/85 rounded-2xl transition cursor-pointer disabled:opacity-50 uppercase font-display tracking-widest border border-indigo-100/50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status === "testing" ? "animate-spin" : ""}`} />
              <span>TEST CONNECT</span>
            </button>
            <button
              onClick={handleSyncAll}
              disabled={status === "testing" || isSyncingAll}
              className="flex items-center justify-center space-x-1 py-3 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition cursor-pointer disabled:opacity-50 uppercase font-display tracking-widest shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>SYNC ALL DATA</span>
            </button>
          </div>

          {/* Connect status feedback marquee */}
          {status !== "idle" && (
            <div className={`p-4 rounded-2xl text-xs flex items-start border ${
              status === "success" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                : status === "error"
                  ? "bg-rose-50 text-rose-700 border-rose-150"
                  : "bg-slate-50 text-slate-600 border-slate-200"
            }`}>
              {status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {status === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
              {status === "testing" && <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin shrink-0" />}
              <span className="font-semibold leading-relaxed ml-2">{message}</span>
            </div>
          )}

          {/* Quick instructions guide */}
          <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-2xl space-y-2.5">
            <div className="flex items-center space-x-1.5 text-amber-900 font-display">
              <Compass className="w-4 h-4" />
              <h5 className="font-bold text-xs uppercase tracking-wider">설치 및 연동 가이드</h5>
            </div>
            <ol className="text-[11px] text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed font-medium">
              <li>프로젝트 최상단에 생성된 <span className="font-bold text-slate-700">GAS.gs</span> 파일 전체 내용을 복사합니다.</li>
              <li>구글 스프레드시트 실행 후 <span className="font-bold text-slate-600">확장 프로그램 &gt; Apps Script</span> 에 진입하여 붙여넣고 저장합니다.</li>
              <li>상단 우측에 <span className="font-bold text-indigo-700">새 배포 &gt; 웹 앱</span> 유형을 선택합니다.</li>
              <li>'액세스 권한이 있는 사용자'를 꼭 <span className="font-bold text-rose-600">모든 사람(Anyone)</span>으로 지정 후 배포합니다.</li>
              <li>생성된 URL을 위에 붙여넣고 <span className="font-semibold text-indigo-600 font-display">TEST CONNECT</span>를 진행하세요!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
