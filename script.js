const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scale = 20;
const rows = canvas.height / scale;
const columns = canvas.width / scale;
let speed = 250; // Початкова швидкість гри
let snakeColor = "#000"; // Початковий колір змійки
let obstacleColor = "#8a2be2"; // Фіолетовий колір перешкод
let savedData = localStorage.getItem('savedData') ? JSON.parse(localStorage.getItem('savedData')) : null;

let snake;
let fruit;
let obstacles = [];
let gameInterval;
let bestScore = localStorage.getItem('bestScore') || 0; // Завантажуємо найкращий рахунок з локального сховища

(function setup() {
    if (savedData) {
        speed = savedData.speed;
        snakeColor = savedData.snakeColor;
        bestScore = savedData.bestScore;
    }
    snake = new Snake(savedData ? savedData.snakeLength : 0);
    fruit = new Fruit();
    fruit.pickLocation();
    
    for (let i = 0; i < 5; i++) { // Змінено кількість перешкод
        obstacles.push(new Obstacle());
    }
    
    gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fruit.draw();
        snake.update();
        snake.draw();
        obstacles.forEach(obstacle => {
            obstacle.draw();
        });

        if (snake.eat(fruit)) {
            fruit.pickLocation();
        }

        snake.checkCollision();
        document.querySelector(".score").innerText = `Score: ${snake.total}`;
        document.querySelector(".best-score").innerText = `Best Score: ${bestScore}`;
    }, speed);
}());

window.addEventListener('keydown', (evt) => {
    const direction = evt.key.replace('Arrow', '');
    snake.changeDirection(direction);
});

function Snake(savedLength) {
    this.x = 0;
    this.y = 0;
    this.xSpeed = scale * 1;
    this.ySpeed = 0;
    this.total = savedLength || 0;
    this.tail = [];

    this.draw = function () {
        ctx.fillStyle = snakeColor;
        for (let i = 0; i < this.tail.length; i++) {
            ctx.fillRect(this.tail[i].x, this.tail[i].y, scale, scale);
        }

        ctx.fillRect(this.x, this.y, scale, scale);
    };

    this.update = function () {
        for (let i = 0; i < this.tail.length - 1; i++) {
            this.tail[i] = this.tail[i + 1];
        }

        this.tail[this.total - 1] = { x: this.x, y: this.y };

        this.x += this.xSpeed;
        this.y += this.ySpeed;

        if (this.x >= canvas.width) {
            this.x = 0;
        }

        if (this.y >= canvas.height) {
            this.y = 0;
        }

        if (this.x < 0) {
            this.x = canvas.width - scale;
        }

        if (this.y < 0) {
            this.y = canvas.height - scale;
        }
    };

    this.changeDirection = function (direction) {
        switch (direction) {
            case 'Up':
                if (this.ySpeed !== scale * 1) {
                    this.xSpeed = 0;
                    this.ySpeed = -scale * 1;
                }
                break;
            case 'Down':
                if (this.ySpeed !== -scale * 1) {
                    this.xSpeed = 0;
                    this.ySpeed = scale * 1;
                }
                break;
            case 'Left':
                if (this.xSpeed !== scale * 1) {
                    this.xSpeed = -scale * 1;
                    this.ySpeed = 0;
                }
                break;
            case 'Right':
                if (this.xSpeed !== -scale * 1) {
                    this.xSpeed = scale * 1;
                    this.ySpeed = 0;
                }
                break;
        }
    };

    this.eat = function (fruit) {
        if (this.x === fruit.x && this.y === fruit.y) {
            this.total++;
            return true;
        }
        return false;
    };

// Функція для ініціалізації гри
function initializeGame() {
    if (savedData) {
        speed = savedData.speed;
        snakeColor = savedData.snakeColor;
        bestScore = savedData.bestScore;
    }
    snake = new Snake(savedData ? savedData.snakeLength : 0);
    fruit = new Fruit();
    fruit.pickLocation();
    
    obstacles = [];
    for (let i = 0; i < 5; i++) { // Змінено кількість перешкод
        obstacles.push(new Obstacle());
    }
    
    gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fruit.draw();
        snake.update();
        snake.draw();
        obstacles.forEach(obstacle => {
            obstacle.draw();
        });

        if (snake.eat(fruit)) {
            fruit.pickLocation();
        }

        snake.checkCollision();
        document.querySelector(".score").innerText = `Score: ${snake.total}`;
        document.querySelector(".best-score").innerText = `Best Score: ${bestScore}`;
    }, speed);
}

    this.checkCollision = function () {
        // Перевіряємо колізію з хвостом
        for (let i = 0; i < this.tail.length; i++) {
            if (this.x === this.tail[i].x && this.y === this.tail[i].y) {
                if (snake.total > bestScore) {
                    bestScore = snake.total;
                    localStorage.setItem('bestScore', bestScore);
                }
                this.total = 0;
                this.tail = [];
                clearInterval(gameInterval); // Скидаємо гру
                initializeGame(); // Ініціалізуємо гру знову
            }
        }
    
        // Перевіряємо колізію з перешкодами
        obstacles.forEach(obstacle => {
            if (this.x === obstacle.x && this.y === obstacle.y) {
                if (snake.total > bestScore) {
                    bestScore = snake.total;
                    localStorage.setItem('bestScore', bestScore);
                }
                this.total = 0;
                this.tail = [];
                clearInterval(gameInterval); // Скидаємо гру
                initializeGame(); // Ініціалізуємо гру знову
            }
        });
    
        // Перевіряємо колізію з головою
        for (let i = 0; i < obstacles.length; i++) {
            if (this.x === obstacles[i].x && this.y === obstacles[i].y) {
                if (snake.total > bestScore) {
                    bestScore = snake.total;
                    localStorage.setItem('bestScore', bestScore);
                }
                this.total = 0;
                this.tail = [];
                clearInterval(gameInterval); // Скидаємо гру
                initializeGame(); // Ініціалізуємо гру знову
            }
        }
    };
    
    
}

