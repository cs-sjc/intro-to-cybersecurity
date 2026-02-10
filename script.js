// Game Configuration
const CONFIG = {
    MAZE_SIZE: 15,
    CELL_SIZE: 40,
    MONSTER_COUNT: 7, // Changed to 7 to match number of challenge types
    KING_HEALTH: 100,
    INITIAL_ENERGY: 100,
    CHALLENGE_TYPES: ['phishing', 'password', 'malware', 'firewall', 'encryption', 'updates', 'social']
};

// Game State
let gameState = {
    score: 0,
    kingHealth: CONFIG.KING_HEALTH,
    monstersDefeated: 0,
    energy: CONFIG.INITIAL_ENERGY,
    selectedCharacter: null,
    playerPosition: { x: 1, y: 1 },
    kingPosition: { x: 13, y: 13 },
    monsterPositions: [],
    maze: [],
    gameActive: false,
    currentChallenge: null,
    timer: null,
    responseTime: 10,
    usedChallengeTypes: [] // Track used challenge types
};

// Character Data with image paths
const CHARACTERS = {
    sentinel: {
        name: "SENTINEL",
        icon: "🛡️",
        color: "#4CAF50",
        defense: 90,
        speed: 60,
        ability: "FIREWALL BURST",
        abilityDesc: "Blocks 2 incorrect answers automatically",
        abilityUses: 2,
        image: "assets/characters/sentinel/Pink_Monster.png",
        rightPanelImage: "assets/characters/sentinel/Pink_Monster_Idle_4.png"
    },
    cryptomage: {
        name: "CRYPTO-MAGE",
        icon: "🔮",
        color: "#9C27B0",
        defense: 70,
        speed: 75,
        ability: "DATA ENCRYPT",
        abilityDesc: "Gives you hints for difficult questions",
        abilityUses: 3,
        image: "assets/characters/cryptomage/Dude_Monster.png",
        rightPanelImage: "assets/characters/cryptomage/Dude_Monster_Idle_4.png"
    },
    networkrogue: {
        name: "NETWORK-ROGUE",
        icon: "🗡️",
        color: "#FF9800",
        defense: 60,
        speed: 95,
        ability: "GHOST PROTOCOL",
        abilityDesc: "Skip one challenge without penalty",
        abilityUses: 1,
        image: "assets/characters/networkrogue/Owlet_Monster.png",
        rightPanelImage: "assets/characters/networkrogue/Owlet_Monster_Idle_4.png"
    }
};

// Monster Data - Now includes all unique challenge types
const MONSTERS = [
    { name: "PHISHING BOT", icon: "🎣", threat: "High", type: "phishing" },
    { name: "PASSWORD CRACKER", icon: "🔑", threat: "Medium", type: "password" },
    { name: "MALWARE VIRUS", icon: "🦠", threat: "Critical", type: "malware" },
    { name: "FIREWALL HACKER", icon: "🔥", threat: "High", type: "firewall" },
    { name: "ENCRYPTION THIEF", icon: "🔐", threat: "Medium", type: "encryption" },
    { name: "UPDATE EXPLOITER", icon: "🔄", threat: "Low", type: "updates" },
    { name: "SOCIAL ENGINEER", icon: "🗣️", threat: "High", type: "social" }
];

// DOM Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const playButton = document.getElementById('playButton');
const mazeElement = document.getElementById('maze');
const gameModal = document.getElementById('gameModal');
const gameTitle = document.getElementById('gameTitle');
const gameContent = document.getElementById('gameContent');
const characterAbility = document.getElementById('characterAbility');
const minimap = document.getElementById('minimap');

// Initialize Game
function initGame() {
    // Setup event listeners
    playButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyPress);

    // Load character images
    loadCharacterImages();

    // Initial character selection
    selectCharacter('sentinel');
}

// Load character images
function loadCharacterImages() {
    const characters = ['sentinel', 'cryptomage', 'networkrogue'];

    characters.forEach(charId => {
        const imgElement = document.getElementById(`${charId}-img`);
        if (imgElement && CHARACTERS[charId].image) {
            imgElement.src = CHARACTERS[charId].image;
            imgElement.onerror = () => {
                imgElement.alt = CHARACTERS[charId].name;
                imgElement.style.fontSize = '2rem';
                imgElement.parentElement.innerHTML = CHARACTERS[charId].icon;
            };
        }
    });
}

