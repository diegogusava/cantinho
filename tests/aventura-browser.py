"""Run: uv run --with playwright python tests/aventura-browser.py (serve on 8087)."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get("AVENTURA_TEST_CHROME"))
    page = browser.new_page(viewport={'width':390,'height':844}, service_workers='block')
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    source = (ROOT / 'aventura.html').read_text().replace('requestAnimationFrame(loop);', '')
    page.route('**/aventura.html', lambda route: route.fulfill(body=source, content_type='text/html'))
    page.goto('http://127.0.0.1:8087/aventura.html')
    page.evaluate('''() => {
      window.check = (condition, message) => { if (!condition) throw Error(message); };
      for (let n = 0; n < 5; n++) {
        level = n; load();
        check(enemies.length === [1,3,5,6,9][n], 'enemy count phase ' + n);
      }
      level = 0; load();
      player.x = 5.4; player.y = 7; update(0);
      check(stars === 1 && grid[7][6] === ' ', 'body edge collects');
      update(0); check(stars === 1, 'single reward');
      check(effects.length > 0, 'collection animation');
      player.x = 18.1; player.y = 6.05; player.vy = -8; keys.jump = true; prevJump = true;
      movePlayer(.02);
      check(grid[5][18] === '!' && stars === 2 && bumps.length === 1, 'box hit');
      player.y = 6.05; player.vy = -8; movePlayer(.02);
      check(stars === 2, 'used box no reward');
      player.x = 18.3; player.y = 5.1; player.vx = 0; player.vy = 0;
      keys.right = true; keys.jump = false; movePlayer(.05); keys.right = false;
      check(grid[5][19] === '?', 'side hit no reward');
      stars = 9; collect(4, 6);
      check(shield && stars === 10 && hud.textContent.includes('Escudo ativo'), 'shield at 10');
      player.x = 30; player.y = 7.1; player.vy = 0;
      enemies = [{x:30,y:7.2,dir:1,alive:true},{x:30,y:7.2,dir:-1,alive:true}];
      moveEnemies(0);
      check(!shield && state === 'play' && safeTime > 0, 'shield protects simultaneous collisions');
      moveEnemies(0); check(state === 'play', 'grace period');
      safeTime = 0; moveEnemies(0); check(state === 'dead', 'unshielded collision');
      load(); check(stars === 0 && !shield && safeTime === 0 && effects.length === 0, 'retry checkpoint');
      stars = 19; collect(4,6); check(shield, 'shield at 20');
      win(); update(3);
      check(level === 1 && shield && stars === 20, 'next phase keeps reward');
      shield = false; die(); update(2);
      check(shield && stars === 20, 'retry restores phase checkpoint');
      player.y = 12; enemies = []; update(0);
      check(state === 'dead', 'shield does not protect falls');
      level = 0; starsAtStart = 0; shieldAtStart = false; load();
      stars = 9; collect(4,6); draw();
    }''')
    page.screenshot(path='/tmp/aventura-shield-phone.png')
    for width, height in [(320,568),(844,390)]:
        page.set_viewport_size({'width':width,'height':height})
        page.evaluate('draw()')
        bounds = page.locator('#hud').bounding_box()
        assert bounds['x'] + bounds['width'] <= width - 60
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    page.keyboard.down('ArrowRight')
    page.evaluate('window.beforeX = player.x; update(.05); check(player.x > beforeX, "keyboard movement")')
    page.keyboard.up('ArrowRight')
    page.locator('[data-key="jump"]').dispatch_event('pointerdown')
    page.evaluate('update(.02); check(player.vy < 0, "touch jump")')
    page.locator('[data-key="jump"]').dispatch_event('pointerup')
    assert not errors, errors
    print('PASS: five phases, body contact, boxes, shield thresholds, collisions, grace, checkpoints, falls, HUD and controls')
    browser.close()
