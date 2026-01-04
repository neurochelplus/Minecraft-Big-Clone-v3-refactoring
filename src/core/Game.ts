import * as THREE from 'three';
import { Renderer } from './Renderer';
import { GameState } from './GameState';
import { World } from '../World';
import { Environment } from '../Environment';
import { ItemEntity } from '../ItemEntity';
import { MobManager } from '../MobManager';
import { PlayerHand } from '../PlayerHand';

/**
 * Главный класс игры, координирующий все системы
 * 
 * Этот класс будет использоваться для управления всеми системами игры:
 * - Рендеринг (Renderer)
 * - Состояние игры (GameState)
 * - Мир (World)
 * - Окружение (Environment)
 * - Игрок (Player системы)
 * - Инвентарь
 * - Блоки
 * - И т.д.
 */
export class Game {
  public renderer: Renderer;
  public gameState: GameState;
  public world: World;
  public environment: Environment;
  public entities: ItemEntity[];
  public mobManager: MobManager;
  public playerHand: PlayerHand;

  private prevTime: number = performance.now();
  private animationId: number | null = null;

  constructor(
    renderer: Renderer,
    gameState: GameState,
    world: World,
    environment: Environment,
    entities: ItemEntity[],
    mobManager: MobManager,
    playerHand: PlayerHand
  ) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.world = world;
    this.environment = environment;
    this.entities = entities;
    this.mobManager = mobManager;
    this.playerHand = playerHand;
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this.animationId !== null) {
      return; // Already started
    }
    this.animate();
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Основной игровой цикл
   * 
   * Этот метод будет вызываться каждый кадр и обновлять все системы.
   * Полная реализация будет добавлена при интеграции всех систем.
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;
    this.prevTime = time;

    if (this.gameState.getPaused()) {
      this.renderer.renderOnlyMain();
      return;
    }

    // Здесь будет обновление всех систем
    // Пока что просто рендерим
    this.renderer.render();
  };

  /**
   * Обновление игрового состояния
   * Этот метод будет вызываться из animate() для обновления всех систем
   */
  public update(delta: number): void {
    // Обновление мира
    this.world.update(this.renderer.controls.object.position);

    // Обновление окружения
    this.environment.update(delta, this.renderer.controls.object.position);

    // Обновление менеджера мобов
    // this.mobManager.update(delta, this.renderer.controls.object.position, this.environment, ...);

    // Обновление сущностей
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      const currentTime = performance.now() / 1000;
      entity.update(currentTime, delta);

      if (entity.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      // Pickup logic будет здесь
    }

    // Обновление игрока (Physics, Combat, Health) будет здесь
    // Обновление блоков (Cursor, Breaking, Interaction) будет здесь
    // Обновление инвентаря будет здесь
  }
}

