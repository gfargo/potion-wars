import { Box, Text, useInput } from 'ink';
import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';

export type Item<V> = {
	key?: string;
	label: string;
	value: V;
	hotkey?: string;
	indicator?: React.ReactNode;
	disabled?: boolean;
};

type Props<V> = {
	items?: Array<Item<V>>;
	isFocused?: boolean;
	initialIndex?: number;
	limit?: number;
	indicatorComponent?: FC<IndicatorProps>;
	itemComponent?: FC<ItemProps>;
	onSelect?: (item: Item<V>) => void;
	onHighlight?: (item: Item<V>) => void;
	orientation?: 'vertical' | 'horizontal';
	enableSearch?: boolean;
};

type IndicatorProps = {
	isSelected: boolean;
};

type ItemProps = {
	isSelected: boolean;
	label: string;
	isDisabled: boolean;
};

const DefaultIndicator: FC<IndicatorProps> = ({ isSelected }) => (
	<Box marginRight={1}>
		<Text>{isSelected ? '>' : ' '}</Text>
	</Box>
);

const DefaultItem: FC<ItemProps> = ({ isSelected, label, isDisabled }) => (
	<Text color={isDisabled ? 'gray' : (isSelected ? 'blue' : undefined)} dimColor={isDisabled}>
		{label}
	</Text>
);

function EnhancedSelectInput<V>({
	items = [],
	isFocused = true,
	initialIndex = 0,
	indicatorComponent = DefaultIndicator,
	itemComponent = DefaultItem,
	limit,
	onSelect,
	onHighlight,
	orientation = 'vertical',
	enableSearch = true,
}: Props<V>) {
	const [_, setRotateIndex] = useState(initialIndex);
	const [selectedIndex, setSelectedIndex] = useState(initialIndex);
	const [searchTerm, setSearchTerm] = useState('');

	const filteredItems = useMemo(() => {
		if (!enableSearch || searchTerm === '') return items;
		return items.filter(item => 
			item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
			item.hotkey?.toLowerCase() === searchTerm.toLowerCase()
		);
	}, [items, searchTerm, enableSearch]);

	const visibleItems = limit ? filteredItems.slice(0, limit) : filteredItems;
	const lastIndex = visibleItems.length - 1;

	useEffect(() => {
		const highlightedItem = visibleItems[selectedIndex];
		if (highlightedItem) {
			onHighlight?.(highlightedItem);
		}
	}, [visibleItems, selectedIndex, onHighlight]);

	useInput(
		(input, key) => {
			if (isFocused === false) {
				return;
			}

			if (enableSearch) {
				if (key.escape) {
					setSearchTerm('');
					return;
				}

				if (input.length === 1 && !key.ctrl && !key.meta) {
					setSearchTerm(prev => prev + input);
					return;
				}

				if (key.backspace) {
					setSearchTerm(prev => prev.slice(0, -1));
					return;
				}
			}

			const rotateFunc = (index: number): number => {
				if (index === lastIndex) {
					return 0;
				}

				if (index === 0) {
					return lastIndex;
				}

				return index;
			};

			let nextIndex = selectedIndex;
			if (orientation === 'vertical') {
				if (key.upArrow || input === 'k') {
					do {
						nextIndex = rotateFunc(nextIndex - 1);
					} while (visibleItems[nextIndex]?.disabled);
				}

				if (key.downArrow || input === 'j') {
					do {
						nextIndex = rotateFunc(nextIndex + 1);
					} while (visibleItems[nextIndex]?.disabled);
				}
			} else {
				if (key.leftArrow || input === 'h') {
					do {
						nextIndex = rotateFunc(nextIndex - 1);
					} while (visibleItems[nextIndex]?.disabled);
				}

				if (key.rightArrow || input === 'l') {
					do {
						nextIndex = rotateFunc(nextIndex + 1);
					} while (visibleItems[nextIndex]?.disabled);
				}
			}

			if (nextIndex !== selectedIndex) {
				setSelectedIndex(nextIndex);
				if (limit) {
					setRotateIndex(Math.floor(nextIndex / limit) * limit);
				}
			}

			if (key.return) {
				const selectedItem = visibleItems[selectedIndex];
				if (selectedItem && !selectedItem.disabled) {
					onSelect?.(selectedItem);
				}
			}

			// Handle hotkey selection
			const hotkeyItem = visibleItems.find(item => item.hotkey === input && !item.disabled);
			if (hotkeyItem) {
				const hotkeyIndex = visibleItems.indexOf(hotkeyItem);
				setSelectedIndex(hotkeyIndex);
				onSelect?.(hotkeyItem);
			}
		},
		{ isActive: isFocused }
	);

	const IndicatorComponent = indicatorComponent;
	const ItemComponent = itemComponent;

	return (
		<Box flexDirection="column">
			{enableSearch && searchTerm && (
				<Box marginBottom={1}>
					<Text>Search: {searchTerm}</Text>
				</Box>
			)}
			<Box flexDirection={orientation === 'vertical' ? 'column' : 'row'}>
				{visibleItems.map((item, index) => {
					const isSelected = index === selectedIndex;

					return (
						<Box key={item.key ?? String(item.value)}>
							{item.indicator ? (
								<Box marginRight={1}>
									<Text>{isSelected ? item.indicator : ' '}</Text>
								</Box>
							) : (
								<IndicatorComponent isSelected={isSelected} />
							)}
							<ItemComponent isSelected={isSelected} label={item.label} isDisabled={!!item.disabled} />
							{item.hotkey && (
								<Text color="gray" dimColor>
									{' '}
									({item.hotkey})
								</Text>
							)}
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}

export default EnhancedSelectInput;

