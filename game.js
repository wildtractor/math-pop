// ─── ELEMENTS ─────────────────────────
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const healthEl = document.getElementById("health");
const endScreen = document.getElementById("endScreen");
const endMessage = document.getElementById("endMessage");
const restartBtn = document.getElementById("restartBtn");
const scoreEl = document.getElementById("score");
const gridBoard = document.getElementById("gridBoard");
const fallArea = document.getElementById("fallArea");
const fallBubble = document.getElementById("fallBubble");
const startBtn = document.getElementById("startBtn");
const speedSlider = document.getElementById("speedSlider");
const modeGridBtn = document.getElementById("modeGrid");
const volumeSlider = document.getElementById("volumeSlider");
const nextTableBtn = document.getElementById("nextTableBtn");
const volumeIcon = document.getElementById("volumeIcon");
const replayBtn = document.getElementById("replayBtn");
const quitBtn = document.getElementById("quitBtn");

const settingsBtn = document.getElementById("settingsBtn");
const settingsScreen = document.getElementById("settingsScreen");
const settingsPlayerName = document.getElementById("settingsPlayerName");
const settingsScoreList = document.getElementById("settingsScoreList");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const setPlayerNameBtn = document.getElementById("setPlayerNameBtn");
const playerNameDisplay = document.getElementById("playerNameDisplay");
const removePlayerBtn = document.getElementById("removePlayerBtn");
const clearCurrentBtn = document.getElementById("clearCurrentBtn");
const settingsTitle = document.getElementById("settingsTitle");
const emptyHint = document.getElementById("emptyHint");
const idleBubblesContainer = document.getElementById("idleBubbles");





// ─── AUDIO STATE ──────────────────────
let masterVolume = 0.7;
let audioUnlocked = false;

const sounds = {
  pop: new Audio("sounds/pop.wav"),
  fail: new Audio("sounds/fail.wav"),
  wrong: new Audio("sounds/wrong.mp3"),
  gameover: new Audio("sounds/gameover.wav"),
  click: new Audio("sounds/click.wav")
};

// ─── GAME STATE ───────────────────────
let mode = "table";
let table = 1;
let multiplier = 1;
let health = 10;
let score = 0;
let solvedCount = 0;
let fallSpeed = 2;
let gameState = "idle";
let tableQueue = [];
let bubbleY = 0;
let falling = false;
let animationId = null;     // Only once
let currentFallValue = null;// Only once
let spawnTimeout = null;    // Needed for your fix
let failedCount = 0;
let idleBubbleTimer = null;
let leaderboard = JSON.parse(localStorage.getItem("mathPopLeaderboard")) || {};
let recentPlayers = JSON.parse(localStorage.getItem("mathPopRecentPlayers")) || [];
  // ─── PLAYER STATE ─────────────────────
  let currentPlayer =
    localStorage.getItem("mathPop_Name") || "Guest";
    // 🔁 Sync score on page load
    score = leaderboard[currentPlayer] || 0;
    updateScoreUI();

  let pressedTiles = new Set();
  let appState = "welcome"; // "welcome" | "ready" | "running"
// 🔴 Clear any previous green selection
document
  .querySelectorAll(".score-list li")
  .forEach(li => li.classList.remove("active"));

function startIdleBubbles() {
  stopIdleBubbles(); // Clear existing
  idleBubblesContainer.classList.remove("hidden");
  // Spawn a new bubble every 1.2 seconds
  idleBubbleTimer = setInterval(spawnIdleBubble, 1200);
}

function stopIdleBubbles() {
  idleBubblesContainer.classList.add("hidden");
  idleBubblesContainer.innerHTML = "";
  clearInterval(idleBubbleTimer);
}

