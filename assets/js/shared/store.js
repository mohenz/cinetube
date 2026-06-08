(function () {
  const imageBucket = "cinetube-images";
  const tableNames = {
    movies: "movies",
    categories: "categories",
    actors: "actors",
    ratings: "rating_grades",
    commonCodes: "common_codes",
    favoriteMovies: "favorite_movies",
    galleryImages: "gallery_images",
    webtoons: "webtoons",
    webtoonChapters: "webtoon_chapters",
    mediaAssets: "media_assets"
  };

  const localTableColumns = {
    movies: [
      "id", "title", "movie_code", "category_code", "actor_id", "actor_ids", "director_names",
      "source_url", "keywords", "rating_grade", "video_url", "description", "poster_url",
      "poster_asset_id", "capture_url", "capture_asset_id", "snapshot_asset_id", "release_month",
      "production_company", "recommendation_score", "rotten_tomatoes_score", "ranking_score",
      "click_count", "is_main", "created_at"
    ],
    categories: [
      "category_code", "name", "representative_image_url", "representative_image_asset_id",
      "is_visible", "created_at"
    ],
    actors: [
      "id", "name", "age", "height_cm", "body_size", "debut_year", "representative_image_url",
      "representative_image_asset_id", "image_urls", "image_asset_ids", "created_at"
    ],
    ratings: ["grade", "display_order"],
    commonCodes: ["id", "code_group", "code_value", "code_label", "display_order", "is_enabled", "extra", "created_at"],
    favoriteMovies: ["id", "user_key", "content_type", "content_id", "note", "metadata", "created_at"],
    galleryImages: [
      "id", "gallery_image_id", "title", "description", "image_asset_id",
      "source", "tags", "is_visible", "regdate", "created_at"
    ],
    webtoons: [
      "id", "webtoon_id", "title", "rating", "alternative", "artist", "genre", "type",
      "tage", "poster_image", "poster_image_asset_id", "url", "webtoon_images",
      "webtoon_image_asset_ids", "created_at"
    ],
    webtoonChapters: [
      "id", "webtoon_chapter_id", "webtoon_id", "chapter_number", "chapter_url",
      "chapter_poster", "chapter_poster_asset_id", "created_at"
    ],
    mediaAssets: [
      "id", "bucket_id", "object_path", "original_name", "mime_type", "size_bytes",
      "owner_table", "owner_field", "owner_id", "sort_order", "created_at"
    ]
  };

  const primaryKeys = {
    movies: "id",
    categories: "category_code",
    actors: "id",
    ratings: "grade",
    commonCodes: "id",
    favoriteMovies: "id",
    galleryImages: "id",
    webtoons: "id",
    webtoonChapters: "id"
  };

  const state = {
    client: null,
    localApiBase: "",
    mode: "sample",
    data: null,
    mediaAssetsReady: false,
    status: { connected: false, message: "샘플 데이터 사용 중" }
  };

  const favoriteUserKeyStorageKey = "cinetube_favorite_user_key";
  const legacyFavoriteMoviesStorageKey = "cinetube_favorite_movies";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function favoriteUserKey() {
    try {
      let key = localStorage.getItem(favoriteUserKeyStorageKey);
      if (!key) {
        key = `browser-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
        localStorage.setItem(favoriteUserKeyStorageKey, key);
      }
      return key;
    } catch (error) {
      return "local";
    }
  }

  function defaultCommonCodes() {
    return [
      { id: -1, code_group: "import_site", code_value: "auto", code_label: "자동 인식", display_order: 0, is_enabled: true, extra: { system: true } },
      { id: -2, code_group: "import_site", code_value: "tmdb", code_label: "TMDB", display_order: 10, is_enabled: true, extra: {} },
      { id: -3, code_group: "import_site", code_value: "javtiful", code_label: "Javtiful", display_order: 20, is_enabled: true, extra: {} },
      { id: -4, code_group: "import_site", code_value: "supjav", code_label: "Supjav", display_order: 30, is_enabled: true, extra: {} },
      { id: -5, code_group: "import_site", code_value: "missav", code_label: "MissAV", display_order: 40, is_enabled: true, extra: {} }
    ];
  }

  function hasConfig() {
    const config = window.CINETUBE_SUPABASE || {};
    return Boolean(config.url && config.anonKey && window.supabase);
  }

  function hasLocalApiConfig() {
    return Boolean(createLocalApiBase());
  }

  function createLocalApiBase() {
    const config = window.CINETUBE_LOCAL_API || {};
    const url = typeof config.url === "function" ? config.url() : config.url;
    return String(url || "").replace(/\/$/, "");
  }

  function createClient() {
    if (!hasConfig()) return null;
    const config = window.CINETUBE_SUPABASE;
    return window.supabase.createClient(config.url, config.anonKey);
  }

  function getPublicUrl(path) {
    const { data } = state.client.storage.from(imageBucket).getPublicUrl(path);
    return data.publicUrl;
  }

  function enrich(data) {
    const localClicks = getLocalClickCounts();
    const categoriesByCode = new Map(data.categories.map((item) => [item.category_code, item]));
    const actorsById = new Map(data.actors.map((item) => [String(item.id), item]));
    const mediaById = new Map((data.mediaAssets || []).map((item) => [String(item.id), item]));
    const ratingOrder = new Map(data.ratings.map((item) => [item.grade, Number(item.display_order || 99)]));
    const webtoonChaptersByWebtoon = new Map();
    (data.webtoonChapters || []).forEach((chapter) => {
      const key = String(chapter.webtoon_id || "");
      if (!webtoonChaptersByWebtoon.has(key)) webtoonChaptersByWebtoon.set(key, []);
      webtoonChaptersByWebtoon.get(key).push(chapter);
    });
    const movies = data.movies.map((movie) => {
      const category = categoriesByCode.get(movie.category_code) || {};
      const actorIds = (Array.isArray(movie.actor_ids) && movie.actor_ids.length ? movie.actor_ids : [movie.actor_id])
        .filter((id) => id !== undefined && id !== null && id !== "")
        .slice(0, 4);
      const actors = actorIds.map((id) => actorsById.get(String(id))).filter(Boolean);
      return {
        ...movie,
        actor_ids: actorIds,
        click_count: Number(movie.click_count || 0),
        local_click_count: Number(localClicks[movie.movie_code] || 0),
        ranking_score: Number(movie.ranking_score ?? movie.recommendation_score ?? 0),
        recommendation_score: Number(movie.recommendation_score || 0),
        rotten_tomatoes_score: movie.rotten_tomatoes_score === null || movie.rotten_tomatoes_score === undefined || movie.rotten_tomatoes_score === "" ? null : Number(movie.rotten_tomatoes_score),
        poster_asset: mediaById.get(String(movie.poster_asset_id)) || null,
        capture_asset: mediaById.get(String(movie.capture_asset_id)) || null,
        snapshot_asset: mediaById.get(String(movie.snapshot_asset_id)) || null,
        category_name: category.name || movie.category_code || "-",
        actor_list: actors,
        actor_name: actors[0]?.name || "-",
        actor_names: actors.map((actor) => actor.name).join(", ") || "-",
        director_names: Array.isArray(movie.director_names) ? movie.director_names.slice(0, 2).filter(Boolean) : [],
        rating_order: ratingOrder.get(movie.rating_grade) || 99
      };
    });
    const categories = data.categories.map((category) => ({
      ...category,
      representative_image_asset: mediaById.get(String(category.representative_image_asset_id)) || null
    }));
    const actors = data.actors.map((actor) => ({
      ...actor,
      representative_image_asset: mediaById.get(String(actor.representative_image_asset_id)) || null,
      image_assets: Array.isArray(actor.image_asset_ids) ? actor.image_asset_ids.map((id) => mediaById.get(String(id))).filter(Boolean) : []
    }));
    const webtoonChapters = (data.webtoonChapters || []).map((chapter) => ({
      ...chapter,
      chapter_poster_asset: mediaById.get(String(chapter.chapter_poster_asset_id)) || null
    })).sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0));
    const webtoons = (data.webtoons || []).map((webtoon) => ({
      ...webtoon,
      poster_image_asset: mediaById.get(String(webtoon.poster_image_asset_id)) || null,
      webtoon_image_assets: Array.isArray(webtoon.webtoon_image_asset_ids) ? webtoon.webtoon_image_asset_ids.map((id) => mediaById.get(String(id))).filter(Boolean) : [],
      webtoon_images: Array.isArray(webtoon.webtoon_images) ? webtoon.webtoon_images : [],
      tags: Array.isArray(webtoon.tage) ? webtoon.tage : String(webtoon.tage || "").split(",").map((item) => item.trim()).filter(Boolean),
      chapters: (webtoonChaptersByWebtoon.get(String(webtoon.webtoon_id || "")) || []).sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0))
    }));
    const galleryImages = (data.galleryImages || []).map((image) => ({
      ...image,
      image_asset: mediaById.get(String(image.image_asset_id)) || null,
      tags: Array.isArray(image.tags) ? image.tags : String(image.tags || "").split(",").map((item) => item.trim()).filter(Boolean)
    }));
    return { ...data, categories, actors, movies, webtoons, webtoonChapters, galleryImages, commonCodes: data.commonCodes || defaultCommonCodes(), favoriteMovies: data.favoriteMovies || [] };
  }

  function legacyFavoriteMovieCodes() {
    try {
      const codes = JSON.parse(localStorage.getItem(legacyFavoriteMoviesStorageKey) || "[]");
      return Array.isArray(codes) ? codes.map(String).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  function clearLegacyFavoriteMovieCodes() {
    try {
      localStorage.removeItem(legacyFavoriteMoviesStorageKey);
    } catch (error) {
      console.warn("기존 관심작품 로컬 캐시 삭제를 건너뜁니다.", error);
    }
  }

  async function migrateLegacyFavorites() {
    const codes = legacyFavoriteMovieCodes();
    if (!codes.length || !state.data || state.mode === "sample") return;
    const userKey = favoriteUserKey();
    const existing = new Set((state.data.favoriteMovies || [])
      .filter((item) => item.user_key === userKey && item.content_type === "movie")
      .map((item) => String(item.content_id)));
    const payloads = codes
      .filter((code) => !existing.has(String(code)))
      .map((code) => ({ user_key: userKey, content_type: "movie", content_id: String(code), metadata: { migrated_from: "localStorage" } }));
    if (!payloads.length) {
      clearLegacyFavoriteMovieCodes();
      return;
    }

    try {
      if (state.mode === "local") {
        for (const payload of payloads) {
          const inserted = await insertLocal("favoriteMovies", payload);
          if (inserted) state.data.favoriteMovies.unshift(inserted);
        }
      } else if (state.client) {
        const { data, error } = await state.client.from(tableNames.favoriteMovies).insert(payloads).select("*");
        if (error) throw error;
        state.data.favoriteMovies.unshift(...(data || []));
      }
      clearLegacyFavoriteMovieCodes();
      resetData(state.data);
    } catch (error) {
      console.warn("기존 관심작품 DB 이전을 건너뜁니다.", error);
    }
  }

  async function fetchTable(client, kind) {
    if (state.mode === "local") return fetchLocalTable(kind);
    const table = tableNames[kind];
    const orderColumn = kind === "ratings" || kind === "commonCodes" ? "display_order" : "created_at";
    let query = client.from(table).select("*");
    if (kind === "ratings" || kind === "commonCodes") query = query.order(orderColumn, { ascending: true });
    if (kind !== "ratings" && kind !== "commonCodes") query = query.order(orderColumn, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  function localHeaders(extra = {}) {
    return {
      "Content-Type": "application/json",
      ...extra
    };
  }

  function encodeFilterValue(value) {
    return encodeURIComponent(String(value).replace(/"/g, '\\"'));
  }

  async function requestLocal(path, options = {}) {
    const response = await fetch(`${state.localApiBase}${path}`, {
      ...options,
      headers: localHeaders(options.headers || {})
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Local DB request failed: HTTP ${response.status}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async function fetchLocalTable(kind) {
    const table = tableNames[kind];
    const orderColumn = kind === "ratings" || kind === "commonCodes" ? "display_order" : "created_at";
    const direction = kind === "ratings" || kind === "commonCodes" ? "asc" : "desc";
    const columns = localTableColumns[kind]?.join(",") || "*";
    return await requestLocal(`/${table}?select=${encodeURIComponent(columns)}&order=${orderColumn}.${direction}`) || [];
  }

  async function insertLocal(kind, payload) {
    const table = tableNames[kind];
    const rows = await requestLocal(`/${table}`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function updateLocal(kind, keyValue, payload) {
    const table = tableNames[kind];
    const primaryKey = primaryKeys[kind];
    const rows = await requestLocal(`/${table}?${primaryKey}=eq.${encodeFilterValue(keyValue)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload)
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function removeLocal(kind, keyValue) {
    const table = tableNames[kind];
    const primaryKey = primaryKeys[kind];
    await requestLocal(`/${table}?${primaryKey}=eq.${encodeFilterValue(keyValue)}`, {
      method: "DELETE"
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error("이미지 파일을 읽지 못했습니다."));
      reader.readAsDataURL(file);
    });
  }

  async function fetchOptionalTable(client, kind) {
    try {
      const data = await fetchTable(client, kind);
      if (kind === "mediaAssets") state.mediaAssetsReady = true;
      return data;
    } catch (error) {
      if (kind === "mediaAssets") state.mediaAssetsReady = false;
      console.warn(`${tableNames[kind]} 테이블을 읽지 못했습니다.`, error);
      return [];
    }
  }

  async function load() {
    if (state.data) return state.data;
    state.localApiBase = createLocalApiBase();
    if (hasLocalApiConfig()) {
      state.mode = "local";
      state.client = null;
      try {
        const [movies, categories, actors, ratings, commonCodes, favoriteMovies, webtoons, webtoonChapters, galleryImages, mediaAssets] = await Promise.all([
          fetchTable(null, "movies"),
          fetchTable(null, "categories"),
          fetchTable(null, "actors"),
          fetchTable(null, "ratings"),
          fetchOptionalTable(null, "commonCodes"),
          fetchOptionalTable(null, "favoriteMovies"),
          fetchOptionalTable(null, "webtoons"),
          fetchOptionalTable(null, "webtoonChapters"),
          fetchOptionalTable(null, "galleryImages"),
          fetchOptionalTable(null, "mediaAssets")
        ]);
        state.data = enrich({ movies, categories, actors, ratings, commonCodes, favoriteMovies, webtoons, webtoonChapters, galleryImages, mediaAssets });
        await migrateLegacyFavorites();
        state.status = { connected: true, message: "CineTube API 연결됨" };
        return state.data;
      } catch (error) {
        console.error(error);
        state.data = enrich({ ...clone(window.CineTubeSampleData), commonCodes: defaultCommonCodes(), favoriteMovies: [], webtoons: [], webtoonChapters: [], galleryImages: [], mediaAssets: [] });
        state.status = { connected: false, message: "CineTube API 오류: 샘플 데이터" };
        return state.data;
      }
    }

    state.mode = hasConfig() ? "supabase" : "sample";
    state.client = createClient();
    if (!state.client) {
      state.mediaAssetsReady = true;
      state.data = enrich({ ...clone(window.CineTubeSampleData), commonCodes: defaultCommonCodes(), favoriteMovies: legacyFavoriteMovieCodes().map((code, index) => ({ id: -index - 1, user_key: favoriteUserKey(), content_type: "movie", content_id: code })), webtoons: [], webtoonChapters: [], galleryImages: [], mediaAssets: [] });
      state.status = { connected: false, message: "DB 미설정: 샘플 데이터" };
      return state.data;
    }

    try {
      const [movies, categories, actors, ratings, commonCodes, favoriteMovies, webtoons, webtoonChapters, galleryImages, mediaAssets] = await Promise.all([
        fetchTable(state.client, "movies"),
        fetchTable(state.client, "categories"),
        fetchTable(state.client, "actors"),
        fetchTable(state.client, "ratings"),
        fetchOptionalTable(state.client, "commonCodes"),
        fetchOptionalTable(state.client, "favoriteMovies"),
        fetchOptionalTable(state.client, "webtoons"),
        fetchOptionalTable(state.client, "webtoonChapters"),
        fetchOptionalTable(state.client, "galleryImages"),
        fetchOptionalTable(state.client, "mediaAssets")
      ]);
      state.data = enrich({ movies, categories, actors, ratings, commonCodes, favoriteMovies, webtoons, webtoonChapters, galleryImages, mediaAssets });
      await migrateLegacyFavorites();
      state.status = { connected: true, message: "Supabase 연결됨" };
      return state.data;
    } catch (error) {
      console.error(error);
      state.data = enrich({ ...clone(window.CineTubeSampleData), commonCodes: defaultCommonCodes(), favoriteMovies: legacyFavoriteMovieCodes().map((code, index) => ({ id: -index - 1, user_key: favoriteUserKey(), content_type: "movie", content_id: code })), webtoons: [], webtoonChapters: [], galleryImages: [], mediaAssets: [] });
      state.status = { connected: false, message: "Supabase 오류: 샘플 데이터" };
      return state.data;
    }
  }

  function resetData(nextData) {
    state.data = enrich(nextData);
    return state.data;
  }

  function getLocalClickCounts() {
    try {
      return JSON.parse(localStorage.getItem("cinetube_movie_clicks") || "{}");
    } catch (error) {
      console.warn("클릭수 로컬 캐시를 읽지 못했습니다.", error);
      return {};
    }
  }

  function setLocalClickCount(movieCode, value) {
    if (!movieCode) return;
    const counts = getLocalClickCounts();
    counts[movieCode] = Math.max(0, Number(value || 0));
    localStorage.setItem("cinetube_movie_clicks", JSON.stringify(counts));
  }

  function effectiveClickCount(movie) {
    return Number(movie?.click_count || 0) + Number(movie?.local_click_count || 0);
  }

  async function create(kind, payload) {
    await load();
    if (state.client) {
      const table = tableNames[kind];
      const { data, error } = await state.client.from(table).insert(payload).select().single();
      if (error) throw error;
      if (!data) throw new Error(`${table} 등록 결과가 없습니다.`);
      state.data[kind].unshift(data);
    } else if (state.mode === "local") {
      const data = await insertLocal(kind, payload);
      if (!data) throw new Error(`${tableNames[kind]} 등록 결과가 없습니다.`);
      state.data[kind].unshift(data);
    } else {
      const next = { ...payload };
      if (kind === "movies" || kind === "actors" || kind === "webtoons" || kind === "webtoonChapters" || kind === "galleryImages" || kind === "favoriteMovies") next.id = Date.now();
      if (kind !== "ratings") next.created_at = new Date().toISOString();
      state.data[kind].unshift(next);
    }
    return resetData(state.data);
  }

  async function update(kind, keyValue, payload) {
    await load();
    const primaryKey = primaryKeys[kind];
    if (state.client) {
      const table = tableNames[kind];
      const { data, error } = await state.client.from(table).update(payload).eq(primaryKey, keyValue).select().single();
      if (error) throw error;
      if (!data) throw new Error(`${table} 수정 결과가 없습니다.`);
      state.data[kind] = state.data[kind].map((item) => String(item[primaryKey]) === String(keyValue) ? data : item);
    } else if (state.mode === "local") {
      const data = await updateLocal(kind, keyValue, payload);
      if (!data) throw new Error(`${tableNames[kind]} 수정 결과가 없습니다.`);
      state.data[kind] = state.data[kind].map((item) => String(item[primaryKey]) === String(keyValue) ? data : item);
    } else {
      state.data[kind] = state.data[kind].map((item) => String(item[primaryKey]) === String(keyValue) ? { ...item, ...payload } : item);
    }
    return resetData(state.data);
  }

  // 메인전시 단독 보장: 지정 영화 ID를 제외한 모든 is_main=true 영화를 is_main=false로 해제
  async function clearMainMovies(exceptMovieId) {
    await load();
    const primaryKey = primaryKeys.movies;
    const othersMain = state.data.movies.filter(
      (m) => m.is_main === true && String(m.id) !== String(exceptMovieId)
    );
    if (!othersMain.length) return state.data;

    if (state.client) {
      const ids = othersMain.map((m) => m.id);
      const { error } = await state.client
        .from(tableNames.movies)
        .update({ is_main: false })
        .in(primaryKey, ids);
      if (error) throw error;
    } else if (state.mode === "local") {
      for (const movie of othersMain) {
        await updateLocal("movies", movie.id, { is_main: false });
      }
    }

    state.data.movies = state.data.movies.map((m) =>
      othersMain.some((o) => String(o.id) === String(m.id)) ? { ...m, is_main: false } : m
    );
    resetData(state.data);
  }

  async function remove(kind, keyValue) {
    await load();
    const primaryKey = primaryKeys[kind];
    if (state.client) {
      const table = tableNames[kind];
      const { error } = await state.client.from(table).delete().eq(primaryKey, keyValue);
      if (error) throw error;
    } else if (state.mode === "local") {
      await removeLocal(kind, keyValue);
    }
    state.data[kind] = state.data[kind].filter((item) => String(item[primaryKey]) !== String(keyValue));
    return resetData(state.data);
  }

  async function loadGalleryImagesWithUrls() {
    await load();
    if (state.mode !== "local") return state.data.galleryImages || [];
    const galleryImages = await requestLocal(`/${tableNames.galleryImages}?select=*&order=created_at.desc`) || [];
    resetData({ ...state.data, galleryImages });
    return state.data.galleryImages || [];
  }

  async function loadMovieWithUrls(codeOrId) {
    await load();
    const key = String(codeOrId || "");
    if (!key) return null;
    if (state.mode !== "local") {
      return state.data.movies.find((item) => String(item.movie_code) === key || String(item.id) === key) || null;
    }
    let rows = await requestLocal(`/${tableNames.movies}?select=*&movie_code=eq.${encodeFilterValue(key)}&order=created_at.desc`) || [];
    if (!rows.length) rows = await requestLocal(`/${tableNames.movies}?select=*&id=eq.${encodeFilterValue(key)}&order=created_at.desc`) || [];
    const movie = rows[0] || null;
    if (!movie) return null;
    const movies = state.data.movies.map((item) => String(item.id) === String(movie.id) ? movie : item);
    if (!movies.some((item) => String(item.id) === String(movie.id))) movies.unshift(movie);
    resetData({ ...state.data, movies });
    return state.data.movies.find((item) => String(item.id) === String(movie.id)) || null;
  }

  async function loadMediaAssetsWithUrls() {
    await load();
    if (state.mode !== "local") return state.data.mediaAssets || [];
    const mediaAssets = await requestLocal(`/${tableNames.mediaAssets}?select=*&order=created_at.desc`) || [];
    resetData({ ...state.data, mediaAssets });
    return state.data.mediaAssets || [];
  }

  async function databaseMetadata() {
    await load();
    if (state.mode !== "local") return null;
    return await requestLocal("/metadata/database");
  }

  function favoriteContentId(contentOrId, contentType = "movie") {
    if (typeof contentOrId === "object") {
      if (contentType === "webtoon") return String(contentOrId?.webtoon_id || contentOrId?.id || "");
      if (contentType === "gallery") return String(contentOrId?.gallery_image_id || contentOrId?.id || "");
      return String(contentOrId?.movie_code || contentOrId?.id || "");
    }
    return String(contentOrId || "");
  }

  function favoriteItems(contentType = "movie") {
    const userKey = favoriteUserKey();
    return (state.data?.favoriteMovies || []).filter((item) => (
      item.user_key === userKey
      && item.content_type === contentType
    ));
  }

  function favoriteIds(contentType = "movie") {
    return favoriteItems(contentType).map((item) => String(item.content_id));
  }

  function isFavoriteItem(contentType, contentOrId) {
    const contentId = favoriteContentId(contentOrId, contentType);
    return Boolean(contentId) && favoriteIds(contentType).includes(contentId);
  }

  async function toggleFavoriteItem(contentType, contentOrId) {
    await load();
    const contentId = favoriteContentId(contentOrId, contentType);
    if (!contentId) return false;
    const userKey = favoriteUserKey();
    const existing = (state.data.favoriteMovies || []).find((item) => (
      item.user_key === userKey
      && item.content_type === contentType
      && String(item.content_id) === contentId
    ));
    if (existing) {
      if (state.mode === "sample") {
        const nextCodes = legacyFavoriteMovieCodes().filter((code) => code !== contentId);
        localStorage.setItem(legacyFavoriteMoviesStorageKey, JSON.stringify(nextCodes));
      }
      await remove("favoriteMovies", existing.id);
      return false;
    }

    const payload = {
      user_key: userKey,
      content_type: contentType,
      content_id: contentId,
      metadata: {}
    };
    if (state.mode === "sample" && contentType === "movie") {
      localStorage.setItem(legacyFavoriteMoviesStorageKey, JSON.stringify([...new Set([...legacyFavoriteMovieCodes(), contentId])]));
    }
    await create("favoriteMovies", payload);
    return true;
  }

  async function recordMovieClick(movieCode) {
    await load();
    const movie = state.data.movies.find((item) => String(item.movie_code) === String(movieCode) || String(item.id) === String(movieCode));
    if (!movie) return;

    const localClicks = Number(movie.local_click_count || 0) + 1;
    setLocalClickCount(movie.movie_code, localClicks);
    movie.local_click_count = localClicks;

    if ((!state.client && state.mode !== "local") || movie.click_count === undefined) {
      resetData(state.data);
      return;
    }

    const nextClickCount = Number(movie.click_count || 0) + 1;
    if (state.mode === "local") {
      try {
        await updateLocal("movies", movie.id, { click_count: nextClickCount });
      } catch (error) {
        console.warn("영화 클릭수 저장을 건너뜁니다.", error);
        resetData(state.data);
        return;
      }
    } else {
      const { error } = await state.client
        .from(tableNames.movies)
        .update({ click_count: nextClickCount })
        .eq(primaryKeys.movies, movie.id);

      if (error) {
        console.warn("영화 클릭수 저장을 건너뜁니다.", error);
        resetData(state.data);
        return;
      }
    }

    setLocalClickCount(movie.movie_code, 0);
    movie.click_count = nextClickCount;
    movie.local_click_count = 0;
    resetData(state.data);
  }

  async function uploadMedia({ file, ownerTable, ownerField, ownerId = null, sortOrder = 0 }) {
    await load();
    if (!file) return null;

    const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
    const safeField = ownerField.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const objectPath = `${ownerTable}/${safeField}/${id}.${extension}`;

    if (state.mode === "local") {
      const publicUrl = await readFileAsDataUrl(file);
      const assetPayload = {
        bucket_id: "local-inline",
        object_path: objectPath,
        public_url: publicUrl,
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        owner_table: ownerTable,
        owner_field: ownerField,
        owner_id: ownerId,
        sort_order: sortOrder
      };
      const data = await insertLocal("mediaAssets", assetPayload);
      state.data.mediaAssets = [data, ...(state.data.mediaAssets || [])];
      resetData(state.data);
      return data;
    }

    if (!state.client) {
      return {
        id: `local-${id}`,
        bucket_id: imageBucket,
        object_path: objectPath,
        public_url: URL.createObjectURL(file),
        original_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        owner_table: ownerTable,
        owner_field: ownerField,
        owner_id: ownerId,
        sort_order: sortOrder
      };
    }

    if (!state.mediaAssetsReady) {
      throw new Error("이미지 메타정보 저장을 위해 media_assets 테이블과 Storage 정책을 먼저 적용해야 합니다.");
    }

    const upload = await state.client.storage.from(imageBucket).upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (upload.error) throw upload.error;

    const assetPayload = {
      bucket_id: imageBucket,
      object_path: objectPath,
      public_url: getPublicUrl(objectPath),
      original_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      owner_table: ownerTable,
      owner_field: ownerField,
      owner_id: ownerId,
      sort_order: sortOrder
    };
    const { data, error } = await state.client.from(tableNames.mediaAssets).insert(assetPayload).select().single();
    if (error) throw error;
    state.data.mediaAssets = [data, ...(state.data.mediaAssets || [])];
    resetData(state.data);
    return data;
  }

  async function updateMediaOwner(assetIds, ownerId) {
    await load();
    const ids = (assetIds || []).filter(Boolean);
    if (!ids.length) return;
    if (state.client) {
      const { error } = await state.client.from(tableNames.mediaAssets).update({ owner_id: String(ownerId) }).in("id", ids);
      if (error) throw error;
    } else if (state.mode === "local") {
      for (const id of ids) {
        await requestLocal(`/${tableNames.mediaAssets}?id=eq.${encodeFilterValue(id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ owner_id: String(ownerId) })
        });
      }
    }
    state.data.mediaAssets = (state.data.mediaAssets || []).map((asset) => ids.includes(asset.id) ? { ...asset, owner_id: String(ownerId) } : asset);
    resetData(state.data);
  }

  async function deleteMedia(asset) {
    await load();
    if (!asset || !asset.id) return;
    if (state.client) {
      if (asset.object_path) {
        const remove = await state.client.storage.from(asset.bucket_id || imageBucket).remove([asset.object_path]);
        if (remove.error) console.warn(remove.error);
      }
      const { error } = await state.client.from(tableNames.mediaAssets).delete().eq("id", asset.id);
      if (error) throw error;
    } else if (state.mode === "local") {
      await requestLocal(`/${tableNames.mediaAssets}?id=eq.${encodeFilterValue(asset.id)}`, {
        method: "DELETE"
      });
    }
    state.data.mediaAssets = (state.data.mediaAssets || []).filter((item) => String(item.id) !== String(asset.id));
    resetData(state.data);
  }

  async function signIn(email, password) {
    return { user: { id: "local-user", email: email || "local@cinetube", displayName: "Local User" } };
  }

  async function signOut() {
    return true;
  }

  async function isAuthenticated() {
    return true;
  }

  window.CineTubeStore = {
    load,
    create,
    update,
    remove,
    recordMovieClick,
    effectiveClickCount,
    favoriteUserKey,
    favoriteIds,
    favoriteItems,
    isFavoriteItem,
    toggleFavoriteItem,
    uploadMedia,
    updateMediaOwner,
    deleteMedia,
    clearMainMovies,
    loadGalleryImagesWithUrls,
    loadMovieWithUrls,
    loadMediaAssetsWithUrls,
    databaseMetadata,
    signIn,
    signOut,
    isAuthenticated,
    getStatus: () => state.status,
    primaryKeys
  };
})();











