const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const startButton = document.querySelector("#start-game");
const attackButton = document.querySelector("#attack");
const healButton = document.querySelector("#heal");
const statusText = document.querySelector("#game-status");
const levelText = document.querySelector("#level");
const killsText = document.querySelector("#kills");
const gamePanel = document.querySelector(".game-panel");
const enterFullscreenButton = document.querySelector("#enter-game-fullscreen");
const exitFullscreenButton = document.querySelector("#exit-game-fullscreen");
const gameSetupOptions = document.querySelector(".game-setup-options");
const finishMessage = document.querySelector(".game-finish-message");
const keys = new Set();
const characterInputs = document.querySelectorAll('input[name="character"]');
const weaponInputs = document.querySelectorAll('input[name="weapon"]');
const minionStrengthMultiplier = 3;
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
const characters = {
    dimas: { name: "Dimas", role: "Fighter", animal: "rhino", color: "#53a9ed" },
    azzahra: { name: "Azzahra", role: "Mage", animal: "rabbit", color: "#b89aff" },
    gea: { name: "Gea", role: "Fighter", animal: "fox", color: "#f16ca7" },
    keysha: { name: "Keysha", role: "Tank", animal: "koala", color: "#67c7a3" },
    fajri: { name: "Fajri", role: "Tank", animal: "lion", color: "#e9b957" },
    afgan: { name: "Afgan", role: "Mage", animal: "ant", color: "#8b9dff" },
    fira: { name: "Fira", role: "Marksman", animal: "turtle", color: "#ff91bf" },
    rezeki: { name: "Rezeki", role: "Marksman", animal: "bull", color: "#8fe0c0" }
};
const roleStats = {
    Fighter: { hp: 115, damage: 16, range: 48, cooldown: 0.85, speed: 68, aggroRange: 620 },
    Mage: { hp: 90, damage: 14, range: 145, cooldown: 1.2, speed: 44, aggroRange: 620 },
    Tank: { hp: 160, damage: 11, range: 52, cooldown: 1.1, speed: 36, aggroRange: 620 },
    Marksman: { hp: 95, damage: 12, range: 185, cooldown: 0.9, speed: 46, aggroRange: 620 }
};
const hero = { x: 100, y: 200, hp: 200, maxHp: 200, cooldown: 0, character: "dimas", weapon: "sword" };
const playerTowers = [
    { x: 55, y: 91, hp: 300, maxHp: 300, label: "TIM 1" },
    { x: 55, y: 211, hp: 300, maxHp: 300, label: "TIM 2" },
    { x: 55, y: 331, hp: 300, maxHp: 300, label: "TIM 3" }
];
const enemyTowers = [
    { x: 665, y: 91, hp: 300, maxHp: 300, label: "MUSUH 1" },
    { x: 665, y: 211, hp: 300, maxHp: 300, label: "MUSUH 2" },
    { x: 665, y: 331, hp: 300, maxHp: 300, label: "MUSUH 3" }
];
let enemy = null;
let yayat = createYayat();
let playerTeam = [];
let enemyTeam = [];
let kills = 0;
let levelIndex = 0;
let active = false;
let lastFrame = 0;
let attackAnimation = null;
let gameWon = false;
let gameFinished = false;
let healCooldown = 0;
let welcomeTime = 0;
let minionSpawnDelay = 0;
let lastMinionCountdown = -1;

function createTeamMember(characterId, side, index) {
    const character = characters[characterId];
    const isPlayerTeam = side === "player";
    const stats = roleStats[character.role];
    const towerIndex = isPlayerTeam ? index : index < 2 ? 0 : index - 1;
    const tower = (isPlayerTeam ? playerTowers : enemyTowers)[towerIndex];
    const towerMemberIndex = !isPlayerTeam && index < 2 ? index : 0;
    const spawn = {
        x: tower.x + (isPlayerTeam ? 48 : -48),
        y: tower.y + (isPlayerTeam ? 0 : towerMemberIndex === 0 ? -24 : 24)
    };
    return {
        kind: "character",
        characterId,
        name: character.name,
        role: character.role,
        x: spawn.x,
        y: spawn.y,
        hp: stats.hp,
        maxHp: stats.hp,
        damage: stats.damage,
        range: stats.range,
        cooldown: stats.cooldown,
        speed: stats.speed,
        aggroRange: stats.aggroRange,
        attackCooldown: index * 0.15,
        side,
        homeX: spawn.x,
        homeY: spawn.y
    };
}

