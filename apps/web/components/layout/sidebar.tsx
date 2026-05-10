'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    GitBranch,
    Search,
    ChevronLeft,
    ChevronRight,
    Zap,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/workflows', icon: GitBranch, label: 'Workflows' },
    { href: '/transactions', icon: Search, label: 'Transactions' },
    { href: '/live', icon: Activity, label: 'Live Feed' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            initial={false}
            animate={{ width: collapsed ? 64 : 220 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="relative flex h-screen flex-col border-r border-white/[0.06] bg-[hsl(222,47%,5%)]"
        >
            {/* Logo */}
            <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600">
                    <Zap className="h-4 w-4 text-white" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 }}
                            className="truncate text-sm font-semibold text-white"
                        >
                            AI Observe
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-0.5 p-2 pt-3">
                {NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                                active
                                    ? 'bg-brand-600/20 text-brand-300'
                                    : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80',
                            )}
                        >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.1 }}
                                        className="truncate"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse button */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.1] bg-[hsl(222,47%,7%)] text-white/40 hover:text-white/80 transition-colors"
            >
                {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
        </motion.aside>
    );
}
