const missions = [
  {
    id: 1,
    title: "Mission 01: GeoTrace",
    prompt:
      "A single image leak contains GPS data. Identify the city from the coordinates.",
    evidence: [
      "EXIF: GPS 59.3293, 18.0686",
      "Weather tag: snow + waterfront",
      "Operator note: northern capital"
    ],
    answer: ["stockholm"],
    hint: "Look for a Scandinavian capital with a large archipelago."
  },
  {
    id: 2,
    title: "Mission 02: Alias Pivot",
    prompt:
      "A handle is active across multiple sites. Choose the most likely hub.",
    evidence: [
      "Handle: null_rain",
      "Pinned project: neon-proxy",
      "Public key: 0xC0FFEE",
      "Followers mention: \"pull request\""
    ],
    answer: ["github", "git"],
    bonusOn: { github: 5 },
    hint: "Think where code, keys, and pull requests live."
  },
  {
    id: 3,
    title: "Mission 03: Infra Leak",
    prompt:
      "A domain points at a familiar cloud provider. Name it.",
    evidence: [
      "NS: ns1.digitalocean.com",
      "NS: ns2.digitalocean.com",
      "IP range: 134.122.x.x",
      "Service tag: droplets"
    ],
    answer: ["digitalocean", "digital ocean"],
    bonusOn: { "digitalocean": 6, "digital ocean": 6 },
    hint: "This provider calls VMs 'droplets'."
  },
  {
    id: 4,
    title: "Mission 04: Transit Signal",
    prompt:
      "A log shows a badge access at 21:15 CET. Convert to UTC and answer as HH:MM.",
    evidence: [
      "Entry: 2026-01-14 21:15:33 CET",
      "Node: Gate 11",
      "Shift: CET (UTC+1)"
    ],
    answer: ["20:15"],
    hint: "CET is one hour ahead of UTC."
  },
  {
    id: 5,
    title: "Side Mission: Repo Ghost",
    prompt:
      "A leaked CI token was spotted. Identify the service provider.",
    evidence: [
      "Token prefix: ghp_",
      "Workflow file: .github/workflows/deploy.yml",
      "Commit note: actions: checkout"
    ],
    answer: ["github", "github actions", "actions"],
    hint: "This token format is tied to a popular code host."
  },
  {
    id: 6,
    title: "Side Mission: VPN Trail",
    prompt:
      "Traffic shows TLS SNI: vpn.zero.sec. Identify the service type.",
    evidence: [
      "Port: 443",
      "SNI: vpn.zero.sec",
      "TLS ALPN: h2"
    ],
    answer: ["vpn", "proxy"],
    hint: "Focus on what the endpoint likely provides."
  }
];

const missionMap = new Map(missions.map((mission) => [mission.id, mission]));
const baseQueue = [1, 2, 3, 4];

const startBtn = document.getElementById("start-btn");
const resetBtn = document.getElementById("reset-btn");
const traceBtn = document.getElementById("trace-btn");
const hintBtn = document.getElementById("hint-btn");
const submitBtn = document.getElementById("submit-btn");
const answerInput = document.getElementById("answer-input");
const missionTitle = document.getElementById("mission-title");
const missionPrompt = document.getElementById("mission-prompt");
const missionEvidence = document.getElementById("mission-evidence");
const progressText = document.getElementById("progress");
const progressBar = document.getElementById("progress-bar");
const statusNote = document.getElementById("status-note");
const terminal = document.getElementById("terminal");
const timer = document.getElementById("timer");
const countdown = document.getElementById("countdown");
const integrityEl = document.getElementById("integrity");
const caseFiles = document.getElementById("case-files");
const audioBtn = document.getElementById("audio-btn");
const modeBtn = document.getElementById("mode-btn");
const shell = document.querySelector(".shell");

let queue = [...baseQueue];
let currentIndex = 0;
let startedAt = null;
let timerInterval = null;
let countdownInterval = null;
let traceShown = false;
let integrity = 100;
let hardMode = false;
let timeLeft = null;
let audioContext = null;
let audioNodes = [];

const STANDARD_TIME = 90;
const HARD_TIME = 55;

function renderCases() {
  caseFiles.innerHTML = "";
  missions.forEach((mission) => {
    const card = document.createElement("div");
    card.className = "case-card";
    card.innerHTML = `
      <h3>${mission.title}</h3>
      <div>${mission.prompt}</div>
      <p>Signal count: ${mission.evidence.length}</p>
    `;
    caseFiles.appendChild(card);
  });
}

function setButtons(active) {
  answerInput.disabled = !active;
  submitBtn.disabled = !active;
  traceBtn.disabled = !active;
  hintBtn.disabled = !active;
}

