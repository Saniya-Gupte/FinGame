import * as Phaser from 'phaser'

// ── Constants ────────────────────────────────────────────────
const COLS = 20
const ROWS = 12
const CELL = 48
const UI_H = 64
const GAME_W = COLS * CELL   // 960
const GAME_H = ROWS * CELL + UI_H  // 640

// Path waypoints – enemies walk corner-to-corner
const WAYPOINTS = [
  { col: 0,  row: 5 },
  { col: 5,  row: 5 },
  { col: 5,  row: 2 },
  { col: 12, row: 2 },
  { col: 12, row: 8 },
  { col: 17, row: 8 },
  { col: 17, row: 5 },
  { col: 20, row: 5 },  // exit (off-screen)
]

function buildPathCells() {
  const set = new Set<string>()
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const a = WAYPOINTS[i], b = WAYPOINTS[i + 1]
    if (a.col === b.col) {
      for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++)
        set.add(`${a.col},${r}`)
    } else {
      for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++)
        set.add(`${c},${a.row}`)
    }
  }
  return set
}

const PATH_CELLS = buildPathCells()
const cx = (col: number) => col * CELL + CELL / 2
const cy = (row: number) => UI_H + row * CELL + CELL / 2

// ── Tower definitions ────────────────────────────────────────
type TowerType = 'archer' | 'cannon'
const TOWERS = {
  archer: { name: 'Archer', cost: 50,  damage: 20, range: 2.5, fireRate: 900,  color: 0x22c55e },
  cannon: { name: 'Cannon', cost: 120, damage: 60, range: 2.0, fireRate: 2400, color: 0x3b82f6 },
}

// ── Types ────────────────────────────────────────────────────
export interface GameInitData {
  points: number
  cityHealth: number
  waveConfig: {
    enemy_count: number
    enemy_speed: number
    enemy_hp: number
    spawn_rate: number
  }
}

interface EnemyObj {
  container: Phaser.GameObjects.Container
  hpFill: Phaser.GameObjects.Graphics
  hp: number
  maxHp: number
  wpIdx: number
  alive: boolean
}

interface TowerObj {
  col: number
  row: number
  type: TowerType
  container: Phaser.GameObjects.Container
  rangeCircle: Phaser.GameObjects.Graphics
  lastFired: number
}