function spawnIdleBubble() {
  const bubble = document.createElement("div");
  bubble.className = "idle-bubble";

  // 🟢 SET SIZE: Slower and Bigger (70px to 110px)
  const size = 70 + Math.random() * 40;
  bubble.style.width = bubble.style.height = size + "px";
  bubble.style.fontSize = (size * 0.4) + "px";
  bubble.style.left = Math.random() * 80 + 10 + "%";

  // Set random slow speed
  bubble.style.animationDuration = (10 + Math.random() * 8) + "s";
  bubble.textContent = Math.floor(Math.random() * 9) + 1;

  // 🟢 POPPING LOGIC
  bubble.onclick = () => handlePop(bubble, true);

  // Auto-pop after 7-12 seconds if not clicked
  const lifeSpan = 7000 + Math.random() * 5000;
  setTimeout(() => {
    if (bubble.parentNode) handlePop(bubble, false);
  }, lifeSpan);

  idleBubblesContainer.appendChild(bubble);
}

function handlePop(bubble, playSnd) {
  if (playSnd) playSound("pop");

  // Pop animation
  bubble.style.pointerEvents = "none";
  bubble.style.transform = "scale(1.8)";
  bubble.style.opacity = "0";
  bubble.style.transition = "transform 0.3s, opacity 0.3s";

  setTimeout(() => {
    bubble.remove();
    // Only respawn if we are still on the welcome screen
    if (appState === "welcome") spawnIdleBubble();
  }, 300);
}
function enterWelcomeState() {
  appState = "welcome";
  // Title
  if (settingsTitle) {
    settingsTitle.textContent = "👋 Welcome";
  }
  // Stop everything
  falling = false;
  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimeout);

  // Hide gameplay
  fallArea.classList.add("hidden");
  gridBoard.classList.add("hidden");
  answersEl.classList.add("hidden");
  questionEl.textContent = "";

  // Show welcome (settings screen)
  settingsScreen.classList.remove("hidden");

  // Reset Play button
  startBtn.querySelector("span").textContent = "play_arrow";
  startIdleBubbles();
}

function syncPlayerUI() {
  if (playerNameDisplay) {
    playerNameDisplay.textContent = currentPlayer;
  }
}

function setCurrentPlayer(name) {
  currentPlayer = name;
  localStorage.setItem("mathPop_Name", name);

  // 🔑 LOAD last known score for this player
  score = leaderboard[name] || 0;
  updateScoreUI();

  if (playerNameDisplay) {
    playerNameDisplay.textContent = name;
  }
  updateRemovePlayerButton();
}




function switchToPlayer(name) {
  if (leaderboard[name] === undefined) return;

setCurrentPlayer(name);

  openSettings(); // refresh UI
}

function setActivePlayer(name) {
  // create if missing
  if (leaderboard[name] === undefined) {
    leaderboard[name] = 0;
  }

  // update current
 setCurrentPlayer(name);

  // update recent players
  recentPlayers = recentPlayers.filter(p => p.name !== name);
  recentPlayers.unshift({ name, score: leaderboard[name] });
  recentPlayers = recentPlayers.slice(0, 5);

  // persist
  localStorage.setItem(
    "mathPopLeaderboard",
    JSON.stringify(leaderboard)
  );
  localStorage.setItem(
    "mathPopRecentPlayers",
    JSON.stringify(recentPlayers)
  );
}


// ─── PLAYER & RECORD LOGIC ──────────────

function renderLeaderboard() {
    scoreList.innerHTML = "";
    const sorted = Object.entries(leaderboard)
        .sort((a, b) => b[1] - a[1]) // Sort by score
        .slice(0, 5); // Top 5

    sorted.forEach(([name, best]) => {
        const li = document.createElement("li");
        li.style.padding = "4px 0";
        li.textContent = `⭐ ${name}: ${best} pts`;
        scoreList.appendChild(li);
    });
}

// ─── UPDATE SCORE RECORD ────────────────
function updateHighscore() {
    if (score > (leaderboard[currentPlayer] || 0)) {
        leaderboard[currentPlayer] = score;
        localStorage.setItem("mathPopLeaderboard", JSON.stringify(leaderboard));
    }
}

