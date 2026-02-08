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
          <SelectItem value="">
            <div className="flex items-center gap-2">
              <span>Všetky kategórie</span>
            </div>
          </SelectItem>
          <SelectItem value="Mikrozelenina">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              <span>Mikrozelenina</span>
            </div>
          </SelectItem>
          <SelectItem value="Mikrobylinky">
            <div className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-600" />
              <span>Mikrobylinky</span>
            </div>
          </SelectItem>
          <SelectItem value="Jedlé kvety">
            <div className="flex items-center gap-2">
              <Flower className="h-4 w-4 text-green-600" />
              <span>Jedlé kvety</span>
            </div>
          </SelectItem>
          <SelectItem value="Mixy">
            <div className="flex items-center gap-2">
              <span>🎨</span>
              <span>Mixy</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
