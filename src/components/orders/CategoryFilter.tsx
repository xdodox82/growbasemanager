import { Label } from '@/components/ui/label';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div>
      <Label className="text-sm">Kategória</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 h-10 border border-gray-300 rounded-md text-sm"
      >
        <option value="">Všetky kategórie</option>
        <option value="Mikrozelenina">Mikrozelenina</option>
        <option value="Mikrobylinky">Mikrobylinky</option>
        <option value="Jedlé kvety">Jedlé kvety</option>
      </select>
    </div>
  );
}
