/**
 * Google Apps Script (GAS) Database Code
 * 
 * [사용 방법]
 * 1. 구글 스프레드시트를 생성하고 URL을 확인합니다.
 * 2. 확장 프로그램(Extensions) > Apps Script를 클릭합니다.
 * 3. 기존 코드를 모두 지우고 이 파일(GAS.gs)의 파일 내용을 복사해서 붙여넣습니다.
 * 4. '배포(Deploy)' > '새 배포(New deployment)'를 누릅니다.
 * 5. 유형: '웹 앱(Web app)' 선택
 *    - 설명: 에세이 데이터베이스
 *    - 실행할 사용자: '나(Me/본인 구글 계정)'
 *    - 액세스 권한이 있는 사용자: '모든 사람(Anyone)' (매우 중요)
 * 6. 배포 버튼을 누르고 권한을 승인한 뒤 생성되는 '웹 앱 URL'을 복사하여 앱 내 설정에 입력하세요.
 */

const SHEET_NAME = "Essays";

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Header Row 설정
    sheet.appendRow([
      "id",           // 고유 ID
      "title",        // 제목
      "createdAt",    // 생성일 (ISO String)
      "updatedAt",    // 수정일 (ISO String)
      "sentences",    // 문장 데이터 (JSON stringified) : [{ko, en, confidence}]
      "memo",         // 메모
      "isFavorite",   // 즐겨찾기 (true/false)
      "confidence"    // 자신감 숫자 (-2 ~ +2, default 0)
    ]);
    // 헤더 스타일 지정
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f4f6");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET 요청 처리 (조회)
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const sheet = getOrCreateSheet();
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    
    // 전체 목록 조회
    if (!action || action === "list") {
      const essays = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const essay = {};
        for (let j = 0; j < headers.length; j++) {
          let val = row[j];
          // sentences JSON 파싱
          if (headers[j] === "sentences") {
            try {
              val = JSON.parse(val);
            } catch (err) {
              val = [];
            }
          }
          if (headers[j] === "isFavorite") {
            val = val === true || val === "true";
          }
          if (headers[j] === "confidence") {
            val = Number(val) || 0;
          }
          essay[headers[j]] = val;
        }
        essays.push(essay);
      }
      return handleResponse({ status: "success", data: essays });
    }
    
    // 특정 에세이 상세 조회
    if (action === "get") {
      const id = params.id;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
          const essay = {};
          for (let j = 0; j < headers.length; j++) {
            let val = rows[i][j];
            if (headers[j] === "sentences") {
              try { val = JSON.parse(val); } catch (err) { val = []; }
            }
            if (headers[j] === "isFavorite") {
              val = val === true || val === "true";
            }
            if (headers[j] === "confidence") {
              val = Number(val) || 0;
            }
            essay[headers[j]] = val;
          }
          return handleResponse({ status: "success", data: essay });
        }
      }
      return handleResponse({ status: "error", message: "Not found" });
    }

    return handleResponse({ status: "error", message: "Invalid action" });
  } catch (error) {
    return handleResponse({ status: "error", message: error.toString() });
  }
}

// POST 요청 처리 (추가, 수정, 삭제)
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const sheet = getOrCreateSheet();
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    // 1. 에세이 생성 (Create)
    if (action === "create") {
      const essay = postData.data;
      const newId = essay.id || "essay_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
      const now = new Date().toISOString();
      
      const newRow = [
        newId,
        essay.title || "제목 없음",
        essay.createdAt || now,
        now,
        JSON.stringify(essay.sentences || []),
        essay.memo || "",
        essay.isFavorite === true || essay.isFavorite === "true" ? true : false,
        Number(essay.confidence) || 0
      ];
      
      sheet.appendRow(newRow);
      return handleResponse({ status: "success", data: { id: newId } });
    }

    // 2. 에세이 수정 (Update)
    if (action === "update") {
      const id = postData.id;
      const updateData = postData.data;
      let foundIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
          foundIndex = i + 1; // 1-based index (Excel/Sheet)
          break;
        }
      }

      if (foundIndex !== -1) {
        const now = new Date().toISOString();
        // updatedAt 갱신
        sheet.getRange(foundIndex, 4).setValue(now);

        if (updateData.title !== undefined) {
          sheet.getRange(foundIndex, 2).setValue(updateData.title);
        }
        if (updateData.sentences !== undefined) {
          sheet.getRange(foundIndex, 5).setValue(JSON.stringify(updateData.sentences));
        }
        if (updateData.memo !== undefined) {
          sheet.getRange(foundIndex, 6).setValue(updateData.memo);
        }
        if (updateData.isFavorite !== undefined) {
          sheet.getRange(foundIndex, 7).setValue(updateData.isFavorite);
        }
        if (updateData.confidence !== undefined) {
          sheet.getRange(foundIndex, 8).setValue(Number(updateData.confidence) || 0);
        }

        return handleResponse({ status: "success", message: "Updated successfully" });
      }
      return handleResponse({ status: "error", message: "Essay not found for update" });
    }

    // 3. 에세이 삭제 (Delete)
    if (action === "delete") {
      const id = postData.id;
      let foundIndex = -1;

      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(id)) {
          foundIndex = i + 1;
          break;
        }
      }

      if (foundIndex !== -1) {
        sheet.deleteRow(foundIndex);
        return handleResponse({ status: "success", message: "Deleted successfully" });
      }
      return handleResponse({ status: "error", message: "Essay not found for delete" });
    }

    return handleResponse({ status: "error", message: "Invalid post action" });
  } catch (error) {
    return handleResponse({ status: "error", message: error.toString() });
  }
}
