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
	useReducer,
} from 'react';
import { justObservable } from 'just-observable';

export interface UProviderPropsI<T> {
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type UListProviderT<T> = (props: UProviderPropsI<T>) => JSX.Element;
export type UseUListingT<T> = (state: T) => void;
export type UseUList<T> = () => T[];
export type MakeUnorderedProviderT<T> = [
	UListProviderT<T>,
	UseUListingT<T>,
	UseUList<T>
];

export type RegisterUListingSet<T> = (value: T) => void;
export type RegisterUListingT<T> = [
	set: RegisterUListingSet<T>,
	unregister: () => void
];
export type RegisterUListing<T> = (value: T) => RegisterUListingT<T>;
export type UListContextT<T> = [T[], RegisterUListing<T>];

export type RecordsUActionSetT<T> = [type: 'set', id: string, payload: T];
export type RecordsUActionRemoveT = [type: 'remove', id: string];
export type RecordsUActionT<T> = RecordsUActionSetT<T> | RecordsUActionRemoveT;

function listRecords<T>(records: Record<string, T>): T[] {
	return Object.values(records);
}

export function makeUnorderedProvider<T>(): MakeUnorderedProviderT<T> {
	let registerCount = 0;

	const context = createContext<UListContextT<T>>(null!);

	function useList(): T[] {
		const [list] = useContext(context) as UListContextT<T>;
		return list;
	}

	function useListing(state: T): void {
		const stateRef = useRef<T>(null!);
		stateRef.current = state;

		const observable = useMemo(() => justObservable<T>(), []);

		const [, register] = useContext(context) as UListContextT<T>;

		// Register listing
		useEffect(() => {
			const [set, unregister] = register(stateRef.current);
			const unsubscribe = observable.subscribe(set);

			return () => {
				unregister();
				unsubscribe();
			};
		}, [register, observable]);

		// Update listing
		useEffect(() => {
			observable.next(state);
		}, [state, observable]);
	}

	function recordsReducer(
		state: Record<string, T>,
		action: RecordsUActionT<T>
	): Record<string, T> {
		const [type, id, payload] = action;

		switch (type) {
			case 'set':
				return {
					...state,
					[id]: payload,
				};
			case 'remove': {
				const newState = { ...state };
				delete newState[id];
				return newState;
			}
			/* istanbul ignore next: unreachable */
			default:
				return state;
		}
	}

	function Provider(props: UProviderPropsI<T>): JSX.Element {
		const { onChange, children } = props;

		const [records, dispatch] = useReducer(
			recordsReducer,
			{} as Record<string, T>
		);
		const state = useMemo(() => listRecords(records), [records]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		const register = useCallback(
			(init: T): RegisterUListingT<T> => {
				const registerId = registerCount.toString(36);
				registerCount += 1;

				const set = (value: T) => {
					dispatch(['set', registerId, value]);
				};
				set(init);

				const unregister = () => {
					dispatch(['remove', registerId]);
				};

				return [set, unregister];
			},
			[dispatch]
		);

		const value: UListContextT<T> = useMemo(
			() => [state, register],
			[state, register]
		);

		return <context.Provider value={value}>{children}</context.Provider>;
	}

	return [Provider, useListing, useList];
}

export default makeUnorderedProvider;
