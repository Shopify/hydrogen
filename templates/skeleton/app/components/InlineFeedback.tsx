interface InlineFeedbackProps {
  type?: 'warning' | 'error';
  title: string;
  description?: string;
}

const FEEDBACK_PROPS: Record<
  NonNullable<InlineFeedbackProps['type']>,
  {icon: string; role: string}
> = {
  warning: {
    icon: '⚠',
    role: 'status',
  },
  error: {
    icon: '✕',
    role: 'alert',
  },
};

/**
 * An accessible inline feedback component for warnings and errors.
 * Uses role="status" for warnings and role="alert" for errors.
 */
export function InlineFeedback({
  type = 'warning',
  title,
  description,
}: InlineFeedbackProps) {
  const {icon, role} = FEEDBACK_PROPS[type];

  return (
    <div className={`inline-feedback inline-feedback--${type}`} role={role}>
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
