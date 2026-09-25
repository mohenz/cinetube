// 기존 조회 API만 사용하므로 서버 배포 없이 확장 프로그램을 갱신할 수 있습니다.
globalThis.CineTubeRegistration = {
  async find(serverUrl, movie, signal) {
    const code = (movie.movie_code || "").trim().toUpperCase();
    const source = (movie.source_url || "").trim();
    if (!code && !source) throw new Error("품번 또는 원본 페이지 주소가 필요합니다.");

    async function read(params) {
      const query = new URLSearchParams({ select: "id,title,movie_code,source_url", ...params });
      const response = await fetch(`${serverUrl}/movies?${query}`, { signal });
      if (!response.ok) throw new Error(`조회 실패 (HTTP ${response.status})`);
      const rows = await response.json();
      if (!Array.isArray(rows)) throw new Error("영화 조회 응답 형식이 올바르지 않습니다.");
      return rows;
    }

    // 검색 결과의 제목 일치를 중복으로 취급하지 않고 품번을 다시 비교합니다.
    if (code) {
      for (let offset = 0; ; offset += 100) {
        const rows = await read({ search: code, limit: "100", offset: String(offset) });
        const match = rows.find(row => String(row.movie_code || "").trim().toUpperCase() === code);
        if (match) return match;
        if (rows.length < 100) break;
      }
    }
    if (source) {
      const rows = await read({ source_url: `eq.${source}`, limit: "1" });
      const match = rows.find(row => row.source_url === source);
      if (match) return match;
    }
    return null;
  }
};