// Character Selection
function selectCharacter(characterId) {
    gameState.selectedCharacter = characterId;

    // Update UI
    document.querySelectorAll('.character-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-character="${characterId}"]`).classList.add('selected');

    // Update player display
    const character = CHARACTERS[characterId];

    // Update player sprite in HUD
    const playerImg = document.getElementById('player-img');
    if (playerImg) {
        playerImg.src = character.image;
        playerImg.alt = character.name;
        playerImg.onerror = () => {
            playerImg.parentElement.innerHTML = character.icon;
        };
    }

    document.getElementById('playerName').textContent = character.name;
    document.getElementById('defenseStat').textContent = character.defense;

    // Update character animation area
    const activeCharImg = document.getElementById('active-character-img');
    if (activeCharImg) {
        activeCharImg.src = character.rightPanelImage || character.image;
        activeCharImg.alt = character.name;
        activeCharImg.onerror = () => {
            activeCharImg.parentElement.innerHTML = `<div style="font-size: 4rem; color: ${character.color}">${character.icon}</div>`;
        };
    }
}

// Start Game
function startGame() {
    if (!gameState.selectedCharacter) {
        showTemporaryMessage('Please select a character first!');
        return;
    }

    startScreen.style.display = 'none';
    gameScreen.style.display = 'flex';

    // Reset game state
    gameState = {
        score: 0,
        kingHealth: CONFIG.KING_HEALTH,
        monstersDefeated: 0,
        energy: CONFIG.INITIAL_ENERGY,
        selectedCharacter: gameState.selectedCharacter,
        playerPosition: { x: 1, y: 1 },
        kingPosition: { x: 13, y: 13 },
        monsterPositions: [],
        maze: [],
        gameActive: true,
        currentChallenge: null,
        timer: null,
        responseTime: 10,
        usedChallengeTypes: [] // Reset used types
    };

    generateMaze();
    updateHUD();
    renderMaze();
    renderMinimap();
}

// IMPROVED MAZE GENERATION - Guarantees path to king
function generateMaze() {
    const size = CONFIG.MAZE_SIZE;
    gameState.maze = [];

    // Initialize maze with all walls
    for (let y = 0; y < size; y++) {
        gameState.maze[y] = [];
        for (let x = 0; x < size; x++) {
            // Create border walls
            if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
                gameState.maze[y][x] = 'wall';
            } else {
                gameState.maze[y][x] = 'wall'; // Start with all walls
            }
        }
    }

    // Create a guaranteed path from start to throne using recursive division
    createGuaranteedPath(1, 1, gameState.kingPosition.x, gameState.kingPosition.y);

    // Add some random paths for exploration
    addRandomPaths();

    // Ensure start and throne are paths
    gameState.maze[1][1] = 'path';
    gameState.maze[gameState.kingPosition.y][gameState.kingPosition.x] = 'throne';

    // Place monsters with UNIQUE challenges
    placeMonsters();

    // Add some treasure/energy cells
    placeTreasure();
}

function createGuaranteedPath(startX, startY, endX, endY) {
    // Create a clear diagonal path
    let x = startX;
    let y = startY;

    // Create main path
    while (x < endX || y < endY) {
        gameState.maze[y][x] = 'path';

        // Move toward king
        if (x < endX && Math.random() > 0.3) {
            x++;
        } else if (y < endY) {
            y++;
        }
    }

    // Ensure end point is path
    gameState.maze[endY][endX] = 'path';

    // Add some branching paths for exploration
    createBranches(startX, startY, endX, endY);
}

function createBranches(startX, startY, endX, endY) {
    // Create 3-5 branching paths
    const branchCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < branchCount; i++) {
        let branchX = startX + Math.floor(Math.random() * (endX - startX));
        let branchY = startY + Math.floor(Math.random() * (endY - startY));

        // Ensure we're within bounds
        branchX = Math.max(1, Math.min(CONFIG.MAZE_SIZE - 2, branchX));
        branchY = Math.max(1, Math.min(CONFIG.MAZE_SIZE - 2, branchY));

        // Create a short branch
        createBranch(branchX, branchY, 3 + Math.floor(Math.random() * 4));
    }
}