function logLine(text, dim = false) {
  const line = document.createElement("div");
  line.className = `terminal-line${dim ? " dim" : ""}`;
  line.textContent = text;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function updateTimer() {
  if (!startedAt) return;
  const diff = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = String(Math.floor(diff / 60)).padStart(2, "0");
  const seconds = String(diff % 60).padStart(2, "0");
  timer.textContent = `${minutes}:${seconds}`;
}

function updateCountdown() {
  if (timeLeft === null) return;
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  countdown.textContent = `${minutes}:${seconds}`;
  if (timeLeft <= 0) {
    handleTimeout();
  }
  timeLeft -= 1;
}

function startCountdown() {
  clearInterval(countdownInterval);
  timeLeft = hardMode ? HARD_TIME : STANDARD_TIME;
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  timeLeft = null;
  countdown.textContent = "--:--";
}

function updateIntegrity(delta) {
  integrity = Math.max(0, Math.min(100, integrity + delta));
  integrityEl.textContent = `${integrity}%`;
  if (integrity <= 40) {
    integrityEl.style.color = "var(--neon-pink)";
  } else {
    integrityEl.style.color = "var(--neon-cyan)";
  }
}

function saveProgress() {
  const payload = {
    queue,
    currentIndex,
    integrity,
    hardMode
  };
  localStorage.setItem("neon-trace", JSON.stringify(payload));
}

function loadProgress() {
  const raw = localStorage.getItem("neon-trace");
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data.queue)) {
      queue = data.queue;
    }
    if (Number.isInteger(data.currentIndex)) {
      currentIndex = data.currentIndex;
    }
    if (Number.isFinite(data.integrity)) {
      integrity = data.integrity;
      updateIntegrity(0);
    }
    if (typeof data.hardMode === "boolean") {
      hardMode = data.hardMode;
      updateModeButton();
    }
    startMission(false);
  } catch (error) {
    localStorage.removeItem("neon-trace");
  }
}

function resetProgress() {
  queue = [...baseQueue];
  currentIndex = 0;
  startedAt = null;
  clearInterval(timerInterval);
  timerInterval = null;
  timer.textContent = "00:00";
  missionTitle.textContent = "Mission Offline";
  missionPrompt.textContent = "Press Start to load your first case file.";
  missionEvidence.textContent = "";
  statusNote.textContent = "Awaiting mission start.";
  progressText.textContent = `0 / ${queue.length}`;
  progressBar.style.width = "0%";
  terminal.innerHTML = "";
  traceShown = false;
  setButtons(false);
  stopCountdown();
  updateIntegrity(100 - integrity);
  localStorage.removeItem("neon-trace");
}

function getCurrentMission() {
  const id = queue[currentIndex];
  return missionMap.get(id);
}

function updateProgress() {
  progressText.textContent = `${currentIndex} / ${queue.length}`;
  progressBar.style.width = `${(currentIndex / queue.length) * 100}%`;
}

function startMission(withLog = true) {
  const mission = getCurrentMission();
  if (!mission) {
    missionTitle.textContent = "All Missions Complete";
    missionPrompt.textContent = "You cleared the grid. Reset to run again.";
    missionEvidence.textContent = "";
    setButtons(false);
    statusNote.textContent = "Extraction successful.";
    progressText.textContent = `${queue.length} / ${queue.length}`;
    progressBar.style.width = "100%";
    stopCountdown();
    if (withLog) logLine("All missions complete. Extraction window open.");
    return;
  }

  missionTitle.textContent = mission.title;
  missionPrompt.textContent = mission.prompt;
  missionEvidence.textContent = "Signal buffer empty. Run trace.";
  answerInput.value = "";
  traceShown = false;
  setButtons(true);
  updateProgress();
  statusNote.textContent = "Mission loaded. Awaiting analysis.";
  startCountdown();

  if (withLog) {
    logLine(`Loaded ${mission.title}`);
    logLine("Run trace to reveal signal artifacts.", true);
  }
}

function startGame() {
  if (!startedAt) {
    startedAt = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
  }
  startMission();
  saveProgress();
}

function addBonusMission(answer) {
  const mission = getCurrentMission();
  if (!mission || !mission.bonusOn) return;
  const bonusId = mission.bonusOn[answer];
  if (!bonusId) return;
  if (queue.includes(bonusId)) return;
  queue.splice(currentIndex + 1, 0, bonusId);
  logLine(`Bonus path unlocked: ${missionMap.get(bonusId).title}`);
}

