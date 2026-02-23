import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Customer {
  id: string;
  name?: string;
  company_name?: string;
  customer_type?: string;
}

interface SearchableCustomerSelectProps {
  customers: Customer[];
  value: string;
  onValueChange: (value: string) => void;
  filterByType?: string;
  placeholder?: string;
  allowAll?: boolean;
}

export function SearchableCustomerSelect({
  customers,
  value,
  onValueChange,
  filterByType,
  placeholder = 'Vyberte zákazníka',
  allowAll = false
}: SearchableCustomerSelectProps) {
  const [open, setOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!filterByType || filterByType === 'all') {
      return customers;
    }
    return customers.filter(c => c.customer_type === filterByType);
  }, [customers, filterByType]);

  const selectedCustomer = customers.find(c => c.id === value);
  const displayName = value === 'all'
    ? 'Všetci zákazníci'
    : (selectedCustomer?.company_name || selectedCustomer?.name || placeholder);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full h-10 justify-between font-normal border-slate-200"
        >
          <span className={cn(!value && 'text-gray-500')}>
            {displayName}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command className="overflow-visible">
          <CommandInput placeholder="Hľadať zákazníka..." />
          <CommandEmpty>Žiadny zákazník nebol nájdený.</CommandEmpty>
          <div
            className="max-h-60 overflow-y-scroll"
            onWheel={(e) => {
              e.stopPropagation();
              const target = e.currentTarget;
              target.scrollTop += e.deltaY;
            }}
          >
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value="všetci zákazníci all"
                  onSelect={() => {
                    console.log('🔍 Customer selected: ALL');
                    onValueChange('all');
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === 'all' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-medium">Všetci zákazníci</span>
                </CommandItem>
              )}
              {filteredCustomers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={`${customer.name} ${customer.company_name} ${customer.customer_type}`}
                  onSelect={() => {
                    console.log('🔍 Customer selected:', customer.company_name || customer.name);
                    onValueChange(customer.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === customer.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {customer.company_name || customer.name}
                    </span>
                    {customer.customer_type && (
                      <span className="text-xs text-gray-500">
                        {customer.customer_type === 'home' ? 'Domáci' :
                         customer.customer_type === 'gastro' ? 'Gastro' : 'Veľkoobchod'}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
