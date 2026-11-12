
import React, { useState } from 'react';
import { Check, X, Zap, Crown, Star, Info } from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [billing, setBilling] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [interestState, setInterestState] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInterest = () => {
    try {
      localStorage.setItem('cryptopulse_pricing_interest_v1', JSON.stringify({
        billing,
        createdAt: new Date().toISOString(),
      }));
      setInterestState('success');
    } catch {
      setInterestState('error');
    }
  };

  const plans = [
    {
      id: 'FREE',
      name: 'Starter',
      price: 0,
      icon: <Star className="w-6 h-6 text-gray-400" />,
      description: 'Чтобы спокойно изучать рынок и проверять идеи.',
      features: [
        'Доступ к Топ-20 монетам',
        'Базовые графики (Recharts)',
        'Избранное (до 5 активов)',
        'Новости рынка',
        'Paper-портфель без реальных денег'
      ],
      limitations: [
        'Наличие рекламы',
        'AI-анализ по собственному ключу',
        'Нет TradingView графиков',
        'Нет серверной синхронизации'
      ],
      buttonText: 'Ваш текущий план',
      isCurrent: true,
      isPlanned: false,
      color: 'gray',
      iconClass: 'bg-gray-500/10',
      checkClass: 'text-gray-500'
    },
    {
      id: 'PRO',
      name: 'Research Pro',
      price: billing === 'MONTHLY' ? 9.99 : 95.90,
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      description: 'Для воспроизводимых исследований и Strategy Lab.',
      features: [
        'Все функции Starter',
        'Расширенные лимиты локальных исследований',
        'AI-анализ через подключённого провайдера',
        'TradingView графики (OHLC)',
        'Неограниченное избранное',
        'Сохранение исследований и отчёты',
        'Приоритетная поддержка'
      ],
      limitations: [],
      buttonText: 'Планируется',
      isCurrent: false,
      isPlanned: true,
      color: 'brand',
      iconClass: 'bg-brand-500/10',
      checkClass: 'text-brand-500',
      popular: true
    },
    {
      id: 'WHALE',
      name: 'Team / School',
      price: billing === 'MONTHLY' ? 49.99 : 479.90,
      icon: <Crown className="w-6 h-6 text-purple-400" />,
      description: 'Для учебных групп и небольших исследовательских команд.',
      features: [
        'Все функции Pro',
        'Планируемые группы и учебные сценарии',
        'Будущие общие watchlists и стратегии',
        'Экспорт отчётов для проверки',
        'Будущие роли преподавателя и участника',
        'Будущая интеграция с Eclipse Library'
      ],
      limitations: [],
      buttonText: 'Планируется',
      isCurrent: false,
      isPlanned: true,
      color: 'purple',
      iconClass: 'bg-purple-500/10',
      checkClass: 'text-purple-500'
    }
  ];

  return (
    <div className="animate-fade-in pb-20">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyber-cyan/30 bg-cyber-cyan/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-cyber-cyan">
          <Info className="h-3.5 w-3.5" /> Research Lab
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 mt-4">Выберите режим исследования</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          CryptoPulse помогает изучать рынок и проверять торговые гипотезы в paper-режиме.
          <span className="text-brand-400"> Реальные сделки и финансовые рекомендации не входят в продукт.</span>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-xs leading-5 text-gray-500">
          Сейчас работает локальный режим Starter. Research Pro и Team / School показывают
          будущую модель тарифов и не открывают доступ без серверных аккаунтов и оплаты.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mt-8 gap-4">
          <span className={`text-sm font-bold ${billing === 'MONTHLY' ? 'text-white' : 'text-gray-500'}`}>Ежемесячно</span>
          <button 
            onClick={() => setBilling(billing === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
            aria-pressed={billing === 'YEARLY'}
            aria-label="Переключить период плановой цены"
            className="w-14 h-8 bg-gray-800 rounded-full relative border border-gray-700 transition-colors"
          >
            <div className={`absolute top-1 w-6 h-6 bg-brand-500 rounded-full [transition:left_.2s_var(--ease-spring)] ${billing === 'YEARLY' ? 'left-7' : 'left-1'}`}></div>
          </button>
          <span className={`text-sm font-bold ${billing === 'YEARLY' ? 'text-white' : 'text-gray-500'}`}>
            Ежегодно <span className="text-green-400 text-xs ml-1">плановая скидка</span>
          </span>
        </div>
        <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-gray-600">ПЛАНОВЫЙ РАСЧЁТ · ОПЛАТА НЕ ПОДКЛЮЧЕНА</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`relative bg-dark-card border rounded-2xl p-8 flex flex-col [transition:border-color_.25s_var(--ease),box-shadow_.25s_var(--ease),transform_.25s_var(--ease-spring)] hover:-translate-y-2
              ${plan.popular ? 'border-brand-500 shadow-2xl shadow-brand-500/20' : 'border-gray-800 hover:border-gray-600'}
            `}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-brand-400/60 bg-dark-card px-4 py-1 text-xs font-bold text-brand-300 shadow-lg">
                РЕКОМЕНДУЕМ
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <div className={`p-2 rounded-lg ${plan.iconClass}`}>
                     {plan.icon}
                   </div>
                   <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-sm text-gray-400 min-h-[40px]">{plan.description}</p>
              </div>
            </div>

            <div className="mb-6">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">${plan.price}</span>
              {plan.isPlanned ? (
                <span className="ml-2 text-xs text-gray-500">плановая цена</span>
              ) : (
                <span className="text-gray-500 text-sm"> / {billing === 'MONTHLY' ? 'мес' : 'год'}</span>
              )}
            </div>

            <div className="space-y-4 flex-1 mb-8">
              {plan.features.map((feat, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <Check className={`w-5 h-5 flex-shrink-0 ${plan.checkClass}`} />
                  <span>{feat}</span>
                </div>
              ))}
              {plan.limitations.map((lim, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-500">
                  <X className="w-5 h-5 flex-shrink-0" />
                  <span>{lim}</span>
                </div>
              ))}
            </div>

            {plan.isCurrent ? (
              <button type="button" disabled aria-disabled="true" className="w-full py-3 rounded-xl font-bold bg-gray-800 text-gray-400 cursor-default">
                Текущий режим
              </button>
            ) : plan.isPlanned ? (
              <div role="status" className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-3 text-center text-sm font-medium text-gray-400">
                <Info className="h-4 w-4 flex-shrink-0 text-gray-500" />
                Серверная подписка ещё не подключена
              </div>
            ) : (
              <button type="button" className={`w-full py-3 rounded-xl font-bold [transition:background-color_.2s_var(--ease),box-shadow_.2s_var(--ease),transform_.2s_var(--ease-spring)] hover:-translate-y-0.5 active:translate-y-0 ${plan.popular ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400`}>
                {plan.buttonText}
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="mx-auto mt-10 max-w-3xl px-4">
        <div className="border border-brand-500/30 bg-brand-500/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-300">Следующий доступ</p>
              <h2 className="mt-2 text-lg font-bold text-white">Оставить интерес к Research Pro</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">Сигнал сохранится на этом устройстве. Это не заявка на оплату и не включает платный доступ.</p>
            </div>
            <button type="button" onClick={handleInterest} className="cyber-button shrink-0 px-4 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
              ОСТАВИТЬ ИНТЕРЕС
            </button>
          </div>
          <div className="mt-3 min-h-5 text-xs" aria-live="polite">
            {interestState === 'success' && <span className="text-cyber-green">Интерес сохранён локально. Когда серверный доступ появится, вернёмся к этому режиму.</span>}
            {interestState === 'error' && <span className="text-cyber-pink">Не удалось сохранить сигнал. Проверьте настройки хранения браузера и повторите.</span>}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-4xl px-4">
        <div className="rounded-2xl border border-cyber-cyan/20 bg-cyber-cyan/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyber-cyan">Обучение</p>
              <h2 className="mt-2 text-lg font-bold text-white">Материалы Eclipse Library</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                Откройте курсы и практические материалы в Library. Прогресс и аккаунт пока не
                синхронизируются с CryptoPulse — это отдельный будущий контур.
              </p>
            </div>
            <a
              href="https://library.eclipse-forge.ru/"
              target="_blank"
              rel="noreferrer"
              className="cyber-button inline-flex shrink-0 items-center justify-center px-4 py-2 text-xs"
            >
              ОТКРЫТЬ LIBRARY
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-20 px-4">
         <h2 className="text-2xl font-bold text-white mb-8 text-center">Частые вопросы</h2>
         <div className="space-y-4">
            <div className="bg-dark-card border border-gray-800 rounded-xl p-6">
               <h3 className="font-bold text-white mb-2">Подключена ли оплата?</h3>
               <p className="text-gray-400 text-sm">Пока нет. Этот экран показывает будущую модель тарифов, но не принимает деньги и не меняет доступ к данным.</p>
            </div>
            <div className="bg-dark-card border border-gray-800 rounded-xl p-6">
               <h3 className="font-bold text-white mb-2">Это инвестиционный советник?</h3>
               <p className="text-gray-400 text-sm">Нет. Все сделки виртуальные, а результаты исследований зависят от данных и выбранных параметров.</p>
            </div>
         </div>
      </div>
    </div>
  );
};
