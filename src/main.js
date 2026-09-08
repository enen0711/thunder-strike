import './style.css';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('score-value');
const hpValue = document.getElementById('hp-value');
const uiLayer = document.getElementById('ui-layer');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScore = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const weaponBtns = document.querySelectorAll('.weapon-btn');

canvas.width = 520;
//canvas.width = window.innerWidth;
canvas.height = 800;

// Game state
let gameState = 'menu'; // 'menu', 'playing', 'gameover'
let score = 0;
let frameCount = 0;
let animationId;
let selectedWeapon = 'normal';

// Game Objects
let player;
let enemies = [];
let playerBullets = [];
let enemyBullets = [];
let particles = [];
let bossActive = false;

// Mouse tracking
let mouse = {
  x: canvas.width / 2,
  y: canvas.height - 100
};

canvas.addEventListener('mousemove', (e) => {
  if (gameState !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  mouse.x = (e.clientX - rect.left) * scaleX;
  mouse.y = (e.clientY - rect.top) * scaleY;
});

// Weapon Selection
weaponBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    selectedWeapon = e.currentTarget.dataset.weapon;
    startGame();
  });
});

restartBtn.addEventListener('click', () => {
  gameState = 'menu';
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});

// Classes
class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 100;
    this.width = 40;
    this.height = 40;
    this.hp = 100;
    
    if (selectedWeapon === 'laser') {
      this.fireRate = 30;
    } else if (selectedWeapon === 'spread') {
      this.fireRate = 15;
    } else {
      this.fireRate = 10;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Draw ship
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2); 
    ctx.lineTo(this.width / 2, this.height / 2); 
    ctx.lineTo(this.width / 4, this.height / 4); 
    ctx.lineTo(-this.width / 4, this.height / 4);
    ctx.lineTo(-this.width / 2, this.height / 2); 
    ctx.closePath();
    ctx.fill();

    // Engine glow
    ctx.fillStyle = '#0088ff';
    ctx.beginPath();
    ctx.arc(0, this.height / 2, 8 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  update() {
    this.x += (mouse.x - this.x) * 0.3;
    this.y += (mouse.y - this.y) * 0.3;

    this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
    this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));

    if (frameCount % this.fireRate === 0) {
      this.fire();
    }
  }

  fire() {
    if (selectedWeapon === 'normal') {
      playerBullets.push(new Bullet(this.x, this.y - this.height / 2, 0, -15, '#00ffff', true, 'normal'));
      if (score > 1000) {
        playerBullets.push(new Bullet(this.x - 15, this.y, 0, -12, '#00ffff', true, 'normal'));
        playerBullets.push(new Bullet(this.x + 15, this.y, 0, -12, '#00ffff', true, 'normal'));
      }
    } else if (selectedWeapon === 'spread') {
      playerBullets.push(new Bullet(this.x, this.y - this.height / 2, 0, -12, '#00ff00', true, 'normal'));
      playerBullets.push(new Bullet(this.x, this.y - this.height / 2, -3, -11, '#00ff00', true, 'normal'));
      playerBullets.push(new Bullet(this.x, this.y - this.height / 2, 3, -11, '#00ff00', true, 'normal'));
      if (score > 1000) {
        playerBullets.push(new Bullet(this.x, this.y - this.height / 2, -6, -10, '#00ff00', true, 'normal'));
        playerBullets.push(new Bullet(this.x, this.y - this.height / 2, 6, -10, '#00ff00', true, 'normal'));
      }
    } else if (selectedWeapon === 'laser') {
      playerBullets.push(new Bullet(this.x, this.y - this.height, 0, -20, '#ff00ff', true, 'laser'));
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    createParticles(this.x, this.y, '#00ffff');
    if (this.hp <= 0) {
      this.hp = 0;
      endGame();
    }
    updateUI();
  }
}

