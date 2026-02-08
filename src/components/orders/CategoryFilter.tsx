import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Leaf, Sprout, Flower } from 'lucide-react';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="space-y-2">
      <Label>Kategória</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Všetky kategórie" />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={5}
          className="max-h-[300px]"
        >
          <SelectItem value="">Všetky kategórie</SelectItem>
          <SelectItem value="Mikrozelenina">
            <Leaf className="h-4 w-4 text-green-600 mr-2 inline" />Mikrozelenina
          </SelectItem>
          <SelectItem value="Mikrobylinky">
            <Sprout className="h-4 w-4 text-green-600 mr-2 inline" />Mikrobylinky
          </SelectItem>
          <SelectItem value="Jedlé kvety">
            <Flower className="h-4 w-4 text-green-600 mr-2 inline" />Jedlé kvety
          </SelectItem>
          <SelectItem value="Mixy">🎨 Mixy</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
