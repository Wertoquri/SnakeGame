const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scale = 20;
const rows = canvas.height / scale;
const columns = canvas.width / scale;
const defaultSpeed = 250;
const minSpeed = 100;
const defaultSnakeColor = "#00ff7f";
const obstacleColor = "#8a2be2";
const enemyColor = "#ff4500";
const savePrefix = "snakeGameSave_";
const autoSaveKey = "snakeGameAutoSave";
const bestScoreKey = "snakeGameBestScore";
const specialFruitInterval = 6;
const enemyCount = 2;
const enemyMoveChange = 0.12;

let gameInterval = null;
let gameState = {
    speed: defaultSpeed,
    snakeColor: defaultSnakeColor,
    score: 0,
    level: 1,
    isPaused: false,
    isGameOver: false,
    status: "Ready",
    theme: "dark",
    highScore: Number(localStorage.getItem(bestScoreKey)) || 0,
    snake: null,
    fruit: null,
    specialFruit: null,
    obstacles: [],
    enemies: []
};

function getSavedObject(key) {
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        return null;
    }
}

function saveObject(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function positionMatches(a, b) {
    return a.x === b.x && a.y === b.y;
}

function randomPosition() {
    return {
        x: Math.floor(Math.random() * columns) * scale,
        y: Math.floor(Math.random() * rows) * scale
    };
}

function findEmptyPosition(excludeList = []) {
    let position;
    const maxAttempts = 200;
    let attempts = 0;

    do {
        position = randomPosition();
        attempts += 1;
    } while (excludeList.some(item => positionMatches(item, position)) && attempts < maxAttempts);

    return position;
}

function collectBlockedPositions() {
    const blocked = [
        ...gameState.snake.body,
        ...gameState.obstacles.map(o => ({ x: o.x, y: o.y })),
        ...gameState.enemies.flatMap(enemy => enemy.body.map(segment => ({ x: segment.x, y: segment.y })))
    ];
    if (gameState.fruit) {
        blocked.push({ x: gameState.fruit.x, y: gameState.fruit.y });
    }
    if (gameState.specialFruit) {
        blocked.push({ x: gameState.specialFruit.x, y: gameState.specialFruit.y });
    }
    return blocked;
}

function Snake(data = {}) {
    this.body = Array.isArray(data.body) && data.body.length ? data.body.slice() : [{ x: 0, y: 0 }];
    this.xSpeed = data.xSpeed ?? scale;
    this.ySpeed = data.ySpeed ?? 0;
    this.color = data.color || gameState.snakeColor;
    this.growSegments = data.growSegments || 0;
}

Snake.prototype.draw = function () {
    ctx.fillStyle = this.color;
    this.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, scale, scale);
    });
};

Snake.prototype.update = function () {
    const head = this.body[this.body.length - 1];
    const nextHead = {
        x: head.x + this.xSpeed,
        y: head.y + this.ySpeed
    };

    if (nextHead.x >= canvas.width) {
        nextHead.x = 0;
    }
    if (nextHead.x < 0) {
        nextHead.x = canvas.width - scale;
    }
    if (nextHead.y >= canvas.height) {
        nextHead.y = 0;
    }
    if (nextHead.y < 0) {
        nextHead.y = canvas.height - scale;
    }

    this.body.push(nextHead);
    if (this.growSegments > 0) {
        this.growSegments -= 1;
    } else {
        this.body.shift();
    }
};

Snake.prototype.changeDirection = function (direction) {
    const currentX = this.xSpeed;
    const currentY = this.ySpeed;

    switch (direction) {
        case 'Up':
        case 'w':
        case 'W':
            if (currentY === 0) {
                this.xSpeed = 0;
                this.ySpeed = -scale;
            }
            break;
        case 'Down':
        case 's':
        case 'S':
            if (currentY === 0) {
                this.xSpeed = 0;
                this.ySpeed = scale;
            }
            break;
        case 'Left':
        case 'a':
        case 'A':
            if (currentX === 0) {
                this.xSpeed = -scale;
                this.ySpeed = 0;
            }
            break;
        case 'Right':
        case 'd':
        case 'D':
            if (currentX === 0) {
                this.xSpeed = scale;
                this.ySpeed = 0;
            }
            break;
    }
};

Snake.prototype.eats = function (target) {
    const head = this.body[this.body.length - 1];
    return head.x === target.x && head.y === target.y;
};

Snake.prototype.collidesWithSelf = function () {
    const head = this.body[this.body.length - 1];
    return this.body.slice(0, -1).some(segment => positionMatches(segment, head));
};

Snake.prototype.grow = function (segments = 1) {
    this.growSegments += segments;
};