function assignTeams(selectedCharacter) {
    const remainingCharacters = Object.keys(characters).filter((characterId) => characterId !== selectedCharacter);
    for (let index = remainingCharacters.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [remainingCharacters[index], remainingCharacters[randomIndex]] = [remainingCharacters[randomIndex], remainingCharacters[index]];
    }
    playerTeam = remainingCharacters.slice(0, 3).map((characterId, index) =>
        createTeamMember(characterId, "player", index)
    );
    enemyTeam = remainingCharacters.slice(3).map((characterId, index) =>
        createTeamMember(characterId, "enemy", index)
    );
    // Compare health plus eight seconds of sustained damage when balancing the uneven team sizes.
    const getTeamPower = (team) => team.reduce((total, member) => {
        const stats = roleStats[member.role];
        return total + stats.hp + (stats.damage / stats.cooldown) * 8;
    }, 0);
    const enemyStrengthMultiplier = getTeamPower(playerTeam) / getTeamPower(enemyTeam);
    enemyTeam.forEach((member) => {
        const stats = roleStats[member.role];
        member.hp = Math.round(stats.hp * enemyStrengthMultiplier);
        member.maxHp = member.hp;
        member.damage = Math.max(1, Math.round(stats.damage * enemyStrengthMultiplier));
    });
}

function startGame() {
    const character = document.querySelector('input[name="character"]:checked');
    const weapon = document.querySelector('input[name="weapon"]:checked');
    if (!character || !weapon) return;

    hero.character = character.value;
    hero.weapon = weapon.value;
    assignTeams(hero.character);
    const heroSpawnTower = playerTowers[1];
    hero.x = heroSpawnTower.x + 38; hero.y = heroSpawnTower.y + 34; hero.hp = hero.maxHp; hero.cooldown = 0; attackAnimation = null; healCooldown = 0;
    [...playerTowers, ...enemyTowers].forEach((tower) => { tower.hp = tower.maxHp; });
    enemy = null; yayat = createYayat(); kills = 0; levelIndex = 0; gameWon = false; gameFinished = false; active = true; lastFrame = 0; keys.clear(); welcomeTime = 3; minionSpawnDelay = 10; lastMinionCountdown = 10;
    gamePanel.classList.add("has-started", "is-playing");
    gamePanel.classList.remove("is-finished");
    gameSetupOptions.hidden = false;
    finishMessage.hidden = true;
    setSelectionDisabled(true);
    updateHealButton();
    updateProgress();
    statusText.textContent = "WELCOME TO LAND OF HERI";
    startButton.textContent = "Mulai Game";
    startButton.disabled = true;
    requestAnimationFrame(play);
}

function updateProgress() {
    levelText.textContent = levelIndex + 1;
    killsText.textContent = `${kills}/${levels[levelIndex].enemies}`;
}

function createYayat() {
    const bush = bushes[Math.floor(Math.random() * bushes.length)];
    return {
        kind: "cow",
        name: "Yayat",
        x: bush.x + (Math.random() - 0.5) * 12,
        y: bush.y + (Math.random() - 0.5) * 8,
        hp: 500,
        maxHp: 500,
        speed: 54,
        damage: 22,
        allegiance: null,
        retaliationSide: null,
        retaliationTarget: null,
        attackCooldown: 0
    };
}

function getYayatLabel() {
    return "YAYAT";
}

function damageYayat(damage, attackingSide, attacker) {
    if (!yayat || yayat.allegiance === attackingSide) return;
    if (!yayat.allegiance) {
        yayat.retaliationSide = attackingSide;
        yayat.retaliationTarget = attacker;
    }
    yayat.hp = Math.max(0, yayat.hp - damage);
    if (yayat.hp === 0) {
        yayat.allegiance = attackingSide;
        yayat.hp = yayat.maxHp;
        yayat.attackCooldown = 0;
        yayat.retaliationSide = null;
        yayat.retaliationTarget = null;
        statusText.textContent = `Yayat bergabung dengan tim ${attackingSide === "player" ? "pemain" : "musuh"}!`;
    }
}

function damageTeamMember(member, damage) {
    const damageMultiplier = member.role === "Tank" ? 0.65 : 1;
    member.hp = Math.max(0, member.hp - Math.ceil(damage * damageMultiplier));
}

function getNearestTower(towers, x, y) {
    return towers
        .filter((tower) => tower.hp > 0)
        .reduce((nearest, tower) => {
            const distance = Math.hypot(x - tower.x, y - tower.y);
            return !nearest || distance < nearest.distance ? { tower, distance } : nearest;
        }, null)?.tower ?? null;
}

function getNearestEnemyTower(x, y) {
    return getNearestTower(enemyTowers, x, y);
}

function areEnemyTowersDestroyed() {
    return enemyTowers.every((tower) => tower.hp <= 0);
}

function arePlayerTowersDestroyed() {
    return playerTowers.every((tower) => tower.hp <= 0);
}

function getNearestAliveUnit(units, x, y) {
    return units
        .filter((unit) => unit.hp > 0)
        .reduce((nearest, unit) => {
            const distance = Math.hypot(x - unit.x, y - unit.y);
            return !nearest || distance < nearest.distance ? { unit, distance } : nearest;
        }, null);
}