// ─── INITIALIZATION ───────────────────
function syncSliderFill(slider) {
  const min = Number(slider.min) || 0;
  const max = Number(slider.max) || 100;
  const value = Number(slider.value);
  const percent = ((value - min) / (max - min)) * 100;
  slider.style.setProperty("--value", `${percent}%`);
}
syncSliderFill(volumeSlider);
syncSliderFill(speedSlider);

// ─── AUDIO HELPERS ────────────────────
function playSound(name) {
  if (masterVolume === 0) return;
  const sound = sounds[name];
  if (!sound) return;
  sound.currentTime = 0;
  sound.volume = masterVolume;
  sound.play().catch(() => {});
}

function unlockAudio() {
  if (audioUnlocked) return;
  Object.values(sounds).forEach(sound => {
    sound.play().then(() => { sound.pause(); sound.currentTime = 0; }).catch(() => {});
  });
  audioUnlocked = true;
}

// ─── CORE GAME LOGIC ──────────────────
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function startGame() {
stopIdleBubbles();
emptyHint.classList.add("hidden");

  clearTimeout(spawnTimeout);
  gameState = "running";
  startBtn.querySelector("span").textContent = "pause";
  endScreen.classList.add("hidden");
  health = 10;
  solvedCount = 0;
  failedCount = 0;
  healthEl.textContent = health;
  fallArea.classList.remove("hidden");

  if (mode === "table") {
    gridBoard.classList.add("hidden");
    gridBoard.innerHTML = "";
    answersEl.classList.remove("hidden");
    questionEl.classList.remove("hidden");

    tableQueue = Array.from({ length: 12 }, (_, i) => i + 1);
    shuffle(tableQueue);
    buildTableRow();
  } else {
    answersEl.classList.add("hidden");
    answersEl.innerHTML = "";
    questionEl.classList.add("hidden");
    gridBoard.classList.remove("hidden");
    buildGrid();
  }
  spawnBubble();
}

function spawnBubble() {
  if (gameState !== "running") return; // Safety check

  if (mode === "table") {
    // 1. Find all tiles that are NOT solved (.correct) AND NOT failed (.wrong)
    const activeTiles = Array.from(document.querySelectorAll(".table-cell"))
      .filter(tile => !tile.classList.contains("correct") && !tile.classList.contains("wrong"));

    // 2. Map those tiles back to their multipliers
    const availableMultipliers = activeTiles.map(tile => parseInt(tile.dataset.i));

    // 3. Update the queue and shuffle it
    tableQueue = availableMultipliers;
    shuffle(tableQueue);

    // 4. End condition: No more clickable tiles left
    if (tableQueue.length === 0) {
      falling = false;
      cancelAnimationFrame(animationId);
      endGame();
      return;
    }

    // 5. Pick the first available multiplier
    multiplier = tableQueue[0];
    currentFallValue = table * multiplier;
    questionEl.textContent = `Target: ${currentFallValue}`;
  }
else {
  let r, c;
  let attempts = 0;

  do {
    r = Math.floor(Math.random() * 12) + 1;
    c = Math.floor(Math.random() * 12) + 1;
    currentFallValue = r * c;
    attempts++;
  } while (
    pressedTiles.has(currentFallValue) &&
    attempts < 200
  );

  if (attempts >= 200) {
    endGame("🎉 Grid complete!");
    return;
  }

  updateGridIndicators(r, c);
}

// 🟢 APPLY THE FLASH EFFECT
  fallBubble.textContent = currentFallValue;

  // Reset animation
  fallBubble.classList.remove("target-flash");
  void fallBubble.offsetWidth; // Trigger reflow to restart animation
  fallBubble.classList.add("target-flash");

  bubbleY = 0;
  fallBubble.style.top = "0px";
  fallBubble.style.opacity = "1";
  falling = true;

  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(fallLoop);
}

