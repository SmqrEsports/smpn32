const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start-game");
const attackButton = document.querySelector("#attack");
const healButton = document.querySelector("#heal");
const statusText = document.querySelector("#game-status");
const levelText = document.querySelector("#level");
const killsText = document.querySelector("#kills");
const gamePanel = document.querySelector(".game-panel");
const gameSetupOptions = document.querySelector(".game-setup-options");
const finishMessage = document.querySelector(".game-finish-message");
const keys = new Set();
const characterInputs = document.querySelectorAll('input[name="character"]');
const weaponInputs = document.querySelectorAll('input[name="weapon"]');
const levels = [
    { name: "Junior Minion", enemies: 5, enemyHp: 50, enemySpeed: 48, enemyDamage: 8 },
    { name: "Senior Minion", enemies: 7, enemyHp: 65, enemySpeed: 58, enemyDamage: 10 },
    { name: "Super Senior Minion", enemies: 9, enemyHp: 80, enemySpeed: 68, enemyDamage: 12 }
];
const bushes = Array.from({ length: 8 }, (_, index) => ({
    x: 120 + index * 72,
    y: index % 2 ? 67 : 327
}));
const weapons = {
    sword: { damage: 38, range: 76, cooldown: 0.55, color: "#f4cf76" },
    magic: { damage: 30, range: 210, cooldown: 0.75, color: "#b89aff" },
    bow: { damage: 32, range: 270, cooldown: 0.62, color: "#8fe0c0" }
};
const hero = { x: 100, y: 200, hp: 200, maxHp: 200, cooldown: 0, character: "male", weapon: "sword" };
const playerTower = { x: 55, y: 211, hp: 300, maxHp: 300 };
const enemyTower = { x: 665, y: 183, hp: 300, maxHp: 300 };
let enemy = null;
let turtle = createTurtle();
let kills = 0;
let levelIndex = 0;
let active = false;
let lastFrame = 0;
let attackAnimation = null;
let gameWon = false;
let gameFinished = false;
let healCooldown = 0;

function startGame() {
    const character = document.querySelector('input[name="character"]:checked');
    const weapon = document.querySelector('input[name="weapon"]:checked');
    if (!character || !weapon) return;

    hero.character = character.value;
    hero.weapon = weapon.value;
    hero.x = 360; hero.y = 200; hero.hp = hero.maxHp; hero.cooldown = 0; attackAnimation = null; healCooldown = 0;
    playerTower.hp = playerTower.maxHp;
    enemyTower.hp = enemyTower.maxHp;
    enemy = null; turtle = createTurtle(); kills = 0; levelIndex = 0; gameWon = false; gameFinished = false; active = true; lastFrame = 0; keys.clear();
    gamePanel.classList.add("has-started", "is-playing");
    gamePanel.classList.remove("is-finished");
    gameSetupOptions.hidden = false;
    finishMessage.hidden = true;
    setSelectionDisabled(true);
    updateHealButton();
    updateProgress();
    statusText.textContent = `Level 1 ${levels[0].name}: lawan minion merah dan jaga nyawamu`;
    startButton.textContent = "Sedang Bermain...";
    startButton.disabled = true;
    requestAnimationFrame(play);
}

function updateProgress() {
    levelText.textContent = levelIndex + 1;
    killsText.textContent = `${kills}/${levels[levelIndex].enemies}`;
}

function createTurtle() {
    const bush = bushes[Math.floor(Math.random() * bushes.length)];
    return {
        kind: "turtle",
        name: "Fira",
        x: bush.x + (Math.random() - 0.5) * 12,
        y: bush.y + (Math.random() - 0.5) * 8,
        hp: 180,
        maxHp: 180,
        speed: 64,
        damage: 16,
        allegiance: null,
        attackCooldown: 0
    };
}

function getTurtleLabel() {
    if (turtle.allegiance === "player") return "Fira • TIM Dimas";
    if (turtle.allegiance === "enemy") return "Fira • TIM MUSUH";
    return "Fira • NETRAL";
}

