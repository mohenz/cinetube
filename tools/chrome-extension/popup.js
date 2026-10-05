// popup.js - CineTube Exporter 팝업 제어 및 멀티 PC(서버 주소 설정) 지원
const DEFAULT_SERVER_URL = "http://localhost:3001";
let movieData = null;
let checkSequence = 0;
let checkController = null;
let submitting = false;
let checkTimer = null;

function invalidateRegistrationCheck() {
  clearTimeout(checkTimer);
  checkSequence += 1;
  if (checkController) checkController.abort();
  document.getElementById("sendBtn").disabled = true;
}

async function checkRegistration() {
  invalidateRegistrationCheck();
  if (!movieData) return false;
  const sequence = checkSequence;
  const status = document.getElementById("status");
  const send = document.getElementById("sendBtn");
  const check = document.getElementById("checkBtn");
  const controller = new AbortController();
  checkController = controller;
  const server = normalizeServerUrl(document.getElementById("serverUrl").value);
  const movie = { ...movieData, movie_code: document.getElementById("movieCode").value };
  status.textContent = "등록 여부 확인 중...";
  status.style.color = "#e0e0e0";
  check.disabled = true;
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const existing = await CineTubeRegistration.find(server, movie, controller.signal);
    if (sequence !== checkSequence) return false;
    if (existing) {
      status.textContent = `이미 등록된 영화입니다: ${existing.movie_code || "품번 없음"} · ${existing.title || "제목 없음"}`;
      status.style.color = "#f1c40f";
      return false;
    }
    status.textContent = "미등록 영화입니다. 등록할 수 있습니다.";
    status.style.color = "#2ecc71";
    send.disabled = submitting;
    return true;
  } catch (error) {
    if (sequence !== checkSequence) return false;
    status.textContent = error.name === "AbortError"
      ? "등록 여부 확인 시간 초과. 서버 연결을 확인한 뒤 다시 확인해 주세요."
      : `등록 여부 확인 실패: ${error.message}`;
    status.style.color = "#ff5a5f";
    return false;
  } finally {
    clearTimeout(timeout);
    if (sequence === checkSequence) check.disabled = submitting;
  }
}

/**
 * 서버 URL 정규화 (프로토콜 자동 부여, 끝 슬래시 제거)
 */
function normalizeServerUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return DEFAULT_SERVER_URL;
  let url = rawUrl.trim();
  if (!url) return DEFAULT_SERVER_URL;

  // 프로토콜이 없으면 http:// 자동 추가
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  // 끝단의 슬래시 제거
  url = url.replace(/\/+$/, "");
  return url;
}

/**
 * 저장된 서버 URL 불러오기 (storage API 및 localStorage 폴백)
 */
async function getServerUrl() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["cinetubeServerUrl"], (result) => {
        if (chrome.runtime.lastError || !result || !result.cinetubeServerUrl) {
          // local storage 시도
          chrome.storage.local.get(["cinetubeServerUrl"], (localRes) => {
            const val = (localRes && localRes.cinetubeServerUrl) || localStorage.getItem("cinetubeServerUrl");
            resolve(normalizeServerUrl(val));
          });
        } else {
          resolve(normalizeServerUrl(result.cinetubeServerUrl));
        }
      });
    } else {
      resolve(normalizeServerUrl(localStorage.getItem("cinetubeServerUrl")));
    }
  });
}

/**
 * 서버 URL 저장하기
 */
async function setServerUrl(url) {
  const normalized = normalizeServerUrl(url);
  try {
    localStorage.setItem("cinetubeServerUrl", normalized);
  } catch (e) {}

  if (typeof chrome !== "undefined" && chrome.storage) {
    if (chrome.storage.sync) {
      chrome.storage.sync.set({ cinetubeServerUrl: normalized });
    }
    if (chrome.storage.local) {
      chrome.storage.local.set({ cinetubeServerUrl: normalized });
    }
  }
  return normalized;
}

/**
 * 서버 연결 상태 테스트 (/health 엔드포인트)
 */
async function checkServerHealth(serverUrl) {
  const target = normalizeServerUrl(serverUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${target}/health`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.ok || data.service === "cinetube-api") {
        return { ok: true, message: `연결 성공 (${target})` };
      }
      return { ok: true, message: `응답 수신 완료 (HTTP ${res.status})` };
    }
    return { ok: false, message: `HTTP 에러 ${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return { ok: false, message: "연결 시간 초과 (3.5초)" };
    }
    return { ok: false, message: `접속 불가: ${err.message || "호스트를 찾을 수 없음"}` };
  }
}

/**
 * 활성 탭 스크레이핑
 */
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

  const isSupported = host.includes("123av.com") || host.includes("missav.com") || host.includes("missav.ai")
    || host === "javhdporn.net" || host.endsWith(".javhdporn.net")
    || host === "javtiful.com" || host.endsWith(".javtiful.com");

  if (!isSupported) {
    statusEl.textContent = "123AV / MissAV / JavHDporn / Javtiful 상세페이지에서 실행해 주세요.";
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

    // 기본 비디오 주소
    movieData.video_url = movieData.video_url || activeTab.url;

    checkRegistration();
  });
}

