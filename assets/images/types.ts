// images/types.ts
import type { ImageSourcePropType } from 'react-native'

export type ImageLeaf = ImageSourcePropType

export type ImageTree = {
  [key: string]: ImageLeaf | ImageTree
}
