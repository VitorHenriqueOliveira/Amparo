BEGIN;

ALTER TABLE public.usuario
    ADD COLUMN IF NOT EXISTS st_notificacao BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.usuario ALTER COLUMN st_notificacao SET DEFAULT TRUE;
UPDATE public.usuario SET st_notificacao = TRUE WHERE st_notificacao IS NULL;
ALTER TABLE public.usuario ALTER COLUMN st_notificacao SET NOT NULL;

COMMIT;
