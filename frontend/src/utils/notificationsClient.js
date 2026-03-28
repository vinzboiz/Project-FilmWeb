export function pushClientNotification(type, message) {
  try {
    window.dispatchEvent(
      new CustomEvent('thung-notification', {
        detail: {
          type,
          message,
          created_at: new Date().toISOString(),
        },
      }),
    );
  } catch {
    // ignore
  }
}

