"""Run: uv run --with playwright python tests/jardim-browser.py (serve site on port 8086)."""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('GARDEN_TEST_URL', 'http://127.0.0.1:8086')
CHROME = os.environ.get('GARDEN_TEST_CHROME')
# Fixtures and observations are injected only in the test response, never shipped.
ADAPTER = '''
window.gardenTest = {
  carrot, clock, bunny, target, bushes, stars, bees, renderer, scene, camera,
  update, spawnCarrot,
  get boosted() { return clock.time < boostUntil; },
  get remaining() { return Math.max(0, boostUntil - clock.time); },
  get shownLevel() { return level + 1; },
  setLevel(shown) { level = shown - 1; placeLevel(); },
  advance(seconds) {
    for (let remaining = seconds; remaining > 0;) {
      const dt = Math.min(remaining, 1 / 60);
      update(dt); remaining -= dt;
    }
  },
  clearHazards() { discard(bushes); discard(bees); discard(stars); total = 0; },
  collectCarrot() {
    target.copy(bunny.position);
    carrot.position.set(bunny.position.x, .9, bunny.position.z);
    carrot.visible = true;
    update(0);
  },
  prepareWin() {
    discard(bushes); discard(bees);
    target.copy(bunny.position);
    for (const star of stars) star.position.copy(bunny.position);
  },
  prepareCatch() {
    lives = 1; grace = false; safeUntil = clock.time;
    target.copy(bunny.position);
    bees[0].position.set(bunny.position.x, BEE_Y, bunny.position.z);
  },
  render() { renderer.render(scene, camera); }
};
'''