function createBranch(startX, startY, length) {
    let x = startX;
    let y = startY;
    let direction = Math.floor(Math.random() * 4);

    for (let i = 0; i < length; i++) {
        gameState.maze[y][x] = 'path';

        // Move in random direction
        switch(direction) {
            case 0: // Up
                if (y > 1) y--;
                break;
            case 1: // Down
                if (y < CONFIG.MAZE_SIZE - 2) y++;
                break;
            case 2: // Left
                if (x > 1) x--;
                break;
            case 3: // Right
                if (x < CONFIG.MAZE_SIZE - 2) x++;
                break;
        }

        // Occasionally change direction
        if (Math.random() > 0.7) {
            direction = Math.floor(Math.random() * 4);
        }
    }
}

function addRandomPaths() {
    // Add some additional random paths
    for (let y = 2; y < CONFIG.MAZE_SIZE - 2; y += 2) {
        for (let x = 2; x < CONFIG.MAZE_SIZE - 2; x += 2) {
            if (Math.random() > 0.6 && gameState.maze[y][x] === 'wall') {
                gameState.maze[y][x] = 'path';

                // Connect to nearby paths
                if (y > 1 && gameState.maze[y-1][x] === 'path') {
                    gameState.maze[y-1][x] = 'path';
                }
                if (y < CONFIG.MAZE_SIZE - 2 && gameState.maze[y+1][x] === 'path') {
                    gameState.maze[y+1][x] = 'path';
                }
                if (x > 1 && gameState.maze[y][x-1] === 'path') {
                    gameState.maze[y][x-1] = 'path';
                }
                if (x < CONFIG.MAZE_SIZE - 2 && gameState.maze[y][x+1] === 'path') {
                    gameState.maze[y][x+1] = 'path';
                }
            }
        }
    }
}

function placeMonsters() {
    gameState.monsterPositions = [];
    gameState.usedChallengeTypes = [];

    // Create a shuffled list of all monster types
    const allMonsterTypes = [...MONSTERS];
    shuffleArray(allMonsterTypes);

    // Use only unique monsters (up to MONSTER_COUNT)
    for (let i = 0; i < Math.min(CONFIG.MONSTER_COUNT, allMonsterTypes.length); i++) {
        let x, y;
        let attempts = 0;

        do {
            x = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
            y = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
            attempts++;
        } while (
            (gameState.maze[y][x] !== 'path' ||
                (x === 1 && y === 1) ||
                (x === gameState.kingPosition.x && y === gameState.kingPosition.y) ||
                gameState.monsterPositions.some(m => m.x === x && m.y === y)) &&
            attempts < 100
            );

        if (attempts < 100) {
            const monster = allMonsterTypes[i];
            gameState.monsterPositions.push({
                x, y,
                monster: monster,
                defeated: false
            });
            gameState.usedChallengeTypes.push(monster.type);
        }
    }

    // If we have fewer monsters than unique types, fill remaining spots with random unique monsters
    while (gameState.monsterPositions.length < CONFIG.MONSTER_COUNT) {
        let x, y;
        let attempts = 0;

        do {
            x = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
            y = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
            attempts++;
        } while (
            (gameState.maze[y][x] !== 'path' ||
                (x === 1 && y === 1) ||
                (x === gameState.kingPosition.x && y === gameState.kingPosition.y) ||
                gameState.monsterPositions.some(m => m.x === x && m.y === y)) &&
            attempts < 100
            );

        if (attempts < 100) {
            // Get a monster type we haven't used yet
            const availableMonsters = MONSTERS.filter(m =>
                !gameState.usedChallengeTypes.includes(m.type)
            );

            let monster;
            if (availableMonsters.length > 0) {
                monster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
            } else {
                // If we've used all types, pick any random one
                monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
            }

            gameState.monsterPositions.push({
                x, y,
                monster: monster,
                defeated: false
            });
            if (!gameState.usedChallengeTypes.includes(monster.type)) {
                gameState.usedChallengeTypes.push(monster.type);
            }
        } else {
            break; // Can't place more monsters
        }
    }
}

// Helper function to shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function placeTreasure() {
    // Add some energy cells
    for (let i = 0; i < 5; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
            y = Math.floor(Math.random() * (CONFIG.MAZE_SIZE - 4)) + 2;
        } while (gameState.maze[y][x] !== 'path' ||
        (x === 1 && y === 1) ||
        (x === gameState.kingPosition.x && y === gameState.kingPosition.y) ||
        gameState.monsterPositions.some(m => m.x === x && m.y === y));

        gameState.maze[y][x] = 'energy';
    }
}

