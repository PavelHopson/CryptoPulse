interface ErrorStateProps {
  message: string;
}

export const ErrorState = ({ message }: ErrorStateProps): JSX.Element => (
  <div className="rounded-lg border border-rose-700/40 bg-rose-950/30 p-4 text-rose-300">{message}</div>
);
