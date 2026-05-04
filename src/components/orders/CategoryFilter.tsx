import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Sprout, Flower, Palette } from 'lucide-react';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
}

export function CategoryFilter({ value, onChange, hideLabel }: CategoryFilterProps) {

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-1">
      {!hideLabel && <Label className="text-sm font-medium text-gray-700 text-center block">Kategória</Label>}
      <Select
        value={value}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full h-10 self-stretch">
          <SelectValue placeholder="Všetky kategórie" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          className="max-h-[300px] !z-[100]"
        >
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>Všetky kategórie</span>
            </div>
          </SelectItem>
          <SelectItem value="microgreens">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span>Mikrozelenina</span>
            </div>
          </SelectItem>
          <SelectItem value="microherbs">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-600" />
              <span>Mikrobylinky</span>
            </div>
          </SelectItem>
          <SelectItem value="edible_flowers">
            <div className="flex items-center gap-2">
              <Flower className="h-4 w-4 text-green-600" />
              <span>Jedlé kvety</span>
            </div>
          </SelectItem>
          <SelectItem value="mix">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-green-600" />
              <span>Mixy</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
