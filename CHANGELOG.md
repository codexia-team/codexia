# Changelog

> New entries are prepended here again (run `scripts/gen-changelog-entry.sh`
> before tagging a release). Releases 0.42.0–0.50.1 live in
> [changelogs/](./changelogs/); versions 0.37.0 through 0.41.1 have no written
> changelog. The release workflow reads the top `## [version]` section of this
> file matching the tag being published.

## [0.50.2] - 2026-09-09

[Compare with v0.50.1](https://github.com/milisp/codexia/compare/v0.50.1...v0.50.2)

- chore: bump project version to 0.50.2 (`550cd32f`)
- chore: auto-generate release notes from CHANGELOG.md instead of docs/RELEASE_NOTE.md (`db8b2971`)
- fix: remove unused read_dir import in openapp (`50ef839e`)
- feat: add optional you.com search integration (`d165cb70`)

## [0.36.0] - 26/6/2026

### 🚀 Features & Improvements
- Aggregated Shell Commands: Your command executions are now neatly grouped into expandable summary items within the codex thread. This keeps your workspace clean while still displaying the aggregated output directly in the action items.
- Command Status Tracking: Added clear execution status tracking and visibility for shell commands so you always know exactly how your tasks are progressing.
- Redesigned BrowserProjects UI: Overhauled the interface to make navigation smoother. This update breadcrumb navigation, handy keyboard shortcuts, and much better file path handling.

### 🧹 Cleanups & Optimizations
- Streamlined UI & Logging: Removed outdated reasoning-related interface components and server-side logging to optimize performance and declutter the app.
- Smoother Event Filtering: Improved background logic for event filtering to ensure a faster and more stable experience.

## [0.35.3] - 25/6/2026

Split web and Desktop, This project focus Desktop in the future.

### 🌟 Highlights
- Streamlined Switching Experience: Upgraded the workspace and agent switching interfaces with cleaner dropdown menus for a smoother workflow.
- External Web Previews: Web previews now correctly support opening links in your system's default external browser.
- Web Previews Browser-like Navigation History: You can now move forward and backward through your app history just like a web browser, with persistent sessions.

### 🚀 Features & Enhancements
- Claude code Automation Permissions: Added a "bypass permission" mode for automated tasks and improved the execution logs.
- Network Updates: Remove built-in STUN servers.

### Bug Fixes
- Fixed a critical desktop launch issue where certain plugins could not be found because of split web.

## [0.16.0] - 2025-12-03

### Features
- Integrate SQLite for session and favorites management.
- Implement database structure for notes and favorites management.
- Add support for .db file type in Info.plist.
- Add loading, error, and empty states to usage page.
- Add remote control feature to settings and enhance AppHeader.
- Enhance TypeScript export functionality with output path option.
- Refactor MediaSelector and ProjectsPage to import open from plugin-dialog.
- Enhance ChatInput component to handle composition events.
- Refactor codex-client to remove Tauri dependency and implement EventBus.

### Fixes
- Improve Enter key handling in ChatInput for better composition support.
- Update Chinese bug report template to encourage English submissions.

### Refactor
- Restructure session file management and database interactions.
- Simplify event handling in setup_event_bridge function.

### Chore
- Bump version to 0.16.0 in package.json, Cargo.toml, and Cargo.lock.
- Update dependencies and versioning across multiple Cargo files.
- Add missing import for Path in Rust library.
- Remove macOS platform configurations from release workflow.

### Documentation
- Update README with pricing details and note for paid users.
- Update README to include SQLite cache details and remote access instructions.
- Update documentation for build commands and project structure.

## [0.15.0] - 2025-11-25

### Features
- Add entitlements and Info.plist for macOS app configuration.
- Add codex_export_bindings binary and update TypeScript export path.
- Add project scanning functionality to ProjectsPage.
- Implement comprehensive command structure for codex-client.
- Add donation link to Introduce component.
- Enhance provider configuration and UI components.
- Add Donate page and integrate donation functionality.
- Add event filtering functionality to Chat component.
- Implement codex client with configuration and session management.
- Introduce codex configuration and session management modules.
- Integrate provider configuration loading from service.
- Add donation support and update README with funding information.

### Refactor
- Move ChatTab, ChatView, and ConversationList components.
- Simplify BulkDeleteButtons component by removing authentication logic.
- Reorganize command structure and remove unused code.
- Remove unused file and time utility functions.

### Chore
- Update version to 0.15.0 in package.json, Cargo.toml, and Cargo.lock.
- Remove unused hello.txt file.

## [0.14.0] - 2025-11-22

### Features
- Add GitHub Actions workflow for Linux ARM builds.
- Implement backup functionality for TOML configuration files.
- Reset review state in ChatToolbar on new conversation.
- Enhance client initialization process with state management improvements.
- Enhance MarkdownRenderer with syntax highlighting and improved theming.
- Add codex_bindings for TypeScript export and integration.
- Implement client initialization command and integrate with ChatToolbar component.
- Add McpToolCallItem component for handling MCP tool call events.
- Integrate alert dialog for provider and model deletion.
- Add quick fill functionality to AddProviderForm component.
- Update Introduce component with new community engagement buttons.
- Display current working directory in AppHeader component.
- Enhance BouncingDotsLoader with elapsed time tracking.
- Enhance AppState with client spawn lock.

### Fixes
- Correct spelling and improve layout in ProviderModels component.
- Update user authentication check in BulkDeleteButtons component.

### Refactor
- Improve command parsing in ReviewExecCommandItem.
- Utilize backup functionality for TOML configuration updates.
- Remove unused CheckCircle2 icon from ExecCommandBeginItem component.
- Simplify stream duration label formatting.

### Chore
- Update version to 0.14.0 in package.json, Cargo.toml, and Cargo.lock.
- Update GitHub Actions workflow to include Ubuntu 22.04-arm platform.
- Update codex dependencies to specific revision and remove unused package.
- Remove ensure_default_providers function and related calls.
- Update tauri configuration with additional metadata and platform-specific settings.

## [0.13.0] - 2025-11-20

### Features
- Add inline environment table conversion in MCP server configuration.
- Add directory selection button for static bundle path in RemoteAccessSettings.
- Integrate PromptOptimizerSettings into ProviderModels and update API key handling.
- Add warning message display in EventItem component.
- Integrate LoginRequire component for authentication prompts.
- Add LoginRequire component and integrate authentication check in Review.
- Enhance routing with authentication and new pages.
- Enhance AppHeader with dropdown menu and user options.
- Enhance login page with Google OAuth and last used provider badge.
- Add AgentPage for managing agents with markdown editor.
- Add dropdown menu to MsgFooter for saving messages to notes.
- Implement conversation-specific busy state management.
- Introduce ExecCommandBeginItem component for improved command execution display.
- Enhance BouncingDotsLoader with elapsed time display and session state management.
- Enhance Introduce component with ChatGPT authentication and UI improvements.
- Implement conversation listener store and enhance event handling.
- Add black accent color option and refactor AccentColorSelector.
- Enhance chat components with busy state handling.
- Add system sleep prevention toggle in settings.

### Fixes
- Update release link in README.md to point to the correct repository.
- Enhance BouncingDotsLoader for dark mode support.

### Refactor
- Update chat page tabs layout and remove attached files tab.
- Remove custom scrollbar styles from App.css.
- Update MsgFooter and Event components for improved styling and structure.
- Remove redundant "Total" label from TokenCountInfo component.
- Comment out UserDropdown component in AppHeader for future reference.

### Chore
- Update version to 0.13.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Update README.md with new section on remote control and adjust badge links.
- Update README.md with additional build command for bindings generation.
- Update README.md with additional agent design options and task execution steps.
- Update README.md with enhanced project overview and installation instructions.

## [0.12.0] - 2025-11-17

### Features
- Add toggle button for review mode in ChatCompose component.
- Add review functionality and integrate review page.
- Implement Codex authentication and rate limit settings components.
- Add export_bindings module for TypeScript bindings generation.
- Add new window functionality and improve UI in Introduce component.

### Fixes
- Update label text for API Key and Base URL in provider details components.

### Refactor
- Remove appendEventLine logic.
- Replace RawConversationSummary with ConversationSummary in conversation list store.

### Chore
- Update version to 0.12.0 and add fix-path-env dependency.

### Documentation
- Update architecture documentation to clarify Codexia and Codex CLI connection.

## [0.11.0] - 2025-11-14

### Features
- Add McpServerCard component for improved server management UI.
- Implement server enable/disable functionality in MCP management.
- Add toml_edit support for configuration management and enhance serialization.
- Add MCP server management functionality and refactor related components.
- Enhance AddProviderForm with async submission and improved validation.
- Add clearActiveConversation action to manage active conversation state.
- Implement conversation resuming feature with loading indicator.
- Refactor ConversationList and introduce ConversationListItem component.
- Enhance ConversationList with loading states and improve session loading logic.
- Add task completion beep setting.
- Enhance event handling by adding persisted state and improving event sorting.
- Implement turn start command and enhance conversation handling.
- Update Introduce component to include SimpleGitWorktreeSettings.
- Add Git Worktree settings component and integrate auto-commit functionality.
- Add error handling and 404 page components to improve routing experience.
- Refactor ChatToolbar to improve new conversation handling.
- Enhance useConversationEvents to manage busy state.
- Refactor EventItem to use UserMessage component and implement undo functionality.
- Add EventMsgType component to display message types conditionally in chat.
- Enhance EventItem with exec command status display.
- Add delete_git_worktree command and enhance ChatView with exec command handling.
- Introduce TurnDiffActions component for managing diff actions.
- Add Toaster component for enhanced user notifications.
- Implement mutex locking for append_jsonl_file to ensure thread safety.
- Implement update_conversation_preview command.

### Refactor
- Move store files to dedicated config and settings subdirectories.
- Update client initialization parameters to use simplified naming.
- Simplify ClientPicker component layout and enhance status indicator.
- Adjust AppHeader layout and remove unused aria-label attributes.
- Remove update_conversation_preview command and related functionality from renameConversation utility.
- Standardize naming for last10Sessions in loadProjectSessions function.
- Update event handling in useResumeConversation and readEventMessages.

### Chore
- Update version to 0.11.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Update README with recent news about git worktree support and undo functionality.

## [0.10.1] - 2025-11-10

### Features
- Enhance conversation resumption by adding event message reading and handling logic.
- Add auto-scroll functionality to ChatScrollArea component based on event updates.

### Refactor
- Update runCommand to pass current working directory to terminal command execution.

### Fixes
- Add overflow scroll and max height to TurnDiffView for better content visibility.

### Chore
- Bump version to 0.10.1 in package.json, Cargo.toml, and Cargo.lock.

## [0.10.0] - 2025-11-10

### Features
- Implement undo functionality in MsgFooter and enhance event handling in EventItem.
- Add loading functionality for conversation lists with "Load all" button.
- Implement ClientPicker, LanguageSelector, and UserDropdown components.
- Add audio feedback by implementing playBeep function.
- Enhance usage tracking with new usage components.
- Add TurnDiffPanel and integrate file change tracking in ChatView.
- Implement patch history management for tracking file changes.
- Add useSystemSleepPrevention hook to manage system sleep during conversation events.
- Implement system sleep management in useConversationEvents hook.
- Enhance event handling and state management with stream duration tracking.
- Implement token usage tracking in ChatView.
- Implement keyboard shortcut (Ctrl+N) in ChatToolbar for starting new conversations.
- Add Reddit SVG icon and link to r/codexia in Introduce component.
- Add runCommand utility and integrate terminal functionality in ChatToolbar.

### Refactor
- Clean up useConversationEvents hook by removing commented-out code.
- Simplify useConversation hook by destructuring metadata.
- Streamline ChatView and ChatScrollArea components by removing unused hooks.
- Remove review page.
- Simplify rendering logic in PatchApplyBeginItem and PatchItem components.
- Remove unused navigate function and button from ChatCompose component.
- Update ChatScrollArea to conditionally render event type footer.
- Remove unused useFileWatcher and useTurnDiff hooks to streamline codebase.
- Rename variable for clarity in load_project_sessions function.
- Integrate RenameDialog component for improved conversation renaming.
- Streamline PublishCloudDialog component layout.
- Limit maximum height of TurnDiffView component for improved layout management.
- Remove brain emoji from EventItem and AgentMessage components.
- Remove patch history management components and hooks.
- Remove AppToolbar component and enhance NoteEditor with auto-save.
- Streamline ChatView component by removing unused hooks and optimizing event handling.
- Remove patch history management from ChatView and EventItem components.
- Rename configuration key for image viewing tool in ConversationParams.
- Sort conversations by timestamp in ReviewConversationList.
- Remove syncCacheToBackend call from useConversationListStore.
- Remove createdAt property from approval request types.
- Enhance EventItem component with improved message footer visibility.
- Update environment variable check for event footer display.
- Move getStreamDurationLabel function to a separate utility file.
- Rename web search configuration key for consistency.
- Simplify turn_aborted case in EventItem component.
- Reorganize chat components.
- Remove EphemeralStore for improved state management.
- Reorganize layout and settings store imports.
- Sort conversations by timestamp in ConversationList.
- Update layout structure in Review components.
- Enhance project cache functionality.

### Fixes
- Correct logging condition for non-delta events in useConversationEvents hook.
- Adjust ScrollButtons position from top to bottom for improved layout.

### Chore
- Bump version to 0.10.0 in package.json, Cargo.toml, and Cargo.lock.
- Update README.md to reorganize and clarify related projects section.

### Documentation
- Update README with new usage dashboard feature and mark token count as complete.

## [0.9.4] - 2025-11-03

### Features
- Enhance ConversationList by adding source information to conversations.

### Chore
- Update version to 0.9.4 in package.json, Cargo.toml, and Cargo.lock.

## [0.9.3] - 2025-11-02

### Features
- Remove filetree watch.
- Enhance NoteEditor with auto-save and improved rendering logic.

### Chore
- Update version to 0.9.3 in package.json, Cargo.toml, and Cargo.lock.

## [0.9.2] - 2025-10-30

### Features
- Add MsgFooter component for message copy functionality.
- Implement feedback submission dialog with enhanced state management.
- Implement conversation renaming functionality.
- Add logging for codex version check.
- Add Review button to ChatCompose component.

### Refactor
- Improve delta event merging logic in useEventStore.
- Enhance project cache management by introducing scan metadata structure.
- Enhance event handling with stable IDs for events.
- Update ChatToolbar and useSendMessage to improve state management.
- Simplify ChatView and ChatToolbar components.
- Streamline ChatView and ChatScrollArea components.
- Enhance ChatView by removing DeltaEventLog and implementing new event handling.

### Chore
- Update version to 0.9.2 and add DELTA_MERGE_FIX.md to .gitignore.
- Update dependencies in Cargo.lock and Cargo.toml.

### Documentation
- Update README.md to include new subreddit badge and add contributing guidelines.
- Add new issue templates for bug reports, documentation issues, and feature requests.
- Remove Chinese bug report issue template to streamline issue reporting.
- Update bug report templates to include codex version and add Chinese template.

## [0.9.1] - 2025-10-28

### Features
- Integrate UpdateChecker component for automatic update checks.
- Implement BackendErrorDialog component for error handling.
- Enhance EventItem component to display error messages with styling.

### Chore
- Bump version to 0.9.1 in package.json, Cargo.toml, and Cargo.lock.

## [0.9.0] - 2025-10-27

### Features
- Add Introduce component for product information and social links.
- Add PublishCloudDialog for user feedback submission.
- Add new components for managing provider profiles and configurations.
- Add settings components for managing providers and configurations.
- Enable image viewing in conversation parameters.
- Add editing functionality for conversation previews.
- Add Review page and components for managing conversation reviews.

### Refactor
- Consolidate provider management by removing deprecated components.
- Update initialProviders with new base URLs and add 'xai' provider.

### Chore
- Update version to 0.9.0 in package.json, Cargo.toml, and Cargo.lock.
- Update Node.js version in GitHub Actions workflow.
- Update GitHub Actions workflow to conditionally install frontend dependencies.
- Replace isSending with isBusy in Chat components.
- Streamline build process in CI workflows by integrating TS bindings export.

## [0.8.0] - 2025-10-25

### Features
- Implement manual scroll control in ChatView with scroll-to-top and scroll-to-bottom buttons.
- Enhance ChatView with auto-scrolling functionality and improved event handling.
- Optimize input handling in ChatView by utilizing useChatInputStore.
- Streamline conversation handling in ChatView and related components.
- Introduce ChatView for improved chat functionality and state management.

### Refactor
- Extract ChatScrollArea component from ChatView to improve code organization.
- Adjust padding and layout in ChatCompose for improved UI consistency.
- Update import paths for Tauri API to use centralized tauri-proxy.
- Remove unused AlarmClockCheck component from AppHeader.
- Remove ChatPanel and TaskPage components.

### Fixes
- Ensure createdAt timestamps are set for events in ChatInterface.

### Chore
- Bump version to 0.8.0 in package.json, Cargo.toml, and Cargo.lock.

## [0.7.1] - 2025-10-23

### Features
- Add DeltaEventLog component and integrate delta event handling in ChatPanel and ChatCompose.
- Implement SourceControl component for Git status and file diff handling in the chat interface.
- Add AttachedFilesTab component to manage and display attached files in the chat interface.
- Add task page to use codex app-server.
- Add search functionality to ProjectsPage and update AppHeader link text.
- Add base_url to CodexConfig and session management for improved provider configuration logging.
- Remove close_session and get_running_sessions methods from commands and client; clean up session management.
- Remove SessionManager component and related session management methods from sessionManager service.
- Enhance useDeepLink hook to conditionally access deep-link plugin based on runtime environment.
- Implement AccentColorSelector component and refactor AppHeader to use it; remove unused explore, profile, and share pages.
- Remove LogoSettings component and update SettingsSidebar for remote access.
- Remove unused streaming styles from streaming.css.
- Migrate tauri-remote-ui from submodule to direct Git dependency in Cargo.toml.
- Update version to 0.7.0 and enhance documentation with new features and FAQs.
- Integrate deep linking and enhance OAuth login logging in AuthPage.
- Implement remote mode checks for various components and dialogs to restrict functionality.
- Add remote UI functionality with configuration and status management.
- Add BouncingDotsLoader component and integrate it into MessageList; create WelcomeSection for initial user experience.
- Update README and add config.toml for new model providers.
- Add token usage tracking and display in ChatInterface.
- Refactor event handling in useCodexEvents hook.
- Enhance session file parsing and metadata extraction.
- Enhance event handling and token usage tracking.
- Add vendor platform detection and binary discovery.
- Add functionality to create new windows in the Tauri application.
- Add model and provider.

### Fixes
- Update profile assignment logic in getNewConversationParams to handle OpenAI provider correctly.
- Adjust button class in ConversationList for better text truncation and layout.
- Update McpDialog to use openUrl from plugin-shell and improve error handling in ProjectsPage with toast notifications.
- Update feature request link and correct license badge color in README.
- Chat mode defaultApprovalPolicy to untrusted.
- Fix selector label fallback in Sandbox component.
- Improve current directory name retrieval in FileTreeHeader.

### Refactor
- Reorganize event components and enhance event handling in ChatPanel.
- Integrate Zustand persistence in useConversationStore for improved state management.
- Enhance ProviderModels component to fetch and manage Ollama models dynamically.
- Update event key generation in ChatPanel to include index for improved uniqueness.
- Remove old codex and chat files.
- Remove ChatCompose component and update ChatPanel and NewChatView to use Zustand for input state management.
- Integrate @radix-ui/react-toast for enhanced user notifications and update ChatPanel to utilize new event handling and state management features.
- Change model field in Profile struct to be optional for improved flexibility.
- Refactor src-tauri/src/config.rs to folder.
- Memoize NewChatView to optimize rendering performance and update ChatPage to use the memoized component.
- Replace ChatCompose with ChatInput in ChatPanel for enhanced input features and integrate Zustand for state management.
- Enhance NewChatView and ProviderModels components with improved state management and model removal functionality.
- Update ChatCompose, ChatPanel, and NewChatView to use Textarea for multi-line input; enhance event handling in useConversationStore.
- Remove TaskPage and streamline ChatView component with new NewChatView integration.
- Clean up AppHeader by removing unused logoSettings and simplifying logo rendering.
- Remove filetree watch.
- Remove image tab.
- Set updater false.
- Refactor: set env_key as option.
- Refactor CodexClient from proto to app-server and related modules for improved JSON-RPC handling.
- Redesign chat interface sandbox and approval controls.
- Simplify FileTreeItem component's chat input handling.

### Chore
- Bump version to 0.7.1 in package.json, Cargo.toml, and Cargo.lock.
- Update issue report template title and enhance CI workflows to use codex for TypeScript bindings generation.
- Update CI workflows to export TypeScript bindings before building Tauri app and improve documentation for generating TS bindings.
- Cargo check to cargo build.
- Bump version to 0.6.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Add related projects section to README with links to Codexia, Codexsm, MCP Linker, and awesome-codex-cli.
- Add how to pass MacOS damaged warning.
- Update README and add config.toml for new model providers.
- Update CHANGELOG with new features and fixes.
- Update issue_report.md.
- Update README with new features and news.

## [0.6.0] - 2025-09-26

### Features
- Add token usage tracking and display in ChatInterface.
- Refactor event handling in useCodexEvents hook.
- Enhance session file parsing and metadata extraction.
- Enhance event handling and token usage tracking.
- Add vendor platform detection and binary discovery.
- Add functionality to create new windows in the Tauri application.
- Add model and provider.

### Fixes
- Update McpDialog to use openUrl from plugin-shell and improve error handling in ProjectsPage with toast notifications.
- Improve current directory name retrieval in FileTreeHeader.

### Refactor
- Simplify FileTreeItem component's chat input handling.

### Chore
- Bump version to 0.6.0 in package.json, Cargo.toml, and Cargo.lock.

### Documentation
- Update CHANGELOG with new features and fixes.
- Update issue_report.md.
- Update README with new features and news.

## 2025-09-24

### Feature
- a button to create new window and a tauri command

## [0.5.2] - 2025-09-24

### Feature
- optional login to share project

### Fix
- GitHub login issues on Linux and Windows

## [0.5.1] - 2025-09-24

Make Github login simple

## [0.5.0] - 2025-09-23

### Features
- Implement user profile, share project to community and find co-founder features.
- Enhance MCP management via updated `McpDialog`.
- Improve FileTreeHeader with better search input focus handling.
- Improve reasoning message handling in `useCodexEvents`.
- Add Prompt Optimizer settings and control components.
- Add `ConversationCategoryDialog` and `ResumeSessionsDialog` components.
- Enhance `ReasoningEffortSelector` with dynamic effort options.

### Fixes
- Fix navigation logic in `ExploreProjectsPage`.
- Improve layout overflow handling in `Layout` component.
- Handle Tauri errors on macOS to prevent unexpected application errors.
- Improve layout spacing in `AppHeader`.

### Refactor
- Streamline authentication logic and improve `AppHeader`.
- Remove `FileReferenceList` and simplify `ChatInput`.
- Simplify session file retrieval and rollout path search.

### Documentation
- Multiple README updates to improve clarity, feature descriptions, and community information.
- Add issue report template to improve bug reporting.

## [0.4.0] - 2025-09-15

- add gpt-5-codex as default model
- move model select ui between mode and Reasoning Effort

### Change publish Strategy
- change `.github/workflows/release.yml` manual publish binary package

## [0.3.0] - 2025-09-11

### Featrues
- support codex built-in web search
- file and FileTree change detect and refresh
- enhance MessageList with feature cards for improved user onboarding
- add ChangesSummary component for improved file diff display

## [0.2.0] - 2025-09-11

### Features
- Enhance chat interface with diff viewer and inline reasoning.
- Improve plan update handling in chat components.
- Add ForkOriginBanner to display source conversation details.
- Enhance edit-and-resend flow in Chat and Message components.
- Add multi-select and session resume capabilities in ChatView.
- Add category management for conversations.

### Fixes
- Adjust message component styles; remove unused timeline line.
- CI: fix Linux artifact paths and signature file path.

### Documentation
- Add and refine docs for contributing, architecture, and usage.
- Update README with refined vision and links.

### CI/CD
- Add Tauri signing keys to workflows; enhance CI/CD configuration.
- Version chores and workflow improvements.

## [0.1.2] - 2025-09-06

### Features
- Implement in-app updater and expose in Settings.
- Add theme and accent color selection.
- Support forking chats from existing conversations.
- Improve message editing capabilities.
- Split window utilities for Manual view.
- Enhance ApprovalMessage and event summaries for clearer diffs.

### Fixes
- Correct chat forking logic.
- Show MessageFooter on hover only.

### Improvements
- Streamline message type detection and message handling across components.
- Replace NormalizedMessage with ChatMessage in message components.
- Improve conversation history formatting in ChatInterface.
- Simplify conversation creation and session management flows; remove legacy session features.
- Improve content extraction and semantics in command/approval messages.

### Documentation
- Update README with newly added features and enhancements.

## [0.1.1] - 2025-09-04

### Initial Release 🚀
- First public release of **Codexia** — a cross-platform GUI for the Codex CLI.
- Features multi-session chat, live streaming responses, file-tree integration, and notepad support.
- Supports multiple AI providers and sandboxed command execution.
- Clean, professional UI built with Tauri, React, and shadcn/ui.
- Persistent session storage and session-specific configuration.
- Ready for development and production builds.

> Codexia is an independent open-source project and not affiliated with OpenAI.
