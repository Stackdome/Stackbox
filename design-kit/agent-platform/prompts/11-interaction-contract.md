# 11 Interaction contract

What each prototype must do when clicked. Mock data, no network. Anything not listed can be static.

## Global
- Sidebar items navigate between the kit's screens. Active item tracks the route.
- Tasks badge count equals the number of Needs you rows on the Tasks list.
- Every drawer and dialog: opens from its trigger, closes on Cancel, Escape, and scrim click. Drawer keeps the page behind readable.
- Every list: search filters rows live; filters combine; the filter-empty state shows when nothing matches; the true-empty state shows when the dataset is empty.
- Row click navigates to the detail route.

## 01 Shell
- Collapse toggle collapses the rail; badge becomes a dot.
- Admin toggle (a prototype-only switch in the account menu) hides the Organization group.

## 02 Tasks list
- Status segmented control filters. Needs you rows sort to the top.
- New task opens the drawer from 04.
- Cancel on a running row asks for confirmation (ask dialog, 440), then the row shows Cancelled.

## 03 Task detail
- Tabs switch: Timeline, Checks, Runs, Conversation.
- Reply in the Needs you banner: typing enables Send; Send appends the message to Conversation, clears the banner, moves the stepper from Needs input to Implementing, and drops the Tasks badge by one.
- Check artifact thumbnail opens a viewer dialog (work, 760). Test log opens the split console.
- Stack link goes to 09. PR chip opens an external link in a new tab.

## 04 New task drawer
- Description required; submit with it empty shows the field error and keeps the drawer open.
- Screenshot drop zone accepts an image, shows a thumbnail, remove clears it.
- Advanced disclosure toggles.
- Submit closes the drawer and prepends a Running row in phase Intake to the Tasks list.

## 05 Repositories
- Connect provider opens the existing drawer; finishing adds a new provider section with zero repositories.
- Add repositories opens a multi-select drawer; the footer count updates with selection; Add inserts rows under that provider.
- Remove on a used repository opens the blocked dialog naming the applications. Remove on an unused one confirms, then removes the row.
- Reconnect on a Needs re-auth header flips it to Verified.

## 06 Applications list
- View toggle switches list and cards and remembers the choice.
- Connect application opens the page from 07.

## 07 Application detail and connect flow
- Tabs switch. Stacks and Tasks tabs render the 08 and 02 lists prefiltered.
- Rename inline on the title.
- Re-sync on the Stackfile card runs a two-second spinner, then updates synced SHA and clears the stale marks.
- Connect flow: Next is disabled until the step is valid; step 3 shows detected services after a short spinner; Finish navigates to the new application's Overview.
- Disconnect application: typed-confirm dialog; on confirm navigates back to the list without the application.

## 08 Stacks list
- Purpose and status filters. Show torn down toggle.
- Spin up stack opens 10.
- URL link opens a new tab; row click goes to 09.

## 09 Stack view
- Details / Chat segmented control switches the right column. An unanswered blocking question badges Chat.
- Node click opens the resource drawer. Variables tab: editing a value marks it dirty and enables Apply. Apply closes the drawer and prepends a Queued release to the rail, which moves to Building then Live over a few seconds.
- Chat: Send appends the user message; after a short delay an agent reply appears with a spinner row that resolves. When the thread was a blocking question, sending clears the highlight and updates the phase line.
- New conversation clears the thread and adds a Running task to Linked tasks.
- Extend expiry popover with three presets updates the expiry text.
- Tear down: confirm dialog; on confirm the header status becomes Torn down and the canvas dims.
- Zen mode hides the column and top bar; the chat badge persists as a floating dot.
- No add, delete, or reconnect affordance exists anywhere on the canvas.

## 10 Spin up stack drawer
- Purpose Persistent sets expiry to No expiry; other purposes default to 72h.
- Application with two repositories shows two branch fields.
- Spin up closes the drawer and navigates to 09 in the provisioning state, which resolves to Ready after a few seconds.
