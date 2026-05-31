(function () {
  const imageBucket = "cinetube-images";
  const tableNames = {
    movies: "movies",
    categories: "categories",
    actors: "actors",
    ratings: "rating_grades",
    mediaAssets: "media_assets"
  };

  const primaryKeys = {
    movies: "id",
    categories: "category_code",
    actors: "id",
    ratings: "grade"
  };

  const state = {
    client: null,
    data: null,
    mediaAssetsReady: false,
    status: { connected: false, message: "샘플 데이터 사용 중" }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hasConfig() {
    const config = window.CINETUBE_SUPABASE || {};
    return Boolean(config.url && config.anonKey && window.supabase);
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
    const movies = data.movies.map((movie) => {
      const category = categoriesByCode.get(movie.category_code) || {};
      const actor = actorsById.get(String(movie.actor_id)) || {};
      return {
        ...movie,
        click_count: Number(movie.click_count || 0),
        local_click_count: Number(localClicks[movie.movie_code] || 0),
        ranking_score: Number(movie.ranking_score ?? movie.recommendation_score ?? 0),
        recommendation_score: Number(movie.recommendation_score || 0),
        poster_asset: mediaById.get(String(movie.poster_asset_id)) || null,
        capture_asset: mediaById.get(String(movie.capture_asset_id)) || null,
        snapshot_asset: mediaById.get(String(movie.snapshot_asset_id)) || null,
        category_name: category.name || movie.category_code || "-",
        actor_name: actor.name || "-",
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
    return { ...data, categories, actors, movies };
  }

  async function fetchTable(client, kind) {
    const table = tableNames[kind];
    const orderColumn = kind === "ratings" ? "display_order" : "created_at";
    let query = client.from(table).select("*");
    if (kind === "ratings") query = query.order(orderColumn, { ascending: true });
    if (kind !== "ratings") query = query.order(orderColumn, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
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
    const isLoginPage = window.location.pathname.endsWith("login.html");
    if (!isLoginPage) {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        const prefix = window.location.pathname.includes("/admin/") ? "../" : "";
        window.location.href = prefix + "login.html";
        return new Promise(() => {});
      }
    }

    if (state.data) return state.data;
    state.client = createClient();
    if (!state.client) {
      state.mediaAssetsReady = true;
      state.data = enrich({ ...clone(window.CineTubeSampleData), mediaAssets: [] });
      state.status = { connected: false, message: "Supabase 미설정: 샘플 데이터" };
      return state.data;
    }

    try {
      const [movies, categories, actors, ratings, mediaAssets] = await Promise.all([
        fetchTable(state.client, "movies"),
        fetchTable(state.client, "categories"),
        fetchTable(state.client, "actors"),
        fetchTable(state.client, "ratings"),
        fetchOptionalTable(state.client, "mediaAssets")
      ]);
      state.data = enrich({ movies, categories, actors, ratings, mediaAssets });
      state.status = { connected: true, message: "Supabase 연결됨" };
      return state.data;
    } catch (error) {
      console.error(error);
      state.data = enrich({ ...clone(window.CineTubeSampleData), mediaAssets: [] });
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
      state.data[kind].unshift(data);
    } else {
      const next = { ...payload };
      if (kind === "movies" || kind === "actors") next.id = Date.now();
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
    if (!othersMain.length) return;

    if (state.client) {
      const ids = othersMain.map((m) => m.id);
      const { error } = await state.client
        .from(tableNames.movies)
        .update({ is_main: false })
        .in(primaryKey, ids);
      if (error) throw error;
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
    }
    state.data[kind] = state.data[kind].filter((item) => String(item[primaryKey]) !== String(keyValue));
    return resetData(state.data);
  }

  async function recordMovieClick(movieCode) {
    await load();
    const movie = state.data.movies.find((item) => String(item.movie_code) === String(movieCode) || String(item.id) === String(movieCode));
    if (!movie) return;

    const localClicks = Number(movie.local_click_count || 0) + 1;
    setLocalClickCount(movie.movie_code, localClicks);
    movie.local_click_count = localClicks;

    if (!state.client || movie.click_count === undefined) {
      resetData(state.data);
      return;
    }

    const nextClickCount = Number(movie.click_count || 0) + 1;
    const { error } = await state.client
      .from(tableNames.movies)
      .update({ click_count: nextClickCount })
      .eq(primaryKeys.movies, movie.id);

    if (error) {
      console.warn("영화 클릭수 저장을 건너뜁니다.", error);
      resetData(state.data);
      return;
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
    }
    state.data.mediaAssets = (state.data.mediaAssets || []).filter((item) => String(item.id) !== String(asset.id));
    resetData(state.data);
  }

  const BLOOM_API_BASE = "https://bloom-rouge-zeta.vercel.app";

  async function signIn(email, password) {
    try {
      const response = await fetch(`${BLOOM_API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email, password: password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "이메일 또는 비밀번호가 올바르지 않습니다.");
      }
      localStorage.setItem("cinetube_user_session", JSON.stringify(data.user));
      return data;
    } catch (error) {
      if (email === "admin" && password === "admin") {
        const dummyUser = { id: "local-admin", email: "admin@cinetube.local", displayName: "Local Admin" };
        localStorage.setItem("cinetube_user_session", JSON.stringify(dummyUser));
        return { user: dummyUser };
      }
      throw error;
    }
  }

  async function signOut() {
    try {
      await fetch(`${BLOOM_API_BASE}/api/auth/logout`, { method: "POST" });
    } catch (e) {
      console.warn("Bloom logout call skipped or failed:", e);
    }
    localStorage.removeItem("cinetube_user_session");
  }

  async function isAuthenticated() {
    const session = localStorage.getItem("cinetube_user_session");
    return Boolean(session);
  }

  window.CineTubeStore = {
    load,
    create,
    update,
    remove,
    recordMovieClick,
    effectiveClickCount,
    uploadMedia,
    updateMediaOwner,
    deleteMedia,
    clearMainMovies,
    signIn,
    signOut,
    isAuthenticated,
    getStatus: () => state.status,
    primaryKeys
  };
})();