class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 1: basic, 2: shooter, 3: tank, 4: boss
    this.bossAngle = 0;
    
    if (type === 1) {
      this.width = 30; this.height = 30; this.hp = 20;
      this.color = '#ff3366'; this.speed = 3 + Math.random() * 2; this.score = 100;
    } else if (type === 2) {
      this.width = 40; this.height = 40; this.hp = 40;
      this.color = '#ffaa00'; this.speed = 2 + Math.random() * 1.5; this.score = 250;
      this.fireRate = 60 + Math.random() * 60;
    } else if (type === 3) {
      this.width = 60; this.height = 60; this.hp = 150;
      this.color = '#ff0000'; this.speed = 1 + Math.random(); this.score = 500;
    } else if (type === 4) { // Boss
      this.width = 80; this.height = 80; this.hp = 2000;
      this.color = '#9900ff'; this.speed = 2; this.score = 5000;
      this.fireRate = 5;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = this.color;

    if (this.type === 1) {
      ctx.beginPath();
      ctx.moveTo(0, this.height/2);
      ctx.lineTo(-this.width/2, -this.height/2);
      ctx.lineTo(this.width/2, -this.height/2);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 2) {
      ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
    } else if (this.type === 3) {
      ctx.beginPath();
      ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 4) { // Boss Shape
      ctx.beginPath();
      ctx.moveTo(0, this.height/2);
      ctx.lineTo(this.width/2, 0);
      ctx.lineTo(this.width/4, -this.height/2);
      ctx.lineTo(-this.width/4, -this.height/2);
      ctx.lineTo(-this.width/2, 0);
      ctx.closePath();
      ctx.fill();
      
      // Boss core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  update() {
    if (this.type === 4) {
      // Boss movement: move down to y=150 and stay
      if (this.y < 150) {
        this.y += this.speed;
      } else {
        // Stop moving down, start moving side to side slightly
        this.x += Math.sin(frameCount * 0.05) * 2;
      }
      
      // Boss firing weird circular patterns
      if (frameCount % this.fireRate === 0) {
        this.bossAngle += 0.3;
        let vx = Math.cos(this.bossAngle) * 6;
        let vy = Math.sin(this.bossAngle) * 6;
        // only shoot downwards mostly or full circle
        enemyBullets.push(new Bullet(this.x, this.y + 20, vx, Math.abs(vy) + 2, '#9900ff', false, 'normal'));
        
        // Also shoot spread every 60 frames
        if (frameCount % 60 === 0) {
           enemyBullets.push(new Bullet(this.x, this.y, -4, 5, '#ff00ff', false, 'normal'));
           enemyBullets.push(new Bullet(this.x, this.y, 0, 6, '#ff00ff', false, 'normal'));
           enemyBullets.push(new Bullet(this.x, this.y, 4, 5, '#ff00ff', false, 'normal'));
        }
      }

    } else {
      this.y += this.speed;
      if (this.type === 2 && frameCount % Math.floor(this.fireRate) === 0) {
        enemyBullets.push(new Bullet(this.x, this.y + this.height/2, 0, 6, '#ffaa00', false, 'normal'));
      }
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      score += this.score;
      createParticles(this.x, this.y, this.color);
      updateUI();
      if (this.type === 4) bossActive = false;
      return true; // destroyed
    }
    return false;
  }
}

class Bullet {
  constructor(x, y, vx, vy, color, isPlayer, type) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.isPlayer = isPlayer;
    this.type = type;
    
