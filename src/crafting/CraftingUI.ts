import { CraftingSystem } from "./CraftingSystem";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { DragDrop } from "../inventory/DragDrop";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";
import { RECIPES } from "./Recipes";

export class CraftingUI {
  private craftingSystem: CraftingSystem;
  private inventory: Inventory;
  private inventoryUI: InventoryUI;
  private dragDrop: DragDrop;
  private isMobile: boolean;

  private craftingArea: HTMLElement;
  private craftGridContainer: HTMLElement;
  private resultIcon: HTMLElement;
  private resultCount: HTMLElement;
  private mobileCraftingList: HTMLElement;
  private inventoryMenu: HTMLElement;

  constructor(
    craftingSystem: CraftingSystem,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    dragDrop: DragDrop,
    isMobile: boolean,
  ) {
    this.craftingSystem = craftingSystem;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.dragDrop = dragDrop;
    this.isMobile = isMobile;

    this.inventoryMenu = document.getElementById("inventory-menu")!;

    // Create Elements
    this.craftingArea = document.createElement("div");
    this.craftingArea.id = "crafting-area";

    this.craftGridContainer = document.createElement("div");
    this.craftGridContainer.id = "crafting-grid-container";
    this.craftingArea.appendChild(this.craftGridContainer);

    const arrowDiv = document.createElement("div");
    arrowDiv.className = "crafting-arrow";
    arrowDiv.innerText = "→";
    this.craftingArea.appendChild(arrowDiv);

    const resultContainer = document.createElement("div");
    resultContainer.id = "crafting-result-container";

    const resultSlotDiv = document.createElement("div");
    resultSlotDiv.classList.add("slot");
    resultSlotDiv.id = "slot-result";

    this.resultIcon = document.createElement("div");
    this.resultIcon.className = "block-icon";
    this.resultIcon.style.display = "none";

    this.resultCount = document.createElement("div");
    this.resultCount.className = "slot-count";

    resultSlotDiv.appendChild(this.resultIcon);
    resultSlotDiv.appendChild(this.resultCount);

    resultSlotDiv.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.handleResultClick();
    });
    resultSlotDiv.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      this.handleResultClick();
    });

    resultContainer.appendChild(resultSlotDiv);
    this.craftingArea.appendChild(resultContainer);

    this.mobileCraftingList = document.createElement("div");
    this.mobileCraftingList.id = "mobile-crafting-list";

    this.init();
  }

  private init() {
    // Insert into menu
    const inventoryGrid = document.getElementById("inventory-grid");
    this.inventoryMenu.insertBefore(this.craftingArea, inventoryGrid);

    if (this.isMobile) {
      document.body.appendChild(this.mobileCraftingList); // Append to body for absolute positioning

      // Prevent camera movement when scrolling list
      this.mobileCraftingList.addEventListener(
        "touchmove",
        (e) => {
          e.stopPropagation();
        },
        { passive: false },
      );

      this.mobileCraftingList.addEventListener(
        "touchstart",
        (e) => {
          e.stopPropagation();
        },
        { passive: false },
      );
    }
  }

  public updateCraftingGridSize() {
    this.craftGridContainer.innerHTML = "";
    const size = this.craftingSystem.isCraftingTable ? 3 : 2;
    const total = size * size;

    if (this.craftingSystem.isCraftingTable) {
      this.craftGridContainer.classList.add("grid-3x3");
    } else {
      this.craftGridContainer.classList.remove("grid-3x3");
    }

    for (let i = 0; i < total; i++) {
      const div = document.createElement("div");
      div.classList.add("slot");
      div.setAttribute("data-craft-index", i.toString());

      const icon = document.createElement("div");
      icon.classList.add("block-icon");
      icon.style.display = "none";
      div.appendChild(icon);

      const countEl = document.createElement("div");
      countEl.classList.add("slot-count");
      div.appendChild(countEl);

      // Events
      const handleCraftSlot = (btn: number = 0) => {
        this.handleCraftSlotClick(i, btn);
      };

      div.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        handleCraftSlot(e.button);
      });
      div.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        handleCraftSlot();
      });

      this.craftGridContainer.appendChild(div);
    }
  }

  public updateVisuals() {
    if (this.isMobile) {
      this.updateMobileCraftingList();
      return;
    }

    const size = this.craftingSystem.isCraftingTable ? 3 : 2;
    const total = size * size;

    // Update Grid
    const slots = this.craftGridContainer.children;
    for (let i = 0; i < total; i++) {
      const slot = this.craftingSystem.craftingSlots[i];
      const el = slots[i] as HTMLElement;
      const icon = el.querySelector(".block-icon") as HTMLElement;
      const countEl = el.querySelector(".slot-count") as HTMLElement;

      if (slot.id !== 0 && slot.count > 0) {
        icon.style.display = "block";

        // Cleanup classes
        icon.classList.remove("item-stick", "item-planks", "item-tool");
        icon.style.backgroundImage = "";

        if (TOOL_TEXTURES[slot.id]) {
          icon.classList.add("item-tool");
          icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
        } else if (slot.id === 7) {
          icon.classList.add("item-planks");
          icon.style.backgroundColor = getBlockColor(slot.id);
        } else if (slot.id === 9) {
          icon.style.backgroundColor = getBlockColor(slot.id);
        } else {
          icon.style.backgroundColor = getBlockColor(slot.id);
          icon.style.backgroundImage = "var(--noise-url)";
        }

        countEl.innerText = slot.count.toString();
      } else {
        icon.style.display = "none";
        countEl.innerText = "";
      }
    }

    // Update Result
    const result = this.craftingSystem.craftingResult;
    if (result.id !== 0) {
      this.resultIcon.style.display = "block";

      // Cleanup classes
      this.resultIcon.classList.remove(
        "item-stick",
        "item-planks",
        "item-tool",
      );
      this.resultIcon.style.backgroundImage = "";

      if (TOOL_TEXTURES[result.id]) {
        this.resultIcon.classList.add("item-tool");
        this.resultIcon.style.backgroundImage = `url(${TOOL_TEXTURES[result.id].dataUrl})`;
      } else if (result.id === 7) {
        this.resultIcon.classList.add("item-planks");
        this.resultIcon.style.backgroundColor = getBlockColor(result.id);
      } else if (result.id === 9) {
        this.resultIcon.style.backgroundColor = getBlockColor(result.id);
      } else {
        this.resultIcon.style.backgroundColor = getBlockColor(result.id);
        this.resultIcon.style.backgroundImage = "var(--noise-url)";
      }

      this.resultCount.innerText = result.count.toString();
    } else {
      this.resultIcon.style.display = "none";
      this.resultCount.innerText = "";
    }
  }

  private handleCraftSlotClick(index: number, button: number = 0) {
    const slot = this.craftingSystem.craftingSlots[index];
    let draggedItem = this.dragDrop.getDraggedItem();

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
        this.craftingSystem.checkRecipes();
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
        this.craftingSystem.checkRecipes();
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
        this.craftingSystem.checkRecipes();
      } else {
        // Swap
        const temp = { ...slot };
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = temp;
        this.craftingSystem.checkRecipes();
      }
    }
    this.dragDrop.setDraggedItem(draggedItem);
    this.updateVisuals();
  }

  private handleResultClick() {
    const result = this.craftingSystem.craftingResult;
    if (result.id === 0) return;

    let draggedItem = this.dragDrop.getDraggedItem();

    // Check if we can pick it up
    if (!draggedItem) {
      draggedItem = { ...result };
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    } else if (draggedItem.id === result.id) {
      draggedItem.count += result.count;
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    }
    this.updateVisuals();
  }

  private updateMobileCraftingList() {
    this.mobileCraftingList.innerHTML = "";
    const currentSlots = this.inventory.getSlots();

    RECIPES.forEach((recipe) => {
      // Filter logic for Mobile:
      if (!this.craftingSystem.isCraftingTable) {
        let needs3x3 = false;
        if (recipe.pattern) {
          if (recipe.pattern.length > 2 || recipe.pattern[0].length > 2) {
            needs3x3 = true;
          }
        } else if (recipe.ingredients) {
          let totalIngredients = 0;
          recipe.ingredients.forEach((i) => (totalIngredients += i.count));
          if (totalIngredients > 4) needs3x3 = true;
        }
        if (needs3x3) return;
      }

      // 1. Tally Inventory
      const invMap = new Map<number, number>();
      currentSlots.forEach((s) => {
        if (s.id !== 0) invMap.set(s.id, (invMap.get(s.id) || 0) + s.count);
      });

      // 2. Tally Recipe Requirements
      const reqMap = new Map<number, number>();
      if (recipe.ingredients) {
        recipe.ingredients.forEach((i) =>
          reqMap.set(i.id, (reqMap.get(i.id) || 0) + i.count),
        );
      } else if (recipe.pattern && recipe.keys) {
        for (const row of recipe.pattern) {
          for (const char of row) {
            if (char !== " ") {
              const id = recipe.keys[char];
              reqMap.set(id, (reqMap.get(id) || 0) + 1);
            }
          }
        }
      }

      // 3. Check sufficiency
      let canCraft = true;

      // Calculate max crafts if needed, but for button enabling just check if >= 1
      for (const [reqId, reqCount] of reqMap) {
        const has = invMap.get(reqId) || 0;
        if (has < reqCount) {
          canCraft = false;
          break;
        }
      }

      if (!canCraft) return;

      const btn = document.createElement("div");
      btn.className = "craft-btn";

      // Ingredients Container
      const ingContainer = document.createElement("div");
      ingContainer.className = "craft-ingredients";

      // Render unique ingredients (simplified)
      let ingCount = 0;
      for (const [reqId, reqCount] of reqMap) {
        if (ingCount >= 3) break; // Limit to 3 icons to save space

        const ingIcon = document.createElement("div");
        ingIcon.className = "block-icon";

        if (TOOL_TEXTURES[reqId]) {
          ingIcon.classList.add("item-tool");
          ingIcon.style.backgroundImage = `url(${TOOL_TEXTURES[reqId].dataUrl})`;
        } else if (reqId === 7) {
          ingIcon.classList.add("item-planks");
          ingIcon.style.backgroundColor = getBlockColor(reqId);
        } else if (reqId === 9) {
          ingIcon.style.backgroundColor = getBlockColor(reqId);
        } else {
          ingIcon.style.backgroundColor = getBlockColor(reqId);
          ingIcon.style.backgroundImage = "var(--noise-url)";
        }
        ingContainer.appendChild(ingIcon);
        ingCount++;
      }
      btn.appendChild(ingContainer);

      // Arrow
      const arrow = document.createElement("div");
      arrow.className = "craft-arrow";
      arrow.innerText = "→";
      btn.appendChild(arrow);

      // Result Icon
      const icon = document.createElement("div");
      icon.className = "block-icon";
      const rId = recipe.result.id;

      if (TOOL_TEXTURES[rId]) {
        icon.classList.add("item-tool");
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[rId].dataUrl})`;
      } else if (rId === 7) {
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(rId);
      } else if (rId === 9) {
        icon.style.backgroundColor = getBlockColor(rId);
      } else {
        icon.style.backgroundColor = getBlockColor(rId);
        icon.style.backgroundImage = "var(--noise-url)";
      }

      btn.appendChild(icon);

      // Count if > 1
      if (recipe.result.count > 1) {
        const countDiv = document.createElement("div");
        countDiv.className = "slot-count";
        countDiv.innerText = recipe.result.count.toString();
        icon.appendChild(countDiv);
      }

      btn.onclick = () => {
        // Consume from inventory
        for (const [reqId, reqCount] of reqMap) {
          this.inventory.removeItem(reqId, reqCount);
        }

        // Add result
        this.inventory.addItem(recipe.result.id, recipe.result.count);
        this.inventoryUI.refresh(); // Updates list too
      };

      this.mobileCraftingList.appendChild(btn);
    });
  }

  public setVisible(visible: boolean, isCraftingTable: boolean) {
    if (visible) {
      this.craftingArea.style.display = this.isMobile ? "none" : "flex";
      this.mobileCraftingList.style.display = this.isMobile ? "flex" : "none";
      this.craftingSystem.setCraftingTable(isCraftingTable);
      this.updateCraftingGridSize();
      this.updateVisuals();
    } else {
      if (this.isMobile) {
        this.mobileCraftingList.style.display = "none";
      }
    }
  }
}
