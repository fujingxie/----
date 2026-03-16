export const notify = (message, type = 'success') => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app-notify', {
      detail: { message, type },
    }),
  );
};
