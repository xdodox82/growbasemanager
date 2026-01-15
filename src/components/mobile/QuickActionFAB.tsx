import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Leaf, 
  Scissors, 
  ShoppingCart, 
  X,
  Sprout,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      icon: <Sprout className="h-5 w-5" />,
      label: 'Nový výsev',
      color: 'bg-success hover:bg-success/90',
      onClick: () => {
        navigate('/planting?action=new');
        setIsOpen(false);
      },
    },
    {
      icon: <Scissors className="h-5 w-5" />,
      label: 'Zaznamenať zber',
      color: 'bg-warning hover:bg-warning/90',
      onClick: () => {
        navigate('/harvest');
        setIsOpen(false);
      },
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      label: 'Nová objednávka',
      color: 'bg-info hover:bg-info/90',
      onClick: () => {
        navigate('/orders?action=new');
        setIsOpen(false);
      },
    },
    {
      icon: <Leaf className="h-5 w-5" />,
      label: 'Nová plodina',
      color: 'bg-primary hover:bg-primary/90',
      onClick: () => {
        navigate('/crops?action=new');
        setIsOpen(false);
      },
    },
  ];

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const deltaX = dragRef.current.startX - e.clientX;
    const deltaY = e.clientY - dragRef.current.startY;
    
    const newX = Math.max(8, Math.min(window.innerWidth - 60, dragRef.current.startPosX + deltaX));
    const newY = Math.max(60, Math.min(window.innerHeight - 60, dragRef.current.startPosY + deltaY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging && dragRef.current) {
      const moved = Math.abs(e.clientX - dragRef.current.startX) > 5 || 
                    Math.abs(e.clientY - dragRef.current.startY) > 5;
      if (!moved) {
        setIsOpen(!isOpen);
      }
    }
    setIsDragging(false);
    dragRef.current = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <>
      {/* Main FAB button - draggable */}
      <div
        className={cn(
          'md:hidden fixed z-50 touch-none select-none',
          isDragging && 'cursor-grabbing'
        )}
        style={{ 
          right: position.x, 
          top: position.y,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Button
          size="lg"
          className={cn(
            'h-12 w-12 rounded-full shadow-xl transition-all duration-300',
            isOpen 
              ? 'bg-destructive hover:bg-destructive/90 rotate-45' 
              : 'bg-primary hover:bg-primary/90 glow-primary',
            isDragging && 'scale-110'
          )}
        >
          {isOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Plus className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>

      {/* Backdrop and action buttons - only rendered when open */}
      {isOpen && (
        <>
          <div 
            className="md:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="md:hidden fixed z-50 flex flex-col items-end gap-3"
            style={{ 
              right: position.x, 
              top: position.y + 56,
            }}
          >
            {actions.map((action, index) => (
              <div
                key={action.label}
                className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                <Button
                  size="lg"
                  className={cn(
                    'h-10 w-10 rounded-full shadow-lg',
                    action.color,
                    'text-white'
                  )}
                  onClick={action.onClick}
                >
                  {action.icon}
                </Button>
                <span className="bg-background/95 backdrop-blur-sm text-foreground px-3 py-2 rounded-lg text-sm font-medium shadow-lg border border-border whitespace-nowrap">
                  {action.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
