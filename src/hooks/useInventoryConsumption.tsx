import { useSeeds, usePackagings, useLabels, useCrops } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

// Recommended minimum quantities for different crops (in grams)
// Limity pre objednávanie zásob
export const SEED_MIN_QUANTITIES: Record<string, number> = {
  // Hrášok a slnečnica - 5 kg (5000g)
  'hrášok': 5000,
  'hrasok': 5000,
  'slnečnica': 5000,
  'slnecnica': 5000,
  
  // Reďkovky - 1 kg (1000g)
  'reďkovka': 1000,
  'redkovka': 1000,
  'ředkvička': 1000,
  'redkvicka': 1000,
  
  // Mikrobylinky - 200g
  'bazalka': 200,
  'koriander': 200,
  'kôpor': 200,
  'kopor': 200,
  'petržlen': 200,
  'petrzlen': 200,
  'šalvia': 200,
  'salvia': 200,
  'mäta': 200,
  'mata': 200,
  'tymian': 200,
  'oregano': 200,
  'majorán': 200,
  'majoran': 200,
  
  // Ostatná mikrozelenina - 200g
  'default': 200,
};

// Minimum packaging quantities based on size
// 500ml, 750ml = 300 ks, 1000ml+ = 200 ks
export const PACKAGING_SIZE_MIN_QUANTITIES: Record<string, number> = {
  '250ml': 300,
  '500ml': 300,
  '750ml': 300,
  '1000ml': 200,
  '1500ml': 200,
  '2000ml': 200,
  'default': 300,
};

// Minimum label quantities - 200 ks for all types
export const LABEL_MIN_QUANTITIES = {
  'standard': 200,
  'premium': 200,
  'eco': 200,
  'custom': 200,
  'default': 200,
};

// Get minimum quantity for a specific crop
export const getMinSeedQuantity = (cropName: string): number => {
  const nameLower = cropName.toLowerCase();
  for (const [key, value] of Object.entries(SEED_MIN_QUANTITIES)) {
    if (nameLower.includes(key)) {
      return value;
    }
  }
  return SEED_MIN_QUANTITIES.default;
};

// Get minimum quantity for packaging based on size
export const getMinPackagingQuantity = (packagingSize: string): number => {
  // Check for size patterns
  const sizeLower = packagingSize.toLowerCase();
  
  if (sizeLower.includes('1000') || sizeLower.includes('1500') || sizeLower.includes('2000') || 
      sizeLower.includes('1l') || sizeLower.includes('1,5l') || sizeLower.includes('2l')) {
    return 200; // Larger packaging = 200 ks
  }
  
  return 300; // Smaller packaging (500ml, 750ml) = 300 ks
};

// Get minimum quantity for label type
export const getMinLabelQuantity = (labelType: string): number => {
  return LABEL_MIN_QUANTITIES[labelType as keyof typeof LABEL_MIN_QUANTITIES] 
    || LABEL_MIN_QUANTITIES.default;
};

export interface InventoryConsumption {
  seedsToConsume: { seedId: string; amount: number }[];
  packagingToConsume: { packagingId: string; amount: number }[];
  labelsToConsume: { labelId: string; amount: number }[];
}