// Render Maze
function renderMaze() {
    mazeElement.innerHTML = '';
    mazeElement.style.gridTemplateColumns = `repeat(${CONFIG.MAZE_SIZE}, ${CONFIG.CELL_SIZE}px)`;
    mazeElement.style.gridTemplateRows = `repeat(${CONFIG.MAZE_SIZE}, ${CONFIG.CELL_SIZE}px)`;

    for (let y = 0; y < CONFIG.MAZE_SIZE; y++) {
        for (let x = 0; x < CONFIG.MAZE_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';

            // Determine cell type
            if (x === gameState.playerPosition.x && y === gameState.playerPosition.y) {
                cell.classList.add('player-cell');
                cell.title = 'You';
                const character = CHARACTERS[gameState.selectedCharacter];
                cell.innerHTML = character.icon;
            } else if (x === gameState.kingPosition.x && y === gameState.kingPosition.y) {
                cell.classList.add('king-cell');
                cell.title = 'King';
                cell.innerHTML = '👑';
            } else if (gameState.maze[y][x] === 'wall') {
                cell.classList.add('wall');
                cell.title = 'Wall';
            } else if (gameState.maze[y][x] === 'throne') {
                cell.classList.add('throne-cell');
                cell.title = 'Throne';
                cell.innerHTML = '🏰';
            } else if (gameState.maze[y][x] === 'energy') {
                cell.classList.add('energy-cell');
                cell.title = 'Energy Cell';
                cell.innerHTML = '⚡';
            } else {
                cell.classList.add('path');
            }

            // Check for monsters at this position
            const monster = gameState.monsterPositions.find(m => m.x === x && m.y === y && !m.defeated);
            if (monster) {
                cell.classList.add('monster-cell');
                cell.title = `${monster.monster.name} - ${monster.monster.threat} Threat`;
                cell.innerHTML = monster.monster.icon;
            }

            mazeElement.appendChild(cell);
        }
    }
}

// Render Minimap
function renderMinimap() {
    minimap.innerHTML = '';
    const scale = 3;
    minimap.style.gridTemplateColumns = `repeat(${CONFIG.MAZE_SIZE}, ${scale}px)`;
    minimap.style.gridTemplateRows = `repeat(${CONFIG.MAZE_SIZE}, ${scale}px)`;

    for (let y = 0; y < CONFIG.MAZE_SIZE; y++) {
        for (let x = 0; x < CONFIG.MAZE_SIZE; x++) {
            const cell = document.createElement('div');

            if (x === gameState.playerPosition.x && y === gameState.playerPosition.y) {
                cell.style.background = '#00ffff';
            } else if (x === gameState.kingPosition.x && y === gameState.kingPosition.y) {
                cell.style.background = '#ffd700';
            } else if (gameState.maze[y][x] === 'wall') {
                cell.style.background = '#00ffff';
                cell.style.opacity = '0.3';
            } else if (gameState.monsterPositions.some(m => m.x === x && m.y === y && !m.defeated)) {
                cell.style.background = '#ff0000';
            } else {
                cell.style.background = '#1a1a4a';
            }

            minimap.appendChild(cell);
        }
    }
}

// Update HUD
function updateHUD() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('monstersDefeated').textContent = gameState.monstersDefeated;
    document.getElementById('kingHealth').textContent = gameState.kingHealth;
    document.getElementById('healthText').textContent = `${gameState.kingHealth}%`;
    document.getElementById('healthFill').style.width = `${gameState.kingHealth}%`;
    document.getElementById('energyLevel').textContent = `${gameState.energy}%`;
}

// Handle Key Press
function handleKeyPress(e) {
    if (!gameState.gameActive || gameModal.style.display === 'block') return;

    let newX = gameState.playerPosition.x;
    let newY = gameState.playerPosition.y;

    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            newY--;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            newY++;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            newX--;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            newX++;
            break;
        case ' ':
            // Space for special action
            checkSpecialAction();
            return;
    }

    // Check bounds
    if (newX < 0 || newX >= CONFIG.MAZE_SIZE || newY < 0 || newY >= CONFIG.MAZE_SIZE) {
        return;
    }

    // Check for walls
    if (gameState.maze[newY][newX] === 'wall') {
        return;
    }

    // Update position
    gameState.playerPosition.x = newX;
    gameState.playerPosition.y = newY;

    // Check for events at new position
    checkPositionEvents();

    // Render updates
    renderMaze();
    renderMinimap();
    updateHUD();
}

