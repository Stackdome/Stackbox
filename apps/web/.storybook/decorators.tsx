import type { Decorator } from '@storybook/react-vite'
import { ConfirmProvider } from '../src/components/branded/confirm'
import { CurrentUserProvider } from '../src/contexts/current-user-context'
import { BreadcrumbProvider } from '../src/contexts/breadcrumb-context'
import { SheetHeader } from '../src/components/sheet-header'
import { TasksProvider } from '../src/contexts/tasks-context'

export const withConfirm: Decorator = (Story) => (
  <ConfirmProvider>
    <Story />
  </ConfirmProvider>
)

export const withCurrentUser: Decorator = (Story) => (
  <CurrentUserProvider>
    <Story />
  </CurrentUserProvider>
)

export const withTasks: Decorator = (Story) => (
  <TasksProvider>
    <Story />
  </TasksProvider>
)

/**
 * Mounts the real sheet header (§8) above a page story.
 *
 * A page's title and its actions do not render where the page is: they portal
 * into the header's `#topnav-actions` slot. Without the header a page story is
 * half a page, with no title and no buttons for a `play` function to click.
 */
export const withSheetHeader: Decorator = (Story) => (
  <BreadcrumbProvider>
    <SheetHeader />
    <Story />
  </BreadcrumbProvider>
)

export const withHeight = (px: number): Decorator =>
  function HeightDecorator(Story) {
    return (
      <div style={{ height: px }}>
        <Story />
      </div>
    )
  }
