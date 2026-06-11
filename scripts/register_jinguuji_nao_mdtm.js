const fs = require('fs');
const path = require('path');

// 1. Read Supabase config
const configPath = path.join(__dirname, '..', 'assets', 'js', 'supabase-config.js');
if (!fs.existsSync(configPath)) {
  console.error("Supabase config file not found at:", configPath);
  process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf8');
const urlMatch = configContent.match(/url:\s*"([^"]+)"/);
const keyMatch = configContent.match(/anonKey:\s*"([^"]+)"/);

if (!urlMatch || !keyMatch) {
  console.error("Failed to parse Supabase url or anonKey from config.");
  process.exit(1);
}

const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];

const HEADERS = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function registerSingleMovie() {
  const actorName = "Jinguuji Nao";
  const categoryCode = "prestige-exclusive";
  
  // 2. Query or create the actor
  console.log(`Checking if actor '${actorName}' exists in database...`);
  const actorRes = await fetch(`${supabaseUrl}/rest/v1/actors?name=eq.${encodeURIComponent(actorName)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  let actorId;
  let actorAction = "";
  
  if (actorRes.ok) {
    const actors = await actorRes.json();
    if (actors.length > 0) {
      actorId = actors[0].id;
      actorAction = "Reused existing actor";
      console.log(`Actor found. ID: ${actorId}`);
    } else {
      console.log(`Actor not found. Creating actor '${actorName}'...`);
      const actorBody = {
        name: actorName,
        age: 29,
        height_cm: 160,
        body_size: "B86(E)-W61-H88",
        debut_year: 2017,
        representative_image_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/22/59b1057be80c813c711ee4a73226024c.jpg",
        image_urls: [
          "https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/22/59b1057be80c813c711ee4a73226024c.jpg"
        ]
      };
      
      const createRes = await fetch(`${supabaseUrl}/rest/v1/actors`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify([actorBody])
      });
      
      if (createRes.ok) {
        const created = await createRes.json();
        actorId = created[0].id;
        actorAction = "Created new actor";
        console.log(`Created actor successfully. ID: ${actorId}`);
      } else {
        console.error("Failed to create actor:", await createRes.text());
        process.exit(1);
      }
    }
  } else {
    console.error("Failed to query actor:", await actorRes.text());
    process.exit(1);
  }

  // 3. Define movie payload
  const movie = {
    title: "MDTM-388 여름 휴가. 나는 질내 사정 SEX를 계속했다. 진구지 나오",
    movie_code: "MDTM-388",
    category_code: categoryCode,
    actor_id: actorId,
    keywords: ["Jinguuji Nao", "Prestige", "Featured Actress"],
    rating_grade: "A+",
    video_url: "https://javtiful.com/kr/video/35402/mdtm-388",
    description: "Javtiful 개별 영상 페이지 기준으로 등록한 Jinguuji Nao의 Prestige Exclusive 단독 출연작 여름 휴가 특별편입니다.",
    poster_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/22/59b1057be80c813c711ee4a73226024c.jpg",
    capture_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/22/59b1057be80c813c711ee4a73226024c.jpg",
    snapshot_url: "https://javtiful.com/uploads/uploads/videos/thumbs/2023/06/22/59b1057be80c813c711ee4a73226024c.jpg",
    release_month: "2023-06",
    production_company: "Prestige",
    recommendation_score: 95
  };

  // 4. Register movie in Supabase
  let inserted = false;
  let updated = false;
  
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/movies?movie_code=eq.${encodeURIComponent(movie.movie_code)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  if (checkRes.ok) {
    const existing = await checkRes.json();
    if (existing.length > 0) {
      // Update (PATCH)
      const updateRes = await fetch(`${supabaseUrl}/rest/v1/movies?movie_code=eq.${encodeURIComponent(movie.movie_code)}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(movie)
      });
      if (updateRes.ok) {
        updated = true;
        console.log(`Updated movie: ${movie.movie_code}`);
      } else {
        console.error(`Failed to update movie ${movie.movie_code}:`, await updateRes.text());
      }
    } else {
      // Insert (POST)
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/movies`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify([movie])
      });
      if (insertRes.ok) {
        inserted = true;
        console.log(`Inserted movie: ${movie.movie_code}`);
      } else {
        console.error(`Failed to insert movie ${movie.movie_code}:`, await insertRes.text());
      }
    }
  } else {
    console.error(`Failed to check movie existence:`, await checkRes.text());
  }

  console.log("\n=================== Registration Summary ===================");
  console.log(`Actor Name: ${actorName} (${actorAction}, ID: ${actorId})`);
  console.log(`Movie: ${movie.movie_code} (${inserted ? 'Inserted' : updated ? 'Updated' : 'Failed'})`);
  console.log(`Category: ${categoryCode} (Prestige Exclusive)`);
  console.log("============================================================\n");
}

registerSingleMovie().catch(err => {
  console.error("Error during registration:", err);
});