function Fruit(data = {}) {
    this.type = data.type || 'normal';
    this.x = data.x;
    this.y = data.y;
    if (this.x === undefined || this.y === undefined) {
        this.pickLocation(data.exclude);
    }
}

Fruit.prototype.pickLocation = function (exclude = []) {
    const position = findEmptyPosition(exclude);
    this.x = position.x;
    this.y = position.y;
};

Fruit.prototype.draw = function () {
    ctx.fillStyle = this.type === 'special' ? '#ffd700' : '#f00';
    ctx.fillRect(this.x, this.y, scale, scale);
};

function Obstacle(data = {}) {
    this.x = data.x;
    this.y = data.y;
    if (this.x === undefined || this.y === undefined) {
        this.pickLocation(data.exclude);
    }
}

Obstacle.prototype.pickLocation = function (exclude = []) {
    const position = findEmptyPosition(exclude);
    this.x = position.x;
    this.y = position.y;
};

Obstacle.prototype.draw = function () {
    ctx.fillStyle = obstacleColor;
    ctx.fillRect(this.x, this.y, scale, scale);
};

function Enemy(data = {}) {
    this.body = Array.isArray(data.body) && data.body.length ? data.body.slice() : [];
    if (this.body.length === 0) {
        const position = data.x !== undefined && data.y !== undefined ? { x: data.x, y: data.y } : findEmptyPosition(data.exclude);
        this.body = [position];
    }
    this.xSpeed = data.xSpeed ?? scale;
    this.ySpeed = data.ySpeed ?? 0;
    this.color = data.color || enemyColor;
    this.growSegments = data.growSegments || 0;
}

Enemy.prototype.pickLocation = function (exclude = []) {
    const position = findEmptyPosition(exclude);
    this.body = [position];
};

Enemy.prototype.update = function () {
    if (Math.random() < enemyMoveChange) {
        const directions = [
            { xSpeed: scale, ySpeed: 0 },
            { xSpeed: -scale, ySpeed: 0 },
            { xSpeed: 0, ySpeed: scale },
            { xSpeed: 0, ySpeed: -scale }
        ];
        const next = directions[Math.floor(Math.random() * directions.length)];
        if (next.xSpeed !== -this.xSpeed || next.ySpeed !== -this.ySpeed) {
            this.xSpeed = next.xSpeed;
            this.ySpeed = next.ySpeed;
        }
    }

    const head = this.body[this.body.length - 1];
    const nextHead = {
        x: head.x + this.xSpeed,
        y: head.y + this.ySpeed
    };

    if (nextHead.x >= canvas.width) nextHead.x = 0;
    if (nextHead.x < 0) nextHead.x = canvas.width - scale;
    if (nextHead.y >= canvas.height) nextHead.y = 0;
    if (nextHead.y < 0) nextHead.y = canvas.height - scale;

    this.body.push(nextHead);
    if (this.growSegments > 0) {
        this.growSegments -= 1;
    } else {
        this.body.shift();
    }
};

Enemy.prototype.grow = function (segments = 1) {
    this.growSegments += segments;
};

Enemy.prototype.draw = function () {
    ctx.fillStyle = this.color;
    this.body.forEach(segment => {
        ctx.fillRect(segment.x, segment.y, scale, scale);
    });
};

Enemy.prototype.collidesWith = function (target) {
    return this.body.some(segment => positionMatches(segment, target));
};

function startGame(loadData = null) {
    stopGame();
    gameState.isPaused = false;
    gameState.isGameOver = false;
    gameState.status = 'Playing';

    if (loadData) {
        gameState.speed = loadData.speed || defaultSpeed;
        gameState.snakeColor = loadData.snakeColor || defaultSnakeColor;
        gameState.score = loadData.score || 0;
        gameState.level = loadData.level || 1;
        gameState.theme = loadData.theme || 'dark';
        gameState.snake = new Snake({
            body: loadData.snake?.body,
            xSpeed: loadData.snake?.xSpeed,
            ySpeed: loadData.snake?.ySpeed,
            color: loadData.snake?.color,
            growSegments: loadData.snake?.growSegments
        });
        gameState.obstacles = (loadData.obstacles || []).map(obsData => new Obstacle(obsData));
        gameState.enemies = (loadData.enemies || []).map(enemyData => new Enemy(enemyData));
        gameState.fruit = new Fruit({
            type: loadData.fruit?.type,
            x: loadData.fruit?.x,
            y: loadData.fruit?.y
        });
        gameState.specialFruit = loadData.specialFruit ? new Fruit({
            type: loadData.specialFruit.type,
            x: loadData.specialFruit.x,
            y: loadData.specialFruit.y
        }) : null;
    } else {
        gameState.speed = defaultSpeed;
        gameState.snakeColor = defaultSnakeColor;
        gameState.score = 0;
        gameState.level = 1;
        gameState.snake = new Snake({ color: defaultSnakeColor });
        gameState.obstacles = [];
        for (let i = 0; i < 4; i += 1) {
            gameState.obstacles.push(new Obstacle({ exclude: collectBlockedPositions() }));
        }
        gameState.enemies = [];
        for (let i = 0; i < enemyCount; i += 1) {
            gameState.enemies.push(new Enemy({ exclude: collectBlockedPositions() }));
        }
        gameState.fruit = new Fruit({ exclude: collectBlockedPositions() });
        gameState.specialFruit = null;
    }

    updateTheme();
    renderSaveMenu();
    updateUI();
    startLoop();
}