    if (type === 'laser') {
      this.width = 10;
      this.height = 60;
    } else {
      this.width = 6;
      this.height = 15;
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    ctx.shadowBlur = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.velocity = {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8
    };
    this.alpha = 1;
    this.size = Math.random() * 4 + 1;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  update() {
    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.alpha -= 0.02;
  }
}

function createParticles(x, y, color) {
  for (let i = 0; i < 15; i++) {
    particles.push(new Particle(x, y, color));
  }
}

let lastBossScore = 0;

function spawnEnemies() {
  if (bossActive) return; // Don't spawn normal enemies if boss is active

  // Boss spawn condition
  if (score > 0 && score - lastBossScore >= 3000) {
    enemies.push(new Enemy(canvas.width / 2, -100, 4));
    bossActive = true;
    lastBossScore = score;
    return;
  }

  let spawnRate = Math.max(20, 60 - Math.floor(score / 500));
  
  if (frameCount % spawnRate === 0) {
    let x = Math.random() * (canvas.width - 60) + 30;
    let type = 1;
    let rand = Math.random();
    if (score > 500 && rand < 0.3) type = 2;
    if (score > 2000 && rand < 0.1) type = 3;
    
    enemies.push(new Enemy(x, -50, type));
  }
}

function checkCollision(rect1, rect2) {
  return (
    rect1.x - rect1.width/2 < rect2.x + rect2.width/2 &&
    rect1.x + rect1.width/2 > rect2.x - rect2.width/2 &&
    rect1.y - rect1.height/2 < rect2.y + rect2.height/2 &&
    rect1.y + rect1.height/2 > rect2.y - rect2.height/2
  );
}

function updateUI() {
  scoreValue.innerText = score;
  hpValue.innerText = player.hp;
}

function endGame() {
  gameState = 'gameover';
  uiLayer.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
  finalScore.innerText = score;
}

function startGame() {
  gameState = 'playing';
  startScreen.classList.add('hidden');
  uiLayer.classList.remove('hidden');
  gameOverScreen.classList.add('hidden');
  
  player = new Player();
  enemies = [];
  playerBullets = [];
  enemyBullets = [];
  particles = [];
  score = 0;
  lastBossScore = 0;
  bossActive = false;
  frameCount = 0;
  updateUI();
  
  // Set initial mouse pos to center
  mouse.x = canvas.width / 2;
  mouse.y = canvas.height - 100;

  if (animationId) cancelAnimationFrame(animationId);
  gameLoop();
}

function drawBackground() {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) {
    let x = (Math.sin(i * 123) * canvas.width * 10) % canvas.width;
    let y = (frameCount * (i % 3 + 1) * 0.5 + i * 99) % canvas.height;
    if (x < 0) x += canvas.width;
    ctx.fillRect(x, y, 1, 1);
  }
}

function gameLoop() {
  if (gameState !== 'playing') {
    if (animationId) cancelAnimationFrame(animationId);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  player.update();
  player.draw();

  spawnEnemies();

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.draw();
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Update Player Bullets
  for (let i = playerBullets.length - 1; i >= 0; i--) {
    let b = playerBullets[i];
    b.update();
    b.draw();
    if (b.y < -100 || b.x < -50 || b.x > canvas.width + 50) {
      playerBullets.splice(i, 1);
      continue;
    }

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      let e = enemies[j];
      if (checkCollision(b, e)) {
        if (e.takeDamage(b.type === 'laser' ? 15 : 10)) {
          enemies.splice(j, 1);
        }
        // Laser pierces, don't remove bullet
        if (b.type !== 'laser') {
          playerBullets.splice(i, 1);
          hit = true;
        }
        break;
      }
    }
    if (hit) continue;
  }

  // Update Enemy Bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let b = enemyBullets[i];
    b.update();
    b.draw();
    if (b.y > canvas.height + 50 || b.x < -50 || b.x > canvas.width + 50) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (checkCollision(b, player)) {
      player.takeDamage(10);
      enemyBullets.splice(i, 1);
    }
  }

  // Update Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update();
    e.draw();

    if (e.y > canvas.height + 50) {
      enemies.splice(i, 1);
      if (e.type === 4) bossActive = false; // Just in case boss goes off screen
      continue;
    }

    if (checkCollision(e, player)) {
      player.takeDamage(20);
      if (e.type !== 4) {
        e.takeDamage(1000); 
        enemies.splice(i, 1);
      }
    }
  }

  frameCount++;
  animationId = requestAnimationFrame(gameLoop);
}

// Initial state
ctx.fillStyle = '#121212';
ctx.fillRect(0, 0, canvas.width, canvas.height);
