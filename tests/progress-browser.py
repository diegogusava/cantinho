"""Serve on 8087, then run with a Python environment that has Playwright."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('PROGRESS_TEST_URL', 'http://127.0.0.1:8087')
GAMES = {
    'balloons': ('balloons', 3, 'level === 3', 'completeLevel()', 4),
    'memory': ('memory', 3, 'level === 3', 'scores = [1]; win()', 4),
    'puzzle': ('puzzle', 3, 'level === 3', 'win()', 4),
    'aventura': ('aventura', 3, 'level === 3', 'win()', 4),
    'stars': ('stars', 10, 'score === 10 && clouds.length === 3',
              'stars = [{...player}]; clouds = []; update(0)', 11),
    'runner': ('runner:Médio', 3, 'level() === 3 && difficultyName === "Médio"',
               'score = 24; levelUp()', 4),
    'magictiles': ('magictiles', 2, 'song === SONGS[2] && level === LEVELS[1]',
                   'start(); game.errors = 0; finish(true)', 3),
    'labirinto': ('labirinto', 3, 'document.querySelector("#level").textContent.startsWith("Fase 3")',
                  '''(async () => { const m = await import('./labirinto.js');
                  document.querySelector('#action').click(); m.round.status = 'won'; m.frame(performance.now()); })()''', 4),
    'jardim': ('garden', 3, 'document.querySelector("#hud").textContent.startsWith("Nível 4")',
               'winGarden()', 4),
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
    # Stop automatic frames so each checkpoint and victory can be tested deterministically.
    def route_page(route):
        name = route.request.url.split('/')[-1]
        source = (ROOT / name).read_text().replace('requestAnimationFrame(loop);', '')
        if name == 'jardim.html':
            source = source.replace('function collectStars() {',
                'window.winGarden = () => { stars.length = 0; collectStars(); };\nfunction collectStars() {')
        route.fulfill(body=source, content_type='text/html')
    context.route('**/*.html', route_page)
    context.route('**/labirinto.js', lambda route: route.fulfill(
        body=(ROOT / 'labirinto.js').read_text().replace('requestAnimationFrame(frame);', '')
             + '\nexport { round, frame };', content_type='text/javascript'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL + '/balloons.html')
    for game, (key, initial, restored, victory, expected) in GAMES.items():
        page.evaluate('''([key, initial]) => {
          localStorage.clear();
          localStorage.setItem('level:' + key, initial);
          localStorage.setItem('level:other-game', '7');
          localStorage.setItem('memory:names', '["Ana"]');
          localStorage.setItem('runner:best:Médio', '50');
          localStorage.setItem('runner:difficulty', 'Médio');
          localStorage.setItem('level:magictiles:difficulty', '1');
          localStorage.setItem('stars:Parabéns pra Você', '2');
        }''', [key, initial])
        page.goto(URL + '/' + game + '.html')
        page.wait_for_function(restored)
        page.evaluate(victory)
        assert page.evaluate('key => localStorage.getItem("level:" + key)', key) == str(expected), game
        # Reload immediately, without waiting for animation or pressing Next.
        page.reload()
        page.wait_for_function('typeof savedLevel === "function"')
        if game == 'labirinto':
            page.wait_for_function('!document.querySelector("#action").disabled')
        if game == 'jardim':
            page.wait_for_function('typeof winGarden === "function"')
        if game == 'magictiles':
            assert page.evaluate('song === SONGS[3]')
        elif game == 'runner':
            assert page.evaluate('level() === 4')
        elif game == 'stars':
            assert page.evaluate('score === 11')
        elif game == 'labirinto':
            assert page.locator('#level').inner_text().startswith('Fase 4')
        elif game == 'jardim':
            assert page.locator('#hud').inner_text().startswith('Nível 5')
        else:
            assert page.evaluate('level === ' + str(expected)), game
        # Every game uses the same accessible reset control, including cancellation.
        page.locator('.progress-menu summary').click()
        page.once('dialog', lambda dialog: dialog.dismiss())
        page.get_by_role('button', name='Começar do zero', exact=True).click()
        assert page.evaluate('key => localStorage.getItem("level:" + key)', key) == str(expected)
        page.screenshot(path='/tmp/progress-' + game + '-phone.png')
        page.once('dialog', lambda dialog: dialog.accept())
        page.get_by_role('button', name='Começar do zero', exact=True).click()
        page.wait_for_load_state()
        assert page.evaluate('key => localStorage.getItem("level:" + key)', key) is None, game
        assert page.evaluate('localStorage.getItem("level:other-game")') == '7'
        assert page.evaluate('localStorage.getItem("memory:names")') == '["Ana"]'
        assert page.evaluate('localStorage.getItem("runner:best:Médio")') == '50'
        if game == 'magictiles':
            assert page.evaluate('localStorage.getItem("stars:Parabéns pra Você")') is None
            assert page.evaluate('song === SONGS[0] && level === LEVELS[0]')
        if game == 'runner':
            assert page.evaluate('difficultyName === "Fácil" && level() === 1')
        print('PASS:', game, 'resume, immediate victory checkpoint, cancel and reset, isolated data')
    # Stored values are untrusted; malformed levels must fall back to the initial level.
    for value in ['-1', '1.5', 'Infinity', 'not-a-number']:
        page.evaluate('value => localStorage.setItem("level:balloons", value)', value)
        page.goto(URL + '/balloons.html')
        assert page.evaluate('level === 1'), value
    page.evaluate('''() => {
      localStorage.setItem('level:aventura', '14');
    }''')
    page.goto(URL + '/aventura.html')
    page.evaluate('win(); update(4)')
    assert page.evaluate('level === 14 && state === "won" && localStorage.getItem("level:aventura") === "14"')
    page.reload()
    assert page.evaluate('level === 14')
    # Verify games still open when browser storage is disabled.
    context.add_init_script('''Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('Blocked', 'SecurityError'); }
    });''')
    for game in GAMES:
        page.goto(URL + '/' + game + '.html')
        page.wait_for_function('document.querySelector(".progress-menu") !== null')
    assert not errors, errors
    print('PASS: invalid levels, final phase preserved, storage unavailable, no JavaScript errors')
    browser.close()
