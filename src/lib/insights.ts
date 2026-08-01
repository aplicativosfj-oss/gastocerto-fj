/**
 * Inteligência do painel: séries históricas, tendências e dicas profissionais
 * geradas automaticamente a partir dos lançamentos do usuário.
 *
 * Módulo puro (sem React e sem acesso ao banco) para facilitar testes e reuso.
 */

import { MONTH_NAMES, toCents } from "@/lib/finance";
import type { Transaction } from "@/lib/transactions";

export type MonthPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  result: number;
  /** Percentual da receita que sobrou no mês (0 quando não houve receita). */
  savingsRate: number;
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function monthKeyLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${MONTH_NAMES[month - 1].slice(0, 3)}/${String(year).slice(2)}`;
}

function isValid(row: Transaction) {
  return row.status !== "canceled" && !row.deleted_at;
}

/** Série dos últimos meses (mais antigo primeiro), incluindo o mês de referência. */
export function monthlySeries(
  transactions: Transaction[],
  monthsBack = 6,
  reference = new Date(),
): MonthPoint[] {
  const keys: string[] = [];
  for (let index = monthsBack - 1; index >= 0; index -= 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth() - index, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return keys.map((key) => {
    const rows = transactions.filter((row) => isValid(row) && row.transaction_date.slice(0, 7) === key);
    const income = toCents(
      rows.filter((row) => row.transaction_type === "income").reduce((sum, row) => sum + Number(row.amount), 0),
    );
    const expense = toCents(
      rows.filter((row) => row.transaction_type === "expense").reduce((sum, row) => sum + Number(row.amount), 0),
    );
    return {
      key,
      label: monthKeyLabel(key),
      income,
      expense,
      result: toCents(income - expense),
      savingsRate: income > 0 ? Math.round(((income - expense) / income) * 100) : 0,
    };
  });
}

export type CategoryTrend = {
  id: string;
  name: string;
  current: number;
  previous: number;
  delta: number;
  /** Variação percentual; null quando não havia gasto no mês anterior. */
  percent: number | null;
};

/** Comparativo de gastos por categoria entre o mês atual e o anterior. */
export function categoryTrends(
  transactions: Transaction[],
  currentKey: string,
  previousKey: string,
  categoryName: (id: string | null) => string,
): CategoryTrend[] {
  const totals = new Map<string, { current: number; previous: number }>();

  transactions.forEach((row) => {
    if (!isValid(row) || row.transaction_type !== "expense") return;
    const key = row.transaction_date.slice(0, 7);
    if (key !== currentKey && key !== previousKey) return;
    const id = row.category_id ?? "sem-categoria";
    const entry = totals.get(id) ?? { current: 0, previous: 0 };
    if (key === currentKey) entry.current += Number(row.amount);
    else entry.previous += Number(row.amount);
    totals.set(id, entry);
  });

  return Array.from(totals.entries())
    .map(([id, value]) => {
      const current = toCents(value.current);
      const previous = toCents(value.previous);
      return {
        id,
        name: id === "sem-categoria" ? "Sem categoria" : categoryName(id),
        current,
        previous,
        delta: toCents(current - previous),
        percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export type WeekdayPoint = { label: string; gasto: number; count: number };

/** Distribuição dos gastos do período por dia da semana. */
export function weekdaySpending(transactions: Transaction[], monthKey: string): WeekdayPoint[] {
  const points: WeekdayPoint[] = WEEKDAY_LABELS.map((label) => ({ label, gasto: 0, count: 0 }));
  transactions.forEach((row) => {
    if (!isValid(row) || row.transaction_type !== "expense") return;
    if (row.transaction_date.slice(0, 7) !== monthKey) return;
    const [year, month, day] = row.transaction_date.split("-").map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    points[weekday].gasto = toCents(points[weekday].gasto + Number(row.amount));
    points[weekday].count += 1;
  });
  return points;
}

export type Tip = {
  id: string;
  title: string;
  message: string;
  tone: "good" | "warn" | "bad" | "info";
};

export type TipsInput = {
  series: MonthPoint[];
  trends: CategoryTrend[];
  /** Total de gastos essenciais e não essenciais do mês atual. */
  essential: number;
  nonEssential: number;
  /** Dia do mês na data de referência e total de dias do mês. */
  dayOfMonth: number;
  daysInMonth: number;
  currency: (value: number) => string;
};

/**
 * Dicas profissionais automáticas: leem a própria série do usuário e devolvem
 * orientações objetivas de fluxo de caixa, sem jargão financeiro.
 */
export function buildTips(input: TipsInput): Tip[] {
  const { series, trends, essential, nonEssential, dayOfMonth, daysInMonth, currency } = input;
  const tips: Tip[] = [];
  const current = series[series.length - 1];
  if (!current) return tips;

  const past = series.slice(0, -1).filter((point) => point.expense > 0);
  const average = past.length > 0 ? past.reduce((sum, point) => sum + point.expense, 0) / past.length : 0;

  // 1. Resultado do mês
  if (current.result < 0) {
    tips.push({
      id: "negative-result",
      title: "Você está gastando mais do que recebeu",
      message: `Neste mês as despesas superam as receitas em ${currency(Math.abs(current.result))}. Priorize pagar o que é essencial e adie compras não urgentes até equilibrar o caixa.`,
      tone: "bad",
    });
  } else if (current.income > 0) {
    tips.push({
      id: "savings-rate",
      title: `Sobra atual de ${current.savingsRate}% da receita`,
      message:
        current.savingsRate >= 20
          ? `Excelente: você mantém ${currency(current.result)} livres. Direcione parte disso para uma reserva de emergência de 3 a 6 meses de despesas.`
          : `Sobram ${currency(current.result)}. Uma meta saudável é guardar ao menos 20% da receita — reduzir os gastos não essenciais é o caminho mais rápido.`,
      tone: current.savingsRate >= 20 ? "good" : "warn",
    });
  }

  // 2. Ritmo de gasto vs média histórica
  if (average > 0 && dayOfMonth > 3) {
    const projected = (current.expense / dayOfMonth) * daysInMonth;
    const variation = Math.round(((projected - average) / average) * 100);
    if (variation >= 10) {
      tips.push({
        id: "pace-high",
        title: `Ritmo ${variation}% acima da sua média`,
        message: `Mantendo esse ritmo o mês fecha perto de ${currency(projected)}, contra uma média de ${currency(average)}. Vale revisar as próximas compras da semana.`,
        tone: "warn",
      });
    } else if (variation <= -10) {
      tips.push({
        id: "pace-low",
        title: `Ritmo ${Math.abs(variation)}% abaixo da sua média`,
        message: `A projeção é fechar em ${currency(projected)}, abaixo da média de ${currency(average)}. Aproveite a folga para adiantar dívidas ou reforçar a reserva.`,
        tone: "good",
      });
    }
  }

  // 3. Categoria que mais subiu
  const rising = trends.find((trend) => trend.delta > 0 && trend.previous > 0);
  if (rising) {
    tips.push({
      id: `rising-${rising.id}`,
      title: `${rising.name} subiu ${rising.percent}%`,
      message: `Passou de ${currency(rising.previous)} para ${currency(rising.current)}. Confira se houve compra pontual ou se o gasto virou rotina — nesse caso, defina um limite mensal para a categoria.`,
      tone: "warn",
    });
  }

  // 4. Categoria que caiu
  const falling = [...trends].reverse().find((trend) => trend.delta < 0 && trend.previous > 0);
  if (falling) {
    tips.push({
      id: `falling-${falling.id}`,
      title: `${falling.name} caiu ${Math.abs(falling.percent ?? 0)}%`,
      message: `Você economizou ${currency(Math.abs(falling.delta))} nessa categoria. Transferir essa diferença para uma meta é a forma mais simples de transformar corte em patrimônio.`,
      tone: "good",
    });
  }

  // 5. Essenciais x não essenciais
  const totalExpense = essential + nonEssential;
  if (totalExpense > 0) {
    const share = Math.round((nonEssential / totalExpense) * 100);
    if (share >= 35) {
      tips.push({
        id: "non-essential",
        title: `${share}% dos gastos são não essenciais`,
        message: `São ${currency(nonEssential)} em itens que podem ser reduzidos. Cortar um terço disso já liberaria ${currency(nonEssential / 3)} por mês.`,
        tone: "warn",
      });
    } else {
      tips.push({
        id: "non-essential-ok",
        title: `Gastos não essenciais controlados (${share}%)`,
        message: `Sua estrutura de gastos está concentrada no essencial (${currency(essential)}). Continue registrando tudo para manter essa visibilidade.`,
        tone: "good",
      });
    }
  }

  // 6. Tendência de três meses
  const lastThree = series.slice(-3);
  if (lastThree.length === 3 && lastThree.every((point) => point.expense > 0)) {
    const growing = lastThree[0].expense < lastThree[1].expense && lastThree[1].expense < lastThree[2].expense;
    if (growing) {
      tips.push({
        id: "trend-up",
        title: "Três meses seguidos de alta nos gastos",
        message: `Saiu de ${currency(lastThree[0].expense)} para ${currency(lastThree[2].expense)}. Revise contas fixas e assinaturas: normalmente é aí que a alta se acumula sem ser percebida.`,
        tone: "bad",
      });
    }
  }

  return tips.slice(0, 6);
}
