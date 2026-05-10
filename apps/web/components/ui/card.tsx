import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Card({ className, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ className, children, ...props }: CardProps) {
    return (
        <div className={cn('mb-4 flex items-center justify-between', className)} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ className, children, ...props }: CardProps) {
    return (
        <h3 className={cn('text-sm font-medium text-white/60', className)} {...props}>
            {children}
        </h3>
    );
}
