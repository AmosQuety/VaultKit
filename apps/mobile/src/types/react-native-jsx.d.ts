import * as React from 'react';
import { ViewProps, TextProps, TextInputProps, PressableProps, ImageProps } from 'react-native';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      View: ViewProps & { children?: React.ReactNode };
      Text: TextProps & { children?: React.ReactNode };
      Pressable: PressableProps & { children?: React.ReactNode };
      TextInput: TextInputProps;
      Image: ImageProps;
    }
  }
}
