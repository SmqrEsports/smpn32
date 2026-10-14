const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start-game");
const attackButton = document.querySelector("#attack");
const healButton = document.querySelector("#heal");
const statusText = document.querySelector("#game-status");
const healthText = document.querySelector("#health");
const levelText = document.querySelector("#level");
const killsText = document.querySelector("#kills");
const towerHealthText = document.querySelector("#tower-health");
const keys = new Set();
const levels = [
    { enemies: 5, enemyHp: 50, enemySpeed: 48, enemyDamage: 8 },
    { enemies: 7, enemyHp: 65, enemySpeed: 58, enemyDamage: 10 },
    { enemies: 9, enemyHp: 80, enemySpeed: 68, enemyDamage: 12 }
];
const hero = { x: 100, y: 200, hp: 100, cooldown: 0 };
const enemyTower = { x: 665, y: 183, hp: 300, maxHp: 300 };
let enemy = null;
let kills = 0;
let levelIndex = 0;
let active = false;
let lastFrame = 0;
let attackFlash = 0;
let gameWon = false;
let gameFinished = false;
let healCooldown = 0;

function startGame() {
    hero.x = 250; hero.y = 200; hero.hp = 200; hero.cooldown = 0; attackFlash = 0; healCooldown = 0;
    enemyTower.hp = enemyTower.maxHp;
    enemy = null; kills = 0; levelIndex = 0; gameWon = false; gameFinished = false; active = true; lastFrame = 0; keys.clear();
    healthText.textContent = hero.hp;
    towerHealthText.textContent = `${enemyTower.hp}/${enemyTower.maxHp}`;
    updateHealButton();
    updateProgress();
    statusText.textContent = "Level 1: lawan minion merah dan jaga nyawamu";
    startButton.textContent = "Sedang Bermain...";
    startButton.disabled = true;
    requestAnimationFrame(play);
}

function updateProgress() {
    levelText.textContent = levelIndex + 1;
    killsText.textContent = `${kills}/${levels[levelIndex].enemies}`;
}

function attack() {
    if (!active || hero.cooldown > 0) return;
    hero.cooldown = 0.45;
    attackFlash = 0.22;
    if (enemy && Math.hypot(hero.x - enemy.x, hero.y - enemy.y) < 78) {
        enemy.hp -= 25;
        if (enemy.hp <= 0) {
            enemy = null; kills++;
            if (kills === levels[levelIndex].enemies) {
                if (levelIndex === levels.length - 1) {
                    statusText.textContent = enemyTower.hp
                        ? "semua minion telah mati sekarang ayo hancurkan turet."
                        : "Terimakasih Telah Bermain Game Ini, Semoga Menyenangkan";
                    if (!enemyTower.hp) finish(true);
                } else {
                    levelIndex++;
                    kills = 0;
                    hero.hp = Math.min(200, hero.hp + 50);
                    healthText.textContent = hero.hp;
                    statusText.textContent = `Level ${levelIndex + 1}: minion lebih kuat. Nyawa dipulihkan 50.`;
                }
            }
            updateProgress();
        }
    } else if (enemyTower.hp && Math.hypot(hero.x - enemyTower.x, hero.y - enemyTower.y) < 82) {
        enemyTower.hp = Math.max(0, enemyTower.hp - 25);
        towerHealthText.textContent = `${enemyTower.hp}/${enemyTower.maxHp}`;
        if (!enemyTower.hp) {
            finish(true);
        }
    }
}

function heal() {
    if (!active || healCooldown > 0 || hero.hp >= 200) return;
    hero.hp = Math.min(200, hero.hp + 100);
    healCooldown = 10;
    healthText.textContent = hero.hp;
    
    updateHealButton();
}

function updateHealButton() {
    const coolingDown = healCooldown > 0;
    healButton.disabled = !active || hero.hp >= 200 || coolingDown;
    healButton.textContent = coolingDown
        ? `Pulihkan (${Math.ceil(healCooldown)} dtk)`
        : "Pulihkan Darah (+100)";
}

function finish(won) {
    active = false;
    gameWon = won;
    gameFinished = true;
    updateHealButton();
    startButton.disabled = false;
    startButton.textContent = "Main Lagi";
    statusText.textContent = won ? "Kemenangan Milik Anda Loh Ya" : "KAMU KALAH,COBA LAGI";
}

function play(now) {
    if (!active) { draw(); return; }
    const dt = Math.min((now - (lastFrame || now)) / 1000, 0.04);
    lastFrame = now;
    moveHero(dt);
    hero.cooldown = Math.max(0, hero.cooldown - dt);
    healCooldown = Math.max(0, healCooldown - dt);
    updateHealButton();
    attackFlash = Math.max(0, attackFlash - dt);
    const level = levels[levelIndex];
    if (!enemy && kills < level.enemies) {
        enemy = {
            x: 650,
            y: 80 + Math.random() * 240,
            hp: level.enemyHp,
            maxHp: level.enemyHp,
            speed: level.enemySpeed,
            damage: level.enemyDamage,
            hit: 0
        };
    }
    if (enemy) moveEnemy(dt);
    draw();
    if (active) requestAnimationFrame(play);
}

function moveHero(dt) {
    let dx = Number(keys.has("right")) - Number(keys.has("left"));
    let dy = Number(keys.has("down")) - Number(keys.has("up"));
    const length = Math.hypot(dx, dy) || 1;
    hero.x = Math.max(24, Math.min(696, hero.x + dx / length * 190 * dt));
    hero.y = Math.max(45, Math.min(376, hero.y + dy / length * 190 * dt));
}

