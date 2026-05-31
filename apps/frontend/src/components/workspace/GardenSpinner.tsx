type GardenSpinnerProps = {
  message?: string;
};

export function GardenSpinner({ message = "Tending your curriculum…" }: GardenSpinnerProps) {
  return (
    <div className="garden-spinner-wrap" role="status" aria-live="polite">
      <div className="garden-spinner" aria-hidden="true" />
      <p className="garden-spinner-message">{message}</p>
    </div>
  );
}
