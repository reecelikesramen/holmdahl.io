import { VNode } from 'preact'

declare module 'react' {
  interface ReactElement extends VNode {}
  interface ReactNode extends VNode {}
}

declare module 'split-pane-react' {
  // Re-export the original types but with Preact compatibility
  import { ISplitProps, IPaneConfigs } from 'split-pane-react/src/types'
  import { VNode, ComponentChildren } from 'preact'
  
  // Modify the props to work with Preact
  export interface SplitPaneProps extends Omit<ISplitProps, 'children'> {
    children: ComponentChildren
    sashRender: (index: number, active: boolean) => VNode
  }

  export interface PaneProps extends IPaneConfigs {
    children?: ComponentChildren
    className?: string
    style?: object
  }

  export default function SplitPane(props: SplitPaneProps): VNode
  export function Pane(props: PaneProps): VNode
}