export function useInventoryConsumption() {
  const { data: seeds, update: updateSeed } = useSeeds();
  const { data: packagings, update: updatePackaging } = usePackagings();
  const { data: labels, update: updateLabel } = useLabels();
  const { data: crops } = useCrops();
  const { toast } = useToast();

  // Calculate seed consumption for a planting
  const calculateSeedConsumption = (
    cropId: string,
    trayCount: number
  ): { seedId: string; amount: number } | null => {
    const crop = crops.find(c => c.id === cropId);
    if (!crop) return null;

    // Seed density in grams per tray (assuming 10x20 inch tray = ~0.13 m²)
    // Average seed density is about 15-30g per tray
    const seedDensity = crop.seed_density || 20; // grams per tray
    const totalSeedsNeeded = seedDensity * trayCount;

    // Find available seeds for this crop (oldest first - FIFO)
    const availableSeeds = seeds
      .filter(s => s.crop_id === cropId && s.quantity > 0)
      .sort((a, b) => {
        const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
        const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
        return dateA - dateB;
      });

    if (availableSeeds.length === 0) return null;

    // Use oldest seed batch first
    const oldestSeed = availableSeeds[0];
    
    // Convert if needed (kg to g)
    let quantityInGrams = oldestSeed.quantity;
    if (oldestSeed.unit === 'kg') {
      quantityInGrams = oldestSeed.quantity * 1000;
    }

    if (quantityInGrams < totalSeedsNeeded) {
      // Not enough in single batch - still consume what we have
      return { seedId: oldestSeed.id, amount: quantityInGrams };
    }

    return { seedId: oldestSeed.id, amount: totalSeedsNeeded };
  };

  // Find matching packaging for order
  // Note: packagingSize is the product weight (50g, 60g), but packaging.size is container volume (1200ml)
  // We match by name (cut/live) only since these are different concepts
  const findMatchingPackaging = (
    deliveryForm: string,
    packagingSize: string,
    quantity: number
  ): { packagingId: string; amount: number } | null => {
    const packagingName = deliveryForm === 'live' 
      ? 'Pre živú mikrozeleninu' 
      : 'Pre zrezanú mikrozeleninu';
    
    // Find packaging by name only - size in DB is container volume, not product weight
    const matchingPackaging = packagings.find(
      p => p.name === packagingName && p.quantity > 0
    );

    if (!matchingPackaging) {
      // Fallback: find any packaging with stock
      const anyPackaging = packagings.find(p => p.quantity > 0);
      if (!anyPackaging) return null;
      
      return { 
        packagingId: anyPackaging.id, 
        amount: Math.min(quantity, anyPackaging.quantity) 
      };
    }

    return { 
      packagingId: matchingPackaging.id, 
      amount: Math.min(quantity, matchingPackaging.quantity) 
    };
  };

  // Find matching labels
  const findMatchingLabel = (quantity: number): { labelId: string; amount: number } | null => {
    // Find any label with available quantity
    const availableLabel = labels.find(l => l.quantity >= quantity);
    if (!availableLabel) {
      // Find any label with some quantity
      const anyLabel = labels.find(l => l.quantity > 0);
      if (!anyLabel) return null;
      return { labelId: anyLabel.id, amount: anyLabel.quantity };
    }

    return { labelId: availableLabel.id, amount: quantity };
  };

  // Consume seeds when planting
  const consumeSeeds = async (
    cropId: string,
    trayCount: number
  ): Promise<boolean> => {
    const consumption = calculateSeedConsumption(cropId, trayCount);
    if (!consumption) {
      toast({
        title: 'Upozornenie',
        description: 'Nedostatok semien na sklade pre túto plodinu.',
        variant: 'destructive',
      });
      return false;
    }

    const seed = seeds.find(s => s.id === consumption.seedId);
    if (!seed) return false;

    let newQuantity: number;
    if (seed.unit === 'kg') {
      newQuantity = seed.quantity - (consumption.amount / 1000);
    } else {
      newQuantity = seed.quantity - consumption.amount;
    }

    const { error } = await updateSeed(consumption.seedId, { 
      quantity: Math.max(0, newQuantity)
    } as any);

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odpočítať semená zo skladu.',
        variant: 'destructive',
      });
      return false;
    }

    const crop = crops.find(c => c.id === cropId);
    toast({
      title: 'Semená spotrebované',
      description: `Odpočítané ${consumption.amount.toFixed(0)}g semien ${crop?.name || ''}.`,
    });

    return true;
  };

  // Consume packaging when order is completed
  const consumePackaging = async (
    deliveryForm: string,
    packagingSize: string,
    quantity: number
  ): Promise<boolean> => {
    const consumption = findMatchingPackaging(deliveryForm, packagingSize, quantity);
    if (!consumption) {
      toast({
        title: 'Upozornenie',
        description: 'Nedostatok obalov na sklade.',
        variant: 'destructive',
      });
      return false;
    }

    const packaging = packagings.find(p => p.id === consumption.packagingId);
    if (!packaging) return false;

    const { error } = await updatePackaging(consumption.packagingId, { 
      quantity: packaging.quantity - consumption.amount 
    });

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odpočítať obaly zo skladu.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Obaly spotrebované',
      description: `Odpočítaných ${consumption.amount} ks obalov.`,
    });

    return true;
  };

  // Consume labels when order is completed
  const consumeLabels = async (quantity: number): Promise<boolean> => {
    const consumption = findMatchingLabel(quantity);
    if (!consumption) {
      toast({
        title: 'Upozornenie',
        description: 'Nedostatok etikiet na sklade.',
        variant: 'destructive',
      });
      return false;
    }

    const label = labels.find(l => l.id === consumption.labelId);
    if (!label) return false;

    const { error } = await updateLabel(consumption.labelId, { 
      quantity: label.quantity - consumption.amount 
    });

    if (error) {
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa odpočítať etikety zo skladu.',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Etikety spotrebované',
      description: `Odpočítaných ${consumption.amount} ks etikiet.`,
    });

    return true;
  };

  // Consume all inventory for an order completion
  const consumeOrderInventory = async (
    cropId: string | null,
    deliveryForm: string,
    packagingSize: string,
    quantity: number,
    hasLabel: boolean,
    trayCount: number = 1
  ): Promise<boolean> => {
    let allSuccess = true;

    // Consume packaging
    const packagingSuccess = await consumePackaging(deliveryForm, packagingSize, quantity);
    if (!packagingSuccess) allSuccess = false;

    // Consume labels if needed
    if (hasLabel) {
      const labelSuccess = await consumeLabels(quantity);
      if (!labelSuccess) allSuccess = false;
    }

    return allSuccess;
  };

  return {
    consumeSeeds,
    consumePackaging,
    consumeLabels,
    consumeOrderInventory,
    calculateSeedConsumption,
    findMatchingPackaging,
    findMatchingLabel,
  };
}
