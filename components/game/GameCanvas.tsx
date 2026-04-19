'use client'

import { useEffect, useRef } from 'react'
import type { GameInitData } from './GameScene'

interface Props {
  initData: GameInitData
  onGameOver: (result: { won: boolean; points: number; cityHealth: number }) => void
}

export default function GameCanvas({ initData, onGameOver }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let game: import('phaser').Game | null = null

    async function boot() {
      if (!containerRef.current) return

      const Phaser = await import('phaser')
      const { GameScene } = await import('./GameScene')

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        backgroundColor: '#0d0d1a',
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
          width: 960,
          height: 640,
        },
      })

      game.events.once('ready', () => {
        game!.scene.add('GameScene', GameScene, true, initData)
      })
    }

    boot()

    const handleGameOver = (e: Event) => onGameOver((e as CustomEvent).detail)
    window.addEventListener('fortifyfi:gameover', handleGameOver)

    return () => {
      game?.destroy(true)
      window.removeEventListener('fortifyfi:gameover', handleGameOver)
    }
  }, []) // intentionally no deps — game only boots once

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ lineHeight: 0 }}  // prevents gap below canvas
    />
  )
}
