"""Run: uv run --with playwright python tests/theme-browser.py."""
import os
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path('/tmp/cantinho-theme')
ARTIFACTS.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{server.server_port}'
def contrast(foreground, background):
    def luminance(color):
        rgb = [int(n) / 255 for n in re.findall(r'\d+', color)[:3]]
        rgb = [n / 12.92 if n <= .04045 else ((n + .055) / 1.055) ** 2.4 for n in rgb]
        return sum(n * weight for n, weight in zip(rgb, [.2126, .7152, .0722]))
    a, b = sorted([luminance(foreground), luminance(background)])
    return (b + .05) / (a + .05)

def open_color_menu(page):
    if not page.locator('.theme-menu').get_attribute('open') == '':
        page.locator('.theme-menu summary').click()

def goto_index(page):
    page.goto(URL + '/index.html')
    open_color_menu(page)

pages = ['index', 'magictiles', 'balloons', 'memory', 'puzzle', 'pintar', 'runner', 'aventura', 'stars', 'jardim', 'labirinto', 'fotos']
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path=os.environ.get('THEME_TEST_CHROME'), args=['--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        goto_index(page)
        assert page.locator('input[value="light"]').is_checked()
        assert page.locator('h1').bounding_box()['y'] >= 0
        page.keyboard.press('Escape')
        assert page.locator('.theme-menu').get_attribute('open') is None
        page.set_viewport_size({'width': 390, 'height': 600})
        page.mouse.wheel(0, 1500)
        page.wait_for_function('scrollY > 0')
        assert page.locator('a.game').last.bounding_box()['y'] < 600
        assert page.evaluate('getComputedStyle(document.documentElement).touchAction') == 'auto'
        page.evaluate('scrollTo(0, 0)')
        page.set_viewport_size({'width': 390, 'height': 844})
        open_color_menu(page)
        # Native radio buttons support keyboard selection.
        page.locator('input[value="light"]').focus()
        page.keyboard.press('ArrowRight')
        assert page.locator('input[value="dark"]').is_checked()
        assert page.evaluate('localStorage.getItem("cantinho:theme")') == 'dark'
        for theme, color in [('dark', 'rgb(36, 27, 45)'), ('light', 'rgb(244, 168, 200)')]:
            goto_index(page)
            page.locator(f'input[value="{theme}"]').check()
            for name in pages:
                page.goto(f'{URL}/{name}.html')
                page.wait_for_function('document.documentElement.dataset.theme === ' + repr(theme))
                assert page.evaluate('getComputedStyle(document.body).backgroundColor') == color, (theme, name)
                assert contrast(page.evaluate('getComputedStyle(document.body).color'), color) >= 4.5, (theme, name, 'text contrast')
                if name == 'index':
                    fg, bg = page.locator('a.game').first.evaluate('(e) => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]')
                    assert contrast(fg, bg) >= 4.5
                if name == 'labirinto':
                    page.get_by_role('button', name='Jogar', exact=True).wait_for()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (theme, name, 'overflow')
                if name in ['jardim', 'labirinto']:
                    page.wait_for_timeout(600)
                page.screenshot(path=str(ARTIFACTS / f'{name}-{theme}.png'), full_page=True)
                menu = page.locator('.theme-menu, .progress-menu')
                assert menu.count() == 1, name
                menu.locator('summary').click()
                page.locator('#background-color').fill('#1565c0')
                assert page.evaluate('CantinhoTheme.colors.background') == '#1565c0', name
                page.locator(f'input[value="{theme}"]').check()
                assert page.evaluate('getComputedStyle(document.body).backgroundColor') == color, name
                box = menu.locator('fieldset').bounding_box()
                assert box['x'] >= 0 and box['x'] + box['width'] <= 390, (name, box)
                page.screenshot(path=str(ARTIFACTS / f'{name}-menu-{theme}.png'))
                page.keyboard.press('Escape')
                assert menu.get_attribute('open') is None, name
                if name == 'labirinto':
                    page.get_by_role('button', name='Jogar', exact=True).click()
                    assert page.locator('.top-actions .progress-menu').count() == 1
                    menu.locator('summary').click()
                    page.locator('#background-color').fill('#1565c0')
                    assert page.evaluate('CantinhoTheme.colors.background') == '#1565c0'
                    page.locator(f'input[value="{theme}"]').check()
                    page.keyboard.press('Escape')
                    page.get_by_role('button', name='Pausar', exact=True).click()
                    assert page.locator('.panel .progress-menu').count() == 1
            page.goto(URL + '/magictiles.html')
            page.locator('#play').click()
            assert page.evaluate('game && !game.over')
            expected = [36, 27, 45] if theme == 'dark' else [244, 168, 200]
            assert page.evaluate('Array.from(ctx.getImageData(0, 100, 1, 1).data).slice(0,3)') == expected
            page.screenshot(path=str(ARTIFACTS / f'magictiles-playing-{theme}.png'))
        # The user can pick any background color, independently of presets.
        goto_index(page)
        for value in ['#1565c0', '#ffcc00', '#ffffff', '#000000', '#cc44aa']:
            open_color_menu(page)
            page.locator('#background-color').fill(value)
            assert page.evaluate('CantinhoTheme.colors.background') == value
            fg, bg = page.evaluate('[getComputedStyle(document.body).color, getComputedStyle(document.body).backgroundColor]')
            assert contrast(fg, bg) >= 4.5, value
            page.reload()
            assert page.locator('#background-color').input_value() == value
        for name in pages:
            page.goto(f'{URL}/{name}.html')
            assert page.evaluate('CantinhoTheme.colors.background') == '#cc44aa', name
            assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(204, 68, 170)', name
        goto_index(page)
        page.screenshot(path=str(ARTIFACTS / 'index-custom.png'), full_page=True)
        page.locator('input[value="light"]').check()
        assert page.evaluate('localStorage.getItem("cantinho:background")') is None
        # Cross-tab changes and removal of the saved setting apply immediately.
        other = context.new_page()
        other.on('pageerror', lambda error: errors.append(str(error)))
        goto_index(other)
        other.locator('input[value="dark"]').check()
        page.wait_for_function('CantinhoTheme.dark')
        other.evaluate('localStorage.removeItem("cantinho:theme")')
        page.wait_for_function('!CantinhoTheme.dark')
        # Invalid and unavailable storage must leave the system usable.
        other.evaluate('localStorage.setItem("cantinho:theme", "invalid")')
        other.reload()
        assert other.locator('input[value="light"]').is_checked()
        context.add_init_script('''Object.defineProperty(window, 'localStorage', {
            get() { throw new DOMException('Blocked', 'SecurityError'); }
        });''')
        other.reload()
        open_color_menu(other)
        other.locator('input[value="dark"]').check()
        assert other.evaluate('CantinhoTheme.dark')
        page.set_viewport_size({'width': 1280, 'height': 900})
        goto_index(page)
        page.locator('input[value="dark"]').check()
        page.screenshot(path=str(ARTIFACTS / 'index-desktop-dark.png'), full_page=True)
        assert not errors, errors
        browser.close()
        print('PASS: 12 pages in both themes, keyboard, persistence, canvas, cross-tab sync, invalid/blocked storage, mobile layout; no JavaScript errors')
finally:
    server.shutdown()