function checkSpecialAction() {
    // Check if player is next to throne
    const distanceToKing = Math.abs(gameState.playerPosition.x - gameState.kingPosition.x) +
        Math.abs(gameState.playerPosition.y - gameState.kingPosition.y);

    if (distanceToKing === 1) {
        gameState.kingHealth = Math.min(100, gameState.kingHealth + 10);
        gameState.score += 50;
        updateHUD();

        // Show feedback
        showTemporaryMessage('King healed! +10 HP, +50 points');
    }

    // Check for nearby energy cells
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const checkX = gameState.playerPosition.x + dx;
            const checkY = gameState.playerPosition.y + dy;

            if (checkX >= 0 && checkX < CONFIG.MAZE_SIZE &&
                checkY >= 0 && checkY < CONFIG.MAZE_SIZE) {

                if (gameState.maze[checkY][checkX] === 'energy') {
                    gameState.energy = Math.min(100, gameState.energy + 20);
                    gameState.maze[checkY][checkX] = 'path';
                    gameState.score += 25;
                    updateHUD();

                    // Show feedback
                    showTemporaryMessage('Energy collected! +20 energy, +25 points');
                }
            }
        }
    }
}

function checkPositionEvents() {
    // Check for monster encounter
    const monsterIndex = gameState.monsterPositions.findIndex(
        m => m.x === gameState.playerPosition.x &&
            m.y === gameState.playerPosition.y &&
            !m.defeated
    );

    if (monsterIndex !== -1) {
        startMonsterChallenge(monsterIndex);
        return;
    }

    // Check for throne reach
    if (gameState.playerPosition.x === gameState.kingPosition.x &&
        gameState.playerPosition.y === gameState.kingPosition.y) {
        gameState.score += 500;
        gameState.gameActive = false;

        // Victory!
        setTimeout(() => {
            if (confirm(`VICTORY!\nFinal Score: ${gameState.score}\nThreats Defeated: ${gameState.monstersDefeated}/${CONFIG.MONSTER_COUNT}\n\nPlay again?`)) {
                startGame();
            } else {
                gameScreen.style.display = 'none';
                startScreen.style.display = 'block';
            }
        }, 500);
    }

    // Check for energy cell
    if (gameState.maze[gameState.playerPosition.y][gameState.playerPosition.x] === 'energy') {
        gameState.energy = Math.min(100, gameState.energy + 30);
        gameState.maze[gameState.playerPosition.y][gameState.playerPosition.x] = 'path';
        gameState.score += 30;
        showTemporaryMessage('Energy boost! +30 energy');
    }
}

