/*!
 * Make List Provider <https://github.com/smujmaiku/make-list-provider>
 * Copyright(c) 2021 Michael Szmadzinski
 * MIT Licensed
 */

import React, { useMemo, useEffect, useLayoutEffect, useState } from 'react';
import makeUnorderedProvider from './unorderedProvider';

export type RecordRow<T> = [order: number, value: T];

export interface ProviderPropsI<T> {
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type ListProviderT<T> = (props: ProviderPropsI<T>) => JSX.Element;
export type UseListingT<T> = (state: T) => void;
export type UseList<T> = () => T[];
export type MakeListProviderT<T> = [
	ListProviderT<T>,
	UseListingT<T>,
	UseList<T>
];

function listRecords<T>(records: RecordRow<T>[]): T[] {
	return records.sort(([a], [b]) => a - b).map(([, v]) => v);
}

export function makeListProvider<T>(): MakeListProviderT<T> {
	let orderCount = 0;
	let orderingTime = 0;

	const [UProvider, useUnordered, useUnorderedList] =
		makeUnorderedProvider<RecordRow<T>>();

	// Prevent restarting counts in nested providers
	function useOrderingRoot(skip: boolean) {
		useLayoutEffect(() => {
			if (skip) return;
			orderCount = 0;
			orderingTime = Date.now();
		});
	}

	function useOrdering() {
		const [[time, index], setIndex] = useState(() => [
			orderingTime,
			orderCount + 1,
		]);

		// eslint-disable-next-line react-hooks/exhaustive-deps
		useLayoutEffect(() => {
			// Prevent cpu thrashing
			if (time === orderingTime) return;

			const order = orderCount;
			orderCount += 1;

			if (order === index) return;
			setIndex([orderingTime, order]);
		});

		return index;
	}

	function useList(): T[] {
		const unordered = useUnorderedList();
		const ordered = useMemo(() => listRecords(unordered), [unordered]);
		return ordered;
	}

	function useListing(state: T): void {
		const order = useOrdering();
		const value: RecordRow<T> = useMemo(() => [order, state], [order, state]);

		useUnordered(value);
	}

	function Provider(props: ProviderPropsI<T>): JSX.Element {
		const { onChange, children } = props;

		const [unordered, setUnordered] = useState<RecordRow<T>[]>([]);

		const isRootProvider = !(useUnorderedList() instanceof Array);
		useOrderingRoot(!isRootProvider);

		const state = useMemo(() => listRecords(unordered), [unordered]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		return <UProvider onChange={setUnordered}>{children}</UProvider>;
	}

	return [Provider, useListing, useList];
}

export default makeListProvider;

export * from './unorderedProvider';
