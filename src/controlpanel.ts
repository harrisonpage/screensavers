import type { ScreensaverFactory } from './types';
import { launchScreensaver, shutdownScreensaver, isActive } from './registry';

declare const __BUILD_VERSION__: string;

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

export function createControlPanel(
  container: HTMLElement,
  factories: ScreensaverFactory[],
): void {
  const entries: MenuEntry[] = factories
    .filter((factory) => {
      const ss = factory();
      return !ss.disabled;
    })
    .map((factory) => {
      const ss = factory();
      return { name: ss.name, slug: slugify(ss.name), description: ss.description, boring: ss.boring, factory };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let selectedIndex: number | null = null;
  let activeIndex: number | null = null;
  let shuffleTimer: ReturnType<typeof setInterval> | null = null;
  const shuffleWait = Math.max(1, parseInt(new URLSearchParams(window.location.search).get('wait') ?? '60', 10)) * 1000;

  // DOM references (set in render)
  let windowBody: HTMLElement;
  let listScroll: HTMLElement;
  let detailName: HTMLElement;
  let detailDesc: HTMLElement;
  let monitorLabel: HTMLElement;
  let statusLeft: HTMLElement;
  let fullScreenBtn: HTMLButtonElement;

  function pickRandomIndex(excludeIndex: number | null): number {
    const nonBoring = entries.map((e, i) => ({ e, i })).filter(({ e }) => !e.boring);
    const candidates = excludeIndex !== null
      ? nonBoring.filter(({ i }) => i !== excludeIndex)
      : nonBoring;
    const pool = candidates.length > 0 ? candidates : nonBoring;
    return pool[Math.floor(Math.random() * pool.length)].i;
  }

  function selectEntry(index: number) {
    selectedIndex = index;
    const entry = entries[index];

    // Update list highlight
    const items = listScroll.querySelectorAll('.list-item');
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === index);
    });

    // Update detail pane
    detailName.textContent = entry.name;
    detailDesc.textContent = entry.description;
    monitorLabel.textContent = 'Preview';
    fullScreenBtn.disabled = false;

    // On mobile, show detail
    windowBody.classList.add('preview-active');
  }

  function launchSelected() {
    if (selectedIndex === null) return;
    const entry = entries[selectedIndex];
    activeIndex = selectedIndex;
    container.style.display = 'none';
    launchScreensaver(entry.factory);
    const url = new URL(window.location.href);
    url.searchParams.set('saver', entry.slug);
    history.replaceState(null, '', url.toString());
  }

  function launchRandom() {
    const nonBoring = entries.filter((e) => !e.boring);
    const pick = nonBoring[Math.floor(Math.random() * nonBoring.length)];
    const idx = entries.indexOf(pick);
    selectEntry(idx);
    activeIndex = idx;
    container.style.display = 'none';
    launchScreensaver(pick.factory);
    const url = new URL(window.location.href);
    url.searchParams.set('saver', pick.slug);
    history.replaceState(null, '', url.toString());
  }

  function startShuffle() {
    stopShuffle();
    const idx = pickRandomIndex(null);
    activeIndex = idx;
    container.style.display = 'none';
    launchScreensaver(entries[idx].factory);
    const url = new URL(window.location.href);
    url.searchParams.set('saver', 'shuffle');
    history.replaceState(null, '', url.toString());
    shuffleTimer = setInterval(() => {
      const nextIdx = pickRandomIndex(activeIndex);
      activeIndex = nextIdx;
      launchScreensaver(entries[nextIdx].factory);
    }, shuffleWait);
  }

  function stopShuffle() {
    if (shuffleTimer !== null) {
      clearInterval(shuffleTimer);
      shuffleTimer = null;
    }
  }

  function returnToMenu() {
    stopShuffle();
    shutdownScreensaver();
    container.style.display = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('saver');
    history.replaceState(null, '', url.toString());
  }

  function mobileBack() {
    windowBody.classList.remove('preview-active');
  }

  function render() {
    container.innerHTML = '';

    // Window
    const win = document.createElement('div');
    win.className = 'window';
    container.appendChild(win);

    // Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'title-bar';
    win.appendChild(titleBar);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'title-bar-btn';
    titleBar.appendChild(closeBtn);

    const title = document.createElement('span');
    title.className = 'title-bar-title';
    title.textContent = 'SCREENSAVERS TV';
    titleBar.appendChild(title);

    const resizeBtn = document.createElement('div');
    resizeBtn.className = 'title-bar-btn';
    titleBar.appendChild(resizeBtn);

    // Window body
    windowBody = document.createElement('div');
    windowBody.className = 'window-body';
    win.appendChild(windowBody);

    // Left pane
    const listPane = document.createElement('div');
    listPane.className = 'list-pane';
    windowBody.appendChild(listPane);

    const listHeader = document.createElement('div');
    listHeader.className = 'list-header';
    listHeader.textContent = 'Modules';
    listPane.appendChild(listHeader);

    listScroll = document.createElement('div');
    listScroll.className = 'list-scroll';
    listPane.appendChild(listScroll);

    entries.forEach((entry, i) => {
      const item = document.createElement('div');
      item.className = 'list-item';
      if (i === selectedIndex) item.classList.add('selected');

      const icon = document.createElement('span');
      icon.className = 'list-icon';
      icon.textContent = entry.name.charAt(0);
      item.appendChild(icon);

      const label = document.createTextNode(entry.name);
      item.appendChild(label);

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        selectEntry(i);
      });

      item.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        selectEntry(i);
        launchSelected();
      });

      listScroll.appendChild(item);
    });

    // Right pane
    const detailPane = document.createElement('div');
    detailPane.className = 'detail-pane';
    windowBody.appendChild(detailPane);

    // Mobile back button
    const backBtn = document.createElement('div');
    backBtn.className = 'mobile-back';
    backBtn.textContent = '\u25C0 Modules';
    backBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileBack();
    });
    detailPane.appendChild(backBtn);

    // Monitor
    const monitor = document.createElement('div');
    monitor.className = 'monitor';
    detailPane.appendChild(monitor);

    const screen = document.createElement('div');
    screen.className = 'monitor-screen';
    monitor.appendChild(screen);

    monitorLabel = document.createElement('div');
    monitorLabel.className = 'monitor-label';
    monitorLabel.textContent = 'Preview';
    monitor.appendChild(monitorLabel);

    // Info
    const info = document.createElement('div');
    info.className = 'detail-info';
    detailPane.appendChild(info);

    detailName = document.createElement('div');
    detailName.className = 'detail-name';
    detailName.textContent = selectedIndex !== null ? entries[selectedIndex].name : '';
    info.appendChild(detailName);

    detailDesc = document.createElement('div');
    detailDesc.className = 'detail-description';
    detailDesc.textContent = selectedIndex !== null ? entries[selectedIndex].description : 'Select a screensaver from the list.';
    info.appendChild(detailDesc);

    // Buttons
    const buttons = document.createElement('div');
    buttons.className = 'detail-buttons';
    detailPane.appendChild(buttons);

    const randomBtn = document.createElement('button');
    randomBtn.className = 'mac-btn';
    randomBtn.textContent = 'Random';
    randomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      launchRandom();
    });
    buttons.appendChild(randomBtn);

    fullScreenBtn = document.createElement('button');
    fullScreenBtn.className = 'mac-btn mac-btn-default';
    fullScreenBtn.textContent = 'Full Screen';
    fullScreenBtn.disabled = selectedIndex === null;
    fullScreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      launchSelected();
    });
    buttons.appendChild(fullScreenBtn);

    // Status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'status-bar';
    win.appendChild(statusBar);

    statusLeft = document.createElement('span');
    statusLeft.textContent = `${entries.length} screensavers`;
    statusBar.appendChild(statusLeft);

    const statusRight = document.createElement('span');
    statusRight.textContent = 'Ready';
    statusBar.appendChild(statusRight);
  }

  // Keyboard handling
  function onKeyDown(e: KeyboardEvent) {
    if (isActive()) {
      if (e.key === 'Escape') {
        returnToMenu();
      } else if (e.key === 'ArrowLeft' && activeIndex !== null) {
        if (shuffleTimer !== null) {
          stopShuffle();
          activeIndex = (activeIndex - 1 + entries.length) % entries.length;
          launchScreensaver(entries[activeIndex].factory);
          shuffleTimer = setInterval(() => {
            const nextIdx = pickRandomIndex(activeIndex);
            activeIndex = nextIdx;
            launchScreensaver(entries[nextIdx].factory);
          }, shuffleWait);
        } else {
          activeIndex = (activeIndex - 1 + entries.length) % entries.length;
          selectedIndex = activeIndex;
          container.style.display = 'none';
          launchScreensaver(entries[activeIndex].factory);
          const url = new URL(window.location.href);
          url.searchParams.set('saver', entries[activeIndex].slug);
          history.replaceState(null, '', url.toString());
        }
      } else if (e.key === 'ArrowRight' && activeIndex !== null) {
        if (shuffleTimer !== null) {
          stopShuffle();
          activeIndex = (activeIndex + 1) % entries.length;
          launchScreensaver(entries[activeIndex].factory);
          shuffleTimer = setInterval(() => {
            const nextIdx = pickRandomIndex(activeIndex);
            activeIndex = nextIdx;
            launchScreensaver(entries[nextIdx].factory);
          }, shuffleWait);
        } else {
          activeIndex = (activeIndex + 1) % entries.length;
          selectedIndex = activeIndex;
          container.style.display = 'none';
          launchScreensaver(entries[activeIndex].factory);
          const url = new URL(window.location.href);
          url.searchParams.set('saver', entries[activeIndex].slug);
          history.replaceState(null, '', url.toString());
        }
      }
    } else {
      // Navigate list with arrow keys when on control panel
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = selectedIndex === null ? 0 : Math.min(selectedIndex + 1, entries.length - 1);
        selectEntry(next);
        scrollSelectedIntoView();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = selectedIndex === null ? 0 : Math.max(selectedIndex - 1, 0);
        selectEntry(prev);
        scrollSelectedIntoView();
      } else if (e.key === 'Enter' && selectedIndex !== null) {
        launchSelected();
      }
    }
  }

  function scrollSelectedIntoView() {
    if (selectedIndex === null || !listScroll) return;
    const items = listScroll.querySelectorAll('.list-item');
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function onClick() {
    if (isActive()) {
      returnToMenu();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);

  // Auto-launch from URL query param
  const params = new URLSearchParams(window.location.search);
  const saverParam = params.get('saver');
  if (saverParam) {
    if (saverParam === 'shuffle') {
      render();
      startShuffle();
      return;
    }
    const match = entries.find((e) => e.slug === saverParam);
    if (match) {
      const idx = entries.indexOf(match);
      selectedIndex = idx;
      render();
      activeIndex = idx;
      container.style.display = 'none';
      launchScreensaver(match.factory);
      return;
    }
  }

  render();

  // Auto-select first entry
  if (entries.length > 0) {
    selectEntry(0);
  }
}