function attack() {
    if (!active || hero.cooldown > 0) return;
    const weapon = weapons[hero.weapon];
    hero.cooldown = weapon.cooldown;
    const enemyDistance = enemy ? Math.hypot(hero.x - enemy.x, hero.y - enemy.y) : Infinity;
    const turtleDistance = turtle ? Math.hypot(hero.x - turtle.x, hero.y - turtle.y) : Infinity;
    const towerDistance = Math.hypot(hero.x - enemyTower.x, hero.y - enemyTower.y);
    const hitsEnemy = enemyDistance < weapon.range;
    const hitsTurtle = !hitsEnemy && turtle && turtle.allegiance !== "player" && turtleDistance < weapon.range;
    const hitsTower = !hitsEnemy && !hitsTurtle && enemyTower.hp && towerDistance < weapon.range;
    const target = hitsEnemy
        ? { x: enemy.x, y: enemy.y }
        : hitsTurtle
            ? { x: turtle.x, y: turtle.y }
            : hitsTower
            ? { x: enemyTower.x, y: enemyTower.y }
            : enemy ? { x: enemy.x, y: enemy.y } : turtle && turtle.allegiance !== "player"
                ? { x: turtle.x, y: turtle.y }
                : { x: enemyTower.x, y: enemyTower.y };
    attackAnimation = {
        weapon: hero.weapon,
        elapsed: 0,
        duration: hero.weapon === "magic" ? 0.62 : hero.weapon === "bow" ? 0.68 : 0.44,
        startX: hero.x,
        startY: hero.y,
        targetX: target.x,
        targetY: target.y,
        targetUnit: hitsEnemy ? enemy : hitsTurtle ? turtle : null,
        hitsTarget: hitsEnemy || hitsTurtle || hitsTower,
        angle: Math.atan2(target.y - hero.y, target.x - hero.x)
    };
    if (hitsEnemy) {
        enemy.hp -= weapon.damage;
        if (enemy.hp <= 0) defeatEnemy();
    } else if (hitsTurtle) {
        if (!turtle.allegiance) turtle.allegiance = "player";
        turtle.hp -= weapon.damage;
        if (turtle.hp <= 0) turtle = null;
    } else if (hitsTower) {
        enemyTower.hp = Math.max(0, enemyTower.hp - weapon.damage);
        if (!enemyTower.hp) {
            finish(true);
        }
    }
}

function defeatEnemy() {
    enemy = null;
    kills++;
    if (kills === levels[levelIndex].enemies) {
        if (levelIndex === levels.length - 1) {
            statusText.textContent = enemyTower.hp
                ? "Semua minion telah dikalahkan. Hancurkan turet lawan!"
                : "Terima kasih telah bermain!";
            if (!enemyTower.hp) finish(true);
        } else {
            levelIndex++;
            kills = 0;
            hero.hp = Math.min(200, hero.hp + 50);
            statusText.textContent = `Level ${levelIndex + 1} ${levels[levelIndex].name}: minion lebih kuat. Nyawa dipulihkan 50.`;
        }
    }
    updateProgress();
}

function heal() {
    if (!active || healCooldown > 0 || hero.hp >= 200) return;
    hero.hp = Math.min(200, hero.hp + 100);
    healCooldown = 10;
    updateHealButton();
}

function updateHealButton() {
    const coolingDown = healCooldown > 0;
    healButton.disabled = !active || hero.hp >= 200 || coolingDown;
    healButton.textContent = coolingDown
        ? `Pulih (${Math.ceil(healCooldown)} dtk)`
        : "Pulih +100";
}

function finish(won) {
    active = false;
    gameWon = won;
    gameFinished = true;
    gamePanel.classList.remove("is-playing");
    gamePanel.classList.add("is-finished");
    gameSetupOptions.hidden = false;
    finishMessage.hidden = false;
    finishMessage.textContent = won
        ? "Dimas menang!"
        : "Dimas kalah!";
    setSelectionDisabled(false);
    updateHealButton();
    startButton.disabled = false;
    startButton.textContent = "Main Lagi";
    statusText.textContent = won ? "Terima kasih sudah bermain!" : "Ganti pilihan dan coba lagi!";
}

