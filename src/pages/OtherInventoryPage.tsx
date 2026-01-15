import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader, EmptyState } from '@/components/ui/page-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOtherInventory, DbOtherInventory } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Box, Minus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'etikety', label: 'Etikety' },
  { value: 'cistenie', label: 'Čistiace prostriedky' },
  { value: 'nastroje', label: 'Nástroje' },
  { value: 'ine', label: 'Iné' },
];

export default function OtherInventoryPage() {
  const { data: inventory, add, update, remove } = useOtherInventory();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConsumeDialogOpen, setIsConsumeDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DbOtherInventory | null>(null);
  const [consumingItem, setConsumingItem] = useState<DbOtherInventory | null>(null);
  const [consumeAmount, setConsumeAmount] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: '',
    unit: 'ks',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      quantity: '',
      unit: 'ks',
      notes: '',
    });
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.quantity) {
      toast({
        title: 'Chyba',
        description: 'Vyplňte názov a množstvo',
        variant: 'destructive',
      });
      return;
    }

    const itemData = {
      name: formData.name,
      category: formData.category || null,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit || null,
      notes: formData.notes || null,
    };

    if (editingItem) {
      const { error } = await update(editingItem.id, itemData);
      if (!error) {
        toast({ title: 'Položka aktualizovaná', description: 'Záznám bol úspešne upravený' });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await add(itemData);
      if (!error) {
        toast({ title: 'Položka pridaná', description: 'Nový záznám bol úspešne pridaný' });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (item: DbOtherInventory) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || '',
      quantity: item.quantity.toString(),
      unit: item.unit || 'ks',
      notes: item.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await remove(deleteId);
      if (!error) {
        toast({ title: 'Položka vymazaná', description: 'Záznám bol úspešne odstránený' });
      }
      setDeleteId(null);
    }
  };

  const handleConsume = async () => {
    if (!consumingItem || !consumeAmount) return;
    
    const amount = parseFloat(consumeAmount);
    if (amount <= 0 || amount > consumingItem.quantity) {
      toast({
        title: 'Chyba',
        description: 'Zadajte platné množstvo',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await update(consumingItem.id, {
      quantity: consumingItem.quantity - amount,
    });
    
    if (!error) {
      toast({
        title: 'Spotrebované',
        description: `Odobratých ${amount} ${consumingItem.unit || 'ks'}`,
      });
    }
    
    setIsConsumeDialogOpen(false);
    setConsumingItem(null);
    setConsumeAmount('');
  };

  const openConsumeDialog = (item: DbOtherInventory) => {
    setConsumingItem(item);
    setConsumeAmount('');
    setIsConsumeDialogOpen(true);
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'Nekategorizované';
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  // Group by category
  const groupedInventory = inventory.reduce((acc, item) => {
    const cat = item.category || 'ine';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, DbOtherInventory[]>);

  return (
    <MainLayout>
      <PageHeader title="Ostatné zásoby" description="Správa ostatných zásob vrátane etikiet">
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať položku
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Upraviť záznám' : 'Pridať novú položku'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Názov položky *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="napr. Čistiace prostriedky, etikety..."
                />
              </div>

              <div className="space-y-2">
                <Label>Kategória</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte kategóriu" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Množstvo *</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Zadajte množstvo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jednotka</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ks">ks</SelectItem>
                      <SelectItem value="l">l</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="bal">bal</SelectItem>
                      <SelectItem value="role">role</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Poznámky</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Voliteľné poznámky"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                Zrušiť
              </Button>
              <Button onClick={handleSubmit}>
                {editingItem ? 'Uložiť zmeny' : 'Pridať'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {inventory.length === 0 ? (
        <EmptyState
          icon={<Box className="h-12 w-12" />}
          title="Žiadne položky"
          description="Začnite pridaním prvej položky (napr. etikety)"
          action={
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pridať položku
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(cat => {
              const items = groupedInventory[cat.value] || [];
              const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
              const lowStock = items.filter(item => item.quantity < 10).length;
              
              return (
                <Card key={cat.value} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center",
                      cat.value === 'etikety' ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      {cat.value === 'etikety' ? (
                        <Tag className="h-5 w-5 text-primary" />
                      ) : (
                        <Box className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{cat.label}</p>
                      <p className="text-lg font-semibold">{items.length} položiek</p>
                    </div>
                  </div>
                  {lowStock > 0 && (
                    <Badge variant="destructive" className="mt-2">
                      {lowStock} s nízkym stavom
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Názov</TableHead>
                    <TableHead className="hidden sm:table-cell">Kategória</TableHead>
                    <TableHead>Na sklade</TableHead>
                    <TableHead className="text-right">Akcie</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.category === 'etikety' && <Tag className="h-4 w-4 text-primary" />}
                          {item.name}
                        </div>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          {getCategoryLabel(item.category)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "font-semibold",
                          item.quantity < 10 && "text-destructive"
                        )}>
                          {item.quantity} {item.unit || 'ks'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => openConsumeDialog(item)}
                          >
                            <Minus className="h-3 w-3" />
                            <span className="hidden sm:inline">Odobrať</span>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Consume Dialog */}
      <Dialog open={isConsumeDialogOpen} onOpenChange={setIsConsumeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Odobrať zo skladu</DialogTitle>
          </DialogHeader>
          {consumingItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{consumingItem.name}</p>
                <p className="text-sm text-muted-foreground">Aktuálne na sklade:</p>
                <p className="text-xl font-bold">{consumingItem.quantity} {consumingItem.unit || 'ks'}</p>
              </div>
              <div className="space-y-2">
                <Label>Množstvo na odobratie ({consumingItem.unit || 'ks'})</Label>
                <Input
                  type="number"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                  placeholder={`Max: ${consumingItem.quantity}`}
                  max={consumingItem.quantity}
                  step="1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsumeDialogOpen(false)}>
              Zrušiť
            </Button>
            <Button onClick={handleConsume}>
              Odobrať
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odstrániť položku?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Záznám bude permanentne odstránený.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Odstrániť
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
