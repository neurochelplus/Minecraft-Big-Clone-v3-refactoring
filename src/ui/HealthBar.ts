// Компонент для отображения здоровья игрока

export class HealthBar {
  private element: HTMLElement;
  private readonly MAX_HP = 20;
  private units: HTMLElement[] = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.init();
  }

  private init(): void {
    // Создаем 20 единиц здоровья
    for (let i = 0; i < this.MAX_HP; i++) {
      const div = document.createElement('div');
      div.className = 'hp-unit';
      this.element.appendChild(div);
      this.units.push(div);
    }
  }

  update(health: number): void {
    const clampedHealth = Math.max(0, Math.min(health, this.MAX_HP));
    
    for (let i = 0; i < this.MAX_HP; i++) {
      const unit = this.units[i];
      if (i < clampedHealth) {
        unit.classList.remove('empty');
      } else {
        unit.classList.add('empty');
      }
    }
  }

  reset(): void {
    this.update(this.MAX_HP);
  }
}

