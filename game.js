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
let mode = "grid";
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
  clearTimeout(spawnTimeout);
  gameState = "running";
  // OLD: startBtn.textContent = "⏸";
  startBtn.querySelector("span").textContent = "pause";
  endScreen.classList.add("hidden");
  health = 10;
  score = 0;
  solvedCount = 0;
  failedCount = 0;
  scoreEl.textContent = score;
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
  if (mode === "table") {
    if (tableQueue.length === 0) return;
    multiplier = tableQueue.shift();
    currentFallValue = table * multiplier;
    questionEl.textContent = `Target: ${currentFallValue}`; // Simplified prompt
  } else {
    const a = Math.floor(Math.random() * 12) + 1;
    const b = Math.floor(Math.random() * 12) + 1;
    currentFallValue = a * b;
  }

  fallBubble.textContent = currentFallValue;
  bubbleY = 0;
  fallBubble.style.top = "0px";
  fallBubble.style.opacity = "1";
  falling = true;
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(fallLoop);
}

function fallLoop() {
  if (!falling) return;

  bubbleY += fallSpeed * 0.4;
  fallBubble.style.top = bubbleY + "px";

  const bottomLimit = fallArea.clientHeight - fallBubble.clientHeight - 10;

  if (bubbleY >= bottomLimit) {
    falling = false;
    health--;
    healthEl.textContent = health;
    playSound("fail");

    if (health <= 0) {
      endGame("💔 Out of lives!");
      return;
    }

    // NEW: Trigger the pop animation at the bottom instead of just disappearing
    popFallBubble();
    return;
  }

  animationId = requestAnimationFrame(fallLoop);
}

function popFallBubble() {
  falling = false;
  cancelAnimationFrame(animationId);
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

// ─── BOARD BUILDING ───────────────────
function buildTableRow() {
  answersEl.innerHTML = "";

  // Creates 12 Cells, each containing "5 x 1 = ?"
  for (let i = 1; i <= 12; i++) {
    const cellValue = table * i;

    const cell = document.createElement("div");
    cell.className = "table-cell";
    // This sets the text to: 5 x 1 = ?
    cell.textContent = `${table} × ${i} = ?`;
    cell.dataset.value = cellValue;
    cell.dataset.i = i; // Store index for display update

    cell.onclick = () => {
      if (!falling) return;
      if (parseInt(cell.dataset.value) === currentFallValue) {
        // Reveal the answer: 5 x 1 = 5
        cell.textContent = `${table} × ${cell.dataset.i} = ${cell.dataset.value}`;
        cell.classList.add("correct");
        cell.onclick = null;
        score += 10;
        scoreEl.textContent = score;
        solvedCount++;
        popFallBubble();
        if (solvedCount + failedCount === 12) setTimeout(showNextTablePrompt, 600);
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
          if (parseInt(cell.dataset.value) === currentFallValue) {
            cell.classList.add("correct");
            score += 10;
            scoreEl.textContent = score;
            popFallBubble();
          } else {
            handleWrong(cell);
          }
        };
      }
      gridBoard.appendChild(cell);
    }
  }
}

