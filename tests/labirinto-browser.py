"""Run with the local site on port 8086: uv run --with playwright python tests/labirinto-browser.py"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
URL = os.environ.get('MAZE_TEST_URL', 'http://127.0.0.1:8086')
CHROME = os.environ.get('MAZE_TEST_CHROME')

with sync_playwright() as p:
    options = {'headless': True, 'args': ['--enable-unsafe-swiftshader']}
    if CHROME:
        options['executable_path'] = CHROME
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True)
    # Read live state for assertions. Production code has no test globals or bypasses.
    context.route('**/labirinto.js', lambda route: route.fulfill(
        body=(ROOT / 'labirinto.js').read_text() + '\nexport { round, maze, state, renderer, camera };',
        content_type='text/javascript'))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    # Real touchscreen events exercise camera projection, corners, walls and cleanup.
    touch_page = context.new_page()
    touch_page.on('pageerror', lambda error: errors.append(str(error)))
    touch_page.goto(URL + '/labirinto.html')
    touch_page.get_by_role('button', name='Jogar', exact=True).click()
    # Keep the monster asleep while checking input behavior in isolation.
    touch_page.evaluate("async () => { (await import('./labirinto.js')).round.headStart = 1000; }")
    cdp = context.new_cdp_session(touch_page)

    def cell():
        return touch_page.evaluate("async () => { const a=(await import('./labirinto.js')).round.princess;return {x:a.x,z:a.z}; }")

    def screen(point):
        return touch_page.evaluate("""async p => {
          const m=await import('./labirinto.js'),{Vector3}=await import('three');
          const offset=(m.maze.size-1)/2;
          const projected=new Vector3(p.x-offset,.08,p.z-offset).project(m.camera);
          const rect=document.querySelector('canvas').getBoundingClientRect();
          return {x:rect.left+(projected.x+1)*rect.width/2,
                  y:rect.top+(1-projected.y)*rect.height/2};
        }""", point)

    def touch(kind, point=None):
        points = [] if point is None else [{**screen(point), 'id': 1}]
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})

    def wait_at(point):
        touch_page.wait_for_function("""async p => {
          const a=(await import('./labirinto.js')).round.princess;
          return Math.hypot(a.x-p.x,a.z-p.z)<.03;
        }""", arg=point)

    route = touch_page.evaluate("""async () => {
      const {maze}=await import('./labirinto.js'),{findPath}=await import('./labirinto-maze.js');
      const path=findPath(maze,maze.start,maze.exit);
      for(let i=2;i<path.length;i++) {
        if(path[i].x-path[i-1].x!==path[i-1].x-path[i-2].x ||
           path[i].z-path[i-1].z!==path[i-1].z-path[i-2].z) return path.slice(0,i+2);
      }
      throw Error('Expected an escape route with a corner');
    }""")
    touch('touchStart', route[0])
    assert touch_page.locator('canvas').evaluate("c=>c.classList.contains('dragging')")
    for point in route[1:]:
        touch('touchMove', point)
        wait_at(point)
    touch('touchEnd')
    touch_page.wait_for_timeout(350)
    stopped = cell()
    touch_page.wait_for_timeout(150)
    assert cell() == stopped, 'finger release left movement held'

    wall = touch_page.evaluate("""async () => {
      const {round,maze}=await import('./labirinto.js'),{isOpen}=await import('./labirinto-maze.js');
      const a=round.princess.cell;
      return [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}].map(d=>({x:a.x+d.x,z:a.z+d.z})).find(p=>!isOpen(maze,p));
    }""")
    touch('touchStart', stopped)
    touch('touchMove', wall)
    touch_page.wait_for_timeout(350)
    assert cell() == stopped, 'drag crossed a wall or moved along a stale direction'
    touch('touchEnd')

    def open_neighbor():
        return touch_page.evaluate("""async () => {
          const {round,maze}=await import('./labirinto.js'),{isOpen}=await import('./labirinto-maze.js');
          const a=round.princess.cell;
          return [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}].map(d=>({x:a.x+d.x,z:a.z+d.z})).find(p=>isOpen(maze,p));
        }""")

    touch('touchStart', cell())
    touch('touchMove', open_neighbor())
    touch_page.wait_for_timeout(90)
    touch('touchCancel')
    touch_page.wait_for_timeout(350)
    stopped = cell()
    touch_page.wait_for_timeout(150)
    assert cell() == stopped
    assert not touch_page.locator('canvas').evaluate("c=>c.classList.contains('dragging')")

    touch('touchStart', cell())
    touch('touchMove', open_neighbor())
    touch_page.evaluate("window.dispatchEvent(new Event('blur'))")
    frozen = cell()
    touch_page.wait_for_timeout(180)
    assert cell() == frozen
    touch('touchEnd')
    touch_page.get_by_role('button', name='Continuar', exact=True).click()
    touch_page.wait_for_timeout(350)
    stopped = cell()
    touch_page.wait_for_timeout(150)
    assert cell() == stopped, 'resume restored a stale drag'

    touch('touchStart', cell())
    touch('touchMove', open_neighbor())
    touch_page.set_viewport_size({'width':844,'height':390})
    touch_page.wait_for_timeout(350)
    stopped = cell()
    touch_page.wait_for_timeout(150)
    assert cell() == stopped, 'rotation left a drag held'
    touch('touchEnd')
    # A second finger, including on the arrows, must not replace the active drag.
    stopped = cell()
    touch('touchStart', stopped)
    primary = {**screen(stopped), 'id': 1}
    arrow = touch_page.locator('[data-direction="up"]').bounding_box()
    extra = {'x':arrow['x']+20,'y':arrow['y']+20,'id':2}
    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[primary,extra]})
    touch_page.wait_for_timeout(180)
    assert cell() == stopped
    assert not touch_page.locator('.direction.held').count()
    cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[extra]})
    touch_page.wait_for_timeout(180)
    assert cell() == stopped, 'second finger started movement after releasing the drag'
    touch('touchEnd')
    touch_page.screenshot(path='/tmp/maze-finger-controls.png')
    touch_page.close()
    print('PASS: real touchscreen corridor movement, corner, wall, release, cancel, pause/resume, resize and extra fingers')
    page.goto(URL + '/index.html')
    page.get_by_role('link', name='👑 Labirinto da princesa').click()
    page.get_by_role('button', name='Jogar', exact=True).click()
    state = lambda: page.evaluate("async () => { const m = await import('./labirinto.js'); return {state:m.state, elapsed:m.round.elapsed, x:m.round.princess.x, z:m.round.princess.z, monsterX:m.round.monster.x, monsterZ:m.round.monster.z, size:m.maze.size}; }")
    assert state()['state'] == 'playing'
    before = state()
    # Walk into the generated maze with the real touch control.
    direction = page.evaluate("async () => {const {maze}=await import('./labirinto.js');return maze.grid[maze.start.z-1][maze.start.x]===0?'up':'right';}")
    button = page.locator('[data-direction="' + direction + '"]')
    box = button.bounding_box()
    page.mouse.move(box['x'] + 25, box['y'] + 25)
    page.mouse.down()
    page.wait_for_timeout(420)
    page.mouse.up()
    after = state()
    assert (after['x'],after['z']) != (before['x'],before['z'])
    # Pause clears a held key and freezes the chase until explicit resume.
    page.keyboard.down('ArrowUp')
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    page.get_by_role('button', name='Continuar', exact=True).wait_for()
    frozen = state()
    page.wait_for_timeout(250)
    assert state() == frozen
    page.keyboard.up('ArrowUp')
    page.get_by_role('button', name='Continuar', exact=True).click()
    assert state()['state'] == 'playing'
    for width, height, label in [(390,844,'phone'),(844,390,'landscape'),(1280,800,'desktop'),(320,568,'small-phone')]:
        page.set_viewport_size({'width':width,'height':height})
        page.wait_for_timeout(80)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        for control in page.locator('.direction').all():
            bounds = control.bounding_box()
            assert bounds['width'] >= 44 and bounds['height'] >= 44
            assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= height
        # Project board corners to verify the whole maze fits the actual camera.
        assert page.evaluate("""async () => {
          const {maze,camera}=await import('./labirinto.js');
          const {Vector3}=await import('three');
          const edge=(maze.size+.6)/2;
          return [-edge,edge].every(x=>[-edge,edge].every(z=>{
            const p=new Vector3(x,.6,z).project(camera);
            return Math.abs(p.x)<1 && Math.abs(p.y)<1;
          }));
        }""")
        page.screenshot(path='/tmp/maze-'+label+'.png')
    # Use the real simulation to reach a catch, then verify the retry UI.
    page.evaluate("""async () => {
      const m=await import('./labirinto.js'), core=await import('./labirinto-maze.js');
      for(let i=0;i<12000 && m.round.status==='playing';i++) core.stepRound(m.round,1/120);
    }""")
    page.get_by_role('button', name='Tentar de novo', exact=True).click()
    assert state()['elapsed'] < 1
    # Walk the real escape route in simulation; the rendered loop owns result screens.
    for level in range(1,8):
        page.evaluate("""async () => {
          const m=await import('./labirinto.js'), c=await import('./labirinto-maze.js');
          for(let i=0;i<20000 && m.round.status==='playing';i++) {
            const a=m.round.princess.target||m.round.princess.cell,n=c.findPath(m.maze,a,m.maze.exit)[1];
            const d=n ? n.x>a.x?'right':n.x<a.x?'left':n.z>a.z?'down':'up':undefined;
            c.stepRound(m.round,1/120,d);
          }
        }""")
        page.get_by_role('button', name='Próxima fase', exact=True).click()
    assert state()['size'] == 15
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path='/tmp/maze-level8.png')
    # Service-worker precache must open the entire game offline, including Three.js.
    offline = context.new_page()
    offline.goto(URL + '/index.html')
    offline.evaluate('navigator.serviceWorker.ready')
    offline.reload()
    context.set_offline(True)
    offline.goto(URL + '/labirinto.html')
    offline.get_by_role('button', name='Jogar', exact=True).click()
    offline.get_by_role('button', name='Pausar', exact=True).wait_for()
    assert not errors, errors
    print('PASS: home link, touch movement, keyboard/pause, 4 layouts, camera bounds, catch/retry, win/next, capped size, offline 3D load; no JS errors')
    browser.close()