function attack() {
    if (!active || hero.cooldown > 0) return;
    const weapon = weapons[hero.weapon];
    hero.cooldown = weapon.cooldown;
    const enemyCharacterTarget = getNearestAliveUnit(enemyTeam, hero.x, hero.y);
    const enemyDistance = enemy ? Math.hypot(hero.x - enemy.x, hero.y - enemy.y) : Infinity;
    const yayatDistance = yayat ? Math.hypot(hero.x - yayat.x, hero.y - yayat.y) : Infinity;
    const targetTower = getNearestEnemyTower(hero.x, hero.y);
    const towerDistance = targetTower ? Math.hypot(hero.x - targetTower.x, hero.y - targetTower.y) : Infinity;
    const hitsEnemyCharacter = Boolean(enemyCharacterTarget && enemyCharacterTarget.distance < weapon.range);
    const hitsEnemy = !hitsEnemyCharacter && enemyDistance < weapon.range;
    const hitsYayat = !hitsEnemyCharacter && !hitsEnemy && yayat && yayat.allegiance !== "player" && yayatDistance < weapon.range;
    const hitsTower = !hitsEnemyCharacter && !hitsEnemy && !hitsYayat && Boolean(targetTower && towerDistance < weapon.range);
    const target = hitsEnemyCharacter
        ? { x: enemyCharacterTarget.unit.x, y: enemyCharacterTarget.unit.y }
        : hitsEnemy
            ? { x: enemy.x, y: enemy.y }
            : hitsYayat
                ? { x: yayat.x, y: yayat.y }
                : hitsTower
                    ? { x: targetTower.x, y: targetTower.y }
                    : enemy ? { x: enemy.x, y: enemy.y } : yayat && yayat.allegiance !== "player"
                        ? { x: yayat.x, y: yayat.y }
                        : targetTower ? { x: targetTower.x, y: targetTower.y } : { x: hero.x, y: hero.y };
    attackAnimation = {
        weapon: hero.weapon,
        elapsed: 0,
        duration: hero.weapon === "magic" ? 0.62 : hero.weapon === "bow" ? 0.68 : 0.44,
        startX: hero.x,
        startY: hero.y,
        targetX: target.x,
        targetY: target.y,
        targetUnit: hitsEnemyCharacter ? enemyCharacterTarget.unit : hitsEnemy ? enemy : hitsYayat ? yayat : null,
        hitsTarget: hitsEnemyCharacter || hitsEnemy || hitsYayat || hitsTower,
        angle: Math.atan2(target.y - hero.y, target.x - hero.x)
    };
    if (hitsEnemyCharacter) {
        damageTeamMember(enemyCharacterTarget.unit, weapon.damage);
    } else if (hitsEnemy) {
        enemy.hp -= weapon.damage;
        if (enemy.hp <= 0) defeatEnemy();
    } else if (hitsYayat) {
        damageYayat(weapon.damage, "player", hero);
    } else if (hitsTower) {
        targetTower.hp = Math.max(0, targetTower.hp - weapon.damage);
        if (areEnemyTowersDestroyed()) {
            finish(true);
        }
    }
}

