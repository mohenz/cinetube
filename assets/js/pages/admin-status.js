(function () {
  const UI = window.CineTubeUI;
  UI.setupChrome();

  const AUTO_REFRESH_MS = 15000;
  const JOB_STATUS_ICONS = {
    queued: "hourglass_top",
    running: "autorenew",
    done: "task_alt",
    failed: "error",
    cancelled: "block"
  };

  const summaryEl = document.getElementById("statusSummary");
  const gridEl = document.getElementById("statusGrid");
  const jobsGridEl = document.getElementById("statusJobsGrid");
  const lastCheckedEl = document.getElementById("statusLastChecked");
  const autoRefreshCheckbox = document.getElementById("statusAutoRefresh");
  const refreshButton = document.getElementById("statusRefreshNow");

  let timerId = null;
  let checking = false;

  function apiBase() {
    const config = window.CINETUBE_LOCAL_API || {};
    const url = typeof config.url === "function" ? config.url() : config.url;
    return String(url || "").replace(/\/$/, "");
  }

  function statusCard({ icon, title, level, badgeText, meta, errorDetail }) {
    const metaHtml = (meta || [])
      .map(([label, value]) => `<div><span>${UI.escapeHtml(label)}</span><strong>${UI.escapeHtml(value)}</strong></div>`)
      .join("");
    return `
      <article class="status-card">
        <div class="status-card-head">
          <div class="status-card-title"><span class="material-symbols-outlined">${icon}</span>${UI.escapeHtml(title)}</div>
          <span class="status-badge ${level}"><span class="status-dot ${level}"></span> ${UI.escapeHtml(badgeText)}</span>
        </div>
        <div class="status-meta">${metaHtml}</div>
        ${errorDetail ? `<div class="status-error-detail">${UI.escapeHtml(errorDetail)}</div>` : ""}
      </article>
    `;
  }

  function renderSummary(levels) {
    let level = "ok";
    let text = "모든 서비스가 정상 작동 중입니다.";
    if (levels.includes("error")) {
      level = "error";
      text = "일부 서비스에 장애가 발생했습니다.";
    } else if (levels.includes("warn")) {
      level = "warn";
      text = "일부 서비스 응답이 느리거나 확인이 필요합니다.";
    }
    const icon = level === "ok" ? "check_circle" : level === "warn" ? "warning" : "error";
    summaryEl.className = `status-summary ${level}`;
    summaryEl.innerHTML = `<span class="material-symbols-outlined">${icon}</span><span>${UI.escapeHtml(text)}</span>`;
  }

  function renderJobs(jobs) {
    if (!jobs || jobs.error) {
      jobsGridEl.innerHTML = `<div class="empty">작업 큐 조회 실패${jobs?.error ? `: ${UI.escapeHtml(jobs.error)}` : ""}</div>`;
      return;
    }
    const entries = Object.entries(jobs);
    if (!entries.length) {
      jobsGridEl.innerHTML = `<div class="empty">대기 중이거나 진행 중인 작업이 없습니다.</div>`;
      return;
    }
    jobsGridEl.innerHTML = entries.map(([status, count]) => `
      <article class="stat-card">
        <span class="material-symbols-outlined">${JOB_STATUS_ICONS[status] || "sync"}</span>
        <strong>${UI.escapeHtml(count)}</strong>
        <small>${UI.escapeHtml(status)}</small>
      </article>
    `).join("");
  }

  async function checkStatus() {
    if (checking) return;
    checking = true;
    refreshButton.disabled = true;
    try {
      const base = apiBase();
      const levels = [];
      const cards = [];

      // 정적 웹서버: 이 페이지가 로드됐다는 것 자체가 정상 응답을 의미한다.
      cards.push(statusCard({
        icon: "language",
        title: "정적 웹서버",
        level: "ok",
        badgeText: "정상",
        meta: [
          ["주소", window.location.origin],
          ["현재 페이지", window.location.pathname]
        ]
      }));
      levels.push("ok");

      if (!base) {
        cards.push(statusCard({
          icon: "dns",
          title: "로컬 API 서버",
          level: "error",
          badgeText: "설정 없음",
          meta: [["안내", "CINETUBE_LOCAL_API 설정을 찾을 수 없습니다."]]
        }));
        cards.push(statusCard({
          icon: "database",
          title: "PostgreSQL 데이터베이스",
          level: "unknown",
          badgeText: "확인 불가",
          meta: []
        }));
        levels.push("error", "unknown");
        renderJobs({ error: "API 설정이 없어 조회할 수 없습니다." });
      } else {
        const started = performance.now();
        let health = null;
        let networkError = null;
        try {
          const response = await fetch(`${base}/health`, { cache: "no-store" });
          const text = await response.text();
          health = text ? JSON.parse(text) : {};
        } catch (error) {
          networkError = error;
        }
        const roundTripMs = Math.round(performance.now() - started);

        if (networkError) {
          cards.push(statusCard({
            icon: "dns",
            title: "로컬 API 서버",
            level: "error",
            badgeText: "응답 없음",
            meta: [["주소", base], ["확인 시간", `${roundTripMs}ms 후 실패`]],
            errorDetail: networkError.message
          }));
          cards.push(statusCard({
            icon: "database",
            title: "PostgreSQL 데이터베이스",
            level: "unknown",
            badgeText: "확인 불가",
            meta: [["안내", "API 서버에 연결할 수 없어 DB 상태를 확인하지 못했습니다."]]
          }));
          levels.push("error", "unknown");
          renderJobs({ error: "API 서버에 연결할 수 없습니다." });
        } else {
          const apiLevel = roundTripMs > 2000 ? "warn" : "ok";
          cards.push(statusCard({
            icon: "dns",
            title: "로컬 API 서버",
            level: apiLevel,
            badgeText: apiLevel === "ok" ? "정상" : "응답 지연",
            meta: [
              ["주소", base],
              ["응답 시간", `${roundTripMs}ms`],
              ["서버 시각", health.server_time ? new Date(health.server_time * 1000).toLocaleString("ko-KR") : "-"]
            ]
          }));
          levels.push(apiLevel);

          const db = health.database || {};
          const dbLevel = db.ok ? (Number(db.latency_ms || 0) > 500 ? "warn" : "ok") : "error";
          cards.push(statusCard({
            icon: "database",
            title: "PostgreSQL 데이터베이스",
            level: dbLevel,
            badgeText: db.ok ? "정상" : "연결 실패",
            meta: db.ok ? [
              ["쿼리 응답", `${db.latency_ms}ms`],
              ["활성 연결 수", db.connections ?? "-"],
              ["기동 시각", db.started_at ? new Date(db.started_at).toLocaleString("ko-KR") : "-"]
            ] : [["쿼리 응답", `${db.latency_ms ?? "-"}ms`]],
            errorDetail: db.ok ? null : db.error
          }));
          levels.push(dbLevel);

          renderJobs(health.jobs);
        }
      }

      gridEl.innerHTML = cards.join("");
      renderSummary(levels);
      lastCheckedEl.textContent = `마지막 확인: ${new Date().toLocaleTimeString("ko-KR")}`;
    } finally {
      checking = false;
      refreshButton.disabled = false;
    }
  }

  function scheduleAutoRefresh() {
    if (timerId) clearInterval(timerId);
    timerId = autoRefreshCheckbox.checked ? setInterval(checkStatus, AUTO_REFRESH_MS) : null;
  }

  refreshButton.addEventListener("click", checkStatus);
  autoRefreshCheckbox.addEventListener("change", scheduleAutoRefresh);

  checkStatus();
  scheduleAutoRefresh();
})();
