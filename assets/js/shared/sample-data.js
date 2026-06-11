(function () {
  const poster = (seed) => `https://picsum.photos/seed/${seed}/600/900`;
  const wide = (seed) => `https://picsum.photos/seed/${seed}/1400/760`;

  const categories = [
    { category_code: "ACT", name: "액션", representative_image_url: wide("cinetube-action"), is_visible: true },
    { category_code: "DRM", name: "드라마", representative_image_url: wide("cinetube-drama"), is_visible: true },
    { category_code: "SCI", name: "SF", representative_image_url: wide("cinetube-sci-fi"), is_visible: true },
    { category_code: "THR", name: "스릴러", representative_image_url: wide("cinetube-thriller"), is_visible: true },
    { category_code: "ROM", name: "로맨스", representative_image_url: wide("cinetube-romance"), is_visible: true },
    { category_code: "DOC", name: "다큐멘터리", representative_image_url: wide("cinetube-documentary"), is_visible: true }
  ];

  const actors = [
    { id: 1, name: "한서윤", age: 32, height_cm: 168, body_size: "34-24-35", debut_year: 2014, representative_image_url: poster("actor-han"), image_urls: [poster("actor-han-1"), poster("actor-han-2"), poster("actor-han-3"), poster("actor-han-4")] },
    { id: 2, name: "이도현", age: 36, height_cm: 181, body_size: "40-31-38", debut_year: 2011, representative_image_url: poster("actor-lee"), image_urls: [poster("actor-lee-1"), poster("actor-lee-2"), poster("actor-lee-3"), poster("actor-lee-4")] },
    { id: 3, name: "정하린", age: 29, height_cm: 171, body_size: "33-23-34", debut_year: 2018, representative_image_url: poster("actor-jung"), image_urls: [poster("actor-jung-1"), poster("actor-jung-2"), poster("actor-jung-3"), poster("actor-jung-4")] },
    { id: 4, name: "강민재", age: 41, height_cm: 178, body_size: "39-32-37", debut_year: 2009, representative_image_url: poster("actor-kang"), image_urls: [poster("actor-kang-1"), poster("actor-kang-2"), poster("actor-kang-3"), poster("actor-kang-4")] },
    { id: 5, name: "오지안", age: 34, height_cm: 166, body_size: "32-24-34", debut_year: 2013, representative_image_url: poster("actor-oh"), image_urls: [poster("actor-oh-1"), poster("actor-oh-2"), poster("actor-oh-3"), poster("actor-oh-4")] },
    { id: 6, name: "문태오", age: 38, height_cm: 184, body_size: "41-33-39", debut_year: 2010, representative_image_url: poster("actor-moon"), image_urls: [poster("actor-moon-1"), poster("actor-moon-2"), poster("actor-moon-3"), poster("actor-moon-4")] }
  ];

  const ratings = [
    { grade: "A+", display_order: 1 },
    { grade: "A", display_order: 2 },
    { grade: "B+", display_order: 3 },
    { grade: "B", display_order: 4 },
    { grade: "C", display_order: 5 }
  ];

  const titleSeeds = [
    ["미드나잇 에코", "ACT", 1, "A+"],
    ["붉은 궤도", "SCI", 2, "A"],
    ["라스트 시그널", "THR", 3, "B+"],
    ["겨울의 프레임", "DRM", 4, "A"],
    ["블루 아카이브", "DOC", 5, "B"],
    ["시티 오브 노바", "SCI", 6, "A+"],
    ["하이라이트 원", "ACT", 2, "B+"],
    ["그날의 컷", "ROM", 1, "A"],
    ["오프닝 나이트", "DRM", 3, "B"],
    ["스틸 레인", "THR", 4, "A+"],
    ["모션 로그", "DOC", 6, "C"],
    ["더블 익스포저", "THR", 5, "B+"],
    ["제로 컷", "ACT", 1, "A"],
    ["세컨드 문", "SCI", 3, "B"],
    ["라이트 폴", "ROM", 2, "A+"],
    ["씬 넘버 42", "DRM", 6, "B+"],
    ["플래시백 코드", "SCI", 4, "A"],
    ["블랙 테이프", "THR", 1, "B"],
    ["시네마 노트", "DOC", 5, "A"],
    ["네온 러너", "ACT", 6, "A+"],
    ["딥 포커스", "DRM", 2, "B+"],
    ["엔딩 크레딧", "ROM", 3, "B"],
    ["스냅샷 1999", "DOC", 4, "C"],
    ["페일 블루 씬", "SCI", 5, "A"]
  ];

  const movies = titleSeeds.map(([title, category_code, actor_id, rating_grade], index) => {
    const n = index + 1;
    return {
      id: n,
      title,
      movie_code: `MV-${String(n).padStart(4, "0")}`,
      category_code,
      actor_id,
      actor_ids: [actor_id],
      director_names: [["김도윤"], ["박서진"], ["이하늘"], ["정우진"]][n % 4],
      keywords: ["시네마틱", "프리미엄", category_code.toLowerCase()],
      rating_grade,
      video_url: `https://www.youtube.com/watch?v=demo${n}`,
      source_url: `https://example.com/cinetube/source/${n}`,
      description: `${title}은 강렬한 이미지와 선명한 캐릭터 중심의 영화 정보 샘플입니다.`,
      poster_url: poster(`movie-${n}-${title}`),
      capture_url: wide(`capture-${n}`),
      snapshot_url: wide(`snapshot-${n}`),
      release_month: `202${n % 6}-${String((n % 12) + 1).padStart(2, "0")}`,
      production_company: ["Studio Red", "CineWorks", "Frame Lab", "Nova Pictures"][n % 4],
      created_at: new Date(Date.UTC(2026, 4, 31 - index)).toISOString(),
      recommendation_score: 100 - index,
      rotten_tomatoes_score: 95 - index,
      is_main: index === 0
    };
  });

  window.CineTubeSampleData = { categories, actors, ratings, movies };
})();











