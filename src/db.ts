import { Essay, SyncConfig } from "./types";

const LOCAL_STORAGE_ESSAYS_KEY = "essay_memo_essays_local";
const LOCAL_STORAGE_CONFIG_KEY = "essay_memo_gas_config";

// --- Default Mock/Initial Data to start with if empty ---
const DEFAULT_ESSAYS: Essay[] = [
  {
    id: "essay_1",
    title: "성공과 실패 (Success and Failure)",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    memo: "에세이 핵심 어휘: setback (좌절), perseverance (인내), triumph (승리)",
    isFavorite: true,
    confidence: 1,
    sentences: [
      { ko: "인생은 성공과 실패로 가득 차 있습니다.", en: "Life is full of successes and failures.", confidence: 1 },
      { ko: "가장 중요한 것은 결코 포기하지 않는 것입니다.", en: "The most important thing is to never give up.", confidence: 0 },
      { ko: "모든 실패는 다음 성공을 위한 배움의 기회입니다.", en: "Every failure is a learning opportunity for the next success.", confidence: 1 },
      { ko: "우리는 역경을 극복하며 더 강해집니다.", en: "We become stronger as we overcome adversity.", confidence: 0 }
    ]
  },
  {
    id: "essay_2",
    title: "나의 하루 일과 (My Daily Routine)",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    memo: "자주 틀리는 단어: enthusiast (열성적인 사람), productive (생산적인)",
    isFavorite: false,
    confidence: -1,
    sentences: [
      { ko: "나는 매일 아침 6시에 일어납니다.", en: "I wake up at six o'clock every morning.", confidence: -1 },
      { ko: "기지개를 채우고 시원한 물 한 잔을 마십니다.", en: "I stretch my body and drink a cup of cold water.", confidence: 0 },
      { ko: "그 후에, 오늘 해야 할 일들을 계획합니다.", en: "After that, I plan the things to do today.", confidence: -1 },
      { ko: "이 작은 습관들이 모여서 나를 더 생산적으로 만듭니다.", en: "These small habits gather to make me more productive.", confidence: -1 }
    ]
  }
];

export function getGasConfig(): SyncConfig {
  const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbz-sOYcsMIsCgD-wbOzauiKyVskkDwfmU15SxPMZs7RjGDiD3kySMNDnneSPtS_VAt9oQ/exec";
  const stored = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        if (!parsed.gasUrl) {
          parsed.gasUrl = DEFAULT_GAS_URL;
          parsed.useCloudDb = true;
        }
        return parsed;
      }
    } catch {
      // Empty
    }
  }
  return { gasUrl: DEFAULT_GAS_URL, useCloudDb: true };
}

export function saveGasConfig(config: SyncConfig): void {
  localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
}

