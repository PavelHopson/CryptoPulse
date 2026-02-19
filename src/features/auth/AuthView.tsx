import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';

export const AuthView = (): JSX.Element => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await authService.signInWithEmail(email, password);
    if (error) toast.error(error.message);
    else toast.success('Вход выполнен');
  };

  return (
    <section className="mx-auto max-w-sm space-y-3 neon-card p-5">
      <h1 className="text-xl font-semibold neon-title">Вход в систему</h1>
      <form className="space-y-2" onSubmit={onSubmit}>
        <input className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
        <button className="w-full rounded-xl border border-cyan-300/60 bg-cyan-400/20 p-2" type="submit">Войти</button>
      </form>
      <button className="w-full rounded-xl border border-fuchsia-300/60 bg-fuchsia-500/15 p-2" onClick={() => void authService.signInWithGoogle()}>
        Продолжить через Google
      </button>
    </section>
  );
};
