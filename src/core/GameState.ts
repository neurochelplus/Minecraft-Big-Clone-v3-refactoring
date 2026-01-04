// Класс для управления состоянием игры

export class GameState {
  private isPaused: boolean = true;
  private isGameStarted: boolean = false;
  private previousMenu: HTMLElement | null = null;

  public getPaused(): boolean {
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public getGameStarted(): boolean {
    return this.isGameStarted;
  }

  public setGameStarted(started: boolean): void {
    this.isGameStarted = started;
  }

  public getPreviousMenu(): HTMLElement | null {
    return this.previousMenu;
  }

  public setPreviousMenu(menu: HTMLElement | null): void {
    this.previousMenu = menu;
  }

  public reset(): void {
    this.isPaused = true;
    this.isGameStarted = false;
    this.previousMenu = null;
  }
}

