export function parseUiTree(xml) {
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((m) => Object.fromEntries(
    [...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
}

export function installSourceSwitch(n) {
  return n.package === "com.android.settings" && n.enabled === "true" &&
    n.checkable === "true" && (n.class === "android.widget.Switch" ||
      n["resource-id"]?.endsWith("/switch_widget") ||
      (n.class === "android.view.View" && n.clickable === "true"));
}

// Only cold-boot system apps observed on our disposable Google APIs emulators.
// Never dismiss an ANR/crash belonging to the app, QA helper or installer.
export function systemAnrWaitButton(nodes) {
  const title = nodes.find((n) => n.package === "android" && n["resource-id"] === "android:id/alertTitle");
  if (!["Pixel Launcher isn't responding", "System UI isn't responding", "Messages isn't responding"].includes(title?.text)) return undefined;
  return nodes.find((n) => n.package === "android" && n["resource-id"] === "android:id/aerr_wait" && n.enabled === "true");
}
