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

  }

  function setDbStatus(status) {
    const el = document.getElementById("dbStatus");
    if (!el) return;
    el.textContent = "Bloom Universe";
  }

  function routePath(path) {
    const inSubdirectory = window.location.pathname.includes("/pages/")
      || window.location.pathname.includes("/admin/")
      || window.location.pathname.includes("/auth/");
    return `${inSubdirectory ? "../" : ""}${path}`;
  }

  function movieCard(movie) {
    const keywords = Array.isArray(movie.keywords) ? movie.keywords.join(", ") : movie.keywords || "";
    const posterUrl = movie.poster_url || movie.capture_url || routePath("assets/img/favicon.svg");
    const detailUrl = `${routePath("pages/movie.html")}?code=${encodeURIComponent(movie.movie_code || movie.id || "")}`;
    return `
      <article class="poster-card" title="${escapeHtml(movie.title)}" data-movie-code="${escapeHtml(movie.movie_code || movie.id || "")}" data-movie-href="${escapeHtml(detailUrl)}" tabindex="0" role="link" aria-label="${escapeHtml(movie.title)} 영화정보 보기">
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

  function setupMovieCards(root = document) {
    async function openMovie(card) {
      const href = card.dataset.movieHref;
      const movieCode = card.dataset.movieCode;
      try {
        if (window.CineTubeStore?.recordMovieClick) await window.CineTubeStore.recordMovieClick(movieCode);
      } catch (error) {
        console.warn("클릭수 기록을 건너뜁니다.", error);
      }
      window.location.href = href;
    }

    root.querySelectorAll(".poster-card[data-movie-href]").forEach((card) => {
      if (card.dataset.boundMovieLink === "true") return;
      card.dataset.boundMovieLink = "true";
      card.addEventListener("click", () => {
        openMovie(card);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openMovie(card);
      });
    });
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
    setupMovieCards,
    routePath,
    movieSection,
    ratingRank,
    matchesSearch,
    paginate,
    renderPagination
  };
})();