function updateGridIndicators(row, col) {
  // Clear all previous indicators
  document.querySelectorAll('.grid-header').forEach(h => {
    h.classList.remove('active-indicator');
    // Restore original number if it was changed to "?"
    if (h.dataset.orig) h.textContent = h.dataset.orig;
  });

  // Find the specific row and column headers
  const rowHeader = document.querySelector(`.grid-header[data-row="${row}"]`);
  const colHeader = document.querySelector(`.grid-header[data-col="${col}"]`);

  if (rowHeader && colHeader) {
    rowHeader.classList.add('active-indicator');
    colHeader.classList.add('active-indicator');

    // 🟢 Change text to "?" to indicate the target line
    rowHeader.textContent = "?";
    colHeader.textContent = "?";
  }
}
function fallLoop() {
if (health <= 0) {
      endGame("out");
      return;
    }
  if (!falling) return;

  bubbleY += fallSpeed * 0.4;
  fallBubble.style.top = bubbleY + "px";

  const bottomLimit = fallArea.clientHeight - fallBubble.clientHeight - 10;

  if (bubbleY >= bottomLimit) {
    falling = false;
    health--;
    healthEl.textContent = health;
    playSound("fail");

    // NEW: Trigger the pop animation at the bottom instead of just disappearing
    popFallBubble();
    return;
  }

  animationId = requestAnimationFrame(fallLoop);
}


function popFallBubble() {
  // 🔴 LIFE HAS PRIORITY
  if (health <= 0) {
    endGame("Out");
    return;
  }
if (mode === "table" && isTableFinished()) {
  endGame();
  return;
}

  playSound("pop");


  // visual pop effect
  fallBubble.style.transform = "translateX(-50%) scale(1.4)";
  fallBubble.style.opacity = "0";

  // Wait 300ms, then reset and spawn the next one
  spawnTimeout = setTimeout(() => {
    fallBubble.style.transform = "translateX(-50%) scale(1)";
    spawnBubble(); // <--- You were missing this!
  }, 300);
}
removePlayerBtn.onclick = () => {
  playSound("click");

  if (currentPlayer === "Guest") return;

  const nameToRemove = currentPlayer;

  const confirmed = confirm(
    `Are you sure you want to remove "${nameToRemove}"?\nThis will delete all scores.`
  );
  if (!confirmed) return;

  // Remove from leaderboard
  delete leaderboard[nameToRemove];

  // Remove from recent players
  recentPlayers = recentPlayers.filter(p => p.name !== nameToRemove);

  // Persist changes
  localStorage.setItem(
    "mathPopLeaderboard",
    JSON.stringify(leaderboard)
  );
  localStorage.setItem(
    "mathPopRecentPlayers",
    JSON.stringify(recentPlayers)
  );

  // 🟢 IMPORTANT: DO NOT auto-set player
  currentPlayer = "Guest";
  localStorage.setItem("mathPop_Name", "Guest");

  // Update UI only
  settingsPlayerName.value = "";
  syncPlayerUI();
  updateRemovePlayerButton();

  // 🔒 STAY on settings / welcome
  openSettings();
};


function updateRemovePlayerButton() {
  if (!removePlayerBtn) return;

  if (currentPlayer === "Guest") {
    removePlayerBtn.textContent = "Remove Player";
    removePlayerBtn.disabled = true;
    removePlayerBtn.classList.remove("danger");
    removePlayerBtn.style.opacity = "0.5";
  } else {
    removePlayerBtn.textContent = `Remove Player: ${currentPlayer}`;
    removePlayerBtn.disabled = false;
    removePlayerBtn.classList.add("danger");
    removePlayerBtn.style.opacity = "1";
  }
}

