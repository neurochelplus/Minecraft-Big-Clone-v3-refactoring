// Класс для управления данными инвентаря

export type InventorySlot = {
  id: number;
  count: number;
};

export class Inventory {
  private slots: InventorySlot[];
  private selectedSlot: number = 0;
  private readonly SLOT_COUNT = 36;
  private readonly HOTBAR_SIZE = 9;

  constructor() {
    this.slots = Array.from({ length: this.SLOT_COUNT }, () => ({ id: 0, count: 0 }));
  }

  public getSlots(): InventorySlot[] {
    return this.slots;
  }

  public getSlot(index: number): InventorySlot {
    return this.slots[index];
  }

  public setSlot(index: number, slot: InventorySlot): void {
    this.slots[index] = { ...slot };
  }

  public getSelectedSlot(): number {
    return this.selectedSlot;
  }

  public setSelectedSlot(index: number): void {
    if (index >= 0 && index < this.HOTBAR_SIZE) {
      this.selectedSlot = index;
    }
  }

  public getSelectedSlotItem(): InventorySlot {
    return this.slots[this.selectedSlot];
  }

  public addItem(id: number, count: number): boolean {
    // 1. Try to stack with existing items
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      if (this.slots[i].id === id) {
        this.slots[i].count += count;
        return true;
      }
    }

    // 2. Find empty slot
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      if (this.slots[i].id === 0) {
        this.slots[i].id = id;
        this.slots[i].count = count;
        return true;
      }
    }

    return false; // Inventory full
  }

  public removeItem(id: number, count: number): boolean {
    let remaining = count;
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      if (this.slots[i].id === id) {
        const take = Math.min(remaining, this.slots[i].count);
        this.slots[i].count -= take;
        remaining -= take;
        if (this.slots[i].count === 0) {
          this.slots[i].id = 0;
        }
        if (remaining <= 0) return true;
      }
    }
    return remaining === 0;
  }

  public clear(): void {
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      this.slots[i] = { id: 0, count: 0 };
    }
  }

  public serialize(): InventorySlot[] {
    return this.slots.map(slot => ({ ...slot }));
  }

  public deserialize(data: InventorySlot[]): void {
    for (let i = 0; i < Math.min(data.length, this.SLOT_COUNT); i++) {
      if (data[i]) {
        this.slots[i] = { ...data[i] };
      }
    }
  }
}