function moveEnemy(dt) {
    const dx = hero.x - enemy.x, dy = hero.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance > 34) {
        enemy.x += dx / distance * enemy.speed * dt;
        enemy.y += dy / distance * enemy.speed * dt;
    } else {
        enemy.hit -= dt;
        if (enemy.hit <= 0) {
            hero.hp = Math.max(0, hero.hp - enemy.damage);
            healthText.textContent = hero.hp;
            enemy.hit = 0.8;
            if (!hero.hp) finish(false);
        }
    }
}

function draw() {
    const grass = ctx.createLinearGradient(0, 0, 720, 400);
    grass.addColorStop(0, "#2b6748"); grass.addColorStop(1, "#173c35");
    ctx.fillStyle = grass; ctx.fillRect(0, 0, 720, 400);
    for (let i = 0; i < 48; i++) {
        const x = (i * 139 + 23) % 720, y = (i * 83 + 17) % 400;
        ctx.fillStyle = i % 2 ? "#4c8650" : "#80a95a";
        ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#827d61"; ctx.beginPath(); ctx.moveTo(0, 174); ctx.lineTo(720, 133); ctx.lineTo(720, 239); ctx.lineTo(0, 260); ctx.fill();
    ctx.strokeStyle = "#c9b77b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 181); ctx.lineTo(720, 140); ctx.moveTo(0, 252); ctx.lineTo(720, 232); ctx.stroke();
    ctx.strokeStyle = "#e9d591"; ctx.lineWidth = 2; ctx.setLineDash([12, 12]);
    ctx.beginPath(); ctx.moveTo(0, 217); ctx.lineTo(720, 185); ctx.stroke(); ctx.setLineDash([]);
    drawTower(55, 211, "#53a9ed");
    drawTower(enemyTower.x, enemyTower.y, "#ea6657", enemyTower.hp, enemyTower.maxHp);
    for (let i = 0; i < 8; i++) {
        const x = 120 + i * 72, y = i % 2 ? 67 : 327;
        ctx.fillStyle = "#164337"; ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#33734a"; ctx.beginPath(); ctx.arc(x - 4, y - 5, 10, 0, Math.PI * 2); ctx.fill();
    }
    drawUnit(hero.x, hero.y, "#53a9ed", "Kamu", null);
    if (enemy) drawUnit(enemy.x, enemy.y, "#ea6657", "Minion", enemy);

    if (attackFlash > 0) {
        ctx.strokeStyle = "#fff2a8";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(hero.x, hero.y, 40 + (0.22 - attackFlash) * 90, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (!active) {
        ctx.fillStyle = "#111111";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        const endMessage = gameFinished
            ? gameWon ? "Kemenangan Milik Anda Loh Ya" : "KAMU KALAH,COBA LAGI"
            : "Tekan Mulai Game untuk Mulai";
        ctx.fillText(endMessage, 360, 207);
        ctx.textAlign = "start";
    }
}

function drawTower(x, y, color, hp, maxHp) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 18, y - 24, 36, 48);
    ctx.fillStyle = "#263238";
    ctx.fillRect(x - 23, y - 29, 46, 10);
    ctx.fillRect(x - 23, y + 19, 46, 10);
    ctx.fillRect(x - 7, y - 33, 14, 66);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("TURET", x, y + 5);
    ctx.textAlign = "start";
    if (typeof hp === "number" && typeof maxHp === "number") {
        drawHealthBar(x - 24, y - 43, 48, hp / maxHp);
    }
}

function drawUnit(x, y, color, label, unit) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 17, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17221c";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y - 22);
    ctx.textAlign = "start";
    if (unit) drawHealthBar(x - 20, y - 30, 40, unit.hp / unit.maxHp);
}

function drawHealthBar(x, y, width, ratio) {
    ctx.fillStyle = "#401f25";
    ctx.fillRect(x, y, width, 5);
    ctx.fillStyle = "#68e078";
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), 5);
}

const movementKeys = new Map([
    ["ArrowUp", "up"], ["w", "up"], ["W", "up"],
    ["ArrowDown", "down"], ["s", "down"], ["S", "down"],
    ["ArrowLeft", "left"], ["a", "left"], ["A", "left"],
    ["ArrowRight", "right"], ["d", "right"], ["D", "right"]
]);

startButton.addEventListener("click", startGame);
attackButton.addEventListener("click", attack);
healButton.addEventListener("click", heal);

document.addEventListener("keydown", (event) => {
    const direction = movementKeys.get(event.key);
    if (direction && active) {
        keys.add(direction);
        event.preventDefault();
    } else if (event.code === "Space" && active) {
        event.preventDefault();
        attack();
    }
});

document.addEventListener("keyup", (event) => {
    const direction = movementKeys.get(event.key);
    if (direction) keys.delete(direction);
});

document.querySelectorAll("[data-direction]").forEach((button) => {
    const direction = button.dataset.direction;
    button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (active) keys.add(direction);
    });
    button.addEventListener("pointerup", () => keys.delete(direction));
    button.addEventListener("pointerleave", () => keys.delete(direction));
    button.addEventListener("pointercancel", () => keys.delete(direction));
});

window.addEventListener("blur", () => keys.clear());
updateHealButton();
draw();