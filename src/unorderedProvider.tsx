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
export type UseUItemT<T> = (state: T) => void;
export type UseUList<T> = () => T[];
export type MakeUnorderedProviderT<T> = [
	UListProviderT<T>,
	UseUItemT<T>,
	UseUList<T>
];

export type RegisterUItemSet<T> = (value: T) => void;
export type RegisterUItemT<T> = [
	set: RegisterUItemSet<T>,
	unregister: () => void
];
export type RegisterUItem<T> = (value: T) => RegisterUItemT<T>;
export type UListContextT<T> = [T[], RegisterUItem<T>];

export type UActionSetT<T> = [type: 'set', id: string, payload: T];
export type UActionRemoveT = [type: 'remove', id: string];
export type UActionT<T> = UActionSetT<T> | UActionRemoveT;

function listValues<T>(records: Record<string, T>): T[] {
	return Object.values(records);
}

/**
 * Creates a provider to store a list of items
 * @returns [Provider, useItem, useList]
 *
 * @example
 * const [SocketsProvider, useSocket, useSocketList] = makeUnorderedProvider();
 *
 * function useSocketByName(name) {
 *   return useSocketList().find(socket => socket.name === name);
 * }
 *
 * function Socket(props) {
 *   // ...
 *   useSocket(socket);
 * }
 *
 * function App() {
 *   return (
 *     <SocketsProvider>
 *       <Socket port={8080} />
 *       <Socket port={8081} />
 *     </SocketsProvider>
 *   );
 * }
 */
export function makeUnorderedProvider<T>(): MakeUnorderedProviderT<T> {
	let registerCount = 0;

	const context = createContext<UListContextT<T>>(null!);

	function useList(): T[] {
		const [list] = useContext(context) || [];
		return list;
	}

	function useItem(state: T): void {
		const stateRef = useRef<T>(null!);
		stateRef.current = state;

		const observable = useMemo(() => justObservable<T>(), []);

		const [, register] = useContext(context) as UListContextT<T>;

		// Register item
		useEffect(() => {
			const [set, unregister] = register(stateRef.current);
			const unsubscribe = observable.subscribe(set);

			return () => {
				unregister();
				unsubscribe();
			};
		}, [register, observable]);

		// Update item
		useEffect(() => {
			observable.next(state);
		}, [state, observable]);
	}

	function recordsReducer(
		state: Record<string, T>,
		action: UActionT<T>
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
		const state = useMemo(() => listValues(records), [records]);

		useEffect(() => {
			onChange?.(state);
		}, [onChange, state]);

		const register = useCallback(
			(init: T): RegisterUItemT<T> => {
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

	return [Provider, useItem, useList];
}

export default makeUnorderedProvider;
