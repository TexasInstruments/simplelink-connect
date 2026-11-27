import * as React from 'react';
import { StyleSheet } from 'react-native';
import { act, create } from 'react-test-renderer';

import { MonoText } from '../components/StyledText';

jest.mock('@rneui/base', () => ({ Switch: 'Switch' }));

it('renders its children in the Space Mono font', async () => {
  let view;
  await act(async () => {
    view = create(<MonoText style={{ fontSize: 12 }}>Styled text</MonoText>);
  });

  const tree = view.toJSON();
  expect(tree.children).toEqual(['Styled text']);
  expect(StyleSheet.flatten(tree.props.style)).toMatchObject({ fontFamily: 'space-mono', fontSize: 12 });

  await act(async () => { view.unmount(); });
});
