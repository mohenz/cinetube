-- CineTube import: Tsujimoto An Supjav reducing-only works
-- Source URL requested by owner: https://supjav.com/?s=Tsujimoto+An
-- Import rule: only Supjav search results with the [Reducing Mosaic] label are included.
-- Actor profile reference: https://www.avdbs.com/menu/actor.php?actor_idx=1298

insert into public.categories (category_code, name, is_visible)
values ('reducing-mosaic', 'Reducing Mosaic', true)
on conflict (category_code) do update set
  name = excluded.name,
  is_visible = excluded.is_visible;

with existing_actor as (
  select id
  from public.actors
  where name = 'Tsujimoto An'
  limit 1
),
actor_insert as (
  insert into public.actors (
    name,
    age,
    height_cm,
    body_size,
    debut_year,
    representative_image_url,
    image_urls,
    image_asset_ids
  )
  select
    'Tsujimoto An',
    32,
    155,
    'B82(C)-W57-H80',
    2013,
    'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
    array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
      'https://img.supjav.com/images/2025/09/ssni287pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/08/ssni248pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/07/ssni198pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/07/snis772pl.jpg!320x216.jpg'
    ]::text[],
    '{}'::uuid[]
  where not exists (select 1 from existing_actor)
  returning id
),
actor_ref as (
  select id from actor_insert
  union all
  select id from existing_actor
  limit 1
),
actor_update as (
  update public.actors
  set
    age = 32,
    height_cm = 155,
    body_size = 'B82(C)-W57-H80',
    debut_year = 2013,
    representative_image_url = 'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
    image_urls = array[
      'https://javtiful.com/uploads/uploads/collections/actresses/2026/04/27/5034adcdc4108beb9355c005d35bba58.jpg',
      'https://img.supjav.com/images/2025/09/ssni287pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/08/ssni248pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/07/ssni198pl.jpg!320x216.jpg',
      'https://img.supjav.com/images/2025/07/snis772pl.jpg!320x216.jpg'
    ]::text[]
  where id in (select id from actor_ref)
  returning id
)
insert into public.movies (
  title,
  movie_code,
  category_code,
  actor_id,
  keywords,
  rating_grade,
  video_url,
  description,
  poster_url,
  capture_url,
  snapshot_url,
  release_month,
  production_company,
  recommendation_score,
  ranking_score,
  click_count
)
select
  movie.title,
  movie.movie_code,
  'reducing-mosaic',
  actor_ref.id,
  movie.keywords,
  movie.rating_grade,
  movie.video_url,
  movie.description,
  movie.poster_url,
  movie.poster_url,
  movie.poster_url,
  movie.release_month,
  movie.production_company,
  movie.recommendation_score,
  movie.ranking_score,
  0
