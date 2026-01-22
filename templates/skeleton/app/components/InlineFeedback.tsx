interface InlineFeedbackProps {
  type?: 'warning' | 'error';
  title: string;
  description?: string;
}

/**
 * An accessible inline feedback component for warnings and errors.
 * Uses role="alert" to announce changes to assistive technology.
 */
export function InlineFeedback({
  type = 'warning',
  title,
  description,
}: InlineFeedbackProps) {
  const icon = type === 'error' ? '✕' : '⚠';

  return (
    <div
      className={`inline-feedback inline-feedback--${type}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="inline-feedback-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="inline-feedback-content">
        <p className="inline-feedback-title">{title}</p>
        {description ? (
          <p className="inline-feedback-description">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
