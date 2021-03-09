# Make List Provider

Do you have one or more React hooks to send functionality back to a provider?
Would you like to use React hooks to replace your list of classes with react natively?
Do you just really like using lots of hooks and need to keep them in a list?

Make a react list provider to store hook states and actions.

## Usage

```js
const [Provider, useListing, useList] = makeListProvider();
```

### Provider

Provider for the list

* `onChange`: called with a copy of a list when it is changed

```jsx
const [list, setList] = useState([]);
// list also available from `useList()` inside the provider

return (
	<Provider
		onChange={setList}
	>
		<Component name="1" />
		{more.map(id => (
			<Component key={id} name={id} />
		))}
	</Provider>
);
```

### useListing

Creates a row in the Provider's list.
Any value can be supplied as the argument.
Changes to the value will update the Provider's callback and `useList` hook.

```js
export function Component({ name }) {
	const [state, setState] = useState(() => Math.random());

	useListing(useMemo(() => ({
		name,
		state,
		setState,
	}), [name, state]));

	return null;
}
```

### useList

Returns the Provider's list of values in order.

```js
export function useRow(name) {
	const list = useList();
	const [row] = list.filter(row => row.name === name);
	return row;
}
```

## Notes

### Ordering children

Per `useLayoutEffect`'s call order, a parent element will be ordered after it's children.
To avoid unexpect results, you should not nest children under an element that is calling `useListing`.
This behavior may change in the future.

```jsx
function Row({ children }) {
	useListing();
	return children || null;
}

function App() {
	return (
		<Provider>
			<Row />	// 1
			<Row>	// 3
				<Row />	// 2
			</Row>
			<Row />	// 4
		</Provider>
	);
}

## License

Copyright (c) 2021, Michael Szmadzinski. (MIT License)
