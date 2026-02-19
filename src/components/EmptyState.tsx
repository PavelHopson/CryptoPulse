interface EmptyStateProps {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: EmptyStateProps): JSX.Element => (
  <div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);
