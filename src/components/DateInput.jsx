export default function DateInput({ onClick, ...props }) {
  function handleClick(event) {
    onClick?.(event);
    if (typeof event.currentTarget.showPicker === 'function') {
      try {
        event.currentTarget.showPicker();
      } catch {
        // Some browsers reject showPicker outside a direct user gesture.
      }
    }
  }

  return <input type="date" {...props} onClick={handleClick} />;
}
