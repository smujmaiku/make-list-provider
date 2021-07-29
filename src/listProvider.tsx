/*!
 * Make List Provider <https://github.com/smujmaiku/make-list-provider>
 * Copyright(c) 2021 Michael Szmadzinski
 * MIT Licensed
 */

import React, {
	createContext,
	useContext,
	useRef,
	useMemo,
	useCallback,
	useEffect,
	useLayoutEffect,
	useReducer,
	useState,
} from 'react';
import { justObservable } from 'just-observable';

export type RecordRow<T> = [order: number, value: T];

export interface ProviderPropsI<T> {
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type ListProviderT<T> = (props: ProviderPropsI<T>) => JSX.Element;
export type UseListingT<T> = (state: T) => void;
export type UseList<T> = () => T[];
export type MakeListProviderT<T> = [ListProviderT<T>, UseListingT<T>, UseList<T>];

export type RegisterListingSet<T> = (value: RecordRow<T>) => void;
export type RegisterListingT<T> = [set: RegisterListingSet<T>, unregister: () => void];
export type RegisterListing<T> = (value: T) => RegisterListingT<T>;
export type ContextT<T> = [T[], RegisterListing<T>];

export type RecordsActionSetT<T> = [type: 'set', id: string, order: number, payload: T];
export type RecordsActionRemoveT = [type: 'remove', id: string];
export type RecordsActionT<T> = RecordsActionSetT<T> | RecordsActionRemoveT;

export function listRecords<T>(records: Record<string, RecordRow<T>>): T[] {
	return Object.values(records)
		.sort(([a], [b]) => a - b)
		.map(([, v]) => v);
}

export default function makeListProvider<T>(): MakeListProviderT<T> {
	let registerCount = 0;
	let orderCount = 0;
	let orderingTime = 0;

	const context = createContext<ContextT<T> | null>(null);

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
			orderCount + 1
		]);

		useLayoutEffect(() => {
			// Prevent cpu thrashing
			if (time === orderingTime) return;

			const order = orderCount++;

			if (order === index) return;
			setIndex([orderingTime, order]);
		});

		return index;
	}

	function useList(): T[] {
		const [list] = useContext(context) as ContextT<T>;
		return list;
	}

	function useListing(state: T): void {
		// State is just needed for initialization
		const stateRef = useRef<T>(state);
		useEffect(() => { stateRef.current = state; }, [state])

		const observable = useMemo(() => justObservable<RecordRow<T>>(), []);

		const [, register] = useContext(context) as ContextT<T>;
		const order = useOrdering();

		useEffect(() => {
			const [set, unregister] = register(stateRef.current);
			const unsubscribe = observable.subscribe(set);

			return () => {
				unregister();
				unsubscribe();
			}
		}, [register, observable]);

		useEffect(() => {
			observable.next([order, state]);
		}, [order, state, observable]);
	}

	function recordsReducer(state: Record<string, RecordRow<T>>, action: RecordsActionT<T>): Record<string, RecordRow<T>> {
		const [type, id, order, payload] = action;

		switch (type) {
			case 'set':
				return {
					...state,
					[id]: [order, payload],
				}
			case 'remove': {
				const newState = { ...state };
				delete newState[id];
				return newState;
			}
		}

		/* istanbul ignore next: unreachable */
		return state;
	}

	function Provider(props: ProviderPropsI<T>): JSX.Element {
		const {
			onChange,
			children,
		} = props;

		const isRootProvider = useContext(context) === null;
		useOrderingRoot(!isRootProvider);

		const [records, dispatch] = useReducer(recordsReducer, {} as Record<string, RecordRow<T>>);
		const state = useMemo(() => listRecords(records), [records]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		const register = useCallback((init: T): RegisterListingT<T> => {
			const registerId = (registerCount++).toString(36);

			const set = ([order, value]: RecordRow<T>) => {
				dispatch(['set', registerId, order, value]);
			};
			set([Infinity, init])

			const unregister = () => {
				dispatch(['remove', registerId]);
			};

			return [set, unregister];
		}, [dispatch]);

		return (
			<context.Provider value={[state, register]}>
				{children}
			</context.Provider>
		);
	}

	return [Provider, useListing, useList];
}
