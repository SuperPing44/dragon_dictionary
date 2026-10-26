# Teleprompter browser APIs

Research for [#29](https://github.com/SuperPing44/dragon_dictionary/issues/29): which browser capabilities a keyboard-driven teleprompter needs, and how well they work in desktop Chromium (Chrome/Edge) on Windows. Target: the Next.js 16 / React 19.3 app in `frontend/` (React Compiler on), reading Tiptap 3 JSON with inline `stageDirection` nodes, on the laptop's own screen, keyboard only, no mirroring.

Researched 2026-10-26. Sources are linked per claim; "Inference" marks conclusions that are mine, not the source's.

## Summary

| Need | Use | Works in Chromium on Windows? |
|---|---|---|
| Smooth adjustable scrolling | `requestAnimationFrame` loop, position from elapsed time, applied as `transform: translate3d(0, -y px, 0)` on one promoted element | Yes |
| Fullscreen | `document.documentElement.requestFullscreen()` from a keydown handler; track state with `fullscreenchange` | Yes; Esc always exits |
| Screen stays on | `navigator.wakeLock.request("screen")`, re-acquired on `visibilitychange` | Yes (Chrome/Edge 84+); `http://localhost` counts as secure |
| Keyboard | One `keydown` listener on `window`, `preventDefault()` for the keys it handles | Yes |
| Rendering the script | `@tiptap/static-renderer` (`renderToReactElement`) with a mapping for `stageDirection` | Yes; no editor instance needed |

## 1. Smooth, adjustable-speed scrolling

**Drive it with `requestAnimationFrame` and elapsed time, not a fixed step per frame.** The rAF callback gets a `DOMHighResTimeStamp`; MDN warns to use it to compute progress, "otherwise, the animation will run faster on high refresh-rate screens" ([MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). rAF is one-shot (re-request each frame) and returns an id for `cancelAnimationFrame`; MDN advises `null`, not `0`, as the "no request" sentinel (same page).

So the loop is: `y += speedPxPerSecond * (t - lastT) / 1000`, keeping `y` as a float. Speed changes take effect on the next frame with no jump.

**rAF pauses in background tabs** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)). Inference: on resume, the first `t - lastT` would be huge, so clamp the delta (e.g. to 100 ms) or reset `lastT` on `visibilitychange`, or the text leaps forward after an Alt+Tab.

**Transform beats `scrollTop` for the moving text.**
- `transform` and `opacity` are the only two properties the compositor can animate without layout or paint; promote the moving element with `will-change: transform`, but don't promote many elements, since each layer costs GPU memory ([web.dev: compositor-only properties](https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count)).
- `scrollTop` is "subpixel precise in modern browsers", but MDN does not say how the browser rounds or snaps writes ([MDN: scrollTop](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTop)). Inference: writing fractional `scrollTop` every frame risks stepping to device pixels at slow speeds, which reads as judder; a `translate3d` with a float offset is sub-pixel by construction.

Recommended structure (inference): a fixed-size, `overflow: hidden` viewport containing one text column; the column gets `will-change: transform` and `transform: translate3d(0, -${y}px, 0)` written directly to `element.style` from the rAF loop via a ref. Do not put `y` in React state: a re-render per frame is wasted work, and the React Compiler cannot help with that.

**Long scripts.** Only one layer moves, so frame cost stays flat; what grows is the layer's size. Inference: for a typical YouTube script (a few thousand words) one layer is fine. If DevTools' Layers panel later shows the layer as too large, the fallback is `content-visibility: auto` on sections, not virtualisation. Measure first; the prototype should be tested with the longest real script.

## 2. Fullscreen API