function Fruit() {
    this.x;
    this.y;

    this.pickLocation = function () {
        this.x = Math.floor(Math.random() * columns) * scale;
        this.y = Math.floor(Math.random() * rows) * scale;
    };

    this.draw = function () {
        ctx.fillStyle = "#f00";
        ctx.fillRect(this.x, this.y, scale, scale);
    };
}

function Obstacle() {
    this.x;
    this.y;

    this.pickLocation = function () {
        this.x = Math.floor(Math.random() * columns) * scale;
        this.y = Math.floor(Math.random() * rows) * scale;
    };

    this.draw = function () {
        ctx.fillStyle = obstacleColor; // Змінено колір перешкод
        ctx.fillRect(this.x, this.y, scale, scale);
    };

    this.pickLocation();
}

// Функція для зміни швидкості гри
function changeSpeed(newSpeed) {
    speed = newSpeed;
    clearInterval(gameInterval); // Скидаємо гру
    gameInterval = setInterval(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fruit.draw();
        snake.update();
        snake.draw();
        obstacles.forEach(obstacle => {
            obstacle.draw();
        });

        if (snake.eat(fruit)) {
            fruit.pickLocation();
        }

        snake.checkCollision();
        document.querySelector(".score").innerText = `Score: ${snake.total}`;
        document.querySelector(".best-score").innerText = `Best Score: ${bestScore}`;
    }, speed);
}

// Функція для зміни кольору змійки
function changeSnakeColor(newColor) {
    snakeColor = newColor;
}

// Функція для збереження прогресу гри
function saveProgress() {
    const savedData = {
        speed: speed,
        snakeColor: snakeColor,
        bestScore: bestScore,
        snakeLength: snake.total
    };
    localStorage.setItem('savedData', JSON.stringify(savedData));
}