function handleTimeout() {
  stopCountdown();
  updateIntegrity(-20);
  logLine("Timer expired. Signal lost.", true);
  statusNote.textContent = "Timeout. Moving to next mission.";
  currentIndex += 1;
  saveProgress();
  startMission();
}

function updateModeButton() {
  modeBtn.textContent = hardMode ? "Mode: Hard" : "Mode: Standard";
  if (hardMode) {
    modeBtn.classList.add("active");
  } else {
    modeBtn.classList.remove("active");
  }
}

function enableAudio() {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioContext.resume().catch(() => {});
  const master = audioContext.createGain();
  master.gain.value = 0.2;
  master.connect(audioContext.destination);

  const drone = audioContext.createOscillator();
  drone.type = "sawtooth";
  drone.frequency.value = 60;
  const droneGain = audioContext.createGain();
  droneGain.gain.value = 0.08;
  drone.connect(droneGain).connect(master);

  const pulse = audioContext.createOscillator();
  pulse.type = "square";
  pulse.frequency.value = 120;
  const pulseGain = audioContext.createGain();
  pulseGain.gain.value = 0.02;
  pulse.connect(pulseGain).connect(master);

  const filter = audioContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  master.disconnect();
  master.connect(filter);
  filter.connect(audioContext.destination);

  drone.start();
  pulse.start();
  audioNodes = [drone, pulse, master];
  audioBtn.textContent = "Audio: On";
  audioBtn.classList.add("active");
  logLine("Audio engine online.", true);
}

function disableAudio() {
  if (!audioContext) return;
  audioNodes.forEach((node) => {
    if (node.stop) node.stop();
  });
  audioContext.close();
  audioContext = null;
  audioNodes = [];
  audioBtn.textContent = "Enable Audio";
  audioBtn.classList.remove("active");
}

startBtn.addEventListener("click", () => {
  startGame();
});

resetBtn.addEventListener("click", () => {
  resetProgress();
});

traceBtn.addEventListener("click", () => {
  if (traceShown) {
    logLine("Trace already executed.", true);
    return;
  }
  const mission = getCurrentMission();
  missionEvidence.textContent = mission.evidence.join("\n");
  logLine("Trace executed. Signals received.");
  mission.evidence.forEach((line) => logLine(`> ${line}`, true));
  traceShown = true;
});

hintBtn.addEventListener("click", () => {
  const mission = getCurrentMission();
  logLine(`Hint: ${mission.hint}`, true);
  statusNote.textContent = "Hint delivered. Stay sharp.";
});

submitBtn.addEventListener("click", () => {
  const mission = getCurrentMission();
  const answer = answerInput.value.trim().toLowerCase();
  if (!answer) {
    statusNote.textContent = "Answer field empty.";
    return;
  }
  if (mission.answer.includes(answer)) {
    logLine(`Answer accepted: ${answer}`);
    statusNote.textContent = "Signal confirmed. Moving to next mission.";
    addBonusMission(answer);
    currentIndex += 1;
    saveProgress();
    startMission();
  } else {
    logLine(`Answer rejected: ${answer}`, true);
    statusNote.textContent = "No match. Recheck the evidence.";
    updateIntegrity(-5);
  }
});

answerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !submitBtn.disabled) {
    submitBtn.click();
  }
});

audioBtn.addEventListener("click", () => {
  if (audioContext) {
    disableAudio();
  } else {
    enableAudio();
  }
});

modeBtn.addEventListener("click", () => {
  hardMode = !hardMode;
  updateModeButton();
  logLine(hardMode ? "Hard mode armed." : "Standard mode restored.", true);
  saveProgress();
  if (startedAt) {
    startCountdown();
  }
});

renderCases();
resetProgress();
updateModeButton();
loadProgress();

function fitToViewport() {
  if (!shell) return;
  shell.style.transform = "";
  shell.style.height = "";
  shell.style.zoom = "";
  document.body.style.overflow = "";
  const rect = shell.getBoundingClientRect();
  const availableHeight = window.innerHeight;
  if (rect.height > availableHeight) {
    const scale = Math.max(0.78, (availableHeight / rect.height) * 0.985);
    if (typeof shell.style.zoom !== "undefined") {
      shell.style.zoom = String(scale);
      document.body.style.overflow = "hidden";
    } else {
      shell.style.transform = `scale(${scale})`;
      shell.style.height = `${rect.height * scale}px`;
      document.body.style.overflow = "hidden";
    }
  }
}

window.addEventListener("resize", () => {
  window.requestAnimationFrame(fitToViewport);
});

window.addEventListener("load", () => {
  fitToViewport();
  setTimeout(fitToViewport, 300);
});
