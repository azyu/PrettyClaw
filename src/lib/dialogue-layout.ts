export function resolveBackgroundFocusOffsetPx(
  dialogueDockHeightPx: number,
  lastExpandedDialogueDockHeightPx: number,
  isDialogueCollapsed: boolean,
  dialogueBottomPaddingPx: number,
) {
  const stableDialogueDockHeightPx =
    isDialogueCollapsed && lastExpandedDialogueDockHeightPx > 0
      ? lastExpandedDialogueDockHeightPx
      : dialogueDockHeightPx;

  return stableDialogueDockHeightPx + dialogueBottomPaddingPx;
}
