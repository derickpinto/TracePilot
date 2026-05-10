import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-brand-500/15 text-brand-300',
                secondary: 'bg-white/5 text-white/70',
                outline: 'border border-white/10 text-white/70',
                destructive: 'bg-red-500/15 text-red-400',
                success: 'bg-emerald-500/15 text-emerald-400',
                warning: 'bg-amber-500/15 text-amber-400',
                info: 'bg-blue-500/15 text-blue-400',
            },
        },
        defaultVariants: { variant: 'default' },
    },
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant }), className)} {...props}>
            {children}
        </span>
    );
}
