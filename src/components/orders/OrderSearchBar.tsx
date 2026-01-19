import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface OrderSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function OrderSearchBar({ value, onChange, placeholder = 'Hľadať podľa mena zákazníka...' }: OrderSearchBarProps) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#10b981] focus:border-transparent"
      />
    </div>
  );
}