function defeatEnemy() {
    enemy = null;
    kills++;
    if (kills === levels[levelIndex].enemies) {
        if (levelIndex === levels.length - 1) {
            statusText.textContent = areEnemyTowersDestroyed()
                ? "Semua minion dan turet lawan telah dikalahkan!"
                : "Semua minion dikalahkan. Hancurkan semua turet lawan!";
            if (areEnemyTowersDestroyed()) finish(true);
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
        ? `${characters[hero.character].name} menang!`
        : `${characters[hero.character].name} kalah!`;
    setSelectionDisabled(false);
    updateHealButton();
    startButton.disabled = false;
    startButton.hidden = false;
    startButton.textContent = "Mulai Game";
    statusText.textContent = won ? "Terima kasih sudah bermain!" : "Ganti pilihan dan coba lagi!";
}

function play(now) {
    if (!active) { draw(); return; }
    const dt = Math.min((now - (lastFrame || now)) / 1000, 0.04);
    lastFrame = now;
    const wasWelcomeVisible = welcomeTime > 0;
    if (welcomeTime > 0) {
        welcomeTime = Math.max(0, welcomeTime - dt);
    }
    if (minionSpawnDelay > 0) {
        minionSpawnDelay = Math.max(0, minionSpawnDelay - dt);
        const countdown = Math.ceil(minionSpawnDelay);
        if (countdown !== lastMinionCountdown && !wasWelcomeVisible) {
            lastMinionCountdown = countdown;
            statusText.textContent = countdown
                ? `Minion muncul dalam ${countdown} detik.`
                : "Minion mulai berdatangan!";
        }
    } else if (!wasWelcomeVisible && welcomeTime === 0 && lastMinionCountdown > 0) {
        lastMinionCountdown = 0;
        statusText.textContent = "Minion mulai berdatangan!";
    }
    moveHero(dt);
    hero.cooldown = Math.max(0, hero.cooldown - dt);
    healCooldown = Math.max(0, healCooldown - dt);
    updateHealButton();
    if (attackAnimation) {
        attackAnimation.elapsed += dt;
        if (attackAnimation.elapsed >= attackAnimation.duration) attackAnimation = null;
    }
    const level = levels[levelIndex];
    if (!enemy && minionSpawnDelay === 0 && kills < level.enemies && !(attackAnimation && attackAnimation.targetUnit)) {
        enemy = {
            x: 650,
            y: 80 + Math.random() * 240,
            hp: level.enemyHp * minionStrengthMultiplier,
            maxHp: level.enemyHp * minionStrengthMultiplier,
            speed: level.enemySpeed,
            damage: level.enemyDamage * minionStrengthMultiplier,
            level: levelIndex,
            name: level.name,
            hit: 0
        };
    }
    if (enemy) moveEnemy(dt);
    if (yayat) moveYayat(dt);
    updateTeams(dt);
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
        ...playerTeam
            .filter((member) => member.hp > 0)
            .map((member) => ({ unit: member, kind: "character", x: member.x, y: member.y })),
        ...playerTowers
            .filter((tower) => tower.hp > 0)
            .map((tower) => ({ unit: tower, kind: "tower", x: tower.x, y: tower.y }))
    ];
    if (yayat && yayat.allegiance !== "enemy") {
        targets.push({ unit: yayat, kind: "yayat", x: yayat.x, y: yayat.y });
    }
    const target = targets.reduce((nearest, candidate) => {
        const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
        return distance < nearest.distance ? { ...candidate, distance } : nearest;
    }, { ...targets[0], distance: Infinity });
    const dx = target.x - enemy.x, dy = target.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const attackRange = target.kind === "hero" ? 34 : target.kind === "yayat" ? 42 : 40;
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
            } else if (target.kind === "yayat") {
                damageYayat(enemy.damage, "enemy", enemy);
            } else if (target.kind === "character") {
                damageTeamMember(target.unit, enemy.damage);
            } else {
                target.unit.hp = Math.max(0, target.unit.hp - enemy.damage);
                if (arePlayerTowersDestroyed()) finish(false);
            }
        }
    }
}

function moveYayat(dt) {
    yayat.attackCooldown = Math.max(0, yayat.attackCooldown - dt);
    const isPlayerAlly = yayat.allegiance === "player";
    const targets = !yayat.allegiance
        ? yayat.retaliationSide === "player"
            ? [hero, ...playerTeam.filter((member) => member.hp > 0)]
            : yayat.retaliationSide === "enemy"
                ? [...enemyTeam.filter((member) => member.hp > 0), ...(enemy ? [enemy] : [])]
                : []
        : isPlayerAlly
            ? [
            ...enemyTeam.filter((member) => member.hp > 0),
            ...(enemy ? [enemy] : []),
            ...enemyTowers.filter((tower) => tower.hp > 0)
            ]
            : [
            hero,
            ...playerTeam.filter((member) => member.hp > 0),
            ...playerTowers.filter((tower) => tower.hp > 0)
            ];
    const target = getNearestAliveUnit(targets, yayat.x, yayat.y)?.unit;
    if (!target) return;
    const distance = Math.hypot(target.x - yayat.x, target.y - yayat.y) || 1;
    const attackRange = target === enemy ? 36 : 42;

    if (distance > attackRange) {
        yayat.x += (target.x - yayat.x) / distance * yayat.speed * dt;
        yayat.y += (target.y - yayat.y) / distance * yayat.speed * dt;
        return;
    }
    if (yayat.attackCooldown > 0) return;

    yayat.attackCooldown = 1;
    if (target.role) damageTeamMember(target, yayat.damage);
    else target.hp = Math.max(0, target.hp - yayat.damage);
    if (target === enemy && target.hp === 0) defeatEnemy();
    if (enemyTeam.includes(target) && target.hp === 0) target.hp = 0;
    if (target === hero && target.hp === 0) finish(false);
    if (enemyTowers.includes(target) && areEnemyTowersDestroyed()) finish(true);
    if (playerTowers.includes(target) && arePlayerTowersDestroyed()) finish(false);
}

