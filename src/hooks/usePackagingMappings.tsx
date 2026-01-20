import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DbPackagingMapping } from '@/types';

interface PackagingMappingWithDetails extends DbPackagingMapping {
  packagings?: {
    id: string;
    name: string;
    type: string;
    size: string;
  };
}

export function usePackagingMappings() {
  const { toast } = useToast();
  const [mappings, setMappings] = useState<PackagingMappingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMappings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('packagings')
        .select('*');

      if (error) throw error;
      setMappings(data || []);
    } catch (error: any) {
      console.error('Error loading packagings:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa načítať mapovanie obalov',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappingsByCrop = async (cropId: string) => {
    try {
      const { data, error } = await supabase
        .from('packagings')
        .select('*, packagings(id, name, type, size)')
        .eq('crop_id', cropId);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error loading mappings by crop:', error);
      return [];
    }
  };

  const upsertMapping = async (mapping: Omit<DbPackagingMapping, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error: deleteError } = await supabase
        .from('packagings')
        .delete()
        .eq('crop_id', mapping.crop_id)
        .eq('weight_g', mapping.weight_g);

      if (deleteError) throw deleteError;

      const { data, error } = await supabase
        .from('packagings')
        .insert({
          crop_id: mapping.crop_id,
          packaging_id: mapping.packaging_id,
          weight_g: mapping.weight_g,
        })
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error upserting mapping:', error);
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa uložiť mapovanie',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const upsertMappings = async (mappingsToSave: Omit<DbPackagingMapping, 'id' | 'created_at' | 'updated_at'>[]) => {
    try {
      if (mappingsToSave.length === 0) {
        return { success: true, data: [] };
      }

      const cropId = mappingsToSave[0].crop_id;

      const { error: deleteError } = await supabase
        .from('packagings')
        .delete()
        .eq('crop_id', cropId);

      if (deleteError) throw deleteError;

      const { data, error } = await supabase
        .from('packagings')
        .insert(
          mappingsToSave.map(m => ({
            crop_id: m.crop_id,
            packaging_id: m.packaging_id,
            weight_g: m.weight_g,
          }))
        )
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error upserting mappings:', error);
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa uložiť mapovania',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteMapping = async (cropId: string, weightG: number) => {
    try {
      const { error } = await supabase
        .from('packagings')
        .delete()
        .eq('crop_id', cropId)
        .eq('weight_g', weightG);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting mapping:', error);
      toast({
        title: 'Chyba',
        description: 'Nepodarilo sa vymazať mapovanie',
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  const deleteMappingsByCrop = async (cropId: string) => {
    try {
      const { error } = await supabase
        .from('packagings')
        .delete()
        .eq('crop_id', cropId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting mappings by crop:', error);
      return { success: false, error };
    }
  };

  const getCropsWithMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('packagings')
        .select('crop_id');

      if (error) throw error;
      const uniqueCropIds = [...new Set((data || []).map(m => m.crop_id))];
      return uniqueCropIds;
    } catch (error: any) {
      console.error('Error getting crops with mappings:', error);
      return [];
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  return {
    mappings,
    isLoading,
    loadMappings,
    loadMappingsByCrop,
    upsertMapping,
    upsertMappings,
    deleteMapping,
    deleteMappingsByCrop,
    getCropsWithMappings,
  };
}