function startLoop() {
    stopGame();
    gameInterval = setInterval(() => {
        if (gameState.isPaused || gameState.isGameOver) {
            return;
        }
        gameStep();
    }, gameState.speed);
}

function updateEnemies() {
    const head = gameState.snake.body[gameState.snake.body.length - 1];
    for (const enemy of gameState.enemies) {
        enemy.update();
        if (positionMatches(head, enemy)) {
            return true;
        }
    }
    return false;
}

function stopGame() {
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
}

function gameStep() {
    gameState.snake.update();

    const enemyHit = updateEnemies();
    if (enemyHit || gameState.snake.collidesWithSelf() || gameState.obstacles.some(obs => gameState.snake.eats(obs))) {
        return finishGame();
    }
    if (gameState.enemies.some(enemy => enemy.collidesWith(gameState.snake.body[gameState.snake.body.length - 1]))) {
        return finishGame();
    }

    if (gameState.snake.eats(gameState.fruit)) {
        collectFruit(gameState.fruit);
    } else if (gameState.specialFruit && gameState.snake.eats(gameState.specialFruit)) {
        collectFruit(gameState.specialFruit);
    }

    renderGame();
    updateUI();
}

function collectFruit(fruit) {
    if (fruit.type === 'special') {
        gameState.score += 3;
        gameState.status = 'Golden fruit eaten!';
        gameState.specialFruit = null;
        gameState.snake.grow(2);
        setTimeout(() => {
            if (gameState.status === 'Golden fruit eaten!') {
                gameState.status = gameState.isPaused ? 'Paused' : 'Playing';
            }
        }, 1200);
    } else {
        gameState.score += 1;
        gameState.snake.grow();
    }
    gameState.fruit = new Fruit({ exclude: collectBlockedPositions() });

    if (gameState.score > 0 && gameState.score % specialFruitInterval === 0 && !gameState.specialFruit) {
        gameState.specialFruit = new Fruit({ type: 'special', exclude: collectBlockedPositions() });
    }

    if (gameState.score % 5 === 0) {
        levelUp();
    }

    updateUI();
}

function levelUp() {
    gameState.level += 1;
    gameState.status = `Level ${gameState.level}`;
    gameState.speed = Math.max(minSpeed, gameState.speed - 20);
    gameState.obstacles.push(new Obstacle({ exclude: collectBlockedPositions() }));
    if (gameState.level % 2 === 0) {
        gameState.enemies.forEach(enemy => enemy.grow(1));
    }
    startLoop();
    setTimeout(() => {
        if (gameState.status.startsWith('Level')) {
            gameState.status = 'Playing';
        }
    }, 1200);
}

function finishGame() {
    stopGame();
    gameState.isGameOver = true;
    gameState.isPaused = true;
    gameState.status = 'Game Over';
    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        saveObject(bestScoreKey, gameState.highScore);
    }
    updateUI();
    startGame();
}

function renderGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameState.fruit.draw();
    if (gameState.specialFruit) {
        gameState.specialFruit.draw();
    }
    gameState.obstacles.forEach(obstacle => obstacle.draw());
    gameState.enemies.forEach(enemy => enemy.draw());
    gameState.snake.draw();
}

function updateUI() {
    document.querySelector('.score').innerText = `Score: ${gameState.score}`;
    document.querySelector('.best-score').innerText = `Best Score: ${gameState.highScore}`;
    document.querySelector('.level').innerText = `Level: ${gameState.level}`;
    document.querySelector('.status').innerText = gameState.status;
    const pauseButton = document.querySelector('.pause-button');
    if (pauseButton) {
        pauseButton.innerText = gameState.isPaused && !gameState.isGameOver ? 'Resume' : 'Pause';
    }
}

