import type { Screensaver } from '../types';

export function createDesktop(): Screensaver {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let animationFrame: number | null = null;
  let width = 0;
  let height = 0;

  // ── Desktop colors ──
  const DESKTOP_BG = '#3A6EA5';
  const TASKBAR_BG = '#C0C0C0';
  const TASKBAR_BORDER_LIGHT = '#FFFFFF';
  const TASKBAR_BORDER_DARK = '#808080';
  const TASKBAR_BORDER_DARKER = '#404040';
  const WIN_BG = '#C0C0C0';
  const WIN_TITLE_ACTIVE = '#000080';
  const WIN_TITLE_INACTIVE = '#808080';
  const WIN_TITLE_TEXT = '#FFFFFF';
  const WIN_BORDER_LIGHT = '#FFFFFF';
  const WIN_BORDER_DARK = '#808080';
  const WIN_BORDER_DARKER = '#404040';
  const WIN_CONTENT_BG = '#FFFFFF';
  const TEXT_BLACK = '#000000';
  const TERM_BG = '#000000';
  const TERM_GREEN = '#33FF33';
  const HN_ORANGE = '#FF6600';
  const HN_BG = '#F6F6EF';
  const HN_TITLE_COLOR = '#000000';
  const HN_SUBTEXT = '#828282';
  const CALC_BG = '#C0C0C0';
  const CALC_DISPLAY_BG = '#9EAD86';
  const CALC_DISPLAY_TEXT = '#2D2D2D';
  const CALC_BTN_BG = '#E0E0E0';
  const SYSMON_BG = '#000000';
  const SYSMON_GREEN = '#00FF00';
  const SYSMON_RED = '#FF4444';
  const SYSMON_YELLOW = '#FFFF00';
  const SYSMON_TEXT = '#00FF00';
  const EDITOR_BG = '#FFFFFF';
  const EDITOR_TEXT = '#000000';
  const EDITOR_CURSOR = '#000000';
  const FILEMGR_BG = '#FFFFFF';
  const FILEMGR_SELECT = '#000080';
  const FILEMGR_SELECT_TEXT = '#FFFFFF';
  const EMAIL_BG = '#FFFFFF';
  const EMAIL_SELECT = '#000080';
  const EMAIL_SELECT_TEXT = '#FFFFFF';
  const WINAMP_BG = '#232323';
  const WINAMP_DISPLAY_BG = '#0A0A1A';
  const WINAMP_TEXT = '#00FF00';
  const WINAMP_EQ_GREEN = '#00FF00';
  const WINAMP_EQ_YELLOW = '#FFFF00';
  const WINAMP_EQ_RED = '#FF0000';
  const WINAMP_BTN_BG = '#3A3A3A';

  // ── Font sizing ──
  let baseFontSize = 12;
  let lineH = 16;

  // ── Taskbar ──
  const TASKBAR_HEIGHT = 32;

  // ── Window interface ──
  interface AppWindow {
    x: number;
    y: number;
    w: number;
    h: number;
    title: string;
    active: boolean;
    buttonsReversed: boolean;
    draw: (win: AppWindow, now: number) => void;
    update: (win: AppWindow, dt: number) => void;
  }

  let windows: AppWindow[] = [];

  // ── Desktop icons ──
  interface DesktopIcon {
    x: number;
    y: number;
    label: string;
    emoji: string;
  }

  let desktopIcons: DesktopIcon[] = [];

  // ── Terminal state ──
  const termLines: string[] = [];
  const MAX_TERM_LINES = 50;
  let termTimer = 0;
  const TERM_LINE_INTERVAL = 600;
  let termStack: string[] = [];

  const TERM_MESSAGES = [
    '[  OK  ] Love 2 Load Kernel Modules',
    '[  OK  ] Loading cat pictures... 1000... 2000... 5000... 10000... ',
    '[WARN ] kierkegaard.ko: meaning not found',
    '[WARN ] 640K is, like, totally enough memory',
    "[ERROR] punch cards scattered on floor",
    '[  OK  ] Crapper\'s Full',
    '[INFO ] kernel: sda1: recovering orphaned feelings',
    '[WARN ] systemd-resolved: DNS lookup for "rotten.com" failed',
    '[  OK  ] Started heideggerd - nothingness underlying existence',
    '[ERROR] Girl scout cookie box empty, ordering online',
    '[  OK  ] Mounted /dev/hopes on /mnt/toilet',
    '[INFO ] audit: USER_LOGIN pid=666 uid=666 auid=satan',
    '[WARN ] kernel: CPU0: Temperature above threshold (maybe pause your torrents)',
    '[  OK  ] Hungry, Ordering Pizza...',
    '[ERROR] NetworkManager: eth0: Feeling claustrophobic, maybe tomorrow',
    '[INFO ] kernel: Gamble-Tron 2000 downtime, upgrade to Frinkiac-7',
    '[  OK  ] You are in a maze of twisty little passages, all alike',
    '[WARN ] systemd[1]: /etc/passwd: line 47: the password is "hunter2"',
    '[  OK  ] Reticulating splines (estimated time: ∞).',
    '[ERROR] help i\'m trapped in a linux kernel',
    '[INFO ] kernel: Fuck that motherfucking bullshit (kiss my motherfucking ass)',
    '[  OK  ] mousedev: PS/2 mouse device common for all mice',
    '[WARN ] crond: job "get_your_shit_together" overdue by 847 days',
    '[  OK  ] Loading module: passive_aggression.ko',
    '[ERROR] segfault at 0xDEADBEEF (i will gladly pay you tuesday for a hamburger today)',
    '[INFO ] kernel: Red alert!',
    '[  OK  ] FATAL system error j/k the look on your face',
    '[WARN ] sshd: joined a union of tools in /usr/bin, want a payraise, closing port 22 until demands are met',
    '[  OK  ] Mounting /dev/fridge (ENO_EGGS_CHEESE_BUTTER_MILK)',
    '[ERROR] failed to start diet.service: tomorrow for sure',
    '[INFO ] kernel: random: life uh finds a way',
    '[  OK  ] Sending credit card number to dark web',
    '[WARN ] thermald: CPU thermal zone is "Hot in Herre" (2002)',
    '[ERROR] PROGRAMMER GOOFED . . . YOU SHOULD NEVER SEE THIS MESSAGE',
    '[  OK  ] I’m broken. Please show this to someone who can fix',
    '[INFO ] systemd-logind: Have you been working out? You look great',
    '[WARN ] kernel: Up, Up, Down, Down, Left, Right, Left, Right, B, A',
    '[  OK  ] Hello Smithers, You\'re Quite Good At Turning Me On!',
    '[ERROR] apt: unable to locate package "free beer"',
    '[INFO ] kernel: year_of_the_linux_desktop=false',
  ];

  // ── Hacker Newz state ──
  interface HNStory {
    title: string;
    url: string;
    points: number;
    user: string;
    comments: number;
    hours: number;
  }

  let hnStories: HNStory[] = [];
  let hnStack: { title: string; url: string }[] = [];
  let hnRefreshTimer = 0;
  const HN_REFRESH_INTERVAL = 25000;

  const HN_HEADLINES = [
    { title: 'I Rewrote My Entire Life in Rust Over a Weekend and You Should Too', url: 'rustfuckyeah.dev' },
    { title: 'Why I Quit My $800K Job to dunk my head in the toilet', url: 'mygoddamnblog.com' },
    { title: 'Show HN: I Made a Database That\'s Just A Guy Named Bruce', url: 'github.com/txtdb' },
    { title: 'The Death of JavaScript (2024) (2023) (2022) (2021)', url: 'medium.com/@hotakes' },
    { title: 'Is it wrong to smell my own farts? In this essay, I will', url: 'substack.com/@hitler1988' },
    { title: 'Ask HN: Please help my head is stuck in a hollow log', url: '' },
    { title: 'I Replaced My Entire Engineering Team And Now I\'m Lonely', url: 'linkedin.com/probably' },
    { title: 'Ask HN: How do I exit vi????????? please help', url: 'stackunderflow.com' },
    { title: 'How I 10x\'d My Productivity By Plucking Out My Own Eyes', url: 'grindset.io' },
    { title: 'Show HN: MCP for AI-Powered Fuck Machine', url: 'llm.xxx' },
    { title: 'Why Your Startup Failed: You Used Tabs Instead of Spaces', url: 'founderlogic.vc' },
    { title: 'The Unreasonable Effectiveness of Just Logging Out Forever', url: 'arxiv.org/lmgtfy' },
    { title: 'Show HN: I Made an Electron App That\'s Only 8GB', url: 'github.com/smolapp' },
    { title: 'Remote Work Is Dead (Written From My Private Island)', url: 'returntooffice.ceo' },
    { title: 'Why I Use a Standing Desk on a Treadmill (Spoiler: I want to die)', url: 'digitalnomad.life' },
    { title: 'Show HN: I Made a To-Do App That Calls You Names', url: 'github.com/guiltware' },
    { title: 'Netscape Navigator 3.0: 4x slower, 2.5x more unappealing', url: 'x.com/typicalpedo' },
    { title: 'Porting DOOM to ______________', url: 'humangarbage.blog' },
    { title: 'HULAGHLAGHLAHGLAG 4.1.2 Now Available', url: 'ironic-press.pub' },
    { title: 'Ask HN: How do I explain to my spouse what a monad is?', url: '' },
    { title: '[flagged] Ask HN: Is HN becoming more toxic?', url: '' },
    { title: 'I Built a Kubernetes Cluster to Chase Rabbits out of my Garden', url: 'overengineered.dev' },
    { title: 'Can Blockchain Find Me A Wife?', url: 'web3fixes.eth' },
    { title: 'Why I Migrated from Microservices to a single 4x6 index card', url: 'cabin.woods' },
    { title: 'I Replaced PostgreSQL with a Small Hamster and Nobody Noticed', url: 'critter.lol' },
    { title: 'Why Every Developer Should Meditate (Thought Leader Edition)', url: 'mindfulcto.com' },
    { title: 'Functional Programming Stole My Lunch Money', url: 'purelyisolated.bs' },
  ];

  const HN_USERS = [
    'pg_disciple', 'rust_evangelist', '10x_ninja', 'blockchain_bro', 'vim_btw',
    'grug_brain_dev', 'yaml_warrior', 'docker_captain', 'sr_thought_leader',
    'lambda_monk', 'devrel_darling', 'standup_skipper', 'burnout_sensei',
    'monorepo_mike', 'microservice_mary', 'serverless_steve', 'agile_anarchist',
  ];

  function generateHNStories(): HNStory[] {
    if (hnStack.length === 0) {
      hnStack = [...HN_HEADLINES].sort(() => Math.random() - 0.5);
    }
    // Take up to 20 stories; the draw loop clips to what actually fits
    const page = hnStack.splice(0, 20);
    return page.map((h) => ({
      title: h.title,
      url: h.url,
      points: Math.floor(Math.random() * 900) + 10,
      user: HN_USERS[Math.floor(Math.random() * HN_USERS.length)],
      comments: Math.floor(Math.random() * 500),
      hours: Math.floor(Math.random() * 23) + 1,
    }));
  }

  // ── Calculator state ──
  let calcDisplay = '0';
  let calcActiveBtn = -1;
  let calcTimer = 0;
  let calcStepIdx = 0;
  let calcPhase: 'COMPUTING' | 'CLEARING' = 'COMPUTING';
  const CALC_STEP_INTERVAL = 800;

  // Sequence of button presses to reach 5318008
  // 5318008 = let's do: 5318008 directly by pressing digits
  // But more fun: do some operations that arrive at 5318008
  // 73 * 72839 + 161 = 5318008 + 161... let me just type it out as digits with some ops
  // Actually simplest: a few multiplications
  // 5318 * 1000 = 5318000, + 8 = 5318008
  // Sequence: 5, 3, 1, 8, ENTER, 1, 0, 0, 0, *, 8, +  -> shows 5318008
  // For RPN: 5318 ENTER 1000 * 8 +
  interface CalcStep {
    btn: string;
    display: string;
  }

  const CALC_SEQUENCES: CalcStep[][] = [
    // Sequence 1: 5318 ENTER 1000 * 8 +
    [
      { btn: 'C', display: '0' },
      { btn: '5', display: '5' },
      { btn: '3', display: '53' },
      { btn: '1', display: '531' },
      { btn: '8', display: '5318' },
      { btn: 'ENT', display: '5318' },
      { btn: '1', display: '1' },
      { btn: '0', display: '10' },
      { btn: '0', display: '100' },
      { btn: '0', display: '1000' },
      { btn: '×', display: '5318000' },
      { btn: '8', display: '8' },
      { btn: '+', display: '5318008' },
    ],
    // Keep it simple: just type the digits with some theatrics
    [
      { btn: 'C', display: '0' },
      { btn: '9', display: '9' },
      { btn: '9', display: '99' },
      { btn: '9', display: '999' },
      { btn: 'ENT', display: '999' },
      { btn: '5', display: '5' },
      { btn: '3', display: '53' },
      { btn: '1', display: '531' },
      { btn: '9', display: '5319' },
      { btn: 'ENT', display: '5319' },
      { btn: '×', display: '5313681' },
      { btn: '4', display: '4' },
      { btn: '3', display: '43' },
      { btn: '2', display: '432' },
      { btn: '7', display: '4327' },
      { btn: '+', display: '5318008' },
    ],
    // Sequence 3: straightforward digit entry
    [
      { btn: 'C', display: '0' },
      { btn: '5', display: '5' },
      { btn: '3', display: '53' },
      { btn: '1', display: '531' },
      { btn: '8', display: '5318' },
      { btn: '0', display: '53180' },
      { btn: '0', display: '531800' },
      { btn: '8', display: '5318008' },
    ],
  ];

  let currentCalcSeq = 0;

  const CALC_BUTTONS = [
    '7', '8', '9', '÷',
    '4', '5', '6', '×',
    '1', '2', '3', '-',
    '0', '.', 'ENT', '+',
    'C', '±', 'SWP', '←',
  ];

  // ── File Manager state ──
  let fmSelectedIdx = 0;
  let fmSelectTimer = 0;
  const FM_SELECT_INTERVAL = 3000;

  const FM_FILES = [
    { name: 'definitely_not_a_virus.exe', size: '4.2 MB', icon: '📄' },
    { name: 'passwords_FINAL_v3.txt', size: '12 KB', icon: '📝' },
    { name: 'todo_2003.txt', size: '847 B', icon: '📝' },
    { name: 'untitled-47.png', size: '2.1 MB', icon: '🖼️' },
    { name: 'New Folder (2) (copy)', size: '', icon: '📁' },
    { name: 'resume_REAL_THIS_ONE.doc', size: '89 KB', icon: '📄' },
    { name: '.hidden_secrets', size: '0 B', icon: '📄' },
    { name: 'enemies_list.xls', size: '340 KB', icon: '📊' },
    { name: 'screenshot_3847.png', size: '1.8 MB', icon: '🖼️' },
    { name: 'Untitled Document (47)', size: '0 B', icon: '📄' },
    { name: 'IMPORTANT_READ_ME!!!.txt', size: '3 B', icon: '📝' },
    { name: 'wonderwall.mp3', size: '7.2 MB', icon: '🎵' },
    { name: 'backup_of_backup.tar.gz', size: '94 MB', icon: '📦' },
    { name: 'missing_epstein_file.pdf', size: '203 KB', icon: '📄' },
    { name: '.bashrc.bak.bak.old', size: '4 KB', icon: '📄' },
    { name: 'cat_photos/', size: '', icon: '📁' },
    { name: 'core', size: '666 KB', icon: '⚙️' },
  ];

  // ── System Monitor state ──
  let sysmonCpu = 847;
  let sysmonCpuTarget = 847;
  let sysmonRam = -12;
  let sysmonRamTarget = -12;
  let sysmonUptime = 847 * 86400;
  let sysmonCpuHistory: number[] = [];
  const SYSMON_HISTORY = 40;

  // ── Text Editor state ──
  let editorText = '';
  let editorTimer = 0;
  let editorPoemIdx = 0;
  let editorCharIdx = 0;
  const EDITOR_CHAR_INTERVAL = 120;

  const EDITOR_POEMS = [
    `# README.md

## About This Project

I don't know what this does anymore.

## Installation

Good luck.

## Dependencies

Yes.

## Contributing

Please don't.

## License

Abandonware`,

    `EGGS
CHEESE
BUTTER
MILK
`,
`Sky over Lebanon.
Half moon light.
Watch the skies.
The ocean is ready.`,
`Reach for a Lucky instead of a sweet`,
`Buy War Bonds`,
`SAFETY FIRST
NO SMOKING
KEEP CLEAN
WORK SMART`,
`HAMBURGS
COFFEE
PIE
TOAST
SOUP
SANDWICH
COFFEE
PIE`,
`Don't pass cars
On curve or hill
If the cops
Don't get you
Grim Reaper will
Burma-Shave`,
`Loose Lips Sink Ships`,
`Klaatu barada nikto`,
`Visit Sunny California`,
`Eat at Joe's`,
    `Kilroy was here`,
    `Gone Fishing`,
    `War Is Peace
Freedom Is Slavery
Ignorance Is Strength
So it goes`,
    `
All Work And No Play Make Jack A Dull Boy
All Work And No Play Make Jack A Dull Boy
All Work And No Play Make Jack A Dull Boy
All Work And No Play Make Jack A Dull Boy
All Work And No Play Make Jack A Dull Boy
`,
    `choke me daddy`,
  ];

  // ── Email Client state ──
  interface EmailEntry {
    from: string;
    subject: string;
    date: string;
  }

  let emailSelectedIdx = 0;
  let emailSelectTimer = 0;
  const EMAIL_SELECT_INTERVAL = 2500;
  let emailRefreshTimer = 0;
  const EMAIL_REFRESH_INTERVAL = 20000;
  let emailGetMailFlash = 0;
  let emailStack: { from: string; subject: string }[] = [];
  let emailInbox: EmailEntry[] = [];

  const EMAIL_ENTRIES = [
    { from: 'Nigerian Prince', subject: 'Re: Re: Re: FWD: Urgent Business Proposal' },
    { from: 'IT Department', subject: 'Please Change Your Password (Final Warning #847)' },
    { from: 'Mom', subject: 'FWD: FWD: FWD: FWD: Cute Dog Pictures!!!!' },
    { from: 'Mailer Daemon', subject: 'Undeliverable: I Love You' },
    { from: 'LinkedIn', subject: '47 people viewed your profile (they all laughed)' },
    { from: 'Boss', subject: 'We Need To Talk (sent at 2:47 AM)' },
    { from: 'root@localhost', subject: 'CRON: /usr/bin/existential_crisis (midnight hour)' },
    { from: 'Amazon', subject: 'Your order of 47 rubber ducks has shipped' },
    { from: 'Clippy', subject: "It looks like you're watching a stupid screensaver. Need help?" },
    { from: 'jsmith@aol.com', subject: 'CHECK OUT THIS AMAZING WEBSITE (not a virus)' },
    { from: 'GitHub', subject: '[dependabot] 204,847,182 security vulnerabilities found' },
    { from: 'HR', subject: 'Mandatory Fun Event This Friday' },
    { from: 'Recruiter', subject: 'Exciting Opportunity at a Stealth Startup' },
    { from: 'sudo', subject: 'This incident will be reported' },
    { from: 'Grandma', subject: 'HOW DO I TURN OFF CAPS LOCK' },
    { from: 'Craig', subject: 'FREE COUCH (haunted)' },
    { from: 'no-reply@irs.gov.ru', subject: 'You Owe $47,000 Click Here Immediately' },
    { from: 'Slack', subject: 'You have 2,847 unread messages in #general' },
    { from: 'Past You', subject: 'TODO: fix this later (sent 2019)' },
    { from: 'Dominos', subject: "We miss you. It's been a 4 hours." },
    { from: 'Microsoft', subject: 'Your free trial of capitalism has expired' },
    { from: 'admin@geocities.com', subject: 'Your Homepage Has a New Guestbook Entry!' },
    { from: 'Jira', subject: '[PROJ-9999] Moved to backlog (again)' },
    { from: 'security@bank.com.ng', subject: 'Unusual Activity On Your Account (pls send SSN)' },
    { from: 'Docker', subject: 'Your container is 47GB. This is fine.' },
    { from: 'Wife', subject: 'We need to talk about your Steam purchases' },
    { from: 'Y Combinator', subject: 'Your Application: LOL' },
    { from: 'CVS Pharmacy', subject: 'Your receipt is ready (847 pages)' },
    { from: 'Netflix', subject: "Are you still watching? It's been 3 days" },
    { from: 'printer@office', subject: 'PC LOAD LETTER' },
    { from: 'Duolingo', subject: 'Japanese lesson reminder (Day 3 streak at risk)' },
    { from: 'God', subject: 'RE: Your prayers (Auto-reply: Out of Office)' },
    { from: 'Kubernetes', subject: 'Pod "feelings" CrashLoopBackOff' },
    { from: 'Dad', subject: 'How Do I Open PDF' },
    { from: 'Subway', subject: 'Congratulations! You earned a free 6-inch' },
    { from: 'npm', subject: '847 new vulnerabilities found in left-pad' },
  ];

  const EMAIL_DATES = [
    '2:47 PM', '11:03 AM', '9:15 AM', 'Yesterday', 'Yesterday',
    'Mon 3/3', 'Fri 2/28', 'Thu 2/27', 'Wed 2/19', 'Jan 14',
    'Dec 25', 'Nov 3', '10/31/03', '6/15/99',
  ];

  function generateEmailInbox(): EmailEntry[] {
    if (emailStack.length < 12) {
      emailStack = [...EMAIL_ENTRIES].sort(() => Math.random() - 0.5);
    }
    const page = emailStack.splice(0, 12);
    return page.map((e, i) => ({
      from: e.from,
      subject: e.subject,
      date: EMAIL_DATES[i % EMAIL_DATES.length],
    }));
  }

  // ── Balloon notification state ──
  interface BalloonNotif {
    title: string;
    body: string;
    age: number;       // ms since shown
    duration: number;  // total ms to display
  }

  let balloonNotif: BalloonNotif | null = null;
  let balloonTimer = 0;
  const BALLOON_INTERVAL = 15000;      // time between notifications
  const BALLOON_DURATION = 6000;       // how long each stays visible
  const BALLOON_FADE_TIME = 500;       // fade in/out duration
  let balloonStack: { title: string; body: string }[] = [];

  const BALLOON_MESSAGES = [
    { title: 'Windows Security', body: 'Your PC may be at risk, only God can judge us' },
    { title: 'Windows Update', body: 'Updates available (click to postpone for 847 days)' },
    { title: 'Low Disk Space', body: 'Your C: drive has -4 MB free. Good luck.' },
    { title: 'New Hardware Found', body: 'Windows found "Unknown Device" and has no idea what to do.' },
    { title: 'Printer', body: 'PC LOAD LETTER. What does that even mean?' },
    { title: 'Norton Antivirus', body: 'Subscription expired 6 years ago. You are unprotected.' },
    { title: 'Windows Messenger', body: 'You have 0 friends online' },
    { title: 'RealPlayer', body: 'Buffering' },
    { title: 'Battery Low', body: 'Your UPS battery is at 3%' },
    { title: 'Internet Explorer', body: 'Would you like to make IE your default browser? Too late, already did it' },
    { title: 'System Tray', body: 'Some icons are hidden. They are plotting against you.' },
    { title: 'Windows Activation', body: 'This copy of GNU/Linux is not genuine.' },
    { title: 'Disk Cleanup', body: 'You can free up 6TB by deleting your weird feet pics' },
    { title: 'Network', body: 'A network cable is unplugged. Or plugged in. We lost track.' },
    { title: 'Windows Firewall', body: 'Blocked an incoming connection from "your mom".' },
    { title: 'New Update', body: 'Restarting in 10 minutes whether you like it or not' },
    { title: 'AOL Instant Messenger', body: 'No New Friend Requests' },
  ];

  function nextBalloon(): { title: string; body: string } {
    if (balloonStack.length === 0) {
      balloonStack = [...BALLOON_MESSAGES].sort(() => Math.random() - 0.5);
    }
    return balloonStack.pop()!;
  }

  // ── Winamp/XMMS state ──
  let winampTrackTime = 0;
  let winampTrackDuration = 217;
  let winampMarqueeOffset = 0;
  const WINAMP_EQ_COUNT = 18;
  let winampEqBars: number[] = new Array(WINAMP_EQ_COUNT).fill(0.3);
  let winampEqTargets: number[] = new Array(WINAMP_EQ_COUNT).fill(0.3);
  let winampEqTimer = 0;
  const WINAMP_EQ_INTERVAL = 150;
  let winampTrackStack: string[] = [];
  let winampCurrentTrack = '';

  const WINAMP_TRACKS = [
    'Linkin_Park_-_In_The_End.mp3.exe',
    'Smash Mouth - All Star (128kbps).mp3',
    'System Of A Down - Chop Suey!.mp3',
    'Darude - Sandstorm.mp3',
    'Rick Astley - Never Gonna Give You Up.mp3',
    'blink-182 - All The Small Things.mp3',
    'Eminem_-_Lose_Yourself_FINAL_FINAL.mp3',
    'Limp Bizkit - Rollin (Air Raid Vehicle).mp3',
    'Crazy Frog - Axel F.mp3',
    'Evanescence - Bring Me To Life.mp3',
    'Nelly - Hot In Herre.mp3',
    'NOT_A_VIRUS_free_mp3_player.exe',
    'Nickelback - How You Remind Me.mp3',
    'Offspring - Pretty Fly For A White Guy.mp3',
    'Green Day - Basket Case (live bootleg).wma',
    'Metallica_-_Enter_Sandman_320kbps.mp3',
    'Britney Spears - Oops I Did It Again.mp3',
    'Weird Al - White And Nerdy.mp3',
    'Sum 41 - Fat Lip [EXPLICIT].mp3',
    'Red Hot Chili Peppers - Californication.mp3',
    'Gorillaz - Clint Eastwood (192kbps rip).mp3',
    'Black Eyed Peas - Where Is The Love.wma',
    '50 Cent - In Da Club.mp3.mp3.mp3',
    'The White Stripes - Seven Nation Army.mp3',
    'OutKast_Hey_Ya!_LimeWire_Download.mp3',
    'Bowling For Soup - 1985.mp3',
    'Simple Plan - Im Just A Kid.mp3',
    'Jimmy Eat World - The Middle.mp3',
    'Trapt - Headstrong.mp3',
    'Papa Roach - Last Resort (REMASTERED).mp3',
  ];

  function nextWinampTrack(): string {
    if (winampTrackStack.length === 0) {
      winampTrackStack = [...WINAMP_TRACKS].sort(() => Math.random() - 0.5);
    }
    return winampTrackStack.pop()!;
  }

  // ── Timing ──
  let lastTime = 0;

  // ── Window z-order focus timer ──
  let focusTimer = 0;
  const FOCUS_INTERVAL = 8000;

  // ── Drag animation state ──
  interface DragAnim {
    win: AppWindow;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    elapsed: number;
    duration: number;
  }
  let dragAnim: DragAnim | null = null;
  const DRAG_DURATION = 600; // ms
  const DRAG_GHOST_COUNT = 6; // number of outline ghosts along the path

  // ── Layout computation ──
  function computeLayout() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;

    baseFontSize = Math.max(10, Math.min(14, Math.floor(height / 60)));
    lineH = Math.floor(baseFontSize * 1.4);

    const usableH = height - TASKBAR_HEIGHT;
    const margin = 20;

    // Lay out windows with some overlap and randomization
    const rng = () => Math.floor(Math.random() * 30) - 15;

    windows = [
      // Terminal — top left
      makeTerminalWindow(
        margin + rng(), margin + rng(),
        Math.floor(width * 0.38), Math.floor(usableH * 0.48)
      ),
      // Hacker Newz — top right
      makeHackerNewzWindow(
        Math.floor(width * 0.35) + rng(), margin + 10 + rng(),
        Math.floor(width * 0.42), Math.floor(usableH * 0.52)
      ),
      // File Manager — middle left
      makeFileManagerWindow(
        margin + 40 + rng(), Math.floor(usableH * 0.32) + rng(),
        Math.floor(width * 0.30), Math.floor(usableH * 0.45)
      ),
      // System Monitor — bottom right-ish
      makeSysmonWindow(
        Math.floor(width * 0.55) + rng(), Math.floor(usableH * 0.35) + rng(),
        Math.floor(width * 0.30), Math.floor(usableH * 0.38)
      ),
      // Text Editor — center-left
      makeEditorWindow(
        Math.floor(width * 0.15) + rng(), Math.floor(usableH * 0.25) + rng(),
        Math.floor(width * 0.35), Math.floor(usableH * 0.45)
      ),
      // XMMS / Winamp — lower left
      makeWinampWindow(
        Math.floor(width * 0.05) + rng(), Math.floor(usableH * 0.50) + rng(),
        Math.min(280, Math.floor(width * 0.22)), Math.min(200, Math.floor(usableH * 0.22))
      ),
      // Email Client — center
      makeEmailWindow(
        Math.floor(width * 0.25) + rng(), Math.floor(usableH * 0.18) + rng(),
        Math.floor(width * 0.40), Math.floor(usableH * 0.42)
      ),
      // Calculator — bottom right
      makeCalculatorWindow(
        Math.floor(width * 0.68) + rng(), Math.floor(usableH * 0.15) + rng(),
        Math.min(240, Math.floor(width * 0.18)), Math.min(320, Math.floor(usableH * 0.55))
      ),
    ];

    // Mark one as active
    windows[windows.length - 1].active = true;

    // Desktop icons
    desktopIcons = [
      { x: width - 80, y: 20, label: 'Trash', emoji: '🗑️' },
      { x: width - 80, y: 100, label: 'My Computer', emoji: '🖥️' },
      { x: width - 80, y: 180, label: 'secret_plans', emoji: '📄' },
      { x: 20, y: usableH - 80, label: 'cat_photos', emoji: '📁' },
      { x: 20, y: usableH - 160, label: 'games', emoji: '🎮' },
    ];
  }

  // ── Window chrome drawing ──
  function drawWindowChrome(win: AppWindow) {
    if (!ctx) return;

    // Drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(win.x + 4, win.y + 4, win.w, win.h);

    // Window border - raised 3D effect
    ctx.fillStyle = WIN_BG;
    ctx.fillRect(win.x, win.y, win.w, win.h);

    // Outer highlight (top-left light, bottom-right dark)
    ctx.strokeStyle = WIN_BORDER_LIGHT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(win.x, win.y + win.h);
    ctx.lineTo(win.x, win.y);
    ctx.lineTo(win.x + win.w, win.y);
    ctx.stroke();

    ctx.strokeStyle = WIN_BORDER_DARKER;
    ctx.beginPath();
    ctx.moveTo(win.x + win.w, win.y);
    ctx.lineTo(win.x + win.w, win.y + win.h);
    ctx.lineTo(win.x, win.y + win.h);
    ctx.stroke();

    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.beginPath();
    ctx.moveTo(win.x + win.w - 1, win.y + 1);
    ctx.lineTo(win.x + win.w - 1, win.y + win.h - 1);
    ctx.lineTo(win.x + 1, win.y + win.h - 1);
    ctx.stroke();

    // Title bar
    const titleH = 20;
    const titleColor = win.active ? WIN_TITLE_ACTIVE : WIN_TITLE_INACTIVE;

    // Title bar gradient
    const grad = ctx.createLinearGradient(win.x + 2, 0, win.x + win.w - 4, 0);
    grad.addColorStop(0, titleColor);
    grad.addColorStop(1, win.active ? '#1084D0' : '#B0B0B0');
    ctx.fillStyle = grad;
    ctx.fillRect(win.x + 2, win.y + 2, win.w - 4, titleH);

    // Title text
    ctx.fillStyle = WIN_TITLE_TEXT;
    ctx.font = `bold ${baseFontSize}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(win.title, win.x + (win.buttonsReversed ? 54 : 6), win.y + 2 + titleH / 2);

    // Window buttons (close, maximize, minimize)
    const btnSize = 14;
    const btnY = win.y + 4;
    let closeX: number, maxX: number, minX: number;

    if (win.buttonsReversed) {
      // Linux-style: buttons on left
      closeX = win.x + 6;
      maxX = win.x + 6 + btnSize + 3;
      minX = win.x + 6 + (btnSize + 3) * 2;
    } else {
      // Windows-style: buttons on right
      closeX = win.x + win.w - btnSize - 6;
      maxX = win.x + win.w - (btnSize + 3) * 2 - 3;
      minX = win.x + win.w - (btnSize + 3) * 3 - 3;
    }

    // Draw buttons with 3D raised effect
    for (const bx of [minX, maxX, closeX]) {
      ctx.fillStyle = WIN_BG;
      ctx.fillRect(bx, btnY, btnSize, btnSize);
      ctx.strokeStyle = WIN_BORDER_LIGHT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, btnY + btnSize);
      ctx.lineTo(bx, btnY);
      ctx.lineTo(bx + btnSize, btnY);
      ctx.stroke();
      ctx.strokeStyle = WIN_BORDER_DARKER;
      ctx.beginPath();
      ctx.moveTo(bx + btnSize, btnY);
      ctx.lineTo(bx + btnSize, btnY + btnSize);
      ctx.lineTo(bx, btnY + btnSize);
      ctx.stroke();
    }

    // Button icons
    ctx.strokeStyle = TEXT_BLACK;
    ctx.lineWidth = 1.5;
    // Close X
    ctx.beginPath();
    ctx.moveTo(closeX + 3, btnY + 3);
    ctx.lineTo(closeX + btnSize - 3, btnY + btnSize - 3);
    ctx.moveTo(closeX + btnSize - 3, btnY + 3);
    ctx.lineTo(closeX + 3, btnY + btnSize - 3);
    ctx.stroke();

    // Maximize □
    ctx.strokeStyle = TEXT_BLACK;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(maxX + 3, maxY(btnY), btnSize - 6, btnSize - 6);

    // Minimize _
    ctx.beginPath();
    ctx.moveTo(minX + 3, btnY + btnSize - 4);
    ctx.lineTo(minX + btnSize - 3, btnY + btnSize - 4);
    ctx.stroke();
  }

  function maxY(btnY: number): number {
    return btnY + 3;
  }

  function contentArea(win: AppWindow): { x: number; y: number; w: number; h: number } {
    return {
      x: win.x + 3,
      y: win.y + 24,
      w: win.w - 6,
      h: win.h - 27,
    };
  }

  // ── Terminal window ──
  function makeTerminalWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'xterm - bash',
      active: false,
      buttonsReversed: true,
      draw: drawTerminal,
      update: updateTerminal,
    };
  }

  function nextTermMessage(): string {
    if (termStack.length === 0) {
      termStack = [...TERM_MESSAGES].sort(() => Math.random() - 0.5);
    }
    return termStack.pop()!;
  }

  function updateTerminal(_win: AppWindow, dt: number) {
    termTimer += dt;
    if (termTimer >= TERM_LINE_INTERVAL) {
      termTimer -= TERM_LINE_INTERVAL;
      termLines.push(nextTermMessage());
      if (termLines.length > MAX_TERM_LINES) termLines.shift();
    }
  }

  function drawTerminal(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    // Black background
    ctx.fillStyle = TERM_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Clip to content
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, c.y, c.w, c.h);
    ctx.clip();

    ctx.font = `${baseFontSize - 1}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = TERM_GREEN;

    const visibleLines = Math.floor(c.h / lineH);
    const startIdx = Math.max(0, termLines.length - visibleLines);

    for (let i = startIdx; i < termLines.length; i++) {
      const drawY = c.y + 4 + (i - startIdx) * lineH;
      ctx.fillText(termLines[i], c.x + 4, drawY, c.w - 8);
    }

    // Blinking cursor
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const cursorY = c.y + 4 + (termLines.length - startIdx) * lineH;
      ctx.fillStyle = TERM_GREEN;
      ctx.fillText('$ █', c.x + 4, cursorY);
    }

    ctx.restore();
  }

  // ── Hacker Newz window ──
  function makeHackerNewzWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'Hacker Newzzzzzzzz',
      active: false,
      buttonsReversed: false,
      draw: drawHackerNewz,
      update: updateHackerNewz,
    };
  }

  function updateHackerNewz(_win: AppWindow, dt: number) {
    hnRefreshTimer += dt;
    if (hnRefreshTimer >= HN_REFRESH_INTERVAL || hnStories.length === 0) {
      hnRefreshTimer = 0;
      hnStories = generateHNStories();
    }
  }

  function drawHackerNewz(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    // HN background
    ctx.fillStyle = HN_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Orange header bar
    const headerH = 22;
    ctx.fillStyle = HN_ORANGE;
    ctx.fillRect(c.x, c.y, c.w, headerH);

    ctx.font = `bold ${baseFontSize}px "Verdana", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('Y', c.x + 4, c.y + headerH / 2);
    ctx.font = `bold ${baseFontSize - 1}px "Verdana", "Arial", sans-serif`;
    ctx.fillText('  Hacker Newz', c.x + 18, c.y + headerH / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${baseFontSize - 2}px "Verdana", "Arial", sans-serif`;
    ctx.fillText('new | past | comments | ask | show | jobs | submit', c.x + 140, c.y + headerH / 2);

    // Clip to content area below header
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, c.y + headerH, c.w, c.h - headerH);
    ctx.clip();

    const storyH = Math.floor(lineH * 2.6);
    const startY = c.y + headerH + 8;

    for (let i = 0; i < hnStories.length; i++) {
      const story = hnStories[i];
      const sy = startY + i * storyH;

      if (sy + storyH > c.y + c.h) break;

      // Rank number
      ctx.font = `${baseFontSize - 1}px "Verdana", "Arial", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = HN_SUBTEXT;
      ctx.fillText(`${i + 1}.`, c.x + 4, sy);

      // Title
      ctx.font = `${baseFontSize - 1}px "Verdana", "Arial", sans-serif`;
      ctx.fillStyle = HN_TITLE_COLOR;
      ctx.fillText(story.title, c.x + 28, sy, c.w - 40);

      // URL domain
      if (story.url) {
        ctx.fillStyle = HN_SUBTEXT;
        ctx.font = `${baseFontSize - 3}px "Verdana", "Arial", sans-serif`;
        ctx.fillText(`(${story.url})`, c.x + 28, sy + lineH);
      }

      // Subtext line
      ctx.fillStyle = HN_SUBTEXT;
      ctx.font = `${baseFontSize - 3}px "Verdana", "Arial", sans-serif`;
      const sub = `${story.points} points by ${story.user} ${story.hours} hours ago | ${story.comments} comments`;
      ctx.fillText(sub, c.x + 28, sy + lineH + (story.url ? lineH * 0.75 : 0));
    }

    ctx.restore();
  }

  // ── Calculator window ──
  function makeCalculatorWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'RPN Calc',
      active: false,
      buttonsReversed: true,
      draw: drawCalculator,
      update: updateCalculator,
    };
  }

  function updateCalculator(_win: AppWindow, dt: number) {
    calcTimer += dt;
    const seq = CALC_SEQUENCES[currentCalcSeq];

    if (calcPhase === 'COMPUTING') {
      if (calcTimer >= CALC_STEP_INTERVAL) {
        calcTimer = 0;
        if (calcStepIdx < seq.length) {
          const step = seq[calcStepIdx];
          calcActiveBtn = CALC_BUTTONS.indexOf(step.btn);
          calcDisplay = step.display;
          calcStepIdx++;
        } else {
          // Done computing — move to clearing phase
          calcPhase = 'CLEARING';
          calcActiveBtn = -1;
          calcTimer = 0;
        }
      }
    } else if (calcPhase === 'CLEARING') {
      if (calcTimer >= 1500) {
        calcDisplay = '0';
        calcStepIdx = 0;
        calcActiveBtn = -1;
        calcPhase = 'COMPUTING';
        calcTimer = 0;
        currentCalcSeq = (currentCalcSeq + 1) % CALC_SEQUENCES.length;
      }
    }
  }

  function drawCalculator(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    ctx.fillStyle = CALC_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    const pad = 6;
    const displayH = 36;

    // Display
    ctx.fillStyle = CALC_DISPLAY_BG;
    ctx.fillRect(c.x + pad, c.y + pad, c.w - pad * 2, displayH);

    // Sunken border on display
    ctx.strokeStyle = WIN_BORDER_DARKER;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + pad, c.y + pad + displayH);
    ctx.lineTo(c.x + pad, c.y + pad);
    ctx.lineTo(c.x + c.w - pad, c.y + pad);
    ctx.stroke();
    ctx.strokeStyle = WIN_BORDER_LIGHT;
    ctx.beginPath();
    ctx.moveTo(c.x + c.w - pad, c.y + pad);
    ctx.lineTo(c.x + c.w - pad, c.y + pad + displayH);
    ctx.lineTo(c.x + pad, c.y + pad + displayH);
    ctx.stroke();

    // Display text
    ctx.font = `bold 22px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillStyle = CALC_DISPLAY_TEXT;
    ctx.fillText(calcDisplay, c.x + c.w - pad - 6, c.y + pad + displayH / 2);
    ctx.textAlign = 'left';

    // "RPN" label
    ctx.font = `${baseFontSize - 3}px "Arial", sans-serif`;
    ctx.fillStyle = '#666666';
    ctx.textBaseline = 'top';
    ctx.fillText('RPN', c.x + pad + 4, c.y + pad + 3);

    // Buttons grid
    const btnAreaY = c.y + pad + displayH + pad;
    const btnAreaH = c.h - displayH - pad * 3;
    const cols = 4;
    const rows = 5;
    const btnGap = 3;
    const btnW = Math.floor((c.w - pad * 2 - btnGap * (cols - 1)) / cols);
    const btnH = Math.floor((btnAreaH - btnGap * (rows - 1)) / rows);

    for (let i = 0; i < CALC_BUTTONS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = c.x + pad + col * (btnW + btnGap);
      const by = btnAreaY + row * (btnH + btnGap);

      const isActive = i === calcActiveBtn;
      const isOp = ['÷', '×', '-', '+', 'ENT', 'C', '±', 'SWP', '←'].includes(CALC_BUTTONS[i]);

      // Button face
      if (isActive) {
        // Pressed state — sunken
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(bx, by, btnW, btnH);
        ctx.strokeStyle = WIN_BORDER_DARKER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by + btnH);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + btnW, by);
        ctx.stroke();
        ctx.strokeStyle = WIN_BORDER_LIGHT;
        ctx.beginPath();
        ctx.moveTo(bx + btnW, by);
        ctx.lineTo(bx + btnW, by + btnH);
        ctx.lineTo(bx, by + btnH);
        ctx.stroke();
      } else {
        // Normal raised state
        ctx.fillStyle = isOp ? '#D0D0D0' : CALC_BTN_BG;
        ctx.fillRect(bx, by, btnW, btnH);
        ctx.strokeStyle = WIN_BORDER_LIGHT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by + btnH);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + btnW, by);
        ctx.stroke();
        ctx.strokeStyle = WIN_BORDER_DARKER;
        ctx.beginPath();
        ctx.moveTo(bx + btnW, by);
        ctx.lineTo(bx + btnW, by + btnH);
        ctx.lineTo(bx, by + btnH);
        ctx.stroke();
      }

      // Button label
      ctx.font = `bold ${baseFontSize}px "Arial", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_BLACK;
      ctx.fillText(CALC_BUTTONS[i], bx + btnW / 2, by + btnH / 2);
      ctx.textAlign = 'left';
    }
  }

  // ── File Manager window ──
  function makeFileManagerWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'File Manager - ~/Documents',
      active: false,
      buttonsReversed: false,
      draw: drawFileManager,
      update: updateFileManager,
    };
  }

  function updateFileManager(_win: AppWindow, dt: number) {
    fmSelectTimer += dt;
    if (fmSelectTimer >= FM_SELECT_INTERVAL) {
      fmSelectTimer = 0;
      fmSelectedIdx = Math.floor(Math.random() * FM_FILES.length);
    }
  }

  function drawFileManager(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    ctx.fillStyle = FILEMGR_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Toolbar
    const toolH = 20;
    ctx.fillStyle = WIN_BG;
    ctx.fillRect(c.x, c.y, c.w, toolH);
    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('  File  Edit  View  Help', c.x + 2, c.y + toolH / 2);

    // Separator
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + toolH);
    ctx.lineTo(c.x + c.w, c.y + toolH);
    ctx.stroke();

    // Address bar
    const addrH = 18;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(c.x + 4, c.y + toolH + 2, c.w - 8, addrH);
    ctx.strokeStyle = WIN_BORDER_DARKER;
    ctx.strokeRect(c.x + 4, c.y + toolH + 2, c.w - 8, addrH);
    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('/home/user/Documents/', c.x + 8, c.y + toolH + 2 + addrH / 2);

    // Column headers
    const listY = c.y + toolH + addrH + 6;
    const headerH = 16;
    ctx.fillStyle = WIN_BG;
    ctx.fillRect(c.x, listY, c.w, headerH);
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.beginPath();
    ctx.moveTo(c.x, listY + headerH);
    ctx.lineTo(c.x + c.w, listY + headerH);
    ctx.stroke();

    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('  Name', c.x + 4, listY + headerH / 2);
    ctx.fillText('Size', c.x + c.w - 70, listY + headerH / 2);

    // File list
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, listY + headerH, c.w, c.h - (listY + headerH - c.y));
    ctx.clip();

    const rowH = lineH;
    for (let i = 0; i < FM_FILES.length; i++) {
      const ry = listY + headerH + 2 + i * rowH;
      if (ry > c.y + c.h) break;

      if (i === fmSelectedIdx) {
        ctx.fillStyle = FILEMGR_SELECT;
        ctx.fillRect(c.x + 1, ry, c.w - 2, rowH);
        ctx.fillStyle = FILEMGR_SELECT_TEXT;
      } else {
        ctx.fillStyle = TEXT_BLACK;
      }

      ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(`${FM_FILES[i].icon} ${FM_FILES[i].name}`, c.x + 6, ry + 2, c.w - 90);
      ctx.fillText(FM_FILES[i].size, c.x + c.w - 70, ry + 2);
    }

    ctx.restore();
  }

  // ── System Monitor window ──
  function makeSysmonWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'System Monitor',
      active: false,
      buttonsReversed: true,
      draw: drawSysmon,
      update: updateSysmon,
    };
  }

  function updateSysmon(_win: AppWindow, dt: number) {
    // Jitter toward targets
    sysmonCpu += (sysmonCpuTarget - sysmonCpu) * 0.01 + (Math.random() - 0.5) * 20;
    sysmonRam += (sysmonRamTarget - sysmonRam) * 0.01 + (Math.random() - 0.5) * 5;

    // Occasionally shift targets
    if (Math.random() < 0.005) {
      sysmonCpuTarget = 200 + Math.random() * 900;
    }
    if (Math.random() < 0.005) {
      sysmonRamTarget = -50 + Math.random() * 30;
    }

    sysmonUptime += dt / 1000;

    // CPU history
    sysmonCpuHistory.push(sysmonCpu);
    if (sysmonCpuHistory.length > SYSMON_HISTORY) sysmonCpuHistory.shift();
  }

  function drawSysmon(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    ctx.fillStyle = SYSMON_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    const pad = 8;
    let curY = c.y + pad;

    ctx.font = `bold ${baseFontSize - 1}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';

    // CPU
    ctx.fillStyle = SYSMON_GREEN;
    ctx.fillText(`CPU: ${Math.round(sysmonCpu)}%`, c.x + pad, curY);
    curY += lineH;

    // CPU bar
    const barW = c.w - pad * 2;
    const barH = 12;
    ctx.fillStyle = '#333333';
    ctx.fillRect(c.x + pad, curY, barW, barH);
    const cpuFill = Math.min(1, sysmonCpu / 1000);
    ctx.fillStyle = sysmonCpu > 500 ? SYSMON_RED : sysmonCpu > 200 ? SYSMON_YELLOW : SYSMON_GREEN;
    ctx.fillRect(c.x + pad, curY, barW * cpuFill, barH);
    curY += barH + 8;

    // Mini CPU graph
    const graphH = Math.min(50, Math.floor((c.h - 140) / 2));
    ctx.fillStyle = '#111111';
    ctx.fillRect(c.x + pad, curY, barW, graphH);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + pad, curY, barW, graphH);

    if (sysmonCpuHistory.length > 1) {
      ctx.strokeStyle = SYSMON_GREEN;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < sysmonCpuHistory.length; i++) {
        const hx = c.x + pad + (barW * i) / SYSMON_HISTORY;
        const normalized = Math.min(1, sysmonCpuHistory[i] / 1000);
        const hy = curY + graphH - graphH * normalized;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.stroke();
    }
    curY += graphH + 8;

    // RAM
    ctx.fillStyle = SYSMON_YELLOW;
    ctx.font = `bold ${baseFontSize - 1}px "Courier New", Courier, monospace`;
    ctx.fillText(`RAM: ${Math.round(sysmonRam)} MB free`, c.x + pad, curY);
    curY += lineH;

    // RAM bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(c.x + pad, curY, barW, barH);
    ctx.fillStyle = SYSMON_RED;
    ctx.fillRect(c.x + pad, curY, barW * 0.98, barH);
    curY += barH + 12;

    // Uptime
    const days = Math.floor(sysmonUptime / 86400);
    const hours = Math.floor((sysmonUptime % 86400) / 3600);
    const mins = Math.floor((sysmonUptime % 3600) / 60);
    ctx.fillStyle = SYSMON_TEXT;
    ctx.font = `${baseFontSize - 2}px "Courier New", Courier, monospace`;
    ctx.fillText(`Uptime: ${days}d ${hours}h ${mins}m`, c.x + pad, curY);
    curY += lineH;

    // Misc stats
    ctx.fillText(`Processes: ${Math.floor(3847 + Math.random() * 10)}`, c.x + pad, curY);
    curY += lineH;
    ctx.fillText(`Temp: ${(98.6 + Math.random() * 0.4).toFixed(1)}°F`, c.x + pad, curY);
    curY += lineH;
    ctx.fillStyle = SYSMON_RED;
    ctx.fillText(`Swap: ∞ / ∞`, c.x + pad, curY);
  }

  // ── Text Editor window ──
  function makeEditorWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'Untitled - Text Editor',
      active: false,
      buttonsReversed: false,
      draw: drawEditor,
      update: updateEditor,
    };
  }

  function updateEditor(_win: AppWindow, dt: number) {
    editorTimer += dt;
    if (editorTimer >= EDITOR_CHAR_INTERVAL) {
      editorTimer -= EDITOR_CHAR_INTERVAL;
      const poem = EDITOR_POEMS[editorPoemIdx];
      if (editorCharIdx < poem.length) {
        editorText += poem[editorCharIdx];
        editorCharIdx++;
      } else {
        // Pause at the end, then move to next poem
        if (editorCharIdx >= poem.length + 60) {
          editorPoemIdx = (editorPoemIdx + 1) % EDITOR_POEMS.length;
          editorCharIdx = 0;
          editorText = '';
          editorTimer = 0;
        } else {
          editorCharIdx++;
        }
      }
    }
  }

  function drawEditor(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    // Menu bar
    const menuH = 18;
    ctx.fillStyle = WIN_BG;
    ctx.fillRect(c.x, c.y, c.w, menuH);
    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('  File  Edit  Format  View  Help', c.x + 2, c.y + menuH / 2);

    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + menuH);
    ctx.lineTo(c.x + c.w, c.y + menuH);
    ctx.stroke();

    // Editor area
    ctx.fillStyle = EDITOR_BG;
    ctx.fillRect(c.x, c.y + menuH + 1, c.w, c.h - menuH - 1);

    // Clip
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x + 2, c.y + menuH + 2, c.w - 4, c.h - menuH - 4);
    ctx.clip();

    ctx.font = `${baseFontSize - 1}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = EDITOR_TEXT;

    // Word wrap and draw
    const maxChars = Math.floor((c.w - 16) / (baseFontSize * 0.6));
    const lines = wrapText(editorText, maxChars);
    const visibleLines = Math.floor((c.h - menuH - 8) / lineH);
    const startLine = Math.max(0, lines.length - visibleLines);

    for (let i = startLine; i < lines.length; i++) {
      ctx.fillText(lines[i], c.x + 6, c.y + menuH + 4 + (i - startLine) * lineH);
    }

    // Blinking cursor
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const cursorLine = lines.length - 1;
      const cursorCol = lines.length > 0 ? lines[cursorLine - startLine]?.length || 0 : 0;
      const cursorX = c.x + 6 + cursorCol * (baseFontSize * 0.6);
      const cursorY = c.y + menuH + 4 + (Math.min(cursorLine, visibleLines - 1)) * lineH;
      ctx.fillStyle = EDITOR_CURSOR;
      ctx.fillRect(cursorX, cursorY, 2, lineH);
    }

    ctx.restore();
  }

  function wrapText(text: string, maxChars: number): string[] {
    const result: string[] = [];
    const paragraphs = text.split('\n');
    for (const para of paragraphs) {
      if (para.length <= maxChars) {
        result.push(para);
      } else {
        let remaining = para;
        while (remaining.length > maxChars) {
          let breakAt = remaining.lastIndexOf(' ', maxChars);
          if (breakAt <= 0) breakAt = maxChars;
          result.push(remaining.slice(0, breakAt));
          remaining = remaining.slice(breakAt + 1);
        }
        result.push(remaining);
      }
    }
    return result;
  }

  // ── Winamp/XMMS window ──
  function makeWinampWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'XMMS',
      active: false,
      buttonsReversed: true,
      draw: drawWinamp,
      update: updateWinamp,
    };
  }

  function updateWinamp(_win: AppWindow, dt: number) {
    // Advance track time
    winampTrackTime += dt / 1000;
    if (winampTrackTime >= winampTrackDuration) {
      winampCurrentTrack = nextWinampTrack();
      winampTrackTime = 0;
      winampTrackDuration = 180 + Math.random() * 120;
      winampMarqueeOffset = 0;
    }

    // Scroll marquee
    winampMarqueeOffset += dt * 0.04;

    // Update EQ bars
    winampEqTimer += dt;
    if (winampEqTimer >= WINAMP_EQ_INTERVAL) {
      winampEqTimer = 0;
      for (let i = 0; i < WINAMP_EQ_COUNT; i++) {
        winampEqTargets[i] = 0.1 + Math.random() * 0.9;
      }
    }
    // Lerp bars toward targets
    for (let i = 0; i < WINAMP_EQ_COUNT; i++) {
      winampEqBars[i] += (winampEqTargets[i] - winampEqBars[i]) * 0.15;
    }
  }

  function drawWinamp(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    // Dark background
    ctx.fillStyle = WINAMP_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    const pad = 4;

    // ── Display area (top section) ──
    const displayH = 52;
    ctx.fillStyle = WINAMP_DISPLAY_BG;
    ctx.fillRect(c.x + pad, c.y + pad, c.w - pad * 2, displayH);

    // Sunken border on display
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + pad, c.y + pad + displayH);
    ctx.lineTo(c.x + pad, c.y + pad);
    ctx.lineTo(c.x + c.w - pad, c.y + pad);
    ctx.stroke();
    ctx.strokeStyle = '#444444';
    ctx.beginPath();
    ctx.moveTo(c.x + c.w - pad, c.y + pad);
    ctx.lineTo(c.x + c.w - pad, c.y + pad + displayH);
    ctx.lineTo(c.x + pad, c.y + pad + displayH);
    ctx.stroke();

    // Clip inside display for marquee
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x + pad + 2, c.y + pad + 2, c.w - pad * 2 - 4, displayH - 4);
    ctx.clip();

    // Scrolling title marquee
    ctx.font = `bold ${baseFontSize}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = WINAMP_TEXT;
    const titleStr = winampCurrentTrack + '   ***   ';
    const titleWidth = ctx.measureText(titleStr).width;
    const marqueeX = c.x + pad + 4 - (winampMarqueeOffset % titleWidth);
    // Draw twice for seamless loop
    ctx.fillText(titleStr, marqueeX, c.y + pad + 4);
    ctx.fillText(titleStr, marqueeX + titleWidth, c.y + pad + 4);

    ctx.restore();

    // Track time
    const elapsed = Math.floor(winampTrackTime);
    const total = Math.floor(winampTrackDuration);
    const timeStr = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')} / ${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
    ctx.font = `${baseFontSize - 2}px "Courier New", Courier, monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = WINAMP_TEXT;
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, c.x + c.w - pad - 4, c.y + pad + 22);
    ctx.textAlign = 'left';

    // Bitrate info
    ctx.fillStyle = '#008800';
    ctx.font = `${baseFontSize - 3}px "Courier New", Courier, monospace`;
    ctx.fillText('128kbps  44kHz  stereo', c.x + pad + 4, c.y + pad + displayH - 16);

    // ── Equalizer bars ──
    const eqY = c.y + pad + displayH + 6;
    const eqAreaH = c.h - displayH - 56 - pad * 2;
    const barGap = 2;
    const totalBarWidth = c.w - pad * 2;
    const barW = Math.floor((totalBarWidth - barGap * (WINAMP_EQ_COUNT - 1)) / WINAMP_EQ_COUNT);
    const segH = 3;

    for (let i = 0; i < WINAMP_EQ_COUNT; i++) {
      const bx = c.x + pad + i * (barW + barGap);
      const barHeight = Math.floor(eqAreaH * winampEqBars[i]);
      const segments = Math.floor(barHeight / (segH + 1));
      const totalSegments = Math.floor(eqAreaH / (segH + 1));

      for (let s = 0; s < segments; s++) {
        const sy = eqY + eqAreaH - (s + 1) * (segH + 1);
        const ratio = s / totalSegments;
        if (ratio > 0.75) {
          ctx.fillStyle = WINAMP_EQ_RED;
        } else if (ratio > 0.45) {
          ctx.fillStyle = WINAMP_EQ_YELLOW;
        } else {
          ctx.fillStyle = WINAMP_EQ_GREEN;
        }
        ctx.fillRect(bx, sy, barW, segH);
      }
    }

    // ── Transport controls ──
    const transportY = c.y + c.h - 42;
    const transportH = 22;
    const buttons = ['⏮', '◀', '▶', '⏸', '⏹', '⏭'];
    const btnW = Math.floor((c.w - pad * 2 - 4 * (buttons.length - 1)) / buttons.length);

    for (let i = 0; i < buttons.length; i++) {
      const bx = c.x + pad + i * (btnW + 4);
      const isPlay = i === 2;

      if (isPlay) {
        // Pressed/sunken — currently playing
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(bx, transportY, btnW, transportH);
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, transportY + transportH);
        ctx.lineTo(bx, transportY);
        ctx.lineTo(bx + btnW, transportY);
        ctx.stroke();
        ctx.strokeStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(bx + btnW, transportY);
        ctx.lineTo(bx + btnW, transportY + transportH);
        ctx.lineTo(bx, transportY + transportH);
        ctx.stroke();
      } else {
        // Normal raised
        ctx.fillStyle = WINAMP_BTN_BG;
        ctx.fillRect(bx, transportY, btnW, transportH);
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, transportY + transportH);
        ctx.lineTo(bx, transportY);
        ctx.lineTo(bx + btnW, transportY);
        ctx.stroke();
        ctx.strokeStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.moveTo(bx + btnW, transportY);
        ctx.lineTo(bx + btnW, transportY + transportH);
        ctx.lineTo(bx, transportY + transportH);
        ctx.stroke();
      }

      ctx.font = `${baseFontSize - 1}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillStyle = isPlay ? WINAMP_TEXT : '#CCCCCC';
      ctx.fillText(buttons[i], bx + btnW / 2, transportY + transportH / 2);
      ctx.textAlign = 'left';
    }

    // ── Progress bar ──
    const progY = transportY + transportH + 4;
    const progH = 6;
    ctx.fillStyle = '#111111';
    ctx.fillRect(c.x + pad, progY, c.w - pad * 2, progH);
    const progFill = winampTrackDuration > 0 ? winampTrackTime / winampTrackDuration : 0;
    ctx.fillStyle = WINAMP_TEXT;
    ctx.fillRect(c.x + pad, progY, (c.w - pad * 2) * progFill, progH);
  }

  // ── Email Client window ──
  function makeEmailWindow(x: number, y: number, w: number, h: number): AppWindow {
    return {
      x, y, w, h,
      title: 'Langstrumpf Mail - Inbox (847)',
      active: false,
      buttonsReversed: false,
      draw: drawEmail,
      update: updateEmail,
    };
  }

  function updateEmail(_win: AppWindow, dt: number) {
    emailSelectTimer += dt;
    if (emailSelectTimer >= EMAIL_SELECT_INTERVAL) {
      emailSelectTimer = 0;
      emailSelectedIdx = Math.floor(Math.random() * emailInbox.length);
    }

    emailRefreshTimer += dt;
    if (emailRefreshTimer >= EMAIL_REFRESH_INTERVAL || emailInbox.length === 0) {
      emailRefreshTimer = 0;
      emailGetMailFlash = 400;
      emailInbox = generateEmailInbox();
    }

    if (emailGetMailFlash > 0) {
      emailGetMailFlash -= dt;
    }
  }

  const EMAIL_TOOLBAR_BUTTONS = ['Get New Mail', 'Reply', 'Delete', 'Forward', 'Print'];

  function drawEmail(win: AppWindow, _now: number) {
    if (!ctx) return;
    const c = contentArea(win);

    ctx.fillStyle = EMAIL_BG;
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Toolbar
    const toolH = 26;
    ctx.fillStyle = WIN_BG;
    ctx.fillRect(c.x, c.y, c.w, toolH);

    // Toolbar buttons
    let tbX = c.x + 4;
    const tbY = c.y + 3;
    const tbH = 20;
    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < EMAIL_TOOLBAR_BUTTONS.length; i++) {
      const label = EMAIL_TOOLBAR_BUTTONS[i];
      const tbW = ctx.measureText(label).width + 12;
      const isFlashing = i === 0 && emailGetMailFlash > 0;

      if (isFlashing) {
        // Pressed/sunken state
        ctx.fillStyle = '#A0A0A0';
        ctx.fillRect(tbX, tbY, tbW, tbH);
        ctx.strokeStyle = WIN_BORDER_DARKER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tbX, tbY + tbH);
        ctx.lineTo(tbX, tbY);
        ctx.lineTo(tbX + tbW, tbY);
        ctx.stroke();
        ctx.strokeStyle = WIN_BORDER_LIGHT;
        ctx.beginPath();
        ctx.moveTo(tbX + tbW, tbY);
        ctx.lineTo(tbX + tbW, tbY + tbH);
        ctx.lineTo(tbX, tbY + tbH);
        ctx.stroke();
      } else {
        // Raised state
        ctx.fillStyle = WIN_BG;
        ctx.fillRect(tbX, tbY, tbW, tbH);
        ctx.strokeStyle = WIN_BORDER_LIGHT;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tbX, tbY + tbH);
        ctx.lineTo(tbX, tbY);
        ctx.lineTo(tbX + tbW, tbY);
        ctx.stroke();
        ctx.strokeStyle = WIN_BORDER_DARKER;
        ctx.beginPath();
        ctx.moveTo(tbX + tbW, tbY);
        ctx.lineTo(tbX + tbW, tbY + tbH);
        ctx.lineTo(tbX, tbY + tbH);
        ctx.stroke();
      }

      ctx.fillStyle = TEXT_BLACK;
      ctx.fillText(label, tbX + 6, tbY + tbH / 2);
      tbX += tbW + 3;
    }

    // Separator
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y + toolH);
    ctx.lineTo(c.x + c.w, c.y + toolH);
    ctx.stroke();

    // Column headers
    const headerH = 16;
    const headerY = c.y + toolH + 1;
    const fromColW = Math.floor(c.w * 0.28);
    const dateColW = 70;

    ctx.fillStyle = WIN_BG;
    ctx.fillRect(c.x, headerY, c.w, headerH);
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.beginPath();
    ctx.moveTo(c.x, headerY + headerH);
    ctx.lineTo(c.x + c.w, headerY + headerH);
    ctx.stroke();

    ctx.font = `bold ${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('From', c.x + 6, headerY + headerH / 2);
    ctx.fillText('Subject', c.x + fromColW + 6, headerY + headerH / 2);
    ctx.fillText('Date', c.x + c.w - dateColW, headerY + headerH / 2);

    // Column separator lines
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.beginPath();
    ctx.moveTo(c.x + fromColW, headerY);
    ctx.lineTo(c.x + fromColW, headerY + headerH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x + c.w - dateColW - 4, headerY);
    ctx.lineTo(c.x + c.w - dateColW - 4, headerY + headerH);
    ctx.stroke();

    // Email rows
    const listY = headerY + headerH + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x, listY, c.w, c.h - (listY - c.y));
    ctx.clip();

    const rowH = lineH;
    for (let i = 0; i < emailInbox.length; i++) {
      const ry = listY + i * rowH;
      if (ry > c.y + c.h) break;

      const email = emailInbox[i];
      const isSelected = i === emailSelectedIdx;

      if (isSelected) {
        ctx.fillStyle = EMAIL_SELECT;
        ctx.fillRect(c.x + 1, ry, c.w - 2, rowH);
        ctx.fillStyle = EMAIL_SELECT_TEXT;
      } else {
        ctx.fillStyle = TEXT_BLACK;
      }

      ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(email.from, c.x + 6, ry + 2, fromColW - 10);
      ctx.fillText(email.subject, c.x + fromColW + 6, ry + 2, c.w - fromColW - dateColW - 16);
      ctx.fillText(email.date, c.x + c.w - dateColW, ry + 2, dateColW - 4);
    }

    ctx.restore();
  }

  // ── Desktop wallpaper ──
  function drawWallpaper() {
    if (!ctx) return;

    // Classic ugly teal gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height - TASKBAR_HEIGHT);
    grad.addColorStop(0, '#008080');
    grad.addColorStop(0.5, DESKTOP_BG);
    grad.addColorStop(1, '#004060');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height - TASKBAR_HEIGHT);
  }

  // ── Desktop icons ──
  function drawDesktopIcons() {
    if (!ctx) return;

    for (const icon of desktopIcons) {
      // Emoji icon
      ctx.font = `28px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(icon.emoji, icon.x + 24, icon.y);

      // Label with shadow
      ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#000000';
      ctx.fillText(icon.label, icon.x + 25, icon.y + 34);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(icon.label, icon.x + 24, icon.y + 33);
      ctx.textAlign = 'left';
    }
  }

  // ── Taskbar ──
  function drawTaskbar(_now: number) {
    if (!ctx) return;

    const ty = height - TASKBAR_HEIGHT;

    // Taskbar background
    ctx.fillStyle = TASKBAR_BG;
    ctx.fillRect(0, ty, width, TASKBAR_HEIGHT);

    // Top border (raised edge)
    ctx.strokeStyle = TASKBAR_BORDER_LIGHT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ty);
    ctx.lineTo(width, ty);
    ctx.stroke();

    ctx.strokeStyle = TASKBAR_BORDER_DARK;
    ctx.beginPath();
    ctx.moveTo(0, ty + 1);
    ctx.lineTo(width, ty + 1);
    ctx.stroke();

    // Start button
    const startW = 70;
    const startH = TASKBAR_HEIGHT - 6;
    const startX = 3;
    const startY = ty + 3;

    // Raised button
    ctx.fillStyle = TASKBAR_BG;
    ctx.fillRect(startX, startY, startW, startH);
    ctx.strokeStyle = TASKBAR_BORDER_LIGHT;
    ctx.beginPath();
    ctx.moveTo(startX, startY + startH);
    ctx.lineTo(startX, startY);
    ctx.lineTo(startX + startW, startY);
    ctx.stroke();
    ctx.strokeStyle = TASKBAR_BORDER_DARKER;
    ctx.beginPath();
    ctx.moveTo(startX + startW, startY);
    ctx.lineTo(startX + startW, startY + startH);
    ctx.lineTo(startX, startY + startH);
    ctx.stroke();

    ctx.font = `bold ${baseFontSize}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText('🐧 Start', startX + 4, startY + startH / 2);

    // Taskbar window buttons
    let btnX = startW + 12;
    const btnH = TASKBAR_HEIGHT - 6;

    for (const win of windows) {
      const bw = Math.min(140, Math.floor((width - startW - 120) / windows.length));
      const pressed = win.active;

      ctx.fillStyle = pressed ? '#B0B0B0' : TASKBAR_BG;
      ctx.fillRect(btnX, ty + 3, bw, btnH);

      if (pressed) {
        ctx.strokeStyle = TASKBAR_BORDER_DARKER;
        ctx.beginPath();
        ctx.moveTo(btnX, ty + 3 + btnH);
        ctx.lineTo(btnX, ty + 3);
        ctx.lineTo(btnX + bw, ty + 3);
        ctx.stroke();
        ctx.strokeStyle = TASKBAR_BORDER_LIGHT;
        ctx.beginPath();
        ctx.moveTo(btnX + bw, ty + 3);
        ctx.lineTo(btnX + bw, ty + 3 + btnH);
        ctx.lineTo(btnX, ty + 3 + btnH);
        ctx.stroke();
      } else {
        ctx.strokeStyle = TASKBAR_BORDER_LIGHT;
        ctx.beginPath();
        ctx.moveTo(btnX, ty + 3 + btnH);
        ctx.lineTo(btnX, ty + 3);
        ctx.lineTo(btnX + bw, ty + 3);
        ctx.stroke();
        ctx.strokeStyle = TASKBAR_BORDER_DARKER;
        ctx.beginPath();
        ctx.moveTo(btnX + bw, ty + 3);
        ctx.lineTo(btnX + bw, ty + 3 + btnH);
        ctx.lineTo(btnX, ty + 3 + btnH);
        ctx.stroke();
      }

      // Truncate title
      ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = TEXT_BLACK;
      const titleMax = Math.floor((bw - 8) / (baseFontSize * 0.5));
      const title = win.title.length > titleMax ? win.title.slice(0, titleMax) + '…' : win.title;
      ctx.fillText(title, btnX + 4, ty + 3 + btnH / 2);

      btnX += bw + 2;
    }

    // System tray / clock
    const trayW = 80;
    const trayX = width - trayW - 4;

    // Sunken border
    ctx.strokeStyle = WIN_BORDER_DARK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(trayX, ty + 3 + btnH);
    ctx.lineTo(trayX, ty + 3);
    ctx.lineTo(trayX + trayW, ty + 3);
    ctx.stroke();
    ctx.strokeStyle = WIN_BORDER_LIGHT;
    ctx.beginPath();
    ctx.moveTo(trayX + trayW, ty + 3);
    ctx.lineTo(trayX + trayW, ty + 3 + btnH);
    ctx.lineTo(trayX, ty + 3 + btnH);
    ctx.stroke();

    // Clock
    const date = new Date();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    ctx.font = `${baseFontSize - 1}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = TEXT_BLACK;
    ctx.textAlign = 'center';
    ctx.fillText(timeStr, trayX + trayW / 2, ty + 3 + btnH / 2);
    ctx.textAlign = 'left';
  }

  // ── Balloon notification ──
  function drawBalloon() {
    if (!ctx || !balloonNotif) return;

    // Fade in/out
    let alpha = 1;
    if (balloonNotif.age < BALLOON_FADE_TIME) {
      alpha = balloonNotif.age / BALLOON_FADE_TIME;
    } else if (balloonNotif.age > balloonNotif.duration - BALLOON_FADE_TIME) {
      alpha = (balloonNotif.duration - balloonNotif.age) / BALLOON_FADE_TIME;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    ctx.save();
    ctx.globalAlpha = alpha;

    // Position: above the system tray, bottom-right
    const bw = 240;
    const bh = 70;
    const bx = width - bw - 8;
    const by = height - TASKBAR_HEIGHT - bh - 6;
    const radius = 6;
    const stemSize = 8;

    // Balloon body with rounded corners
    ctx.fillStyle = '#FFFFCC';
    ctx.beginPath();
    ctx.moveTo(bx + radius, by);
    ctx.lineTo(bx + bw - radius, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + radius);
    ctx.lineTo(bx + bw, by + bh - radius);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - radius, by + bh);
    // Stem pointing down toward tray
    ctx.lineTo(bx + bw - 20, by + bh);
    ctx.lineTo(bx + bw - 25, by + bh + stemSize);
    ctx.lineTo(bx + bw - 30, by + bh);
    ctx.lineTo(bx + radius, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - radius);
    ctx.lineTo(bx, by + radius);
    ctx.quadraticCurveTo(bx, by, bx + radius, by);
    ctx.closePath();
    ctx.fill();

    // Border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Close X in top right
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 1.5;
    const cx = bx + bw - 14;
    const cy = by + 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 8, cy + 8);
    ctx.moveTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // Title (bold)
    ctx.font = `bold ${baseFontSize - 1}px "Tahoma", "Arial", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = TEXT_BLACK;
    ctx.fillText(balloonNotif.title, bx + 8, by + 8, bw - 28);

    // Body text (wrapped)
    ctx.font = `${baseFontSize - 2}px "Tahoma", "Arial", sans-serif`;
    ctx.fillStyle = '#333333';
    const maxChars = Math.floor((bw - 16) / (baseFontSize * 0.48));
    const lines = wrapText(balloonNotif.body, maxChars);
    for (let i = 0; i < lines.length && i < 3; i++) {
      ctx.fillText(lines[i], bx + 8, by + 24 + i * (lineH - 2), bw - 16);
    }

    ctx.restore();
  }

  // ── Main render ──
  function drawFrame(now: number) {
    if (!ctx) return;

    drawWallpaper();
    drawDesktopIcons();

    // Draw windows back to front
    for (const win of windows) {
      drawWindowChrome(win);
      win.draw(win, now);
    }

    // Draw drag ghost outlines behind the moving window
    if (dragAnim) {
      const t = Math.min(1, dragAnim.elapsed / dragAnim.duration);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      // Draw ghosts at evenly spaced points along the path up to current progress
      for (let i = 0; i < DRAG_GHOST_COUNT; i++) {
        const gt = (i / DRAG_GHOST_COUNT) * t;
        const gx = Math.round(dragAnim.fromX + (dragAnim.toX - dragAnim.fromX) * gt);
        const gy = Math.round(dragAnim.fromY + (dragAnim.toY - dragAnim.fromY) * gt);
        ctx.globalAlpha = 0.3 + 0.4 * (i / DRAG_GHOST_COUNT);
        ctx.strokeRect(gx, gy, dragAnim.win.w, dragAnim.win.h);
      }
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    drawTaskbar(now);
    drawBalloon();
  }

  // ── Main loop ──
  function loop(now: number) {
    if (!ctx) return;

    const dt = Math.min(now - lastTime, 100); // clamp delta
    lastTime = now;

    // Update all windows
    for (const win of windows) {
      win.update(win, dt);
    }

    // Update balloon notifications
    if (balloonNotif) {
      balloonNotif.age += dt;
      if (balloonNotif.age >= balloonNotif.duration) {
        balloonNotif = null;
        balloonTimer = 0;
      }
    } else {
      balloonTimer += dt;
      if (balloonTimer >= BALLOON_INTERVAL) {
        balloonTimer = 0;
        const msg = nextBalloon();
        balloonNotif = { title: msg.title, body: msg.body, age: 0, duration: BALLOON_DURATION };
      }
    }

    // Occasionally switch focus
    focusTimer += dt;
    if (focusTimer >= FOCUS_INTERVAL && !dragAnim) {
      focusTimer = 0;
      // Deactivate all
      for (const win of windows) win.active = false;
      // Pick a random window to activate and move to front
      const idx = Math.floor(Math.random() * windows.length);
      const picked = windows.splice(idx, 1)[0];
      picked.active = true;
      windows.push(picked);
      // Start drag animation to a random on-screen position
      const usableH = height - TASKBAR_HEIGHT;
      dragAnim = {
        win: picked,
        fromX: picked.x,
        fromY: picked.y,
        toX: Math.floor(Math.random() * (width - picked.w)),
        toY: Math.floor(Math.random() * (usableH - picked.h)),
        elapsed: 0,
        duration: DRAG_DURATION,
      };
    }

    // Advance drag animation
    if (dragAnim) {
      dragAnim.elapsed += dt;
      const t = Math.min(1, dragAnim.elapsed / dragAnim.duration);
      // Ease-out for a natural deceleration feel
      const ease = 1 - (1 - t) * (1 - t);
      dragAnim.win.x = Math.round(dragAnim.fromX + (dragAnim.toX - dragAnim.fromX) * ease);
      dragAnim.win.y = Math.round(dragAnim.fromY + (dragAnim.toY - dragAnim.fromY) * ease);
      if (t >= 1) {
        dragAnim = null;
      }
    }

    drawFrame(now);
    animationFrame = requestAnimationFrame(loop);
  }

  function handleResize() {
    computeLayout();
    if (ctx) drawFrame(performance.now());
  }

  // ── Init state ──
  function initState() {
    termLines.length = 0;
    termStack = [];
    // Seed a few terminal lines
    for (let i = 0; i < 8; i++) {
      termLines.push(nextTermMessage());
    }
    termTimer = 0;

    hnStories = generateHNStories();
    hnRefreshTimer = 0;

    calcDisplay = '0';
    calcActiveBtn = -1;
    calcTimer = 0;
    calcStepIdx = 0;
    calcPhase = 'COMPUTING';
    currentCalcSeq = 0;

    fmSelectedIdx = 0;
    fmSelectTimer = 0;

    sysmonCpu = 847;
    sysmonCpuTarget = 847;
    sysmonRam = -12;
    sysmonRamTarget = -12;
    sysmonUptime = 847 * 86400;
    sysmonCpuHistory = [];

    editorText = '';
    editorTimer = 0;
    editorPoemIdx = Math.floor(Math.random() * EDITOR_POEMS.length);
    editorCharIdx = 0;

    balloonNotif = null;
    balloonTimer = 0;
    balloonStack = [];

    winampTrackStack = [];
    winampCurrentTrack = nextWinampTrack();
    winampTrackTime = 0;
    winampTrackDuration = 180 + Math.random() * 120;
    winampMarqueeOffset = 0;
    winampEqBars = new Array(WINAMP_EQ_COUNT).fill(0.3);
    winampEqTargets = new Array(WINAMP_EQ_COUNT).fill(0.3);
    winampEqTimer = 0;

    emailSelectedIdx = 0;
    emailSelectTimer = 0;
    emailRefreshTimer = 0;
    emailGetMailFlash = 0;
    emailStack = [];
    emailInbox = generateEmailInbox();

    focusTimer = 0;
  }

  return {
    name: 'Desktop',
    description: 'Janky Linux desktop with fake apps doing odd things',

    init(c: HTMLCanvasElement) {
      canvas = c;
      ctx = canvas.getContext('2d');
      computeLayout();
      initState();
      lastTime = performance.now();
      drawFrame(lastTime);
      animationFrame = requestAnimationFrame(loop);
      window.addEventListener('resize', handleResize);
    },

    shutdown() {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
      ctx = null;
      window.removeEventListener('resize', handleResize);
    },
  };
}
