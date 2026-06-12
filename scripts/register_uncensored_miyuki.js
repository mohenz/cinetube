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

async function registerUncensored() {
  const actorName = "Arisaka Miyuki";
  const categoryCode = "uncensored-leaked";
  
  // 2. Query or create the uncensored category
  console.log(`Checking if category '${categoryCode}' exists...`);
  const catRes = await fetch(`${supabaseUrl}/rest/v1/categories?category_code=eq.${categoryCode}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  if (catRes.ok) {
    const categories = await catRes.json();
    if (categories.length === 0) {
      console.log(`Category not found. Creating category '${categoryCode}'...`);
      const createCat = await fetch(`${supabaseUrl}/rest/v1/categories`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify([{
          category_code: categoryCode,
          name: "Uncensored Leaked",
          representative_image_url: "https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=1400&q=80",
          is_visible: true
        }])
      });
      if (createCat.ok) {
        console.log(`Category '${categoryCode}' created successfully.`);
      } else {
        console.error(`Failed to create category:`, await createCat.text());
        process.exit(1);
      }
    } else {
      console.log(`Category '${categoryCode}' already exists.`);
    }
  } else {
    console.error(`Failed to query categories:`, await catRes.text());
    process.exit(1);
  }

  // 3. Query the actor by name
  console.log(`Checking if actor '${actorName}' exists...`);
  const actorRes = await fetch(`${supabaseUrl}/rest/v1/actors?name=eq.${encodeURIComponent(actorName)}`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  
  let actorId;
  if (actorRes.ok) {
    const actors = await actorRes.json();
    if (actors.length > 0) {
      actorId = actors[0].id;
      console.log(`Actor found. ID: ${actorId}`);
    } else {
      console.error(`Actor '${actorName}' not found in database. Please run register_arisaka_miyuki.js first!`);
      process.exit(1);
    }
  } else {
    console.error(`Failed to query actor:`, await actorRes.text());
    process.exit(1);
  }

  // 4. Define movie payload
  const moviesToRegister = [
    {
      title: "SSPD-172 [Uncensored Leaked] Retire First Anal, Last SM, Pure Love Drama... Everything Miyuki Wanted",
      movie_code: "SSPD-172-DECENSORED",
      category_code: categoryCode,
      actor_id: actorId,
      keywords: ["Arisaka Miyuki", "Moodyz", "Uncensored Leaked", "무삭제", "Featured Actress"],
      rating_grade: "A+",
      video_url: "https://www.bestjavporn.com/v9/video/sspd-172-decensored/",
      description: "BestJavPorn 개별 영상 페이지 기준으로 등록한 Arisaka Miyuki 무삭제 유출(Uncensored Leaked) 은퇴 스페셜 작품입니다.",
      poster_url: "https://pics.dmm.co.jp/mono/movie/adult/sspd172/sspd172pl.jpg",
      capture_url: "https://pics.dmm.co.jp/mono/movie/adult/sspd172/sspd172pl.jpg",
      snapshot_url: "https://pics.dmm.co.jp/mono/movie/adult/sspd172/sspd172pl.jpg",
      release_month: "2022-09",
      production_company: "Moodyz",
      recommendation_score: 98
    },
    {
      title: "MIAA-065 [Uncensored Leaked] Restrained so She Can't Hide It- Humiliating r**e With Her Underarm",
      movie_code: "MIAA-065-DECENSORED",
      category_code: categoryCode,
      actor_id: actorId,
      keywords: ["Arisaka Miyuki", "Moodyz", "Uncensored Leaked", "무삭제", "Featured Actress"],
      rating_grade: "A",
      video_url: "https://www.bestjavporn.com/video/miaa-065-decensored/",
      description: "BestJavPorn 개별 영상 페이지 기준으로 등록한 Arisaka Miyuki 무삭제 유출(Uncensored Leaked) 겨드랑이 페티시 작품입니다.",
      poster_url: "https://pics.dmm.co.jp/mono/movie/adult/miaa065/miaa065pl.jpg",
      capture_url: "https://pics.dmm.co.jp/mono/movie/adult/miaa065/miaa065pl.jpg",
      snapshot_url: "https://pics.dmm.co.jp/mono/movie/adult/miaa065/miaa065pl.jpg",
      release_month: "2021-12",
      production_company: "Moodyz",
      recommendation_score: 95
    }
  ];

  // 5. Register movies in Supabase
  let insertedCount = 0;
  let updatedCount = 0;
  
  for (const movie of moviesToRegister) {
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
          updatedCount++;
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
          insertedCount++;
          console.log(`Inserted movie: ${movie.movie_code}`);
        } else {
          console.error(`Failed to insert movie ${movie.movie_code}:`, await insertRes.text());
        }
      }
    } else {
      console.error(`Failed to check movie existence for ${movie.movie_code}:`, await checkRes.text());
    }
  }

  console.log("\n=================== Registration Summary ===================");
  console.log(`Actor Name: ${actorName}`);
  console.log(`Category: ${categoryCode} (Uncensored Leaked)`);
  console.log(`Total Movies Processed: ${moviesToRegister.length}`);
  console.log(`Movies Inserted: ${insertedCount}`);
  console.log(`Movies Updated: ${updatedCount}`);
  console.log("============================================================\n");
}

registerUncensored().catch(err => {
  console.error("Error during uncensored registration:", err);
});











