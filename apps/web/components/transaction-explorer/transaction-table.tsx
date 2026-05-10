'use client';

import { useCallback, useRef, useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { GridReadyEvent, IGetRowsParams, ColDef, ValueFormatterParams, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { TransactionDetail, WorkflowEventStatus } from '@ai-dashboard/shared';
import { api } from '@/lib/api';
import { formatDuration, formatCost, formatTimestamp, formatTokens } from '@/lib/format';
import { StatusBadge } from '@/components/ui/status-badge';
import { EventDetailDrawer } from './event-detail-drawer';

const ACTIVE_USECASE = 'Test UseCase';

interface TransactionTableProps {
    workflowId?: string;
}

export function TransactionTable({ workflowId }: TransactionTableProps) {
    const gridRef = useRef<AgGridReact>(null);
    const [selectedTx, setSelectedTx] = useState<TransactionDetail | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const columnDefs = useMemo<ColDef[]>(() => [
        {
            field: 'transactionId',
            headerName: 'Transaction ID',
            flex: 1.5,
            minWidth: 180,
            cellClass: 'font-mono text-xs text-white/80',
            filter: 'agTextColumnFilter',
        },
        {
            field: 'workflowId',
            headerName: 'Workflow',
            flex: 1,
            minWidth: 140,
            cellClass: 'font-mono text-xs text-white/60',
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 130,
            cellRenderer: (params: ICellRendererParams) =>
                params.value ? <StatusBadge status={params.value as WorkflowEventStatus} /> : null,
        },
        {
            field: 'totalDurationMs',
            headerName: 'Duration',
            width: 110,
            valueFormatter: (p: ValueFormatterParams) => formatDuration(p.value),
            cellClass: 'tabular-nums text-xs text-white/60',
        },
        {
            field: 'totalTokenUsage',
            headerName: 'Tokens',
            width: 100,
            valueFormatter: (p: ValueFormatterParams) => formatTokens(p.value),
            cellClass: 'tabular-nums text-xs text-white/60',
        },
        {
            field: 'totalCost',
            headerName: 'Cost',
            width: 90,
            valueFormatter: (p: ValueFormatterParams) => formatCost(p.value),
            cellClass: 'tabular-nums text-xs text-white/60',
        },
        {
            field: 'startedAt',
            headerName: 'Started',
            flex: 1,
            minWidth: 160,
            valueFormatter: (p: ValueFormatterParams) => formatTimestamp(p.value),
            cellClass: 'text-xs text-white/40',
            sort: 'desc',
        },
    ], []);

    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: true,
        resizable: true,
        suppressMovable: false,
        cellStyle: { display: 'flex', alignItems: 'center' },
    }), []);

    const datasource = useMemo(() => ({
        getRows: async (params: IGetRowsParams) => {
            const page = Math.floor(params.startRow / 50) + 1;
            try {
                const result = await api.getTransactions({
                    page,
                    pageSize: 50,
                    workflowId,
                    search: searchText || undefined,
                    usecase: ACTIVE_USECASE,
                });
                params.successCallback(result.data, result.total);
            } catch {
                params.failCallback();
            }
        },
    }), [workflowId, searchText]);

    const onGridReady = useCallback(
        (params: GridReadyEvent) => {
            params.api.setGridOption('datasource', datasource);
        },
        [datasource],
    );

    const onRowClicked = useCallback((e: { data: TransactionDetail }) => {
        setSelectedTx(e.data);
        setDrawerOpen(true);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchText(e.target.value);
        gridRef.current?.api.purgeInfiniteCache();
    };

    return (
        <div className="flex h-full flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchText}
                    onChange={handleSearch}
                    className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/80 placeholder-white/30 outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
                />
            </div>

            {/* Grid */}
            <div className="ag-theme-alpine-dark flex-1" style={{ minHeight: 400 }}>
                <AgGridReact
                    ref={gridRef}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowModelType="infinite"
                    cacheBlockSize={50}
                    cacheOverflowSize={2}
                    maxConcurrentDatasourceRequests={1}
                    infiniteInitialRowCount={50}
                    onGridReady={onGridReady}
                    onRowClicked={onRowClicked as any}
                    rowClass="cursor-pointer"
                    suppressCellFocus
                    animateRows
                    suppressColumnVirtualisation={false}
                />
            </div>

            {/* Detail drawer */}
            {selectedTx && (
                <EventDetailDrawer
                    transaction={selectedTx}
                    open={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                />
            )}
        </div>
    );
}