// ─── BOARD BUILDING ───────────────────
function buildTableRow() {
  answersEl.innerHTML = "";
  pressedTiles.clear(); // reset for this table

  for (let i = 1; i <= 12; i++) {
    const cellValue = table * i;

    const cell = document.createElement("div");
    cell.className = "table-cell";
    cell.textContent = `${table} × ${i} = ?`;
    cell.dataset.value = cellValue;
    cell.dataset.i = i;

    cell.onclick = () => {
      if (!falling || gameState !== "running") return;

      if (Number(cell.dataset.value) === currentFallValue) {
       pressedTiles.add(i);
        cell.textContent = `${table} × ${i} = ${cellValue}`;
        cell.classList.add("correct");
        cell.onclick = null;

        solvedCount++;
        score += 10;
        updateScoreUI();


        popFallBubble();
      } else {
        handleWrong(cell);
      }
    };

    answersEl.appendChild(cell);
  }
}


function buildGrid() {
  gridBoard.innerHTML = "";
  for (let row = 0; row <= 12; row++) {
    for (let col = 0; col <= 12; col++) {
      const cell = document.createElement("div");
      if (row === 0 && col === 0) {
        cell.className = "grid-header corner";
        cell.textContent = "×";
      } else if (row === 0 || col === 0) {
        cell.className = "grid-header";
        cell.textContent = row === 0 ? col : row;
      } else {
        cell.className = "grid-cell";
        cell.dataset.value = row * col;
        cell.onclick = () => {
          if (!falling) return;

          const value = parseInt(cell.dataset.value);

          if (value === currentFallValue) {
            cell.classList.add("correct");

            pressedTiles.add(currentFallValue); // ✅ MARK TARGET DONE

            score += 10;
            updateScoreUI();

            popFallBubble();
          } else {
            handleWrong(cell);
          }
        };

      }
      gridBoard.appendChild(cell);
    }
  }
}updateScoreUI();

function handleWrong(element) {
  element.classList.add("wrong");
  playSound("wrong");
  screenShake();

  score = Math.max(0, score - 5);
  updateScoreUI();

  health--;
  healthEl.textContent = health;

  failedCount++; // ✅ track mistakes

  if (health <= 0) {
    endGame("Out");
    return;
  }

  // ✅ DO NOT push multiplier back into tableQueue
  popFallBubble();
}


// ─── UI CONTROLS ──────────────────────
function prepareMode() {

const showIdle = (appState === "welcome");

      if (showIdle) {
            startIdleBubbles();
        } else {
            // 🔴 STOP bubbles if any table (1-12) or Grid is selected
            stopIdleBubbles();
        }


  clearTimeout(spawnTimeout);
  falling = false;
  cancelAnimationFrame(animationId);
  gameState = "idle";
  //pressedTiles.clear();

  startBtn.querySelector("span").textContent = "play_arrow";
  endScreen.classList.add("hidden");

  // 🟢 DEFAULT: show empty hint
  emptyHint.classList.remove("hidden");

  answersEl.classList.add("hidden");
  gridBoard.classList.add("hidden");
  questionEl.textContent = "";

  if (mode === "table") {
    emptyHint.classList.add("hidden");
    answersEl.classList.remove("hidden");
    questionEl.classList.remove("hidden");
    buildTableRow();
    questionEl.textContent = `Table ${table}`;
  } else {
    emptyHint.classList.add("hidden");
    gridBoard.classList.remove("hidden");
    buildGrid();
  }
}


function screenShake() {
  const game = document.querySelector(".main");
  if (game) {
    game.classList.add("shake");
    setTimeout(() => game.classList.remove("shake"), 250);
  }
}

function showNextTablePrompt() {
console.log("🚨 showNextTablePrompt CALLED");
 /* falling = false;
  cancelAnimationFrame(animationId);
  gameState = "idle";
  startBtn.querySelector("span").textContent = "play_arrow"; // Ensure this matches your icon code

  // Custom Message based on performance
  if (failedCount > 0 || pressedTiles.size === 12 && solvedCount < 12) {
      endMessage.textContent = `⚠️ Finished with mistakes!\nGet all green to unlock Table ${table + 1}`;
      nextTableBtn.style.display = "none"; // ⛔ BLOCK NEXT LEVEL
  } else {
      endMessage.textContent = `🎉 Table ${table} complete!\nWhat next?`;
      // Show Next button only if valid table
      nextTableBtn.style.display = (table >= 15) ? "none" : "block";
  }
*/
  replayBtn.style.display = "block";
  quitBtn.style.display = "block";
  endScreen.classList.remove("hidden");
}

