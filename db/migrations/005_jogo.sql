-- Dia de jogo é um treino de categoria própria: aconteceu, teve duração e conta
-- pra sequência de dias. Só não tem exercícios.
--
-- Fica de fora de `plans`: ficha é um plano de exercícios, e um plano sem
-- exercício nenhum não teria o que abrir no modo treino.

alter table workouts drop constraint if exists workouts_type_check;
alter table workouts add constraint workouts_type_check
  check (type in ('pliometria', 'forca', 'alongamento', 'mobilidade', 'jogo'));