// Функція для завантаження останнього збереженого прогресу гри
function loadProgress() {
    const savedData = JSON.parse(localStorage.getItem('savedData'));
    if (savedData) {
        speed = savedData.speed;
        snakeColor = savedData.snakeColor;
        bestScore = savedData.bestScore;
        snake = new Snake(savedData.snakeLength);
        fruit = new Fruit();
        fruit.pickLocation();
        obstacles = [];
        for (let i = 0; i < 5; i++) { // Змінено кількість перешкод
            obstacles.push(new Obstacle());
        }
    }
}

// Функція для збереження прогресу гри зі змінним ім'ям
function saveProgressWithName(name) {
    const savedData = {
        speed: speed,
        snakeColor: snakeColor,
        bestScore: bestScore,
        snakeLength: snake.total
    };
    localStorage.setItem(name, JSON.stringify(savedData));
}

// Функція для завантаження останнього збереженого прогресу гри зі змінним ім'ям
function loadProgressByName(name) {
    const savedData = JSON.parse(localStorage.getItem(name));
    if (savedData) {
        speed = savedData.speed;
        snakeColor = savedData.snakeColor;
        bestScore = savedData.bestScore;
        snake = new Snake(savedData.snakeLength);
        fruit = new Fruit();
        fruit.pickLocation();
        obstacles = [];
        for (let i = 0; i < 5; i++) { // Змінено кількість перешкод
            obstacles.push(new Obstacle());
        }
    }
}

// Функція для створення інтерфейсу меню
function createMenu() {
    const menuDiv = document.createElement('div');
    menuDiv.classList.add('menu');

    const saveInput = document.createElement('input');
    saveInput.setAttribute('placeholder', 'Enter save name');
    saveInput.classList.add('save-input');
    menuDiv.appendChild(saveInput);

    const saveButton = document.createElement('button');
    saveButton.innerText = 'Save Progress';
    saveButton.addEventListener('click', () => {
        const saveName = saveInput.value;
        if (saveName) {
            saveProgressWithName(saveName);
            
            // Оновлення списку варіантів вибору
            const loadSelect = document.querySelector('.load-select');
            const option = document.createElement('option');
            option.value = saveName;
            option.text = saveName;
            loadSelect.appendChild(option);
            
            // Додати кнопку видалення
            const deleteButton = document.createElement('button');
            deleteButton.innerText = 'Delete';
            deleteButton.addEventListener('click', () => {
                localStorage.removeItem(saveName);
                loadSelect.removeChild(option);
                menuDiv.removeChild(deleteButton);
            });
            menuDiv.appendChild(deleteButton);
        }
    });
    menuDiv.appendChild(saveButton);

    const loadSelect = document.createElement('select');
    loadSelect.classList.add('load-select');
    const savedGames = Object.keys(localStorage);
    savedGames.forEach(savedGame => {
        const option = document.createElement('option');
        option.value = savedGame;
        option.text = savedGame;
        loadSelect.appendChild(option);
    });
    menuDiv.appendChild(loadSelect);

    const loadButton = document.createElement('button');
    loadButton.innerText = 'Load Progress';
    loadButton.addEventListener('click', () => {
        const selectedSave = loadSelect.value;
        if (selectedSave) {
            loadProgressByName(selectedSave);
        }
    });
    menuDiv.appendChild(loadButton);

    document.body.appendChild(menuDiv);
}

// Викликаємо функцію для створення меню
createMenu();

// Функція для зміни теми
function changeTheme(theme) {
    const body = document.body;
    if (theme === 'dark') {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    } else {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    }
}

// Встановлюємо початкову тему
changeTheme('dark');

// Отримуємо елементи вибору теми
const themeRadios = document.querySelectorAll('input[name="theme"]');

// Додаємо обробник подій для кожного радіо-кнопки теми
themeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        changeTheme(radio.value);
    });
});
