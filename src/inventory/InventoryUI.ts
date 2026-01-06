import { Inventory } from "./Inventory";
import { DragDrop } from "./DragDrop";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";
import { BLOCK_NAMES } from "../constants/BlockNames";
import { BLOCK } from "../world/World";

export class InventoryUI {
  private inventory: Inventory;
  private dragDrop: DragDrop;
  private hotbarContainer: HTMLElement;
  private inventoryGrid: HTMLElement;
  private inventoryMenu: HTMLElement;
  private tooltip: HTMLElement;
  private isMobile: boolean;

  private touchStartSlotIndex: number | null = null;

  public onInventoryChange: (() => void) | null = null;

  constructor(inventory: Inventory, dragDrop: DragDrop, isMobile: boolean) {
    this.inventory = inventory;
    this.dragDrop = dragDrop;
    this.isMobile = isMobile;

    this.hotbarContainer = document.getElementById("hotbar")!;
    this.inventoryGrid = document.getElementById("inventory-grid")!;
    this.inventoryMenu = document.getElementById("inventory-menu")!;
    this.tooltip = document.getElementById("tooltip")!;

    if (!this.tooltip) {
      this.tooltip = document.createElement("div");
      this.tooltip.id = "tooltip";
      document.body.appendChild(this.tooltip);
    }

    this.init();
    this.initGlobalListeners();
  }

  private init() {
    this.hotbarContainer.innerHTML = "";
    this.inventoryGrid.innerHTML = "";

    // Hotbar (0-8)
    for (let i = 0; i < 9; i++) {
      this.hotbarContainer.appendChild(this.createSlotElement(i, true));
    }

    // Inventory Grid (9-35)
    for (let i = 9; i < 36; i++) {
      this.inventoryGrid.appendChild(this.createSlotElement(i, false));
    }

    // Separator
    const separator = document.createElement("div");
    separator.className = "slot-hotbar-separator";
    separator.style.gridColumn = "1 / -1";
    this.inventoryGrid.appendChild(separator);

    // Hotbar Copy in Grid (0-8)
    for (let i = 0; i < 9; i++) {
      this.inventoryGrid.appendChild(this.createSlotElement(i, false));
    }
  }

