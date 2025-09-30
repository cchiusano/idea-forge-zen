-- Add order column to tasks table
ALTER TABLE public.tasks ADD COLUMN "order" INTEGER;

-- Set initial order values based on created_at
UPDATE public.tasks SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM public.tasks
) AS subquery
WHERE public.tasks.id = subquery.id;

-- Set default value for new tasks
ALTER TABLE public.tasks ALTER COLUMN "order" SET DEFAULT 0;