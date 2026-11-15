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
      for (let n = 0; n < 15; n++) {
        level = n; load();
        check(enemies.length === [1,3,5,6,9,10,11,12,13,14,15,16,17,18,19][n], 'enemy count phase ' + n);
      }
      check(LEVELS.length === 15, 'fifteen phases');
      for (let n = 5; n < 10; n++) {
        level = n; load();
        check(LEVELS[n].every(row => row.length === grid[0].length), 'rectangular phase ' + n);
        check(solid(2,8) && !solid(2,7), 'safe spawn ' + n);
        check(LEVELS[n].join('').split('*').length - 1 >= 10, 'enough stars for shield ' + n);
        const finish = grid[7].indexOf('F');
        check(finish > 0 && solid(finish,8), 'safe flag ' + n);
        const gaps = [];
        for (let c = 0; c < grid[0].length; c++) {
          if (grid[8][c] !== '#') {
            const start = c;
            while (grid[8][c] !== '#') c++;
            gaps.push([start,c]);
          }
        }
        check(gaps.length >= 5, 'terrain obstacles ' + n);
        for (const [start,end] of gaps) {
          player = {x:start-1.5,y:7.099,vx:0,vy:0,onGround:true,jumps:MAX_JUMPS};
          prevJump = false; keys.right = true;
          let landed = false;
          for (let frame = 0; frame < 180; frame++) {
            keys.jump = frame !== 20;
            movePlayer(1/60);
            if (player.x >= end && player.onGround) { landed = true; break; }
            if (player.y > ROWS + 1) break;
          }
          check(landed, 'double jump across phase ' + (n+1) + ' gap ' + start + '-' + end);
        }
        keys.right = false; keys.jump = false;
        load();
        player.x = finish; player.y = 7.099;
        update(0);
        check(state === 'won', 'flag wins phase ' + (n+1));
        check(!banner.textContent.includes('zerou'), 'not final yet');
        update(3);
        check(level === (n+1)%15, 'advance after phase ' + (n+1));
        check(Number(localStorage.getItem('level:aventura')) === level, 'saved progress ' + n);
      }
      for (let n = 10; n < 15; n++) {
        level = n; starsAtStart = 0; shieldAtStart = false; load();
        check(LEVELS[n].every(row => row.length === grid[0].length), 'rectangular phase ' + n);
        check(solid(2,8) && !solid(2,7), 'safe spawn ' + n);
        const finish = grid[7].indexOf('F');
        check(finish > 0 && solid(finish,8), 'safe finish ' + n);
        check(LEVELS[n].join('').split('*').length > 10, 'reward opportunities ' + n);
        // Search a complete terrain route with real movement, without enemy or shield help.
        // Every queued position is reached from the previous one; no gap teleports.
        player.y = 7.099; player.onGround = true;
        const queue = [{...player}], seen = new Set();
        let reached = false;
        for (let index = 0; index < queue.length && !reached; index++) {
          const start = queue[index];
          for (const secondJump of [-2,-1,20,35,50]) {
            player = {...start}; prevJump = false; keys.right = true;
            const frames = secondJump === -2 ? 6 : 180;
            for (let frame = 0; frame < frames; frame++) {
              keys.jump = secondJump !== -2 && frame !== secondJump;
              movePlayer(1/60);
              if (player.x >= finish && player.y > 6 && player.y < 8) { reached = true; break; }
              if (player.y > ROWS + 1 || player.x < start.x - .01) break;
              if (player.onGround && (secondJump === -2 ? frame === frames-1 : frame > 1)) {
                const key = Math.round(player.x*2) + ':' + Math.round(player.y*10);
                if (!seen.has(key)) { seen.add(key); queue.push({...player}); }
                break;
              }
            }
            if (reached) break;
          }
        }
        check(reached, 'complete terrain route without shield phase ' + (n+1));
        keys.right = false; keys.jump = false; load();
        const x = enemies[0].x;
        moveEnemies(.1);
        check(Math.abs(Math.abs(enemies[0].x-x) - (1.5+n*.15)*.1) < .0001, 'enemy speed ' + n);
        player.x = finish; player.y = 7.099; update(0);
        check(state === 'won', 'finish phase ' + (n+1));
        check(banner.textContent.includes('zerou') === (n === 14), 'final celebration only at 15');
        update(3); check(level === (n+1)%15, 'progress new phase ' + n);
      }
      level = 9; load(); win(); update(3);
      check(level === 10, 'ten leads to eleven');
      starsAtStart = 0; shieldAtStart = false;
      level = 4; load(); win(); update(3);
      check(level === 5, 'phase five leads to six');
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
    page.evaluate("saveLevel('aventura', 14)")
    page.reload()
    assert page.evaluate("level === 14 && enemies.length === 19"), "resume phase fifteen"
    page.set_viewport_size({'width':390,'height':844})
    page.wait_for_function('W === 390 && H === 844')
    page.evaluate("player.x = 19; banner.textContent = ''; draw()")
    page.screenshot(path='/tmp/aventura-phase-fifteen-phone.png')
    assert not errors, errors
    print('PASS: fifteen phases and full terrain routes for phases 11-15, all new terrain gaps with real double jump, flags, progress, body contact, boxes, shield thresholds, collisions, grace, checkpoints, falls, HUD and controls')
    browser.close()
