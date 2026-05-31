(function () {
  const tableNames = {
    movies: "movies",
    categories: "categories",
    actors: "actors",
    ratings: "rating_grades"
  };

  const state = {
    client: null,
    data: null,
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

  function enrich(data) {
    const categoriesByCode = new Map(data.categories.map((item) => [item.category_code, item]));
    const actorsById = new Map(data.actors.map((item) => [String(item.id), item]));
    const ratingOrder = new Map(data.ratings.map((item) => [item.grade, Number(item.display_order || 99)]));
    const movies = data.movies.map((movie) => {
      const category = categoriesByCode.get(movie.category_code) || {};
      const actor = actorsById.get(String(movie.actor_id)) || {};
      return {
        ...movie,
        category_name: category.name || movie.category_code || "-",
        actor_name: actor.name || "-",
        rating_order: ratingOrder.get(movie.rating_grade) || 99
      };
    });
    return { ...data, movies };
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

  async function load() {
    if (state.data) return state.data;
    state.client = createClient();
    if (!state.client) {
      state.data = enrich(clone(window.CineTubeSampleData));
      state.status = { connected: false, message: "Supabase 미설정: 샘플 데이터" };
      return state.data;
    }

    try {
      const [movies, categories, actors, ratings] = await Promise.all([
        fetchTable(state.client, "movies"),
        fetchTable(state.client, "categories"),
        fetchTable(state.client, "actors"),
        fetchTable(state.client, "ratings")
      ]);
      state.data = enrich({ movies, categories, actors, ratings });
      state.status = { connected: true, message: "Supabase 연결됨" };
      return state.data;
    } catch (error) {
      console.error(error);
      state.data = enrich(clone(window.CineTubeSampleData));
      state.status = { connected: false, message: "Supabase 오류: 샘플 데이터" };
      return state.data;
    }
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
    state.data = enrich(state.data);
    return state.data;
  }

  window.CineTubeStore = {
    load,
    create,
    getStatus: () => state.status
  };
})();
