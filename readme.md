# Make List Provider

Do you have one or more React hooks to send functionality back to a provider?
Would you like to use React hooks to replace your list of classes with react natively?
Do you just really like using lots of hooks and need to keep them in a list?

Make a react list provider to store hook states and actions.

## Usage

```js
const [Provider, useItem, useList] = makeListProvider();
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

### useItem

Creates an entry in the Provider's list.
Any value can be supplied as the argument.
Changes to the value will update the Provider's callback and `useList` hook.

```js
export function Component({ name }) {
	const [state, setState] = useState(() => Math.random());

	useItem(useMemo(() => ({
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
export function useItemByName(name) {
	const list = useList();
	const [item] = list.filter(item => item.name === name);
	return item;
}
```

## Notes

### Ordering children

Per `useLayoutEffect`'s call order, a parent element will be ordered after it's children.
To avoid unexpect results, you should not nest children under an element that is calling `useItem`.
This behavior may change in the future.

```jsx
function Item({ children }) {
	useItem();
	return children;
}

function App() {
	return (
		<Provider>
			<Item />	// 1
			<Item>	// 3
				<Item />	// 2
			</Item>
			<Item />	// 4
		</Provider>
	);
}
```

## License

Copyright (c) 2021, Michael Szmadzinski. (MIT License)
