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

  function showError(message) {
    const existing = document.getElementById("errorBanner");
    if (existing) existing.remove();

    const banner = document.createElement("div");
    banner.id = "errorBanner";
    banner.style.position = "fixed";
    banner.style.top = "0";
    banner.style.left = "0";
    banner.style.right = "0";
    banner.style.background = "#ff4d4f";
    banner.style.color = "#fff";
    banner.style.padding = "1rem";
    banner.style.zIndex = "1000";
    banner.style.textAlign = "center";
    banner.textContent = message || "에러가 발생했습니다.";
    document.body.appendChild(banner);
  }

  function setDbStatus(status) {
    const el = document.getElementById("dbStatus");
    if (!el) return;
    const label = el.querySelector(".db-status-label");
    if (label) {
      label.textContent = "Bloom Universe";
      return;
    }
    el.textContent = "Bloom Universe";
  }

  function routePath(path) {
    const inSubdirectory = window.location.pathname.includes("/pages/")
      || window.location.pathname.includes("/admin/")
      || window.location.pathname.includes("/auth/");
    return `${inSubdirectory ? "../" : ""}${path}`;
  }

  function assetPublicUrl(asset) {
    return asset?.public_url || "";
  }

  function movieImageUrl(movie, fallback = routePath("assets/img/favicon.svg")) {
    return movie?.poster_url
      || assetPublicUrl(movie?.poster_asset)
      || movie?.capture_url
      || assetPublicUrl(movie?.capture_asset)
      || movie?.snapshot_url
      || assetPublicUrl(movie?.snapshot_asset)
      || fallback;
  }

  const favoriteStorageKey = "cinetube_favorite_movies";

  function favoriteMovieCode(movieOrCode) {
    if (typeof movieOrCode === "object") return String(movieOrCode?.movie_code || movieOrCode?.id || "");
    return String(movieOrCode || "");
  }

  function getFavoriteMovieCodes() {
    if (window.CineTubeStore?.favoriteIds) return window.CineTubeStore.favoriteIds("movie");
    try {
      const codes = JSON.parse(localStorage.getItem(favoriteStorageKey) || "[]");
      return Array.isArray(codes) ? codes.map(String).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  function saveFavoriteMovieCodes(codes) {
    localStorage.setItem(favoriteStorageKey, JSON.stringify([...new Set(codes.map(String).filter(Boolean))]));
  }

  function isFavoriteMovie(movieOrCode) {
    if (window.CineTubeStore?.isFavoriteItem) return window.CineTubeStore.isFavoriteItem("movie", movieOrCode);
    const code = favoriteMovieCode(movieOrCode);
    return Boolean(code) && getFavoriteMovieCodes().includes(code);
  }

  async function toggleFavoriteMovie(movieOrCode) {
    if (window.CineTubeStore?.toggleFavoriteItem) return await window.CineTubeStore.toggleFavoriteItem("movie", movieOrCode);
    const code = favoriteMovieCode(movieOrCode);
    if (!code) return false;
    const codes = getFavoriteMovieCodes();
    const exists = codes.includes(code);
    saveFavoriteMovieCodes(exists ? codes.filter((item) => item !== code) : [...codes, code]);
    return !exists;
  }

  function isFavoriteContent(contentType, contentOrId) {
    if (window.CineTubeStore?.isFavoriteItem) return window.CineTubeStore.isFavoriteItem(contentType, contentOrId);
    return contentType === "movie" ? isFavoriteMovie(contentOrId) : false;
  }

  async function toggleFavoriteContent(contentType, contentOrId) {
    if (window.CineTubeStore?.toggleFavoriteItem) return await window.CineTubeStore.toggleFavoriteItem(contentType, contentOrId);
    return contentType === "movie" ? await toggleFavoriteMovie(contentOrId) : false;
  }

  function favoriteButtonLabel(isFavorite) {
    return isFavorite ? "관심작품 해제" : "관심작품";
  }

  function updateFavoriteButton(button, isFavorite) {
    button.classList.toggle("active", isFavorite);
    button.setAttribute("aria-pressed", String(isFavorite));
    button.setAttribute("aria-label", favoriteButtonLabel(isFavorite));
    button.title = favoriteButtonLabel(isFavorite);
    const icon = button.querySelector(".material-symbols-outlined");
    if (icon) icon.textContent = isFavorite ? "favorite" : "favorite_border";
    const label = button.querySelector(".favorite-label");
    if (label) label.textContent = "관심작품";
  }

  function movieCard(movie) {
    const keywords = Array.isArray(movie.keywords) ? movie.keywords.join(", ") : movie.keywords || "";
    const posterUrl = movieImageUrl(movie);
    const detailUrl = `${routePath("pages/movie.html")}?code=${encodeURIComponent(movie.movie_code || movie.id || "")}`;
    const favoriteCode = favoriteMovieCode(movie);
    const favorite = isFavoriteMovie(favoriteCode);
    return `
      <article class="poster-card" title="${escapeHtml(movie.title)}" data-movie-code="${escapeHtml(movie.movie_code || movie.id || "")}" data-movie-href="${escapeHtml(detailUrl)}" tabindex="0" role="link" aria-label="${escapeHtml(movie.title)} 영화정보 보기">
        <div class="poster-frame">
          <img src="${escapeHtml(posterUrl)}" alt="${escapeHtml(movie.title)} 포스터" loading="lazy">
          <button class="favorite-toggle card-favorite-toggle ${favorite ? "active" : ""}" type="button" data-favorite-type="movie" data-favorite-code="${escapeHtml(favoriteCode)}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${escapeHtml(favoriteButtonLabel(favorite))}" title="${escapeHtml(favoriteButtonLabel(favorite))}">
            <span class="material-symbols-outlined">${favorite ? "favorite" : "favorite_border"}</span><span class="favorite-label">관심작품</span>
          </button>
          <div class="poster-overlay">
            <span class="rating">${escapeHtml(movie.rating_grade)}</span>
            <span>${escapeHtml(movie.release_month || "")} · ${escapeHtml(movie.category_name || "")}</span>
            <span>${escapeHtml(movie.actor_names || movie.actor_name || "")}</span>
          </div>
        </div>
        <h3 class="poster-title">${escapeHtml(movie.title)}</h3>
        <div class="poster-meta"><span>${escapeHtml(movie.movie_code)}</span><span>${escapeHtml(keywords)}</span></div>
      </article>`;
  }

  function setupFavoriteButtons(root = document, onChange, contentType = "movie") {
    root.querySelectorAll(".favorite-toggle[data-favorite-code]").forEach((button) => {
      const buttonType = button.dataset.favoriteType || contentType;
      if (buttonType !== contentType) return;
      if (button.dataset.boundFavorite === "true") return;
      button.dataset.boundFavorite = "true";
      updateFavoriteButton(button, isFavoriteContent(buttonType, button.dataset.favoriteCode));
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        button.disabled = true;
        try {
          const isFavorite = await toggleFavoriteContent(buttonType, button.dataset.favoriteCode);
          root.querySelectorAll(`.favorite-toggle[data-favorite-type="${CSS.escape(buttonType)}"][data-favorite-code="${CSS.escape(button.dataset.favoriteCode)}"]`).forEach((target) => updateFavoriteButton(target, isFavorite));
          if (typeof onChange === "function") onChange(button.dataset.favoriteCode, isFavorite);
        } catch (error) {
          alert(`관심작품 저장 실패: ${error.message}`);
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  function setupMovieCards(root = document, onFavoriteChange) {
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
      card.addEventListener("click", (event) => {
        if (event.target.closest(".favorite-toggle")) return;
        openMovie(card);
      });
      card.addEventListener("keydown", (event) => {
        if (event.target.closest(".favorite-toggle")) return;
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openMovie(card);
      });
    });
    setupFavoriteButtons(root, onFavoriteChange);
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
      movie.actor_names,
      Array.isArray(movie.director_names) ? movie.director_names.join(" ") : movie.director_names,
      movie.source_url,
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
    showError,
    setDbStatus,
    movieCard,
    movieImageUrl,
    getFavoriteMovieCodes,
    isFavoriteMovie,
    toggleFavoriteMovie,
    isFavoriteContent,
    toggleFavoriteContent,
    setupFavoriteButtons,
    updateFavoriteButton,
    setupMovieCards,
    routePath,
    movieSection,
    ratingRank,
    matchesSearch,
    paginate,
    renderPagination
  };
})();