function play(now) {
    if (!active) { draw(); return; }
    const dt = Math.min((now - (lastFrame || now)) / 1000, 0.04);
    lastFrame = now;
    moveHero(dt);
    hero.cooldown = Math.max(0, hero.cooldown - dt);
    healCooldown = Math.max(0, healCooldown - dt);
    updateHealButton();
    if (attackAnimation) {
        attackAnimation.elapsed += dt;
        if (attackAnimation.elapsed >= attackAnimation.duration) attackAnimation = null;
    }
    const level = levels[levelIndex];
    if (!enemy && kills < level.enemies && !(attackAnimation && attackAnimation.targetUnit)) {
        enemy = {
            x: 650,
            y: 80 + Math.random() * 240,
            hp: level.enemyHp,
            maxHp: level.enemyHp,
            speed: level.enemySpeed,
            damage: level.enemyDamage,
            level: levelIndex,
            name: level.name,
            hit: 0
        };
    }
    if (enemy) moveEnemy(dt);
    if (turtle) moveTurtle(dt);
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
    const targets = [
        { unit: hero, kind: "hero", x: hero.x, y: hero.y },
        { unit: playerTower, kind: "tower", x: playerTower.x, y: playerTower.y }
    ];
    if (turtle && turtle.allegiance !== "enemy") {
        targets.push({ unit: turtle, kind: "turtle", x: turtle.x, y: turtle.y });
    }
    const target = targets.reduce((nearest, candidate) => {
        const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
        return distance < nearest.distance ? { ...candidate, distance } : nearest;
    }, { ...targets[0], distance: Infinity });
    const dx = target.x - enemy.x, dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const attackRange = target.kind === "hero" ? 34 : target.kind === "turtle" ? 40 : 40;
    if (distance > attackRange) {
        enemy.x += dx / distance * enemy.speed * dt;
        enemy.y += dy / distance * enemy.speed * dt;
    } else {
        enemy.hit -= dt;
        if (enemy.hit <= 0) {
            enemy.hit = 0.8;
            if (target.kind === "hero") {
                hero.hp = Math.max(0, hero.hp - enemy.damage);
                if (!hero.hp) finish(false);
            } else if (target.kind === "turtle") {
                if (!turtle.allegiance) turtle.allegiance = "enemy";
                turtle.hp -= enemy.damage;
                if (turtle.hp <= 0) turtle = null;
            } else {
                playerTower.hp = Math.max(0, playerTower.hp - enemy.damage);
                if (!playerTower.hp) finish(false);
            }
        }
    }
}

