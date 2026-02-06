// Lightweight toast replacement for react-hot-toast
// (react-hot-toast uses internal .reduce() that breaks under SES/lockdown environments)

let listeners = [];
let toastId = 0;

function notify(type, message, duration = 3000) {
  const id = ++toastId;
  const t = { id, type, message };
  listeners.forEach(fn => { try { fn({ action: 'add', toast: t }); } catch {} });
  if (duration > 0) {
    setTimeout(() => {
      listeners.forEach(fn => { try { fn({ action: 'remove', id }); } catch {} });
    }, duration);
  }
  return id;
}

const toast = (message) => notify('default', message);
toast.success = (message) => notify('success', message);
toast.error = (message) => notify('error', message, 4000);
toast.loading = (message) => notify('loading', message, 0);
toast.dismiss = (id) => {
  listeners.forEach(fn => { try { fn({ action: 'remove', id }); } catch {} });
};

// Subscribe function for the Toaster component
toast.subscribe = (fn) => {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
};

export default toast;