function handleWrong(element) {
   // 1. Visual Feedback (Red Flash & Shake)
   element.classList.add("wrong");
   playSound("wrong");
   screenShake();
   // REMOVED: setTimeout(() => element.classList.remove("wrong"), 500);

   // 2. Penalty: Lose Score & Lose Life
   score = Math.max(0, score - 5);
   scoreEl.textContent = score;
   health--;
   healthEl.textContent = health;
   failedCount++; // Count this as a "Dead" tile

   // 3. Check for Game Over immediately
   if (health <= 0) {
       endGame("💔 Out of lives!");
       return;
   }

   // 4. Recycle Logic (Only for Table Mode)
   if (mode === "table") {
       // A. Push the CURRENT falling answer back to the queue (since we missed it)
       tableQueue.push(multiplier);

       // B. Remove the BUTTON we just broke from the queue (so we never ask for it again)
       const brokenMultiplier = parseInt(element.dataset.i);
       tableQueue = tableQueue.filter(m => m !== brokenMultiplier);
   } // 👈 THIS CLOSING BRACKET WAS MISSING!

   // 5. Burst and Spawn New Bubble (Happens in all modes)
   popFallBubble();

   // 6. Check if Level Finished (Only needed if we are tracking specific counts)
   if (solvedCount + failedCount === 12) {
       setTimeout(showNextTablePrompt, 600);
   }
}
// ─── UI CONTROLS ──────────────────────
function prepareMode() {
clearTimeout(spawnTimeout);
  falling = false;
  cancelAnimationFrame(animationId);
  gameState = "idle";
  startBtn.querySelector("span").textContent = "play_arrow";
  endScreen.classList.add("hidden");

  if (mode === "table") {
    gridBoard.classList.add("hidden");
    gridBoard.innerHTML = "";
    answersEl.classList.remove("hidden");
    questionEl.classList.remove("hidden");
    buildTableRow();
    questionEl.textContent = `Table ${table} Selected`;
  } else {
    answersEl.classList.add("hidden");
    answersEl.innerHTML = "";
    questionEl.classList.add("hidden");
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
  falling = false;
  cancelAnimationFrame(animationId);
  gameState = "idle";
  startBtn.querySelector("span").textContent = "play_arrow"; // Ensure this matches your icon code

  // Custom Message based on performance
  if (failedCount > 0) {
      endMessage.textContent = `⚠️ Finished with mistakes!\nGet all green to unlock Table ${table + 1}`;
      nextTableBtn.style.display = "none"; // ⛔ BLOCK NEXT LEVEL
  } else {
      endMessage.textContent = `🎉 Table ${table} complete!\nWhat next?`;
      // Show Next button only if valid table
      nextTableBtn.style.display = (table >= 15) ? "none" : "block";
  }

  replayBtn.style.display = "block";
  quitBtn.style.display = "block";
  endScreen.classList.remove("hidden");
}

function endGame(msg) {
  gameState = "idle";
  falling = false;
  playSound("gameover");
  startBtn.querySelector("span").textContent = "play_arrow";
  endMessage.textContent = `${msg}\n⭐ Score: ${score}`;
  nextTableBtn.style.display = "none";
  endScreen.classList.remove("hidden");
}

// ─── EVENT LISTENERS ──────────────────
startBtn.onclick = () => {
  unlockAudio();
  playSound("click");
  const icon = startBtn.querySelector("span"); // Get the icon inside

  if (gameState === "idle") {
    startGame();
  } else if (gameState === "running") {
    falling = false;
    gameState = "paused";
    icon.textContent = "play_arrow"; // Change to Play Icon
  } else {
    falling = true;
    gameState = "running";
    icon.textContent = "pause";      // Change to Pause Icon
    animationId = requestAnimationFrame(fallLoop);
  }
};

// 🛑 CHANGED: Now just prepares the board, doesn't start
restartBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");

  // Reset queue for Table Mode
  if (mode === "table") {
    tableQueue = Array.from({ length: 12 }, (_, i) => i + 1);
    shuffle(tableQueue);
  }

  prepareMode();
};

// 🛑 CHANGED: No startGame()
replayBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");
  solvedCount = 0;

  tableQueue = Array.from({ length: 12 }, (_, i) => i + 1);
  shuffle(tableQueue);

  prepareMode();
};

// 🛑 CHANGED: No startGame()
nextTableBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");

  // Ensure this 15 matches your max buttons
  if (table < 15) table++;
  solvedCount = 0;

  tableQueue = Array.from({ length: 12 }, (_, i) => i + 1);
  shuffle(tableQueue);

  updateActiveTableButton();
  prepareMode();
};

quitBtn.onclick = () => {
  playSound("click");
  endScreen.classList.add("hidden");
  falling = false;
  cancelAnimationFrame(animationId);
  gameState = "idle";
  startBtn.querySelector("span").textContent = "play_arrow";
};

// ... (Keep your modeGridBtn and table-btn code below, it is already correct)

modeGridBtn.onclick = () => {
  mode = "grid";
  playSound("click");
  modeGridBtn.classList.add("active");
  document.querySelectorAll(".table-btn").forEach(b => b.classList.remove("active"));
  prepareMode();
  //startGame();
};

document.querySelectorAll(".table-btn").forEach(btn => {
  btn.onclick = () => {
    playSound("click");
    document.querySelectorAll(".table-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    table = Number(btn.textContent.trim());
    mode = "table";
    modeGridBtn.classList.remove("active");
    prepareMode();
    //startGame();
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
