const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const extension = path.join(__dirname, '../tools/chrome-extension');

function context(fetch) {
  const elements = {};
  let ready;
  const sandbox = vm.createContext({
    fetch, URLSearchParams, AbortController, setTimeout, clearTimeout,
    console: { log() {}, error() {} },
    localStorage: { getItem: () => 'http://server:3001', setItem() {} },
    chrome: { tabs: { query() {} } },
    document: {
      addEventListener(event, handler) { ready = handler; },
      getElementById(id) {
        return elements[id] ||= { value: '', disabled: false, style: {}, textContent: '',
          listeners: {}, addEventListener(event, handler) { this.listeners[event] = handler; } };
      }
    }
  });
  for (const file of ['registration-check.js', 'popup.js']) {
    vm.runInContext(fs.readFileSync(path.join(extension, file), 'utf8'), sandbox);
  }
  vm.runInContext(`movieData = {source_url: 'https://example.test/movie'};
    document.getElementById('movieCode').value = 'ABC-123';
    document.getElementById('serverUrl').value = 'http://server:3001';`, sandbox);
  return { sandbox, elements, ready: () => ready(), check: () => vm.runInContext('checkRegistration()', sandbox) };
}
const response = rows => ({ ok: true, json: async () => rows });

test('품번 대소문자가 달라도 등록 영화를 표시하고 등록을 차단한다', async () => {
  const c = context(async () => response([{ movie_code: 'abc-123', title: '기존 영화' }]));
  assert.equal(await c.check(), false);
  assert.match(c.elements.status.textContent, /이미 등록.*기존 영화/);
  assert.equal(c.elements.sendBtn.disabled, true);
});

test('제목 검색 일치는 중복으로 오인하지 않고 원본 URL도 조회한다', async () => {
  const urls = [];
  const c = context(async url => {
    urls.push(new URL(url));
    return response(urls.length === 1 ? [{ movie_code: 'ABC-1234', title: 'ABC-123' }] : []);
  });
  assert.equal(await c.check(), true);
  assert.equal(urls[1].searchParams.get('source_url'), 'eq.https://example.test/movie');
  assert.equal(c.elements.sendBtn.disabled, false);
});

test('품번이 달라도 같은 원본 URL이면 중복으로 판정한다', async () => {
  const c = context(async url => response(new URL(url).searchParams.has('source_url')
    ? [{ source_url: 'https://example.test/movie', title: '같은 작품' }] : []));
  assert.equal(await c.check(), false);
  assert.match(c.elements.status.textContent, /같은 작품/);
});

test('페이지 뒤쪽의 정확한 품번도 찾는다', async () => {
  const offsets = [];
  const c = context(async url => {
    const offset = new URL(url).searchParams.get('offset');
    offsets.push(offset);
    return response(offset === '0' ? Array.from({ length: 100 }, () => ({ movie_code: 'OTHER' }))
      : [{ movie_code: 'ABC-123', title: '다음 페이지' }]);
  });
  assert.equal(await c.check(), false);
  assert.deepEqual(offsets, ['0', '100']);
});

for (const [label, fetch] of [
  ['HTTP 오류', async () => ({ ok: false, status: 500 })],
  ['잘못된 JSON 구조', async () => response({ message: 'error' })],
  ['네트워크 오류', async () => { throw new TypeError('Failed to fetch'); }],
  ['시간 초과', async () => { const e = new Error(); e.name = 'AbortError'; throw e; }]
]) {
  test(`${label}를 미등록으로 표시하지 않고 재확인을 허용한다`, async () => {
    const c = context(fetch);
    assert.equal(await c.check(), false);
    assert.equal(c.elements.sendBtn.disabled, true);
    assert.equal(c.elements.checkBtn.disabled, false);
    assert.match(c.elements.status.textContent, /실패|시간 초과/);
  });
}

test('이전 조회 응답은 변경된 서버의 조회 결과를 덮어쓰지 않는다', async () => {
  let resolveOld;
  let calls = 0;
  const c = context(async () => ++calls === 1
    ? new Promise(resolve => { resolveOld = resolve; })
    : response([{ movie_code: 'ABC-123', title: '새 서버 영화' }]));
  const old = c.check();
  c.elements.serverUrl.value = 'http://new-server:3001';
  await c.check();
  resolveOld(response([{ movie_code: 'ABC-123', title: '이전 서버 영화' }]));
  await old;
  assert.match(c.elements.status.textContent, /새 서버 영화/);
  assert.equal(c.elements.sendBtn.disabled, true);
});

test('품번과 원본 주소가 모두 없으면 조회 및 등록을 차단한다', async () => {
  const c = context(async () => { assert.fail('조회하면 안 됩니다.'); });
  vm.runInContext("movieData = {}; document.getElementById('movieCode').value = '';", c.sandbox);
  assert.equal(await c.check(), false);
  assert.match(c.elements.status.textContent, /품번 또는 원본/);
});

test('등록 직전에 다른 사용자가 등록한 영화는 POST하지 않는다', async () => {
  let registered = false;
  let posts = 0;
  const c = context(async (url, options) => {
    if (options.method === 'POST') posts++;
    return response(registered ? [{ movie_code: 'ABC-123', title: '이미 등록됨' }] : []);
  });
  await c.ready();
  assert.equal(await c.check(), true);
  registered = true;
  await c.elements.sendBtn.listeners.click();
  assert.equal(posts, 0);
  assert.equal(c.elements.sendBtn.disabled, true);
  assert.equal(c.elements.movieCode.disabled, false);
});

test('미등록 영화만 POST하고 완료 후 반복 클릭을 막는다', async () => {
  let posts = 0;
  const c = context(async (url, options) => {
    if (options.method === 'POST') { posts++; return response([{ id: 'saved' }]); }
    return response([]);
  });
  await c.ready();
  await c.check();
  await c.elements.sendBtn.listeners.click();
  assert.equal(posts, 1);
  assert.match(c.elements.status.textContent, /성공적으로 등록/);
  assert.equal(c.elements.sendBtn.disabled, true);
  assert.equal(c.elements.checkBtn.disabled, false);
});
