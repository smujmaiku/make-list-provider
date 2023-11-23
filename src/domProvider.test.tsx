import { act, render } from '@testing-library/react';
import React, { useRef, useState } from 'react';
import makeDomProvider from './domProvider';

describe('domProvider', () => {
	it('should list stats in order', () => {
		const [Provider, useListing] = makeDomProvider<string>();

		const Row = ({ name }: { name: string }): JSX.Element => {
			const ref = useRef<HTMLDivElement>(null!);
			useListing(ref, name);
			return <div ref={ref} />;
		};

		let [skipSome, setSkipSome]: [
			boolean,
			React.Dispatch<React.SetStateAction<boolean>>
		] = [false, jest.fn()];
		let [list, setList]: [
			string[],
			React.Dispatch<React.SetStateAction<string[]>>
		] = [[], jest.fn()];
		let [sublist, setSublist]: [
			string[],
			React.Dispatch<React.SetStateAction<string[]>>
		] = [[], jest.fn()];

		const App = (): JSX.Element => {
			const ref = useRef<HTMLDivElement>(null!);
			const nestRef = useRef<HTMLDivElement>(null!);
			[skipSome, setSkipSome] = useState<boolean>(false);

			[list, setList] = useState<string[]>([]);
			[sublist, setSublist] = useState<string[]>([]);

			return (
				<div ref={ref}>
					<Provider parentRef={ref} onChange={setList}>
						<Row name="A" />
						<div>
							<Row name="B" />
							{!skipSome && <Row name="C" />}
						</div>
						{!skipSome && <Row name="D" />}
						<div ref={nestRef}>
							<Provider parentRef={nestRef} onChange={setSublist}>
								<Row name="E" />
								<div>
									{!skipSome && <Row name="F" />}
									<Row name="G" />
								</div>
							</Provider>
						</div>
						<Row name="H" />
					</Provider>
				</div>
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
		const [Provider, useListing, useList] = makeDomProvider<string>();

		let innerList: string[] = [];
		const GetList = (): JSX.Element => {
			innerList = useList();
			return null!;
		};

		let innerSublist: string[] = [];
		const GetSublist = (): JSX.Element => {
			innerSublist = useList();
			return null!;
		};

		const Row = ({ name }: { name: string }): JSX.Element => {
			const ref = useRef<HTMLDivElement>(null!);
			useListing(ref, name);
			return <div ref={ref} />;
		};

		let [list, setList]: [
			string[],
			React.Dispatch<React.SetStateAction<string[]>>
		] = [[], jest.fn()];
		let [sublist, setSublist]: [
			string[],
			React.Dispatch<React.SetStateAction<string[]>>
		] = [[], jest.fn()];

		const App = (): JSX.Element => {
			const ref = useRef<HTMLDivElement>(null!);
			const nestRef = useRef<HTMLDivElement>(null!);
			const emptyRef = useRef<HTMLDivElement>(null!);

			[list, setList] = useState<string[]>([]);
			[sublist, setSublist] = useState<string[]>([]);

			return (
				<div ref={ref}>
					<Provider parentRef={ref} onChange={setList}>
						<GetList />
						<Row name="A" />
						<Row name="B" />
						<div ref={nestRef}>
							<Provider parentRef={nestRef} onChange={setSublist}>
								<GetSublist />
								<Row name="E" />
								<Row name="F" />
							</Provider>
						</div>
						<div ref={emptyRef}>
							<Provider parentRef={emptyRef} />
						</div>
					</Provider>
				</div>
			);
		};

		render(<App />);

		act(() => { });

		expect(list).toBe(innerList);
		expect(sublist).toBe(innerSublist);
	});
});