// Local storage backup/helper
export function normalizeGasEssay(raw: any): Essay {
  if (!raw) {
    return {
      id: `essay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: "제목 없음",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentences: [],
      memo: "",
      isFavorite: false,
      confidence: 0
    };
  }

  // 1. ID
  const id = raw.id || raw.ID || raw.Id || `essay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  // 2. Title
  const title = raw.title || raw.Title || "제목 없음";

  // 3. CreatedAt
  const createdAt = raw.createdAt || raw.CreatedAt || new Date().toISOString();

  // 4. UpdatedAt
  // If KoreanSentences is a string and looks like a date (contains 'T' or 'Z'), it's actually the updatedAt field
  let updatedAt = raw.updatedAt || raw.UpdatedAt || createdAt;
  if (typeof raw.KoreanSentences === "string" && (raw.KoreanSentences.includes("T") || raw.KoreanSentences.includes("Z"))) {
    updatedAt = raw.KoreanSentences;
  }

  // 5. Sentences
  let sentencesRaw = raw.sentences;
  if (raw.EnglishSentences !== undefined) {
    sentencesRaw = raw.EnglishSentences;
  } else if (raw.englishSentences !== undefined) {
    sentencesRaw = raw.englishSentences;
  }

  let sentences: any[] = [];
  if (sentencesRaw) {
    if (Array.isArray(sentencesRaw)) {
      sentences = sentencesRaw;
    } else if (typeof sentencesRaw === "string") {
      try {
        sentences = JSON.parse(sentencesRaw);
      } catch {
        sentences = [];
      }
    }
  }

  // If still empty but KoreanSentences string looks like an array, try parsing it!
  if (sentences.length === 0 && typeof raw.KoreanSentences === "string" && raw.KoreanSentences.trim().startsWith("[")) {
    try {
      sentences = JSON.parse(raw.KoreanSentences);
    } catch {
      sentences = [];
    }
  }

  const formattedSentences = (Array.isArray(sentences) ? sentences : []).map((s: any) => ({
    ko: s?.ko || s?.Korean || "",
    en: s?.en || s?.English || "",
    confidence: typeof s?.confidence === "number" ? s.confidence : 0
  }));

  // 6. Memo
  const memo = raw.memo || raw.Memo || "";

  // 7. IsFavorite & Confidence
  let isFavorite = false;
  let confidence = 0;

  // Let's inspect 'isFavorite' (Standard, then uppercase)
  if (raw.isFavorite !== undefined) {
    isFavorite = raw.isFavorite === true || raw.isFavorite === "true";
  } else if (raw.IsFavorite !== undefined) {
    const val = raw.IsFavorite;
    if (typeof val === "boolean" || val === "true" || val === "false" || val === "TRUE" || val === "FALSE") {
      isFavorite = val === true || val === "true" || val === "TRUE";
    } else {
      confidence = Number(val) || 0;
    }
  }

  // Let's inspect 'confidence' (Standard, then uppercase)
  if (raw.confidence !== undefined) {
    confidence = Number(raw.confidence) || 0;
  } else if (raw.Confidence !== undefined) {
    const val = raw.Confidence;
    if (typeof val === "boolean" || val === "true" || val === "false" || val === "TRUE" || val === "FALSE") {
      isFavorite = val === true || val === "true" || val === "TRUE";
    } else {
      confidence = Number(val) || 0;
    }
  }

  return {
    id,
    title,
    createdAt,
    updatedAt,
    sentences: formattedSentences,
    memo,
    isFavorite,
    confidence
  };
}

export function getLocalEssays(): Essay[] {
  const stored = localStorage.getItem(LOCAL_STORAGE_ESSAYS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeGasEssay);
      }
    } catch {
      // ignore
    }
  }
  // Initialize with default
  localStorage.setItem(LOCAL_STORAGE_ESSAYS_KEY, JSON.stringify(DEFAULT_ESSAYS));
  return DEFAULT_ESSAYS;
}

export function saveLocalEssays(essays: Essay[]): void {
  localStorage.setItem(LOCAL_STORAGE_ESSAYS_KEY, JSON.stringify(essays));
}

/**
 * DB API - Coordinates local storage and Google Sheets Web App synchronizations
 */
export async function getEssays(): Promise<{ essays: Essay[]; isCloud: boolean; error?: string }> {
  const config = getGasConfig();
  
  if (config.useCloudDb && config.gasUrl) {
    try {
      // Build Google Apps Script list fetch url
      const url = `${config.gasUrl}?action=list&t=${Date.now()}`;
      const response = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.status === "success" && Array.isArray(resJson.data)) {
        const normalized = resJson.data.map(normalizeGasEssay);
        // Sync local storage so user has mirror backup
        saveLocalEssays(normalized);
        return { essays: normalized, isCloud: true };
      } else {
        throw new Error(resJson.message || "Failed to load spreadsheet data");
      }
    } catch (err: any) {
      console.warn("GAS Fetch failed, falling back to local storage:", err);
      const locals = getLocalEssays();
      return { 
        essays: locals, 
        isCloud: false, 
        error: `스프레드시트에서 데이터를 가져오지 못해 로컬 데이터를 표시합니다: ${err.message}` 
      };
    }
  }

  // Pure Local State
  return { essays: getLocalEssays(), isCloud: false };
}

