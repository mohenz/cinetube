(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setupChrome() {
    const menu = document.getElementById("mobileMenu");
    const backdrop = document.getElementById("drawerBackdrop");
    if (menu) menu.addEventListener("click", () => document.body.classList.toggle("menu-open"));
    if (backdrop) backdrop.addEventListener("click", () => document.body.classList.remove("menu-open"));

    // Centralized logout handler
    const logoutButtons = document.querySelectorAll(".logout-button-trigger");
    logoutButtons.forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (confirm("로그아웃 하시겠습니까?")) {
          await window.CineTubeStore.signOut();
          const prefix = window.location.pathname.includes("/admin/") ? "../" : "";
          window.location.href = prefix + "login.html";
        }
      });
    });
  }

  function setDbStatus(status) {
    const el = document.getElementById("dbStatus");
    if (!el) return;
    el.textContent = status.message;
    el.classList.toggle("ok", status.connected);
    el.classList.toggle("off", !status.connected);
  }

  function movieCard(movie) {
    const keywords = Array.isArray(movie.keywords) ? movie.keywords.join(", ") : movie.keywords || "";
    const posterUrl = movie.poster_url || movie.capture_url || "assets/img/favicon.svg";
    return `
      <article class="poster-card" title="${escapeHtml(movie.title)}">
        <div class="poster-frame">
          <img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(movie.title)} 포스터" loading="lazy">
          <div class="poster-overlay">
            <span class="rating">${escapeHtml(movie.rating_grade)}</span>
            <span>${escapeHtml(movie.release_month || "")} · ${escapeHtml(movie.category_name || "")}</span>
            <span>${escapeHtml(movie.actor_name || "")}</span>
          </div>
        </div>
        <h3 class="poster-title">${escapeHtml(movie.title)}</h3>
        <div class="poster-meta"><span>${escapeHtml(movie.movie_code)}</span><span>${escapeHtml(keywords)}</span></div>
      </article>`;
  }

  function movieSection(title, subtitle, movies) {
    return `
      <section>
        <div class="section-head">
          <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>
        </div>
        <div class="poster-grid">${movies.length ? movies.map(movieCard).join("") : `<div class="empty">표시할 영화정보가 없습니다.</div>`}</div>
      </section>`;
  }

  function ratingRank(movie) {
    const ranks = { "A+": 1, A: 2, "B+": 3, B: 4, C: 5 };
    return ranks[movie.rating_grade] || 99;
  }

  function matchesSearch(movie, term) {
    if (!term) return true;
    const haystack = [
      movie.title,
      movie.movie_code,
      movie.category_name,
      movie.actor_name,
      movie.rating_grade,
      Array.isArray(movie.keywords) ? movie.keywords.join(" ") : movie.keywords
    ].join(" ").toLowerCase();
    return haystack.includes(term.toLowerCase());
  }

  function paginate(items, page, pageSize) {
    if (pageSize === "all") return { items, totalPages: 1 };
    const size = Number(pageSize) || 20;
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * size;
    return { items: items.slice(start, start + size), totalPages, page: safePage };
  }

  function renderPagination(container, totalPages, currentPage, onMove) {
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = Array.from({ length: totalPages }, (_, index) => {
      const page = index + 1;
      return `<button class="page-button ${page === currentPage ? "active" : ""}" type="button" data-page="${page}">${page}</button>`;
    }).join("");
    container.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => onMove(Number(button.dataset.page)));
    });
  }

  window.CineTubeUI = {
    escapeHtml,
    setupChrome,
    setDbStatus,
    movieCard,
    movieSection,
    ratingRank,
    matchesSearch,
    paginate,
    renderPagination
  };
})();
