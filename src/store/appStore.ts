import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Crop, Blend, Customer, Order, PlantingPlan, Task, Seed, Packaging, Supplier, Substrate, OtherInventory, DeliveryRoute } from '@/types';

interface AppState {
  // Data
  crops: Crop[];
  blends: Blend[];
  customers: Customer[];
  orders: Order[];
  plantingPlans: PlantingPlan[];
  tasks: Task[];
  seeds: Seed[];
  packagings: Packaging[];
  suppliers: Supplier[];
  substrates: Substrate[];
  otherInventory: OtherInventory[];
  deliveryDays: number[];
  deliveryRoutes: DeliveryRoute[];

  // Crops
  addCrop: (crop: Omit<Crop, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCrop: (id: string, crop: Partial<Crop>) => void;
  deleteCrop: (id: string) => void;

  // Blends
  addBlend: (blend: Omit<Blend, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateBlend: (id: string, blend: Partial<Blend>) => void;
  deleteBlend: (id: string) => void;

  // Customers
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Suppliers
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Orders
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;

  // Planting Plans
  addPlantingPlan: (plan: Omit<PlantingPlan, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePlantingPlan: (id: string, plan: Partial<PlantingPlan>) => void;
  deletePlantingPlan: (id: string) => void;

  // Tasks
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, task: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;

  // Seeds
  addSeed: (seed: Omit<Seed, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSeed: (id: string, seed: Partial<Seed>) => void;
  deleteSeed: (id: string) => void;

  // Packagings
  addPackaging: (packaging: Omit<Packaging, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePackaging: (id: string, packaging: Partial<Packaging>) => void;
  deletePackaging: (id: string) => void;

  // Substrates
  addSubstrate: (substrate: Omit<Substrate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSubstrate: (id: string, substrate: Partial<Substrate>) => void;
  deleteSubstrate: (id: string) => void;

  // Other Inventory
  addOtherInventory: (item: Omit<OtherInventory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOtherInventory: (id: string, item: Partial<OtherInventory>) => void;
  deleteOtherInventory: (id: string) => void;

  // Delivery Days
  setDeliveryDays: (days: number[]) => void;

  // Delivery Routes
  addDeliveryRoute: (route: Omit<DeliveryRoute, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDeliveryRoute: (id: string, route: Partial<DeliveryRoute>) => void;
  deleteDeliveryRoute: (id: string) => void;

  // Inventory Management - Stock Adjustments
  consumeSeedStock: (cropId: string, grams: number) => void;
  consumePackagingStock: (type: string, quantity: number) => void;
  consumeSubstrateStock: (id: string, amount: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const sampleCrops: Crop[] = [
  { id: '1', name: 'Brokolica', category: 'microgreens', daysToGermination: 2, germinationType: 'warm', daysOnLight: 6, daysToHarvest: 8, seedDensity: 30, expectedYield: 200, canBeLive: true, color: '#22c55e', notes: 'Najpopulárnejšia mikrozelenina', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Reďkovka', category: 'microgreens', daysToGermination: 2, germinationType: 'warm', daysOnLight: 4, daysToHarvest: 6, seedDensity: 35, expectedYield: 180, canBeLive: true, color: '#ef4444', notes: 'Štipľavá chuť, rýchly rast', createdAt: new Date(), updatedAt: new Date() },
  { id: '3', name: 'Slnečnica', category: 'microgreens', daysToGermination: 2, germinationType: 'cold', daysOnLight: 8, daysToHarvest: 10, seedDensity: 80, expectedYield: 250, canBeLive: false, color: '#eab308', notes: 'Vyžaduje namáčanie semien', createdAt: new Date(), updatedAt: new Date() },
  { id: '4', name: 'Hrášok', category: 'microgreens', daysToGermination: 3, germinationType: 'cold', daysOnLight: 9, daysToHarvest: 12, seedDensity: 120, expectedYield: 300, canBeLive: false, color: '#84cc16', notes: 'Sladká chuť, dlhší rast', createdAt: new Date(), updatedAt: new Date() },
];

const sampleCustomers: Customer[] = [
  { id: '1', name: 'Reštaurácia U Zeleného Stromu', customerType: 'gastro', email: 'info@zelenystrom.sk', phone: '+421 900 123 456', address: 'Hlavná 15, Bratislava', createdAt: new Date(), updatedAt: new Date() },
  { id: '2', name: 'Bio Obchod Zdravie', customerType: 'wholesale', email: 'objednavky@biozdravi.sk', phone: '+421 900 654 321', address: 'Štúrova 8, Košice', createdAt: new Date(), updatedAt: new Date() },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      crops: sampleCrops,
      blends: [],
      customers: sampleCustomers,
      orders: [],
      plantingPlans: [],
      tasks: [],
      seeds: [],
      packagings: [],
      suppliers: [],
      substrates: [],
      otherInventory: [],
      deliveryDays: [1, 3, 5],
      deliveryRoutes: [],

      addCrop: (crop) => set((state) => ({ crops: [...state.crops, { ...crop, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateCrop: (id, crop) => set((state) => ({ crops: state.crops.map((c) => c.id === id ? { ...c, ...crop, updatedAt: new Date() } : c) })),
      deleteCrop: (id) => set((state) => ({ crops: state.crops.filter((c) => c.id !== id) })),

      addBlend: (blend) => set((state) => ({ blends: [...state.blends, { ...blend, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateBlend: (id, blend) => set((state) => ({ blends: state.blends.map((b) => b.id === id ? { ...b, ...blend, updatedAt: new Date() } : b) })),
      deleteBlend: (id) => set((state) => ({ blends: state.blends.filter((b) => b.id !== id) })),

      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, { ...customer, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateCustomer: (id, customer) => set((state) => ({ customers: state.customers.map((c) => c.id === id ? { ...c, ...customer, updatedAt: new Date() } : c) })),
      deleteCustomer: (id) => set((state) => ({ customers: state.customers.filter((c) => c.id !== id) })),

      addSupplier: (supplier) => set((state) => ({ suppliers: [...state.suppliers, { ...supplier, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateSupplier: (id, supplier) => set((state) => ({ suppliers: state.suppliers.map((s) => s.id === id ? { ...s, ...supplier, updatedAt: new Date() } : s) })),
      deleteSupplier: (id) => set((state) => ({ suppliers: state.suppliers.filter((s) => s.id !== id) })),

      addOrder: (order) => set((state) => ({ orders: [...state.orders, { ...order, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateOrder: (id, order) => set((state) => ({ orders: state.orders.map((o) => o.id === id ? { ...o, ...order, updatedAt: new Date() } : o) })),
      deleteOrder: (id) => set((state) => ({ orders: state.orders.filter((o) => o.id !== id) })),

      addPlantingPlan: (plan) => set((state) => ({ plantingPlans: [...state.plantingPlans, { ...plan, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updatePlantingPlan: (id, plan) => set((state) => ({ plantingPlans: state.plantingPlans.map((p) => p.id === id ? { ...p, ...plan, updatedAt: new Date() } : p) })),
      deletePlantingPlan: (id) => set((state) => ({ plantingPlans: state.plantingPlans.filter((p) => p.id !== id) })),

      addTask: (task) => set((state) => ({ tasks: [...state.tasks, { ...task, id: generateId() }] })),
      updateTask: (id, task) => set((state) => ({ tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...task } : t)) })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),
      toggleTaskComplete: (id) => set((state) => ({ 
        tasks: state.tasks.map((t) => t.id === id 
          ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date() : undefined } 
          : t
        ) 
      })),

      addSeed: (seed) => set((state) => ({ seeds: [...state.seeds, { ...seed, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateSeed: (id, seed) => set((state) => ({ seeds: state.seeds.map((s) => s.id === id ? { ...s, ...seed, updatedAt: new Date() } : s) })),
      deleteSeed: (id) => set((state) => ({ seeds: state.seeds.filter((s) => s.id !== id) })),

      addPackaging: (packaging) => set((state) => ({ packagings: [...state.packagings, { ...packaging, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updatePackaging: (id, packaging) => set((state) => ({ packagings: state.packagings.map((p) => p.id === id ? { ...p, ...packaging, updatedAt: new Date() } : p) })),
      deletePackaging: (id) => set((state) => ({ packagings: state.packagings.filter((p) => p.id !== id) })),

      addSubstrate: (substrate) => set((state) => ({ substrates: [...state.substrates, { ...substrate, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateSubstrate: (id, substrate) => set((state) => ({ substrates: state.substrates.map((s) => s.id === id ? { ...s, ...substrate, updatedAt: new Date() } : s) })),
      deleteSubstrate: (id) => set((state) => ({ substrates: state.substrates.filter((s) => s.id !== id) })),

      addOtherInventory: (item) => set((state) => ({ otherInventory: [...state.otherInventory, { ...item, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateOtherInventory: (id, item) => set((state) => ({ otherInventory: state.otherInventory.map((o) => o.id === id ? { ...o, ...item, updatedAt: new Date() } : o) })),
      deleteOtherInventory: (id) => set((state) => ({ otherInventory: state.otherInventory.filter((o) => o.id !== id) })),

      setDeliveryDays: (days) => set(() => ({ deliveryDays: days })),

      addDeliveryRoute: (route) => set((state) => ({ deliveryRoutes: [...state.deliveryRoutes, { ...route, id: generateId(), createdAt: new Date(), updatedAt: new Date() }] })),
      updateDeliveryRoute: (id, route) => set((state) => ({ deliveryRoutes: state.deliveryRoutes.map((r) => r.id === id ? { ...r, ...route, updatedAt: new Date() } : r) })),
      deleteDeliveryRoute: (id) => set((state) => ({ deliveryRoutes: state.deliveryRoutes.filter((r) => r.id !== id) })),

      // Consume seed stock - reduce quantity for a specific crop
      consumeSeedStock: (cropId, grams) => set((state) => {
        const updatedSeeds = [...state.seeds];
        let remainingGrams = grams;

        // Sort seeds by expiration date (oldest first)
        const seedsForCrop = updatedSeeds
          .filter(s => s.cropId === cropId && s.quantity > 0)
          .sort((a, b) => {
            if (!a.expirationDate) return 1;
            if (!b.expirationDate) return -1;
            return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
          });

        for (const seed of seedsForCrop) {
          if (remainingGrams <= 0) break;

          const seedIndex = updatedSeeds.findIndex(s => s.id === seed.id);
          const seedQuantityInGrams = seed.quantityUnit === 'kg' ? seed.quantity * 1000 : seed.quantity;

          if (seedQuantityInGrams <= remainingGrams) {
            remainingGrams -= seedQuantityInGrams;
            updatedSeeds[seedIndex] = { ...seed, quantity: 0, updatedAt: new Date() };
          } else {
            const newQuantityInGrams = seedQuantityInGrams - remainingGrams;
            updatedSeeds[seedIndex] = { 
              ...seed, 
              quantity: seed.quantityUnit === 'kg' ? newQuantityInGrams / 1000 : newQuantityInGrams,
              updatedAt: new Date() 
            };
            remainingGrams = 0;
          }
        }

        return { seeds: updatedSeeds };
      }),

      // Consume packaging stock - reduce quantity for a specific type
      consumePackagingStock: (type, quantity) => set((state) => {
        const updatedPackagings = [...state.packagings];
        let remainingQuantity = quantity;

        const packagingsOfType = updatedPackagings
          .filter(p => p.type === type && p.quantity > 0)
          .sort((a, b) => new Date(a.stockDate).getTime() - new Date(b.stockDate).getTime());

        for (const pkg of packagingsOfType) {
          if (remainingQuantity <= 0) break;

          const pkgIndex = updatedPackagings.findIndex(p => p.id === pkg.id);

          if (pkg.quantity <= remainingQuantity) {
            remainingQuantity -= pkg.quantity;
            updatedPackagings[pkgIndex] = { ...pkg, quantity: 0, updatedAt: new Date() };
          } else {
            updatedPackagings[pkgIndex] = { 
              ...pkg, 
              quantity: pkg.quantity - remainingQuantity,
              updatedAt: new Date() 
            };
            remainingQuantity = 0;
          }
        }

        return { packagings: updatedPackagings };
      }),

      // Consume substrate stock - reduce currentStock for a specific substrate
      consumeSubstrateStock: (id, amount) => set((state) => ({
        substrates: state.substrates.map((s) => 
          s.id === id 
            ? { ...s, currentStock: Math.max(0, s.currentStock - amount), updatedAt: new Date() } 
            : s
        )
      })),
    }),
    { name: 'microgreen-manager-storage' }
  )
);