function renderSaveMenu() {
    const saveMenu = document.getElementById('saveMenu');
    if (!saveMenu) {
        return;
    }

    const saveNames = Object.keys(localStorage).filter(key => key.startsWith(savePrefix));
    let options = '<option value="">Select save</option>';

    saveNames.forEach(key => {
        const displayName = key.replace(savePrefix, '');
        options += `<option value="${key}">${displayName}</option>`;
    });

    saveMenu.innerHTML = `
        <div class="menu">
            <input class="save-input" placeholder="Enter save name" />
            <button class="save-button">Save Progress</button>
            <button class="quick-save-button">Quick Save</button>
            <select class="load-select">${options}</select>
            <button class="load-button">Load Progress</button>
            <button class="quick-load-button">Quick Load</button>
            <button class="delete-save-button">Delete Save</button>
        </div>
    `;

    const saveInput = saveMenu.querySelector('.save-input');
    const saveButton = saveMenu.querySelector('.save-button');
    const quickSaveButton = saveMenu.querySelector('.quick-save-button');
    const loadSelect = saveMenu.querySelector('.load-select');
    const loadButton = saveMenu.querySelector('.load-button');
    const quickLoadButton = saveMenu.querySelector('.quick-load-button');
    const deleteSaveButton = saveMenu.querySelector('.delete-save-button');

    saveButton.addEventListener('click', () => {
        const saveName = saveInput.value.trim();
        if (!saveName) {
            return;
        }
        saveProgressWithName(saveName);
        renderSaveMenu();
    });

    quickSaveButton.addEventListener('click', () => {
        saveProgress();
        gameState.status = 'Quick save completed';
        updateUI();
    });

    loadButton.addEventListener('click', () => {
        if (!loadSelect.value) {
            return;
        }
        loadProgressByName(loadSelect.value);
    });

    quickLoadButton.addEventListener('click', () => {
        loadProgress();
    });

    deleteSaveButton.addEventListener('click', () => {
        if (!loadSelect.value) {
            return;
        }
        deleteSave(loadSelect.value);
        renderSaveMenu();
    });
}

function getSaveData() {
    return {
        speed: gameState.speed,
        snakeColor: gameState.snakeColor,
        score: gameState.score,
        level: gameState.level,
        theme: gameState.theme,
        snake: {
            body: gameState.snake.body,
            xSpeed: gameState.snake.xSpeed,
            ySpeed: gameState.snake.ySpeed,
            color: gameState.snake.color,
            growSegments: gameState.snake.growSegments
        },
        fruit: {
            type: gameState.fruit.type,
            x: gameState.fruit.x,
            y: gameState.fruit.y
        },
        specialFruit: gameState.specialFruit ? {
            type: gameState.specialFruit.type,
            x: gameState.specialFruit.x,
            y: gameState.specialFruit.y
        } : null,
        obstacles: gameState.obstacles.map(obstacle => ({ x: obstacle.x, y: obstacle.y })),
        enemies: gameState.enemies.map(enemy => ({ body: enemy.body, xSpeed: enemy.xSpeed, ySpeed: enemy.ySpeed, color: enemy.color, growSegments: enemy.growSegments }))
    };
}

function saveProgress() {
    saveObject(autoSaveKey, getSaveData());
}

function loadProgress() {
    const savedData = getSavedObject(autoSaveKey);
    if (savedData) {
        startGame(savedData);
    }
}

function saveProgressWithName(name) {
    const key = savePrefix + name.trim();
    saveObject(key, getSaveData());
}

function loadProgressByName(key) {
    const savedData = getSavedObject(key);
    if (savedData) {
        startGame(savedData);
    }
}

function deleteSave(key) {
    localStorage.removeItem(key);
}

function togglePause() {
    if (gameState.isGameOver) {
        return;
    }
    gameState.isPaused = !gameState.isPaused;
    gameState.status = gameState.isPaused ? 'Paused' : 'Playing';
    updateUI();
}

function resetGame() {
    startGame();
}

function changeSpeed(newSpeed) {
    gameState.speed = newSpeed;
    if (!gameState.isPaused && !gameState.isGameOver) {
        startLoop();
    }
    updateUI();
}

function changeSnakeColor(newColor) {
    gameState.snakeColor = newColor;
    if (gameState.snake) {
        gameState.snake.color = newColor;
    }
}

function changeTheme(theme) {
    gameState.theme = theme;
    updateTheme();
}

function updateTheme() {
    const body = document.body;
    if (gameState.theme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
}

window.addEventListener('keydown', (evt) => {
    const direction = evt.key.replace('Arrow', '');
    gameState.snake.changeDirection(direction);
});

const themeRadios = document.querySelectorAll('input[name="theme"]');
themeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        changeTheme(radio.value);
    });
});

startGame(getSavedObject(autoSaveKey));