function initScraper() {
  const statusEl = document.getElementById("status");
  const sendBtn = document.getElementById("sendBtn");

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

document.addEventListener("DOMContentLoaded", async () => {
  const toggleSettingsBtn = document.getElementById("toggleSettingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const serverUrlInput = document.getElementById("serverUrl");
  const testConnBtn = document.getElementById("testConnBtn");
  const connStatus = document.getElementById("connStatus");
  const summaryServerUrl = document.getElementById("summaryServerUrl");
  const quickChangeServer = document.getElementById("quickChangeServer");

  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("status");
  const movieCodeInput = document.getElementById("movieCode");
  const movieTitleInput = document.getElementById("movieTitle");
  const releaseMonthInput = document.getElementById("releaseMonth");
  const actorsInput = document.getElementById("actors");

  const checkBtn = document.getElementById("checkBtn");
  checkBtn.addEventListener("click", () => checkRegistration());
  for (const input of [movieCodeInput, serverUrlInput]) {
    input.addEventListener("input", () => {
      invalidateRegistrationCheck();
      if (!movieData || submitting) return;
      statusEl.textContent = "입력이 변경되었습니다. 등록 여부를 다시 확인합니다.";
      checkBtn.disabled = false;
      checkTimer = setTimeout(() => checkRegistration(), 400);
    });
  }

  // 1. 저장된 서버 URL 로드
  const currentServerUrl = await getServerUrl();
  serverUrlInput.value = currentServerUrl;
  summaryServerUrl.textContent = currentServerUrl;

  // 2. 설정 패널 토글 로직
  function toggleSettings(forceOpen) {
    const shouldOpen = forceOpen !== undefined ? forceOpen : !settingsPanel.classList.contains("open");
    if (shouldOpen) {
      settingsPanel.classList.add("open");
      toggleSettingsBtn.classList.add("active");
      serverUrlInput.focus();
    } else {
      settingsPanel.classList.remove("open");
      toggleSettingsBtn.classList.remove("active");
    }
  }

  toggleSettingsBtn.addEventListener("click", () => toggleSettings());
  quickChangeServer.addEventListener("click", () => toggleSettings(true));

  // 3. 서버 URL 변경 저장 로직
  async function applyServerUrlChange() {
    const cleanUrl = await setServerUrl(serverUrlInput.value);
    serverUrlInput.value = cleanUrl;
    summaryServerUrl.textContent = cleanUrl;
    return cleanUrl;
  }

  serverUrlInput.addEventListener("blur", applyServerUrlChange);
  serverUrlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      applyServerUrlChange();
      testConnBtn.click();
    }
  });

  // 4. 연결 테스트 버튼
  testConnBtn.addEventListener("click", async () => {
    const targetUrl = await applyServerUrlChange();
    connStatus.textContent = "연결 확인 중...";
    connStatus.style.color = "#f1c40f";
    testConnBtn.disabled = true;

    const result = await checkServerHealth(targetUrl);
    testConnBtn.disabled = false;

    if (result.ok) {
      connStatus.textContent = `✅ ${result.message}`;
      connStatus.style.color = "#2ecc71";
    } else {
      connStatus.textContent = `❌ ${result.message} (IP/방화벽 확인)`;
      connStatus.style.color = "#ff5a5f";
    }
  });

  // 5. 스크레이퍼 초기화
  initScraper();

  // 6. CineTube로 전송하기 이벤트 등록
  sendBtn.addEventListener("click", async () => {
    if (!movieData || submitting) return;
    submitting = true;
    const inputs = [movieCodeInput, movieTitleInput, releaseMonthInput, actorsInput, serverUrlInput];
    inputs.forEach(input => { input.disabled = true; });
    testConnBtn.disabled = true;
    checkBtn.disabled = true;
    if (!await checkRegistration()) {
      submitting = false;
      inputs.forEach(input => { input.disabled = false; });
      testConnBtn.disabled = false;
      checkBtn.disabled = false;
      return;
    }

    // 사용자가 입력 필드에서 수정한 값 반영
    movieData.movie_code = movieCodeInput.value.trim().toUpperCase();
    movieData.title = movieTitleInput.value.trim();
    movieData.release_month = releaseMonthInput.value.trim();
    movieData.actor_names = actorsInput.value.split(",").map(a => a.trim()).filter(Boolean).slice(0, 4);

    // 키워드 목록 구성
    movieData.keywords = [
      movieData.site_label || "123AV",
      movieData.movie_code,
      ...movieData.actor_names.slice(0, 2),
      ...(movieData.extra_keywords || [])
    ].filter(Boolean);

    sendBtn.disabled = true;
    statusEl.textContent = "CineTube 서버로 영화 정보 등록 중...";
    statusEl.style.color = "#e0e0e0";

    const serverUrl = await applyServerUrlChange();
    const baseApiUrl = `${serverUrl}/movies`;

    try {
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

      statusEl.textContent = `🎉 성공적으로 등록되었습니다! (${movieData.movie_code})`;
      statusEl.style.color = "#2ecc71";
      sendBtn.disabled = true;
    } catch (error) {
      console.error("[CineTube Exporter] 등록 실패:", error);
      const isNetworkError = error.name === "TypeError" || (error.message && error.message.includes("Failed to fetch"));
      if (isNetworkError) {
        statusEl.textContent = `등록 실패: ${serverUrl} 서버에 연결할 수 없습니다. 주소 및 방화벽(3001) 설정을 확인해 주세요.`;
      } else {
        statusEl.textContent = `등록 실패: ${error.message}`;
      }
      statusEl.style.color = "#ff5a5f";
      sendBtn.disabled = true;
    } finally {
      submitting = false;
      inputs.forEach(input => { input.disabled = false; });
      testConnBtn.disabled = false;
      checkBtn.disabled = false;
    }
  });
});