function updateTeamMember(member, targets, dt) {
    if (member.hp <= 0) return;
    member.attackCooldown = Math.max(0, member.attackCooldown - dt);
    const inRangeTargets = targets
        .filter((candidate) => candidate.unit.hp > 0)
        .map((candidate) => ({
            ...candidate,
            distance: Math.hypot(candidate.unit.x - member.x, candidate.unit.y - member.y)
        }))
        .filter((candidate) => candidate.distance <= member.aggroRange);
    const priority = ["character", "minion", "yayat", "tower", "hero"];
    const targetKind = priority.find((kind) => inRangeTargets.some((candidate) => candidate.kind === kind));
    const target = inRangeTargets
        .filter((candidate) => candidate.kind === targetKind)
        .reduce((nearest, candidate) => !nearest || candidate.distance < nearest.distance ? candidate : nearest, null);
    if (!target) {
        const homeDistance = Math.hypot(member.homeX - member.x, member.homeY - member.y);
        if (homeDistance > 2) {
            member.x += (member.homeX - member.x) / homeDistance * Math.min(homeDistance, member.speed * dt);
            member.y += (member.homeY - member.y) / homeDistance * Math.min(homeDistance, member.speed * dt);
        }
        return;
    }
    if (target.distance > member.range) {
        const distanceToEngage = target.distance - member.range * 0.9;
        member.x += (target.unit.x - member.x) / target.distance * Math.min(distanceToEngage, member.speed * dt);
        member.y += (target.unit.y - member.y) / target.distance * Math.min(distanceToEngage, member.speed * dt);
        return;
    }
    if (member.attackCooldown > 0) return;

    member.attackCooldown = member.cooldown;
    if (target.kind === "yayat") damageYayat(member.damage, member.side, member);
    else if (target.kind === "character") damageTeamMember(target.unit, member.damage);
    else target.unit.hp = Math.max(0, target.unit.hp - member.damage);
    if (target.kind === "hero" && target.unit.hp === 0) finish(false);
    if (target.kind === "tower" && target.unit.hp === 0) {
        if (target.side === "enemy" && areEnemyTowersDestroyed()) finish(true);
        if (target.side === "player" && arePlayerTowersDestroyed()) finish(false);
    }
    if (target.kind === "minion" && target.unit.hp === 0) defeatEnemy();
}

function updateTeams(dt) {
    const liveEnemyCharacters = enemyTeam.filter((member) => member.hp > 0);
    const livePlayerCharacters = playerTeam.filter((member) => member.hp > 0);
    for (const member of playerTeam) {
        const targets = [
            ...liveEnemyCharacters.map((unit) => ({ unit, kind: "character", side: "enemy" })),
            ...(enemy ? [{ unit: enemy, kind: "minion", side: "enemy" }] : []),
            ...(yayat && yayat.allegiance !== "player" ? [{ unit: yayat, kind: "yayat", side: "enemy" }] : []),
            ...enemyTowers.filter((tower) => tower.hp > 0).map((unit) => ({ unit, kind: "tower", side: "enemy" }))
        ];
        updateTeamMember(member, targets, dt);
    }

    for (const member of enemyTeam) {
        const targets = [
            ...livePlayerCharacters.map((unit) => ({ unit, kind: "character", side: "player" })),
            ...(!livePlayerCharacters.length ? [{ unit: hero, kind: "hero", side: "player" }] : []),
            ...(yayat && yayat.allegiance !== "enemy" ? [{ unit: yayat, kind: "yayat", side: "player" }] : []),
            ...playerTowers.filter((tower) => tower.hp > 0).map((unit) => ({ unit, kind: "tower", side: "player" }))
        ];
        updateTeamMember(member, targets, dt);
    }
}

