/*!
 * Make List Provider <https://github.com/smujmaiku/make-list-provider>
 * Copyright(c) 2021 Michael Szmadzinski
 * MIT Licensed
 */

import React, {
	useMemo,
	useEffect,
	useLayoutEffect,
	useState,
	useContext,
	createContext,
} from 'react';
import makeUnorderedProvider from './unorderedProvider';

type RecordRow<T> = [order: number, value: T];

export interface ProviderPropsI<T> {
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type ListProviderT<T> = (props: ProviderPropsI<T>) => JSX.Element;
export type UseItemT<T> = (state: T) => void;
export type UseList<T> = () => T[];
export type MakeListProviderT<T> = [ListProviderT<T>, UseItemT<T>, UseList<T>];

function listValues<T>(records: RecordRow<T>[]): T[] {
	return records.sort(([a], [b]) => a - b).map(([, v]) => v);
}

/**
 * Creates a provider to store an ordered list of items
 * @returns [Provider, useItem, useList]
 *
 * @example
 * @example
 * const [CanvasProvider, useDraw, useDrawList] = makeListProvider();
 *
 * function RenderCanvas() {
 *   const drawCallbacks = useDrawList();
 *   // ...
 *   return <canvas ref={ref} />
 * }
 *
 * function DrawBox(props) {
 *   // ...
 *   useDraw(drawCallback);
 * }
 *
 * function App() {
 *   return (
 *     <CanvasProvider>
 *       <RenderCanvas />
 *       <DrawBox rect={[1,2]} />
 *       <DrawBox rect={[2,3]} />
 *     </CanvasProvider>
 *   );
 * }
 */
export function makeListProvider<T>(): MakeListProviderT<T> {
	let orderCount = 0;
	let orderingTime = 0;

	const orderedContext = createContext<T[]>([]);

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
		return useContext(orderedContext);
	}

	function useItem(state: T): void {
		const order = useOrdering();
		const value: RecordRow<T> = useMemo(() => [order, state], [order, state]);

		useUnordered(value);
	}

	function Provider(props: ProviderPropsI<T>): JSX.Element {
		const { onChange, children } = props;

		const [unordered, setUnordered] = useState<RecordRow<T>[]>([]);

		const isRootProvider = !(useUnorderedList() instanceof Array);
		useOrderingRoot(!isRootProvider);

		const state = useMemo(() => listValues(unordered), [unordered]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		return (
			<orderedContext.Provider value={state}>
				<UProvider onChange={setUnordered}>{children}</UProvider>
			</orderedContext.Provider>
		);
	}

	return [Provider, useItem, useList];
}

export default makeListProvider;

export * from './unorderedProvider';
export * from './domProvider';