with sync_playwright() as p:
    options = {'headless': True, 'args': ['--enable-unsafe-swiftshader']}
    if CHROME:
        options['executable_path'] = CHROME
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, service_workers='block')
    source = (ROOT / 'jardim.html').read_text()
    source = source.replace('window.__jardim =', ADAPTER + '\nwindow.__jardim =')
    context.route('**/jardim.html', lambda route: route.fulfill(body=source, content_type='text/html'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.clock.install(time=0)
    page.clock.pause_at(1000)
    page.goto(URL + '/jardim.html')
    page.wait_for_function('!!window.gardenTest')
    page.locator('canvas').click(position={'x':195,'y':400})
    for shown, expected in [(1,1),(10,1),(11,2),(20,2),(21,3)]:
        page.evaluate('(level) => localStorage.setItem("level:garden", level - 1)', shown)
        page.reload()
        page.wait_for_function('!!window.gardenTest')
        assert page.evaluate('gardenTest.bees.length') == expected, shown
        assert page.locator('#hud').inner_text().startswith('Nível ' + str(shown) + ' ·')
    print('PASS: saved/displayed levels 1, 10, 11, 20, 21 have 1, 1, 2, 2, 3 bees')

    assert page.evaluate('window.__jardim.selfTest()') == []
    # Check placement with many random gardens and repeated failed random samples.
    for level in [1,10,11,20,21,50]:
        assert page.evaluate('''level => {
          for(let i=0;i<16;i++) {
            gardenTest.setLevel(level);
            if(!gardenTest.carrot.visible) return false;
            const p=gardenTest.carrot.position;
            if(Math.hypot(p.x,p.z)>5.2) return false;
            if(gardenTest.bushes.some(b=>Math.hypot(b.position.x-p.x,b.position.z-p.z)<=b.userData.radius+.85)) return false;
          }
          const original=Math.random;
          try {
            Math.random=()=>0;
            gardenTest.carrot.visible=false;
            gardenTest.spawnCarrot();
            const p=gardenTest.carrot.position;
            return gardenTest.carrot.visible && Math.hypot(p.x,p.z)<=5.2 &&
              gardenTest.bushes.every(b=>Math.hypot(b.position.x-p.x,b.position.z-p.z)>b.userData.radius+.85);
          } finally { Math.random=original; }
        }''', level)
    print('PASS: 96 gardens place a visible carrot inside the island and clear of bushes; deterministic fallback works')

    page.evaluate('''() => {
      gardenTest.setLevel(1); gardenTest.clearHazards();
      gardenTest.bunny.position.set(0,0,0); gardenTest.target.set(5,0,0);
      gardenTest.carrot.position.set(-4,.9,-3);
      gardenTest.advance(.5);
    }''')
    assert abs(page.evaluate('gardenTest.bunny.position.x') - 1.4) < .001
    page.evaluate('''() => {
      gardenTest.bunny.position.set(0,0,0); gardenTest.target.set(0,0,0);
      gardenTest.collectCarrot();
    }''')
    assert page.evaluate('gardenTest.boosted && !gardenTest.carrot.visible')
    assert 'Corrida rápida: 6s' in page.locator('#hud').inner_text()
    page.evaluate('''() => {gardenTest.target.set(5,0,0); gardenTest.advance(.5);}''')
    assert abs(page.evaluate('gardenTest.bunny.position.x') - 2.24) < .001
    page.evaluate('''() => {gardenTest.target.copy(gardenTest.bunny.position); gardenTest.advance(5.49);}''')
    assert page.evaluate('gardenTest.boosted')
    page.evaluate('gardenTest.advance(.02)')
    assert not page.evaluate('gardenTest.boosted')
    assert 'Corrida rápida' not in page.locator('#hud').inner_text()
    page.evaluate('''() => {
      gardenTest.bunny.position.set(0,0,0); gardenTest.target.set(5,0,0);gardenTest.advance(.5);
      gardenTest.target.copy(gardenTest.bunny.position);
    }''')
    assert abs(page.evaluate('gardenTest.bunny.position.x') - 1.4) < .001
    page.evaluate('gardenTest.advance(7.48)')
    assert not page.evaluate('gardenTest.carrot.visible')
    page.evaluate('gardenTest.advance(.02)')
    assert page.evaluate('gardenTest.carrot.visible')
    print('PASS: pickup, 6-second boost, 60% faster displacement, expiry, normal speed and 8-second respawn')

    # Both real input routes use the same boost; measure actual keyboard movement.
    page.evaluate('''() => {
      gardenTest.setLevel(1);gardenTest.clearHazards();gardenTest.collectCarrot();
      gardenTest.bunny.position.set(0,0,0);gardenTest.target.set(0,0,0);
      gardenTest.camera.updateMatrixWorld();
    }''')
    page.keyboard.down('ArrowRight')
    page.evaluate('gardenTest.advance(.25)')
    page.keyboard.up('ArrowRight')
    assert abs(page.evaluate('Math.hypot(gardenTest.bunny.position.x,gardenTest.bunny.position.z)') - 1.12) < .01
    page.evaluate('''() => {
      gardenTest.bunny.position.set(0,0,0);gardenTest.target.set(0,0,0);
      gardenTest.render();
    }''')
    target = page.evaluate('''() => {
      const p=gardenTest.bunny.position.clone().set(3,0,0).project(gardenTest.camera);
      return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
    }''')
    cdp=context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{**target,'id':1}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    page.evaluate('gardenTest.advance(.25)')
    assert abs(page.evaluate('gardenTest.bunny.position.x') - 1.12) < .01
    print('PASS: both keyboard and real touchscreen movement receive the boost')

    for kind in ['win','catch']:
        page.evaluate('''kind => {
          gardenTest.setLevel(11);gardenTest.collectCarrot();
          if(kind==='win') gardenTest.prepareWin(); else gardenTest.prepareCatch();
          gardenTest.update(0);
        }''',kind)
        assert ('Mandou bem' if kind=='win' else 'Tente de novo') in page.locator('#banner').inner_text()
        page.clock.fast_forward(1600)
        assert not page.evaluate('gardenTest.boosted')
        assert page.evaluate('gardenTest.carrot.visible')
        assert page.evaluate('gardenTest.shownLevel') == (12 if kind=='win' else 11)
    print('PASS: win and retry reset speed and restore one fresh pickup')

    page.evaluate('gardenTest.setLevel(1);gardenTest.carrot.position.set(1,.9,.6);gardenTest.render()')
    page.screenshot(path='/tmp/garden-carrot-phone.png')
    page.evaluate('gardenTest.collectCarrot();gardenTest.render()')
    assert 'Corrida rápida' in page.locator('#hud').inner_text()
    page.screenshot(path='/tmp/garden-boost-phone.png')
    for width,height in [(320,568),(844,390)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate('window.dispatchEvent(new Event("resize"));gardenTest.render()')
        bounds=page.locator('#hud').bounding_box()
        assert bounds['x']>=0 and bounds['x']+bounds['width']<=width
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
        page.screenshot(path=f'/tmp/garden-boost-{width}.png')
    assert not errors,errors
    print('PASS: phone, small phone and landscape HUD; no JavaScript errors')
    browser.close()
