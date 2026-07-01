/**
 * Number input for money/qty: no negatives, no scroll-wheel changes, no spin buttons.
 */
export default function AmountInput({
  value,
  onChange,
  min = 0,
  step = 0.01,
  className = '',
  ...props
}) {
  function handleChange(event) {
    const next = event.target.value;
    if (next !== '' && next !== '-' && Number(next) < min) {
      return;
    }
    onChange?.(event);
  }

  function handleWheel(event) {
    if (document.activeElement === event.target) {
      event.preventDefault();
    }
  }

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={value}
      onChange={handleChange}
      onWheel={handleWheel}
      className={className ? `amount-input ${className}` : 'amount-input'}
      {...props}
    />
  );
}