// ─── UPDATED ENDGAME FUNCTION ──────────
function endGame(reason = "table") {
  console.log("🟥 endGame CALLED", reason);

  gameState = "idle";
  falling = false;
  cancelAnimationFrame(animationId);

  // Ensure player exists
  if (!leaderboard[currentPlayer]) {
    leaderboard[currentPlayer] = 0;
  }

  // Save recent score
  recordRecentPlayer(currentPlayer, score);

  // Update best score
  if (score > leaderboard[currentPlayer]) {
    leaderboard[currentPlayer] = score;
    localStorage.setItem(
      "mathPopLeaderboard",
      JSON.stringify(leaderboard)
    );
  }

  const hasMistakes =
    mode === "table" &&
    document.querySelectorAll(".table-cell.wrong").length > 0;

  let titleText = "";
  let allowNext = false;

if (reason === "out" || health <= 0) {
  titleText = "💔 Out of lives!";
  allowNext = false;

} else if (hasMistakes) {
  titleText =
    "⚠️ Finished with mistakes!\nGet all green to unlock Table " +
    (table + 1);
  allowNext = false;

} else {
  titleText = `🎉 Table ${table} complete!`;
  allowNext = true;
}


  endMessage.textContent =
    `${titleText}\n\n` +
    `👤 Player: ${currentPlayer}\n` +
    `⭐ Score: ${score}\n` +
    `🏆 Best: ${leaderboard[currentPlayer]}`;

  // BUTTON VISIBILITY
  replayBtn.style.display = "block";
  restartBtn.style.display = "block";
  quitBtn.style.display = "block";

  nextTableBtn.style.display =
    allowNext && table < 15 ? "block" : "none";

  endScreen.classList.remove("hidden");
}





// ─── EVENT LISTENERS ──────────────────
startBtn.onclick = () => {
  if (appState !== "ready" && appState !== "running") return;


  unlockAudio();
  playSound("click");

  if (gameState === "idle") {
    startGame();
  } else if (gameState === "running") {
    falling = false;
    gameState = "paused";
    startBtn.querySelector("span").textContent = "play_arrow";
  } else {
    falling = true;
    gameState = "running";
    startBtn.querySelector("span").textContent = "pause";
    animationId = requestAnimationFrame(fallLoop);
  }
};


// 🛑 CHANGED: Now just prepares the board, doesn't start
restartBtn.onclick = () => {
  playSound("click");

  const confirmed = confirm(
    "Restart the game?\n\nAll progress and score will be lost."
  );
  if (!confirmed) return;

  endScreen.classList.add("hidden");

  table = 1;
  score = 0;
  health = 10;

  resetTableOnly();
  updateScoreUI();
  healthEl.textContent = health;

  updateActiveTableButton();
  prepareMode();
};




// 🛑 CHANGED: No startGame()
replayBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");

  // 🔁 Restore previous playable state
  resetTableOnly();        // clears tiles, mistakes
  health = 10;             // fresh lives
  healthEl.textContent = health;

  updateScoreUI();         // keep existing score
  prepareMode();           // rebuild same table
};



// 🛑 CHANGED: No startGame()
nextTableBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");

  // Ensure this 15 matches your max buttons
  if (table < 15) table++;
    resetTableOnly();

  tableQueue = Array.from({ length: 12 }, (_, i) => i + 1);
  shuffle(tableQueue);

  updateActiveTableButton();
  prepareMode();
};

quitBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");
  resetSession();
  gameState = "idle";
  startBtn.querySelector("span").textContent = "play_arrow";
};

