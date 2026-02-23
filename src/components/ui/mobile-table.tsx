import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileTableRowProps {
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

export function MobileTableRow({
  children,
  expandedContent,
  className,
  isSelected,
  onClick
}: MobileTableRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isMobile = useIsMobile();

  if (!isMobile || !expandedContent) {
    return (
      <tr
        className={cn(
          "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
          isSelected && 'bg-primary/5',
          className
        )}
        onClick={onClick}
      >
        {children}
      </tr>
    );
  }

  return (
    <>
      <tr
        className={cn(
          "border-b transition-colors cursor-pointer hover:bg-muted/50",
          isSelected && 'bg-primary/5',
          isExpanded && 'bg-muted/30',
          className
        )}
        onClick={(e) => {
          // If there's a custom onClick and we're clicking outside action buttons, call it
          if (onClick && !(e.target as HTMLElement).closest('[data-action-cell]')) {
            onClick();
          } else {
            // Otherwise toggle expansion
            setIsExpanded(!isExpanded);
          }
        }}
      >
        {children}
        <td className="p-2 align-middle">
          <button
            className="p-1 rounded-md hover:bg-muted"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={100} className="p-4">
            <div className="animate-fade-in space-y-3">
              {expandedContent}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface MobileTableCellProps {
  children: React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function MobileTableCell({
  children,
  className,
  hideOnMobile,
  label,
  onClick
}: MobileTableCellProps) {
  const isMobile = useIsMobile();

  if (hideOnMobile && isMobile) {
    return null;
  }

  return (
    <td
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
      onClick={onClick}
      data-action-cell={onClick ? true : undefined}
    >
      {label && isMobile && (
        <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      )}
      {children}
    </td>
  );
}

interface MobileTableHeadProps {
  children?: React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function MobileTableHead({ 
  children, 
  className,
  hideOnMobile
}: MobileTableHeadProps) {
  const isMobile = useIsMobile();

  if (hideOnMobile && isMobile) {
    return null;
  }

  return (
    <th className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}>
      {children}
    </th>
  );
}

interface ExpandedDetailProps {
  label: string;
  value: React.ReactNode;
}

export function ExpandedDetail({ label, value }: ExpandedDetailProps) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