- `element.requestFullscreen(options)` needs **transient user activation** and consumes it; it returns a promise and fires `fullscreenchange` / `fullscreenerror` ([Fullscreen spec](https://fullscreen.spec.whatwg.org/), [MDN: requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)).
- **A keypress counts as activation, except Esc.** The HTML spec lists `keydown` as activation-triggering "provided the key is neither the Esc key nor a shortcut key reserved by the user agent" ([HTML: user activation](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event)). So an `F` key handler (or Enter) can enter fullscreen directly. Esc cannot be the "enter fullscreen" key.
- **Esc always exits.** The spec says user agents "should provide a means of exiting fullscreen that always works" ([Fullscreen spec](https://fullscreen.spec.whatwg.org/)). In Chrome that is Esc. Hence: don't bind Esc to anything else in the teleprompter (e.g. "stop"), or one press will both stop and drop out of fullscreen. Listen to `fullscreenchange` on `document` to keep UI state right whichever way fullscreen ended (Esc, Alt+Tab, `exitFullscreen()`) ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)).
- **F11 is a different thing.** Chrome's own fullscreen (F11 / keyboard shortcut) is not element fullscreen; Chrome's keyboard-lock doc says lock only works in fullscreen started with `requestFullscreen()`, "fullscreen that the user starts with a keyboard shortcut doesn't qualify" ([Chrome: Keyboard Lock](https://developer.chrome.com/docs/capabilities/web-apis/keyboard-lock)). Inference: after F11, `document.fullscreenElement` stays `null`. The app should offer its own key and treat F11 as the browser's business.
- **Keyboard Lock is not needed.** It exists to capture system keys (Alt+Tab, Esc) in fullscreen, is Chromium-only, needs a permission prompt since Chrome 130, and still lets a 2-second Esc hold exit (same source). The teleprompter's keys (space, arrows, letters) are ordinary keys. Skip it.
- `navigationUI: "hide"` gives the element the full screen ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen)); request fullscreen on `document.documentElement` (or the teleprompter root) and style the backdrop/background via `:fullscreen` so nothing white flashes.

## 3. Screen Wake Lock API

- **Support:** Chrome and Edge 84+, Firefox 126, Safari 16.4; Baseline 2025 ([Chrome: Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock), [MDN: Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)).
- **Secure context only:** `navigator.wakeLock` is `[SecureContext]` ([W3C Screen Wake Lock](https://w3c.github.io/screen-wake-lock/)). `http://localhost` is a secure context ([MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)), and `127.0.0.0/8` is "potentially trustworthy" ([W3C Secure Contexts §3.1](https://w3c.github.io/webappsec-secure-contexts/)). So the app's local `next dev` / `next start` on localhost is fine without HTTPS. Opening it via a LAN IP (`http://192.168…`) would not be.
- **No user activation needed**, but the document must be **visible** and fully active, else `request()` rejects with `NotAllowedError`; the UA may also refuse (e.g. battery saver) ([W3C spec](https://w3c.github.io/screen-wake-lock/)). Wrap in `try/catch` and degrade silently (show a small "screen may dim" hint at most).
- **Auto-release:** the lock is dropped when the tab/window is hidden or minimised, and a released sentinel can't be reused ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [Chrome](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock)). Re-request on `visibilitychange` when `visibilityState === "visible"` and the teleprompter is still open.
- Note from the spec: an OS-level failure is "indistinguishable from a successful lock acquisition" ([W3C spec](https://w3c.github.io/screen-wake-lock/)). Inference: worth one real test on the laptop with a short Windows screen-off timeout.

Recommended lifetime (inference): acquire when the teleprompter view opens (not only while scrolling, since the creator reads paused text too), release on unmount.

## 4. Keyboard handling

- **One `keydown` listener on `window`**, registered in a `useEffect`, rather than `onKeyDown` on an element: an element handler only fires when focus is inside it, and after entering fullscreen or clicking the backdrop focus can sit on `<body>`. Keyboard events target the focused element and bubble up to `Document` and `Window` ([MDN: keydown](https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event)), so a window listener sees every key whatever has focus.
- **Stop the page scrolling:** call `event.preventDefault()` for each key the teleprompter handles (Space, ArrowUp/Down, PageUp/Down, Home/End). Inference: with the text in an `overflow: hidden` viewport moved by `transform`, there is nothing for the browser to scroll anyway, but preventing default keeps Space from activating a focused button and keeps behaviour independent of layout.
- **Match on `event.code` for physical keys** (`"Space"`, `"ArrowUp"`), which ignores keyboard layout (relevant on a German layout). Ignore `event.isComposing` / `keyCode === 229` per MDN's IME guidance (same page). Inference: use `event.repeat` deliberately: allow repeat for speed up/down (hold to ramp), ignore it for play/pause toggles. Leave modifier combos (`ctrlKey`/`altKey`/`metaKey`) alone so browser shortcuts keep working.
- **Don't fight Esc**: it exits fullscreen (section 2).
- **React 19 / React Compiler:** React 19.2+ has `useEffectEvent`, which lets a listener registered once in an Effect read the latest props/state without re-subscribing ([React: useEffectEvent](https://react.dev/reference/react/useEffectEvent)). Pattern: `const onKey = useEffectEvent((e) => …)`, then `useEffect(() => { window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [])`. Effect Events may only be called from Effects and have no stable identity (same page). The React Compiler memoizes components and hooks only ([React Compiler intro](https://react.dev/learn/react-compiler/introduction)); it does not change how DOM listeners work. Inference: keep the rAF position and speed in refs read by the loop, not state, so key presses do not re-render the text, and only mirror "playing / speed" into state for any on-screen indicator.

## 5. Rendering the Tiptap JSON read-only

**Recommendation: `@tiptap/static-renderer`, not an editor with `editable: false`.**

- The static renderer "doesn't require a browser, DOM or even an editor instance"; it is a pure function from JSON (or a ProseMirror node) to HTML, Markdown or React elements (`renderToReactElement` from `@tiptap/static-renderer/pm/react`) ([Tiptap: Static renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer)). Version 3.32.0 exists on npm, matching the repo's other `@tiptap/*` 3.32.0 packages, with React 19 in its peer range (checked with `npm view`).
- Default output comes from each extension's `renderHTML`; **node views are not applied**, so `stageDirection` needs a `nodeMapping` entry (same page). The current `StageDirection` extension in `frontend/src/app/projects/[id]/stage-direction.tsx` uses a `ReactNodeViewRenderer` chip, and its `renderHTML` falls back to `[Image: …]` text. Inference: that's actually what the teleprompter wants to control explicitly: a mapping that renders the direction as a distinct, unobtrusive cue (or hides it per a setting), separate from the editor's chip.
- `editable: false` makes the editor read-only, and non-editable editors get no `tabindex` by default ([Tiptap: Editor](https://tiptap.dev/docs/editor/api/editor)). But it still builds a full ProseMirror view per section, with its plugins, selection handling and (here) React node views, for text that never changes during a take. Inference: that is more DOM and work inside the one layer we are animating, and a contenteditable-family tree can still take focus/selection and swallow keys, which the static output cannot.
- Inference: the teleprompter concatenates all sections' JSON in order; rendering once on open (client side, since the view is client-only anyway) and then only transforming the container is the cheapest and simplest path. Word counts and stage-direction rules stay in `frontend/src/lib/script.ts`.

## Open questions for the prototype

- Speed unit and range: px/s is the natural internal unit; whether to show it as words per minute is a UX call.
- Whether a large, single moving layer stays smooth with the longest real script on this laptop (check DevTools Layers / Performance).
- Whether Windows battery saver refuses the wake lock on this machine.