// ... (Keep your modeGridBtn and table-btn code below, it is already correct)

modeGridBtn.onclick = () => {
  mode = "grid";
  playSound("click");
  exitWelcomeIfNeeded();
  modeGridBtn.classList.add("active");
  document.querySelectorAll(".table-btn").forEach(b => b.classList.remove("active"));
  prepareMode();
  //startGame();
};

document.querySelectorAll(".table-btn").forEach(btn => {
btn.onclick = () => {
  playSound("click");
  exitWelcomeIfNeeded();   // ✅ ADD

  document.querySelectorAll(".table-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  table = Number(btn.textContent.trim());
  mode = "table";
  modeGridBtn.classList.remove("active");

  prepareMode();
};

});

volumeSlider.oninput = () => {
  masterVolume = Number(volumeSlider.value);
  Object.values(sounds).forEach(s => s.volume = masterVolume);

  // OLD: volumeIcon.textContent = masterVolume === 0 ? "🔇" : "🔊";
  volumeIcon.textContent = masterVolume === 0 ? "volume_off" : "volume_up";

  syncSliderFill(volumeSlider);
};

speedSlider.oninput = () => {
  fallSpeed = Number(speedSlider.value);
  syncSliderFill(speedSlider);
};

function updateActiveTableButton() {
  document.querySelectorAll(".table-btn").forEach(btn => {
    const value = Number(btn.textContent.trim());
    btn.classList.toggle("active", value === table);
  });
}

function openSettings() {
  settingsScreen.classList.remove("hidden");

  // 🧠 Title depends on state
  if (settingsTitle) {
    settingsTitle.textContent =
      appState === "welcome" ? "👋 Welcome" : "⚙️ Settings";
  }

  // Fill input with current player (editable)
  settingsPlayerName.value = currentPlayer === "Guest" ? "" : currentPlayer;

  // Clear list
  settingsScoreList.innerHTML = "";

  if (recentPlayers.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No players yet";
    li.style.opacity = "0.6";
    settingsScoreList.appendChild(li);
  } else {
    recentPlayers.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `🏆 ${i + 1}. <strong>${p.name}</strong> — ⭐ ${p.score}`;

      // ✅ TAP = SELECT ONLY (no apply)
      li.style.cursor = "pointer";
     li.onclick = () => {
       playSound("click");

       // Fill input
       settingsPlayerName.value = p.name;

       // 🔴 Clear previous selection
       document
         .querySelectorAll(".score-list li")
         .forEach(el => el.classList.remove("active"));

       // 🟢 Mark this one as selected
       li.classList.add("active");
     };


      /* Highlight active player
      if (p.name === currentPlayer) {
        li.style.fontWeight = "bold";
        li.style.color = "#22c55e";
      }*/

      settingsScoreList.appendChild(li);
    });
  }

  updateRemovePlayerButton();
}




settingsPlayerName.onchange = () => {
  const name = settingsPlayerName.value.trim();
  if (!name) return;

setCurrentPlayer(name);

  if (!leaderboard[name]) {
    leaderboard[name] = 0;
    localStorage.setItem("mathPopLeaderboard", JSON.stringify(leaderboard));
  }
};

settingsBtn.onclick = () => {
  playSound("click");
  openSettings();
};

closeSettingsBtn.onclick = () => {
  playSound("click");
  enterLockedReadyState();
};



function recordRecentPlayer(name, score) {
console.log("recordRecentPlayer called", name, score);
  // remove existing entry for same player
  recentPlayers = recentPlayers.filter(p => p.name !== name);

  // add to front
  recentPlayers.unshift({
    name,
    score
  });

  // keep only last 5
  recentPlayers = recentPlayers.slice(0, 5);

  localStorage.setItem(
    "mathPopRecentPlayers",
    JSON.stringify(recentPlayers)
  );
}


  // turn green