export async function createEssay(essay: Essay): Promise<{ success: boolean; error?: string }> {
  const config = getGasConfig();
  
  // 1. Save locally
  const essays = getLocalEssays();
  // Ensure no duplicate IDs
  const filtered = essays.filter(e => e.id !== essay.id);
  filtered.push(essay);
  saveLocalEssays(filtered);

  // 2. Clear cloud DB if active
  if (config.useCloudDb && config.gasUrl) {
    try {
      // Use text/plain to avoid CORS preflight errors
      const response = await fetch(config.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "create",
          data: essay
        })
      });

      const resJson = await response.json();
      if (resJson.status !== "success") {
        throw new Error(resJson.message || "GAS rejected essay creation");
      }
    } catch (err: any) {
      console.error("Cloud create failed:", err);
      return { success: true, error: `로컬에 저장되었으나 스프레더시트 동기화 실패: ${err.message}` };
    }
  }

  return { success: true };
}

export async function updateEssay(id: string, updatedFields: Partial<Essay>): Promise<{ success: boolean; error?: string }> {
  const config = getGasConfig();

  // 1. Update locally
  const essays = getLocalEssays();
  const index = essays.findIndex(e => e.id === id);
  if (index !== -1) {
    essays[index] = {
      ...essays[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    saveLocalEssays(essays);
  }

  // 2. Synchronize Cloud Database
  if (config.useCloudDb && config.gasUrl) {
    try {
      const response = await fetch(config.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "update",
          id: id,
          data: updatedFields
        })
      });

      const resJson = await response.json();
      if (resJson.status !== "success") {
        throw new Error(resJson.message || "GAS rejected essay update");
      }
    } catch (err: any) {
      console.error("Cloud update failed:", err);
      return { success: true, error: `로컬 정보는 수정되었으나 스프레드시트 동기화 실패: ${err.message}` };
    }
  }

  return { success: true };
}

export async function deleteEssay(id: string): Promise<{ success: boolean; error?: string }> {
  const config = getGasConfig();

  // 1. Delete locally
  const essays = getLocalEssays();
  const filtered = essays.filter(e => e.id !== id);
  saveLocalEssays(filtered);

  // 2. Synchronize Cloud Database
  if (config.useCloudDb && config.gasUrl) {
    try {
      const response = await fetch(config.gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "delete",
          id: id
        })
      });

      const resJson = await response.json();
      if (resJson.status !== "success") {
        throw new Error(resJson.message || "GAS rejected essay delete");
      }
    } catch (err: any) {
      console.error("Cloud delete failed:", err);
      return { success: true, error: `로컬 정보는 삭제되었으나 스프레드시트 동기화 실패: ${err.message}` };
    }
  }

  return { success: true };
}

/**
 * Upload all current local essays to Google Sheets (one-by-one or sequentially)
 */
export async function syncAllLocalToCloud(gasUrl: string): Promise<{ success: boolean; count: number; error?: string }> {
  const localEssays = getLocalEssays();
  if (localEssays.length === 0) {
    return { success: true, count: 0 };
  }

  let successCount = 0;
  let lastError = "";

  try {
    for (const essay of localEssays) {
      const response = await fetch(gasUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          action: "create",
          data: essay
        })
      });

      const resJson = await response.json();
      if (resJson.status === "success") {
        successCount++;
      } else {
        lastError = resJson.message || "Error saving essay";
      }
    }
  } catch (err: any) {
    return { success: false, count: successCount, error: err.message || "네트워크 통신 오류가 발생했습니다." };
  }

  if (successCount === localEssays.length) {
    return { success: true, count: successCount };
  } else {
    return { 
      success: false, 
      count: successCount, 
      error: `총 ${localEssays.length}개 중 ${successCount}개 연동 완료 (마지막 오류: ${lastError || "응답 헤더 확인 필요"})` 
    };
  }
}