function draw() {
    drawnLabels.length = 0;
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
    for (const tower of playerTowers) {
        drawTower(tower.x, tower.y, "#53a9ed", tower.hp, tower.maxHp, tower.label, "#68e078");
    }
    for (const tower of enemyTowers) {
        drawTower(tower.x, tower.y, "#ea6657", tower.hp, tower.maxHp, tower.label, "#f05b5b");
    }
    ctx.textAlign = "center";
    ctx.font = "bold 10px Arial";
    ctx.fillStyle = "#d9efff";
    ctx.fillText("TIM PEMAIN", 105, 30);
    ctx.fillStyle = "#ffe2dc";
    ctx.fillText("TIM MUSUH", 615, 30);
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
    if (yayat) drawUnit(yayat.x, yayat.y, "#f4f0dd", getYayatLabel(), yayat);
    for (const member of playerTeam) {
        if (member.hp > 0) drawUnit(member.x, member.y, characters[member.characterId].color, member.name, member);
    }
    for (const member of enemyTeam) {
        if (member.hp > 0) drawUnit(member.x, member.y, characters[member.characterId].color, member.name, member);
    }
    const character = characters[hero.character];
    const lunge = attackAnimation && attackAnimation.weapon === "sword"
        ? Math.sin(Math.min(1, attackAnimation.elapsed / attackAnimation.duration) * Math.PI) * 7
        : 0;
    const heroX = hero.x + (attackAnimation && attackAnimation.weapon === "sword" ? Math.cos(attackAnimation.angle) * lunge : 0);
    const heroY = hero.y + (attackAnimation && attackAnimation.weapon === "sword" ? Math.sin(attackAnimation.angle) * lunge : 0);
    drawUnit(heroX, heroY, character.color, character.name, null);
    drawWeapon(heroX, heroY);
    if (enemy) drawUnit(enemy.x, enemy.y, "#ff2929", enemy.name, enemy);
    else if (attackAnimation && attackAnimation.targetUnit?.level !== undefined) {
        drawUnit(attackAnimation.targetX, attackAnimation.targetY, "#ff2929", attackAnimation.targetUnit.name, attackAnimation.targetUnit);
    }

    if (attackAnimation) drawAttackAnimation();

    if (welcomeTime > 0) {
        ctx.fillStyle = "#f5d68e";
        ctx.strokeStyle = "rgba(5, 18, 13, .9)";
        ctx.lineWidth = 5;
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        ctx.strokeText("WELCOME TO LAND OF HERI", 360, 196);
        ctx.fillText("WELCOME TO LAND OF HERI", 360, 196);
        ctx.fillStyle = "#f3f2e8";
        ctx.font = "bold 11px Arial";
        ctx.strokeText("3 REKAN TIM  •  4 MUSUH", 360, 217);
        ctx.fillText("3 REKAN TIM  •  4 MUSUH", 360, 217);
        ctx.lineWidth = 1;
        ctx.textAlign = "start";
    }

    if (!active) {
        ctx.fillStyle = "#111111";
        ctx.font = "bold 24px Arial";
        ctx.textAlign = "center";
        const endMessage = gameFinished
            ? gameWon ? "Kemenangan Milik Anda Loh Ya" : `${character.name} KALAH, COBA LAGI`
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
        const targetTower = getNearestEnemyTower(x, y);
        const targetX = enemy ? enemy.x : targetTower ? targetTower.x : x + 1;
        const targetY = enemy ? enemy.y : targetTower ? targetTower.y : y;
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

function drawTower(x, y, color, hp, maxHp, label = "TURET TIM", healthColor = "#68e078") {
    const uiScale = getCanvasUiScale();
    ctx.fillStyle = hp > 0 ? color : "#59665e";
    ctx.fillRect(x - 18, y - 24, 36, 48);
    ctx.fillStyle = "#263238";
    ctx.fillRect(x - 23, y - 29, 46, 10);
    ctx.fillRect(x - 23, y + 19, 46, 10);
    ctx.fillRect(x - 7, y - 33, 14, 66);
    ctx.fillStyle = hp > 0 ? "#ffffff" : "#c6cec9";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.fillText(hp > 0 ? label : "HANCUR", x, y + 5);
    ctx.textAlign = "start";
    const healthBarWidth = 46 * uiScale;
    drawHealthBar(
        x - healthBarWidth / 2,
        y - 33 - 7 * uiScale,
        healthBarWidth,
        hp / maxHp,
        5 * uiScale,
        healthColor
    );
}

function drawUnit(x, y, color, label, unit) {
    const uiScale = getCanvasUiScale();
    if (unit) {
        if (unit.kind === "cow") drawCow(x, y, unit.allegiance);
        else if (unit.kind === "character") drawAnimalCharacter(x, y, characters[unit.characterId]);
        else drawMinion(x, y, unit.level);
    } else {
        drawAnimalCharacter(x, y, characters[hero.character]);
    }
    if (unit) {
        const labelColor = unit.kind === "character" && unit.side === "player" || unit.kind === "cow" && unit.allegiance === "player"
            ? "rgba(15, 49, 38, .95)"
            : "rgba(24, 20, 21, .95)";
        const labelOffset = unit.kind === "character" ? 46 : unit.kind === "cow" ? 49 : 53;
        drawNameLabel(label.toUpperCase(), x, y, labelColor, 9 * uiScale, labelOffset * uiScale);
        const healthBarWidth = (unit.kind === "cow" ? 58 : unit.kind === "character" ? 38 : 40 + unit.level * 5) * uiScale;
        const healthBarHeight = (unit.kind === "cow" ? 10 : 5) * uiScale;
        const healthColor = unit.kind === "cow"
            ? unit.allegiance === "enemy" ? "#f05b5b" : "#68e078"
            : unit.kind === "character" && unit.side === "player" ? "#68e078" : "#f05b5b";
        drawHealthBar(x - healthBarWidth / 2, y - (unit.kind === "cow" ? 34 : 32) * uiScale, healthBarWidth, unit.hp / unit.maxHp, healthBarHeight, healthColor);
    } else {
        drawNameLabel(label, x, y, "rgba(10, 25, 18, .95)", 12 * uiScale, 43 * uiScale, "#ffffff");
        drawHealthBar(x - 22 * uiScale, y - 32 * uiScale, 44 * uiScale, hero.hp / hero.maxHp, 5 * uiScale, "#68e078");
    }
}

function drawNameLabel(text, x, y, outlineColor, fontSize, preferredOffset, fillColor = "#fff4f1") {
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    const width = ctx.measureText(text).width;
    const labelX = Math.max(width / 2 + 3, Math.min(canvas.width - width / 2 - 3, x));
    const candidates = Array.from({ length: 15 }, (_, index) => preferredOffset + fontSize * 1.45 * index);
    candidates.push(-fontSize * 2.5, -fontSize * 4);
    let baseline = y - preferredOffset;
    for (const offset of candidates) {
        const candidateBaseline = y - offset;
        const bounds = {
            left: labelX - width / 2 - 2,
            right: labelX + width / 2 + 2,
            top: candidateBaseline - fontSize,
            bottom: candidateBaseline + 3
        };
        const fits = bounds.top >= 3 && bounds.bottom <= canvas.height - 3;
        const overlaps = drawnLabels.some((label) =>
            bounds.left < label.right && bounds.right > label.left &&
            bounds.top < label.bottom && bounds.bottom > label.top
        );
        if (fits && !overlaps) {
            baseline = candidateBaseline;
            drawnLabels.push(bounds);
            break;
        }
    }
    ctx.lineWidth = Math.max(2, fontSize * .28);
    ctx.lineJoin = "round";
    ctx.strokeStyle = outlineColor;
    ctx.strokeText(text, labelX, baseline);
    ctx.fillStyle = fillColor;
    ctx.fillText(text, labelX, baseline);
    ctx.textAlign = "start";
}

function drawCow(x, y, allegiance) {
    const outline = allegiance === "player" ? "#6ac7ec" : allegiance === "enemy" ? "#f07a75" : "#e0c878";
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, .32)";
    ctx.beginPath();
    ctx.ellipse(x, y + 17, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4f0dd";
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x - 2, y + 1, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#34343a";
    ctx.beginPath();
    ctx.ellipse(x - 8, y - 5, 6, 7, -.35, 0, Math.PI * 2);
    ctx.ellipse(x + 5, y + 4, 7, 6, .35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f4f0dd";
    ctx.beginPath();
    ctx.arc(x + 18, y - 5, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e9c7b8";
    ctx.beginPath();
    ctx.ellipse(x + 24, y, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f7f0d3";
    ctx.beginPath();
    ctx.moveTo(x + 12, y - 13);
    ctx.lineTo(x + 10, y - 21);
    ctx.lineTo(x + 17, y - 16);
    ctx.moveTo(x + 23, y - 15);
    ctx.lineTo(x + 29, y - 21);
    ctx.lineTo(x + 29, y - 12);
    ctx.fill();
    ctx.fillStyle = "#303039";
    ctx.beginPath();
    ctx.arc(x + 21, y - 8, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f4f0dd";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 13, y + 11);
    ctx.lineTo(x - 13, y + 18);
    ctx.moveTo(x + 7, y + 11);
    ctx.lineTo(x + 7, y + 18);
    ctx.stroke();
    ctx.restore();
}

function drawAnimalCharacter(x, y, character) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 13, 19, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (character.animal === "turtle") {
        drawTurtle(0, 0, "player");
        ctx.restore();
        return;
    }

    ctx.fillStyle = character.color;
    if (character.animal === "rabbit") {
        ctx.beginPath();
        ctx.ellipse(-7, -19, 5, 13, -.22, 0, Math.PI * 2);
        ctx.ellipse(7, -19, 5, 13, .22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4b8d5";
        ctx.beginPath();
        ctx.ellipse(-7, -19, 2, 8, -.22, 0, Math.PI * 2);
        ctx.ellipse(7, -19, 2, 8, .22, 0, Math.PI * 2);
        ctx.fill();
    } else if (character.animal === "fox" || character.animal === "koala" || character.animal === "bull") {
        ctx.beginPath();
        if (character.animal === "koala") {
            ctx.arc(-14, -9, 8, 0, Math.PI * 2);
            ctx.arc(14, -9, 8, 0, Math.PI * 2);
        } else {
            ctx.moveTo(-14, -8);
            ctx.lineTo(-17, -22);
            ctx.lineTo(-4, -15);
            ctx.lineTo(0, -11);
            ctx.lineTo(4, -15);
            ctx.lineTo(17, -22);
            ctx.lineTo(14, -8);
            ctx.closePath();
        }
        ctx.fill();
        if (character.animal === "koala") {
            ctx.fillStyle = "#d7b6a3";
            ctx.beginPath();
            ctx.arc(-14, -9, 4, 0, Math.PI * 2);
            ctx.arc(14, -9, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (character.animal === "lion") {
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.fill();
    } else if (character.animal === "ant") {
        ctx.fillStyle = "#5961a9";
        ctx.beginPath();
        ctx.arc(-13, 1, 8, 0, Math.PI * 2);
        ctx.arc(13, 1, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5961a9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -12);
        ctx.quadraticCurveTo(-15, -24, -17, -20);
        ctx.moveTo(5, -12);
        ctx.quadraticCurveTo(15, -24, 17, -20);
        ctx.stroke();
    } else if (character.animal === "rhino") {
        ctx.fillStyle = "#a4d7f5";
        ctx.beginPath();
        ctx.moveTo(5, -9);
        ctx.lineTo(18, -14);
        ctx.lineTo(12, -3);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(0, 0, character.animal === "lion" ? 15 : 14, 0, Math.PI * 2);
    ctx.fill();

    if (character.animal === "fox") {
        ctx.fillStyle = "#fff0dc";
        ctx.beginPath();
        ctx.moveTo(-9, 2);
        ctx.lineTo(0, 14);
        ctx.lineTo(9, 2);
        ctx.quadraticCurveTo(0, -1, -9, 2);
        ctx.fill();
    } else if (character.animal === "lion") {
        ctx.fillStyle = "#f5d08a";
        ctx.beginPath();
        ctx.arc(0, 1, 10, 0, Math.PI * 2);
        ctx.fill();
    } else if (character.animal === "bull") {
        ctx.fillStyle = "#f5e5c8";
        ctx.beginPath();
        ctx.moveTo(-8, -9);
        ctx.quadraticCurveTo(-20, -20, -14, -4);
        ctx.quadraticCurveTo(-11, 0, -8, -2);
        ctx.moveTo(8, -9);
        ctx.quadraticCurveTo(20, -20, 14, -4);
        ctx.quadraticCurveTo(11, 0, 8, -2);
        ctx.fill();
    } else if (character.animal === "rhino") {
        ctx.fillStyle = "#d9edfa";
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(19, -9);
        ctx.lineTo(14, 1);
        ctx.closePath();
        ctx.fill();
    } else if (character.animal === "koala") {
        ctx.fillStyle = "#26343e";
        ctx.beginPath();
        ctx.ellipse(0, 4, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
    } else if (character.animal === "ant") {
        ctx.fillStyle = "#424b91";
        ctx.beginPath();
        ctx.ellipse(0, 10, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-5, -3, 2, 0, Math.PI * 2);
    ctx.arc(5, -3, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#263238";
    ctx.beginPath();
    ctx.arc(-5, -3, 1, 0, Math.PI * 2);
    ctx.arc(5, -3, 1, 0, Math.PI * 2);
    ctx.fill();

    if (character.animal === "rabbit") {
        ctx.fillStyle = "#f19fbe";
        ctx.beginPath();
        ctx.arc(0, 4, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
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

function drawHealthBar(x, y, width, ratio, height = 5, fillColor = "#68e078") {
    ctx.fillStyle = "#401f25";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = fillColor;
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
const drawnLabels = [];

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

async function enterGameFullscreen() {
    if (!gamePanel.requestFullscreen) {
        statusText.textContent = "Layar penuh tidak didukung browser ini.";
        return;
    }
    try {
        await gamePanel.requestFullscreen();
    } catch (error) {
        console.error("Tidak dapat membuka game dalam layar penuh.", error);
        statusText.textContent = "Layar penuh tidak dapat dibuka. Coba gunakan browser lain.";
    }
}

async function exitGameFullscreen() {
    if (!document.fullscreenElement) return;
    try {
        await document.exitFullscreen();
    } catch (error) {
        console.error("Tidak dapat keluar dari layar penuh.", error);
        statusText.textContent = "Layar penuh tidak dapat ditutup. Gunakan tombol kembali browser.";
    }
}

document.addEventListener("fullscreenchange", () => {
    const isFullscreen = document.fullscreenElement === gamePanel;
    gamePanel.classList.toggle("is-fullscreen", isFullscreen);
    enterFullscreenButton.hidden = isFullscreen;
    exitFullscreenButton.hidden = !isFullscreen;
    if (!isFullscreen) keys.clear();
});

characterInputs.forEach((input) => input.addEventListener("change", updateSelection));
weaponInputs.forEach((input) => input.addEventListener("change", updateSelection));
startButton.addEventListener("click", startGame);
attackButton.addEventListener("click", attack);
healButton.addEventListener("click", heal);
enterFullscreenButton.addEventListener("click", enterGameFullscreen);
exitFullscreenButton.addEventListener("click", exitGameFullscreen);

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