// ── Scene ────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  private points = 200
  private cityHealth = 100
  private waveConfig = { enemy_count: 14, enemy_speed: 1.2, enemy_hp: 100, spawn_rate: 1.8 }

  private towers: TowerObj[] = []
  private enemies: EnemyObj[] = []
  private selected: TowerType = 'archer'
  private spawned = 0
  private resolved = 0
  private over = false

  private ptText!: Phaser.GameObjects.Text
  private hpText!: Phaser.GameObjects.Text
  private wvText!: Phaser.GameObjects.Text
  private msgText!: Phaser.GameObjects.Text
  private selHighlight!: Phaser.GameObjects.Graphics
  private archerBtn!: Phaser.GameObjects.Container
  private cannonBtn!: Phaser.GameObjects.Container
  private hoverCell!: Phaser.GameObjects.Graphics

  constructor() { super({ key: 'GameScene' }) }

  init(data: GameInitData) {
    if (data) {
      this.points      = data.points      ?? 200
      this.cityHealth  = data.cityHealth  ?? 100
      if (data.waveConfig) this.waveConfig = data.waveConfig
    }
    this.towers = []; this.enemies = []
    this.spawned = 0; this.resolved = 0; this.over = false
  }

  create() {
    // Background
    this.add.rectangle(GAME_W / 2, UI_H + (ROWS * CELL) / 2, GAME_W, ROWS * CELL, 0x1a1a2e)

    this.drawGrid()
    this.drawPath()
    this.createUI()
    this.createSelector()
    this.setupInput()
    this.startWave()
  }

  // ── Drawing ────────────────────────────────────────────────
  private drawGrid() {
    const g = this.add.graphics()
    g.lineStyle(1, 0x2a2a4a, 0.6)
    for (let c = 0; c <= COLS; c++) { g.moveTo(c * CELL, UI_H); g.lineTo(c * CELL, UI_H + ROWS * CELL) }
    for (let r = 0; r <= ROWS; r++) { g.moveTo(0, UI_H + r * CELL); g.lineTo(GAME_W, UI_H + r * CELL) }
    g.strokePath()

    // Hover highlight (updated on pointer move)
    this.hoverCell = this.add.graphics()
  }

  private drawPath() {
    const g = this.add.graphics()
    PATH_CELLS.forEach(key => {
      const [col, row] = key.split(',').map(Number)
      g.fillStyle(0x5c3d2e, 1)
      g.fillRect(col * CELL + 1, UI_H + row * CELL + 1, CELL - 2, CELL - 2)
    })
    // Direction dots
    g.fillStyle(0x8b5e4a, 0.8)
    for (let i = 1; i < WAYPOINTS.length - 1; i++) {
      const w = WAYPOINTS[i]
      g.fillCircle(cx(w.col), cy(w.row), 5)
    }
  }

  // ── UI ─────────────────────────────────────────────────────
  private createUI() {
    this.add.rectangle(GAME_W / 2, UI_H / 2, GAME_W, UI_H, 0x0d0d1a)
    this.add.text(14, 8, 'FORTIFYFI', { fontSize: '13px', color: '#f59e0b', fontStyle: 'bold' })

    this.ptText = this.add.text(14, 30, `Points: ${this.points}`,     { fontSize: '14px', color: '#fbbf24' })
    this.hpText = this.add.text(190, 30, `City HP: ${this.cityHealth}`, { fontSize: '14px', color: '#f87171' })
    this.wvText = this.add.text(370, 30, `Enemies: 0/${this.waveConfig.enemy_count}`, { fontSize: '14px', color: '#94a3b8' })

    this.msgText = this.add.text(GAME_W / 2, UI_H + (ROWS * CELL) / 2, '', {
      fontSize: '36px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(20)
  }

  private createSelector() {
    this.selHighlight = this.add.graphics()

    // Archer button
    const aG = this.add.graphics()
    aG.fillStyle(0x22c55e, 1).fillRect(0, 0, 22, 22)
    aG.fillStyle(0x15803d, 1).fillTriangle(3, 19, 11, 3, 19, 19)
    const aLabel = this.add.text(26, 3, 'Archer  50pts', { fontSize: '11px', color: '#86efac' })
    this.archerBtn = this.add.container(GAME_W - 290, 10, [aG, aLabel])
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 125, 22), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => this.selectTower('archer'))
      .on('pointerover', () => this.input.setDefaultCursor('pointer'))
      .on('pointerout',  () => this.input.setDefaultCursor('default'))

    // Cannon button
    const cG = this.add.graphics()
    cG.fillStyle(0x3b82f6, 1).fillCircle(11, 11, 11)
    cG.fillStyle(0x1d4ed8, 1).fillRect(7, 7, 8, 8)
    const cLabel = this.add.text(26, 3, 'Cannon  120pts', { fontSize: '11px', color: '#93c5fd' })
    this.cannonBtn = this.add.container(GAME_W - 148, 10, [cG, cLabel])
      .setInteractive(new Phaser.Geom.Rectangle(0, 0, 135, 22), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => this.selectTower('cannon'))
      .on('pointerover', () => this.input.setDefaultCursor('pointer'))
      .on('pointerout',  () => this.input.setDefaultCursor('default'))

    this.refreshHighlight()
  }

  private selectTower(t: TowerType) { this.selected = t; this.refreshHighlight() }

  private refreshHighlight() {
    this.selHighlight.clear()
    this.selHighlight.lineStyle(2, 0xf59e0b, 1)
    const btn = this.selected === 'archer' ? this.archerBtn : this.cannonBtn
    this.selHighlight.strokeRect(btn.x - 4, btn.y - 4, 145, 32)
  }

  // ── Input ──────────────────────────────────────────────────
  private setupInput() {
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.hoverCell.clear()
      if (p.y < UI_H) return
      const col = Math.floor(p.x / CELL)
      const row = Math.floor((p.y - UI_H) / CELL)
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      if (PATH_CELLS.has(`${col},${row}`)) return
      if (this.towers.find(t => t.col === col && t.row === row)) return
      const def = TOWERS[this.selected]
      const canAfford = this.points >= def.cost
      this.hoverCell.fillStyle(canAfford ? 0xf59e0b : 0xef4444, 0.25)
      this.hoverCell.fillRect(col * CELL + 1, UI_H + row * CELL + 1, CELL - 2, CELL - 2)
    })

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.over || p.y < UI_H) return
      const col = Math.floor(p.x / CELL)
      const row = Math.floor((p.y - UI_H) / CELL)
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return
      if (PATH_CELLS.has(`${col},${row}`)) return
      if (this.towers.find(t => t.col === col && t.row === row)) return
      const def = TOWERS[this.selected]
      if (this.points < def.cost) { this.flash('Not enough points!', '#ef4444'); return }
      this.placeTower(col, row, this.selected)
    })
  }

  // ── Tower placement ─────────────────────────────────────────
  private placeTower(col: number, row: number, type: TowerType) {
    const def = TOWERS[type]
    this.points -= def.cost
    this.updateHUD()

    const x = cx(col), y = cy(row)
    const g = this.add.graphics()
    if (type === 'archer') {
      g.fillStyle(def.color, 1).fillRect(-16, -16, 32, 32)
      g.fillStyle(0x15803d, 1).fillTriangle(-9, 10, 0, -12, 9, 10)
    } else {
      g.fillStyle(def.color, 1).fillCircle(0, 0, 17)
      g.fillStyle(0x1d4ed8, 1).fillRect(-7, -7, 14, 14)
    }

    const rc = this.add.graphics()
    rc.lineStyle(1, def.color, 0.2).strokeCircle(0, 0, def.range * CELL)
    rc.setVisible(false)

    const container = this.add.container(x, y, [rc, g]).setDepth(1)
      .setInteractive(new Phaser.Geom.Circle(0, 0, CELL / 2), Phaser.Geom.Circle.Contains)
      .on('pointerover', () => rc.setVisible(true))
      .on('pointerout',  () => rc.setVisible(false))

    this.towers.push({ col, row, type, container, rangeCircle: rc, lastFired: 0 })
  }

  // ── Wave spawning ───────────────────────────────────────────
  private startWave() {
    const delay = (1 / this.waveConfig.spawn_rate) * 1000
    this.time.addEvent({
      delay,
      repeat: this.waveConfig.enemy_count - 1,
      callback: this.spawnEnemy,
      callbackScope: this,
    })
  }

  private spawnEnemy() {
    if (this.over) return
    this.spawned++
    this.updateHUD()

    const body = this.add.graphics()
    body.fillStyle(0xef4444, 1).fillCircle(0, 0, 13)
    body.fillStyle(0xb91c1c, 1).fillCircle(0, -3, 6)

    const hpBg = this.add.graphics()
    hpBg.fillStyle(0x374151, 1).fillRect(-15, -22, 30, 5)

    const hpFill = this.add.graphics()
    hpFill.fillStyle(0x22c55e, 1).fillRect(-15, -22, 30, 5)

    const container = this.add.container(cx(WAYPOINTS[0].col), cy(WAYPOINTS[0].row), [body, hpBg, hpFill]).setDepth(3)

    const enemy: EnemyObj = {
      container, hpFill,
      hp: this.waveConfig.enemy_hp, maxHp: this.waveConfig.enemy_hp,
      wpIdx: 1, alive: true,
    }
    this.enemies.push(enemy)
    this.moveEnemy(enemy)
  }

  private moveEnemy(enemy: EnemyObj) {
    if (!enemy.alive) return
    if (enemy.wpIdx >= WAYPOINTS.length) { this.enemyExit(enemy); return }

    const wp = WAYPOINTS[enemy.wpIdx]
    const tx = cx(wp.col), ty = cy(wp.row)
    const dist = Phaser.Math.Distance.Between(enemy.container.x, enemy.container.y, tx, ty)
    const duration = (dist / (CELL * this.waveConfig.enemy_speed)) * 1000

    this.tweens.add({
      targets: enemy.container, x: tx, y: ty, duration, ease: 'Linear',
      onComplete: () => { if (!enemy.alive) return; enemy.wpIdx++; this.moveEnemy(enemy) },
    })
  }

  private enemyExit(enemy: EnemyObj) {
    if (!enemy.alive) return
    enemy.alive = false
    enemy.container.destroy()
    this.cityHealth = Math.max(0, this.cityHealth - 20)
    this.resolved++
    this.updateHUD()
    if (this.cityHealth <= 0) { this.endGame(false); return }
    this.checkWaveDone()
  }

  private damageEnemy(enemy: EnemyObj, dmg: number) {
    if (!enemy.alive) return
    enemy.hp = Math.max(0, enemy.hp - dmg)

    const pct = enemy.hp / enemy.maxHp
    enemy.hpFill.clear()
    const color = pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444
    enemy.hpFill.fillStyle(color, 1).fillRect(-15, -22, Math.round(30 * pct), 5)

    if (enemy.hp <= 0) {
      enemy.alive = false
      this.tweens.killTweensOf(enemy.container)
      this.tweens.add({
        targets: enemy.container, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 180,
        onComplete: () => enemy.container.destroy(),
      })
      this.points += 10
      this.resolved++
      this.updateHUD()
      this.checkWaveDone()
    }
  }

  private checkWaveDone() {
    if (this.over) return
    if (this.resolved >= this.waveConfig.enemy_count) this.endGame(this.cityHealth > 0)
  }

  // ── Update (tower firing) ───────────────────────────────────
  update(time: number) {
    if (this.over) return

    for (const tower of this.towers) {
      const def = TOWERS[tower.type]
      if (time - tower.lastFired < def.fireRate) continue

      const tx = cx(tower.col), ty = cy(tower.row)
      const rangePx = def.range * CELL
      let target: EnemyObj | null = null
      let best = Infinity

      for (const e of this.enemies) {
        if (!e.alive) continue
        const d = Phaser.Math.Distance.Between(tx, ty, e.container.x, e.container.y)
        if (d <= rangePx && d < best) { target = e; best = d }
      }

      if (target) {
        tower.lastFired = time
        this.shoot(tower, target)
      }
    }
  }

  private shoot(tower: TowerObj, enemy: EnemyObj) {
    const def = TOWERS[tower.type]
    const proj = this.add.circle(cx(tower.col), cy(tower.row), tower.type === 'cannon' ? 7 : 4, def.color).setDepth(4)

    this.tweens.add({
      targets: proj,
      x: enemy.container.x, y: enemy.container.y,
      duration: 140, ease: 'Linear',
      onComplete: () => {
        proj.destroy()
        if (!enemy.alive) return
        this.damageEnemy(enemy, def.damage)
        // Cannon splash
        if (tower.type === 'cannon') {
          const splash = this.add.circle(enemy.container.x, enemy.container.y, 32, 0x3b82f6, 0.25).setDepth(4)
          this.time.delayedCall(220, () => splash.destroy())
          for (const e of this.enemies) {
            if (!e.alive || e === enemy) continue
            const d = Phaser.Math.Distance.Between(e.container.x, e.container.y, enemy.container.x, enemy.container.y)
            if (d < 32) this.damageEnemy(e, Math.floor(def.damage * 0.5))
          }
        }
      },
    })
  }

  // ── Game over ───────────────────────────────────────────────
  private endGame(won: boolean) {
    if (this.over) return
    this.over = true
    this.msgText.setText(won ? '🏰 FORTRESS HELD!' : '💀 FORTRESS FELL!').setColor(won ? '#22c55e' : '#ef4444')
    window.dispatchEvent(new CustomEvent('fortifyfi:gameover', {
      detail: { won, points: this.points, cityHealth: this.cityHealth },
    }))
  }

  // ── Helpers ─────────────────────────────────────────────────
  private updateHUD() {
    this.ptText.setText(`Points: ${this.points}`)
    this.hpText.setText(`City HP: ${this.cityHealth}`)
    this.wvText.setText(`Enemies: ${this.spawned}/${this.waveConfig.enemy_count}`)
  }

  private flash(msg: string, color: string) {
    const t = this.add.text(GAME_W / 2, UI_H + 50, msg, {
      fontSize: '16px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15)
    this.tweens.add({ targets: t, alpha: 0, y: UI_H + 30, duration: 1400, onComplete: () => t.destroy() })
  }
}
