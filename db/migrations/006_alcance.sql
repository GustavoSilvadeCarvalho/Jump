-- A linha de preferências nascia com updated_at = now() do banco, misturando os
-- dois relógios de novo: quem decide "editou por último" é o carimbo do
-- aparelho. Num celular atrasado em relação ao banco, a comparação achava que a
-- linha vazia era mais nova que a edição e o alcance parado nunca salvava —
-- sem erro nenhum aparecer.
--
-- Nascendo no início dos tempos, qualquer escrita de verdade vence.

alter table user_settings alter column updated_at set default '1970-01-01'::timestamptz;

update user_settings set updated_at = '1970-01-01'::timestamptz where reach is null;
