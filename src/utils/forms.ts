import { ApiError } from '../api/client'

export type FormErrors<F extends string> = { message: string; fields: Partial<Record<F, string>> }

// Os erros por campo da API ("detalhes") vão para baixo de cada campo; o resto vai para a mensagem geral.
export function formErrors<F extends string>(caught: unknown, fields: readonly F[]): FormErrors<F> {
  if (!(caught instanceof ApiError)) {
    return { message: caught instanceof Error ? caught.message : 'Não foi possível continuar.', fields: {} }
  }
  const byField: FormErrors<F>['fields'] = {}
  const others: string[] = []
  for (const [field, problem] of Object.entries(caught.details ?? {})) {
    if (fields.includes(field as F)) byField[field as F] = problem
    else others.push(problem)
  }
  return { message: [caught.message, ...others].join(' '), fields: byField }
}