from actor_ref
cross join (
  values
    ('SSNI-287 AV Retirement THE FINAL 240 Minutes Real Document!A Day Trip Without Directing A Journey Through SEX!First Time For God Hypnosis FUCK!Serious D*********s In Liquor Lifting!And The Last Cum Sex! Tsujimoto Anne', 'SSNI-287', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A+', 'https://supjav.com/373393.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/09/ssni287pl.jpg!320x216.jpg', '2025-09', 'S1 No.1 Style', 95, 95),
    ('SSNI-248 Squasching Cheeks ● Squirrellessly Stabbing This Mercilessly Instead Of Angry Piercing Piston Fucking Tsujimoto Ann', 'SSNI-248', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A+', 'https://supjav.com/369185.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/08/ssni248pl.jpg!320x216.jpg', '2025-08', 'S1 No.1 Style', 94, 94),
    ('SSNI-198 Big Bicker Sexual Feeling Development Frustration · Convulsions · Shrimp Warp Massage Tsujimoto Ann', 'SSNI-198', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A+', 'https://supjav.com/363386.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/07/ssni198pl.jpg!320x216.jpg', '2025-07', 'S1 No.1 Style', 93, 93),
    ('SNIS-772 Dedicating No.1 Style An Tsujimoto Esuwan Debut', 'SNIS-772', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A+', 'https://supjav.com/362645.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/07/snis772pl.jpg!320x216.jpg', '2025-07', 'S1 No.1 Style', 92, 92),
    ('SSNI-172 F****d Shaving Shaved Shaved Uniform Uniform Bishoujo Le Pu Tsujimoto Ann', 'SSNI-172', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A', 'https://supjav.com/360398.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/07/ssni172pl.jpg!320x216.jpg', '2025-07', 'S1 No.1 Style', 91, 91),
    ('SSNI-147 Extremely Molested Libraries Can Not Make A Voice, And Resistance Is Not Possible In The Situation That They Are Being Molested. Tsujimoto Anne', 'SSNI-147', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A', 'https://supjav.com/357204.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/06/ssni147pl.jpg!320x216.jpg', '2025-06', 'S1 No.1 Style', 90, 90),
    ('SSNI-070 Both Sex And Masturbation Are Forbidden For 1 Month And An Adrenaline Explosion Occurs At Murumura Full Throttle!Convulsion Shivering Sexual Desire Exuded FUCK Tsujimoto Ann', 'SSNI-070', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A', 'https://supjav.com/351315.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/05/ssni070pl.jpg!320x216.jpg', '2025-05', 'S1 No.1 Style', 89, 89),
    ('SSNI-093 Beautiful Girls Continue To Be Fucked Swimmers Swimmers Turned Into Sexual Processing Tools Kubire Athlete Tsujimoto Ann', 'SSNI-093', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'A', 'https://supjav.com/350707.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/05/ssni093pl.jpg!320x216.jpg', '2025-05', 'S1 No.1 Style', 88, 88),
    ('TEAM-068 Latest Rejuvenated Massage Us To Your Service The Best Of Healing In Tsujimoto An', 'TEAM-068', array['Tsujimoto An', 'Reducing', 'Supjav'], 'A', 'https://supjav.com/303821.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/10/team068pl.jpg!320x216.jpg', '2024-10', null, 87, 87),
    ('TEAM-026 Tsujimoto An AV Debut', 'TEAM-026', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/271418.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/05/team026pl.jpg!320x216.jpg', '2024-05', null, 86, 86),
    ('TEAM-059 Non-fiction Two People Alone With The Backroom Of A Single Actress Real SEX Complete Recording Tsujimoto An', 'TEAM-059', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/266333.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/04/team059pl.jpg!320x216.jpg', '2024-04', null, 85, 85),
    ('TEAM-054 4 Production Tsujimoto An', 'TEAM-054', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/265085.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/03/team054pl.jpg!320x216.jpg', '2024-04', null, 84, 84),
    ('SNIS-956 C***dhood Friend JK Han Tsujimoto Ann With Serious Stimulant And Female In Another Stick (middle-aged)', 'SNIS-956', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B+', 'https://supjav.com/256854.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2022/04/snis956pl.jpg!320x216.jpg', '2024-02', 'S1 No.1 Style', 83, 83),
    ('SNIS-980 Until It Develops Obedient Bastard Maid Which Is Not Good At Deep-sea Throat Chestnuts Forcibly Special Demons Tsujimoto Ann', 'SNIS-980', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B+', 'https://supjav.com/256855.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2022/05/snis980pl.jpg!320x216.jpg', '2024-02', 'S1 No.1 Style', 82, 82),
    ('TEAM-037 Majiiki!First 3P Tsujimoto An', 'TEAM-037', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/242588.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/11/team037pl.jpg!320x216.jpg', '2023-11', null, 81, 81),
    ('TEAM-064 Float Waist Iki Spree Super Piston FUCK Tsujimoto An', 'TEAM-064', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/238193.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/10/team064pl.jpg!320x216.jpg', '2023-11', null, 80, 80),
    ('TEAM-052 Splash Squirting Tsujimoto An', 'TEAM-052', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/234292.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/10/team052pl.jpg!320x216.jpg', '2023-10', null, 79, 79),
    ('TEAM-061 And Lead To Ejaculation Many Times Super Superb Rookie Soap Girl Tsujimoto An', 'TEAM-061', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B+', 'https://supjav.com/234293.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/10/team061pl.jpg!320x216.jpg', '2023-10', null, 78, 78),
    ('TEAM-065 In The Middle School We Were Taught The Capstone By The Hand Of Molesting School Girls Tsujimoto An', 'TEAM-065', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/219305.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', null, '2023-06', null, 77, 77),
    ('SNIS-913 An Tsujimoto x Gachi Virgin Five Ultra-dense Brush Wholesale Support 150 Minutes', 'SNIS-913', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/380180.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/10/snis913pl.jpg!320x216.jpg', '2025-10', 'S1 No.1 Style', 76, 76),
    ('SNIS-868 Voyeur Realistic Document!Man And Half Living Together In That I Met In Exclusive Scoop Adhesion 54 Days Online Games! ?Private Large Exposure Special WR*pped In A Mystery Of An Tsujimoto', 'SNIS-868', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/371696.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2025/09/snis868pl.jpg!320x216.jpg', '2025-09', 'S1 No.1 Style', 75, 75),
    ('SNIS-796 Intersect Body Fluids, Dense Sex Full Uncut Special An Tsujimoto', 'SNIS-796', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/364559.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', null, '2025-08', 'S1 No.1 Style', 74, 74),
    ('SNIS-846 School Girls An Tsujimoto That Are Committed To The Middle-aged Man While Asking For Help To All Subjective Netora Been Video ANATA', 'SNIS-846', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/304522.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/10/snis846pl.jpg!320x216.jpg', '2024-10', 'S1 No.1 Style', 73, 73),
    ('TEAM-076 An Tsujimoto''s Fan Appreciation Cosplay Bukkake SEX Offline Gathering', 'TEAM-076', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/303399.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/10/team076pl.jpg!320x216.jpg', '2024-10', null, 72, 72),
    ('SNIS-819 JK Walk An Tsujimoto', 'SNIS-819', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/288182.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2022/06/snis819pl.jpg!320x216.jpg', '2024-08', 'S1 No.1 Style', 71, 71),
    ('TEAM-102 Stripped The Wet Sheer Uniforms Fucked In The Rain School Girls An Tsujimoto', 'TEAM-102', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/253109.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2024/01/team102pl.jpg!320x216.jpg', '2024-01', null, 70, 70),
    ('TEAM-096 A Kick In The Oil Massage Rubbed The Pretty An Tsujimoto', 'TEAM-096', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/234496.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/10/team096pl.jpg!320x216.jpg', '2023-10', null, 69, 69),
    ('TEAM-082 And Arched His Back Many Times In The Vagina To Climax Alive SEX An Tsujimoto', 'TEAM-082', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/230846.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/09/team082pl.jpg!320x216.jpg', '2023-09', null, 68, 68),
    ('TEAM-066 Cuckold Sex That Makes You Cum Many Times In Front Of Your Beloved An Tsujimoto', 'TEAM-066', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/228562.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/08/team066pl.jpg!320x216.jpg', '2023-08', null, 67, 67),
    ('TEAM-093 They Piled The Aphrodisiac In The Adviser Of The Club Activities And Coma Developed School One Beauty Land Part Ace An Tsujimoto', 'TEAM-093', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/225396.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2023/08/team093pl.jpg!320x216.jpg', '2023-08', null, 66, 66),
    ('SNIS-891 Ultra-fine Body Climax Convulsions Screaming Harsh Enough Of The Ultra-piston Rush An Tsujimoto', 'SNIS-891', array['Tsujimoto An', 'Reducing', 'Supjav', 'S1 No.1 Style'], 'B', 'https://supjav.com/215814.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', null, '2023-06', 'S1 No.1 Style', 65, 65),
    ('TEAM-099 Full Uncut Screaming Non-stop 4 Production An Tsujimoto That Does Not End Even If Many Times Acme', 'TEAM-099', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/215751.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', null, '2023-06', null, 64, 64),
    ('TEAM-090 Dasa Called After Flight Rookie Cabin Attendant An Tsujimoto Undergoing A Nasty Training Behind Closed Doors', 'TEAM-090', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/209032.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', null, '2023-04', null, 63, 63),
    ('TEAM-087 We Will Show And Soaked Oma ○ This An Tsujimoto', 'TEAM-087', array['Tsujimoto An', 'Reducing', 'Supjav'], 'B', 'https://supjav.com/202791.html', 'Supjav reducing-mosaic work imported from the Tsujimoto An search page.', 'https://img.supjav.com/images/2020/10/1603600713-team087pl.jpg!320x216.jpg', '2023-03', null, 62, 62)
) as movie(title, movie_code, keywords, rating_grade, video_url, description, poster_url, release_month, production_company, recommendation_score, ranking_score)
on conflict (movie_code) do update set
  title = excluded.title,
  category_code = excluded.category_code,
  actor_id = excluded.actor_id,
  keywords = excluded.keywords,
  rating_grade = excluded.rating_grade,
  video_url = excluded.video_url,
  description = excluded.description,
  poster_url = excluded.poster_url,
  capture_url = excluded.capture_url,
  snapshot_url = excluded.snapshot_url,
  release_month = excluded.release_month,
  production_company = excluded.production_company,
  recommendation_score = excluded.recommendation_score,
  ranking_score = excluded.ranking_score,
  click_count = excluded.click_count;










