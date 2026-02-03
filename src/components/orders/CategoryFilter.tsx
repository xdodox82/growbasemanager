import { Label } from '@/components/ui/label';

interface CategoryFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="space-y-2">
      <Label>Kategória</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 border border-slate-200 rounded-md text-sm bg-white"
      >
        <option value="">Všetky kategórie</option>
        <option value="Mikrozelenina">🌱 Mikrozelenina</option>
        <option value="Mikrobylinky">🌿 Mikrobylinky</option>
        <option value="Jedlé kvety">🌸 Jedlé kvety</option>
        <option value="Mixy">🎨 Mixy</option>
      </select>
    </div>
  );
}
