-- Owner-scoped write policies for workflow_steps via the parent workflow_runs row.
CREATE POLICY workflow_steps_owner_insert ON public.workflow_steps
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workflow_runs wr
    WHERE wr.id = workflow_steps.workflow_run_id AND wr.user_id = auth.uid()
  ));

CREATE POLICY workflow_steps_owner_update ON public.workflow_steps
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.workflow_runs wr
    WHERE wr.id = workflow_steps.workflow_run_id AND wr.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workflow_runs wr
    WHERE wr.id = workflow_steps.workflow_run_id AND wr.user_id = auth.uid()
  ));

CREATE POLICY workflow_steps_owner_delete ON public.workflow_steps
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.workflow_runs wr
    WHERE wr.id = workflow_steps.workflow_run_id AND wr.user_id = auth.uid()
  ));