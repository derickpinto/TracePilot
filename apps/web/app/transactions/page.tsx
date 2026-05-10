'use client';

import { useQuery } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/top-bar';
import { TransactionTable } from '@/components/transaction-explorer/transaction-table';
import { Skeleton } from '@/components/ui/skeleton';

export default function TransactionsPage() {
    return (
        <div className="flex h-full flex-col overflow-hidden">
            <TopBar title="Transaction Explorer" />
            <div className="flex-1 overflow-hidden p-6">
                <TransactionTable />
            </div>
        </div>
    );
}
