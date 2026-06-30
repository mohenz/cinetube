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
      "id", "bucket_id", "object_path", "thumb_url", "original_name", "mime_type", "size_bytes",
      "owner_table", "owner_field", "owner_id", "sort_order", "created_at"
    ]
  };

  const supabaseTableColumns = {
    ...localTableColumns,
    mediaAssets: [...localTableColumns.mediaAssets, "public_url"].filter((column) => column !== "thumb_url")
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
  const sharedFavoriteUserKey = "cinetube-shared";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function favoriteUserKey() {
    try {
      return localStorage.getItem(favoriteUserKeyStorageKey) || sharedFavoriteUserKey;
    } catch (error) {
      return sharedFavoriteUserKey;
    }
  }

  function favoriteWriteUserKey() {
    return sharedFavoriteUserKey;
  }

  function defaultCommonCodes() {
    return [
      { id: -1, code_group: "import_site", code_value: "auto", code_label: "자동 인식", display_order: 0, is_enabled: true, extra: { system: true } },
      { id: -2, code_group: "import_site", code_value: "tmdb", code_label: "TMDB", display_order: 10, is_enabled: true, extra: {} },
      { id: -3, code_group: "import_site", code_value: "javtiful", code_label: "Javtiful", display_order: 20, is_enabled: true, extra: {} },
      { id: -4, code_group: "import_site", code_value: "supjav", code_label: "Supjav", display_order: 30, is_enabled: true, extra: {} },
      { id: -5, code_group: "import_site", code_value: "missav", code_label: "123AV", display_order: 40, is_enabled: true, extra: { placeholder: "https://123av.com/ko/v/... 또는 작품번호" } },
      { id: -101, code_group: "webtoon_import_site", code_value: "auto", code_label: "자동 인식", display_order: 0, is_enabled: true, extra: { system: true } },
      { id: -102, code_group: "webtoon_import_site", code_value: "mangadistrict", code_label: "MangaDistrict", display_order: 10, is_enabled: true, extra: { placeholder: "https://mangadistrict.com/series/..." } },
      { id: -103, code_group: "webtoon_import_site", code_value: "mangadna", code_label: "MangaDNA", display_order: 15, is_enabled: true, extra: { placeholder: "https://mangadna.com/manga/..." } },
      { id: -104, code_group: "webtoon_import_site", code_value: "hentai18", code_label: "Hentai18", display_order: 20, is_enabled: true, extra: { placeholder: "https://hentai18.net/read-hentai/..." } },
      { id: -105, code_group: "webtoon_import_site", code_value: "imhentai", code_label: "IMHentai", display_order: 30, is_enabled: true, extra: { placeholder: "https://imhentai.xxx/gallery/..." } }
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
    const actorMovieCounts = new Map();
    movies.forEach((movie) => {
      const actorIds = (Array.isArray(movie.actor_ids) && movie.actor_ids.length ? movie.actor_ids : [movie.actor_id])
        .filter((id) => id !== undefined && id !== null && id !== "");
      new Set(actorIds.map(String)).forEach((id) => {
        actorMovieCounts.set(id, (actorMovieCounts.get(id) || 0) + 1);
      });
    });
    const categories = data.categories.map((category) => ({
      ...category,
      representative_image_asset: mediaById.get(String(category.representative_image_asset_id)) || null
    }));
    const actors = data.actors.map((actor) => ({
      ...actor,
      movie_count: actorMovieCounts.get(String(actor.id)) || 0,
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
    const userKey = favoriteWriteUserKey();
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
    const columns = (supabaseTableColumns[kind] || ["*"]).join(",");
    let query = client.from(table).select(columns);
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

  function listPageSize(value, fallback = 20) {
    if (String(value).toLowerCase() === "all") return "all";
    const number = Number(value || fallback);
    if (!Number.isFinite(number) || number <= 0) return fallback;
    return Math.min(Math.max(Math.floor(number), 1), 200);
  }

  function listOffset(page, pageSize) {
    if (pageSize === "all") return 0;
    return Math.max(0, (Math.max(1, Number(page || 1)) - 1) * Number(pageSize || 20));
  }

  function mergeByPrimaryKey(kind, items) {
    const primaryKey = primaryKeys[kind];
    const existing = new Map((state.data?.[kind] || []).map((item) => [String(item[primaryKey]), item]));
    (items || []).forEach((item) => existing.set(String(item[primaryKey]), item));
    return Array.from(existing.values());
  }

  async function ensureListContext(options = {}) {
    if (state.data) return state.data;
    state.localApiBase = createLocalApiBase();
    if (hasLocalApiConfig()) {
      state.mode = "local";
      state.client = null;
      try {
        const includeActors = options.includeActors !== false;
        const [categories, actors, ratings, commonCodes, favoriteMovies, mediaAssets] = await Promise.all([
          fetchTable(null, "categories"),
          includeActors ? fetchTable(null, "actors") : Promise.resolve([]),
          fetchTable(null, "ratings"),
          fetchOptionalTable(null, "commonCodes"),
          fetchOptionalTable(null, "favoriteMovies"),
          fetchOptionalTable(null, "mediaAssets")
        ]);
        state.data = enrich({ movies: [], categories, actors, ratings, commonCodes, favoriteMovies, webtoons: [], webtoonChapters: [], galleryImages: [], mediaAssets });
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
    if (!state.client) return await load();

    try {
      const includeActors = options.includeActors !== false;
      const [categories, actors, ratings, commonCodes, favoriteMovies, mediaAssets] = await Promise.all([
        fetchTable(state.client, "categories"),
        includeActors ? fetchTable(state.client, "actors") : Promise.resolve([]),
        fetchTable(state.client, "ratings"),
        fetchOptionalTable(state.client, "commonCodes"),
        fetchOptionalTable(state.client, "favoriteMovies"),
        fetchOptionalTable(state.client, "mediaAssets")
      ]);
      state.data = enrich({ movies: [], categories, actors, ratings, commonCodes, favoriteMovies, webtoons: [], webtoonChapters: [], galleryImages: [], mediaAssets });
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

  function listOrder(kind, requestedOrder) {
    if (requestedOrder) return requestedOrder;
    if (kind === "actors") return "name.asc";
    if (kind === "galleryImages") return "regdate.desc";
    return "created_at.desc";
  }

  function localListColumns(kind, includeUrls = false) {
    if (includeUrls && kind === "galleryImages") return "*";
    return localTableColumns[kind]?.join(",") || "*";
  }

  async function listLocal(kind, options = {}) {
    const table = tableNames[kind];
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = listPageSize(options.pageSize, 20);
    const order = listOrder(kind, options.order);
    const params = new URLSearchParams({
      select: localListColumns(kind, options.includeUrls),
      order,
      count: "exact",
      search: String(options.search || "")
    });
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") params.set(key, `eq.${value}`);
    });
    if (pageSize !== "all") {
      params.set("limit", String(pageSize));
      params.set("offset", String(listOffset(page, pageSize)));
    }
    const result = await requestLocal(`/${table}?${params.toString()}`) || {};
    return {
      items: Array.isArray(result.items) ? result.items : [],
      total: Number(result.total || 0),
      page,
      pageSize
    };
  }

  async function listSupabase(kind, options = {}) {
    const table = tableNames[kind];
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = listPageSize(options.pageSize, 20);
    const [column, direction = "desc"] = listOrder(kind, options.order).split(".");
    
    const defaultSelect = kind === "movies"
      ? "id, title, movie_code, category_code, actor_id, actor_ids, director_names, rating_grade, release_month, recommendation_score, rotten_tomatoes_score, ranking_score, click_count, is_main, created_at, poster_asset_id, capture_asset_id, snapshot_asset_id"
      : options.includeUrls && kind === "galleryImages"
        ? "*"
        : (supabaseTableColumns[kind] || ["*"]).join(",");
    const selectColumns = options.select || defaultSelect;
    
    let query = state.client.from(table).select(selectColumns, { count: "exact" }).order(column, { ascending: direction === "asc" });
    Object.entries(options.filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query = query.eq(key, value);
    });
    const term = String(options.search || "").trim();
    if (term) {
      if (kind === "movies") query = query.or(`title.ilike.%${term}%,movie_code.ilike.%${term}%,description.ilike.%${term}%,category_code.ilike.%${term}%`);
      if (kind === "galleryImages") query = query.or(`title.ilike.%${term}%,gallery_image_id.ilike.%${term}%,description.ilike.%${term}%,source.ilike.%${term}%`);
      if (kind === "actors") query = query.or(`name.ilike.%${term}%,body_size.ilike.%${term}%`);
    }
    if (pageSize !== "all") {
      const from = listOffset(page, pageSize);
      query = query.range(from, from + Number(pageSize) - 1);
    }
    const { data, error, count } = await query;
    if (error) throw error;
    return { items: data || [], total: Number(count || 0), page, pageSize };
  }

  function listSample(kind, options = {}) {
    const page = Math.max(1, Number(options.page || 1));
    const pageSize = listPageSize(options.pageSize, 20);
    const term = String(options.search || "").trim();
    let items = (state.data?.[kind] || []).slice();
    if (term) {
      if (kind === "movies") items = items.filter((movie) => [movie.title, movie.movie_code, movie.description, movie.category_code].join(" ").toLowerCase().includes(term.toLowerCase()));
      if (kind === "galleryImages") items = items.filter((item) => [item.title, item.gallery_image_id, item.description, item.source].join(" ").toLowerCase().includes(term.toLowerCase()));
      if (kind === "actors") items = items.filter((actor) => [actor.name, actor.body_size, actor.debut_year, actor.age, actor.height_cm].join(" ").toLowerCase().includes(term.toLowerCase()));
    }
    const total = items.length;
    if (pageSize !== "all") items = items.slice(listOffset(page, pageSize), listOffset(page, pageSize) + Number(pageSize));
    return { items, total, page, pageSize };
  }

  async function list(kind, options = {}) {
    await ensureListContext({ includeActors: kind !== "actors" });
    let result;
    if (state.mode === "local") {
      result = await listLocal(kind, options);
    } else if (state.client) {
      result = await listSupabase(kind, options);
    } else {
      result = listSample(kind, options);
    }

    const nextData = { ...state.data, [kind]: mergeByPrimaryKey(kind, result.items) };
    resetData(nextData);
    const primaryKey = primaryKeys[kind];
    const byId = new Map((state.data[kind] || []).map((item) => [String(item[primaryKey]), item]));
    return {
      ...result,
      items: result.items.map((item) => byId.get(String(item[primaryKey])) || item)
    };
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

  function createImageThumbnail(file, maxSize = 300) {
    return new Promise((resolve) => {
      if (!file || !file.type?.startsWith("image/")) {
        resolve("");
        return;
      }
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          resolve("");
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.78));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve("");
      };
      image.src = objectUrl;
    });
  }

  async function loadGalleryImagesWithUrls() {
    await load();
    if (state.client && state.mode !== "local") {
      const { data, error } = await state.client
        .from(tableNames.galleryImages)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      resetData({ ...state.data, galleryImages: data || [] });
      return state.data.galleryImages || [];
    }
    if (state.mode !== "local") return state.data.galleryImages || [];
    const galleryImages = await requestLocal(`/${tableNames.galleryImages}?select=*&order=created_at.desc`) || [];
    resetData({ ...state.data, galleryImages });
    return state.data.galleryImages || [];
  }

  async function loadMovieWithUrls(codeOrId) {
    await load();
    const key = String(codeOrId || "");
    if (!key) return null;
    if (state.client && state.mode !== "local") {
      let query = state.client
        .from(tableNames.movies)
        .select("*")
        .eq("movie_code", key)
        .order("created_at", { ascending: false })
        .limit(1);
      let { data, error } = await query;
      if (error) throw error;
      if (!data?.length && /^\d+$/.test(key)) {
        const fallback = await state.client
          .from(tableNames.movies)
          .select("*")
          .eq("id", key)
          .order("created_at", { ascending: false })
          .limit(1);
        data = fallback.data;
        error = fallback.error;
        if (error) throw error;
      }
      const movie = data?.[0] || null;
      if (!movie) return null;
      const movies = state.data.movies.map((item) => String(item.id) === String(movie.id) ? movie : item);
      if (!movies.some((item) => String(item.id) === String(movie.id))) movies.unshift(movie);
      resetData({ ...state.data, movies });
      return state.data.movies.find((item) => String(item.id) === String(movie.id)) || null;
    }
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
    const seen = new Set();
    return (state.data?.favoriteMovies || []).filter((item) => {
      if (item.content_type !== contentType) return false;
      const contentId = String(item.content_id || "");
      if (!contentId || seen.has(contentId)) return false;
      seen.add(contentId);
      return true;
    });
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
    const existingItems = (state.data.favoriteMovies || []).filter((item) => (
      item.content_type === contentType
      && String(item.content_id) === contentId
    ));
    if (existingItems.length) {
      if (state.mode === "sample") {
        const nextCodes = legacyFavoriteMovieCodes().filter((code) => code !== contentId);
        localStorage.setItem(legacyFavoriteMoviesStorageKey, JSON.stringify(nextCodes));
      }
      for (const item of existingItems) await remove("favoriteMovies", item.id);
      return false;
    }

    const payload = {
      user_key: favoriteWriteUserKey(),
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
      const dataUrl = await readFileAsDataUrl(file);
      const thumbDataUrl = await createImageThumbnail(file);
      const rows = await requestLocal("/media/upload", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          data_url: dataUrl,
          thumb_data_url: thumbDataUrl,
          original_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          owner_table: ownerTable,
          owner_field: ownerField,
          owner_id: ownerId,
          sort_order: sortOrder
        })
      });
      const data = Array.isArray(rows) ? rows[0] : rows;
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

  async function importMediaUrl({ url, ownerTable, ownerField, ownerId = null, sortOrder = 0 }) {
    await load();
    const value = String(url || "").trim();
    if (!value || !value.startsWith("http") || state.mode !== "local") return null;
    const rows = await requestLocal("/media/import-url", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        url: value,
        owner_table: ownerTable,
        owner_field: ownerField,
        owner_id: ownerId,
        sort_order: sortOrder
      })
    });
    const data = Array.isArray(rows) ? rows[0] : rows;
    if (data) {
      state.data.mediaAssets = [data, ...(state.data.mediaAssets || [])];
      resetData(state.data);
    }
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
    importMediaUrl,
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
    list,
    getStatus: () => state.status,
    primaryKeys
  };
})();