  private initGlobalListeners() {
    // Handle dropping items via touch
    window.addEventListener("touchend", (e) => {
      const draggedItem = this.dragDrop.getDraggedItem();
      if (
        draggedItem &&
        this.inventoryMenu.style.display !== "none" &&
        this.touchStartSlotIndex !== null
      ) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const slotEl = target?.closest(".slot");

        if (slotEl) {
          const targetIndex = parseInt(
            slotEl.getAttribute("data-index") || "-1",
          );
          if (targetIndex !== -1) {
            this.handleSlotClick(targetIndex);
          }
        } else {
          // Return to start
          this.handleSlotClick(this.touchStartSlotIndex);
        }

        this.touchStartSlotIndex = null;
      }
    });
  }

  private createSlotElement(index: number, isHotbar: boolean): HTMLElement {
    const div = document.createElement("div");
    div.classList.add("slot");
    div.setAttribute("data-index", index.toString());

    const icon = document.createElement("div");
    icon.classList.add("block-icon");
    icon.style.display = "none";
    div.appendChild(icon);

    const count = document.createElement("div");
    count.classList.add("slot-count");
    count.innerText = "";
    div.appendChild(count);

    // Events
    div.addEventListener("mouseenter", () => {
      const slot = this.inventory.getSlot(index);
      if (this.inventoryMenu.style.display !== "none" && slot.id !== 0) {
        this.tooltip.innerText = BLOCK_NAMES[slot.id] || "Block";
        this.tooltip.style.display = "block";
      }
    });

    div.addEventListener("mousemove", (e) => {
      if (this.inventoryMenu.style.display !== "none") {
        this.tooltip.style.left = e.clientX + 10 + "px";
        this.tooltip.style.top = e.clientY + 10 + "px";
      }
    });

    div.addEventListener("mouseleave", () => {
      this.tooltip.style.display = "none";
    });

    div.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      if (this.inventoryMenu.style.display !== "none") {
        this.handleSlotClick(index, e.button);
      }
    });

    div.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();

      if (this.inventoryMenu.style.display !== "none") {
        this.touchStartSlotIndex = index;
        this.handleSlotClick(index);
      } else if (isHotbar) {
        this.inventory.setSelectedSlot(index);
        this.refresh(); // Update active class
        if (this.onInventoryChange) this.onInventoryChange();
      }
    });

    return div;
  }

  public refresh() {
    for (let i = 0; i < 36; i++) {
      this.updateSlotVisuals(i);
    }
  }

  private updateSlotVisuals(index: number) {
    const slot = this.inventory.getSlot(index);
    const elements = document.querySelectorAll(`.slot[data-index="${index}"]`);

    elements.forEach((el) => {
      if (el.parentElement === this.hotbarContainer) {
        if (index === this.inventory.getSelectedSlot())
          el.classList.add("active");
        else el.classList.remove("active");
      }

      const icon = el.querySelector(".block-icon") as HTMLElement;
      const countEl = el.querySelector(".slot-count") as HTMLElement;

      if (slot.id !== 0 && slot.count > 0) {
        icon.style.display = "block";

        // Reset
        icon.className = "block-icon";
        icon.style.backgroundImage = "";
        icon.style.backgroundColor = "";

        if (TOOL_TEXTURES[slot.id]) {
          icon.classList.add("item-tool");
          icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
        } else if (slot.id === BLOCK.PLANKS) {
          icon.classList.add("item-planks");
          icon.style.backgroundColor = getBlockColor(slot.id);
        } else if (slot.id === BLOCK.CRAFTING_TABLE) {
          icon.style.backgroundColor = getBlockColor(slot.id);
          icon.style.backgroundImage = "var(--noise-url)";
        } else {
          icon.style.backgroundColor = getBlockColor(slot.id);
          icon.style.backgroundImage = "var(--noise-url)";
        }

        countEl.innerText = slot.count.toString();
      } else {
        icon.style.display = "none";
        countEl.innerText = "";
      }
    });
  }

  private handleSlotClick(index: number, button: number = 0) {
    const slot = this.inventory.getSlot(index);
    let draggedItem = this.dragDrop.getDraggedItem();

    // Logic copied from main.ts handleSlotClick
    if (!draggedItem) {
      if (slot.id !== 0) {
        if (button === 2) {
          // Right Click: Split
          const half = Math.ceil(slot.count / 2);
          draggedItem = { id: slot.id, count: half };
          slot.count -= half;
          if (slot.count === 0) slot.id = 0;
        } else {
          // Pickup All
          draggedItem = { ...slot };
          slot.id = 0;
          slot.count = 0;
        }
      }
    } else {
      if (slot.id === 0) {
        if (button === 2) {
          // Place One
          slot.id = draggedItem.id;
          slot.count = 1;
          draggedItem.count--;
          if (draggedItem.count === 0) draggedItem = null;
        } else {
          // Place All
          slot.id = draggedItem.id;
          slot.count = draggedItem.count;
          draggedItem = null;
        }
      } else if (slot.id === draggedItem.id) {
        if (button === 2) {
          // Add One
          slot.count++;
          draggedItem.count--;
          if (draggedItem.count === 0) draggedItem = null;
        } else {
          // Add All
          slot.count += draggedItem.count;
          draggedItem = null;
        }
      } else {
        // Swap
        const temp = { ...slot };
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = temp;
      }
    }

    // Update Inventory Data
    this.inventory.setSlot(index, slot);
    this.dragDrop.setDraggedItem(draggedItem);

    this.refresh();
    if (this.onInventoryChange) this.onInventoryChange();
  }
}
