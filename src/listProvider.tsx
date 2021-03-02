/*!
 * Make List Provider <https://github.com/smujmaiku/make-list-provider>
 * Copyright(c) 2021 Michael Szmadzinski
 * MIT Licensed
 */

import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react';
import { justObservable } from 'just-observable';

export interface ProviderPropsI<T> {
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type ListProviderT<T> = (props: ProviderPropsI<T>) => JSX.Element;
export type UseListingT<T> = (state: T) => void;
export type UseList<T> = () => T[];
export type MakeListProviderT<T> = [ListProviderT<T>, UseListingT<T>, UseList<T>];

export type RegisterListingT<T> = [set: (value: T) => void, unregister: () => void];
export type RegisterListing<T> = (value: T) => RegisterListingT<T>;
export type ContextT<T> = [T[], RegisterListing<T>];

export type RecordsActionSetT<T> = [type: 'set', id: string, payload: T];
export type RecordsActionRemoveT = [type: 'remove', id: string];
export type RecordsActionT<T> = RecordsActionSetT<T> | RecordsActionRemoveT;

export function listRecords<T>(records: Record<string, T>): T[] {
	return Object.entries(records)
		.sort(([a], [b]) => a.padStart(8, '0') < b.padStart(8, '0') ? -1 : 1)
		.map(([, v]) => v);
}

export default function makeListProvider<T>(): MakeListProviderT<T> {
	let index = 0;

	const context = createContext<ContextT<T> | undefined>(undefined);

	function useList(): T[] {
		const [list] = useContext(context) as ContextT<T>;
		return list;
	}

	function useListing(state: T): void {
		const observable = useMemo(() => justObservable<T>(), []);

		const [, register] = useContext(context) as ContextT<T>;

		useEffect(() => {
			const [set, unregister] = register(state);
			const unsubscribe = observable.subscribe(set);

			return () => {
				unregister();
				unsubscribe();
			}
			// State is just needed for initialization
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [register, observable]);

		useEffect(() => {
			observable.next(state);
		}, [state, observable]);
	}

	function recordsReducer(state: Record<string, T>, action: RecordsActionT<T>): Record<string, T> {
		const [type, id, payload] = action;
		if (type === 'set') {
			return {
				...state,
				[id]: payload,
			}
		} else if (type === 'remove') {
			const newState = { ...state };
			delete newState[id];
			return newState;
		}
		return state;
	}

	function Provider(props: ProviderPropsI<T>): JSX.Element {
		const {
			onChange,
			children,
		} = props;

		const [records, dispatch] = useReducer(recordsReducer, {} as Record<string, T>);
		const state = useMemo(() => listRecords(records), [records]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		const register = useCallback((init: T): RegisterListingT<T> => {
			const id = (index++).toString(36);

			const set = (value: T) => {
				dispatch(['set', id, value]);
			};
			set(init)

			const unregister = () => {
				dispatch(['remove', id]);
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