function moveTurtle(dt) {
    if (!turtle.allegiance) return;
    turtle.attackCooldown = Math.max(0, turtle.attackCooldown - dt);
    const alliedToPlayer = turtle.allegiance === "player";
    const target = alliedToPlayer && enemy ? enemy : alliedToPlayer ? enemyTower : playerTower;
    const dx = target.x - turtle.x, dy = target.y - turtle.y;
    const distance = Math.hypot(dx, dy) || 1;
    const attackRange = target === enemy ? 36 : 42;

    if (distance > attackRange) {
        turtle.x += dx / distance * turtle.speed * dt;
        turtle.y += dy / distance * turtle.speed * dt;
        return;
    }
    if (turtle.attackCooldown > 0) return;

    turtle.attackCooldown = 1;
    if (target === enemy) {
        enemy.hp -= turtle.damage;
        if (enemy.hp <= 0) defeatEnemy();
    } else if (alliedToPlayer) {
        enemyTower.hp = Math.max(0, enemyTower.hp - turtle.damage);
        if (!enemyTower.hp) finish(true);
    } else {
        playerTower.hp = Math.max(0, playerTower.hp - turtle.damage);
        if (!playerTower.hp) finish(false);
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
    drawTower(playerTower.x, playerTower.y, "#53a9ed", playerTower.hp, playerTower.maxHp);
    drawTower(enemyTower.x, enemyTower.y, "#ea6657", enemyTower.hp, enemyTower.maxHp);
    for (const bush of bushes) {
        const { x, y } = bush;
        ctx.fillStyle = "#164337";
        ctx.beginPath();
        ctx.ellipse(x, y + 5, 19, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#286442";
        ctx.beginPath();
        ctx.arc(x - 10, y, 9, 0, Math.PI * 2);
        ctx.arc(x, y - 5, 12, 0, Math.PI * 2);
        ctx.arc(x + 10, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#579052";
        ctx.beginPath();
        ctx.arc(x - 2, y - 7, 5, 0, Math.PI * 2);
        ctx.arc(x + 9, y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
    }
    if (turtle) drawUnit(turtle.x, turtle.y, "#70a866", getTurtleLabel(), turtle);
    const heroColor = hero.character === "female" ? "#f16ca7" : "#53a9ed";
    const lunge = attackAnimation && attackAnimation.weapon === "sword"
        ? Math.sin(Math.min(1, attackAnimation.elapsed / attackAnimation.duration) * Math.PI) * 7
        : 0;
    const heroX = hero.x + (attackAnimation && attackAnimation.weapon === "sword" ? Math.cos(attackAnimation.angle) * lunge : 0);
    const heroY = hero.y + (attackAnimation && attackAnimation.weapon === "sword" ? Math.sin(attackAnimation.angle) * lunge : 0);
    drawUnit(heroX, heroY, heroColor, "Dimas", null);
    drawWeapon(heroX, heroY);
    if (enemy) drawUnit(enemy.x, enemy.y, "#ff2929", enemy.name, enemy);
    else if (attackAnimation && attackAnimation.targetUnit) {
        drawUnit(attackAnimation.targetX, attackAnimation.targetY, "#ff2929", attackAnimation.targetUnit.name, attackAnimation.targetUnit);
    }

    if (attackAnimation) drawAttackAnimation();

    if (!active) {
        ctx.fillStyle = "#111111";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        const endMessage = gameFinished
            ? gameWon ? "Kemenangan Milik Anda Loh Ya" : "Dimas KALAH,COBA LAGI"
            : "Pilih karakter & senjata untuk memulai";
        ctx.fillStyle = "rgba(9, 23, 17, 0.78)";
        ctx.fillRect(158, 179, 404, 46);
        ctx.fillStyle = "#fbf5e8";
        ctx.font = "bold 18px Georgia, serif";
        ctx.fillText(endMessage, 360, 208);
        ctx.textAlign = "start";
    }
}

function drawAttackAnimation() {
    const progress = Math.min(1, attackAnimation.elapsed / attackAnimation.duration);
    const { weapon, startX, startY, targetX, targetY, angle } = attackAnimation;
    const easeOut = 1 - (1 - progress) ** 2;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (weapon === "sword") {
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const handX = startX + directionX * 10;
        const handY = startY + directionY * 10;
        const defaultTipX = handX + directionX * 45;
        const defaultTipY = handY + directionY * 45;
        const targetTipX = attackAnimation.hitsTarget ? targetX + directionX * 5 : defaultTipX;
        const targetTipY = attackAnimation.hitsTarget ? targetY + directionY * 5 : defaultTipY;
        const extension = progress < 0.66
            ? 1 - (1 - progress / 0.66) ** 2
            : 1 - ((progress - 0.66) / 0.34) * 0.12;
        const tipX = defaultTipX + (targetTipX - defaultTipX) * extension;
        const tipY = defaultTipY + (targetTipY - defaultTipY) * extension;
        const guardX = handX + directionX * 9;
        const guardY = handY + directionY * 9;
        const perpendicularX = -directionY;
        const perpendicularY = directionX;
        ctx.shadowColor = "#fff0a8";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#8d4d1f";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(handX - directionX * 5, handY - directionY * 5);
        ctx.lineTo(guardX, guardY);
        ctx.stroke();
        ctx.strokeStyle = "#f2c56f";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(guardX, guardY);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff3cf";
        ctx.beginPath();
        ctx.moveTo(tipX + directionX * 5, tipY + directionY * 5);
        ctx.lineTo(tipX - directionX * 2 + perpendicularX * 3, tipY - directionY * 2 + perpendicularY * 3);
        ctx.lineTo(tipX - directionX * 2 - perpendicularX * 3, tipY - directionY * 2 - perpendicularY * 3);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#d59a3c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(guardX - perpendicularX * 7, guardY - perpendicularY * 7);
        ctx.lineTo(guardX + perpendicularX * 7, guardY + perpendicularY * 7);
        ctx.stroke();
        if (attackAnimation.hitsTarget && progress > 0.55) {
            ctx.strokeStyle = "rgba(255, 239, 176, 0.95)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(targetX - 8, targetY - 7);
            ctx.lineTo(targetX + 8, targetY + 7);
            ctx.moveTo(targetX + 8, targetY - 7);
            ctx.lineTo(targetX - 8, targetY + 7);
            ctx.stroke();
        }
    } else {
        const x = startX + (targetX - startX) * easeOut;
        const y = startY + (targetY - startY) * easeOut;
        const trailEndX = startX + (x - startX) * 0.72;
        const trailEndY = startY + (y - startY) * 0.72;

        if (weapon === "magic") {
            const gradient = ctx.createLinearGradient(startX, startY, x, y);
            gradient.addColorStop(0, "rgba(184, 154, 255, 0)");
            gradient.addColorStop(1, "rgba(216, 193, 255, 0.85)");
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.stroke();
            ctx.shadowColor = "#c5a5ff";
            ctx.shadowBlur = 20;
            ctx.fillStyle = "#f1e9ff";
            ctx.beginPath();
            ctx.arc(x, y, 8 + Math.sin(progress * Math.PI) * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(205, 174, 255, 0.85)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 13 + progress * 12, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            const directionX = Math.cos(angle);
            const directionY = Math.sin(angle);
            const perpendicularX = -directionY;
            const perpendicularY = directionX;
            const arrowX = x - directionX * 13;
            const arrowY = y - directionY * 13;
            ctx.shadowColor = "#a7ffe0";
            ctx.shadowBlur = 12;
            ctx.strokeStyle = "rgba(143, 255, 213, 0.9)";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(trailEndX, trailEndY);
            ctx.stroke();
            ctx.strokeStyle = "#fffbe4";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(arrowX - directionX * 21, arrowY - directionY * 21);
            ctx.lineTo(arrowX + directionX * 10, arrowY + directionY * 10);
            ctx.stroke();
            ctx.fillStyle = "#fffbe4";
            ctx.beginPath();
            ctx.moveTo(arrowX + directionX * 17, arrowY + directionY * 17);
            ctx.lineTo(arrowX + directionX * 5 + perpendicularX * 6, arrowY + directionY * 5 + perpendicularY * 6);
            ctx.lineTo(arrowX + directionX * 5 - perpendicularX * 6, arrowY + directionY * 5 - perpendicularY * 6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#71d9ad";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(arrowX - directionX * 15, arrowY - directionY * 15);
            ctx.lineTo(arrowX - directionX * 20 + perpendicularX * 5, arrowY - directionY * 20 + perpendicularY * 5);
            ctx.moveTo(arrowX - directionX * 15, arrowY - directionY * 15);
            ctx.lineTo(arrowX - directionX * 20 - perpendicularX * 5, arrowY - directionY * 20 - perpendicularY * 5);
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
    ctx.restore();
}

function drawWeapon(x, y) {
    const weapon = weapons[hero.weapon];
    ctx.save();
    ctx.strokeStyle = weapon.color;
    ctx.fillStyle = weapon.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    if (hero.weapon === "sword") {
        const targetX = enemy ? enemy.x : enemyTower.x;
        const targetY = enemy ? enemy.y : enemyTower.y;
        const angle = active ? Math.atan2(targetY - y, targetX - x) : -Math.PI / 4;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const perpendicularX = -directionY;
        const perpendicularY = directionX;
        const handX = x + directionX * 10;
        const handY = y + directionY * 10;
        const guardX = handX + directionX * 7;
        const guardY = handY + directionY * 7;
        ctx.beginPath();
        ctx.moveTo(handX - directionX * 3, handY - directionY * 3);
        ctx.lineTo(handX + directionX * 8, handY + directionY * 8);
        ctx.strokeStyle = "#8d4d1f";
        ctx.stroke();
        ctx.strokeStyle = "#f4cf76";
        ctx.beginPath();
        ctx.moveTo(guardX, guardY);
        ctx.lineTo(guardX + directionX * 16, guardY + directionY * 16);
        ctx.moveTo(guardX - perpendicularX * 5, guardY - perpendicularY * 5);
        ctx.lineTo(guardX + perpendicularX * 5, guardY + perpendicularY * 5);
        ctx.stroke();
    } else if (hero.weapon === "magic") {
        ctx.shadowColor = weapon.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + 16, y - 12, 5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x + 7, y - 9);
        ctx.lineTo(x + 22, y - 9);
        ctx.lineTo(x + 18, y - 13);
        ctx.moveTo(x + 22, y - 9);
        ctx.lineTo(x + 18, y - 5);
        ctx.stroke();
    }
    ctx.restore();
}

function drawTower(x, y, color, hp, maxHp) {
    const uiScale = getCanvasUiScale();
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
    const healthBarWidth = 46 * uiScale;
    drawHealthBar(
        x - healthBarWidth / 2,
        y - 33 - 7 * uiScale,
        healthBarWidth,
        hp / maxHp,
        5 * uiScale
    );
}

function drawUnit(x, y, color, label, unit) {
    const uiScale = getCanvasUiScale();
    if (unit) {
        if (unit.kind === "turtle") drawTurtle(x, y, unit.allegiance);
        else drawMinion(x, y, unit.level);
    } else {
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
    }
    ctx.textAlign = "center";
    if (unit) {
        ctx.fillStyle = unit.kind === "turtle"
            ? unit.allegiance === "player" ? "rgba(17, 74, 54, 0.95)" : unit.allegiance === "enemy" ? "rgba(87, 10, 17, 0.95)" : "rgba(72, 75, 34, 0.95)"
            : "rgba(87, 10, 17, 0.9)";
        ctx.font = `bold ${9 * uiScale}px Arial`;
        const labelWidth = Math.max(unit.kind === "turtle" ? 92 * uiScale : 74 * uiScale, ctx.measureText(label.toUpperCase()).width + 12 * uiScale);
        const labelX = Math.max(
            labelWidth / 2 + 2 * uiScale,
            Math.min(canvas.width - labelWidth / 2 - 2 * uiScale, x)
        );
        const labelOffset = unit.kind === "turtle" && uiScale > 1 ? 45 : 49;
        const labelTop = y - labelOffset * uiScale;
        ctx.fillRect(labelX - labelWidth / 2, labelTop, labelWidth, 13 * uiScale);
        ctx.fillStyle = "#fff4f1";
        ctx.fillText(label.toUpperCase(), labelX, labelTop + 9 * uiScale);
        const healthBarWidth = (unit.kind === "turtle" ? 48 : 40 + unit.level * 5) * uiScale;
        drawHealthBar(x - healthBarWidth / 2, y - 32 * uiScale, healthBarWidth, unit.hp / unit.maxHp, 5 * uiScale);
    } else {
        ctx.fillStyle = "#17221c";
        ctx.font = `${12 * uiScale}px Arial`;
        ctx.fillText(label, x, y - 39 * uiScale);
        drawHealthBar(x - 22 * uiScale, y - 32 * uiScale, 44 * uiScale, hero.hp / hero.maxHp, 5 * uiScale);
    }
    ctx.textAlign = "start";
}

function drawTurtle(x, y, allegiance) {
    const shellColor = allegiance === "player" ? "#398b62" : allegiance === "enemy" ? "#a62e32" : "#718d49";
    const shellOutline = allegiance === "player" ? "#a5e3b4" : allegiance === "enemy" ? "#ffaaa0" : "#d5df93";
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(x, y + 17, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8aa65a";
    for (const [legX, legY] of [[-15, -9], [15, -9], [-15, 11], [15, 11]]) {
        ctx.beginPath();
        ctx.ellipse(x + legX, y + legY, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#9bbd6c";
    ctx.beginPath();
    ctx.arc(x + 20, y - 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8f3d0";
    ctx.beginPath();
    ctx.arc(x + 23, y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#25371f";
    ctx.beginPath();
    ctx.arc(x + 24, y - 5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = shellColor;
    ctx.strokeStyle = shellOutline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x - 2, y, 19, 15, 0, Math.PI, Math.PI * 2);
    ctx.lineTo(x + 17, y + 3);
    ctx.quadraticCurveTo(x - 2, y + 21, x - 21, y + 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 14);
    ctx.lineTo(x - 2, y + 13);
    ctx.moveTo(x - 18, y - 4);
    ctx.lineTo(x + 13, y - 4);
    ctx.moveTo(x - 14, y + 8);
    ctx.lineTo(x + 9, y + 8);
    ctx.stroke();
}

function drawMinion(x, y, level) {
    const size = 15 + level * 3;
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + size - 3, size + 2, 8 + level * 2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (level === 2) {
        ctx.strokeStyle = "rgba(255, 111, 91, 0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, size + 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = level === 0 ? "#ff2929" : level === 1 ? "#ef2028" : "#d91524";
    ctx.strokeStyle = level === 0 ? "#ffb4a8" : "#7d101b";
    ctx.lineWidth = level === 0 ? 2 : 3;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (level >= 1) {
        ctx.fillStyle = "#67202a";
        ctx.beginPath();
        ctx.moveTo(x - size * 0.72, y - size * 0.38);
        ctx.lineTo(x - size * 1.2, y - size * 1.05);
        ctx.lineTo(x - size * 0.22, y - size * 0.82);
        ctx.closePath();
        ctx.moveTo(x + size * 0.72, y - size * 0.38);
        ctx.lineTo(x + size * 1.2, y - size * 1.05);
        ctx.lineTo(x + size * 0.22, y - size * 0.82);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#96212b";
        ctx.beginPath();
        ctx.moveTo(x - size * 0.82, y + size * 0.2);
        ctx.lineTo(x - size * 1.22, y + size * 0.74);
        ctx.lineTo(x - size * 0.35, y + size * 0.65);
        ctx.closePath();
        ctx.moveTo(x + size * 0.82, y + size * 0.2);
        ctx.lineTo(x + size * 1.22, y + size * 0.74);
        ctx.lineTo(x + size * 0.35, y + size * 0.65);
        ctx.closePath();
        ctx.fill();
    }

    if (level === 2) {
        ctx.fillStyle = "#f3bd54";
        ctx.beginPath();
        ctx.moveTo(x - size * 0.62, y - size * 0.72);
        ctx.lineTo(x - size * 0.44, y - size * 1.42);
        ctx.lineTo(x, y - size * 0.95);
        ctx.lineTo(x + size * 0.44, y - size * 1.42);
        ctx.lineTo(x + size * 0.62, y - size * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffd76a";
        ctx.fillRect(x - size * 0.11, y - size * 0.98, size * 0.22, size * 0.36);
    }

    ctx.fillStyle = level === 2 ? "#ffd76a" : "#ffffff";
    const eyeY = y - size * 0.2;
    const eyeRadius = level === 2 ? 3 : 2;
    ctx.beginPath();
    ctx.arc(x - size * 0.32, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(x + size * 0.32, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = level === 0 ? "#b70e1b" : "#79121e";
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.38, size * 0.42, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawHealthBar(x, y, width, ratio, height = 5) {
    ctx.fillStyle = "#401f25";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#68e078";
    ctx.fillRect(x, y, width * Math.max(0, Math.min(1, ratio)), height);
}

function getCanvasUiScale() {
    return Math.max(1, canvas.width / canvas.clientWidth);
}

const movementKeys = new Map([
    ["ArrowUp", "up"], ["w", "up"], ["W", "up"],
    ["ArrowDown", "down"], ["s", "down"], ["S", "down"],
    ["ArrowLeft", "left"], ["a", "left"], ["A", "left"],
    ["ArrowRight", "right"], ["d", "right"], ["D", "right"]
]);

function updateSelection() {
    document.querySelectorAll(".game-choice").forEach((choice) => {
        const input = choice.querySelector("input");
        choice.classList.toggle("is-selected", input.checked);
    });
    const hasCharacter = document.querySelector('input[name="character"]:checked');
    const hasWeapon = document.querySelector('input[name="weapon"]:checked');
    if (!active && hasCharacter) hero.character = hasCharacter.value;
    if (!active && hasWeapon) hero.weapon = hasWeapon.value;
    startButton.disabled = active || (!gameFinished && (!hasCharacter || !hasWeapon));
    draw();
}

function setSelectionDisabled(disabled) {
    [...characterInputs, ...weaponInputs].forEach((input) => {
        input.disabled = disabled;
    });
    updateSelection();
}

characterInputs.forEach((input) => input.addEventListener("change", updateSelection));
weaponInputs.forEach((input) => input.addEventListener("change", updateSelection));
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
updateSelection();
draw();