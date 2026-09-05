export const CATEGORIES = {
  pliometria: {
    label: 'Pliometria',
    short: 'Plio',
    desc: 'Saltos, quedas e trabalho explosivo',
    color: 'var(--color-cat-plio)',
  },
  forca: {
    label: 'Força',
    short: 'Força',
    desc: 'Carga pesada pra construir a base',
    color: 'var(--color-cat-forca)',
  },
  alongamento: {
    label: 'Alongamento',
    short: 'Along',
    desc: 'Flexibilidade e recuperação',
    color: 'var(--color-cat-along)',
  },
  mobilidade: {
    label: 'Mobilidade',
    short: 'Mob',
    desc: 'Amplitude articular e ativação',
    color: 'var(--color-cat-mob)',
  },
  jogo: {
    label: 'Jogo',
    short: 'Jogo',
    desc: 'Partida no lugar do treino — conta pra sequência',
    color: 'var(--color-cat-jogo)',
  },
}

export const CATEGORY_KEYS = Object.keys(CATEGORIES)

/** Jogo não vira ficha: ficha é um plano de exercícios. */
export const PLAN_CATEGORY_KEYS = CATEGORY_KEYS.filter((k) => k !== 'jogo')

export const isGame = (type) => type === 'jogo'

export const LIBRARY = {
  pliometria: [
    { name: 'Box jump', hint: 'Caixa na altura do joelho ou acima' },
    { name: 'Depth jump', hint: 'Cai da caixa e salta no menor tempo de contato' },
    { name: 'Agachamento com salto', hint: 'Sem carga ou com halter leve' },
    { name: 'Salto sobre barreiras', hint: 'Contínuo, foco em reatividade' },
    { name: 'Bounding', hint: 'Passadas longas e altas' },
    { name: 'Salto unilateral', hint: 'Corrige assimetria entre as pernas' },
    { name: 'Tuck jump', hint: 'Joelhos ao peito, série curta' },
    { name: 'Pogo hops', hint: 'Tornozelo rígido, contato mínimo', unit: 'seg' },
    { name: 'CMJ (contramovimento)', hint: 'O salto de teste padrão' },
    { name: 'Approach jump', hint: 'Salto com corrida de aproximação' },
  ],
  forca: [
    { name: 'Agachamento livre', hint: 'Base de tudo' },
    { name: 'Agachamento búlgaro', hint: 'Unilateral, muito transferível' },
    { name: 'Levantamento terra', hint: 'Cadeia posterior' },
    { name: 'Stiff', hint: 'Isquiotibiais sob alongamento' },
    { name: 'Avanço com halteres', hint: 'Estabilidade + força' },
    { name: 'Elevação de panturrilha', hint: 'Sóleo e gastrocnêmio' },
    { name: 'Hip thrust', hint: 'Extensão de quadril pesada' },
    { name: 'Leg press', hint: 'Volume com menos fadiga axial' },
    { name: 'Nordic curl', hint: 'Excêntrico de isquiotibiais' },
    { name: 'Step-up', hint: 'Subida controlada no banco' },
  ],
  alongamento: [
    { name: 'Isquiotibiais em pé', hint: '30s por perna' },
    { name: 'Quadríceps em pé', hint: 'Quadril estendido' },
    { name: 'Panturrilha na parede', hint: 'Joelho estendido' },
    { name: 'Flexores do quadril ajoelhado', hint: 'Glúteo ativo, sem arquear' },
    { name: 'Borboleta', hint: 'Adutores' },
    { name: 'Figura 4 (glúteo)', hint: 'Deitado ou sentado' },
    { name: 'Gato-camelo', hint: 'Coluna, entre séries' },
    { name: 'Alongamento de sóleo', hint: 'Joelho flexionado' },
  ],
  jogo: [],
  mobilidade: [
    { name: 'Mobilidade de tornozelo na parede', hint: 'Joelho passa da ponta do pé' },
    { name: '90/90 de quadril', hint: 'Rotação interna e externa' },
    { name: 'Agachamento profundo com apoio', hint: 'Segura 60s' },
    { name: 'Círculos de quadril', hint: 'Aquecimento' },
    { name: 'Rotação torácica', hint: 'Quatro apoios' },
    { name: 'Balanço de perna frontal', hint: 'Dinâmico, pré-treino' },
    { name: 'Balanço de perna lateral', hint: 'Adutores e abdutores' },
    { name: "World's greatest stretch", hint: 'Quadril + torácica juntos' },
  ],
}

export const JUMP_KINDS = {
  cmj: { label: 'CMJ', desc: 'Com contramovimento, parado' },
  sj: { label: 'Squat jump', desc: 'Sem contramovimento, da posição agachada' },
  corrida: { label: 'Com corrida', desc: 'Salto com aproximação' },
  unilateral: { label: 'Unilateral', desc: 'Impulso de uma perna só' },
}

export const JUMP_KIND_KEYS = Object.keys(JUMP_KINDS)

/** Fichas de exemplo. Carga fica em branco de propósito: é pessoal. */
export const PLAN_TEMPLATES = [
  {
    name: 'Impulsão A — explosão',
    type: 'pliometria',
    days: [1, 4],
    notes: 'Qualidade acima de volume: pare a série quando a altura cair.',
    items: [
      { name: 'Box jump', sets: 4, reps: 5, load: null, rest: 120, unit: 'reps' },
      { name: 'Depth jump', sets: 3, reps: 5, load: null, rest: 180, unit: 'reps' },
      { name: 'Salto unilateral', sets: 3, reps: 6, load: null, rest: 90, unit: 'reps' },
      { name: 'Pogo hops', sets: 3, reps: 20, load: null, rest: 60, unit: 'seg' },
    ],
  },
  {
    name: 'Força de perna',
    type: 'forca',
    days: [2, 5],
    notes: 'Progrida a carga quando fechar todas as séries com sobra.',
    items: [
      { name: 'Agachamento livre', sets: 4, reps: 5, load: null, rest: 180, unit: 'reps' },
      { name: 'Agachamento búlgaro', sets: 3, reps: 8, load: null, rest: 90, unit: 'reps' },
      { name: 'Hip thrust', sets: 3, reps: 8, load: null, rest: 120, unit: 'reps' },
      { name: 'Elevação de panturrilha', sets: 4, reps: 12, load: null, rest: 60, unit: 'reps' },
    ],
  },
  {
    name: 'Mobilidade & soltura',
    type: 'mobilidade',
    days: [3, 6],
    notes: 'Dia leve — serve pra chegar inteiro no treino seguinte.',
    items: [
      { name: 'Mobilidade de tornozelo na parede', sets: 3, reps: 45, load: null, rest: 30, unit: 'seg' },
      { name: '90/90 de quadril', sets: 3, reps: 60, load: null, rest: 30, unit: 'seg' },
      { name: 'Flexores do quadril ajoelhado', sets: 2, reps: 40, load: null, rest: 30, unit: 'seg' },
      { name: "World's greatest stretch", sets: 2, reps: 40, load: null, rest: 30, unit: 'seg' },
    ],
  },
]