setPlayerNameBtn.onclick = () => {
  playSound("click");

  const name = settingsPlayerName.value.trim() || "Guest";

  // ✅ Visual feedback
  setPlayerNameBtn.classList.add("success");

  // ✅ Apply player ONLY here
  setActivePlayer(name);

  setTimeout(() => {
   setPlayerNameBtn.classList.remove("success");

    // ✅ Close welcome/settings screen
    settingsScreen.classList.add("hidden");

    // ✅ Exit welcome → ready state
    appState = "ready";
    stopIdleBubbles();
    // ✅ Prepare board but DO NOT start game
    prepareMode();

  }, 300);
};



function addNewPlayer(name) {
  // Do nothing if already current player
  if (currentPlayer === name) return;

 setCurrentPlayer(name);

  // Initialize leaderboard score if missing
  if (!leaderboard[name]) {
    leaderboard[name] = 0;
    localStorage.setItem(
      "mathPopLeaderboard",
      JSON.stringify(leaderboard)
    );
  }

  // Add to recent players with 0 score
  recentPlayers = recentPlayers.filter(p => p.name !== name);
  recentPlayers.unshift({
    name,
    score: leaderboard[name]
  });

  recentPlayers = recentPlayers.slice(0, 5);

  localStorage.setItem(
    "mathPopRecentPlayers",
    JSON.stringify(recentPlayers)
  );
}
function renderTop5Leaderboard() {
  settingsScoreList.innerHTML = "";

  const top5 = Object.entries(leaderboard)
    .sort((a, b) => b[1] - a[1]) // highest score first
    .slice(0, 5);

  if (top5.length === 0) {
    settingsScoreList.innerHTML = "<li>No scores yet</li>";
    return;
  }

  top5.forEach(([name, score], index) => {
    const li = document.createElement("li");
    li.innerHTML = `🏆 ${index + 1}. <strong>${name}</strong> — ⭐ ${score}`;
    settingsScoreList.appendChild(li);
  });
}
function resetGameState() {
  // 1. Clear intervals and timeouts
  clearTimeout(spawnTimeout);
  cancelAnimationFrame(animationId);
  pressedTiles.clear();


  // 2. Reset counters
  health = 10;
  resetSession()
  solvedCount = 0;
  failedCount = 0;
  falling = false;
  bubbleY = 0;

  // 3. Update UI
  updateScoreUI();

  healthEl.textContent = health;
  fallArea.classList.add("hidden");

  // 4. Reset the board based on current mode
  prepareMode();
}
function isTableFinished() {
  return solvedCount === 12;
}
function resetTableOnly() {
  solvedCount = 0;
  failedCount = 0;
  pressedTiles.clear();
}
function resetSession() {
  score = 0;              // ✅ RESET TOTAL SCORE
  solvedCount = 0;
  failedCount = 0;
  health = 10;

  updateScoreUI();
  healthEl.textContent = health;

  pressedTiles.clear();
}

function updateScoreUI() {
  scoreEl.textContent = score;
}
function hasWrongTiles() {
  return document.querySelectorAll(".table-cell.wrong").length > 0;
}
function exitWelcomeIfNeeded() {
  if (appState === "welcome") {
    appState = "ready";
    stopIdleBubbles();
  }
}

function enterLockedReadyState() {
  appState = "ready"; // 🔓 allows table/grid
  gameState = "idle";

  falling = false;
  cancelAnimationFrame(animationId);
  clearTimeout(spawnTimeout);

  // Hide settings
  settingsScreen.classList.add("hidden");

  // Show bubble background
  startIdleBubbles();

  // Hide game elements
  fallArea.classList.add("hidden");

  // Show prompt
  emptyHint.classList.remove("hidden");

  answersEl.classList.add("hidden");
  gridBoard.classList.add("hidden");
  questionEl.textContent = "";

  // Start button stays inactive visually
  startBtn.querySelector("span").textContent = "play_arrow";
}



// 🔁 initial sync on load
syncPlayerUI();
appState = "welcome";
openSettings();
startIdleBubbles();
