// popup.js - 표준 팝업 UI 로직 제어
let movieData = null;

function processActiveTab(activeTab) {
  const statusEl = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");
  
  const movieCodeInput = document.getElementById("movieCode");
  const movieTitleInput = document.getElementById("movieTitle");
  const releaseMonthInput = document.getElementById("releaseMonth");
  const actorsInput = document.getElementById("actors");

  if (!activeTab || !activeTab.url) {
    statusEl.textContent = "탭 정보를 찾을 수 없습니다.";
    statusEl.style.color = "#ff5a5f";
    sendBtn.disabled = true;
    return;
  }

  let host = "";
  try {
    host = new URL(activeTab.url).hostname;
  } catch (e) {
    statusEl.textContent = "올바르지 않은 웹페이지 주소입니다.";
    statusEl.style.color = "#ff5a5f";
    sendBtn.disabled = true;
    return;
  }

  const isSupported = host.includes("123av.com") || host.includes("missav.com") || host.includes("missav.ai");
  
  if (!isSupported) {
    statusEl.textContent = "123AV / MissAV 상세페이지에서 실행해 주세요.";
    statusEl.style.color = "#ff5a5f";
    sendBtn.disabled = true;
    return;
  }

  statusEl.textContent = "페이지 분석 중...";
  statusEl.style.color = "#e0e0e0";

  // 활성 탭에 content.js 주입하여 페이지 스크레이핑
  chrome.scripting.executeScript({
    target: { tabId: activeTab.id },
    files: ["content.js"]
  }, (results) => {
    if (!results || !results[0] || !results[0].result) {
      statusEl.textContent = "페이지 데이터 수집 실패";
      statusEl.style.color = "#ff5a5f";
      sendBtn.disabled = true;
      return;
    }

    const res = results[0].result;
    if (!res.success) {
      statusEl.textContent = `파싱 에러: ${res.error}`;
      statusEl.style.color = "#ff5a5f";
      sendBtn.disabled = true;
      return;
    }

    // 파싱 성공 데이터 저장
    movieData = res.data;

    // UI 입력 필드에 데이터 바인딩
    movieCodeInput.value = movieData.movie_code || "";
    movieTitleInput.value = movieData.title || "";
    releaseMonthInput.value = movieData.release_month || "";
    actorsInput.value = (movieData.actor_names || []).join(", ");

    // 기본적으로 비디오 재생 주소는 원문 페이지 자체 주소로 설정
    movieData.video_url = activeTab.url;

    // 수집 완료 및 전송 버튼 활성화
    statusEl.textContent = "수집 완료! 등록 대기 중입니다.";
    statusEl.style.color = "#72f1b8";
    sendBtn.disabled = false;
  });
}

function initScraper() {
  const statusEl = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");

  // 표준 팝업에서는 currentWindow: true가 100% 신뢰성 있는 활성 탭을 획득합니다.
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0]) {
      processActiveTab(tabs[0]);
    } else {
      statusEl.textContent = "활성화된 브라우저 탭을 찾을 수 없습니다.";
      statusEl.style.color = "#ff5a5f";
      sendBtn.disabled = true;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initScraper();

  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("status");
  const movieCodeInput = document.getElementById("movieCode");
  const movieTitleInput = document.getElementById("movieTitle");
  const releaseMonthInput = document.getElementById("releaseMonth");
  const actorsInput = document.getElementById("actors");

  // CineTube로 전송하기 이벤트 등록
  sendBtn.addEventListener("click", async () => {
    if (!movieData) return;

    // 사용자가 입력 필드에서 직접 수정한 값 반영
    movieData.movie_code = movieCodeInput.value.trim().toUpperCase();
    movieData.title = movieTitleInput.value.trim();
    movieData.release_month = releaseMonthInput.value.trim();
    movieData.actor_names = actorsInput.value.split(",").map(a => a.trim()).filter(Boolean).slice(0, 4);
    
    // 키워드 목록 재조정
    movieData.keywords = [
      "123AV",
      movieData.movie_code,
      ...movieData.actor_names.slice(0, 2)
    ].filter(Boolean);

    sendBtn.disabled = true;
    statusEl.textContent = "CineTube DB로 영화 정보 등록 중...";
    statusEl.style.color = "#e0e0e0";

    try {
      const baseApiUrl = "http://localhost:3001/movies";
      
      const response = await fetch(baseApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(movieData)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("[CineTube Exporter] 등록 완료:", result);
      
      statusEl.textContent = `성공적으로 등록되었습니다! (품번: ${movieData.movie_code})`;
      statusEl.style.color = "#2ecc71";
    } catch (error) {
      console.error("[CineTube Exporter] 등록 실패:", error);
      statusEl.textContent = `등록 실패: ${error.message}`;
      statusEl.style.color = "#ff5a5f";
      sendBtn.disabled = false;
    }
  });
});
