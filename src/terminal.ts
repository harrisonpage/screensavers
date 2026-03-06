import type { ScreensaverFactory } from './types';
import { launchScreensaver, shutdownScreensaver, isActive } from './registry';

interface MenuEntry {
  name: string;
  slug: string;
  description: string;
  boring?: boolean;
  factory: ScreensaverFactory;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


export function createTerminalUI(
  container: HTMLElement,
  factories: ScreensaverFactory[],
): void {
  const realEntries: MenuEntry[] = factories
    .filter((factory) => {
      const ss = factory();
      return !ss.disabled;
    })
    .map((factory) => {
      const ss = factory();
      return { name: ss.name, slug: slugify(ss.name), description: ss.description, boring: ss.boring, factory };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const randomEntry: MenuEntry = {
    name: 'Random',
    slug: 'random',
    description: 'Launch a random screensaver',
    factory: () => {
      const nonBoring = realEntries.filter((e) => !e.boring);
      const pick = nonBoring[Math.floor(Math.random() * nonBoring.length)];
      return pick.factory();
    },
  };

  const entries: MenuEntry[] = [...realEntries, randomEntry];

  let activeIndex: number | null = null;
  let savedScrollY = 0;
  let shuffleTimer: ReturnType<typeof setInterval> | null = null;
  const shuffleWait = Math.max(1, parseInt(new URLSearchParams(window.location.search).get('wait') ?? '60', 10)) * 1000;

  function pickRandomIndex(excludeIndex: number | null): number {
    const nonBoring = realEntries.map((e, i) => ({ e, i })).filter(({ e }) => !e.boring);
    const candidates = excludeIndex !== null
      ? nonBoring.filter(({ i }) => i !== excludeIndex)
      : nonBoring;
    const pool = candidates.length > 0 ? candidates : nonBoring;
    return pool[Math.floor(Math.random() * pool.length)].i;
  }

  function startShuffle() {
    stopShuffle();
    const idx = pickRandomIndex(null);
    activeIndex = idx;
    savedScrollY = window.scrollY;
    container.style.display = 'none';
    launchScreensaver(realEntries[idx].factory);
    history.replaceState(null, '', '/s/shuffle');
    shuffleTimer = setInterval(() => {
      const nextIdx = pickRandomIndex(activeIndex);
      activeIndex = nextIdx;
      launchScreensaver(realEntries[nextIdx].factory);
    }, shuffleWait);
  }

  function stopShuffle() {
    if (shuffleTimer !== null) {
      clearInterval(shuffleTimer);
      shuffleTimer = null;
    }
  }

  function render() {
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'page-header';
    const h1 = document.createElement('h1');
    h1.textContent = 'SCREENSAVERS TV';
    header.appendChild(h1);
    container.appendChild(header);

    // List of screensavers
    const list = document.createElement('div');
    list.className = 'saver-list';
    container.appendChild(list);

    entries.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'saver-item';

      const name = document.createElement('span');
      name.textContent = entry.name;
      item.appendChild(name);

      const arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '\u203a';
      item.appendChild(arrow);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        launchEntry(entry);
      });

      list.appendChild(item);
    });

    // Footer
    const footer = document.createElement('div');
    footer.className = 'page-footer';
    container.appendChild(footer);

    const aboutLink = document.createElement('a');
    aboutLink.href = 'https://harrison.page';
    aboutLink.textContent = 'ABOUT';
    footer.appendChild(aboutLink);

    const changesLink = document.createElement('a');
    changesLink.href = 'changes.html';
    changesLink.textContent = 'CHANGES';
    footer.appendChild(changesLink);

    const creditsLink = document.createElement('a');
    creditsLink.href = 'credits.html';
    creditsLink.textContent = 'CREDITS';
    footer.appendChild(creditsLink);
    
    const githubLink = document.createElement('a');
    githubLink.href = 'https://github.com/harrisonpage/screensavers';
    githubLink.textContent = 'GITHUB';
    footer.appendChild(githubLink);

    const rssLink = document.createElement('a');
    rssLink.href = '/changes.xml';
    rssLink.textContent = 'RSS';
    footer.appendChild(rssLink);

    const shuffleLink = document.createElement('a');
    shuffleLink.href = '#';
    shuffleLink.textContent = 'SHUFFLE';
    shuffleLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startShuffle();
    });
    footer.appendChild(shuffleLink);

    const hint = document.createElement('span');
    hint.className = 'hint';
    hint.textContent = `\u2190 \u2192 SWITCH \u00b7 VERSION 1.0.${__BUILD_VERSION__}`;
    footer.appendChild(hint);
  }

  function launchEntry(entry: MenuEntry) {
    // Resolve "Random" to an actual screensaver so arrow keys work from it
    let resolved = entry;
    if (entry === randomEntry) {
      const nonBoring = realEntries.filter((e) => !e.boring);
      resolved = nonBoring[Math.floor(Math.random() * nonBoring.length)];
    }
    activeIndex = realEntries.indexOf(resolved);
    savedScrollY = window.scrollY;
    container.style.display = 'none';
    launchScreensaver(resolved.factory);
    history.replaceState(null, '', '/s/' + resolved.slug);
  }

  function returnToMenu() {
    stopShuffle();
    shutdownScreensaver();
    container.style.display = '';
    window.scrollTo(0, savedScrollY);
    history.replaceState(null, '', '/');
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isActive()) return;
    if (e.key === 'Escape') {
      returnToMenu();
    } else if (e.key === 'ArrowLeft' && activeIndex !== null) {
      if (shuffleTimer !== null) {
        stopShuffle();
        activeIndex = (activeIndex - 1 + realEntries.length) % realEntries.length;
        launchScreensaver(realEntries[activeIndex].factory);
        shuffleTimer = setInterval(() => {
          const nextIdx = pickRandomIndex(activeIndex);
          activeIndex = nextIdx;
          launchScreensaver(realEntries[nextIdx].factory);
        }, shuffleWait);
      } else {
        activeIndex = (activeIndex - 1 + realEntries.length) % realEntries.length;
        launchEntry(realEntries[activeIndex]);
      }
    } else if (e.key === 'ArrowRight' && activeIndex !== null) {
      if (shuffleTimer !== null) {
        stopShuffle();
        activeIndex = (activeIndex + 1) % realEntries.length;
        launchScreensaver(realEntries[activeIndex].factory);
        shuffleTimer = setInterval(() => {
          const nextIdx = pickRandomIndex(activeIndex);
          activeIndex = nextIdx;
          launchScreensaver(realEntries[nextIdx].factory);
        }, shuffleWait);
      } else {
        activeIndex = (activeIndex + 1) % realEntries.length;
        launchEntry(realEntries[activeIndex]);
      }
    }
  }

  function onClick() {
    if (isActive()) {
      returnToMenu();
    }
  }

  function onResize() {
    if (!isActive()) {
      render();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  window.addEventListener('resize', onResize);

  // Always render the menu so it's ready when the user dismisses a screensaver
  render();

  // Auto-launch from URL path (e.g. /s/starfield) or legacy query param (?saver=starfield)
  const pathMatch = window.location.pathname.match(/^\/s\/(.+)$/);
  const saverParam = pathMatch ? pathMatch[1] : new URLSearchParams(window.location.search).get('saver');
  if (saverParam) {
    if (saverParam === 'shuffle') {
      startShuffle();
      return;
    }
    const match = entries.find((e) => e.slug === saverParam);
    if (match) {
      launchEntry(match);
      return;
    }
  }
}
