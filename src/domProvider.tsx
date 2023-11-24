/*!
 * Make List Provider <https://github.com/smujmaiku/make-list-provider>
 * Copyright(c) 2021 Michael Szmadzinski
 * MIT Licensed
 */

import React, {
	useMemo,
	useEffect,
	useState,
	useContext,
	createContext,
} from 'react';
import makeUnorderedProvider from './unorderedProvider';

const ORDERING_RADIX = 36;

type RecordRow<T> = [order: string, value: T];

export interface ProviderPropsI<T> {
	parentRef: React.MutableRefObject<HTMLElement>;
	onChange?: (state: T[]) => void;
	children?: React.ReactNode;
}
export type DomProviderT<T> = (props: ProviderPropsI<T>) => JSX.Element;
export type UseDomItemT<T> = (
	ref: React.MutableRefObject<HTMLElement>,
	state: T
) => number;
export type UseDomList<T> = () => T[];
export type MakeDomProviderT<T> = [
	DomProviderT<T>,
	UseDomItemT<T>,
	UseDomList<T>
];

function listValues<T>(records: RecordRow<T>[]): T[] {
	return records.sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
}

/**
 * Creates a provider to store an ordered list of items based on dom subtree
 * @returns [Provider, useItem, useList]
 *
 * @example
 * const [OptionsProvider, useOption, useOptionList] = makeDomProvider();
 *
 * function Option(props) {
 *   const options = useOptionList();
 *   // ...
 *   useOption(ref, value);
 *   const index = options.indexOf(option);
 *   return (
 *     <option ref={ref}>{index}</option>
 *   );
 * }
 *
 * function App() {
 *   return (
 *     <select ref={ref}>
 *       <OptionsProvider parentRef={ref}>
 *         <Option />
 *         <Option />
 *       </OptionsProvider>
 *     </select>
 *   );
 * }
 */
export function makeDomProvider<T>(): MakeDomProviderT<T> {
	const domContext = createContext<[ProviderPropsI<T>['parentRef'], T[]]>(
		null!
	);

	const [UProvider, useUnordered, useUnorderedList] =
		makeUnorderedProvider<RecordRow<T>>();

	function useOrdering(ref: React.MutableRefObject<HTMLElement>): string {
		const [key, setKey] = useState<string>('');

		const [parentRef] = useContext(domContext);

		// Update key based on dom changes
		useEffect(() => {
			const update = () => {
				let newKey: string = '';
				let node: HTMLElement | null = ref.current;

				while (node?.parentElement) {
					const parent: HTMLElement = node.parentElement;
					const nodes = [...parent.childNodes];
					const size = Math.ceil(
						Math.log(nodes.length + 1) / Math.log(ORDERING_RADIX)
					);
					const indexKey = nodes
						.indexOf(node)
						.toString(ORDERING_RADIX)
						.padStart(size, '0');
					newKey = `${indexKey}-${newKey}`;
					node = parent;
				}

				setKey(newKey);
			};
			update();

			const observer = new MutationObserver(update);
			observer.observe(parentRef.current, { subtree: true, childList: true });

			return () => {
				observer.disconnect();
			};
		}, [ref, parentRef]);

		return key;
	}

	function useList(): T[] {
		return useContext(domContext)[1];
	}

	function useItem(ref: React.MutableRefObject<HTMLElement>, state: T): number {
		const order = useOrdering(ref);
		const value: RecordRow<T> = useMemo(() => [order, state], [order, state]);

		useUnordered(value);

		const list = useUnorderedList();
		return list.map(([o]) => o).filter((o) => o < order).length;
	}

	function Provider(props: ProviderPropsI<T>): JSX.Element {
		const { parentRef, onChange, children } = props;

		const [unordered, setUnordered] = useState<RecordRow<T>[]>([]);

		const state = useMemo(() => listValues(unordered), [unordered]);

		useEffect(() => {
			if (!onChange) return;
			onChange(state);
		}, [onChange, state]);

		const value: [ProviderPropsI<T>['parentRef'], T[]] = useMemo(
			() => [parentRef, state],
			[parentRef, state]
		);

		return (
			<domContext.Provider value={value}>
				<UProvider onChange={setUnordered}>{children}</UProvider>
			</domContext.Provider>
		);
	}

	return [Provider, useItem, useList];
}

export default makeDomProvider;
