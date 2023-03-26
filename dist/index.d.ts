import { StoreReadable } from '@marianmeres/store';
export interface PagingData {
    total: number;
    limit: number;
    offset: number;
}
export interface PagingCalcResult {
    total: number;
    limit: number;
    offset: number;
    isLast: boolean;
    isFirst: boolean;
    nextPage: number | false;
    previousPage: number | false;
    hasNext: boolean;
    hasPrevious: boolean;
    nextOffset: number;
    previosOffset: number;
    currentPage: number | false;
    pageCount: number;
    firstOffset: number;
    lastOffset: number;
}
export interface PagingStore extends StoreReadable<PagingCalcResult> {
    update: (pagingData: Partial<PagingData>) => void;
    reset: (limit?: any) => void;
}
export declare const calculatePaging: (pagingData?: Partial<PagingData>) => PagingCalcResult;
export declare const createPagingStore: (pagingData?: Partial<PagingData>, defaultLimit?: number) => PagingStore;