// Monster Challenge
function startMonsterChallenge(monsterIndex) {
    gameState.currentChallenge = monsterIndex;
    const monster = gameState.monsterPositions[monsterIndex];

    // Stop player movement
    gameState.gameActive = false;

    // Setup challenge
    gameTitle.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        ${monster.monster.name} ENCOUNTER!
    `;

    document.getElementById('threatName').textContent = monster.monster.name;
    document.getElementById('threatLevel').textContent = monster.monster.threat;
    document.getElementById('threatIcon').innerHTML = monster.monster.icon;

    // Generate challenge based on monster type
    const challenge = generateChallenge(monster.monster.type);
    gameContent.innerHTML = challenge.question;

    // Show character ability
    const character = CHARACTERS[gameState.selectedCharacter];
    characterAbility.innerHTML = `
        <strong>${character.ability}:</strong> ${character.abilityDesc}<br>
        <small>Uses remaining: ${character.abilityUses}</small>
    `;

    // Start timer
    gameState.responseTime = 15;
    document.getElementById('responseTimer').textContent = gameState.responseTime;

    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
        gameState.responseTime--;
        document.getElementById('responseTimer').textContent = gameState.responseTime;

        if (gameState.responseTime <= 0) {
            challengeTimeout();
        }
    }, 1000);

    // Show modal
    gameModal.style.display = 'flex';
}

// UPDATED CYBERSECURITY QUESTIONS
function generateChallenge(type) {
    const challenges = {
        phishing: {
            question: `
                <p><strong>PHISHING ATTACK:</strong> You receive an email that looks like it's from your bank asking you to verify your account. What should you do?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Click the link and enter your login details</li>
                    <li onclick="challengeAnswer('correct')">Contact your bank directly using their official number</li>
                    <li onclick="challengeAnswer('wrong')">Reply to the email asking if it's legitimate</li>
                    <li onclick="challengeAnswer('wrong')">Forward it to friends to warn them</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Never click links in suspicious emails. Always verify directly with the organization.</div>
            `,
            correct: 'correct'
        },
        password: {
            question: `
                <p><strong>PASSWORD SECURITY:</strong> Which of these is the most secure password practice?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Use the same password for all accounts</li>
                    <li onclick="challengeAnswer('wrong')">Use your pet's name followed by 123</li>
                    <li onclick="challengeAnswer('correct')">Use a passphrase with numbers and symbols</li>
                    <li onclick="challengeAnswer('wrong')">Write passwords on a sticky note</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Use unique, complex passwords for each account and enable two-factor authentication.</div>
            `,
            correct: 'correct'
        },
        malware: {
            question: `
                <p><strong>MALWARE PROTECTION:</strong> A popup says your computer is infected and offers a free scan. What should you do?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Download and run the scanner</li>
                    <li onclick="challengeAnswer('correct')">Close the popup and run your own antivirus</li>
                    <li onclick="challengeAnswer('wrong')">Call the number shown for help</li>
                    <li onclick="challengeAnswer('wrong')">Ignore it and continue browsing</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Fake security alerts are common malware tactics. Use trusted antivirus software.</div>
            `,
            correct: 'correct'
        },
        firewall: {
            question: `
                <p><strong>FIREWALL SECURITY:</strong> Your firewall is blocking a game you want to play. What's the safest action?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Turn off the firewall completely</li>
                    <li onclick="challengeAnswer('correct')">Create an exception only for that game</li>
                    <li onclick="challengeAnswer('wrong')">Uninstall the firewall software</li>
                    <li onclick="challengeAnswer('wrong')">Ignore all future firewall warnings</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Firewalls protect your network. Only allow exceptions for trusted programs.</div>
            `,
            correct: 'correct'
        },
        encryption: {
            question: `
                <p><strong>DATA ENCRYPTION:</strong> You need to send sensitive documents to your teacher. What's the best method?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Email them as regular attachments</li>
                    <li onclick="challengeAnswer('correct')">Use encrypted email or secure file transfer</li>
                    <li onclick="challengeAnswer('wrong')">Post them on a public cloud drive</li>
                    <li onclick="challengeAnswer('wrong')">Text them as photos</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Encryption scrambles data so only authorized people can read it. Always encrypt sensitive files.</div>
            `,
            correct: 'correct'
        },
        updates: {
            question: `
                <p><strong>SOFTWARE UPDATES:</strong> Your computer keeps showing update notifications. What should you do?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Ignore them - they're annoying</li>
                    <li onclick="challengeAnswer('correct')">Install updates regularly</li>
                    <li onclick="challengeAnswer('wrong')">Turn off automatic updates</li>
                    <li onclick="challengeAnswer('wrong')">Only update once a year</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Updates often include security patches that fix vulnerabilities hackers could exploit.</div>
            `,
            correct: 'correct'
        },
        social: {
            question: `
                <p><strong>SOCIAL ENGINEERING:</strong> Someone calls claiming to be tech support asking for remote access to your computer. What do you do?</p>
                <ul class="option-list">
                    <li onclick="challengeAnswer('wrong')">Give them access to help fix problems</li>
                    <li onclick="challengeAnswer('correct')">Hang up and contact the company directly</li>
                    <li onclick="challengeAnswer('wrong')">Give them your password to check</li>
                    <li onclick="challengeAnswer('wrong')">Let them guide you through changes</li>
                </ul>
                <div class="cyber-tip"><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Legitimate companies won't call asking for remote access. Never give control of your computer to strangers.</div>
            `,
            correct: 'correct'
        }
    };

    return challenges[type] || challenges.phishing;
}

// Challenge Answer Handler
function challengeAnswer(answer) {
    if (gameState.timer) clearInterval(gameState.timer);

    const monster = gameState.monsterPositions[gameState.currentChallenge];
    const character = CHARACTERS[gameState.selectedCharacter];

    if (answer === 'correct') {
        // Victory
        monster.defeated = true;
        gameState.monstersDefeated++;
        gameState.score += 100;
        gameState.kingHealth = Math.min(100, gameState.kingHealth + 5);

        gameContent.innerHTML = `
            <div style="color: #00ff00; text-align: center; padding: 20px;">
                <i class="fas fa-trophy" style="font-size: 3rem;"></i>
                <h3>THREAT NEUTRALIZED!</h3>
                <p>+100 points<br>King recovered 5 HP</p>
                <p><strong>Cybersecurity Knowledge Gained!</strong></p>
            </div>
        `;
    } else {
        // Use character ability if available
        if (character.abilityUses > 0) {
            character.abilityUses--;
            gameState.score += 50;

            gameContent.innerHTML = `
                <div style="color: #ffff00; text-align: center; padding: 20px;">
                    <i class="fas fa-shield-alt" style="font-size: 3rem;"></i>
                    <h3>ABILITY ACTIVATED!</h3>
                    <p>${character.ability} saved you!<br>+50 points</p>
                </div>
            `;

            monster.defeated = true;
            gameState.monstersDefeated++;
        } else {
            // Failure
            gameState.kingHealth -= 20;
            gameState.score = Math.max(0, gameState.score - 50);

            gameContent.innerHTML = `
                <div style="color: #ff0000; text-align: center; padding: 20px;">
                    <i class="fas fa-skull-crossbones" style="font-size: 3rem;"></i>
                    <h3>SECURITY BREACH!</h3>
                    <p>King lost 20 HP<br>-50 points</p>
                    <p><strong>Remember the cybersecurity tip!</strong></p>
                </div>
            `;

            if (gameState.kingHealth <= 0) {
                setTimeout(() => {
                    gameOver();
                }, 2000);
            }
        }
    }

    // Update ability display
    characterAbility.innerHTML = `
        <strong>${character.ability}:</strong> ${character.abilityDesc}<br>
        <small>Uses remaining: ${character.abilityUses}</small>
    `;

    // Close modal after delay
    setTimeout(() => {
        closeMiniGame();
    }, 2000);
}

function challengeTimeout() {
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.kingHealth -= 10;

    gameContent.innerHTML = `
        <div style="color: #ff0000; text-align: center; padding: 20px;">
            <i class="fas fa-clock" style="font-size: 3rem;"></i>
            <h3>TIME OUT!</h3>
            <p>No response detected<br>King lost 10 HP</p>
            <p><strong>In cybersecurity, quick response is key!</strong></p>
        </div>
    `;

    if (gameState.kingHealth <= 0) {
        setTimeout(() => {
            gameOver();
        }, 2000);
    }

    setTimeout(() => {
        closeMiniGame();
    }, 2000);
}

function closeMiniGame() {
    if (gameState.timer) clearInterval(gameState.timer);
    gameModal.style.display = 'none';
    gameState.gameActive = true;
    updateHUD();
    renderMaze();
    renderMinimap();
}

function gameOver() {
    gameState.gameActive = false;

    setTimeout(() => {
        if (confirm(`GAME OVER!\nFinal Score: ${gameState.score}\nThreats Defeated: ${gameState.monstersDefeated}/${CONFIG.MONSTER_COUNT}\n\nTry again?`)) {
            startGame();
        } else {
            gameScreen.style.display = 'none';
            startScreen.style.display = 'block';
        }
    }, 1000);
}

function pauseGame() {
    gameState.gameActive = !gameState.gameActive;

    const pauseButton = document.querySelector('.hud-button i');
    if (pauseButton) {
        if (!gameState.gameActive) {
            pauseButton.className = 'fas fa-play';
            showTemporaryMessage('Game Paused');
        } else {
            pauseButton.className = 'fas fa-pause';
            showTemporaryMessage('Game Resumed');
        }
    }
}

function showTemporaryMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'temporary-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: #00ffff;
        padding: 20px 40px;
        border-radius: 10px;
        border: 2px solid #00ffff;
        z-index: 1000;
        font-size: 1.2rem;
        animation: fadeOut 2s forwards;
    `;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 2000);
}

// Make functions available globally
window.selectCharacter = selectCharacter;
window.challengeAnswer = challengeAnswer;
window.closeMiniGame = closeMiniGame;

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initGame);