-- Future catalog listings may not have an approved sale price yet.
-- NULL means pending, while zero remains an explicit price. Existing values and defaults stay intact.
ALTER TABLE public.products ALTER COLUMN price DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN price_per_m2 DROP NOT NULL;
