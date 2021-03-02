import React from 'react';
import makeListProvider from './listProvider';

describe('listProvider', () => {
	it('Should be tested', () => {
		const [Provider, useList, useListing] = makeListProvider<string>();
		expect('is').not.toBe('tested');
	});
});
