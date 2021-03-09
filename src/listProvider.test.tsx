import { mocked } from 'ts-jest/utils';
import { act, render, screen } from '@testing-library/react';
import React, { useLayoutEffect, useState } from 'react';
import makeListProvider from './listProvider';

describe('listProvider', () => {
	it('should list stats in order', () => {
		const [Provider, useListing] = makeListProvider<string>();

		const Row = ({ name }: { name: string }): JSX.Element => {
			useListing(name);
			return null;
		};

		let [skipSome, setSkipSome]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = [false, () => { return; }];
		let [list, setList]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = [[], () => { return; }];
		let [sublist, setSublist]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = [[], () => { return; }];

		const App = (): JSX.Element => {
			[skipSome, setSkipSome] = useState<boolean>(false);

			[list, setList] = useState<string[]>([]);
			[sublist, setSublist] = useState<string[]>([]);

			return (
				<Provider onChange={setList}>
					<Row name="A" />
					<div>
						<Row name="B" />
						{!skipSome && <Row name="C" />}
					</div>
					{!skipSome && <Row name="D" />}
					<Provider onChange={setSublist}>
						<Row name="E" />
						<div>
							{!skipSome && <Row name="F" />}
							<Row name="G" />
						</div>
					</Provider>
					<Row name="H" />
				</Provider>
			);
		};

		render(<App />);

		act(() => { });

		expect(skipSome).toEqual(false);
		expect(list).toEqual(['A', 'B', 'C', 'D', 'H']);
		expect(sublist).toEqual(['E', 'F', 'G']);

		act(() => {
			setSkipSome(true);
		});

		expect(skipSome).toEqual(true);
		expect(list).toEqual(['A', 'B', 'H']);
		expect(sublist).toEqual(['E', 'G']);

		act(() => {
			setSkipSome(false);
		});

		expect(skipSome).toEqual(false);
		expect(list).toEqual(['A', 'B', 'C', 'D', 'H']);
		expect(sublist).toEqual(['E', 'F', 'G']);
	});

	it('should allow list access inside and out', () => {
		const [Provider, useListing, useList] = makeListProvider<string>();

		let innerList: string[] = [];
		const GetList = (): JSX.Element => {
			innerList = useList();
			return null;
		}

		let innerSublist: string[] = [];
		const GetSublist = (): JSX.Element => {
			innerSublist = useList();
			return null;
		}

		const Row = ({ name }: { name: string }): JSX.Element => {
			useListing(name);
			return null;
		};

		let [list, setList]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = [[], () => { return; }];
		let [sublist, setSublist]: [string[], React.Dispatch<React.SetStateAction<string[]>>] = [[], () => { return; }];

		const App = (): JSX.Element => {
			[list, setList] = useState<string[]>([]);
			[sublist, setSublist] = useState<string[]>([]);

			return (
				<Provider onChange={setList}>
					<GetList />
					<Row name="A" />
					<Row name="B" />
					<Provider onChange={setSublist}>
						<GetSublist />
						<Row name="E" />
						<Row name="F" />
					</Provider>
					<Provider />
				</Provider>
			);
		};

		render(<App />);

		act(() => { });

		expect(list).toBe(innerList);
		expect(sublist).toBe(innerSublist);
	});
});

describe('React', () => {
	describe('useLayoutEffect', () => {
		const list: string[] = [];

		it('should work how I think it does', () => {
			const Counter = ({ id }: { id: string }): JSX.Element => {
				const [state, setState] = useState<string[]>([]);

				useLayoutEffect(() => {
					const value = `A${id}`;
					if (state.length < 3) {
						setState(s => [...s, value]);
					};
					list.push(value);
				});
				useLayoutEffect(() => {
					const value = `B${id}`;
					if (state.length < 3) {
						setState(s => [...s, value]);
					};
					list.push(value);
				});

				return <div>{state.join('')}</div>;
			};

			const wrapper = render(
				<div>
					<Counter id="1" />
					<Counter id="2" />
				</div>
			);
			expect(wrapper.container.textContent).toEqual('A1B1A1B1A2B2A2B2');
			expect(list).toEqual(['A1', 'B1', 'A2', 'B2', 'A1', 'B1', 'A2', 'B2', 'A1', 'B1', 'A2', 'B2']);
		});
	});
});
